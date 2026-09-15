import { createShaderBackground } from './shader-background.js'

// Ported from React Bits Galaxy with mouse interaction disabled.
// See THIRD_PARTY_NOTICES.md.
const fragmentShader = `#version 300 es
precision highp float;
out vec4 outputColor;

uniform float uTime;
uniform vec2 uResolution;
uniform float uStarSpeed;
uniform float uHueShift;
uniform float uSpeed;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;

#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float triangle(float x) {
    return abs(fract(x) * 2.0 - 1.0);
}

float smoothTriangle(float x) {
    return 1.0 - smoothstep(0.0, 1.0, triangle(x));
}

vec3 hsv2rgb(vec3 c) {
    vec4 k = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
    return c.z * mix(k.xxx, clamp(p - k.xxx, 0.0, 1.0), c.y);
}

float star(vec2 uv, float flare) {
    float d = length(uv);
    float brightness = (0.05 * uGlowIntensity) / d;
    float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
    brightness += rays * flare * uGlowIntensity;
    uv *= MAT45;
    rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
    brightness += rays * 0.3 * flare * uGlowIntensity;
    return brightness * (1.0 - smoothstep(0.2, 1.0, d));
}

vec3 starLayer(vec2 uv) {
    vec3 color = vec3(0.0);
    vec2 grid = fract(uv) - 0.5;
    vec2 id = floor(uv);
    float starTime = uTime * uStarSpeed / 10.0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 cell = id + offset;
            float seed = hash21(cell);
            float size = fract(seed * 345.32);
            float gloss = triangle(starTime / (3.0 * seed + 1.0));
            float flare = smoothstep(0.9, 1.0, size) * gloss;

            float red = smoothstep(0.2, 1.0, hash21(cell + 1.0)) + 0.2;
            float blue = smoothstep(0.2, 1.0, hash21(cell + 3.0)) + 0.2;
            vec3 base = vec3(red, min(red, blue) * seed, blue);
            float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
            hue = fract(hue + uHueShift / 360.0);
            float saturation = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
            base = hsv2rgb(vec3(hue, saturation, max(max(base.r, base.g), base.b)));

            vec2 drift = vec2(smoothTriangle(seed * 34.0 + uTime * uSpeed / 10.0),
                              smoothTriangle(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;
            float brightness = star(grid - offset - drift, flare);
            float twinkle = smoothTriangle(uTime * uSpeed + seed * 6.2831) + 0.5;
            brightness *= mix(1.0, twinkle, uTwinkleIntensity);
            color += brightness * size * base;
        }
    }
    return color;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
    float angle = uTime * uRotationSpeed;
    uv = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * uv;
    vec3 color = vec3(0.0);
    for (int layer = 0; layer < 4; layer++) {
        float index = float(layer) / 4.0;
        float depth = fract(index + uTime * uStarSpeed / 10.0 * uSpeed);
        float scale = mix(20.0, 0.5, depth);
        float fade = depth * (1.0 - smoothstep(0.9, 1.0, depth));
        color += starLayer(uv * scale + index * 453.32) * fade;
    }
    outputColor = vec4(color, smoothstep(0.0, 0.3, length(color)));
}`

export function createGalaxy(container, options = {}) {
    return createShaderBackground(container, {
        fragmentShader,
        fps: options.fps,
        paused: options.paused,
        alpha: true,
        uniforms: {
            uStarSpeed: .5,
            uHueShift: 150,
            uSpeed: .6,
            uGlowIntensity: .4,
            uSaturation: 1,
            uTwinkleIntensity: .8,
            uRotationSpeed: .05
        }
    })
}
