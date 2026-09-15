/* eslint-disable */

let commands = []
let bookmarkFolders = []
let ignoredBookmarkFolderIds = []
const backgroundNames = Array.from(document.querySelectorAll('#background-name option'), option => option.value)

const nodes = {
    list: document.getElementById('command-list'),
    empty: document.getElementById('empty-state'),
    editor: document.getElementById('command-editor'),
    id: document.getElementById('command-id'),
    key: document.getElementById('command-key'),
    name: document.getElementById('command-name'),
    url: document.getElementById('command-url'),
    newtab: document.getElementById('command-newtab'),
    add: document.getElementById('add-command'),
    save: document.getElementById('save-command'),
    cancel: document.getElementById('cancel-edit'),
    backgroundName: document.getElementById('background-name'),
    backgroundMode: document.getElementById('background-mode'),
    bookmarkList: document.getElementById('bookmark-folder-list'),
    bookmarkEmpty: document.getElementById('bookmark-empty-state'),
    saveBookmarkFolders: document.getElementById('save-bookmark-folders')
}

nodes.add.addEventListener('click', () => openEditor())
nodes.cancel.addEventListener('click', closeEditor)
nodes.save.addEventListener('click', saveFromEditor)
nodes.saveBookmarkFolders.addEventListener('click', saveBookmarkFolderSettings)
nodes.backgroundName.addEventListener('change', () => {
    chrome.storage.local.set({ jStartBackground: nodes.backgroundName.value })
})
nodes.backgroundMode.addEventListener('change', () => {
    chrome.storage.local.set({ jStartBackgroundMode: nodes.backgroundMode.value })
})
nodes.key.addEventListener('input', () => {
    nodes.key.value = normalizeCommandKey(nodes.key.value)
})

loadCommands()
loadBookmarkSettings()
chrome.storage.local.get(['jStartBackground', 'jStartBackgroundMode']).then(result => {
    nodes.backgroundName.value = backgroundNames.includes(result.jStartBackground) ? result.jStartBackground : 'light-rays'
    nodes.backgroundMode.value = result.jStartBackgroundMode === 'static' ? 'static' : 'dynamic'
})

function loadCommands() {
    chrome.runtime.sendMessage(chrome.runtime.id, {
        type: 'jstart:getCommands'
    }).then(response => {
        commands = response && response.commands ? response.commands : []
        renderCommands()
    })
}

function renderCommands() {
    nodes.list.innerHTML = ''
    nodes.empty.hidden = commands.length > 0

    commands.forEach(command => {
        const row = document.createElement('article')
        row.className = 'command-row'

        const key = document.createElement('span')
        key.className = 'command-key'
        key.textContent = `/${command.key}`

        const info = document.createElement('div')
        info.className = 'command-info'

        const name = document.createElement('span')
        name.className = 'command-name'
        name.textContent = command.name || command.urlTemplate

        const url = document.createElement('span')
        url.className = 'command-url'
        url.textContent = command.urlTemplate

        info.appendChild(name)
        info.appendChild(url)

        const actions = document.createElement('div')
        actions.className = 'command-actions'

        const edit = document.createElement('button')
        edit.className = 'icon-button'
        edit.type = 'button'
        edit.title = '编辑'
        edit.textContent = 'E'
        edit.addEventListener('click', () => openEditor(command))

        const remove = document.createElement('button')
        remove.className = 'icon-button'
        remove.type = 'button'
        remove.title = '删除'
        remove.textContent = 'D'
        remove.addEventListener('click', () => removeCommand(command.id))

        actions.appendChild(edit)
        actions.appendChild(remove)

        row.appendChild(key)
        row.appendChild(info)
        row.appendChild(actions)
        nodes.list.appendChild(row)
    })
}

