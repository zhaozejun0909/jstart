/* eslint-disable */

import './ai-background.js'

const STORAGE_KEYS = {
    searchType: 'jStartSearchType',
    customCommands: 'jStartCustomCommands',
    usageStats: 'jStartUsageStats',
    ignoredBookmarkFolderIds: 'jStartIgnoredBookmarkFolderIds'
}

const BUILTIN_COMMANDS = [
    {
        key: 'b',
        aliases: ['bookmark', 'bookmarks'],
        name: 'Bookmarks',
        description: '搜索书签',
        scope: 'bookmark',
        iconType: 'bookmark'
    },
    {
        key: 't',
        aliases: ['tab', 'tabs'],
        name: 'Tabs',
        description: '搜索打开的标签页',
        scope: 'tab',
        iconType: 'tab'
    },
    {
        key: 'h',
        aliases: ['history'],
        name: 'History',
        description: '搜索历史记录',
        scope: 'history',
        iconType: 'history'
    }
]

let jstartSavedBookmarks = []
let jstartSavedBookmarksIgnoreKey = ''

const MESSAGE_HANDLERS = {
    baidu: request => requestSearch(request.searchWord, 'baidu'),
    google: request => requestSearch(request.searchWord, 'google'),
    bing: request => requestSearch(request.searchWord, 'bing'),
    'jstart:searchLocal': request => searchLocal(request.text || ''),
    'jstart:executeResult': request => executeResult(request.result, request.newTab),
    'jstart:getCommands': async () => ({ commands: await getCustomCommands() }),
    'jstart:saveCommands': async request => {
        await saveCustomCommands(request.commands || [])
        return { ok: true }
    },
    'jstart:getBookmarkSettings': () => getBookmarkSettings(),
    'jstart:saveIgnoredBookmarkFolders': async request => {
        await saveIgnoredBookmarkFolderIds(request.folderIds || [])
        return { ok: true }
    }
}

if (chrome.bookmarks) {
    chrome.bookmarks.onCreated.addListener(clearBookmarkCache)
    chrome.bookmarks.onRemoved.addListener(clearBookmarkCache)
    chrome.bookmarks.onChanged.addListener(clearBookmarkCache)
    chrome.bookmarks.onMoved.addListener(clearBookmarkCache)
    chrome.bookmarks.onChildrenReordered.addListener(clearBookmarkCache)
}

chrome.commands.onCommand.addListener((command) => {
    if (command === 'command-global-home') {
        toShowJstartPageGlobally()
    } else if (command === 'command-toggle-previous-tab') {
        toTogglePreviousTab()
    }
});

chrome.action.onClicked.addListener(() => {
    toShowJstartPage()
    return true;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!Object.hasOwn(MESSAGE_HANDLERS, request?.type)) return false
    Promise.resolve()
        .then(() => MESSAGE_HANDLERS[request.type](request))
        .then(sendResponse)
        .catch(error => sendResponse({ ok: false, error: `${error}` }))
    return true
})

async function requestSearch(text, type = 'baidu') {
    const query = encodeURIComponent(text)
    const urls = {
        baidu: `https://www.baidu.com/sugrec?pre=1&p=3&json=1&prod=pc&from=pc_web&wd=${query}&csor=2&pwd=a`,
        google: `https://suggestqueries.google.com/complete/search?client=chrome&hl=zh-CN&gl=CN&q=${query}`,
        bing: `https://api.bing.com/osjson.aspx?query=${query}`
    }
    try {
        if (!text || !urls[type]) return { type, query: text, data: [] }
        const response = await fetch(urls[type], type === 'baidu' ? {
            headers: { accept: 'application/json', 'content-type': 'application/json;charset=UTF-8' }
        } : undefined)
        if (!response.ok) throw new Error(`搜索建议请求失败（${response.status}）`)
        const result = await response.json()
        const suggestions = type === 'baidu' ? result?.g?.map(item => item.q) : result?.[1]
        let data = Array.isArray(suggestions) ? suggestions.filter(item => typeof item === 'string' && item) : []
        if (type === 'google') data = [...new Set(data)]
        return { type, query: text, data }
    } catch {
        return { type, query: text, data: null }
    }
}

