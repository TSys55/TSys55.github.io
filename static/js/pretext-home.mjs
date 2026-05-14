/**
 * Pretext Home Orchestrator
 * Loads Pretext from CDN, initializes all homepage features.
 */
const PRETEXT_CDN = 'https://cdn.jsdelivr.net/npm/@chenglou/pretext@0.0.7/dist/layout.js';

async function init() {
    if (!window.Intl?.Segmenter) return;

    let P;
    try {
        P = await import(PRETEXT_CDN);
    } catch {
        return;
    }

    await document.fonts.ready;

    const { initTruncation } = await import('/js/pretext-truncate.mjs');
    initTruncation(P);

    // Initialize ambient background first
    const { initAmbient } = await import('/js/pretext-ambient.mjs');
    const ambient = initAmbient();
    if (!ambient) return;

    // Initialize hero with ambient reference
    const { initHero } = await import('/js/pretext-hero.mjs');
    initHero(P, ambient);
}

init();
