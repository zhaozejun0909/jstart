/* eslint-disable */
// console.log('hello world content todo something~')

let jStrartActived = false // 激活状态：页面是否显示 
let jStartSearchType = 'google'; // baidu google
let jStarttabStart = false
let jStartCommandKeyDown = false
let jStartSuggestList = []
let jStartSuggestSelectedIndex = -1 // 选中的推荐index
let jStartBookmarks = []
const jStartBrowserPage = [
    // chrome 不支持通过js跳转浏览器页面，暂时注释掉了
    // {type: 'browserpage', q: 'history chrome 历史记录', url: 'chrome://history/'},
    // {type: 'browserpage', q: 'setting chrome 设置', url: 'chrome://settings/'},
    // {type: 'browserpage', q: 'extensions chrome 扩展插件', url: 'chrome://extensions/'},
    // {type: 'browserpage', q: 'downloads chrome 下载', url: 'chrome://downloads/'},
    // {type: 'browserpage', q: 'bookmarks chrome 书签收藏', url: 'chrome://bookmarks/'},
]

// 监听按钮点击 或者快捷键
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // console.log("content.js Received request: ", message, sender);
    if (!message.type) return
    if (message.type === 'jstart'){
        if (message.data === 'showStartPage') {
            showMainView();
        } else if (message.data === 'openResultInNewTab') {
            if (jStrartActived) {
                handleResult('keyword', getInputValue(), true)
            }
        }
    } else if (message.type === 'google' || message.type === 'baidu') {
        // 搜索结果回调
        handleSeachResult(message)
    } else if (message.type === 'bookmarks') {
        // 接收书签信息
        handleBookmarks(message.data)
    }
    sendResponse(true)
    return true
});

function showMainView(message) {
    if (document.getElementById("jstart-content-view")) {
        removeHTML()
    } else {
        insertHTML()
    }
    // initVue()
}

function insertHTML() {
    console.log('jstart 加载 ~')
    const div = document.createElement("div")
    document.body.appendChild(div);
    div.outerHTML = getstr()
    jStrartActived = true
    // 渐入动画
    if (jStarttabStart) {
        $("#jstart-content-view").prop("style").display = 'block'
    } else {
        $("#jstart-content-view").fadeIn(300, function () {
        });
    }

    // 自动获取焦点
    focusOnSearch()
    // 搜索事件 
    let inputE = $("#j-input-view-input")
    inputE.keyup(function (e) {
        // console.log(e.keyCode + ' 按键被松开')
        if (e && e.keyCode === 91) { // Command 键
            // 用于 Commond + Enter 快捷键
            jStartCommandKeyDown = false
        }
    })
    inputE.keydown(function (e) {
        // console.log(e.keyCode + ' 按键被按下')
        if (e && e.keyCode === 13) { // enter键
            const suggestContent = getSuggestSelected()
            const newTab = jStartCommandKeyDown
            if (suggestContent) {
                handleResult(suggestContent.type, suggestContent.value, newTab)
            } else {
                handleResult('keyword', getInputValue(), newTab)
            }
            e.preventDefault();
        } else if (e.keyCode === 27) { // ESC键
            removeHTML()
            e.preventDefault();
        } else if (e.keyCode === 9) { // tab键
            if (jStartSuggestList.length) changeSuggestResult('next')
            else changeSearchType()
            e.preventDefault();
        } else if (e && e.keyCode === 91) { // Command 键
            // 用于 Commond + Enter 快捷键
            jStartCommandKeyDown = true
        } else if (e && (e.keyCode === 40 || e.keyCode === 38)) { // 下 方向键
            changeSuggestResult(e.keyCode)
            e.preventDefault();
        }
    })

    // 切换搜索平台
    chrome.storage.local.get(['jStartSearchType'], function (result) { // 默认 读取上次使用
        if (result && result['jStartSearchType']) {
            jStartSearchType = result['jStartSearchType']
            refreshLogo()
        }
    });
    $(".j-logo-view-div-img").click(changeSearchType)

    document.getElementById("j-input-view-input").oninput = debounce(onInputChange, 200)
}