async function searchLocal(text) {
    const rawText = text || ''
    const usageStats = await getUsageStats()

    if (rawText === '/') {
        return {
            mode: 'commands',
            results: sortByUsage(await getCommandResults(''), usageStats)
        }
    }

    if (rawText.startsWith('/ ')) {
        return {
            mode: 'local-all',
            results: await searchLocalByScope('all', rawText.slice(2).trim(), usageStats)
        }
    }

    if (rawText.startsWith('/')) {
        const parsed = parseSlashInput(rawText)
        if (!parsed.hasArgument) {
            return {
                mode: 'commands',
                results: sortByUsage(await getCommandResults(parsed.command), usageStats)
            }
        }

        const command = await findCommand(parsed.command)
        if (!command) {
            return {
                mode: 'commands',
                results: sortByUsage(await getCommandResults(parsed.command), usageStats)
            }
        }

        if (command.kind === 'builtin') {
            return {
                mode: command.scope,
                results: await searchLocalByScope(command.scope, parsed.argument.trim(), usageStats)
            }
        }

        return {
            mode: 'custom-command',
            results: [createCustomCommandAction(command, parsed.argument)]
        }
    }

    return {
        mode: 'local-all',
        results: await searchLocalByScope('all', rawText.trim(), usageStats, 3)
    }
}

function parseSlashInput(text) {
    const body = text.slice(1)
    const firstSpace = body.indexOf(' ')
    if (firstSpace < 0) {
        return {
            command: body.trim().toLowerCase(),
            argument: '',
            hasArgument: false
        }
    }

    return {
        command: body.slice(0, firstSpace).trim().toLowerCase(),
        argument: body.slice(firstSpace + 1),
        hasArgument: true
    }
}

