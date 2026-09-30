import { test } from 'node:test'
import assert from 'node:assert/strict'

let onConnect
let onMessage
let storedSettings = { providers: { doubao: { key: 'test-key' } } }
globalThis.chrome = {
    runtime: {
        onMessage: { addListener(listener) { onMessage = listener } },
        onConnect: { addListener(listener) { onConnect = listener } }
    },
    storage: {
        local: { async get() { return { jStartAISettings: storedSettings, jStartAIProvider: 'mimo' } } }
    }
}

const { buildAIRequest } = await import('../ai-background.js')
const { loadAISettings } = await import('../ai-settings.js')

test('原 MiMo Key 可用于新增问答模型，语义识别改用 DeepSeek Key', async () => {
    storedSettings = { mimoKey: 'old-mimo-key', mimoEnabled: true, providers: { deepseek: { key: 'deepseek-key' } } }
    const settings = await loadAISettings()
    assert.equal(settings.providers.mimo.key, 'old-mimo-key')
    assert.equal(settings.semanticEnabled, true)
    const provider = await new Promise(resolve => onMessage({ type: 'jstart:aiProvider' }, null, resolve))
    assert.equal(provider.id, 'mimo')
    assert.equal(provider.semanticEnabled, true)
    storedSettings = { providers: { doubao: { key: 'test-key' } } }
})

test('DeepSeek 按顺序回传本次会话的问答和图片', () => {
    const history = [{ question: '这是什么？', images: ['data:image/png;base64,AAAA'], answer: '一张图。' }]
    const body = JSON.parse(buildAIRequest('deepseek', { key: 'test-key' }, '提示词', '再解释一下', [], history).body)
    assert.equal(body.messages.length, 4)
    assert.equal(body.messages[0].role, 'system')
    assert.equal(body.messages[1].content[1].image_url.url, history[0].images[0])
    assert.deepEqual(body.messages[2], { role: 'assistant', content: '一张图。' })
    assert.equal(body.messages[3].content, '再解释一下')
})

test('MiMo Flash 使用官方鉴权和图片格式回传上下文，不提供联网工具', () => {
    const history = [{ question: '第一问', images: ['data:image/png;base64,AAAA'], answer: '第一答' }]
    const request = buildAIRequest('mimo', { key: 'tp-test-key' }, '提示词', '第二问', [], history)
    const body = JSON.parse(request.body)
    assert.equal(request.headers['api-key'], 'tp-test-key')
    assert.equal(request.headers.Authorization, undefined)
    assert.equal(body.model, 'mimo-v2.6-flash')
    assert.equal(body.stream, true)
    assert.equal(body.tools, undefined)
    assert.deepEqual(body.messages.map(message => message.role), ['system', 'user', 'assistant', 'user'])
    assert.equal(body.messages[1].content[1].image_url.url, history[0].images[0])
    assert.equal(body.messages[2].content, '第一答')
})

test('DeepSeek 语义识别复用问答 Key，并按 50% 阈值推荐', async () => {
    storedSettings = { semanticEnabled: true, providers: { deepseek: { key: 'deepseek-key' } } }
    let request
    let score = 49
    globalThis.fetch = async (url, options) => {
        request = { url, options }
        return Response.json({ choices: [{ message: { content: JSON.stringify({ ai_probability: score }) } }] })
    }
    const classify = () => new Promise(resolve => onMessage({ type: 'jstart:classifyAI', text: '解释浏览器缓存' }, null, resolve))
    assert.equal((await classify()).route, 'search')
    score = 50
    assert.equal((await classify()).route, 'ai')
    const body = JSON.parse(request.options.body)
    assert.equal(request.url, 'https://api.deepseek.com/chat/completions')
    assert.equal(request.options.headers.Authorization, 'Bearer deepseek-key')
    assert.equal(body.model, 'deepseek-flash')
    assert.deepEqual(body.thinking, { type: 'disabled' })
    assert.deepEqual(body.response_format, { type: 'json_object' })
    assert.equal(body.tools, undefined)
    storedSettings = { providers: { doubao: { key: 'test-key' } } }
})

test('豆包不存储响应，手动回传完整的加密思考和回答', () => {
    const reasoning = { type: 'reasoning', id: 'rs-1', status: 'completed', encrypted_content: 'encrypted-payload', summary: [{ type: 'summary_text', text: '摘要' }] }
    const answer = { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: '第一轮答案' }] }
    const history = [{ question: '第一问', images: [], output: [reasoning, answer] }]
    const body = JSON.parse(buildAIRequest('doubao', { key: 'test-key' }, '提示词', '继续', [], history).body)
    assert.equal(body.store, false)
    assert.equal(body.previous_response_id, undefined)
    assert.deepEqual(body.input.map(item => item.type || item.role), ['user', 'reasoning', 'message', 'user'])
    assert.deepEqual(body.input[1], reasoning)
    assert.equal(body.input[3].content[0].text, '继续')
})

test('豆包流式结果保留可回传的输出条目，不把联网调用塞进历史输入', async () => {
    const listeners = {}
    const events = []
    const port = {
        name: 'jstart:ai',
        onDisconnect: { addListener(listener) { listeners.disconnect = listener } },
        onMessage: { addListener(listener) { listeners.message = listener } },
        postMessage(event) { events.push(event) }
    }
    onConnect(port)
    const output = [
        { type: 'reasoning', encrypted_content: 'encrypted-payload', status: 'completed' },
        { type: 'web_search_call', action: { queries: ['测试'] }, status: 'completed' },
        { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: '回答' }] }
    ]
    const frame = `data: ${JSON.stringify({ type: 'response.completed', response: { output } })}\n\n`
    globalThis.fetch = async () => new Response(frame, { status: 200 })
    await listeners.message({ type: 'ask', provider: 'doubao', question: '提问', images: [], history: [] })
    assert.equal(events.find(event => event.type === 'text').text, '回答')
    assert.deepEqual(events.find(event => event.type === 'context').context.output, [output[0], output[2]])
    assert.equal(events.at(-1).type, 'done')
})

test('MiMo Token Plan 流式回答走官方接口并保留本轮答案', async () => {
    storedSettings = { providers: { mimo: { key: 'tp-test-key' } } }
    const listeners = {}
    const events = []
    const port = {
        name: 'jstart:ai',
        onDisconnect: { addListener(listener) { listeners.disconnect = listener } },
        onMessage: { addListener(listener) { listeners.message = listener } },
        postMessage(event) { events.push(event) }
    }
    onConnect(port)
    let endpoint
    globalThis.fetch = async url => {
        endpoint = url
        return new Response('data: {"choices":[{"delta":{"content":"回答"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n', { status: 200 })
    }
    await listeners.message({ type: 'ask', provider: 'mimo', question: '提问', images: [], history: [] })
    assert.equal(endpoint, 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions')
    assert.equal(events.find(event => event.type === 'context').context.answer, '回答')
    assert.equal(events.at(-1).type, 'done')
})
