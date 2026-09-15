const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const vm = require('node:vm')

const event = { addListener() {} }
function load(file, globals) {
    const context = vm.createContext({ URL, ...globals })
    vm.runInContext(readFileSync(resolve(__dirname, '..', file), 'utf8'), context)
    return context
}

function content() {
    const messages = []
    const context = load('content.js', {
        document: { getElementsByTagName: () => [] },
        chrome: { runtime: {
            onMessage: event,
            sendMessage: async (_, message) => { messages.push(message); return { results: [] } }
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
