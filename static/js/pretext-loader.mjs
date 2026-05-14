/**
 * Universal Pretext Loader
 * Shared CDN loading with caching — imported by all page-specific modules.
 */
const PRETEXT_CDN = 'https://cdn.jsdelivr.net/npm/@chenglou/pretext@0.0.7/dist/layout.js';
let _P = null;

export async function loadPretext() {
    if (_P) return _P;
    if (!window.Intl?.Segmenter) return null;
    try {
        _P = await import(PRETEXT_CDN);
        await document.fonts.ready;
        return _P;
    } catch {
        return null;
    }
}
