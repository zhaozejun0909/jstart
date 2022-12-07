/* eslint-disable */
// console.log('hello world content todo something~')

let jStrartActived = false // 激活状态：页面是否显示 
let jStartSearchType = 'google'; // baidu google
let tabStart = false

// 监听按钮点击 或者快捷键
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // console.log("content.js Received request: ", message, sender);
    if (message === 'showStartPage') {
      showMainView(message);
    } else if (message === 'openResultInNewTab') {
      if (jStrartActived) {
        handleResult('goResultNewTab', getInputValue())
      }
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
    if (tabStart) {
        $("#jstart-content-view").prop("style").display = 'block'
    } else {
        $("#jstart-content-view").fadeIn(300, function(){
        }); 
    }

    // 自动获取焦点
    focusOnSearch()
    // 搜索事件 
    let inputE = $("#j-input-view-input")
    inputE.keydown(function(e){
      // console.log(e.keyCode + ' 按键被按下')
      if (e && e.keyCode === 13) { // enter键
        handleResult('goResult', getInputValue())
      } else if (e.keyCode === 27) { // ESC键
        removeHTML()
      } else if (e.keyCode === 9) { // tab键
        changeSearchType()
        e.preventDefault();
      }
    })

    // 切换搜索平台
    chrome.storage.local.get(['jStartSearchType'], function(result) { // 默认 读取上次使用
      if (result && result['jStartSearchType']) {
        jStartSearchType = result['jStartSearchType']
        refreshLogo()
      }
    });
    $(".j-logo-view-div-img").click(changeSearchType)

    document.getElementById("j-input-view-input").oninput = debounce(onInputChange, 400)
}

// 触发搜索点击事件
function handleResult(type, value) {
  if (type === 'goResultNewTab' || type === 'goResult') {
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
    if (type === 'goResult') {
      location.assign(goUrl)
    } else {
      window.open(goUrl, '_blank')
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

// 切换搜索平台
function changeSearchType(event){
  // console.log('dianjile logo ')
  jStartSearchType = (jStartSearchType === 'google') ? 'baidu' : 'google'
  chrome.storage.local.set({"jStartSearchType": jStartSearchType}, function() {});
  refreshLogo()
  focusOnSearch()
    // event.stopPropagation()
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
        return
    } 
    const sendDic = {type: jStartSearchType, searchWord: text}
    chrome.runtime.sendMessage(chrome.runtime.id, sendDic).then((response) => {
        // console.log('content.js sendMessage back:', response)
        if (typeof response === 'string') {
            const gogleData = window.DOMParser().parseFromString(response, "text/xml")
            // console.log(googleLogo)
        } else {

        }
    });
}

function debounce (callback, delay = 800) {
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
      <div class="j-search-view">
          <div class="j-search-content">

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
tabStart = envMeta && envMeta.content && envMeta.content === 'true'
if (tabStart) {
    console.log('content js ： new tab start ~~')
    $(document).ready(function(){
        showMainView()    
    });
    window.onload = function() {
        if (location.search !== "?x") { // 自动获得焦点
            // location.search = "?x";
            // throw new Error;  
        }
        focusOnSearch()
    }
}