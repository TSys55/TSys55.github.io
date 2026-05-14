/**
 * Pretext Home Orchestrator
 * Loads Pretext via shared loader, initializes all homepage features.
 */
import { loadPretext } from './pretext-loader.mjs';

async function init() {
    const P = await loadPretext();
    if (!P) return;

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
