/* eslint-disable */

let jStrartActived = false
let jStartSearchType = 'google'
let jStarttabStart = false
let jStartEngineResults = []
let jStartLocalResults = []
let jStartSuggestSelectedIndex = -1
let jStartInputVersion = 0
let jStartLastInput = ''
let jStartParameterMode = false
let jStartHost = null
let jStartRoot = null
let jStartIsComposing = false
let jStartLoadingResultId = null
let jStartLoadingUrl = ''

const SEARCH_LOGOS = {
    google: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCI+PHBhdGggZmlsbD0iI0ZCQkMwNSIgZD0iTTQzLjYgMjAuNUgyNHY3LjloMTEuM0MzNC4yIDMzLjcgMjkuOCAzNyAyNCAzN2MtNy4yIDAtMTMtNS44LTEzLTEzczUuOC0xMyAxMy0xM2MzLjEgMCA1LjkgMS4xIDguMSAyLjlsNS42LTUuNkMzNC4xIDQuNSAyOS4zIDIgMjQgMiAxMS44IDIgMiAxMS44IDIgMjRzOS44IDIyIDIyIDIyYzExIDAgMjEtOCAyMS0yMiAwLTEuMy0uMS0yLjQtLjQtMy41eiIvPjxwYXRoIGZpbGw9IiNFQTQzMzUiIGQ9Ik02LjMgMTQuN2w2LjYgNC44QzE0LjcgMTQuNiAxOSAzMSAyNCAzMWMzLjEgMCA1LjktMS4xIDguMS0yLjlsNS42IDUuNkMzNC4xIDM3LjUgMjkuMyA0MCAyNCA0MGMtOC44IDAtMTYtNy4yLTE2LTE2IDAtMy4zIDEuMS02LjQgMy4zLTkuM3oiLz48cGF0aCBmaWxsPSIjMzRBODUzIiBkPSJNNi4zIDMzLjNsNi42LTQuOEMxNC43IDMzLjQgMTkgMzcgMjQgMzdjMy4xIDAgNS45LTEuMSA4LjEtMi45bDUuNiA1LjZDMzQuMSA0My41IDI5LjMgNDYgMjQgNDYgMTYuMSA0NiA5LjIgNDEuOCA1LjMgMzUuNXoiLz48cGF0aCBmaWxsPSIjNDI4NUY0IiBkPSJNNDUgMjRjMC0xLjMtLjEtMi40LS40LTMuNUgyNHY3LjloMTEuM0MzNC44IDMxIDMwLjUgMzcgMjQgMzdjLTMuMSAwLTUuOS0xLjEtOC4xLTIuOWwtNS42IDUuNkMxNC4xIDQzLjUgMTguOSA0NiAyNCA0NmMxMSAwIDIxLTggMjEtMjJ6Ii8+PC9zdmc+',
    baidu: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzMzODVmZiI+PHBhdGggZD0iTTkuMTU0IDBDNy43MSAwIDYuNTQgMS42NTggNi41NCAzLjcwN2MwIDIuMDUxIDEuMTcxIDMuNzEgMi42MTUgMy43MSAxLjQ0NiAwIDIuNjE0LTEuNjU5IDIuNjE0LTMuNzFDMTEuNzY4IDEuNjU4IDEwLjYgMCA5LjE1NCAwem03LjAyNS41OTRDMTQuODYuNTggMTMuMzQ3IDIuNTg5IDEzLjIgMy45MjdjLS4xODcgMS43NDUuMjUgMy40ODcgMi4xNzkgMy43MzUgMS45MzMuMjUgMy4xNzUtMS44MDYgMy40MjItMy4zNjQuMjUyLTEuNTU1LS45OTUtMy4zNjQtMi4zNjItMy42NzRhMS4yMTggMS4yMTggMCAwIDAtLjI2MS0uMDN6TTMuNTgyIDUuNTM1YTIuODExIDIuODExIDAgMCAwLS4xNTYuMDA4Yy0yLjExOC4xOS0yLjQyOCAzLjI0LTIuNDI4IDMuMjQtLjI4NyAxLjQxLjY4NiA0LjQyNSAzLjI5NyAzLjg2NCAyLjYxNy0uNTYxIDIuMjYyLTMuNjggMi4xODMtNC4zNjItLjEyNS0xLjAxOC0xLjI5Mi0yLjc3My0yLjg5Ni0yLjc1em0xNi41MzQgMS43NTNjLTIuMzA4IDAtMi42MTcgMi4xMTktMi42MTcgMy42MTYgMCAxLjQzLjEyMSAzLjQyNSAyLjk4OCAzLjM2MiAyLjg2Ny0uMDYzIDIuNTUzLTMuMjM4IDIuNTUzLTMuOTg4IDAtLjc0NS0uNjItMi45OS0yLjkyNC0yLjk5em0tOC4yNjQgMi40NzhjLTEuNDI0LjAxNC0yLjcwOC45MjUtMy4zMjMgMS45NDctMS4xMTggMS44NjgtMi44NjMgMy4wNS0zLjExMiAzLjM2My0uMjUuMzA5LTMuNjEgMi4xMTYtMi44NjQgNS40Mi43NDYgMy4zMDEgMy4zNjUgMy4yMzcgMy4zNjUgMy4yMzdzMS45My4xOSA0LjE3MS0uMzFjMi4yNC0uNDk1IDQuMTcuMTIzIDQuMTcuMTIzczUuMjMzIDEuNzQ4IDYuNjY1LTEuNjE2YzEuNDMtMy4zNjQtLjgwOC01LjEwOS0uODA4LTUuMTA5cy0yLjk5LTIuMzA2LTQuNzM2LTQuNzk4Yy0xLjA3Mi0xLjY2NS0yLjM0OC0yLjI2OC0zLjUyOC0yLjI1N3ptLTIuMjM0IDMuODRsMS41NDIuMDI0djguMTk3SDcuNzU4Yy0xLjQ3LS4yOTEtMi4wNTUtMS4yOTItMi4xMy0xLjQ2Mi0uMDcyLS4xNzMtLjQ4OC0uOTc2LS4yNjgtMi4zNDMuNjM1LTIuMDQ5IDIuNDQ3LTIuMTk2IDIuNDQ3LTIuMTk2aDEuODF6bTMuOTY0IDIuMzl2My44ODFjLjA5Ni40MTMuNjEyLjQ4OC42MTIuNDg4aDEuNjE0di00LjM0M2gxLjY4OXY1Ljc4MmgtMy45MTVjLTEuNTE3LS4zOS0xLjU5LTEuNDY1LTEuNTktMS40NjV2LTQuMzE3em0tNS40NTggMS4xNDdjLS42Ni4xOTctLjk3OC43MDgtMS4wNS45MjgtLjA3Ni4yMi0uMjQ3Ljc4LS4xIDEuMjY5LjI5NCAxLjA5NSAxLjI0OCAxLjE0NCAxLjI0OCAxLjE0NGgxLjM3di0zLjM0eiIvPjwvc3ZnPg==',
    bing: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+PHJlY3QgeD0iMSIgeT0iMSIgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iI2YyNTAyMiIvPjxyZWN0IHg9IjExIiB5PSIxIiB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjN2ZiYTAwIi8+PHJlY3QgeD0iMSIgeT0iMTEiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiMwMGE0ZWYiLz48cmVjdCB4PSIxMSIgeT0iMTEiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmZmI5MDAiLz48L3N2Zz4='
}