// 触发搜索点击事件
function handleResult(type, value, newTab) {
    if (type === 'keyword') {
        let goUrl = ''
        if (value.length === 0) {
            // 直接回车会打开对应的搜索平台
            if (jStartSearchType === 'google') {
                goUrl = `https://www.google.com/search`
            } else {
                goUrl = `https://www.baidu.com/`
            }
        } else {
            if (jStartSearchType === 'google') {
                goUrl = `https://www.google.com/search?q=${encodeURIComponent(value)}`
            } else {
                goUrl = `https://www.baidu.com/s?ie=UTF-8&wd=${encodeURIComponent(value)}`
            }
        } 
        if (!newTab) {
            location.assign(goUrl)
        } else {
            window.open(goUrl, '_blank')
            removeHTML()
        }
    } else if (type === 'url') {
        // 保存点击记录
        if (!newTab) {
            location.assign(value)
        } else {
            window.open(value, '_blank')
            removeHTML()
        }
    }
}

function removeHTML() {
    console.log('jstart 退出 ~')
    const div = document.getElementById("jstart-content-view")
    if (div) {
        div.remove()
        jStrartActived = false
    }
}

// 处理书签结果
function handleBookmarks(list) {
    jStartBookmarks = list.map(item => {
        item['type'] = 'bookmark'
        item['q'] = item.title
        return item
    })
}

// 接收到搜索联想关键词请求
function handleSeachResult(result) {
    if (!result['type'] || !result['data']) return
    const type = result['type']
    const data = result['data']
    if (type === 'baidu') {
        try {
            const dataObj = data
            let list = dataObj['g']
            list.forEach(item => {
                item.type = type
            })
            showSuggest(list)
        } catch (error) { }
    } else if (type === 'google') {
        try {
            const xmlData = $.parseXML(data)
            const xmlDom = $(xmlData)
            const elementlist = xmlDom.find("suggestion");
            const list = []
            elementlist.each((index, element) => {
                const content = $(element).attr('data');
                if (content) {
                    list.push({ type: type, q: content })
                }
            })
            showSuggest(list)
        } catch (error) { }
    }
}

