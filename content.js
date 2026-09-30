/* eslint-disable */

// 同一页面只初始化一次，避免自动注入与补注入同时响应消息。
(() => {

const existingMessageListener = globalThis.__jStartMessageListener
if (existingMessageListener && chrome.runtime.onMessage.hasListener(existingMessageListener)) return

let jStrartActived = false
let jStartSearchType = 'google'
let jStarttabStart = false
let jStartEngineResults = []
let jStartLocalResults = []
let jStartAIResult = null
let jStartSuggestSelectedIndex = -1
let jStartUserSelectedResult = false
let jStartInputVersion = 0
let jStartLastInput = ''
let jStartParameterMode = false
let jStartHost = null
let jStartRoot = null
let jStartIsComposing = false
let jStartLoadingResultId = null
let jStartLoadingUrl = ''
let jStartAIProvider = null
let jStartAIProviderRequest = null
let jStartAIRouteRequests = new Map()
let jStartAISession = null
let jStartAIBusy = false
let jStartAIViewPromise
let jStartAIRequestVersion = 0
let jStartLocalRequest = null
let jStartImages = []

const SEARCH_LOGOS = {
    google: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCI+PHBhdGggZmlsbD0iI0ZCQkMwNSIgZD0iTTQzLjYgMjAuNUgyNHY3LjloMTEuM0MzNC4yIDMzLjcgMjkuOCAzNyAyNCAzN2MtNy4yIDAtMTMtNS44LTEzLTEzczUuOC0xMyAxMy0xM2MzLjEgMCA1LjkgMS4xIDguMSAyLjlsNS42LTUuNkMzNC4xIDQuNSAyOS4zIDIgMjQgMiAxMS44IDIgMiAxMS44IDIgMjRzOS44IDIyIDIyIDIyYzExIDAgMjEtOCAyMS0yMiAwLTEuMy0uMS0yLjQtLjQtMy41eiIvPjxwYXRoIGZpbGw9IiNFQTQzMzUiIGQ9Ik02LjMgMTQuN2w2LjYgNC44QzE0LjcgMTQuNiAxOSAzMSAyNCAzMWMzLjEgMCA1LjktMS4xIDguMS0yLjlsNS42IDUuNkMzNC4xIDM3LjUgMjkuMyA0MCAyNCA0MGMtOC44IDAtMTYtNy4yLTE2LTE2IDAtMy4zIDEuMS02LjQgMy4zLTkuM3oiLz48cGF0aCBmaWxsPSIjMzRBODUzIiBkPSJNNi4zIDMzLjNsNi42LTQuOEMxNC43IDMzLjQgMTkgMzcgMjQgMzdjMy4xIDAgNS45LTEuMSA4LjEtMi45bDUuNiA1LjZDMzQuMSA0My41IDI5LjMgNDYgMjQgNDYgMTYuMSA0NiA5LjIgNDEuOCA1LjMgMzUuNXoiLz48cGF0aCBmaWxsPSIjNDI4NUY0IiBkPSJNNDUgMjRjMC0xLjMtLjEtMi40LS40LTMuNUgyNHY3LjloMTEuM0MzNC44IDMxIDMwLjUgMzcgMjQgMzdjLTMuMSAwLTUuOS0xLjEtOC4xLTIuOWwtNS42IDUuNkMxNC4xIDQzLjUgMTguOSA0NiAyNCA0NmMxMSAwIDIxLTggMjEtMjJ6Ii8+PC9zdmc+',
    baidu: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzMzODVmZiI+PHBhdGggZD0iTTkuMTU0IDBDNy43MSAwIDYuNTQgMS42NTggNi41NCAzLjcwN2MwIDIuMDUxIDEuMTcxIDMuNzEgMi42MTUgMy43MSAxLjQ0NiAwIDIuNjE0LTEuNjU5IDIuNjE0LTMuNzFDMTEuNzY4IDEuNjU4IDEwLjYgMCA5LjE1NCAwem03LjAyNS41OTRDMTQuODYuNTggMTMuMzQ3IDIuNTg5IDEzLjIgMy45MjdjLS4xODcgMS43NDUuMjUgMy40ODcgMi4xNzkgMy43MzUgMS45MzMuMjUgMy4xNzUtMS44MDYgMy40MjItMy4zNjQuMjUyLTEuNTU1LS45OTUtMy4zNjQtMi4zNjItMy42NzRhMS4yMTggMS4yMTggMCAwIDAtLjI2MS0uMDN6TTMuNTgyIDUuNTM1YTIuODExIDIuODExIDAgMCAwLS4xNTYuMDA4Yy0yLjExOC4xOS0yLjQyOCAzLjI0LTIuNDI4IDMuMjQtLjI4NyAxLjQxLjY4NiA0LjQyNSAzLjI5NyAzLjg2NCAyLjYxNy0uNTYxIDIuMjYyLTMuNjggMi4xODMtNC4zNjItLjEyNS0xLjAxOC0xLjI5Mi0yLjc3My0yLjg5Ni0yLjc1em0xNi41MzQgMS43NTNjLTIuMzA4IDAtMi42MTcgMi4xMTktMi42MTcgMy42MTYgMCAxLjQzLjEyMSAzLjQyNSAyLjk4OCAzLjM2MiAyLjg2Ny0uMDYzIDIuNTUzLTMuMjM4IDIuNTUzLTMuOTg4IDAtLjc0NS0uNjItMi45OS0yLjkyNC0yLjk5em0tOC4yNjQgMi40NzhjLTEuNDI0LjAxNC0yLjcwOC45MjUtMy4zMjMgMS45NDctMS4xMTggMS44NjgtMi44NjMgMy4wNS0zLjExMiAzLjM2My0uMjUuMzA5LTMuNjEgMi4xMTYtMi44NjQgNS40Mi43NDYgMy4zMDEgMy4zNjUgMy4yMzcgMy4zNjUgMy4yMzdzMS45My4xOSA0LjE3MS0uMzFjMi4yNC0uNDk1IDQuMTcuMTIzIDQuMTcuMTIzczUuMjMzIDEuNzQ4IDYuNjY1LTEuNjE2YzEuNDMtMy4zNjQtLjgwOC01LjEwOS0uODA4LTUuMTA5cy0yLjk5LTIuMzA2LTQuNzM2LTQuNzk4Yy0xLjA3Mi0xLjY2NS0yLjM0OC0yLjI2OC0zLjUyOC0yLjI1N3ptLTIuMjM0IDMuODRsMS41NDIuMDI0djguMTk3SDcuNzU4Yy0xLjQ3LS4yOTEtMi4wNTUtMS4yOTItMi4xMy0xLjQ2Mi0uMDcyLS4xNzMtLjQ4OC0uOTc2LS4yNjgtMi4zNDMuNjM1LTIuMDQ5IDIuNDQ3LTIuMTk2IDIuNDQ3LTIuMTk2aDEuODF6bTMuOTY0IDIuMzl2My44ODFjLjA5Ni40MTMuNjEyLjQ4OC42MTIuNDg4aDEuNjE0di00LjM0M2gxLjY4OXY1Ljc4MmgtMy45MTVjLTEuNTE3LS4zOS0xLjU5LTEuNDY1LTEuNTktMS40NjV2LTQuMzE3em0tNS40NTggMS4xNDdjLS42Ni4xOTctLjk3OC43MDgtMS4wNS45MjgtLjA3Ni4yMi0uMjQ3Ljc4LS4xIDEuMjY5LjI5NCAxLjA5NSAxLjI0OCAxLjE0NCAxLjI0OCAxLjE0NGgxLjM3di0zLjM0eiIvPjwvc3ZnPg==',
    bing: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+PHJlY3QgeD0iMSIgeT0iMSIgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iI2YyNTAyMiIvPjxyZWN0IHg9IjExIiB5PSIxIiB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjN2ZiYTAwIi8+PHJlY3QgeD0iMSIgeT0iMTEiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiMwMGE0ZWYiLz48cmVjdCB4PSIxMSIgeT0iMTEiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmZmI5MDAiLz48L3N2Zz4='
}

const TYPE_LABELS = {
    ai: 'AI',
    url: '网址',
    engine: '搜索',
    bookmark: '书签',
    tab: '标签',
    history: '历史',
    command: '命令'
}

function handleJStartMessage(message, sender, sendResponse) {
    if (!message.type) return false
    if (message.type === 'jstart') {
        if (message.data === 'showStartPage' || message.data === 'focusStartPage') {
            showMainView(message.data === 'focusStartPage')
        } else {
            return false
        }
    } else {
        return false
    }
    sendResponse(true)
    return false
}

chrome.runtime.onMessage.addListener(handleJStartMessage)
globalThis.__jStartMessageListener = handleJStartMessage

chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area === 'local' && jStrartActived && (changes.jStartAISettings || changes.jStartAIProvider)) loadAIProvider()
})

