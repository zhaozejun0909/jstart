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
    } else if (file === 'content.js') {
        // 单元测试访问作用域内的函数；实际注入仍执行完整的封装脚本。
        source = source.replace('(() => {\n', '').replace(/\n\}\)\(\)\s*$/, '')
            .replace('if (existingMessageListener && chrome.runtime.onMessage.hasListener(existingMessageListener)) return', '')
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

test('无协议的文件名走搜索，带协议和真正的网址仍可直接打开', () => {
    const { context } = content()
    const suffixes = ['js', 'jsx', 'mjs', 'cjs', 'json', 'ts', 'tsx', 'css', 'scss', 'sass', 'less',
        'html', 'htm', 'xml', 'yaml', 'yml', 'txt', 'md', 'zip']
    for (const suffix of suffixes) {
        assert.equal(context.parseNavigationUrl(`package.${suffix}`), null)
        assert.equal(context.parseNavigationUrl(`PACKAGE.${suffix.toUpperCase()}?a=1#top`), null)
    }
    for (const input of ['https://next.js/', 'https://example.md/', 'file:///Users/me/package.json',
        'example.com/package.json', 'example.dev', 'example.ai', 'example.app']) {
        assert.ok(context.parseNavigationUrl(input), input)
    }
    context.input = 'next.js'
    context.onInputChange()
    assert.notEqual(context.getSuggestSelected()?.type, 'url')
})

test('补注入脚本不会与之前的顶层变量发生重声明冲突', () => {
    const listeners = new Set()
    const context = vm.createContext({ URL,
        document: { getElementsByTagName: () => [] },
        chrome: { runtime: { onMessage: {
            addListener: listener => listeners.add(listener),
            hasListener: listener => listeners.has(listener)
        } } }
    })
    vm.runInContext('let jStrartActived = false; const SEARCH_LOGOS = {}', context)
    const source = readFileSync(resolve(__dirname, '..', 'content.js'), 'utf8')
    assert.doesNotThrow(() => vm.runInContext(source, context))
    assert.doesNotThrow(() => vm.runInContext(source, context))
    assert.equal(listeners.size, 1)
})

test('自动注入与补注入共用一个实例，保留对话且图标仍能切换关闭', () => {
    const messages = new Set()
    const storageListeners = new Set()
    let panel = null
    let created = 0
    let focused = 0
    const context = vm.createContext({
        document: {
            getElementsByTagName: () => [],
            getElementById: () => panel
        },
        chrome: {
            runtime: { onMessage: {
                addListener: listener => messages.add(listener),
                hasListener: listener => messages.has(listener)
            } },
            storage: { onChanged: { addListener: listener => storageListeners.add(listener) } }
        },
        createPanel: () => {
            created++
            panel = { isConnected: true, remove() {
                this.isConnected = false
                if (panel === this) panel = null
            } }
            return panel
        },
        focusPanel: () => focused++
    })
    // 保留真实初始化和消息处理，仅替换面板内部渲染，模拟 Chrome 的同一隔离环境。
    const source = readFileSync(resolve(__dirname, '..', 'content.js'), 'utf8')
        .replace(/\n\}\)\(\)\s*$/, `
            insertHTML = () => { jStartHost = createPanel() }
            removeHTML = () => { jStartHost?.remove(); jStartHost = null; jStartAISession = null }
            focusOnSearch = focusPanel
            globalThis.testInstance = { setSession: value => { jStartAISession = value }, getSession: () => jStartAISession }
        })()`)
    const send = data => {
        for (const listener of messages) listener({ type: 'jstart', data }, {}, () => {})
    }
    vm.runInContext(source, context)
    send('showStartPage')
    const firstPanel = panel
    const instance = context.testInstance
    const session = { turns: [{ question: '保留这次对话' }] }
    instance.setSession(session)
    vm.runInContext(source, context)
    assert.equal(messages.size, 1)
    assert.equal(storageListeners.size, 1)
    assert.equal(context.testInstance, instance)
    assert.equal(instance.getSession(), session)
    assert.equal(panel, firstPanel)
    send('focusStartPage')
    assert.equal(focused, 1)
    assert.equal(panel, firstPanel)
    send('showStartPage')
    assert.equal(panel, null)
    send('showStartPage')
    assert.equal(created, 2)

    // 扩展重载后，旧监听失效，即使旧句柄仍在也允许重新初始化。
    messages.clear()
    storageListeners.clear()
    const orphan = panel
    vm.runInContext(source, context)
    assert.equal(messages.size, 1)
    assert.equal(storageListeners.size, 1)
    assert.notEqual(context.testInstance, instance)
    send('showStartPage')
    assert.equal(orphan.isConnected, false)
    assert.equal(created, 3)
    send('showStartPage')
    assert.equal(panel, null)
})

