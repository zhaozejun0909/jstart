/* eslint-disable */

// 同一页面只初始化一次，避免连续唤起时重复注入，出现两个实例同时响应消息。
(() => {

const existingMessageListener = globalThis.__jStartMessageListener
if (existingMessageListener && chrome.runtime.onMessage.hasListener(existingMessageListener)) return

let jStrartActived = false
// 一级入口：search 或 ai；二级入口分别是 jStartSearchType（搜索引擎）和 jStartAIProvider（大模型）。
let jStartMode = 'search'
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
// 语义识别在输入防抖（120ms）之后再等的时间。
const AI_ROUTE_DELAY = 300
// 超过这个字数才做语义识别，太短的输入基本是关键词搜索。
const AI_ROUTE_MIN_LENGTH = 3
let jStartImages = []
// 鼠标悬停在入口图标上多久后弹出二级选项，以及移开后多久收起。
const ENTRY_MENU_DELAY = 500
const ENTRY_MENU_CLOSE_DELAY = 250
let jStartEntryMenuTimer = 0

const SEARCH_ENGINES = ['google', 'baidu', 'bing']
const ENGINE_NAMES = { google: 'Google', baidu: '百度', bing: '必应' }

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

// 只在面板打开期间监听；常驻监听会让每个网页都收到所有 storage 写入。
function handleStorageChange(changes, area) {
    if (area !== 'local' || !(changes.jStartAISettings || changes.jStartAIProvider)) return
    // 本页刚切换的模型已经在本地更新过，不必重新加载。
    if (!changes.jStartAISettings && changes.jStartAIProvider.newValue === jStartAIProvider?.id) return
    loadAIProvider()
}

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

    chrome.storage.local.get(['jStartMode', 'jStartSearchType'], function (result) {
        applyEntrySettings(result)
        refreshLogo()
        onInputChange()
        revealAfterStyleLoaded()
    })
    loadAIProvider()
    chrome.storage.onChanged.addListener(handleStorageChange)

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
    const logoButton = getJStartElement('j-logo-view-button')
    const entry = getJStartElement('j-entry')
    logoButton.addEventListener('click', handleLogoClick)
    logoButton.addEventListener('pointerenter', () => scheduleEntryMenu(true))
    // 鼠标在图标和二级选项之间移动时会短暂离开，收起前留一点余量。
    entry.addEventListener('pointerenter', () => { if (isEntryMenuOpen()) clearTimeout(jStartEntryMenuTimer) })
    entry.addEventListener('pointerleave', () => scheduleEntryMenu(false))
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
        if (jStartMode === 'ai') startAIAnswer(value)
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
        jStartMode = 'ai'
        chrome.storage.local.set({ jStartMode })
        refreshLogo()
        playLogoSwitch()
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
        newTab: effectiveNewTab,
        // 新标签页没有 AI 对话时，切到已打开的 Tab 后可以关掉。
        closeSourceTab: jStarttabStart && !jStartAISession
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
    clearTimeout(jStartEntryMenuTimer)
    window.removeEventListener('resize', resizeSearchInput)
    if (jStartHost) jStartHost.remove()
    jStartHost = null
    jStartRoot = null
    jStrartActived = false
    setNewTabGuideVisible(true)
    // 放在最后：扩展重载后旧脚本调用 Chrome API 可能报错，不能影响面板关闭。
    chrome.storage.onChanged.removeListener(handleStorageChange)
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
        // 逐张解码，避免几张大图同时展开占用内存。
        const images = []
        for (const file of files) images.push(await compressPastedImage(file))
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
    if (jStartMode === 'ai' || jStartParameterMode || jStartImages.length) return
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
        jStartEngineResults = jStartMode === 'ai' ? [] : [createEngineResult(text.trim())]
        jStartSuggestSelectedIndex = 0
        renderSuggest()
        return
    }

    if (!shouldBypassLocalResults(text)) {
        jStartLocalRequest = requestLocalResults(text, inputVersion)
    }

    if (jStartMode !== 'ai' && !text.startsWith('/')) {
        chrome.runtime.sendMessage(chrome.runtime.id, {
            type: jStartSearchType,
            searchWord: text
        }).then(result => {
            if (inputVersion === jStartInputVersion) handleSearchResult(result)
        }).catch(() => {})
        if (!/\s$/.test(text) && text.trim().length > AI_ROUTE_MIN_LENGTH && jStartAIProvider?.semanticEnabled) {
            const route = () => {
                // 版本号要等输入防抖结束才更新，所以还要比较当前文字，避免发送已经改掉的输入。
                if (inputVersion !== jStartInputVersion || text !== getInputValue()) return
                requestAIRoute(text).then(result => {
                    if (result?.route !== 'ai' || inputVersion !== jStartInputVersion || text !== getInputValue() || jStartMode === 'ai') return
                    updateSuggestions(() => {
                        jStartAIResult = {
                            id: `ai:${text}`, type: 'ai',
                            title: '问问 AI 吧',
                            subtitle: '此问题更适合 AI 回答哦'
                        }
                    })
                }).catch(() => {})
            }
            // 判断过的文字直接复用；新文字等输入再停顿一会儿才请求，避免打字过程中反复调用大模型。
            if (jStartAIRouteRequests.has(text)) route()
            else setTimeout(route, AI_ROUTE_DELAY)
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

// 读取上次的入口；旧版本把 AI 也存在 jStartSearchType 里，这里一并兼容。
function applyEntrySettings(result) {
    const stored = result?.jStartSearchType
    jStartMode = ['search', 'ai'].includes(result?.jStartMode) ? result.jStartMode : stored === 'ai' ? 'ai' : 'search'
    jStartSearchType = SEARCH_ENGINES.includes(stored) ? stored : 'google'
}

// 带图片时只能问 AI，一级入口固定为 AI。
function isAIEntry() {
    return jStartMode === 'ai' || jStartImages.length > 0
}

function toggleEntryMode() {
    hideEntryMenu()
    if (jStartImages.length) return
    jStartMode = jStartMode === 'ai' ? 'search' : 'ai'
    chrome.storage.local.set({ jStartMode })
    refreshLogo()
    playLogoSwitch()
    onInputChange()
    focusOnSearch()
}

// 切换后新图标放大回弹一下，提示已经选中。
function playLogoSwitch() {
    const logo = getJStartElement('j-logo-view-logo')
    if (!logo || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    logo.animate([
        { transform: 'scale(.6)' },
        { transform: 'scale(1.25)', offset: .55 },
        { transform: 'scale(.94)', offset: .8 },
        { transform: 'scale(1)' }
    ], { duration: 360, easing: 'ease-out' })
}

// 当前模式下的二级选项：搜索引擎或大模型。未配置 Key 的模型也列出，选中时去设置页。
function getEntryOptions() {
    if (isAIEntry()) {
        return (jStartAIProvider?.providers || []).map(item => ({
            id: item.id, name: item.name, icon: chrome.runtime.getURL(item.icon),
            available: item.configured, active: item.id === jStartAIProvider.id
        }))
    }
    return SEARCH_ENGINES.map(id => ({
        id, name: ENGINE_NAMES[id], icon: SEARCH_LOGOS[id], available: true, active: id === jStartSearchType
    }))
}

// 依次切到下一个二级选项，跳过未配置 Key 的模型。
function cycleEntryOption() {
    hideEntryMenu()
    const options = getEntryOptions().filter(option => option.available || option.active)
    if (!options.some(option => option.available)) return showAIOptions()
    const next = options[(options.findIndex(option => option.active) + 1) % options.length]
    if (!next.active) selectEntryOption(next.id)
}

function selectEntryOption(id) {
    hideEntryMenu()
    if (isAIEntry()) {
        const option = jStartAIProvider?.providers?.find(item => item.id === id)
        if (!option?.configured) return showAIOptions()
        // 选的就是当前模型时不做任何改动，也不播放切换效果。
        if (id === jStartAIProvider.id) return focusOnSearch()
        // 对话进行中也可以切换，从下一问开始使用新模型。
        jStartAIProvider = { ...jStartAIProvider, ...option }
        chrome.storage.local.set({ jStartAIProvider: id })
        refreshLogo()
    } else {
        if (id === jStartSearchType) return focusOnSearch()
        jStartSearchType = id
        chrome.storage.local.set({ jStartSearchType })
        refreshLogo()
        onInputChange()
    }
    playLogoSwitch()
    focusOnSearch()
}

function handleLogoClick() {
    toggleEntryMode()
    focusOnSearch()
    // 鼠标仍停在图标上时重新计时，稍后弹出新模式的二级选项。
    if (getJStartElement('j-logo-view-button')?.matches(':hover')) scheduleEntryMenu(true)
}

function isEntryMenuOpen() {
    return Boolean(getJStartElement('j-entry-menu')?.classList.contains('j-entry-menu-open'))
}

function scheduleEntryMenu(open) {
    clearTimeout(jStartEntryMenuTimer)
    if (open === isEntryMenuOpen()) return
    jStartEntryMenuTimer = setTimeout(open ? showEntryMenu : hideEntryMenu, open ? ENTRY_MENU_DELAY : ENTRY_MENU_CLOSE_DELAY)
}

// 二级选项从图标位置弹出，沿图标右侧的半圆排开；右侧空间不够时改到左侧。
function showEntryMenu() {
    const menu = getJStartElement('j-entry-menu')
    const button = getJStartElement('j-logo-view-button')
    const options = getEntryOptions()
    if (!menu || !button || !options.length) return
    const radius = 46
    const side = button.getBoundingClientRect().right + radius + 24 <= window.innerWidth ? 1 : -1
    const step = options.length > 1 ? 110 / (options.length - 1) : 0
    menu.replaceChildren(...options.map((option, index) => {
        const angle = (index - (options.length - 1) / 2) * step * Math.PI / 180
        const item = document.createElement('button')
        item.type = 'button'
        item.className = 'j-entry-option'
        item.classList.toggle('j-entry-option-unavailable', !option.available)
        item.setAttribute('role', 'menuitemradio')
        item.setAttribute('aria-checked', String(option.active))
        item.setAttribute('aria-label', option.name)
        item.title = option.available ? option.name : `${option.name} · 未配置，点击去设置`
        item.style.setProperty('--x', `${Math.round(side * radius * Math.cos(angle))}px`)
        item.style.setProperty('--y', `${Math.round(radius * Math.sin(angle))}px`)
        item.style.setProperty('--i', index)
        const image = document.createElement('img')
        image.alt = ''
        image.src = option.icon
        item.append(image)
        // 点击时不抢走输入框的焦点。
        item.addEventListener('pointerdown', event => event.preventDefault())
        item.addEventListener('click', () => selectEntryOption(option.id))
        return item
    }))
    getJStartElement('j-search-view').classList.add('j-entry-open')
    // 先按收起状态排版一次，展开时才会有从图标弹出的过渡。
    menu.getBoundingClientRect()
    menu.classList.add('j-entry-menu-open')
}

function hideEntryMenu() {
    clearTimeout(jStartEntryMenuTimer)
    getJStartElement('j-entry-menu')?.classList.remove('j-entry-menu-open')
    getJStartElement('j-search-view')?.classList.remove('j-entry-open')
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

// 每一问都用当前选中的模型；对话中途切换后，之前的问答会转成新模型能用的格式带过去。
function getAIProvider() {
    return jStartAIProvider
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
        if (first) session = createAISession()
        const history = session.turns.filter(turn => turn.context).reverse().map(turn => turn.context)
        const turn = { question, images, context: null, view: null, button: null }
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'j-ai-question-item'
        button.textContent = question
        button.title = question
        button.addEventListener('click', () => selectAIQuestion(session, turn))
        turn.button = button
        turn.view = createAnswerView(root, { provider, question, images, history,
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

function createAISession() {
    const view = getJStartElement('jstart-content-view')
    const inputView = getJStartElement('j-search-view')
    const oldTop = inputView.getBoundingClientRect().top
    const workspace = document.createElement('div')
    workspace.id = 'j-ai-workspace'
    workspace.className = 'j-ai-workspace j-ai-workspace-pending'
    workspace.innerHTML = '<aside class="j-ai-questions" id="j-ai-questions" aria-label="本次对话的问题" hidden></aside><div class="j-ai-answer-stage" id="j-ai-answer-stage"></div>'
    view.classList.add('j-ai-answering')
    view.append(workspace)
    const session = { turns: [], selected: null, pending: null }
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
    const ai = isAIEntry()
    logo.src = ai ? chrome.runtime.getURL(provider?.icon || 'icons/ai/doubao.png') : SEARCH_LOGOS[jStartSearchType]
    const name = ai ? provider?.name || '未配置' : ENGINE_NAMES[jStartSearchType]
    const label = jStartImages.length ? `附图提问 · ${name}` : `${ai ? 'AI 问答' : '搜索'} · ${name}`
    const switchHint = jStartImages.length ? '' : '点击或按 Tab 切换搜索和 AI，'
    // 不设 title：悬停会弹出二级选项，系统提示框会挡住它。
    getJStartElement('j-logo-view-button').setAttribute('aria-label',
        `${label}。${switchHint}Shift + Tab 切换${ai ? '大模型' : '搜索引擎'}`)
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
        // Tab 切换搜索和 AI，Shift + Tab 切换当前模式下的搜索引擎或大模型。
        // 有图片时 Tab 不切换，但仍拦下，避免焦点跳出输入框。
        if (event.shiftKey) cycleEntryOption()
        else toggleEntryMode()
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
                  <div class="j-entry" id="j-entry">
                      <button class="j-logo-view-div" id="j-logo-view-button" aria-label="切换入口" type="button">
                          <img class="j-logo-view-div-img" id="j-logo-view-logo" src="${SEARCH_LOGOS.google}" alt="">
                      </button>
                      <div class="j-entry-menu" id="j-entry-menu" role="menu" aria-label="切换搜索引擎或大模型"></div>
                  </div>
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
