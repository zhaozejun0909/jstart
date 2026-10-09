const vertexShader = `#version 300 es
const vec2 positions[3] = vec2[3](
    vec2(-1.0, -1.0),
    vec2(3.0, -1.0),
    vec2(-1.0, 3.0)
);

void main() {
    gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}
`

export function createShaderBackground(container, options) {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2', {
        alpha: Boolean(options.alpha),
        antialias: false,
        depth: false,
        premultipliedAlpha: false,
        powerPreference: 'low-power'
    })
    if (!gl) throw new Error('WebGL 2 is unavailable')

    const program = createProgram(gl, vertexShader, options.fragmentShader)
    const resolution = gl.getUniformLocation(program, 'uResolution')
    const time = gl.getUniformLocation(program, 'uTime')
    const pointer = options.pointerUniform && gl.getUniformLocation(program, options.pointerUniform)
    const frameInterval = 1000 / (options.fps || 30)
    const pointerTarget = [.5, .5]
    const pointerCurrent = [.5, .5]
    let paused = Boolean(options.paused)
    let frameId = 0
    let lastFrame = 0
    let lastTime = performance.now()
    let elapsed = 0

    canvas.setAttribute('aria-hidden', 'true')
    container.appendChild(canvas)
    gl.useProgram(program)
    setUniforms(gl, program, options.uniforms || {})

    function resize() {
        const width = Math.max(1, container.clientWidth)
        const height = Math.max(1, container.clientHeight)
        if (canvas.width === width && canvas.height === height) return
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
        draw()
    }

    function draw() {
        if (options.resolutionSize === 3) gl.uniform3f(resolution, canvas.width, canvas.height, canvas.width / canvas.height)
        else gl.uniform2f(resolution, canvas.width, canvas.height)
        gl.uniform1f(time, elapsed * (options.speed || 1))
        if (pointer) {
            pointerCurrent[0] += (pointerTarget[0] - pointerCurrent[0]) * .08
            pointerCurrent[1] += (pointerTarget[1] - pointerCurrent[1]) * .08
            gl.uniform2f(pointer, pointerCurrent[0], pointerCurrent[1])
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    function trackPointer(event) {
        const rect = container.getBoundingClientRect()
        pointerTarget[0] = (event.clientX - rect.left) / rect.width
        pointerTarget[1] = (event.clientY - rect.top) / rect.height
    }

    function loop(now) {
        frameId = requestAnimationFrame(loop)
        elapsed += Math.min((now - lastTime) / 1000, .1)
        lastTime = now
        if (now - lastFrame < frameInterval) return
        lastFrame = now
        draw()
    }

    function start() {
        if (paused || frameId) return
        lastTime = performance.now()
        frameId = requestAnimationFrame(loop)
    }

    function stop() {
        cancelAnimationFrame(frameId)
        frameId = 0
    }

    window.addEventListener('resize', resize)
    if (pointer) window.addEventListener('pointermove', trackPointer, { passive: true })
    resize()
    draw()
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
            if (pointer) window.removeEventListener('pointermove', trackPointer)
            gl.deleteProgram(program)
            // 立即归还 WebGL 上下文，不等垃圾回收。
            gl.getExtension('WEBGL_lose_context')?.loseContext()
            canvas.remove()
        }
    }
}

function setUniforms(gl, program, uniforms) {
    Object.entries(uniforms).forEach(([name, value]) => {
        const location = gl.getUniformLocation(program, name)
        if (typeof value === 'boolean') gl.uniform1i(location, value ? 1 : 0)
        else if (Array.isArray(value) && value.length === 2) gl.uniform2fv(location, value)
        else if (Array.isArray(value) && value.length === 3) gl.uniform3fv(location, value)
        else gl.uniform1f(location, value)
    })
}

function createProgram(gl, vertexSource, fragmentSource) {
    const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
    const program = gl.createProgram()
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const message = gl.getProgramInfoLog(program)
        gl.deleteProgram(program)
        throw new Error(message || 'Unable to link background shader')
    }
    return program
}

function compileShader(gl, type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader)
        gl.deleteShader(shader)
        throw new Error(message || 'Unable to compile background shader')
    }
    return shader
}
