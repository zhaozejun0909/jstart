import { createShaderBackground } from './shader-background.js'

// Ported from React Bits Floating Lines. See THIRD_PARTY_NOTICES.md.
// All three waves enabled; mouse interaction disabled.
const fragmentShader = `#version 300 es
precision highp float;
out vec4 outputColor;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uGradientStart;
uniform vec3 uGradientMid;
uniform vec3 uGradientEnd;

mat2 rotate(float angle) {
    return mat2(cos(angle), sin(angle), -sin(angle), cos(angle));
}

vec3 lineColor(float t) {
    return (t < 0.5
        ? mix(uGradientStart, uGradientMid, t * 2.0)
        : mix(uGradientMid, uGradientEnd, t * 2.0 - 1.0)) * 0.5;
}

float wave(vec2 uv, float offset) {
    float amplitude = sin(offset + uTime * 0.2) * 0.3;
    float y = sin(uv.x + offset + uTime * 0.1) * amplitude;
    return 0.0175 / max(abs(uv.y - y) + 0.01, 1e-3) + 0.01;
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - uResolution) / uResolution.y;
    uv.y *= -1.0;
    float curve = log(length(uv) + 1.0);
    vec2 bottom = uv * rotate(-curve);
    vec2 middle = uv * rotate(0.2 * curve);
    vec2 top = uv * rotate(-0.4 * curve);
    top.x *= -1.0;
    vec3 color = vec3(0.0);

    // Match the demo defaults: eight lines per wave, spacing 8 * 0.01.
    for (int i = 0; i < 8; i++) {
        float index = float(i);
        vec3 tint = lineColor(index / 7.0);
        color += tint * wave(bottom + vec2(0.08 * index + 2.0, -0.7), 1.5 + 0.2 * index) * 0.2;
        color += tint * wave(middle + vec2(0.08 * index + 5.0, 0.0), 2.0 + 0.15 * index);
        color += tint * wave(top + vec2(0.08 * index + 10.0, 0.5), 1.0 + 0.2 * index) * 0.1;
    }
    outputColor = vec4(color, 1.0);
}`

export function createFloatingLines(container, options = {}) {
    return createShaderBackground(container, {
        fragmentShader,
        fps: options.fps,
        paused: options.paused,
        uniforms: {
            uGradientStart: [8 / 255, 38 / 255, 237 / 255],
            uGradientMid: [156 / 255, 52 / 255, 52 / 255],
            uGradientEnd: [106 / 255, 106 / 255, 106 / 255]
        }
    })
}