function showMainView(alwaysShow = false) {
    if (jStartHost?.isConnected) {
        if (alwaysShow) focusOnSearch()
        else removeHTML()
    } else {
        // 扩展重载后，旧脚本留下的面板不能继续使用。
        document.getElementById('jstart-shadow-host')?.remove()
        insertHTML()
    }
}

function setNewTabGuideVisible(visible) {
    if (!jStarttabStart || !document.body) return
    document.body.classList.toggle('jstart-guide-visible', visible)
}

function insertHTML() {
    setNewTabGuideVisible(false)
    jStartHost = document.createElement('div')
    jStartHost.id = 'jstart-shadow-host'
    jStartHost.style.all = 'initial'
    jStartHost.style.position = 'fixed'
    jStartHost.style.inset = '0'
    jStartHost.style.zIndex = '2147483647'
    jStartHost.style.visibility = 'hidden'
    document.documentElement.appendChild(jStartHost)
    jStartRoot = jStartHost.attachShadow({ mode: 'closed' })
    jStartRoot.innerHTML = `
        <link rel="stylesheet" href="${chrome.runtime.getURL('jstart.css')}">
        ${getstr()}
    `
    jStrartActived = true
    jStartEngineResults = []
    jStartLocalResults = []
    jStartAIResult = null
    jStartSuggestSelectedIndex = -1
    jStartUserSelectedResult = false
    jStartLastInput = ''
    jStartParameterMode = false
    jStartLocalRequest = null
    jStartImages = []
    jStartInputVersion++
    jStartAISession = null
    jStartAIBusy = false
    jStartAIRouteRequests = new Map()

    const view = getJStartElement('jstart-content-view')
    if (jStarttabStart) {
        view.style.display = 'block'
    } else {
        view.style.display = 'block'
        view.classList.add('jstart-content-visible')
    }

    chrome.storage.local.get('jStartSearchType', function (result) {
        if (result && result.jStartSearchType) {
            jStartSearchType = result.jStartSearchType
        }
        refreshLogo()
        onInputChange()
        revealAfterStyleLoaded()
    })
    loadAIProvider()

    const input = getJStartElement('j-input-view-input')
    input.addEventListener('keydown', handleJStartKeydown, true)
    input.addEventListener('paste', handleImagePaste)
    input.addEventListener('input', resizeSearchInput)
    const refreshDebounced = debounce(refreshInputResults, 120)
    input.addEventListener('input', refreshDebounced)
    window.addEventListener('resize', resizeSearchInput)
    input.addEventListener('compositionstart', () => {
        jStartIsComposing = true
    })
    input.addEventListener('compositionend', () => {
        jStartIsComposing = false
        refreshDebounced()
    })
    getJStartElement('j-logo-view-button').addEventListener('click', changeSearchType)
    getJStartElement('j-parameter-mode-button').addEventListener('click', toggleParameterMode)
    getJStartElement('j-image-previews').addEventListener('click', event => {
        const index = event.target.closest('[data-image-index]')?.dataset.imageIndex
        if (index === undefined) return
        jStartImages.splice(Number(index), 1)
        renderImagePreviews()
        onInputChange()
        focusOnSearch()
    })
    getJStartElement('jstart-content-view').addEventListener('click', handleBackdropClick)
    jStartRoot.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || isImeComposing(event)) return
        event.preventDefault()
        event.stopImmediatePropagation()
        removeHTML()
    }, true)
    addPageShortcutBlockers()
}