test('唤起时清理扩展重载留下的旧面板，closed 输入焦点仍阻止网页快捷键', () => {
    const { context } = content()
    const calls = []
    context.document.getElementById = () => ({ remove: () => calls.push('remove') })
    context.insertHTML = () => calls.push('insert')
    context.showMainView(true)
    assert.deepEqual(calls, ['remove', 'insert'])

    const input = {}
    context.closedRoot = { getElementById: () => input, activeElement: input }
    vm.runInContext('jStartRoot = closedRoot; jStrartActived = true', context)
    const key = { type: 'keydown', key: 'a', stopImmediatePropagation: () => calls.push('blocked') }
    context.blockPageShortcut(key)
    assert.equal(calls.at(-1), 'blocked')
    context.closedRoot.activeElement = null
    const count = calls.length
    context.blockPageShortcut(key)
    assert.equal(calls.length, count)
})

test('粘贴压缩保留比例、不放大小图，小图编码变大时保留原文件', async () => {
    let file
    let canvas
    let closed
    let received
    let compressedSize
    const drawing = []
    const context = load('content.js', {
        document: {
            getElementsByTagName: () => [],
            createElement: () => canvas = {
                getContext: () => ({
                    fillRect: (...args) => drawing.push(['fill', ...args]),
                    drawImage: (image, ...args) => drawing.push(['draw', ...args])
                }),
                toBlob: (resolve, type, quality) => {
                    assert.equal(type, 'image/jpeg')
                    assert.equal(quality, 0.9)
                    resolve({ size: compressedSize, type })
                }
            }
        },
        chrome: { runtime: { onMessage: event } },
        createImageBitmap: async () => ({ ...file, close: () => { closed = true } }),
        FileReader: class {
            readAsDataURL(blob) {
                received = blob
                this.result = `data:${blob.type};base64,COMPRESSED`
                this.onload()
            }
        }
    })
    for (const [width, height, size, encodedSize, expectedWidth, expectedHeight, original] of [
        [3000, 2000, 4000000, 300000, 1500, 1000, false],
        [1000, 4000, 2000000, 200000, 375, 1500, false],
        [800, 600, 200000, 50000, 800, 600, false],
        [800, 600, 10000, 50000, 800, 600, true]
    ]) {
        file = { width, height, size, type: 'image/png' }
        closed = false
        compressedSize = encodedSize
        drawing.length = 0
        const result = await context.compressPastedImage(file)
        assert.deepEqual([canvas.width, canvas.height], [expectedWidth, expectedHeight])
        assert.deepEqual(drawing.map(item => item[0]), ['fill', 'draw'])
        assert.equal(closed, true)
        assert.equal(received === file, original)
        assert.equal(result.startsWith(original ? 'data:image/png;' : 'data:image/jpeg;'), true)
    }
})