// 显示搜索结果
function showSuggest(list) {
    // console.log("🚀 ~ file: content.js:147 ~ showSuggest ~ list", list)
    let booksMatch = addBookmarksInSuggest() // 匹配书签和快捷命令
    if (booksMatch) list = booksMatch.concat(list)
    if (!list) return
    removeSuggest()
    if (list.length === 0) return
    jStartSuggestList = list
    // 显示输入联想
    let suggestHtml = $(`<div class="jstart-suggest-view" id="jstart-suggest-view"></div>`)
    $(suggestHtml).append(`<div class="jstart-suggest-view-line"></div>`)
    $(suggestHtml).mousemove(() => { // 鼠标移动才添加 hover 效果，优化选中时机效果
        if (!$(".jstart-suggest-view-item").hasClass("jstart-hover")) {
            $(".jstart-suggest-view-item").addClass('jstart-hover')
        }
    })
    list.forEach((item, index) => {
        let liHtml = $(`<li class="jstart-suggest-view-item">${item.q}</li>`)
        $(liHtml).click(function () {
            suggestClick(index)
        })
        if (item.type === 'bookmark') { // 添加书签icon
            $(liHtml).append(`<img class="jstart-type-icon" alt src="data:image/svg+xml;base64,PHN2ZyB0PSIxNjcwNTUxNDA1MzQyIiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjEzOTIiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCI+PHBhdGggZD0iTTczNy43IDE3MS44djI5OS42QzY4OSA0MzQuNiA2NDMuOSA0MDAuNiA1OTggMzY1LjljLTQ1LjEgMzQuNi04OS43IDY4LjctMTM3LjkgMTA1LjZWMTY1LjZjLTI5LjIgMC01NS41LTAuMy04MS44IDAuMS0zMy43IDAuNS02Ny43LTEtMTAxIDIuOC00Ny4zIDUuNC04MS41IDQ1LjMtODEuNiA5Mi42LTAuNCAxNjIuMi0wLjQgMzI0LjMgMCA0ODYuNSAwLjEgNTQuNCA0Mi4xIDkzLjcgMTAwLjcgOTUuOSAxNy4yIDAuNiAzNC40IDAuMiA1MS42IDAuMSAxNS43IDAgMjUuOCA3IDI2IDIzLjMgMC4yIDE2LjItMTAuMSAyNC4yLTI1LjQgMjQuMi0yNy4xLTAuMi01NC41IDEtODEuMS0yLjktNjcuOC0xMC4yLTExOC44LTY2LjctMTE5LjQtMTM1LjctMS40LTE2NS41LTEuNi0zMzEgMC4xLTQ5Ni40IDAuOC03Ny40IDY1LjgtMTM3LjcgMTQzLjQtMTM4IDE0Mi4zLTAuNSAyODQuNi0wLjYgNDI2LjktMC41IDcwLjUgMCAxMzcuNSA2MC45IDEzOS44IDEzMS42IDIuNyA4NCAxLjEgMTY4LjEgMS4xIDI1Mi4yIDAgMTUuNi04LjMgMjUuMy0yNC41IDI0LjktMTcuNi0wLjUtMjMuNi0xMi42LTIzLjYtMjguMy0wLjItNjAuOS0wLjEtMTIxLjgtMC4xLTE4Mi43IDAtMTkuMiAwLjUtMzguNC0wLjEtNTcuNi0xLjMtNDIuMS0zMy42LTgwLjUtNzMuNC04NS45ek01OTcuOCAzMDUuMWMzMC4zIDIyLjggNTkgNDQuNCA4OS44IDY3LjZWMTY4LjlINTA5LjN2MjAzLjdjMzAuOS0yMy41IDU5LjEtNDUgODguNS02Ny41eiIgZmlsbD0iIzExOTVGRSIgcC1pZD0iMTM5MyI+PC9wYXRoPjxwYXRoIGQ9Ik02NTEuOSA3NjQuN0g0ODUuNGMtNC42IDAtOS4zIDAuMi0xMy45LTAuMS0xNS4xLTEuMS0yNS42LTguMS0yNS41LTI0LjMgMC4xLTE2LjIgMTAuNC0yMy41IDI1LjgtMjMuNyAyNy43LTAuMyA1NS41LTAuMSA4My4yLTAuMWgyNjMuNmM0LjYgMCA5LjMgMC4xIDEzLjkgMCAxNS43LTAuMSAyNS45IDcuMiAyNi4zIDIzLjEgMC41IDE3LjEtMTAuMiAyNS0yNi42IDI1LjEtNDMuNiAwLjItODcuMiAwLjEtMTMwLjggMC4xLTE2LjUtMC4xLTMzLTAuMS00OS41LTAuMXpNNjUxLjkgODkxLjZINDg1LjRjLTQuNiAwLTkuMyAwLjItMTMuOS0wLjEtMTUuMS0xLjEtMjUuNi04LjEtMjUuNS0yNC4zIDAuMS0xNi4yIDEwLjQtMjMuNSAyNS44LTIzLjcgMjcuNy0wLjMgNTUuNS0wLjEgODMuMi0wLjFoMjYzLjZjNC42IDAgOS4zIDAuMSAxMy45IDAgMTUuNy0wLjEgMjUuOSA3LjIgMjYuMyAyMy4xIDAuNSAxNy4xLTEwLjIgMjUtMjYuNiAyNS4xLTQzLjYgMC4yLTg3LjIgMC4xLTEzMC44IDAuMS0xNi41LTAuMS0zMy0wLjEtNDkuNS0wLjF6TTY1Mi4zIDYzOC4zYy01OC4yIDAtMTE2LjMgMC4xLTE3NC41IDAtMjEuNSAwLTMyLjEtOC0zMi4xLTIzLjUgMC0xNS45IDEwLjUtMjQuNyAzMS41LTI0LjcgMTE3LTAuMiAyMzMuOS0wLjIgMzUwLjkgMCAyMC42IDAgMzEuOSA5LjMgMzAuOCAyNS4xLTEuMyAxOC42LTEzLjQgMjMuNC0zMC4yIDIzLjMtNTguNy0wLjUtMTE3LjUtMC4yLTE3Ni40LTAuMnoiIGZpbGw9IiMxMTk1RkUiIHAtaWQ9IjEzOTQiPjwvcGF0aD48L3N2Zz4=">`)
        } else if (item.type === 'browserpage') { // 浏览器快捷命令
            $(liHtml).append(`<img class="jstart-type-icon" alt src="data:image/svg+xml;base64,PHN2ZyB0PSIxNjcwNTU4MTAzNDU0IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjU4NTkiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCI+PHBhdGggZD0iTTk4MS4zMzMzMzMgNTU0LjY2NjY2N2gtODcuODUwNjY2YTM4MC41NDQgMzgwLjU0NCAwIDAgMS0yOS44NjY2NjcgMTEwLjkzMzMzM2w3Ni4wMzIgNDMuOTA0YTQyLjY2NjY2NyA0Mi42NjY2NjcgMCAxIDEtNDIuNjY2NjY3IDczLjg5ODY2N2wtNzYuMjg4LTQ0LjA3NDY2N2EzODUuOTYyNjY3IDM4NS45NjI2NjcgMCAwIDEtODEuMjggODEuMDY2NjY3bDQ0LjA3NDY2NyA3Ni4zMzA2NjZhNDIuNjY2NjY3IDQyLjY2NjY2NyAwIDEgMS03My44OTg2NjcgNDIuNjY2NjY3bC00My45MDQtNzYuMDc0NjY3YTM4MS4yNjkzMzMgMzgxLjI2OTMzMyAwIDAgMS0xMTEuMTQ2NjY2IDI5Ljg2NjY2N1Y5ODEuMzMzMzMzYTQyLjY2NjY2NyA0Mi42NjY2NjcgMCAwIDEtODUuMzMzMzM0IDB2LTg3Ljg1MDY2NmEzODEuMjY5MzMzIDM4MS4yNjkzMzMgMCAwIDEtMTExLjE0NjY2Ni0yOS44NjY2NjdsLTQzLjkwNCA3Ni4wNzQ2NjdhNDIuNjY2NjY3IDQyLjY2NjY2NyAwIDEgMS03My44OTg2NjctNDIuNjY2NjY3bDQ0LjA3NDY2Ny03Ni4zMzA2NjdhMzg1Ljk2MjY2NyAzODUuOTYyNjY3IDAgMCAxLTgxLjI4LTgxLjA2NjY2NmwtNzYuMjg4IDQ0LjA3NDY2NmE0Mi42NjY2NjcgNDIuNjY2NjY3IDAgMSAxLTQyLjY2NjY2Ny03My44OTg2NjZsNzYuMDMyLTQzLjkwNGEzODAuNTQ0IDM4MC41NDQgMCAwIDEtMjkuODY2NjY3LTExMC45MzMzMzRINDIuNjY2NjY3YTQyLjY2NjY2NyA0Mi42NjY2NjcgMCAxIDEgMC04NS4zMzMzMzNoODcuODUwNjY2YTM4MC41NDQgMzgwLjU0NCAwIDAgMSAyOS44NjY2NjctMTEwLjkzMzMzM0w4NC4zNTIgMzE0Ljc5NDY2N2E0Mi42NjY2NjcgNDIuNjY2NjY3IDAgMCAxIDQyLjY2NjY2Ny03My44OTg2NjdsNzYuMjg4IDQ0LjA3NDY2N2EzODUuOTYyNjY3IDM4NS45NjI2NjcgMCAwIDEgODEuMjgtODEuMDY2NjY3TDI0MC41MTIgMTI3LjU3MzMzM2E0Mi42NjY2NjcgNDIuNjY2NjY3IDAgMSAxIDczLjg5ODY2Ny00Mi42NjY2NjZsNDMuOTA0IDc2LjAzMmEzODEuMjY5MzMzIDM4MS4yNjkzMzMgMCAwIDEgMTExLjE0NjY2Ni0yOS44NjY2NjdWNDIuNjY2NjY3YTQyLjY2NjY2NyA0Mi42NjY2NjcgMCAwIDEgODUuMzMzMzM0IDB2ODcuODUwNjY2YTM4MS4yNjkzMzMgMzgxLjI2OTMzMyAwIDAgMSAxMTEuMTQ2NjY2IDI5Ljg2NjY2N2w0My45MDQtNzYuMDMyYTQyLjY2NjY2NyA0Mi42NjY2NjcgMCAwIDEgNzMuODk4NjY3IDQyLjY2NjY2N2wtNDQuMDc0NjY3IDc2LjMzMDY2NmEzODUuODM0NjY3IDM4NS44MzQ2NjcgMCAwIDEgODEuMjggODEuMDY2NjY3bDc2LjI4OC00NC4wNzQ2NjdhNDIuNjY2NjY3IDQyLjY2NjY2NyAwIDAgMSA0Mi42NjY2NjcgNzMuODk4NjY3TDg2My43NDQgMzU4LjRhMzgwLjU0NCAzODAuNTQ0IDAgMCAxIDI5Ljg2NjY2NyAxMTAuOTMzMzMzSDk4MS4zMzMzMzNhNDIuNjY2NjY3IDQyLjY2NjY2NyAwIDEgMSAwIDg1LjMzMzMzNHpNNTEyIDIxMy4zMzMzMzNhMjk4LjY2NjY2NyAyOTguNjY2NjY3IDAgMSAwIDI5OC42NjY2NjcgMjk4LjY2NjY2NyAyOTguNjY2NjY3IDI5OC42NjY2NjcgMCAwIDAtMjk4LjY2NjY2Ny0yOTguNjY2NjY3eiIgcC1pZD0iNTg2MCIgZmlsbD0iI2U2ZTZlNiI+PC9wYXRoPjxwYXRoIGQ9Ik04MTAuNjY2NjY3IDY4MS4wNDUzMzNhNDIuNjY2NjY3IDQyLjY2NjY2NyAwIDAgMS01OC4yODI2NjcgMTUuNjE2bC0yNDQuMTM4NjY3LTE0MC44TDI3Ni42OTMzMzMgNjc4LjRhNDQuNTg2NjY3IDQ0LjU4NjY2NyAwIDAgMS01OC4wMjY2NjYtMTQuMjkzMzMzIDM3LjI5MDY2NyAzNy4yOTA2NjcgMCAwIDEgMTUuNTMwNjY2LTUzLjI5MDY2N0w0NjkuMzMzMzMzIDQ4Ni40VjIxMy4zMzMzMzNhNDIuNjY2NjY3IDQyLjY2NjY2NyAwIDAgMSA4NS4zMzMzMzQgMHYyNzAuNjM0NjY3bDI0MC4zODQgMTM4Ljc5NDY2N0E0Mi42NjY2NjcgNDIuNjY2NjY3IDAgMCAxIDgxMC42NjY2NjcgNjgxLjA0NTMzM3oiIHAtaWQ9IjU4NjEiIGZpbGw9IiNlNmU2ZTYiPjwvcGF0aD48L3N2Zz4=">`)
        }
        $(suggestHtml).append(liHtml)
    })
    $("#j-search-view").append(suggestHtml)
}

