import { createFloatingLines } from './floating-lines.js'
import { createGalaxy } from './galaxy.js'
import { createGhostFibers } from './ghost-fibers.js'
import { createLetterGlitch } from './letter-glitch.js'
import { createLightPillar } from './light-pillar.js'
import { createLightRays } from './light-rays.js'
import { createSoftAurora } from './soft-aurora.js'

const backgrounds = {
    'ghost-fibers': createGhostFibers,
    'letter-glitch': createLetterGlitch,
    'soft-aurora': createSoftAurora,
    'floating-lines': createFloatingLines,
    'light-pillar': createLightPillar,
    'light-rays': createLightRays,
    'galaxy': createGalaxy
}

export const backgroundNames = Object.keys(backgrounds)

export function mountBackground(name, container, options = {}) {
    const createBackground = backgrounds[name]
    if (!createBackground || !container) return emptyController()

    try {
        return createBackground(container, options)
    } catch (error) {
        console.warn(`JStart background failed: ${name}`, error)
        return emptyController()
    }
}

function emptyController() {
    return {
        setPaused() {},
        destroy() {}
    }
}