const TYPE_LABELS = {
    url: '网址',
    engine: '搜索',
    bookmark: '书签',
    tab: '标签',
    history: '历史',
    command: '命令'
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message.type) return false
    if (message.type === 'jstart') {
        if (message.data === 'showStartPage') {
            showMainView()
        } else if (message.data === 'openResultInNewTab' && jStrartActived) {
            submitCurrentInput(true)
        } else {
            return false
        }
    } else if (message.type === 'google' || message.type === 'baidu' || message.type === 'bing') {
        handleSearchResult(message)
    } else {
        return false
    }
    sendResponse(true)
    return false
});

function showMainView() {
    if (document.getElementById('jstart-shadow-host')) {
        removeHTML()
    } else {
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
    jStartRoot = jStartHost.attachShadow({ mode: 'open' })
    jStartRoot.innerHTML = `
        <link rel="stylesheet" href="${chrome.runtime.getURL('jstart.css')}">
        ${getstr()}
    `
    jStrartActived = true
    jStartEngineResults = []
    jStartLocalResults = []
    jStartSuggestSelectedIndex = -1
    jStartLastInput = ''
    jStartParameterMode = false
    jStartInputVersion++

    const view = getJStartElement('jstart-content-view')
    if (jStarttabStart) {
        view.style.display = 'block'
    } else {
        view.style.display = 'block'
        view.classList.add('jstart-content-visible')
    }

    chrome.storage.local.get(['jStartSearchType'], function (result) {
        if (result && result.jStartSearchType) {
            jStartSearchType = result.jStartSearchType
            refreshLogo()
        }
    })

    const input = getJStartElement('j-input-view-input')
    input.addEventListener('keydown', handleJStartKeydown, true)
    input.addEventListener('input', resizeSearchInput)
    input.addEventListener('input', debounce(refreshInputResults, 120))
    window.addEventListener('resize', resizeSearchInput)
    input.addEventListener('compositionstart', () => {
        jStartIsComposing = true
    })
    input.addEventListener('compositionend', () => {
        jStartIsComposing = false
    })
    getJStartElement('j-logo-view-button').addEventListener('click', changeSearchType)
    getJStartElement('j-parameter-mode-button').addEventListener('click', toggleParameterMode)
    getJStartElement('jstart-content-view').addEventListener('click', handleBackdropClick)
    addPageShortcutBlockers()
    revealAfterStyleLoaded()
}

function submitCurrentInput(newTab) {
    refreshInputResults()
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
        handleKeywordSearch(value, newTab)
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
        if (!newTab) showLoadingState(result, buildKeywordSearchUrl(result.title))
        handleKeywordSearch(result.title, newTab)
        return
    }

    const keepUIWhileNavigating = shouldKeepUIWhileNavigating(result, newTab)
    const inputVersion = jStartInputVersion
    if (keepUIWhileNavigating) showLoadingState(result, getResultTargetUrl(result))
    chrome.runtime.sendMessage(chrome.runtime.id, {
        type: 'jstart:executeResult',
        result,
        newTab
    }).then(response => {
        if (response && response.ok === false) throw new Error(response.error || '无法打开，请重试')
        if (inputVersion !== jStartInputVersion) return
        if (!keepUIWhileNavigating) removeHTML()
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

    if (!newTab) {
        location.assign(goUrl)
    } else {
        window.open(goUrl, '_blank')
        removeHTML()
    }
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
    if (action.kind === 'open_url_template') return buildUrlFromTemplate(action.urlTemplate, action.query)
    return result && result.url ? result.url : ''
}

function buildUrlFromTemplate(template, query) {
    const encoded = encodeURIComponent(query || '')
    const raw = query || ''
    return `${template || ''}`
        .replaceAll('{query}', encoded)
        .replaceAll('{raw}', raw)
}

function removeHTML() {
    removePageShortcutBlockers()
    window.removeEventListener('resize', resizeSearchInput)
    if (jStartHost) jStartHost.remove()
    jStartHost = null
    jStartRoot = null
    jStrartActived = false
    setNewTabGuideVisible(true)
}

function handleSearchResult(result) {
    if (jStartParameterMode) return
    if (!result.type || !result.data || result.query !== getInputValue()) return
    if (parseNavigationUrl(getInputValue())) return

    const type = result.type
    const data = result.data
    let list = []

    if (type === 'baidu') {
        try {
            list = (data.g || []).map(item => createEngineResult(item.q))
        } catch (error) {}
    } else if (type === 'google') {
        try {
            const xmlData = $.parseXML(data)
            const xmlDom = $(xmlData)
            xmlDom.find('suggestion').each((index, element) => {
                const content = $(element).attr('data')
                if (content) list.push(createEngineResult(content))
            })
        } catch (error) {}
    } else if (type === 'bing') {
        try {
            if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
                list = data[1].filter(Boolean).map(createEngineResult)
            }
        } catch (error) {}
    }

    jStartEngineResults = list
    renderSuggest()
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
        // 不把纯数字误识别成 URL；URL 解析器会把它转换成 IPv4。
        if (isIP && !/[.\[]/.test(text.split(/[/?#]/)[0])) return null
        return isLocal || isIP ? new URL(`http://${text}`).href : url.href
    } catch {
        return null
    }
}

function refreshInputResults() {
    if (getRawInputValue() !== jStartLastInput) onInputChange()
}

function onInputChange() {
    if (!getRawInputValue()) jStartParameterMode = false
    const text = getInputValue()
    jStartLastInput = getRawInputValue()
    const inputVersion = ++jStartInputVersion
    clearLoadingState()
    jStartSuggestSelectedIndex = -1
    jStartEngineResults = []
    jStartLocalResults = []

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
        jStartEngineResults = [createEngineResult(text.trim())]
        jStartSuggestSelectedIndex = 0
        renderSuggest()
        return
    }

    if (!shouldBypassLocalResults(text)) {
        requestLocalResults(text, inputVersion)
    }

    if (!text.startsWith('/')) {
        chrome.runtime.sendMessage(chrome.runtime.id, {
            type: jStartSearchType,
            searchWord: text
        }).catch(() => {})
    }

    renderSuggest()
}

function requestLocalResults(text, inputVersion) {
    chrome.runtime.sendMessage(chrome.runtime.id, {
        type: 'jstart:searchLocal',
        text
    }).then(response => {
        if (inputVersion !== jStartInputVersion || text !== getInputValue()) return
        jStartLocalResults = response && response.results ? response.results : []
        renderSuggest()
    }).catch(() => {})
}

function shouldBypassLocalResults(text) {
    return !text.startsWith('/') && /\s$/.test(text)
}

function renderSuggest() {
    removeSuggest()
    const showEngine = !getInputValue().startsWith('/') && jStartEngineResults.length > 0
    const showLocal = jStartLocalResults.length > 0
    if (!showEngine && !showLocal) return

    const suggestHtml = $('<div class="jstart-suggest-view" id="jstart-suggest-view"></div>')
    if (showLocal) {
        const title = jStartLocalResults[0].type === 'url' ? '直接打开' : getInputValue().startsWith('/') ? '命令与本地结果' : '其他'
        appendSuggestSection(suggestHtml, title, jStartLocalResults)
    }
    if (showEngine) {
        appendSuggestSection(suggestHtml, '搜索建议', jStartEngineResults)
    }

    getJStartElement('j-search-view').appendChild(suggestHtml[0])
    if (jStartSuggestSelectedIndex < 0 && showLocal) {
        jStartSuggestSelectedIndex = 0
    }
    refreshSuggestHilight()
}

function appendSuggestSection(container, title, results) {
    const header = $('<div class="jstart-suggest-section"></div>')
    header.text(title)
    container.append(header)

    results.forEach(result => {
        const globalIndex = getResultIndex(result)
        const item = $('<button type="button" class="jstart-suggest-view-item"></button>')
        item.attr('data-index', globalIndex)
        item.append(createTypeIcon(result.type))

        const content = $('<span class="jstart-suggest-content"></span>')
        const titleNode = $('<span class="jstart-suggest-title"></span>')
        const subtitleNode = $('<span class="jstart-suggest-subtitle"></span>')
        const isLoading = result.id === jStartLoadingResultId
        const subtitle = isLoading
            ? `正在打开 ${jStartLoadingUrl || getResultTargetUrl(result) || result.title || ''}`
            : result.type === 'engine' ? '' : result.subtitle || TYPE_LABELS[result.type] || ''
        titleNode.text(result.title || '')
        subtitleNode.text(subtitle)
        subtitleNode.prop('hidden', !subtitle)
        content.append(titleNode)
        content.append(subtitleNode)
        item.append(content)
        item.toggleClass('jstart-loading-result', isLoading)

        const tag = $('<span class="jstart-suggest-tag"></span>')
        tag.text(TYPE_LABELS[result.type] || '其他')
        item.append(tag)

        item.on('mouseenter', function () {
            jStartSuggestSelectedIndex = Number($(this).attr('data-index'))
            refreshSuggestHilight()
        })
        item.on('click', function () {
            jStartSuggestSelectedIndex = Number($(this).attr('data-index'))
            const selected = getSuggestSelected()
            if (selected) executeSuggestResult(selected, false)
        })

        container.append(item)
    })
}

function handleBackdropClick(event) {
    if (event.target && event.target.id === 'jstart-content-view') {
        removeHTML()
    }
}

function getResultIndex(result) {
    return getSelectableResults().findIndex(item => item.id === result.id)
}

function createTypeIcon(type) {
    const icon = $('<span class="jstart-type-icon"></span>')
    icon.addClass(`jstart-type-icon-${type}`)
    icon.html(getIconSvg(type))
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
    return jStartLocalResults.concat(jStartEngineResults)
}

function getSuggestSelected() {
    const list = getSelectableResults()
    if (jStartSuggestSelectedIndex < 0 || jStartSuggestSelectedIndex >= list.length) return null
    return list[jStartSuggestSelectedIndex]
}

function changeSuggestResult(keyCode) {
    const list = getSelectableResults()
    if (!list.length) return

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
        const itemIndex = Number($(ele).attr('data-index'))
        if (itemIndex === jStartSuggestSelectedIndex) {
            $(ele).addClass('jstart-selected')
            ele.scrollIntoView({
                block: 'nearest'
            })
        } else {
            $(ele).removeClass('jstart-selected')
        }
    })
}

function changeSearchType() {
    if (jStartSearchType === 'google') {
        jStartSearchType = 'baidu'
    } else if (jStartSearchType === 'baidu') {
        jStartSearchType = 'bing'
    } else {
        jStartSearchType = 'google'
    }
    chrome.storage.local.set({ jStartSearchType })
    refreshLogo()
    if (getInputValue() && !getInputValue().startsWith('/')) onInputChange()
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
    controls.hidden = !jStartParameterMode && !(url && new URL(url).searchParams.size)
    button.setAttribute('aria-pressed', String(jStartParameterMode))
    button.title = jStartParameterMode ? '恢复完整网址；Shift + Enter 换行，Enter 打开' : '逐行编辑网址参数'
    error.hidden = !jStartParameterMode || Boolean(url)
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
    logo.src = SEARCH_LOGOS[jStartSearchType]
    logo.title = jStartSearchType
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
    // 保持原单行输入框的粘贴行为；换行仅用于显示。
    if (!jStartParameterMode && /[\r\n]/.test(input.value)) {
        const start = input.value.slice(0, input.selectionStart).replace(/[\r\n]/g, '').length
        const end = input.value.slice(0, input.selectionEnd).replace(/[\r\n]/g, '').length
        input.value = input.value.replace(/[\r\n]/g, '')
        input.setSelectionRange(start, end)
    }
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
    if (!input) return false
    return getDeepActiveElement() === input
}

function getDeepActiveElement(root = document) {
    const active = root.activeElement
    if (active && active.shadowRoot) return getDeepActiveElement(active.shadowRoot)
    return active
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
        if (jStartParameterMode && event.shiftKey && !event.metaKey && !event.ctrlKey) return false
        submitCurrentInput(event.metaKey || event.ctrlKey)
        return true
    }
    if (event.key === 'Escape') {
        removeHTML()
        return true
    }
    if (event.key === 'Tab') {
        if (getSelectableResults().length) changeSuggestResult(event.shiftKey ? 38 : 40)
        else changeSearchType()
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
              <div class="j-search-icon-view">
                  <span class="j-search-icon-view-span">
                      <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <path d="M10.8 18a7.2 7.2 0 1 1 5.1-2.1l4.1 4.1-1.6 1.6-4.1-4.1A7.1 7.1 0 0 1 10.8 18Zm0-2.2a5 5 0 1 0 0-10.1 5 5 0 0 0 0 10.1Z"></path>
                      </svg>
                  </span>
              </div>
              <div class="j-input-view">
                  <textarea class="j-input-view-input" id="j-input-view-input" maxlength="2048" name="q" rows="1" wrap="soft" autocapitalize="off" autocomplete="off" autocorrect="off" role="combobox" spellcheck="false" aria-label="搜索或输入网址"></textarea>
                  <span class="j-parameter-error" id="j-parameter-error" role="status" hidden>请检查首行网址，参数行使用 名称=值 格式</span>
              </div>
              <div class="j-logo-view">
                  <button class="j-logo-view-div" id="j-logo-view-button" aria-label="切换搜索平台" type="button">
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
    $(document).ready(function () {
        showMainView()
    })
}