// 匹配快捷命令：书签 设置 历史记录
function addBookmarksInSuggest() {
    let currentInput = getInputValue()
    if (!currentInput) return null
    const isQuickSearch  = currentInput.indexOf('/') === 0 || currentInput.indexOf('、') === 0
    if (currentInput === '/' || currentInput === '、') { // 搜索书签快捷键
        list = []
        // 加载历史记录，按常用排序

    } else if (currentInput.length > 1) {
        let searchWord = currentInput.toLowerCase()
        if (isQuickSearch) {
            searchWord = searchWord.substr(1)
        }
        // 匹配浏览器快捷命令
        let targetList = []
        targetList = targetList.concat(jStartBrowserPage.filter(item => item['q'].toLowerCase().includes(searchWord)))
        // 匹配书签
        let targetBookmarks = jStartBookmarks.filter(bookmark => bookmark['title'].toLowerCase().includes(searchWord))
        targetList = targetList.concat(targetBookmarks)
        if (!isQuickSearch && targetList.length > 3) targetList = targetList.slice(0, 3) // 最多三个
        return targetList
    }
    return null
}

// 隐藏联想view
function removeSuggest() {
    jStartSuggestSelectedIndex = -1
    jStartSuggestList = []
    $("#jstart-suggest-view").remove()
}

