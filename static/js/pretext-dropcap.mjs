/**
 * Pretext Drop Cap — Precise proportional-font first letter measurement.
 * Enhances CSS float-based drop cap with pretext-measured widths.
 */
import { loadPretext } from './pretext-loader.mjs';

const BODY_FONT = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif';
const DROP_FONT_DESKTOP = '56px "Georgia", "Times New Roman", serif';
const DROP_FONT_MOBILE = '40px "Georgia", "Times New Roman", serif';
const BODY_LINE_HEIGHT = 25.6;

async function init() {
    const postContent = document.querySelector('.post-content');
    if (!postContent) return;

    const firstP = postContent.querySelector('p');
    if (!firstP || !firstP.textContent.trim()) return;

    const text = firstP.textContent;
    const firstChar = text[0];

    // Skip CJK characters — drop cap looks odd for Chinese
    if (/[一-鿿㐀-䶿]/.test(firstChar)) return;

    const rest = text.slice(1);
    const isMobile = window.innerWidth <= 768;
    const dropFont = isMobile ? DROP_FONT_MOBILE : DROP_FONT_DESKTOP;
    const dropSize = isMobile ? 40 : 56;

    let marginRight = 8;

    const P = await loadPretext();
    if (P) {
        try {
            var prepared = P.prepare(firstChar, dropFont);
            var result = P.layout(prepared, 10000, dropSize * 1.1);
            if (result && result.width) {
                marginRight = Math.max(4, 12 - (result.width - dropSize * 0.6));
            }
        } catch (_) {}
    }

    var dropSpan = document.createElement('span');
    dropSpan.className = 'drop-cap-letter';
    dropSpan.textContent = firstChar;
    dropSpan.style.marginRight = marginRight + 'px';

    var restNode = document.createTextNode(rest);

    firstP.innerHTML = '';
    firstP.classList.add('has-drop-cap');
    firstP.appendChild(dropSpan);
    firstP.appendChild(restNode);
}

init();