async function submitCurrentInput(newTab) {
    if (jStartImages.length) {
        const question = getInputValue().trim() || '请说明图片中的主要内容。'
        startAIAnswer(question, [...jStartImages])
        return
    }
    refreshInputResults()
    if (jStartLocalRequest) {
        const version = jStartInputVersion
        await jStartLocalRequest
        if (version !== jStartInputVersion || !jStrartActived) return
    }
    if (jStartParameterMode && !getInputValue()) {
        focusOnSearch()
        return
    }
    const result = getSuggestSelected()
    if (result) {
        executeSuggestResult(result, newTab)
        return
    }

    const value = getInputValue()
    if (value.startsWith('/') && jStartLocalResults.length === 1) {
        executeSuggestResult(jStartLocalResults[0], newTab)
        return
    }

    if (!value.startsWith('/')) {
        if (jStartSearchType === 'ai') startAIAnswer(value)
        else handleKeywordSearch(value, newTab)
    }
}

function executeSuggestResult(result, newTab) {
    if (result.action && result.action.kind === 'fill') {
        const input = getJStartElement('j-input-view-input')
        jStartParameterMode = false
        input.value = result.action.value
        resizeSearchInput()
        onInputChange()
        return
    }

    if (result.type === 'engine') {
        if (!newTab && !jStartAISession) showLoadingState(result, buildKeywordSearchUrl(result.title))
        handleKeywordSearch(result.title, newTab)
        return
    }
    if (result.type === 'ai') {
        const question = getInputValue()
        jStartSearchType = 'ai'
        chrome.storage.local.set({ jStartSearchType })
        refreshLogo()
        onInputChange()
        startAIAnswer(question)
        return
    }

    const effectiveNewTab = newTab || Boolean(jStartAISession && ['open_url', 'open_url_template'].includes(result.action?.kind))
    const keepUIWhileNavigating = shouldKeepUIWhileNavigating(result, effectiveNewTab)
    const inputVersion = jStartInputVersion
    if (keepUIWhileNavigating) showLoadingState(result, getResultTargetUrl(result))
    chrome.runtime.sendMessage(chrome.runtime.id, {
        type: 'jstart:executeResult',
        result,
        newTab: effectiveNewTab
    }).then(response => {
        if (response && response.ok === false) throw new Error(response.error || '无法打开，请重试')
        if (inputVersion !== jStartInputVersion) return
        if (jStartAISession) clearSearchComposer()
        else if (!keepUIWhileNavigating) removeHTML()
    }).catch(error => {
        if (inputVersion !== jStartInputVersion) return
        clearLoadingState()
        const item = getJStartElements('.jstart-suggest-view-item')[getResultIndex(result)]
        if (!item) return
        item.classList.add('jstart-error-result')
        const subtitle = item.querySelector('.jstart-suggest-subtitle')
        subtitle.hidden = false
        subtitle.textContent = error.message
    })
}

function shouldKeepUIWhileNavigating(result, newTab) {
    const action = result && result.action
    if (!action) return false
    if (action.kind === 'open_url') return !newTab
    if (action.kind === 'open_url_template') return !(action.openInNewTab || newTab)
    return false
}

function handleKeywordSearch(value, newTab) {
    const goUrl = buildKeywordSearchUrl(value)

    if (!newTab && !jStartAISession) {
        location.assign(goUrl)
    } else if (jStartAISession) {
        const session = jStartAISession
        const inputVersion = jStartInputVersion
        chrome.runtime.sendMessage({
            type: 'jstart:executeResult',
            result: { type: 'url', action: { kind: 'open_url', url: goUrl } },
            newTab: true
        }).then(response => {
            if (session !== jStartAISession || inputVersion !== jStartInputVersion) return
            if (response?.ok) clearSearchComposer()
            else throw new Error(response?.error || '无法打开搜索页面，请重试。')
        }).catch(error => {
            if (session !== jStartAISession || inputVersion !== jStartInputVersion) return
            const notice = getJStartElement('j-image-error')
            notice.textContent = error.message
            notice.hidden = false
        })
    } else {
        window.open(goUrl, '_blank')
        removeHTML()
    }
}

function clearSearchComposer() {
    const input = getJStartElement('j-input-view-input')
    if (!input) return
    input.value = ''
    jStartParameterMode = false
    jStartImages = []
    renderImagePreviews()
    onInputChange()
    resizeSearchInput()
    focusOnSearch()
}

function buildKeywordSearchUrl(value) {
    const encoded = encodeURIComponent(value)
    if (value.length === 0) {
        if (jStartSearchType === 'google') return 'https://www.google.com/search'
        if (jStartSearchType === 'baidu') return 'https://www.baidu.com/'
        if (jStartSearchType === 'bing') return 'https://www.bing.com/'
    }
    if (jStartSearchType === 'google') return `https://www.google.com/search?q=${encoded}`
    if (jStartSearchType === 'baidu') return `https://www.baidu.com/s?ie=UTF-8&wd=${encoded}`
    if (jStartSearchType === 'bing') return `https://www.bing.com/search?q=${encoded}`
    return ''
}

function showLoadingState(result, targetUrl) {
    jStartLoadingResultId = result && result.id
    jStartLoadingUrl = targetUrl || ''
    refreshLoadingResult()
}

function clearLoadingState() {
    jStartLoadingResultId = null
    jStartLoadingUrl = ''
    refreshLoadingResult()
}

function refreshLoadingResult() {
    getJStartElements('.jstart-suggest-view-item').forEach(item => {
        const result = getSelectableResults()[Number(item.getAttribute('data-index'))]
        const isLoading = result && result.id === jStartLoadingResultId
        item.classList.toggle('jstart-loading-result', Boolean(isLoading))
        const subtitle = item.querySelector('.jstart-suggest-subtitle')
        if (!subtitle) return
        subtitle.hidden = !isLoading && result.type === 'engine'
        subtitle.textContent = isLoading
            ? `正在打开 ${jStartLoadingUrl || getResultTargetUrl(result) || result.title || ''}`
            : result.type === 'engine' ? '' : result.subtitle || TYPE_LABELS[result.type] || ''
    })
}

function getResultTargetUrl(result) {
    const action = result && result.action
    if (!action) return result && result.url ? result.url : ''
    if (action.kind === 'open_url') return action.url || result.url || ''
    return result && result.url ? result.url : ''
}

