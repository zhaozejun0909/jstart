/* eslint-disable */
console.log('hello world background todo something~')

// 快捷键
chrome.commands.onCommand.addListener((command) => {
    console.log(`Command: ${command}`);
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
            console.log('send', result)
            // sendResponse(JSON.stringify(result))
        })
    }
    return true
})

// 请求接口
function requestSearch(text, type='baidu', callback) {
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
        })
    } else if (type === 'google') {
        fetch(`http://suggestqueries.google.com/complete/search?output=toolbar&hl=zh&q=${text}`).then(response => {
            return response.text()
        }).then(str => callback(str))
    }
}

function sendMessageToContentJS(resultText) {
    let queryOptions = { active: true };
    chrome.tabs.query(queryOptions).then(tabs => {
        let activeTab = tabs && tabs.length>0 && tabs[tabs.length-1]
        chrome.tabs.sendMessage(activeTab.id, resultText).then((response) => {
            // console.log("Received response: ", response);
        });
    })
}

function toShowJstartPage() {
    sendMessageToContentJS('showStartPage')
}

function toOpenResultInNewTab() {
    sendMessageToContentJS('openResultInNewTab')
}