// 获取当前的suggest选中结果
function getSuggestSelected() {
    if (!$("#jstart-suggest-view")) return null
    if (jStartSuggestSelectedIndex < 0) return null
    let item = jStartSuggestList[jStartSuggestSelectedIndex]
    if (item.type === 'bookmark') {
        return {type: 'url', value: item.url}
    } else if (item.type === 'browserpage') {
        return {type: 'url', value: item.url}
    } else {
        return {type: 'keyword', value: item.q}
    }
}

// 点击suggest 
function suggestClick(index) {
    jStartSuggestSelectedIndex = index
    suggestJump()
}

function suggestJump() {
    const suggestContent = getSuggestSelected()
    handleResult(suggestContent.type, suggestContent.value)
}

// 切换搜索结果
function changeSuggestResult(keyCode) {
    if (!$("#jstart-suggest-view")) return
    const upKey = keyCode == 38
    if (upKey) {
        if (jStartSuggestSelectedIndex > 0) jStartSuggestSelectedIndex--
        else jStartSuggestSelectedIndex = jStartSuggestList.length - 1
    } else {
        if (jStartSuggestList.length > jStartSuggestSelectedIndex + 1) jStartSuggestSelectedIndex++
        else jStartSuggestSelectedIndex = 0
    }
    refreshSuggestHilight()
}

// 刷新高亮状态
function refreshSuggestHilight() {
    $(".jstart-suggest-view-item").each((index, ele) => {
        if (index === jStartSuggestSelectedIndex) {
            $(ele).addClass('jstart-selected')
        } else {
            $(ele).removeClass('jstart-selected')
        }
    })
}

