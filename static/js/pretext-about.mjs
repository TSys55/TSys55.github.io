/**
 * Pretext About Page — ASCII Art Signature
 * Renders "TSys55" as interactive ASCII art with mouse-following brightness field.
 */
import { loadPretext } from './pretext-loader.mjs';

const DENSITY = [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'];
const FONT = '10px "Courier New", Courier, monospace';

// 12-row bitmap for "TSys55"
const BITMAP = [
    '000111100001111111100001111001100110011111100011110',
    '000110000011000000110001100110110110110000001101100',
    '000110000011000000110001100110110110110000001101100',
    '000110000011000000110001100110011000110000001100110',
    '000111111011000000110001100000110000111111001100110',
    '000110000011000000110001100000110000110000001100110',
    '000110000011000000110001100000110000110000001100110',
    '000110000011000000110001100000110000110000001100110',
    '000110000011000000110001100000110000110000001100110',
    '000110000011111111100001100000110001111100011100110',
    '000000000000000000000000000000000000000000000000000',
    '000000000000000000000000000000000000000000000000000',
];
const ROWS = BITMAP.length;
const COLS = BITMAP[0].length;

async function init() {
    const P = await loadPretext();
    const container = document.getElementById('about-signature');
    if (!container) return;

    const canvas = document.createElement('pre');
    canvas.className = 'signature-canvas';

    var cells = [];
    var html = '';
    for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
            var filled = BITMAP[r][c] === '1';
            var baseIdx = filled ? DENSITY.length - 1 : 0;
            html += '<span class="sig-cell" data-r="' + r + '" data-c="' + c + '" data-f="' + (filled ? 1 : 0) + '" data-base="' + baseIdx + '">' + DENSITY[baseIdx] + '</span>';
            cells.push({ r: r, c: c, filled: filled, span: null });
        }
        html += '\n';
    }
    canvas.innerHTML = html;

    var spanEls = canvas.querySelectorAll('.sig-cell');
    for (var i = 0; i < cells.length; i++) {
        cells[i].span = spanEls[i];
    }

    container.appendChild(canvas);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var mouseX = -1;
    var mouseY = -1;
    var active = false;
    var t = 0;

    canvas.addEventListener('mousemove', function(e) {
        var rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        active = true;
    });

    canvas.addEventListener('mouseleave', function() {
        active = false;
    });

    var charWidth = 6;
    var charHeight = 12;

    if (P) {
        try {
            var prepared = P.prepare('@', FONT);
            var result = P.layout(prepared, 10000, 12);
            if (result && result.width) charWidth = result.width;
        } catch (_) {}
    }

    function animate() {
        t += 0.03;

        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];
            if (!cell.filled) continue;

            var cx = cell.c * charWidth;
            var cy = cell.r * charHeight;
            var idx = DENSITY.length - 1;

            if (active) {
                var dx = cx - mouseX;
                var dy = cy - mouseY;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var radius = 80;
                if (dist < radius) {
                    var proximity = 1 - (dist / radius);
                    var wave = Math.sin(t * 3 + cell.r * 0.5 + cell.c * 0.2);
                    var baseIdx = Math.round(4 + proximity * 3 + wave * 1.5);
                    idx = Math.max(1, Math.min(DENSITY.length - 1, baseIdx));
                } else {
                    var ambient = Math.sin(t * 0.8 + cell.r * 0.3 + cell.c * 0.1);
                    idx = Math.round(5 + ambient * 1.5);
                    idx = Math.max(3, Math.min(DENSITY.length - 1, idx));
                }
            } else {
                var ambient = Math.sin(t * 0.5 + cell.r * 0.3 + cell.c * 0.15);
                idx = Math.round(5 + ambient);
                idx = Math.max(3, Math.min(DENSITY.length - 1, idx));
            }

            cell.span.textContent = DENSITY[idx];
        }

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}

init();