function removeHTML() {
    clearAISession()
    jStartAIRouteRequests = new Map()
    jStartImages = []
    jStartInputVersion++
    removePageShortcutBlockers()
    window.removeEventListener('resize', resizeSearchInput)
    if (jStartHost) jStartHost.remove()
    jStartHost = null
    jStartRoot = null
    jStrartActived = false
    setNewTabGuideVisible(true)
}

async function handleImagePaste(event) {
    const files = Array.from(event.clipboardData?.items || [])
        .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
        .map(item => item.getAsFile()).filter(Boolean)
    if (!files.length) return
    event.preventDefault()
    const error = getJStartElement('j-image-error')
    const fail = message => { error.textContent = message; error.hidden = false }
    if (jStartImages.length + files.length > 4) return fail('最多粘贴 4 张图片。')
    if (files.some(file => !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type))) return fail('支持 PNG、JPEG、GIF 和 WebP 图片。')
    if (files.some(file => file.size > 5 * 1024 * 1024)) return fail('单张图片不能超过 5 MB。')
    const root = jStartRoot
    try {
        const images = await Promise.all(files.map(compressPastedImage))
        if (root !== jStartRoot) return
        jStartParameterMode = false
        jStartImages.push(...images)
        error.hidden = true
        renderImagePreviews()
        onInputChange()
    } catch {
        if (root === jStartRoot) fail('图片读取失败，请重新粘贴。')
    }
}

async function compressPastedImage(file) {
    const image = await createImageBitmap(file)
    const scale = Math.min(1, 1500 / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const context = canvas.getContext('2d')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    image.close()
    const compressed = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    // 小图压缩后更大时保留原图；缩放过的图片始终使用缩放结果。
    const result = scale === 1 && compressed.size >= file.size ? file : compressed
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(result)
    })
}

function renderImagePreviews() {
    const container = getJStartElement('j-image-previews')
    if (!container) return
    container.replaceChildren(...jStartImages.map((src, index) => {
        const item = document.createElement('span')
        item.className = 'j-image-preview'
        const image = document.createElement('img')
        image.src = src
        image.alt = `已粘贴的图片 ${index + 1}`
        const remove = document.createElement('button')
        remove.type = 'button'
        remove.dataset.imageIndex = index
        remove.setAttribute('aria-label', `删除图片 ${index + 1}`)
        remove.title = '删除图片'
        remove.textContent = '×'
        item.append(image, remove)
        return item
    }))
    container.hidden = !jStartImages.length
    getJStartElement('j-image-error').hidden = true
    refreshLogo()
}

function handleSearchResult(result) {
    if (jStartSearchType === 'ai' || jStartParameterMode || jStartImages.length) return
    if (result?.type !== jStartSearchType || !Array.isArray(result.data) || result.query !== getInputValue()) return
    if (parseNavigationUrl(getInputValue())) return
    updateSuggestions(() => { jStartEngineResults = result.data.map(createEngineResult) })
}

function createEngineResult(title) {
    return {
        id: `engine:${title}`,
        type: 'engine',
        title,
        subtitle: jStartSearchType,
        action: {
            kind: 'search'
        }
    }
}

