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

    // Grid disabled — single-column layout

    const { initHero } = await import('/js/pretext-hero.mjs');
    initHero(P);
}

init();
