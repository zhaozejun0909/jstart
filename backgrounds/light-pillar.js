import { createShaderBackground } from './shader-background.js'

// Ported from React Bits Light Pillar. See THIRD_PARTY_NOTICES.md.
const fragmentShader = `#version 300 es
precision highp float;
out vec4 outputColor;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uTopColor;
uniform vec3 uBottomColor;
uniform float uGlowAmount;
uniform float uPillarWidth;
uniform float uPillarHeight;
uniform float uNoiseIntensity;
uniform vec2 uPillarRotation;

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - uResolution) / uResolution.y;
    uv = vec2(uPillarRotation.x * uv.x - uPillarRotation.y * uv.y,
              uPillarRotation.y * uv.x + uPillarRotation.x * uv.y);
    vec3 origin = vec3(0.0, 0.0, -10.0);
    vec3 direction = normalize(vec3(uv, 1.0));
    float rotCos = cos(uTime * 0.3);
    float rotSin = sin(uTime * 0.3);
    vec3 color = vec3(0.0);
    float distanceAlongRay = 0.1;

    // Preserve the original high-quality ray march and wave detail.
    for (int i = 0; i < 80; i++) {
        vec3 p = origin + direction * distanceAlongRay;
        p.xz = vec2(rotCos * p.x - rotSin * p.z, rotSin * p.x + rotCos * p.z);
        vec3 q = p;
        q.y = p.y * uPillarHeight + uTime;
        float frequency = 1.0;
        float amplitude = 1.0;
        for (int j = 0; j < 4; j++) {
            q.xz = vec2(cos(0.4) * q.x - sin(0.4) * q.z, sin(0.4) * q.x + cos(0.4) * q.z);
            q += cos(q.zxy * frequency - uTime * float(j) * 2.0) * amplitude;
            frequency *= 2.0;
            amplitude *= 0.5;
        }
        float d = length(cos(q.xz)) - 0.2;
        float bound = length(p.xz) - uPillarWidth;
        float h = max(4.0 - abs(d - bound), 0.0);
        d = max(d, bound) + h * h * 0.0625 / 4.0;
        d = abs(d) * 0.15 + 0.01;
        float gradient = clamp((15.0 - p.y) / 30.0, 0.0, 1.0);
        color += mix(uBottomColor, uTopColor, gradient) / d;
        distanceAlongRay += d;
        if (distanceAlongRay > 50.0) break;
    }
    color = tanh(color * uGlowAmount / (uPillarWidth / 3.0));
    color -= fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) / 15.0 * uNoiseIntensity;
    outputColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`

// Match the linear colors supplied by THREE.Color in the original component.
function linearColor(rgb) {
    return rgb.map(channel => {
        const value = channel / 255
        return value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4)
    })
}

export function createLightPillar(container, options = {}) {
    const rotation = 45 * Math.PI / 180
    return createShaderBackground(container, {
        fragmentShader,
        fps: options.fps,
        paused: options.paused,
        speed: .5,
        uniforms: {
            uTopColor: linearColor([82, 39, 255]),
            uBottomColor: linearColor([255, 159, 252]),
            uGlowAmount: .003,
            uPillarWidth: 3,
            uPillarHeight: .6,
            uNoiseIntensity: .3,
            uPillarRotation: [Math.cos(rotation), Math.sin(rotation)]
        }
    })
}
