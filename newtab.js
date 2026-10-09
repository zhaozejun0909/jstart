import { backgroundNames, mountBackground } from './backgrounds/index.js'

const container = document.getElementById('jstart-background')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
// 在后台停留超过这个时间就释放背景，避免残留的新标签页一直占着 WebGL 上下文。
const RELEASE_DELAY = 60 * 1000
let background = null
let backgroundName = 'light-rays'
let mode = 'dynamic'
let releaseTimer = 0
let released = false

chrome.storage.local.get(['jStartBackground', 'jStartBackgroundMode']).then(result => {
    backgroundName = normalizeBackground(result.jStartBackground)
    mode = result.jStartBackgroundMode === 'static' ? 'static' : 'dynamic'
    mountSelectedBackground()
    // 页面加载时可能已在后台，此时不会触发 visibilitychange，需要主动检查一次。
    handleVisibilityChange()
})

chrome.storage.onChanged.addListener(changes => {
    if (changes.jStartBackground) {
        backgroundName = normalizeBackground(changes.jStartBackground.newValue)
        // 已释放的页面等切回来时再按新设置挂载。
        if (!released) mountSelectedBackground()
    }
    if (changes.jStartBackgroundMode) {
        mode = changes.jStartBackgroundMode.newValue === 'static' ? 'static' : 'dynamic'
        updateAnimation()
    }
})

document.addEventListener('visibilitychange', handleVisibilityChange)
reducedMotion.addEventListener('change', updateAnimation)
window.addEventListener('pagehide', () => background && background.destroy(), { once: true })

function shouldPause() {
    return mode === 'static' || reducedMotion.matches || document.hidden
}

function updateAnimation() {
    if (background) background.setPaused(shouldPause())
}

function handleVisibilityChange() {
    clearTimeout(releaseTimer)
    if (document.hidden) releaseTimer = setTimeout(releaseBackground, RELEASE_DELAY)
    else if (released) mountSelectedBackground()
    updateAnimation()
}

function releaseBackground() {
    if (background) background.destroy()
    background = null
    released = true
}

function mountSelectedBackground() {
    if (background) background.destroy()
    released = false
    background = mountBackground(backgroundName, container, {
        fps: 30,
        paused: shouldPause()
    })
}

function normalizeBackground(value) {
    return backgroundNames.includes(value) ? value : 'light-rays'
}