// 切换搜索平台
function changeSearchType(event) {
    // console.log('dianjile logo ')
    jStartSearchType = (jStartSearchType === 'google') ? 'baidu' : 'google'
    chrome.storage.local.set({ "jStartSearchType": jStartSearchType }, function () { });
    refreshLogo()
    focusOnSearch()
    // event.stopPropagation()
    onInputChange() // 触发搜索关键词请求
}

// 获取输入内容
function getInputValue() {
    let inputE = document.getElementById('j-input-view-input');
    if (inputE) return inputE.value
    return ''
}

// 刷新搜索平台logo
function refreshLogo() {
    const googleLogo = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNDggNDgiPjxkZWZzPjxwYXRoIGlkPSJhIiBkPSJNNDQuNSAyMEgyNHY4LjVoMTEuOEMzNC43IDMzLjkgMzAuMSAzNyAyNCAzN2MtNy4yIDAtMTMtNS44LTEzLTEzczUuOC0xMyAxMy0xM2MzLjEgMCA1LjkgMS4xIDguMSAyLjlsNi40LTYuNEMzNC42IDQuMSAyOS42IDIgMjQgMiAxMS44IDIgMiAxMS44IDIgMjRzOS44IDIyIDIyIDIyYzExIDAgMjEtOCAyMS0yMiAwLTEuMy0uMi0yLjctLjUtNHoiLz48L2RlZnM+PGNsaXBQYXRoIGlkPSJiIj48dXNlIHhsaW5rOmhyZWY9IiNhIiBvdmVyZmxvdz0idmlzaWJsZSIvPjwvY2xpcFBhdGg+PHBhdGggY2xpcC1wYXRoPSJ1cmwoI2IpIiBmaWxsPSIjRkJCQzA1IiBkPSJNMCAzN1YxMWwxNyAxM3oiLz48cGF0aCBjbGlwLXBhdGg9InVybCgjYikiIGZpbGw9IiNFQTQzMzUiIGQ9Ik0wIDExbDE3IDEzIDctNi4xTDQ4IDE0VjBIMHoiLz48cGF0aCBjbGlwLXBhdGg9InVybCgjYikiIGZpbGw9IiMzNEE4NTMiIGQ9Ik0wIDM3bDMwLTIzIDcuOSAxTDQ4IDB2NDhIMHoiLz48cGF0aCBjbGlwLXBhdGg9InVybCgjYikiIGZpbGw9IiM0Mjg1RjQiIGQ9Ik00OCA0OEwxNyAyNGwtNC0zIDM1LTEweiIvPjwvc3ZnPg=="
    const baiduLogo = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTExLjUxOCAzMy43MjRjNi45NTctMS40OTUgNi4wMTItOS44IDUuODAyLTExLjYzLS4zNDItMi44MDMtMy42MzgtNy43LTguMTEzLTcuMzEzLTUuNjMuNTA1LTYuNDU0IDguNjQtNi40NTQgOC42NC0uNzUzIDMuNzYzIDEuODIzIDExLjggOC43NjUgMTAuMzAzem0xMi45MTctMTMuOTQ3YzMuODQyIDAgNi45NDgtNC40MjMgNi45NDgtOS44OTJDMzEuMzgzIDQuNDIyIDI4LjI3NyAwIDI0LjQzNSAwcy02Ljk1MiA0LjQyMi02Ljk1MiA5Ljg4NWMwIDUuNDcgMy4xMTQgOS44OTIgNi45NTIgOS44OTJ6bTE2LjU1LjY1M2M1LjEzOC42NjcgOC40NC00LjgxNSA5LjA5Ny04Ljk3LjY3LTQuMTUtMi42NDQtOC45Ny02LjI4LTkuNzk4LTMuNjQ1LS44MzUtOC4xOTUgNS4wMDItOC42IDguODA4LS40OTYgNC42NTMuNjY2IDkuMyA1Ljc5MyA5Ljk2em0yMC4zNjMgNi45NzdjMC0xLjk4Ny0xLjY1LTcuOTc0LTcuNzc1LTcuOTc0LTYuMTM3IDAtNi45NTQgNS42NS02Ljk1NCA5LjY0MyAwIDMuODEyLjMyIDkuMTMyIDcuOTQgOC45NjNzNi43ODctOC42MzMgNi43ODctMTAuNjMzek0xOC45MDYgNDguMmMtLjIwMy41ODUtLjY2IDIuMDgtLjI2NSAzLjM4Mi4zMyAxLjYyNiAxLjY2NyAyLjg1NyAzLjMxNCAzLjA1MkgyNS42di04LjkwOGgtMy45MDJhNC4yOCA0LjI4IDAgMCAwLTIuNzkxIDIuNDczem0zNC42NjgtMy4zMzRzLTcuOTQ4LTYuMTQ4LTEyLjU4OC0xMi43OTVjLTYuMjg4LTkuOC0xNS4yMjQtNS44LTE4LjIxMi0uODI4LTIuOTc1IDQuOTgzLTcuNjEyIDguMTM1LTguMjcyIDguOTctLjY2Ni44MjItOS42IDUuNjQzLTcuNjE1IDE0LjQ1MiAxLjk4IDguODAyIDguOTQ1IDguNjMzIDguOTQ1IDguNjMzYTM5LjA0IDM5LjA0IDAgMCAwIDExLjA4OC0uODI4IDIzLjM5IDIzLjM5IDAgMCAxIDExLjA4NS4zM3MxMy45MTMgNC42NiAxNy43Mi00LjMxMi0yLjE1LTEzLjYyMi0yLjE1LTEzLjYyMnptLTIzLjgwNyAxMy4zNWgtOS4wNDVjLTMuOTA1LS43NzgtNS40NjItMy40NDQtNS42Ni0zLjktLjE5Mi0uNDYtMS4yOTgtMi42MDMtLjcxMy02LjI0OCAxLjY4OC01LjQ2MyA2LjUwNC01Ljg1NSA2LjUwNC01Ljg1NWg0LjgxNHYtNS45MThsNC4xLjA2MnptMTYuODQ2LS4wNjJoLTEwLjRDMzIuMTggNTcuMTE0IDMyIDU0LjI0OCAzMiA1NC4yNDh2LTExLjVsNC4yMjMtLjA2OHYxMC4zNDdjLjI1OCAxLjEwMyAxLjYzIDEuMyAxLjYzIDEuM2g0LjN2LTExLjU4aDQuNXoiLz48L3N2Zz4="
    const theLogo = (jStartSearchType === 'google') ? googleLogo : baiduLogo
    $(".j-logo-view-div-img").attr("src", theLogo)
}

