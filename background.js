/* eslint-disable */
console.log('hello world background todo something~')

let jstartCurrentSeachKeyword = ''
let jstartSavedBookmarks = []

// 快捷键
chrome.commands.onCommand.addListener((command) => {
    // console.log(`Command: ${command}`);
    // 发送消息通知content.js 显示首页
    if (command === 'command-home') {
        toShowJstartPage()
    } else if (command === 'command-openinnewtab') {
        toOpenResultInNewTab()
    }
});

// 点击插件icon
chrome.action.onClicked.addListener((command) => {
    // console.log(`Command: ${command}`);《
    // 发送消息通知content.js 显示首页
    toShowJstartPage()
    return true
});

// 接收消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log('background.js onMessage : ', request, sender, sendResponse)
    if (request && request['searchWord']) {
        requestSearch(request['searchWord'], request['type'], (result) => {
            // sendResponse 貌似只支持同步回调，我试了异步是无法回调回去的
            // sendResponse(JSON.stringify(result))
        })
    } else if (request && request['type'] === 'getBookmarks') {
        sendBookmarksToContentJS()
    }
    return true
})

// 请求接口
function requestSearch(text, type = 'baidu', callback) {
    if (!text) return
    jstartCurrentSeachKeyword = text
    if (type === 'baidu') {
        fetch(`https://www.baidu.com/sugrec?pre=1&p=3&json=1&prod=pc&from=pc_web&wd=${text}&csor=2&pwd=a`, {
            "headers": {
                "accept": "application/json",
                "content-type": "application/json;charset=UTF-8",
            },
            "method": "GET"
        }).then((response) => {
            if (response.ok) {
                return response.json()
            }
        }).then(data => {
            callback(data)
            sendMessageToContentJS({ type: 'baidu', data: data })
        })
    } else if (type === 'google') {
        fetch(`http://suggestqueries.google.com/complete/search?output=toolbar&hl=zh&q=${text}`).then(response => {
            return response.text()
        }).then(str => {
            callback(str)
            sendMessageToContentJS({ type: 'google', data: str })
        })
    }
}

function sendMessageToContentJS(message) {
    let queryOptions = { active: true };
    chrome.tabs.query(queryOptions).then(tabs => {
        let activeTab = tabs && tabs.length > 0 && tabs[tabs.length - 1]
        chrome.tabs.sendMessage(activeTab.id, message).then((response) => {
            // console.log("Received response: ", response);
        });
    })
}

function toShowJstartPage() {
    sendMessageToContentJS({ type: 'jstart', data: 'showStartPage' })
    // 获取书签信息
    sendBookmarksToContentJS()
}

// 获取书签并发送给content.js
function sendBookmarksToContentJS() {
    if (jstartSavedBookmarks && jstartSavedBookmarks.length > 0) {
        sendMessageToContentJS({ type: 'bookmarks', data: jstartSavedBookmarks })
    } else {
        chrome.bookmarks.getTree(
            tree => {
                // 扁平化
                let books = []
                flatFromList(tree, books)
                jstartSavedBookmarks = books
                // console.log("🚀 ~ file: background.js:85 ~ toShowJstartPage ~ books", books)
                sendMessageToContentJS({ type: 'bookmarks', data: books })
            }
        )
    }
}

// 递归提取所有的标签
function flatFromList(list, flatList) {
    list.forEach(item => {
        if (item.children && item.children.length > 0) { // 目录类型
            flatFromList(item.children, flatList)
        } else { // 书签类型
            flatList.push(item)
        }
    }) 
}

function toOpenResultInNewTab() {
    sendMessageToContentJS({ type: 'jstart', data: 'openResultInNewTab' })
}