// 只判断明确的网址；普通词语和斜杠命令继续走原来的搜索逻辑。
function parseNavigationUrl(input) {
    const text = input.trim()
    if (!text || text.startsWith('/') || /[\r\n\t]/.test(text)) return null

    try {
        if (/^(https?|file):\/\//i.test(text)) {
            const url = new URL(text)
            if (url.protocol === 'file:') return url.href
            return url.hostname && !/\s/.test(text) ? url.href : null
        }
        if (/\s/.test(text)) return null
        const url = new URL(`https://${text}`)
        if (url.username || url.password) return null
        const host = url.hostname
        const isLocal = host === 'localhost' || host.endsWith('.localhost')
        const isIP = /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.startsWith('[')
        const isDomain = host.includes('.') && host.split('.').every(label => /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label))
        if (!isLocal && !isIP && !isDomain) return null
        // 无协议输入排除常见文件后缀；明确带协议的链接仍可直接打开。
        const fileSuffixes = ['js', 'jsx', 'mjs', 'cjs', 'json', 'ts', 'tsx', 'css', 'scss', 'sass', 'less',
            'html', 'htm', 'xml', 'yaml', 'yml', 'txt', 'md', 'zip']
        if (!isLocal && !isIP && fileSuffixes.includes(host.split('.').at(-1))) return null
        // 不把纯数字误识别成 URL；URL 解析器会把它转换成 IPv4。
        if (isIP && !/[.\[]/.test(text.split(/[/?#]/)[0])) return null
        return isLocal || isIP ? new URL(`http://${text}`).href : url.href
    } catch {
        return null
    }
}

function refreshInputResults() {
    if (jStartIsComposing) return
    if (getRawInputValue() !== jStartLastInput) onInputChange()
}

function onInputChange() {
    if (!getRawInputValue()) jStartParameterMode = false
    const text = getInputValue()
    jStartLastInput = getRawInputValue()
    const inputVersion = ++jStartInputVersion
    clearLoadingState()
    jStartSuggestSelectedIndex = -1
    jStartUserSelectedResult = false
    jStartEngineResults = []
    jStartLocalResults = []
    jStartAIResult = null
    jStartLocalRequest = null

    if (jStartImages.length) {
        refreshParameterToggle(null)
        removeSuggest()
        return
    }

    const url = parseNavigationUrl(text)
    refreshParameterToggle(url)

    if (!text) {
        removeSuggest()
        return
    }

    if (url) {
        jStartLocalResults = [{
            id: `url:${url}`,
            type: 'url',
            title: url,
            subtitle: url.startsWith('file:') ? '打开本地文件' : '打开网址',
            action: { kind: 'open_url', url }
        }]
        jStartEngineResults = jStartSearchType === 'ai' ? [] : [createEngineResult(text.trim())]
        jStartSuggestSelectedIndex = 0
        renderSuggest()
        return
    }

    if (!shouldBypassLocalResults(text)) {
        jStartLocalRequest = requestLocalResults(text, inputVersion)
    }

    if (jStartSearchType !== 'ai' && !text.startsWith('/')) {
        chrome.runtime.sendMessage(chrome.runtime.id, {
            type: jStartSearchType,
            searchWord: text
        }).then(result => {
            if (inputVersion === jStartInputVersion) handleSearchResult(result)
        }).catch(() => {})
        if (!/\s$/.test(text) && jStartAIProvider?.semanticEnabled) {
            requestAIRoute(text).then(result => {
                if (result?.route !== 'ai' || inputVersion !== jStartInputVersion || text !== getInputValue() || jStartSearchType === 'ai') return
                updateSuggestions(() => {
                    jStartAIResult = {
                        id: `ai:${text}`, type: 'ai',
                        title: '问问 AI 吧',
                        subtitle: '此问题更适合 AI 回答哦'
                    }
                })
            }).catch(() => {})
        }
    }

    renderSuggest()
}

function requestAIRoute(text) {
    const cache = jStartAIRouteRequests
    if (!cache.has(text)) {
        const request = chrome.runtime.sendMessage({ type: 'jstart:classifyAI', text }).catch(error => {
            cache.delete(text)
            throw error
        })
        cache.set(text, request)
    }
    return cache.get(text)
}

function requestLocalResults(text, inputVersion) {
    return chrome.runtime.sendMessage(chrome.runtime.id, {
        type: 'jstart:searchLocal',
        text
    }).then(response => {
        if (inputVersion !== jStartInputVersion || text !== getInputValue()) return
        updateSuggestions(() => { jStartLocalResults = response && response.results ? response.results : [] })
    }).catch(() => {})
}

function shouldBypassLocalResults(text) {
    return !text.startsWith('/') && /\s$/.test(text)
}

function updateSuggestions(update) {
    const selectedId = getSuggestSelected()?.id
    update()
    const selectedIndex = selectedId ? getResultIndex({ id: selectedId }) : -1
    jStartSuggestSelectedIndex = jStartUserSelectedResult && selectedIndex >= 0
        ? selectedIndex
        : (jStartLocalResults.length || jStartAIResult) ? 0 : selectedIndex
    renderSuggest()
}

function renderSuggest() {
    removeSuggest()
    const showEngine = !getInputValue().startsWith('/') && (jStartAIResult || jStartEngineResults.length)
    const showLocal = jStartLocalResults.length > 0
    if (!showEngine && !showLocal) return

    const suggestHtml = document.createElement('div')
    suggestHtml.className = 'jstart-suggest-view'
    suggestHtml.id = 'jstart-suggest-view'
    if (showLocal) {
        const title = jStartLocalResults[0].type === 'url' ? '直接打开' : getInputValue().startsWith('/') ? '命令与本地结果' : '其他'
        appendSuggestSection(suggestHtml, title, jStartLocalResults)
    }
    if (showEngine) {
        appendSuggestSection(suggestHtml, '搜索建议', jStartAIResult ? [jStartAIResult, ...jStartEngineResults] : jStartEngineResults)
    }

    getJStartElement('j-search-view').append(suggestHtml)
    if (jStartSuggestSelectedIndex < 0 && showLocal) {
        jStartSuggestSelectedIndex = 0
    }
    refreshSuggestHilight()
}

function appendSuggestSection(container, title, results) {
    const header = document.createElement('div')
    header.className = 'jstart-suggest-section'
    header.textContent = title
    container.append(header)

    results.forEach(result => {
        const globalIndex = getResultIndex(result)
        const item = document.createElement('button')
        item.type = 'button'
        item.className = 'jstart-suggest-view-item'
        item.dataset.index = globalIndex
        item.append(createTypeIcon(result.type))

        const content = document.createElement('span')
        content.className = 'jstart-suggest-content'
        const titleNode = document.createElement('span')
        titleNode.className = 'jstart-suggest-title'
        const subtitleNode = document.createElement('span')
        subtitleNode.className = 'jstart-suggest-subtitle'
        const isLoading = result.id === jStartLoadingResultId
        const subtitle = isLoading
            ? `正在打开 ${jStartLoadingUrl || getResultTargetUrl(result) || result.title || ''}`
            : result.type === 'engine' ? '' : result.subtitle || TYPE_LABELS[result.type] || ''
        titleNode.textContent = result.title || ''
        subtitleNode.textContent = subtitle
        subtitleNode.hidden = !subtitle
        content.append(titleNode, subtitleNode)
        item.append(content)
        item.classList.toggle('jstart-loading-result', isLoading)

        const tag = document.createElement('span')
        tag.className = 'jstart-suggest-tag'
        tag.textContent = TYPE_LABELS[result.type] || '其他'
        item.append(tag)

        item.addEventListener('mouseenter', () => {
            jStartSuggestSelectedIndex = globalIndex
            jStartUserSelectedResult = true
            refreshSuggestHilight()
        })
        item.addEventListener('click', () => {
            jStartSuggestSelectedIndex = globalIndex
            jStartUserSelectedResult = true
            const selected = getSuggestSelected()
            if (selected) executeSuggestResult(selected, false)
        })

        container.append(item)
    })
}

function handleBackdropClick(event) {
    if (!jStartAISession && !getRawInputValue() && !jStartImages.length && event.target?.id === 'jstart-content-view') {
        removeHTML()
    }
}

function getResultIndex(result) {
    return getSelectableResults().findIndex(item => item.id === result.id)
}

function createTypeIcon(type) {
    const icon = document.createElement('span')
    icon.className = `jstart-type-icon jstart-type-icon-${type}`
    if (type === 'ai') {
        const image = document.createElement('img')
        image.alt = ''
        image.src = chrome.runtime.getURL(jStartAIProvider.icon)
        icon.append(image)
    } else {
        icon.innerHTML = getIconSvg(type)
    }
    return icon
}

function getIconSvg(type) {
    const icons = {
        url: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><ellipse cx="12" cy="12" rx="4" ry="9" stroke="currentColor" stroke-width="2"/><path d="M3 12h18" stroke="currentColor" stroke-width="2"/></svg>',
        engine: '<svg viewBox="0 0 24 24"><path d="M10.8 18a7.2 7.2 0 1 1 5.1-2.1l4.1 4.1-1.6 1.6-4.1-4.1A7.1 7.1 0 0 1 10.8 18Zm0-2.2a5 5 0 1 0 0-10.1 5 5 0 0 0 0 10.1Z"/></svg>',
        bookmark: '<svg viewBox="0 0 24 24"><path d="M6 3.8c0-1 .8-1.8 1.8-1.8h8.4c1 0 1.8.8 1.8 1.8v18L12 18l-6 3.8v-18Z"/></svg>',
        tab: '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Zm2.5-.3a.3.3 0 0 0-.3.3v3.2h11.6V5.5a.3.3 0 0 0-.3-.3h-11Zm-.3 5.7v7.6c0 .2.1.3.3.3h11c.2 0 .3-.1.3-.3v-7.6H6.2Z"/></svg>',
        history: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 1-8.3 5.5H1.8V6h5.8v5.8H5.1V10A6.7 6.7 0 1 0 12 5.3V3Zm1.1 4.5v4.1l3.4 2-.9 1.8-4.7-2.8V7.5h2.2Z"/></svg>',
        command: '<svg viewBox="0 0 24 24"><path d="M13.8 2 4.5 13.1h6.2L9.7 22l9.8-12.2h-6.3L13.8 2Z"/></svg>'
    }
    return icons[type] || icons.command
}

function removeSuggest() {
    const suggest = getJStartElement('jstart-suggest-view')
    if (suggest) suggest.remove()
}

function getSelectableResults() {
    return jStartLocalResults.concat(jStartAIResult ? [jStartAIResult] : [], jStartEngineResults)
}

function getSuggestSelected() {
    const list = getSelectableResults()
    if (jStartSuggestSelectedIndex < 0 || jStartSuggestSelectedIndex >= list.length) return null
    return list[jStartSuggestSelectedIndex]
}

function changeSuggestResult(keyCode) {
    const list = getSelectableResults()
    if (!list.length) return
    jStartUserSelectedResult = true

    const upKey = keyCode == 38
    if (upKey) {
        if (jStartSuggestSelectedIndex > 0) jStartSuggestSelectedIndex--
        else jStartSuggestSelectedIndex = list.length - 1
    } else {
        if (list.length > jStartSuggestSelectedIndex + 1) jStartSuggestSelectedIndex++
        else jStartSuggestSelectedIndex = 0
    }
    refreshSuggestHilight()
}

function refreshSuggestHilight() {
    getJStartElements('.jstart-suggest-view-item').forEach(ele => {
        const selected = Number(ele.dataset.index) === jStartSuggestSelectedIndex
        ele.classList.toggle('jstart-selected', selected)
        if (selected) {
            ele.scrollIntoView({
                block: 'nearest'
            })
        }
    })
}

function changeSearchType() {
    if (jStartImages.length) return
    const types = ['google', 'baidu', 'bing', 'ai']
    jStartSearchType = types[(types.indexOf(jStartSearchType) + 1) % types.length]
    chrome.storage.local.set({ jStartSearchType })
    refreshLogo()
    onInputChange()
    focusOnSearch()
}

async function loadAIProvider() {
    const root = jStartRoot
    const request = chrome.runtime.sendMessage({ type: 'jstart:aiProvider' }).catch(() => null)
    jStartAIProviderRequest = request
    const provider = await request
    if (root !== jStartRoot || request !== jStartAIProviderRequest) return
    jStartAIProvider = provider
    jStartAIRouteRequests = new Map()
    refreshLogo()
    if (getInputValue() || jStartImages.length) onInputChange()
}

function getAIProvider() {
    return jStartAISession?.provider || jStartAIProvider
}

function showAIOptions() {
    chrome.runtime.sendMessage({ type: 'jstart:aiOptions' })
}

function clearAISession() {
    jStartAIRequestVersion++
    jStartAISession?.turns.forEach(turn => turn.view?.destroy())
    jStartAISession = null
    jStartAIBusy = false
}

async function startAIAnswer(question, images = []) {
    if (!question.trim() && !images.length) return
    if (jStartAIBusy) {
        const notice = getJStartElement('j-image-error')
        notice.textContent = '请等待当前回答完成。'
        notice.hidden = false
        return
    }
    jStartAIBusy = true
    const version = jStartAIRequestVersion
    const root = jStartRoot
    let started = false
    try {
        await jStartAIProviderRequest
        if (version !== jStartAIRequestVersion || root !== jStartRoot) return
        const provider = getAIProvider()
        if (!provider?.configured) { showAIOptions(); return }
        jStartAIViewPromise ||= import(chrome.runtime.getURL('ai-view.js'))
        const { createAnswerView } = await jStartAIViewPromise
        if (version !== jStartAIRequestVersion || root !== jStartRoot) return
        let session = jStartAISession
        const first = !session
        if (first) session = createAISession(provider)
        const history = session.turns.filter(turn => turn.context).reverse().map(turn => turn.context)
        const turn = { question, images, context: null, view: null, button: null }
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'j-ai-question-item'
        button.textContent = question
        button.title = question
        button.addEventListener('click', () => selectAIQuestion(session, turn))
        turn.button = button
        turn.view = createAnswerView(root, { provider: session.provider, question, images, history,
            onFinish: context => {
                turn.context = context
                jStartAIBusy = false
                button.classList.toggle('j-ai-question-error', !context)
                const notice = getJStartElement('j-image-error')
                if (notice?.textContent === '请等待当前回答完成。') notice.hidden = true
            }
        })
        started = true
        session.turns.unshift(turn)
        root.getElementById('j-ai-questions').prepend(button)
        root.getElementById('j-ai-questions').hidden = session.turns.length < 2
        clearSearchComposer()
        if (first) {
            session.pending = turn
            setTimeout(() => {
                if (root !== jStartRoot || session !== jStartAISession || session.pending !== turn) return
                root.getElementById('j-ai-workspace').classList.remove('j-ai-workspace-pending')
                selectAIQuestion(session, turn, true)
            }, 220)
        } else {
            const previous = session.selected
            if (previous && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
                previous.view.panel.classList.add('j-ai-shelving')
            }
            session.pending = turn
            setTimeout(() => {
                if (root !== jStartRoot || session !== jStartAISession || session.pending !== turn) return
                if (previous) {
                    previous.view.panel.classList.remove('j-ai-shelving')
                    previous.button.classList.add('j-ai-archived')
                    setTimeout(() => previous.button.classList.remove('j-ai-archived'), 500)
                }
                selectAIQuestion(session, turn, true)
            }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180)
        }
    } catch {
        if (version !== jStartAIRequestVersion || root !== jStartRoot) return
        jStartAIViewPromise = null
        if (jStartAISession?.turns.length === 0) {
            root.getElementById('j-ai-workspace')?.remove()
            getJStartElement('jstart-content-view').classList.remove('j-ai-answering')
            jStartAISession = null
        }
        const error = getJStartElement('j-image-error')
        error.textContent = 'AI 回答界面加载失败，请重试。'
        error.hidden = false
    } finally {
        if (!started && version === jStartAIRequestVersion && root === jStartRoot) jStartAIBusy = false
    }
}

function createAISession(provider) {
    const view = getJStartElement('jstart-content-view')
    const inputView = getJStartElement('j-search-view')
    const oldTop = inputView.getBoundingClientRect().top
    const workspace = document.createElement('div')
    workspace.id = 'j-ai-workspace'
    workspace.className = 'j-ai-workspace j-ai-workspace-pending'
    workspace.innerHTML = '<aside class="j-ai-questions" id="j-ai-questions" aria-label="本次对话的问题" hidden></aside><div class="j-ai-answer-stage" id="j-ai-answer-stage"></div>'
    view.classList.add('j-ai-answering')
    view.append(workspace)
    const session = { provider, turns: [], selected: null, pending: null }
    jStartAISession = session
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        inputView.animate([{ transform: `translateY(${oldTop - inputView.getBoundingClientRect().top}px)` }, { transform: 'none' }], { duration: 220, easing: 'ease-out' })
    }
    return session
}

function selectAIQuestion(session, turn, animate = false) {
    if (session !== jStartAISession) return
    session.pending = null
    getJStartElement('j-ai-workspace').classList.remove('j-ai-workspace-pending')
    for (const item of session.turns) {
        item.view.panel.classList.remove('j-ai-shelving', 'j-ai-entering')
        item.button.classList.toggle('j-ai-question-active', item === turn)
        if (item === turn) {
            item.view.show()
            if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
                item.view.panel.classList.add('j-ai-entering')
                setTimeout(() => item.view.panel.classList.remove('j-ai-entering'), 220)
            }
        }
        else item.view.hide()
    }
    session.selected = turn
}

function getRawInputValue() {
    const inputE = getJStartElement('j-input-view-input')
    if (inputE) return inputE.value
    return ''
}

function getInputValue() {
    const text = getRawInputValue()
    return jStartParameterMode ? buildParameterUrl(text) : text
}

function formatParameterUrl(value) {
    const url = new URL(value)
    const lines = [url.href.split(/[?#]/)[0]]
    for (const [name, value] of url.searchParams) {
        lines.push(`${lines.length === 1 ? '?' : '&'}${name}=${value}`)
    }
    if (url.hash) {
        let hash = url.hash.slice(1)
        try { hash = decodeURIComponent(hash) } catch {}
        lines.push(`#${hash}`)
    }
    return lines.join('\n')
}

function buildParameterUrl(text) {
    const [base, ...lines] = text.split(/\r?\n/)
    const target = parseNavigationUrl(base)
    if (!target) return ''
    const url = new URL(target)
    // 第一行只放完整地址；整段替换成单行 URL 时也可以直接打开。
    if (!lines.length) return url.href
    if (url.search || url.hash) return ''
    for (const line of lines) {
        if (!line.trim()) continue
        if (line.startsWith('#')) {
            url.hash = encodeURI(line.slice(1)).replace(/#/g, '%23')
            continue
        }
        const parameter = line.replace(/^[?&]/, '')
        const separator = parameter.indexOf('=')
        if (separator < 0) return ''
        url.searchParams.append(parameter.slice(0, separator), parameter.slice(separator + 1))
    }
    return url.href
}

function refreshParameterToggle(url) {
    const controls = getJStartElement('j-parameter-controls')
    if (!controls) return
    const button = getJStartElement('j-parameter-mode-button')
    const error = getJStartElement('j-parameter-error')
    controls.hidden = Boolean(jStartImages.length) || (!jStartParameterMode && !(url && new URL(url).searchParams.size))
    button.setAttribute('aria-pressed', String(jStartParameterMode))
    button.title = jStartParameterMode ? '恢复完整网址；Shift + Enter 换行，Enter 打开' : '逐行编辑网址参数'
    error.hidden = Boolean(jStartImages.length) || !jStartParameterMode || Boolean(url)
}

function toggleParameterMode() {
    const input = getJStartElement('j-input-view-input')
    const url = parseNavigationUrl(getInputValue())
    if (!url) {
        refreshParameterToggle(null)
        focusOnSearch()
        return
    }
    jStartParameterMode = !jStartParameterMode
    input.value = jStartParameterMode ? formatParameterUrl(url) : url
    onInputChange()
    resizeSearchInput()
    focusOnSearch()
    const position = jStartParameterMode ? input.value.indexOf('\n') + 1 : input.value.length
    input.setSelectionRange(position, position)
}

function refreshLogo() {
    const logo = getJStartElement('j-logo-view-logo')
    if (!logo) return
    const provider = getAIProvider()
    logo.src = jStartSearchType === 'ai' || jStartImages.length
        ? chrome.runtime.getURL(provider?.icon || 'icons/ai/doubao.png')
        : SEARCH_LOGOS[jStartSearchType]
    const button = getJStartElement('j-logo-view-button')
    button.disabled = Boolean(jStartImages.length)
    const label = jStartImages.length ? `附图提问 · ${provider?.name || '未配置'}` : jStartSearchType === 'ai' ? `AI 问答 · ${provider?.name || '未配置'} · 切换入口` : `${jStartSearchType} · 切换入口`
    button.title = label
    button.setAttribute('aria-label', label)
}

function revealAfterStyleLoaded() {
    const stylesheet = jStartRoot && jStartRoot.querySelector('link[rel="stylesheet"]')
    let revealed = false
    const reveal = () => {
        if (revealed || !jStartHost) return
        revealed = true
        resizeSearchInput()
        jStartHost.style.visibility = 'visible'
        focusOnSearch()
    }

    if (!stylesheet || stylesheet.sheet) {
        reveal()
        return
    }

    stylesheet.addEventListener('load', reveal, { once: true })
    stylesheet.addEventListener('error', reveal, { once: true })
}

function focusOnSearch() {
    const input = getJStartElement('j-input-view-input')
    if (!input) return
    input.focus({ preventScroll: true })
}

function resizeSearchInput() {
    const input = getJStartElement('j-input-view-input')
    if (!input) return
    input.style.height = '24px'
    input.style.height = `${input.scrollHeight}px`
}

function handleInputArrow(event) {
    if (jStartParameterMode) return false
    const input = getJStartElement('j-input-view-input')
    const keyCode = event.key === 'ArrowUp' ? 38 : 40
    if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return false
    if (input.scrollHeight <= 24) {
        changeSuggestResult(keyCode)
        return true
    }

    // 多行时先让浏览器移动光标；到达边界、无法继续移动时切换建议。
    const position = input.selectionStart
    if (position !== input.selectionEnd) return false
    const value = input.value
    setTimeout(() => {
        if (input !== getJStartElement('j-input-view-input') || input.value !== value) return
        if (input.selectionStart === position && input.selectionEnd === position) {
            changeSuggestResult(keyCode)
        }
    }, 0)
    return false
}

function handleJStartKeydown(event) {
    if (isImeComposing(event)) return
    const handled = runJStartKeyAction(event)
    event.stopPropagation()
    if (handled) {
        event.preventDefault()
        event.stopImmediatePropagation()
    }
}

function isImeComposing(event) {
    return jStartIsComposing || event.isComposing || event.keyCode === 229
}

function addPageShortcutBlockers() {
    document.addEventListener('keydown', blockPageShortcut, true)
    document.addEventListener('keypress', blockPageShortcut, true)
    document.addEventListener('keyup', blockPageShortcut, true)
}

function removePageShortcutBlockers() {
    document.removeEventListener('keydown', blockPageShortcut, true)
    document.removeEventListener('keypress', blockPageShortcut, true)
    document.removeEventListener('keyup', blockPageShortcut, true)
}

function blockPageShortcut(event) {
    if (!jStrartActived) return
    if (!isJStartInputActive()) return
    if (event.type === 'keydown' && isJStartControlKey(event) && !isImeComposing(event)) return

    event.stopImmediatePropagation()
}

function isJStartInputActive() {
    const input = getJStartElement('j-input-view-input')
    return Boolean(input && jStartRoot.activeElement === input)
}

function isJStartControlKey(event) {
    return event.key === 'Enter' ||
        event.key === 'Tab' ||
        event.key === 'Escape' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp'
}

function runJStartKeyAction(event) {
    if (event.key === 'Enter') {
        if (event.shiftKey && !event.metaKey && !event.ctrlKey) return false
        submitCurrentInput(event.metaKey || event.ctrlKey)
        return true
    }
    if (event.key === 'Escape') {
        removeHTML()
        return true
    }
    if (event.key === 'Tab') {
        if (jStartImages.length) return false
        changeSearchType()
        return true
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        return handleInputArrow(event)
    }
    if (event.key === '/') {
        if (event.metaKey || event.ctrlKey || event.altKey) return false
        insertSlashFromKeyEvent(event)
        return true
    }

    return false
}

function insertSlashFromKeyEvent(event) {
    const input = getJStartElement('j-input-view-input')
    if (!input) return
    insertTextAtCursor(input, '/')
}

function insertTextAtCursor(input, text) {
    const start = input.selectionStart || 0
    const end = input.selectionEnd || start
    input.value = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`
    const cursor = start + text.length
    input.setSelectionRange(cursor, cursor)
    input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: text
    }))
}

function getJStartElement(id) {
    if (!jStartRoot) return null
    return jStartRoot.getElementById(id)
}

function getJStartElements(selector) {
    if (!jStartRoot) return []
    return Array.from(jStartRoot.querySelectorAll(selector))
}

function debounce(callback, delay = 800) {
    let timer = null
    return function () {
        const self = this
        const args = arguments
        timer && clearTimeout(timer)
        timer = setTimeout(function () {
            callback.apply(self, args)
        }, delay)
    }
}

function getstr() {
    return `
    <div id="jstart-content-view" class="jstart-content-view" data-surface="${jStarttabStart ? 'newtab' : 'webpage'}">
      <div class="j-search-view" id="j-search-view">
          <div class="jstart-border-effect" aria-hidden="true"></div>
          <div class="j-search-content" id="j-search-content">
              <span class="j-search-icon-view" aria-hidden="true">
                  <span class="j-search-icon-view-span">
                      <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <path d="M10.8 18a7.2 7.2 0 1 1 5.1-2.1l4.1 4.1-1.6 1.6-4.1-4.1A7.1 7.1 0 0 1 10.8 18Zm0-2.2a5 5 0 1 0 0-10.1 5 5 0 0 0 0 10.1Z"></path>
                      </svg>
                  </span>
              </span>
              <div class="j-input-view">
                  <textarea class="j-input-view-input" id="j-input-view-input" name="q" rows="1" wrap="soft" autocapitalize="off" autocomplete="off" autocorrect="off" role="combobox" spellcheck="false" aria-label="搜索、提问或输入网址"></textarea>
                  <div class="j-image-previews" id="j-image-previews" aria-label="已粘贴的图片" hidden></div>
                  <span class="j-image-error" id="j-image-error" role="status" hidden></span>
                  <span class="j-parameter-error" id="j-parameter-error" role="status" hidden>请检查首行网址，参数行使用 名称=值 格式</span>
              </div>
              <div class="j-logo-view">
                  <button class="j-logo-view-div" id="j-logo-view-button" aria-label="切换入口" type="button">
                      <img class="j-logo-view-div-img" id="j-logo-view-logo" src="${SEARCH_LOGOS.google}" alt="">
                  </button>
                  <div class="j-parameter-controls" id="j-parameter-controls" hidden>
                      <button class="j-parameter-mode-button" id="j-parameter-mode-button" type="button" aria-label="切换网址参数模式" aria-pressed="false" title="逐行编辑网址参数">P</button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  `
}

const envMeta = document.getElementsByTagName('meta')['newtab-jstart-flag']
jStarttabStart = envMeta && envMeta.content && envMeta.content === 'true'
if (jStarttabStart) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => showMainView(), { once: true })
    } else {
        showMainView()
    }
}

})()