function openEditor(command) {
    nodes.id.value = command ? command.id : ''
    nodes.key.value = command ? command.key : ''
    nodes.name.value = command ? command.name : ''
    nodes.url.value = command ? command.urlTemplate : ''
    nodes.newtab.checked = command ? command.openInNewTab : false
    nodes.editor.hidden = false
    nodes.key.focus()
}

function closeEditor() {
    nodes.editor.hidden = true
}

function saveFromEditor() {
    const command = {
        id: nodes.id.value || `cmd-${Date.now()}`,
        key: normalizeCommandKey(nodes.key.value),
        name: nodes.name.value.trim(),
        urlTemplate: nodes.url.value.trim(),
        openInNewTab: nodes.newtab.checked
    }

    if (!command.key || !command.urlTemplate) {
        return
    }

    const existingIndex = commands.findIndex(item => item.id === command.id)
    const duplicatedIndex = commands.findIndex(item => item.key === command.key && item.id !== command.id)
    if (duplicatedIndex >= 0) {
        commands.splice(duplicatedIndex, 1)
    }

    if (existingIndex >= 0) {
        commands.splice(existingIndex, 1, command)
    } else {
        commands.push(command)
    }

    saveCommands()
}

function removeCommand(id) {
    commands = commands.filter(command => command.id !== id)
    saveCommands()
}

function saveCommands() {
    chrome.runtime.sendMessage(chrome.runtime.id, {
        type: 'jstart:saveCommands',
        commands
    }).then(() => {
        closeEditor()
        loadCommands()
    })
}

function loadBookmarkSettings() {
    chrome.runtime.sendMessage(chrome.runtime.id, {
        type: 'jstart:getBookmarkSettings'
    }).then(response => {
        bookmarkFolders = response && response.folders ? response.folders : []
        ignoredBookmarkFolderIds = response && response.ignoredFolderIds ? response.ignoredFolderIds : []
        renderBookmarkFolders()
    })
}

function renderBookmarkFolders() {
    nodes.bookmarkList.innerHTML = ''
    nodes.bookmarkEmpty.hidden = bookmarkFolders.length > 0
    bookmarkFolders.forEach(folder => {
        nodes.bookmarkList.appendChild(createBookmarkFolderNode(folder, 0))
    })
}

function createBookmarkFolderNode(folder, depth) {
    const wrapper = document.createElement('div')
    wrapper.className = 'bookmark-folder-node'

    const row = document.createElement('label')
    row.className = 'bookmark-folder-row'
    row.style.paddingLeft = `${depth * 18 + 10}px`

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.value = folder.id
    checkbox.checked = ignoredBookmarkFolderIds.includes(folder.id)
    checkbox.addEventListener('change', () => {
        setChildrenChecked(wrapper, checkbox.checked)
    })

    const title = document.createElement('span')
    title.className = 'bookmark-folder-title'
    title.textContent = folder.title

    const path = document.createElement('span')
    path.className = 'bookmark-folder-path'
    path.textContent = folder.path

    row.appendChild(checkbox)
    row.appendChild(title)
    row.appendChild(path)
    wrapper.appendChild(row)

    ;(folder.children || []).forEach(child => {
        wrapper.appendChild(createBookmarkFolderNode(child, depth + 1))
    })

    return wrapper
}

function setChildrenChecked(wrapper, checked) {
    wrapper.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.checked = checked
    })
}

function saveBookmarkFolderSettings() {
    const checkedIds = Array.from(nodes.bookmarkList.querySelectorAll('input[type="checkbox"]:checked'))
        .map(input => input.value)

    chrome.runtime.sendMessage(chrome.runtime.id, {
        type: 'jstart:saveIgnoredBookmarkFolders',
        folderIds: checkedIds
    }).then(() => {
        ignoredBookmarkFolderIds = checkedIds
        renderBookmarkFolders()
    })
}

function normalizeCommandKey(value) {
    return `${value || ''}`
        .toLowerCase()
        .replace(/^\/+/, '')
        .replace(/[^a-z0-9_-]/g, '')
}
