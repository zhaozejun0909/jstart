import { AI_PROVIDERS, DEFAULT_AI_PROMPTS, loadAISettings } from './ai-settings.js'

const get = id => document.getElementById(`ai-${id}`)
const settings = await loadAISettings()
const { jStartAIProvider } = await chrome.storage.local.get('jStartAIProvider')
// 正在编辑的平台，打开时默认是正在使用的模型。使用哪个模型在搜索框里切换，这里不再修改。
let current = AI_PROVIDERS[jStartAIProvider] ? jStartAIProvider : 'doubao'
let saveTimer
const promptDrafts = Object.fromEntries(Object.entries(settings.providers).map(([id, config]) => [id, config.prompt]))

function saveSettings() {
    clearTimeout(saveTimer)
    saveTimer = null
    return chrome.storage.local.set({ jStartAISettings: settings })
}

function queueSave() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(saveSettings, 300)
}

function updatePromptStatus() {
    get('status').textContent = get('prompt').value === settings.providers[current].prompt ? '' : '提示词尚未保存'
}

function showProvider() {
    get('key').value = settings.providers[current].key
    get('prompt').value = promptDrafts[current]
    updatePromptStatus()
}

function updateSemanticStatus() {
    const status = get('semantic-status')
    status.hidden = !settings.semanticEnabled || Boolean(settings.providers.deepseek.key)
    status.textContent = '请先在上方选择 DeepSeek 并填写 API Key'
}

get('provider').value = current
get('semantic-enabled').checked = settings.semanticEnabled
showProvider()
updateSemanticStatus()

get('provider').addEventListener('change', () => {
    promptDrafts[current] = get('prompt').value
    current = get('provider').value
    showProvider()
})
get('key').addEventListener('input', () => {
    settings.providers[current].key = get('key').value.trim()
    updateSemanticStatus()
    queueSave()
})
get('key').addEventListener('change', () => {
    settings.providers[current].key = get('key').value.trim()
    updateSemanticStatus()
    saveSettings()
})
get('semantic-enabled').addEventListener('change', () => {
    settings.semanticEnabled = get('semantic-enabled').checked
    updateSemanticStatus()
    saveSettings()
})
get('prompt').addEventListener('input', () => {
    promptDrafts[current] = get('prompt').value
    updatePromptStatus()
})
get('restore').addEventListener('click', () => {
    get('prompt').value = DEFAULT_AI_PROMPTS[current]
    promptDrafts[current] = get('prompt').value
    updatePromptStatus()
})
get('save').addEventListener('click', async () => {
    settings.providers[current].prompt = get('prompt').value
    promptDrafts[current] = get('prompt').value
    await saveSettings()
    get('status').textContent = '提示词已保存'
})
window.addEventListener('pagehide', () => { if (saveTimer) saveSettings() })