function wakeupContext({ sendMessage, executeScript }) {
    const created = []
    const context = load('background.js', { chrome: {
        commands: { onCommand: event }, action: { onClicked: event },
        runtime: { onMessage: event, getURL: path => `chrome-extension://jstart/${path}` },
        scripting: { executeScript },
        tabs: {
            onActivated: event, onRemoved: event,
            query: async () => [{ id: 42, windowId: 7 }], sendMessage,
            update: () => assert.fail('唤起不能导航当前页面'),
            create: async options => created.push(options)
        }
    } })
    return { context, created }
}

test('正常唤起只发送消息，全局唤起仍保持只显示、不切换关闭', async () => {
    const messages = []
    const { context, created } = wakeupContext({
        sendMessage: async (tabId, message) => messages.push(message.data),
        executeScript: () => assert.fail('有接收脚本时无需补注入')
    })
    await context.toShowJstartPage()
    await context.toShowJstartPage(7, true)
    assert.deepEqual(messages, ['showStartPage', 'focusStartPage'])
    assert.equal(created.length, 0)
})

test('旧页面缺少接收脚本时先补注入，再发送相同唤起消息', async () => {
    const calls = []
    let attempts = 0
    const { context, created } = wakeupContext({
        sendMessage: async (tabId, message) => {
            calls.push(['message', tabId, message.data])
            if (++attempts === 1) throw new Error('没有接收脚本')
        },
        executeScript: async options => calls.push(['inject', options.target.tabId, ...options.files])
    })
    await context.toShowJstartPage(7, true)
    assert.deepEqual(calls, [['message', 42, 'focusStartPage'], ['inject', 42, 'content.js'], ['message', 42, 'focusStartPage']])
    assert.equal(created.length, 0)
})