async function searchLocalByScope(scope, query, usageStats, maxResults = 30) {
    const tasks = []
    const normalizedQuery = normalize(query)

    if (scope === 'all' || scope === 'bookmark') {
        tasks.push(searchBookmarks(normalizedQuery))
    }
    if (scope === 'all' || scope === 'tab') {
        tasks.push(searchTabs(normalizedQuery))
    }
    if (scope === 'all') {
        tasks.push(getCommandResults(normalizedQuery))
    }
    if (scope === 'history') {
        tasks.push(searchHistory(normalizedQuery))
    }

    const groups = await Promise.all(tasks)
    return groups.flat()
        .map(result => ({
            ...result,
            score: scoreResult(result, normalizedQuery, usageStats, scope)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
}

async function searchBookmarks(query) {
    const bookmarks = await getBookmarks()
    if (!query) return []

    return bookmarks
        .filter(item => matchesQuery([item.title, item.url], query))
        .map(item => ({
            id: `bookmark:${item.id || item.url}`,
            usageKey: `bookmark:${item.url}`,
            type: 'bookmark',
            title: item.title || item.url,
            subtitle: getUrlLabel(item.url),
            url: item.url,
            action: {
                kind: 'open_url',
                url: item.url
            }
        }))
}

async function searchTabs(query) {
    const tabs = await chrome.tabs.query({})
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })

    return tabs
        .filter(tab => tab.id !== (activeTab && activeTab.id))
        .filter(tab => !query || matchesQuery([tab.title, tab.url], query))
        .sort((a, b) => {
            const lastAccessedDiff = (b.lastAccessed || 0) - (a.lastAccessed || 0)
            if (lastAccessedDiff) return lastAccessedDiff
            if (a.windowId !== b.windowId) return a.windowId - b.windowId
            return a.index - b.index
        })
        .slice(0, 50)
        .map((tab, index) => ({
            id: `tab:${tab.id}`,
            usageKey: `tab:${tab.url}`,
            type: 'tab',
            title: tab.title || tab.url,
            subtitle: getUrlLabel(tab.url),
            url: tab.url,
            lastAccessed: tab.lastAccessed || 0,
            rankScore: 5000 - index,
            action: {
                kind: 'activate_tab',
                tabId: tab.id,
                windowId: tab.windowId,
                url: tab.url
            }
        }))
}

async function searchHistory(query) {
    if (!query) return []
    const startTime = Date.now() - 1000 * 60 * 60 * 24 * 90
    const items = await chrome.history.search({
        text: query,
        startTime,
        maxResults: 30
    })

    return items
        .filter(item => item.url)
        .slice(0, 20)
        .map(item => ({
            id: `history:${item.id || item.url}`,
            usageKey: `history:${item.url}`,
            type: 'history',
            title: item.title || item.url,
            subtitle: `${formatLastVisit(item.lastVisitTime)} · ${getUrlLabel(item.url)}`,
            url: item.url,
            action: {
                kind: 'open_url',
                url: item.url
            }
        }))
}

async function getCommandResults(query) {
    const builtinResults = BUILTIN_COMMANDS.map(command => ({
        id: `command:builtin:${command.key}`,
        usageKey: `command:builtin:${command.key}`,
        type: command.iconType || 'command',
        title: `/${command.key}`,
        subtitle: command.description,
        action: {
            kind: 'fill',
            value: `/${command.key} `
        },
        commandName: command.name,
        aliases: command.aliases || []
    }))

    const customResults = (await getCustomCommands()).map(command => ({
        id: `command:custom:${command.id}`,
        usageKey: `command:custom:${command.id}`,
        type: 'command',
        title: `/${command.key}`,
        subtitle: command.name || command.urlTemplate,
        action: createCustomCommandFillAction(command),
        commandName: command.name,
        aliases: []
    }))

    const normalizedQuery = normalize(query)
    return builtinResults.concat(customResults)
        .filter(item => {
            if (!normalizedQuery) return true
            return commandMatchesQuery(item, normalizedQuery)
        })
}

function commandMatchesQuery(item, query) {
    const title = normalize(item.title).replace(/^\/+/, '')
    const aliases = (item.aliases || []).map(alias => normalize(alias).replace(/^\/+/, ''))
    return [title, ...aliases].some(value => value.startsWith(query))
}

function createCustomCommandFillAction(command) {
    if (command.urlTemplate && !command.urlTemplate.includes('{query}') && !command.urlTemplate.includes('{raw}')) {
        return {
            kind: 'open_url',
            url: command.urlTemplate
        }
    }

    return {
        kind: 'fill',
        value: `/${command.key} `
    }
}

function createCustomCommandAction(command, argument) {
    return {
        id: `command-action:${command.id}`,
        usageKey: `command:custom:${command.id}`,
        type: 'command',
        title: `/${command.key} ${argument}`.trim(),
        subtitle: command.name || command.urlTemplate,
        url: buildUrlFromTemplate(command.urlTemplate, argument),
        action: {
            kind: 'open_url_template',
            urlTemplate: command.urlTemplate,
            query: argument || '',
            openInNewTab: command.openInNewTab
        }
    }
}

async function findCommand(commandKey) {
    const key = normalizeCommandKey(commandKey)
    const builtin = BUILTIN_COMMANDS.find(command => {
        return command.key === key || (command.aliases || []).includes(key)
    })
    if (builtin) {
        return {
            ...builtin,
            kind: 'builtin'
        }
    }

    const custom = (await getCustomCommands()).find(command => normalizeCommandKey(command.key) === key)
    if (custom) {
        return {
            ...custom,
            kind: 'custom'
        }
    }

    return null
}

async function executeResult(result, newTab) {
    if (!result || !result.action) return { ok: false }

    if (result.type !== 'url') await recordUsage(result.usageKey || result.id)
    const action = result.action

    if (action.kind === 'open_url') {
        await openUrl(action.url, newTab)
        return { ok: true }
    }

    if (action.kind === 'open_url_template') {
        const url = buildUrlFromTemplate(action.urlTemplate, action.query)
        await openUrl(url, action.openInNewTab || newTab)
        return { ok: true }
    }

    if (action.kind === 'activate_tab') {
        if (newTab && action.url) {
            await chrome.tabs.create({ url: action.url })
        } else {
            await chrome.tabs.update(action.tabId, { active: true })
            await chrome.windows.update(action.windowId, { focused: true })
        }
        return { ok: true }
    }

    return { ok: false }
}

async function openUrl(url, newTab) {
    if (!url) return
    if (/^file:/i.test(url) && !await chrome.extension.isAllowedFileSchemeAccess()) {
        throw new Error('请在扩展管理 → JStart → 详情中，开启「允许访问文件网址」后重试')
    }
    if (newTab) {
        await chrome.tabs.create({ url })
        return
    }

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (activeTab && activeTab.id) {
        await chrome.tabs.update(activeTab.id, { url })
    } else {
        await chrome.tabs.create({ url })
    }
}

function buildUrlFromTemplate(template, query) {
    const encoded = encodeURIComponent(query || '')
    const raw = query || ''
    return template
        .replaceAll('{query}', encoded)
        .replaceAll('{raw}', raw)
}

async function toShowJstartPage(windowId, alwaysShow = false) {
    const query = windowId ? { active: true, windowId } : { active: true, currentWindow: true }
    const [tab] = await chrome.tabs.query(query)
    if (!tab || !tab.id) return
    const message = { type: 'jstart', data: alwaysShow ? 'focusStartPage' : 'showStartPage' }

    try {
        await chrome.tabs.sendMessage(tab.id, message)
    } catch {
        try {
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
            await chrome.tabs.sendMessage(tab.id, message)
        } catch {
            // 无法注入的页面在新标签页打开，保留当前页面。
            await chrome.tabs.create({ windowId: tab.windowId, url: chrome.runtime.getURL('newtab.html') })
        }
    }
}

async function toShowJstartPageGlobally() {
    const window = await chrome.windows.getLastFocused({ windowTypes: ['normal'] })
    if (!window || !window.id) return

    if (window.state === 'minimized') {
        await chrome.windows.update(window.id, { state: 'normal' })
    }
    await chrome.windows.update(window.id, { focused: true })
    await toShowJstartPage(window.id, true)
}

async function getBookmarks() {
    const ignoredFolderIds = await getIgnoredBookmarkFolderIds()
    const ignoreKey = ignoredFolderIds.slice().sort().join(',')
    if (jstartSavedBookmarks && jstartSavedBookmarks.length > 0 && jstartSavedBookmarksIgnoreKey === ignoreKey) {
        return jstartSavedBookmarks
    }

    const tree = await chrome.bookmarks.getTree()
    const books = []
    flatFromList(tree, books, new Set(ignoredFolderIds))
    jstartSavedBookmarks = books
    jstartSavedBookmarksIgnoreKey = ignoreKey
    return books
}

function flatFromList(list, flatList, ignoredFolderIds) {
    list.forEach(item => {
        if (item.children && item.children.length > 0) {
            if (ignoredFolderIds.has(item.id)) return
            flatFromList(item.children, flatList, ignoredFolderIds)
        } else if (item.url) {
            flatList.push(item)
        }
    })
}

async function toTogglePreviousTab() {
    const tabs = await chrome.tabs.query({ currentWindow: true })
    const targetTab = tabs
        .filter(tab => tab.id && !tab.active)
        .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0]
    if (!targetTab) return

    await chrome.tabs.update(targetTab.id, { active: true })
    await chrome.windows.update(targetTab.windowId, { focused: true })
}