// 输入框获得焦点
function focusOnSearch() {
    let input = document.getElementsByClassName('j-input-view-input')[0];
    if (input) {
        input.focus()
    }
}

function onInputChange(e) {
    const text = getInputValue()
    if (!text) {
        removeSuggest() // 清空联想词显示
        return
    } else if (text.indexOf('/') === 0 || text.indexOf('、') === 0) {
        showSuggest([]) // 快捷键: 快捷操作：书签，设置页面
        return
    } else {
        showSuggest([]) // 先展示本地匹配，等待网络搜索回来
    }
    const sendDic = { type: jStartSearchType, searchWord: text }
    chrome.runtime.sendMessage(chrome.runtime.id, sendDic).then((response) => {
    });
}

function debounce(callback, delay = 800) {
    let timer = null;
    return function () {
        let self = this;
        let args = arguments;
        timer && clearTimeout(timer)
        timer = setTimeout(function () {
            // apply: 作用就是改变方法内部this的指向, 并能将参数传递给该方法, 最后立即执行这个函数
            callback.apply(self, args)
        }, delay);
    }
}

function getstr() {
    return `
    <div id="jstart-content-view" class="jstart-content-view" >
      <div class="j-search-view" id="j-search-view">
          <div class="j-search-content" id="j-search-content">

              <div class="j-search-icon-view">
                  <div class="j-search-icon-view-span-view">
                      <span class="j-search-icon-view-span" style="height:20px;line-height:20px;width:20px">
                          <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
                          </svg>
                      </span>
                  </div>
              </div>

              <div class="a4bIc j-input-view">
                  <style data-iml="1669015554577">.gLFyf-j{background-color:transparent;border:none;margin:0;padding:0;color:#e8eaed;word-wrap:break-word;outline:none;display:flex;flex:100%;-webkit-tap-highlight-color:transparent;margin-top:-37px;height:34px;font-size:16px;}.minidiv .gLFyf-j{margin-top:-35px;}.a4bIc{display:flex;flex:1;flex-wrap:wrap}.YacQv-j{color:transparent;flex:100%;white-space:pre;height:34px;font-size:16px;}.YacQv-j span{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAECAYAAAC3OK7NAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAFhJREFUeNpiZACCL93NCkAqAYgv8JTWbkAT2wAUu8AIFDAAcvaDBIA4AIgLQRqgYgeA2AGIHZmgAoVAXYkgASDuB+LzULFAqMb9ICtApqAAoJgAGj8AIMAAwSMfC4GFoWEAAAAASUVORK5CYII=") repeat-x scroll 0 100% transparent;padding:0 0 10px 0;}</style>
                  <div class="YacQv-j" jsname="vdLsw"></div>
                  <input class="j-input-view-input gLFyf-j" id="j-input-view-input" maxlength="2048" name="q" type="text" aria-autocomplete="both" aria-haspopup="false" autocapitalize="off" autocomplete="off" autocorrect="off" autofocus role="combobox" spellcheck="false" title="Google 搜索" value="" aria-label="搜索">
              </div>

              <div class="j-logo-view dRYYxd-j">
                  <style>
                      .dRYYxd-j{display:flex;flex:0 0 auto;margin-top:-5px;align-items:stretch;flex-direction:row}.minidiv .dRYYxd-j{margin-top:0}
                  </style>
                  <style>
                      .nDcEnd-j{flex:1 0 auto;display:flex;cursor:pointer;align-items:center;border:0;background:transparent;outline:none;line-height:44px}.Gdd5U-j{height:20px;width:20px;vertical-align:middle}.minidiv .nDcEnd-j{line-height:32px}.minidiv .Gdd5U-j{width:20px;height:20px}
                  </style>
                  <div class="j-logo-view-div nDcEnd-j" aria-label="切换搜索平台" role="button" tabindex="0">
                      <img class="j-logo-view-div-img Gdd5U-j" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNDggNDgiPjxkZWZzPjxwYXRoIGlkPSJhIiBkPSJNNDQuNSAyMEgyNHY4LjVoMTEuOEMzNC43IDMzLjkgMzAuMSAzNyAyNCAzN2MtNy4yIDAtMTMtNS44LTEzLTEzczUuOC0xMyAxMy0xM2MzLjEgMCA1LjkgMS4xIDguMSAyLjlsNi40LTYuNEMzNC42IDQuMSAyOS42IDIgMjQgMiAxMS44IDIgMiAxMS44IDIgMjRzOS44IDIyIDIyIDIyYzExIDAgMjEtOCAyMS0yMiAwLTEuMy0uMi0yLjctLjUtNHoiLz48L2RlZnM+PGNsaXBQYXRoIGlkPSJiIj48dXNlIHhsaW5rOmhyZWY9IiNhIiBvdmVyZmxvdz0idmlzaWJsZSIvPjwvY2xpcFBhdGg+PHBhdGggY2xpcC1wYXRoPSJ1cmwoI2IpIiBmaWxsPSIjRkJCQzA1IiBkPSJNMCAzN1YxMWwxNyAxM3oiLz48cGF0aCBjbGlwLXBhdGg9InVybCgjYikiIGZpbGw9IiNFQTQzMzUiIGQ9Ik0wIDExbDE3IDEzIDctNi4xTDQ4IDE0VjBIMHoiLz48cGF0aCBjbGlwLXBhdGg9InVybCgjYikiIGZpbGw9IiMzNEE4NTMiIGQ9Ik0wIDM3bDMwLTIzIDcuOSAxTDQ4IDB2NDhIMHoiLz48cGF0aCBjbGlwLXBhdGg9InVybCgjYikiIGZpbGw9IiM0Mjg1RjQiIGQ9Ik00OCA0OEwxNyAyNGwtNC0zIDM1LTEweiIvPjwvc3ZnPg==" alt="拍照搜索" data-iml="1669015554578" data-atf="1" data-frt="0">
                  </div>
              </div>

          </div>
      </div>
    </div>
  `
}

// newTab 逻辑
const envMeta = document.getElementsByTagName('meta')['newtab-jstart-flag']
jStarttabStart = envMeta && envMeta.content && envMeta.content === 'true'
if (jStarttabStart) {
    console.log('content js : new tab start ~~')
    $(document).ready(function () {
        showMainView()
        // 向background.js请求书签信息
        const sendDic = { type: 'contentJsLoadInNewTab' }
        chrome.runtime.sendMessage(chrome.runtime.id, sendDic).then((response) => {
        });
        // 显示起始页动画
        // $("#jstart-curveWrap").css("opacity", "0.5");
        $("#jstart-curveWrap").fadeTo("fast", 0.5)
    });
    window.onload = function () {
        if (location.search !== "?x") { // 自动获得焦点
            // location.search = "?x";
            // throw new Error;  
        }
        focusOnSearch()
    }
}