const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const vm = require('node:vm')

const event = { addListener() {} }
function load(file, globals) {
    const context = vm.createContext({ URL, ...globals })
    let source = readFileSync(resolve(__dirname, '..', file), 'utf8')
    if (file === 'background.js') {
        source = source.replace(/^import .+$/gm, '')
        context.Converter = () => value => value
    }
    vm.runInContext(source, context)
    return context
}

function content(reply = async () => ({ results: [] })) {
    const messages = []
    const context = load('content.js', {
        document: { getElementsByTagName: () => [] },
        chrome: { runtime: {
            onMessage: event,
            sendMessage: async (...args) => {
                const message = args.at(-1)
                messages.push(message)
                return reply(message)
            }
        } }
    })
    context.input = ''
    vm.runInContext(`
        getRawInputValue = () => input
        getInputValue = () => input
        renderSuggest = () => {}
        removeSuggest = () => {}
        executeSuggestResult = (result, newTab) => { executed = { result, newTab } }
    `, context)
    return { context, messages }
}

test('识别协议、域名、本地服务和带空格的文件路径', () => {
    const { context } = content()
    const cases = [
        ['http://example.com/a', 'http://example.com/a'],
        ['HTTPS://EXAMPLE.COM', 'https://example.com/'],
        [' \nexample.com/path?q=1#top\n ', 'https://example.com/path?q=1#top'],
        ['example.com:8080', 'https://example.com:8080/'],
        ['例子.测试', 'https://xn--fsqu00a.xn--0zwm56d/'],
        ['192.168.1.10:8080/path', 'http://192.168.1.10:8080/path'],
        ['localhost:3000', 'http://localhost:3000/'],
        ['[::1]:8000', 'http://[::1]:8000/'],
        ['file:///Users/me/My Documents/test.html', 'file:///Users/me/My%20Documents/test.html'],
        ['file:///C:/Users/me/test.html', 'file:///C:/Users/me/test.html']
    ]
    for (const [input, expected] of cases) assert.equal(context.parseNavigationUrl(input), expected, input)
    for (const input of ['', 'hello', '搜索内容', 'hello world', 'example.com 教程', '/b example.com', '/Users/me/a',
        'me@example.com', 'javascript:alert(1)', 'data:text/html,hello', '12345', 'http://', 'example.com:99999',
        'example.com\nother.com']) {
        assert.equal(context.parseNavigationUrl(input), null, input)
    }
})

test('网址默认排首行，保留搜索选项，不请求网络建议', () => {
    const { context, messages } = content()
    context.input = 'example.com'
    context.onInputChange()
    assert.equal(context.getSuggestSelected().type, 'url')
    assert.equal(context.getSelectableResults()[1].type, 'engine')
    assert.equal(messages.length, 0)
    context.submitCurrentInput(false)
    assert.equal(context.executed.result.action.url, 'https://example.com/')
    vm.runInContext('jStartSuggestSelectedIndex = 1', context)
    context.submitCurrentInput(false)
    assert.equal(context.executed.result.type, 'engine')
})

test('输入改变后立即回车使用新网址，支持新标签页', () => {
    const { context } = content()
    context.input = 'old.example.com'
    context.onInputChange()
    context.input = 'file:///Users/me/test.html'
    context.submitCurrentInput(true)
    assert.equal(context.executed.result.action.url, context.input)
    assert.equal(context.executed.newTab, true)
})

test('普通搜索及命令仍然走原路径，旧异步结果不会覆盖网址', async () => {
    const { context, messages } = content()
    context.input = 'hello'
    context.onInputChange()
    assert.equal(messages[0].type, 'jstart:searchLocal')
    assert.equal(messages[1].searchWord, 'hello')
    context.input = 'example.com'
    context.onInputChange()
    await Promise.resolve()
    assert.equal(context.getSuggestSelected().type, 'url')
    context.input = '/b example.com'
    context.onInputChange()
    assert.equal(messages.length, 3)
    assert.equal(messages[2].type, 'jstart:searchLocal')
})