async function getCustomCommands() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.customCommands])
    return sanitizeCommands(result[STORAGE_KEYS.customCommands] || [])
}

async function saveCustomCommands(commands) {
    await chrome.storage.local.set({
        [STORAGE_KEYS.customCommands]: sanitizeCommands(commands)
    })
}

async function getBookmarkSettings() {
    const [tree, ignoredFolderIds] = await Promise.all([
        chrome.bookmarks.getTree(),
        getIgnoredBookmarkFolderIds()
    ])

    return {
        folders: buildBookmarkFolderTree(tree[0] && tree[0].children ? tree[0].children : tree),
        ignoredFolderIds
    }
}

function buildBookmarkFolderTree(list, parentPath = '') {
    return list
        .filter(item => item.children && item.children.length > 0)
        .map(item => {
            const title = item.title || 'Bookmarks'
            const path = parentPath ? `${parentPath} / ${title}` : title
            return {
                id: item.id,
                title,
                path,
                children: buildBookmarkFolderTree(item.children || [], path)
            }
        })
}

async function getIgnoredBookmarkFolderIds() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.ignoredBookmarkFolderIds])
    return Array.isArray(result[STORAGE_KEYS.ignoredBookmarkFolderIds])
        ? result[STORAGE_KEYS.ignoredBookmarkFolderIds].map(id => `${id}`)
        : []
}

