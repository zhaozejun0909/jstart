// Ported from React Bits Letter Glitch. See THIRD_PARTY_NOTICES.md.

const characters = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789')
const colors = ['#131e19', '#0a5532', '#39687f']
const charWidth = 10
const charHeight = 20

export function createLetterGlitch(container, options = {}) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D is unavailable')

    const vignette = document.createElement('div')
    vignette.className = 'jstart-letter-glitch-vignette'
    const frameInterval = options.glitchSpeed || 60
    let letters = []
    let columns = 0
    let paused = Boolean(options.paused)
    let frameId = 0
    let lastFrame = 0

    canvas.className = 'jstart-letter-glitch-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    container.append(canvas, vignette)

    function resize() {
        const width = Math.max(1, container.clientWidth)
        const height = Math.max(1, container.clientHeight)
        canvas.width = width
        canvas.height = height
        columns = Math.ceil(width / charWidth)
        const rows = Math.ceil(height / charHeight)
        letters = Array.from({ length: columns * rows }, randomLetter)
        context.font = '16px monospace'
        context.textBaseline = 'top'
        letters.forEach(drawLetter)
    }

    function randomLetter() {
        return {
            char: characters[Math.floor(Math.random() * characters.length)],
            color: colors[Math.floor(Math.random() * colors.length)]
        }
    }

    function update() {
        const count = Math.max(1, Math.floor(letters.length * .05))
        const changed = new Set()
        for (let index = 0; index < count; index++) {
            const position = Math.floor(Math.random() * letters.length)
            letters[position] = randomLetter()
            changed.add(position)
        }
        changed.forEach(index => drawLetter(letters[index], index))
    }

    function drawLetter(letter, index) {
        const x = (index % columns) * charWidth
        const y = Math.floor(index / columns) * charHeight
        context.clearRect(x, y, charWidth, charHeight)
        context.fillStyle = letter.color
        context.fillText(letter.char, x, y)
    }

    function loop(now) {
        frameId = requestAnimationFrame(loop)
        if (now - lastFrame < frameInterval) return
        lastFrame = now
        update()
    }

    function start() {
        if (paused || frameId) return
        frameId = requestAnimationFrame(loop)
    }

    function stop() {
        cancelAnimationFrame(frameId)
        frameId = 0
    }

    window.addEventListener('resize', resize)
    resize()
    start()

    return {
        setPaused(value) {
            paused = Boolean(value)
            if (paused) stop()
            else start()
        },
        destroy() {
            stop()
            window.removeEventListener('resize', resize)
            canvas.remove()
            vignette.remove()
        }
    }
}