test('注入失败或补注入后仍无法接收消息，在同一窗口新开 JStart 并保留原页面', async () => {
    for (const injectionFails of [true, false]) {
        const { context, created } = wakeupContext({
            sendMessage: async () => { throw new Error('无法接收消息') },
            executeScript: async () => { if (injectionFails) throw new Error('无法注入') }
        })
        await context.toShowJstartPage()
        assert.equal(created.length, 1)
        assert.equal(created[0].windowId, 7)
        assert.equal(created[0].url, 'chrome-extension://jstart/newtab.html')
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

test('相同输入切换引擎复用语义请求和结果，关闭输入框后重新判断', async () => {
    let finishClassification
    const { context, messages } = content(message => message.type === 'jstart:classifyAI'
        ? new Promise(resolve => { finishClassification = resolve })
        : Promise.resolve({ results: [] }))
    vm.runInContext('jStartAIProvider = { semanticEnabled: true }', context)
    context.input = '解释浏览器缓存的工作原理'
    for (const engine of ['google', 'baidu', 'bing']) {
        vm.runInContext(`jStartSearchType = '${engine}'`, context)
        context.onInputChange()
    }
    const requestCount = () => messages.filter(message => message.type === 'jstart:classifyAI').length
    assert.equal(requestCount(), 1)
    finishClassification({ route: 'ai' })
    await new Promise(setImmediate)
    assert.equal(context.getSuggestSelected().type, 'ai')
    context.onInputChange()
    await new Promise(setImmediate)
    assert.equal(requestCount(), 1)
    assert.equal(context.getSuggestSelected().type, 'ai')

    context.window = { removeEventListener() {} }
    vm.runInContext('removePageShortcutBlockers = () => {}', context)
    context.removeHTML()
    context.onInputChange()
    assert.equal(requestCount(), 2)
    finishClassification({ route: 'search' })
    await new Promise(setImmediate)
})

test('语义识别通信失败允许重试，配置变化后不复用旧结果', async () => {
    let fail = true
    const provider = { semanticEnabled: true }
    const { context, messages } = content(message => {
        if (message.type === 'jstart:aiProvider') return Promise.resolve(provider)
        if (message.type === 'jstart:classifyAI') return fail ? Promise.reject(new Error('通信失败')) : Promise.resolve({ route: 'ai' })
        return Promise.resolve({ results: [] })
    })
    const text = '解释浏览器缓存'
    await assert.rejects(context.requestAIRoute(text), /通信失败/)
    fail = false
    assert.equal((await context.requestAIRoute(text)).route, 'ai')
    await context.requestAIRoute(text)
    assert.equal(messages.filter(message => message.type === 'jstart:classifyAI').length, 2)
    await context.loadAIProvider()
    await context.requestAIRoute(text)
    assert.equal(messages.filter(message => message.type === 'jstart:classifyAI').length, 3)
})

test('搜索建议返回统一列表，Google 保留原始繁简文字，HTTP 失败不提供结果', async () => {
    let listener
    let failed = false
    const data = {
        baidu: { g: [{ q: '百度建议' }] },
        google: ['问题', ['蘋果手機', '苹果手机', '蘋果手機', '', null, 1]],
        bing: ['问题', ['必应建议', null]]
    }
    const context = load('background.js', {
        fetch: async url => ({
            ok: !failed, status: failed ? 503 : 200,
            json: async () => data[url.includes('baidu') ? 'baidu' : url.includes('google') ? 'google' : 'bing']
        }),
        chrome: {
            commands: { onCommand: event }, action: { onClicked: event },
            runtime: { onMessage: { addListener(value) { listener = value } } },
            tabs: { onActivated: event, onRemoved: event }
        }
    })
    for (const [type, expected] of [['baidu', ['百度建议']], ['google', ['蘋果手機', '苹果手机']], ['bing', ['必应建议']]]) {
        const replies = []
        assert.equal(listener({ type, searchWord: '问题' }, { tab: { id: 42 } }, reply => replies.push(reply)), true)
        await new Promise(setImmediate)
        assert.equal(replies.length, 1)
        assert.deepEqual(Array.from(replies[0].data), expected)
        assert.equal(replies[0].query, '问题')
    }
    failed = true
    assert.equal((await context.requestSearch('问题', 'google')).data, null)
})

test('重新输入同样文字时，旧搜索请求仍不会覆盖当前建议', async () => {
    const pending = []
    const { context } = content(message => message.searchWord
        ? new Promise(resolve => pending.push(resolve))
        : Promise.resolve({ results: [] }))
    for (const input of ['第一问', '第二问', '第一问']) {
        context.input = input
        context.onInputChange()
    }
    pending[2]({ type: 'google', query: '第一问', data: ['当前建议'] })
    await new Promise(setImmediate)
    pending[0]({ type: 'google', query: '第一问', data: ['旧建议'] })
    pending[1]({ type: 'google', query: '第二问', data: ['其他建议'] })
    await new Promise(setImmediate)
    assert.deepEqual(Array.from(context.getSelectableResults(), result => result.title), ['当前建议'])
})

test('编辑命令覆盖已有命令名时，保留无关命令并移除旧版本', () => {
    const source = readFileSync(resolve(__dirname, '..', 'options.js'), 'utf8')
    const editor = source.slice(source.indexOf('function saveFromEditor()'), source.indexOf('function removeCommand('))
    const commands = [{ id: 'a', key: 'a' }, { id: 'b', key: 'b' }, { id: 'c', key: 'c' }]
    let saved = false
    const context = vm.createContext({
        commands, normalizeCommandKey: value => value, saveCommands() { saved = true },
        nodes: { id: { value: 'b' }, key: { value: 'a' }, name: { value: '更新后的 B' },
            url: { value: 'https://example.com' }, newtab: { checked: false } }
    })
    vm.runInContext(editor + '\nsaveFromEditor()', context)
    assert.equal(saved, true)
    assert.deepEqual(commands.map(command => command.id), ['b', 'c'])
    assert.deepEqual(commands.map(command => command.key), ['a', 'c'])
    assert.equal(commands[0].name, '更新后的 B')
})

test('前 20 条以后的书签参与匹配和使用频次排序，保留最终展示上限', async () => {
    const bookmarks = Array.from({ length: 40 }, (_, index) => ({
        id: `${index}`, title: `关于 chrome 的笔记 ${index}`, url: `https://example.com/${index}`
    }))
    bookmarks.push({ id: 'best', title: 'chrome', url: 'https://example.com/best' })
    const usageStats = {}
    const context = load('background.js', { chrome: {
        commands: { onCommand: event }, action: { onClicked: event }, runtime: { onMessage: event },
        storage: { local: { get: async () => ({ jStartUsageStats: usageStats }) } },
        tabs: { onActivated: event, onRemoved: event, query: async () => [] },
        bookmarks: {
            getTree: async () => [{ children: bookmarks }],
            onCreated: event, onRemoved: event, onChanged: event, onMoved: event, onChildrenReordered: event
        }
    } })
    const normal = await context.searchLocal('chrome')
    assert.equal(normal.results.length, 3)
    assert.equal(normal.results[0].id, 'bookmark:best')
    const scoped = await context.searchLocal('/b chrome')
    assert.equal(scoped.results.length, 30)
    assert.equal(scoped.results[0].id, 'bookmark:best')
    usageStats['bookmark:https://example.com/39'] = { count: 10, lastUsedAt: Date.now() }
    const frequent = await context.searchLocal('chrome')
    assert.equal(frequent.results.length, 3)
    assert.equal(frequent.results[0].id, 'bookmark:39')
})

test('最近 Tab 切换只用浏览器记录，后台重启、切换第三页和关闭旧页后仍正确', async () => {
    let tabs = [
        { id: 1, windowId: 7, active: true, lastAccessed: 500 },
        { id: 2, windowId: 7, active: false, lastAccessed: 400 },
        { id: 3, windowId: 7, active: false, lastAccessed: 300 },
        { id: 4, windowId: 9, active: true, lastAccessed: 900 }
    ]
    let now = 500
    const switched = []
    function activate(id) {
        for (const tab of tabs.filter(tab => tab.windowId === 7)) {
            tab.active = tab.id === id
            if (tab.active) tab.lastAccessed = ++now
        }
    }
    const chrome = {
        commands: { onCommand: event }, action: { onClicked: event }, runtime: { onMessage: event },
        tabs: {
            query: async query => {
                assert.equal(query.currentWindow, true)
                return tabs.filter(tab => tab.windowId === 7)
            },
            update: async (id, options) => {
                assert.equal(options.active, true)
                switched.push(id)
                activate(id)
            }
        },
        windows: { update: async (id, options) => {
            assert.equal(id, 7)
            assert.equal(options.focused, true)
        } }
    }
    // 每次重新加载后台，确保切换不依赖上次运行留下的变量。
    await load('background.js', { chrome }).toTogglePreviousTab()
    await load('background.js', { chrome }).toTogglePreviousTab()
    activate(3)
    await load('background.js', { chrome }).toTogglePreviousTab()
    tabs = tabs.filter(tab => tab.id !== 3)
    await load('background.js', { chrome }).toTogglePreviousTab()
    assert.deepEqual(switched, [2, 1, 1, 2])
    tabs = tabs.filter(tab => tab.id !== 1)
    await load('background.js', { chrome }).toTogglePreviousTab()
    assert.equal(switched.length, 4)
    assert.equal(tabs.find(tab => tab.id === 4).active, true)
})

test('统一消息分发保留结果格式和参数，忽略 AI 及未知消息', async () => {
    let listener
    const context = load('background.js', { chrome: {
        commands: { onCommand: event }, action: { onClicked: event },
        runtime: { onMessage: { addListener(value) { listener = value } } }
    } })
    const command = { key: 'docs' }
    const folder = { id: 'folder-1' }
    context.searchLocal = async text => ({ results: [text] })
    context.executeResult = async (result, newTab) => ({ ok: result === command && newTab })
    context.getCustomCommands = async () => [command]
    context.saveCustomCommands = async commands => assert.deepEqual(commands, [command])
    context.getBookmarkSettings = async () => ({ folders: [folder], ignoredFolderIds: ['folder-1'] })
    context.saveIgnoredBookmarkFolderIds = async ids => assert.deepEqual(ids, ['folder-1'])
    for (const [message, expected] of [
        [{ type: 'jstart:searchLocal', text: '问题' }, { results: ['问题'] }],
        [{ type: 'jstart:executeResult', result: command, newTab: true }, { ok: true }],
        [{ type: 'jstart:getCommands' }, { commands: [command] }],
        [{ type: 'jstart:saveCommands', commands: [command] }, { ok: true }],
        [{ type: 'jstart:getBookmarkSettings' }, { folders: [folder], ignoredFolderIds: ['folder-1'] }],
        [{ type: 'jstart:saveIgnoredBookmarkFolders', folderIds: ['folder-1'] }, { ok: true }]
    ]) {
        let reply
        const response = new Promise(resolve => { reply = resolve })
        assert.equal(listener(message, {}, reply), true)
        assert.deepEqual(JSON.parse(JSON.stringify(await response)), expected)
    }
    for (const message of [null, {}, { type: 'jstart:aiProvider' }, { type: 'jstart:classifyAI' }, { type: 'unknown' }, { type: 'toString' }]) {
        assert.equal(listener(message, {}, () => assert.fail('不应回复这条消息')), false)
    }
    context.searchLocal = () => { throw new Error('读取失败') }
    context.saveCustomCommands = async () => { throw new Error('保存失败') }
    for (const type of ['jstart:searchLocal', 'jstart:saveCommands']) {
        const responses = []
        assert.equal(listener({ type }, {}, reply => responses.push(reply)), true)
        await new Promise(setImmediate)
        assert.equal(responses.length, 1)
        assert.equal(responses[0].ok, false)
        assert.match(responses[0].error, /失败/)
    }
})

test('命令目标网址由后台生成，前台显示与实际打开的网址一致', async () => {
    const opened = []
    const context = load('background.js', { chrome: {
        commands: { onCommand: event }, action: { onClicked: event }, runtime: { onMessage: event },
        storage: { local: { get: async () => ({}), set: async () => {} } },
        tabs: { create: async options => opened.push(options.url) }
    } })
    const result = context.createCustomCommandAction({
        id: 'docs', key: 'docs', name: '查询',
        urlTemplate: 'https://example.com/?q={query}&again={query}#{raw}', openInNewTab: true
    }, '中文 & x')
    assert.equal(result.url, 'https://example.com/?q=%E4%B8%AD%E6%96%87%20%26%20x&again=%E4%B8%AD%E6%96%87%20%26%20x#中文 & x')
    const { context: front } = content()
    assert.equal(front.getResultTargetUrl(result), result.url)
    assert.equal((await context.executeResult(result, false)).ok, true)
    assert.deepEqual(opened, [result.url])
})

test('后台和设置页使用同一命令名称规则', () => {
    const context = load('background.js', { chrome: {
        commands: { onCommand: event }, action: { onClicked: event }, runtime: { onMessage: event }
    } })
    const source = readFileSync(resolve(__dirname, '..', 'options.js'), 'utf8')
    const front = vm.runInNewContext(`(${source.slice(source.indexOf('function normalizeCommandKey('))})`)
    for (const [input, expected] of [['Foo Bar', 'foobar'], ['ab.c', 'abc'], ['中文', ''],
        ['/Docs', 'docs'], ['foo_bar', 'foo_bar'], ['foo-bar', 'foo-bar'], [' /Doc s ', 'docs']]) {
        assert.equal(front(input), expected)
        assert.equal(context.normalizeCommandKey(input), expected)
    }
})
