import { backgroundNames, mountBackground } from './backgrounds/index.js'

const container = document.getElementById('jstart-background')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
let background = null
let backgroundName = 'light-rays'
let mode = 'dynamic'

chrome.storage.local.get(['jStartBackground', 'jStartBackgroundMode']).then(result => {
    backgroundName = normalizeBackground(result.jStartBackground)
    mode = result.jStartBackgroundMode === 'static' ? 'static' : 'dynamic'
    mountSelectedBackground()
})

chrome.storage.onChanged.addListener(changes => {
    if (changes.jStartBackground) {
        backgroundName = normalizeBackground(changes.jStartBackground.newValue)
        mountSelectedBackground()
    }
    if (changes.jStartBackgroundMode) {
        mode = changes.jStartBackgroundMode.newValue === 'static' ? 'static' : 'dynamic'
        updateAnimation()
    }
})

document.addEventListener('visibilitychange', updateAnimation)
reducedMotion.addEventListener('change', updateAnimation)
window.addEventListener('pagehide', () => background && background.destroy(), { once: true })

function shouldPause() {
    return mode === 'static' || reducedMotion.matches || document.hidden
}

function updateAnimation() {
    if (background) background.setPaused(shouldPause())
}

function mountSelectedBackground() {
    if (background) background.destroy()
    background = mountBackground(backgroundName, container, {
        fps: 30,
        paused: shouldPause()
    })
}

function normalizeBackground(value) {
    return backgroundNames.includes(value) ? value : 'light-rays'
}
