/**
 * Pretext Yijing Enhancement
 * Adds Unicode yao symbols below SVG hexagrams with brightness wave animation.
 * Uses MutationObserver to enhance results after meihua-ui.mjs renders them.
 */
import { loadPretext } from './pretext-loader.mjs';

const YAO_YIN = '⚋';
const YAO_YANG = '⚊';
const FONT = '24px "Noto Sans", "Noto Sans SC", sans-serif';

function parseYaoFromSVG(svg) {
    var rects = svg.querySelectorAll('rect.mh-yao');
    var lines = [];
    for (var i = 0; i < rects.length; i++) {
        var r = rects[i];
        // Yang = single full-width rect, Yin = two half-width rects at same y
        // Group by y coordinate
        var y = r.getAttribute('y');
        var existing = null;
        for (var j = 0; j < lines.length; j++) {
            if (lines[j].y === y) { existing = lines[j]; break; }
        }
        if (existing) {
            existing.count++;
        } else {
            lines.push({ y: y, count: 1, isMoving: r.classList.contains('mh-yao--moving') });
        }
    }
    // Yang has 1 rect per line, Yin has 2
    return lines.map(function(l) {
        return { isYang: l.count === 1, isMoving: l.isMoving };
    });
}

function enhanceCard(card) {
    var svgs = card.querySelectorAll('.mh-hexagram-svg');
    for (var i = 0; i < svgs.length; i++) {
        var svg = svgs[i];
        if (svg.dataset.enhanced) continue;
        svg.dataset.enhanced = 'true';

        var yaoData = parseYaoFromSVG(svg);
        if (!yaoData.length) continue;

        var div = document.createElement('div');
        div.className = 'mh-unicode-hexagram';

        // Render bottom to top (yao data is top-to-bottom in SVG)
        for (var j = yaoData.length - 1; j >= 0; j--) {
            var yao = yaoData[j];
            var span = document.createElement('span');
            span.className = 'mh-unicode-yao' + (yao.isMoving ? ' mh-unicode-yao--moving' : '');
            span.textContent = yao.isYang ? YAO_YANG : YAO_YIN;
            span.style.animationDelay = ((yaoData.length - 1 - j) * 0.3) + 's';
            div.appendChild(span);
        }

        svg.parentNode.insertBefore(div, svg.nextSibling);
    }
}

async function init() {
    var resultArea = document.getElementById('mh-result');
    if (!resultArea) return;

    // Enhance already-rendered content
    var cards = document.querySelectorAll('.mh-card');
    for (var i = 0; i < cards.length; i++) {
        enhanceCard(cards[i]);
    }

    // Watch for new results
    var observer = new MutationObserver(function() {
        var newCards = document.querySelectorAll('.mh-card');
        for (var i = 0; i < newCards.length; i++) {
            enhanceCard(newCards[i]);
        }
    });

    observer.observe(resultArea, { childList: true, subtree: true });
}

init();