test('AI 推荐到达后仍让本地结果优先', async () => {
    let finishClassification
    const { context } = content(message => {
        if (message.type === 'jstart:classifyAI') return new Promise(resolve => { finishClassification = resolve })
        if (message.type === 'jstart:searchLocal') return Promise.resolve({ results: [{ id: 'local:1', type: 'bookmark', title: '本地结果' }] })
        return Promise.resolve({ results: [] })
    })
    vm.runInContext("jStartAIProvider = { name: '豆包', icon: 'icons/ai/doubao.png', semanticEnabled: true }", context)
    context.input = '如何整理书签'
    context.onInputChange()
    await vm.runInContext('jStartLocalRequest', context)
    assert.equal(context.getSuggestSelected().type, 'bookmark')
    finishClassification({ route: 'ai' })
    await new Promise(setImmediate)
    assert.deepEqual(Array.from(context.getSelectableResults(), result => result.type), ['bookmark', 'ai'])
    assert.equal(context.getSelectableResults()[1].title, '问问 AI 吧')
    assert.equal(context.getSelectableResults()[1].subtitle, '此问题更适合 AI 回答哦')
    assert.equal(context.getSuggestSelected().type, 'bookmark')
})

test('选中 AI 联想后切换并记住 AI 模式', () => {
    const saved = []
    const context = load('content.js', {
        document: { getElementsByTagName: () => [] },
        chrome: { runtime: { onMessage: event }, storage: { local: { set: value => saved.push(value) } } }
    })
    vm.runInContext(`
        getInputValue = () => '解释这个概念'
        refreshLogo = () => {}
        onInputChange = () => {}
        startAIAnswer = question => { askedQuestion = question }
    `, context)
    context.executeSuggestResult({ type: 'ai' }, false)
    assert.equal(vm.runInContext('jStartSearchType', context), 'ai')
    assert.equal(context.askedQuestion, '解释这个概念')
    assert.equal(saved[0].jStartSearchType, 'ai')
})

test('文件权限未开启时提示；开启后支持当前页和新标签页', async () => {
    const calls = []
    let allowed = false
    const context = load('background.js', { chrome: {
        commands: { onCommand: event }, action: { onClicked: event }, runtime: { onMessage: event },
        extension: { isAllowedFileSchemeAccess: async () => allowed },
        tabs: {
            onActivated: event, onRemoved: event,
            query: async () => [{ id: 42 }],
            update: async (id, options) => calls.push({ id, ...options }),
            create: async options => calls.push(options)
        }
    } })
    const url = 'file:///Users/me/test.html'
    await assert.rejects(context.openUrl(url, false), /允许访问文件网址/)
    assert.equal(calls.length, 0)
    allowed = true
    await context.executeResult({ type: 'url', action: { kind: 'open_url', url } }, false)
    await context.executeResult({ type: 'url', action: { kind: 'open_url', url } }, true)
    assert.equal(calls[0].id, 42)
    assert.equal(calls[0].url, url)
    assert.equal(calls[1].url, url)
})

test('已有 AI 对话时搜索在新标签页打开并保留对话', async () => {
    const { context, messages } = content(async message => message.type === 'jstart:executeResult' ? { ok: true } : { results: [] })
    vm.runInContext(`
        jStartAISession = { turns: [{ question: '已回答的问题' }] }
        clearSearchComposer = () => { composerCleared = true }
    `, context)
    context.handleKeywordSearch('下一次搜索', false)
    await new Promise(setImmediate)
    assert.equal(messages[0].type, 'jstart:executeResult')
    assert.equal(messages[0].newTab, true)
    assert.equal(messages[0].result.action.url, 'https://www.google.com/search?q=%E4%B8%8B%E4%B8%80%E6%AC%A1%E6%90%9C%E7%B4%A2')
    assert.equal(context.composerCleared, true)
    assert.equal(vm.runInContext('jStartAISession.turns.length', context), 1)
})
