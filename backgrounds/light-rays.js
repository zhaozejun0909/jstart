import { createShaderBackground } from './shader-background.js'

// Ported from React Bits Light Rays. See THIRD_PARTY_NOTICES.md.
const fragmentShader = `#version 300 es
precision highp float;
out vec4 outputColor;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

float rayStrength(vec2 source, vec2 direction, vec2 point, float seedA, float seedB, float speed) {
    vec2 sourceToPoint = point - source;
    vec2 mouseDirection = normalize(uMouse * uResolution - source);
    vec2 finalDirection = normalize(mix(direction, mouseDirection, 0.1));
    float angle = dot(normalize(sourceToPoint), finalDirection);
    float spread = pow(max(angle, 0.0), 2.0);
    float distanceToSource = length(sourceToPoint);
    float lengthFade = clamp((uResolution.x * 3.0 - distanceToSource) / (uResolution.x * 3.0), 0.0, 1.0);
    float distanceFade = clamp((uResolution.x - distanceToSource) / uResolution.x, 0.5, 1.0);
    float strength = clamp(
        0.45 + 0.15 * sin(angle * seedA + uTime * speed) +
        0.3 + 0.2 * cos(-angle * seedB + uTime * speed),
        0.0, 1.0
    );
    return strength * lengthFade * distanceFade * spread;
}

void main() {
    vec2 point = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
    vec2 source = vec2(uResolution.x * 0.5, -uResolution.y * 0.2);
    vec2 direction = vec2(0.0, 1.0);
    float rays = rayStrength(source, direction, point, 36.2214, 21.11349, 1.5) * 0.5;
    rays += rayStrength(source, direction, point, 22.3991, 18.0234, 1.1) * 0.4;
    float brightness = 1.0 - point.y / uResolution.y;
    vec3 color = vec3(rays) * vec3(
        0.1 + brightness * 0.8,
        0.3 + brightness * 0.6,
        0.5 + brightness * 0.5
    );
    outputColor = vec4(color, rays);
}`

export function createLightRays(container, options = {}) {
    return createShaderBackground(container, {
        fragmentShader,
        fps: options.fps,
        paused: options.paused,
        alpha: true,
        pointerUniform: 'uMouse',
        uniforms: {
            uMouse: [.5, .5]
        }
    })
}
