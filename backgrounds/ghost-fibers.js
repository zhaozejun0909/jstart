// Ported from React Bits Ghost Fibers. See THIRD_PARTY_NOTICES.md.

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

const fragmentShader = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
out vec4 fragColor;

mat2 rotate2d(float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return mat2(cosine, -sine, sine, cosine);
}

float grainHash(vec2 point) {
    point = floor(point);
    float hash = 52.9829189 * fract(dot(point, vec2(0.065, 0.005)));
    return fract(hash);
}

float layeredGrain(vec2 fragmentPixel) {
    vec2 point = mod(fragmentPixel + vec2(uTime * 30.0, -uTime * 21.0), 1024.0);
    vec2 rotated = mat2(0.8, -0.5, 0.5, 0.8) * point;
    float grain = 0.0;
    grain += 0.40 * grainHash(rotated);
    grain += 0.25 * grainHash(rotated * 2.0 + 17.0);
    grain += 0.20 * grainHash(rotated * 4.0 + 47.0);
    grain += 0.10 * grainHash(rotated * 8.0 + 113.0);
    grain += 0.05 * grainHash(rotated * 16.0 + 191.0);
    return grain;
}

void main() {
    vec2 resolution = max(uResolution, vec2(1.0));
    vec2 uv = (2.0 * gl_FragCoord.xy - resolution) / resolution.y;
    float time = uTime * 0.2;
    vec3 lineColor = vec3(0.0784, 0.0549, 0.2078);
    vec3 glowColor = vec3(0.2039, 0.2157, 0.6275);
    vec3 backdrop = vec3(0.070588, 0.058824, 0.090196);
    vec3 centerTone = max(lineColor * 0.85567 - glowColor * 0.06186, vec3(0.0));
    vec3 cloudTone = lineColor * 0.19588 + glowColor * 0.2268;
    vec2 p = rotate2d(time * 0.25) * (uv / 2.0);
    vec3 color = vec3(0.0);

    for (int index = 0; index < 4; index++) {
        float fi = float(index) + 1.0;
        p += 0.015 * sin(p.yx * fi * 3.0 + time * (0.15 + fi * 0.08));

        float radius = length(p);
        float angle = atan(p.y, p.x);
        angle += sin(radius * 5.0 - time * 1.2 + fi) * 0.1;
        p = vec2(cos(angle), sin(angle)) * radius;

        float lines = abs(sin(p.x * (5.0 + fi * 2.0) + sin(p.y * 3.0 + time)));
        lines = pow(max(0.0, 1.0 - lines), 16.0);
        color += lineColor * lines / fi;

        float glow = exp(-10.0 * abs(sin(p.x * 3.0 + time + fi)));
        color += glowColor * glow * 1.6 / (fi * 2.0);
    }

    float center = exp(-2.2 * dot(uv, uv));
    color += centerTone * center;
    float cloud = exp(-1.5 * length(uv + vec2(sin(time * 0.3) * 0.25, cos(time * 0.25) * 0.18)));
    color += cloudTone * cloud;

    float vignette = 1.0 - smoothstep(0.35, 1.45, length(uv));
    color *= mix(0.2, 1.0, vignette);
    color = 1.0 - exp(-color * 2.0);
    color.b *= 1.25;

    float noise = (layeredGrain(gl_FragCoord.xy) - 0.5) * 0.05;
    fragColor = vec4(clamp(backdrop + color + noise, 0.0, 1.0), 1.0);
}
`

export function createGhostFibers(container, options = {}) {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        powerPreference: 'low-power'
    })
    if (!gl) throw new Error('WebGL 2 is unavailable')

    const program = createProgram(gl, vertexShader, fragmentShader)
    const resolutionLocation = gl.getUniformLocation(program, 'uResolution')
    const timeLocation = gl.getUniformLocation(program, 'uTime')
    const frameInterval = 1000 / (options.fps || 30)
    let paused = Boolean(options.paused)
    let frameId = 0
    let lastFrame = 0
    let lastTime = performance.now()
    let elapsed = 0

    canvas.setAttribute('aria-hidden', 'true')
    container.appendChild(canvas)
    gl.useProgram(program)

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
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
        gl.uniform1f(timeLocation, elapsed)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    function loop(now) {
        frameId = requestAnimationFrame(loop)
        elapsed += Math.min((now - lastTime) / 1000, 0.1)
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
            gl.deleteProgram(program)
            canvas.remove()
        }
    }
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