async function saveIgnoredBookmarkFolderIds(folderIds) {
    const uniqueIds = Array.from(new Set((folderIds || []).map(id => `${id}`).filter(Boolean)))
    await chrome.storage.local.set({
        [STORAGE_KEYS.ignoredBookmarkFolderIds]: uniqueIds
    })
    clearBookmarkCache()
}

function clearBookmarkCache() {
    jstartSavedBookmarks = []
    jstartSavedBookmarksIgnoreKey = ''
}

function sanitizeCommands(commands) {
    return commands
        .map(command => ({
            id: command.id || `cmd-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            key: normalizeCommandKey(command.key),
            name: `${command.name || ''}`.trim(),
            urlTemplate: `${command.urlTemplate || ''}`.trim(),
            openInNewTab: Boolean(command.openInNewTab)
        }))
        .filter(command => command.key && command.urlTemplate)
}

async function getUsageStats() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.usageStats])
    return result[STORAGE_KEYS.usageStats] || {}
}

async function recordUsage(key) {
    if (!key) return
    const usageStats = await getUsageStats()
    const item = usageStats[key] || { count: 0, lastUsedAt: 0 }
    usageStats[key] = {
        count: item.count + 1,
        lastUsedAt: Date.now()
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.usageStats]: usageStats })
}

function sortByUsage(results, usageStats) {
    return results
        .map(result => ({
            ...result,
            score: usageScore(result.usageKey, usageStats)
        }))
        .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
}

function scoreResult(result, query, usageStats, scope) {
    const usage = result.type === 'tab' ? 0 : usageScore(result.usageKey, usageStats)
    const title = normalize(result.title)
    const subtitle = normalize(result.subtitle)
    let matchScore = scope === 'all' ? allScopeTypeScore(result.type) : 0
    matchScore += result.rankScore || 0

    if (query && title.startsWith(query)) matchScore += 600
    if (query && title.includes(query)) matchScore += 300
    if (query && subtitle.includes(query)) matchScore += 150
    if (result.type === 'tab') matchScore += 60
    if (result.type === 'bookmark') matchScore += 40

    return usage + matchScore
}

function allScopeTypeScore(type) {
    if (type === 'bookmark') return 30000
    if (type === 'tab') return 20000
    if (type === 'command') return 10000
    return 0
}

function usageScore(key, usageStats) {
    const item = usageStats[key]
    if (!item) return 0
    const daysSinceUsed = Math.max(0, (Date.now() - item.lastUsedAt) / (1000 * 60 * 60 * 24))
    return item.count * 100 + Math.max(0, 50 - daysSinceUsed)
}

function matchesQuery(values, query) {
    if (!query) return true
    return values.some(value => normalize(value).includes(query))
}

function normalize(value) {
    return `${value || ''}`.toLowerCase().trim()
}

function normalizeCommandKey(value) {
    return `${value || ''}`
        .toLowerCase()
        .replace(/^\/+/, '')
        .replace(/[^a-z0-9_-]/g, '')
}

function getUrlLabel(url) {
    try {
        const parsed = new URL(url)
        return parsed.hostname.replace(/^www\./, '')
    } catch (error) {
        return url || ''
    }
}

function formatLastVisit(lastVisitTime) {
    const diff = Date.now() - lastVisitTime
    const minute = 1000 * 60
    const hour = minute * 60
    const day = hour * 24

    if (diff < hour) return `${Math.max(1, Math.round(diff / minute))} 分钟前`
    if (diff < day) return `${Math.round(diff / hour)} 小时前`
    return `${Math.round(diff / day)} 天前`
}
