/**
 * Pretext Editorial Engine Hero
 * Text reflow around ambient orbs, headline sizing, body layout.
 */
const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif';
const BODY_FONT = '16px ' + FONT_FAMILY;
const BODY_LINE_HEIGHT = 25.6;
const HEADLINE_FONT_FAMILY = FONT_FAMILY;
const PAD = 24;
const MOBILE_PAD = 16;
const MIN_SLOT_WIDTH = 40;
const MOBILE_BREAKPOINT = 768;

// --- Geometry helpers ---

function circleIntervalForBand(cx, cy, r, bandTop, bandBottom, hPad, vPad) {
    const top = bandTop - vPad;
    const bottom = bandBottom + vPad;
    if (top >= cy + r || bottom <= cy - r) return null;
    const minDy = cy >= top && cy <= bottom ? 0 : cy < top ? top - cy : cy - bottom;
    if (minDy >= r) return null;
    const maxDx = Math.sqrt(r * r - minDy * minDy);
    return { left: cx - maxDx - hPad, right: cx + maxDx + hPad };
}

function carveTextLineSlots(base, blocked) {
    let slots = [base];
    for (let i = 0; i < blocked.length; i++) {
        const interval = blocked[i];
        const next = [];
        for (let j = 0; j < slots.length; j++) {
            const slot = slots[j];
            if (interval.right <= slot.left || interval.left >= slot.right) {
                next.push(slot);
                continue;
            }
            if (interval.left > slot.left) next.push({ left: slot.left, right: interval.left });
            if (interval.right < slot.right) next.push({ left: interval.right, right: slot.right });
        }
        slots = next;
    }
    return slots.filter(slot => slot.right - slot.left >= MIN_SLOT_WIDTH);
}

// --- Main module ---

export function initHero(P, ambient) {
    const { prepareWithSegments, layoutNextLine, walkLineRanges, layoutWithLines } = P;

    const hero = document.querySelector('.first-entry.home-info');
    if (!hero) return;

    // Read original content
    const titleEl = hero.querySelector('.entry-header h1');
    const headlineText = titleEl?.textContent?.trim() || 'Welcome';

    // Build body text from post summaries on the page
    const postEntries = document.querySelectorAll('.post-entry .entry-content');
    let bodyText = '';
    postEntries.forEach((el, i) => {
        if (i >= 5) return;
        const t = el.textContent?.trim();
        if (t) bodyText += (bodyText ? ' ' : '') + t;
    });
    if (!bodyText) bodyText = '记录技术、生活与思考。Code, Think, Write.';

    // Create stage
    const stage = document.createElement('div');
    stage.className = 'editorial-stage';
    hero.insertBefore(stage, hero.firstChild);
    hero.classList.add('pretext-hero');

    // Move footer as overlay
    const footerEl = hero.querySelector('.entry-footer');
    if (footerEl) {
        const overlay = document.createElement('div');
        overlay.className = 'hero-social-overlay';
        overlay.appendChild(footerEl);
        hero.appendChild(overlay);
    }

    // --- State ---
    const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;

    // --- DOM pools ---
    const headlinePool = [];
    const linePool = [];

    function syncPool(pool, count, create) {
        while (pool.length < count) {
            const el = create();
            stage.appendChild(el);
            pool.push(el);
        }
        for (let i = 0; i < pool.length; i++) {
            pool[i].style.display = i < count ? '' : 'none';
        }
    }

    // --- Prepare text ---
    let preparedBody = prepareWithSegments(bodyText, BODY_FONT);

    // --- Headline sizing (binary search) ---
    let cachedHlWidth = -1;
    let cachedHlHeight = -1;
    let cachedHlResult = null;

    function fitHeadline(maxWidth, maxHeight, maxSize) {
        if (maxWidth === cachedHlWidth && maxHeight === cachedHlHeight) return cachedHlResult;
        cachedHlWidth = maxWidth;
        cachedHlHeight = maxHeight;

        let lo = 20, hi = maxSize, best = lo, bestLines = [];
        while (lo <= hi) {
            const size = Math.floor((lo + hi) / 2);
            const font = '700 ' + size + 'px ' + HEADLINE_FONT_FAMILY;
            const lineHeight = Math.round(size * 0.95);
            const prepared = prepareWithSegments(headlineText, font);
            let lineCount = 0;
            walkLineRanges(prepared, maxWidth, () => { lineCount++; });
            const totalHeight = lineCount * lineHeight;
            if (totalHeight <= maxHeight && lineCount <= 3) {
                best = size;
                const segResult = layoutWithLines(prepared, maxWidth, lineHeight);
                bestLines = segResult.lines.map((l, i) => ({
                    x: 0, y: i * lineHeight, text: l.text, width: l.width,
                }));
                lo = size + 1;
            } else {
                hi = size - 1;
            }
        }
        cachedHlResult = { fontSize: best, lineHeight: Math.round(best * 0.95), lines: bestLines };
        return cachedHlResult;
    }

    // --- Text layout around obstacles ---
    function layoutTextAroundObstacles(prepared, startCursor, regionX, regionY, regionW, regionH, lineHeight, circleObs, pad) {
        let cursor = startCursor;
        let lineTop = regionY;
        const lines = [];
        let exhausted = false;
        const mobile = isMobile();

        while (lineTop + lineHeight <= regionY + regionH && !exhausted) {
            const bandTop = lineTop;
            const bandBottom = lineTop + lineHeight;
            const blocked = [];

            for (let i = 0; i < circleObs.length; i++) {
                const ob = circleObs[i];
                const interval = circleIntervalForBand(ob.cx, ob.cy, ob.r, bandTop, bandBottom, ob.hPad, ob.vPad);
                if (interval) blocked.push(interval);
            }

            const slots = carveTextLineSlots({ left: regionX + pad, right: regionX + regionW - pad }, blocked);
            if (slots.length === 0) {
                lineTop += lineHeight;
                continue;
            }

            const orderedSlots = mobile
                ? [slots.reduce((best, s) => (s.right - s.left) > (best.right - best.left) ? s : best)]
                : [...slots].sort((a, b) => a.left - b.left);

            for (let si = 0; si < orderedSlots.length; si++) {
                const slot = orderedSlots[si];
                const slotWidth = slot.right - slot.left;
                const line = layoutNextLine(prepared, cursor, slotWidth);
                if (line === null) {
                    exhausted = true;
                    break;
                }
                lines.push({ x: Math.round(slot.left), y: Math.round(lineTop), text: line.text, width: line.width });
                cursor = line.end;
            }
            lineTop += lineHeight;
        }
        return { lines, cursor };
    }

    // --- Subscribe to ambient render loop ---
    ambient.subscribe((viewportOrbs) => {
        const mobile = isMobile();
        const pad = mobile ? MOBILE_PAD : PAD;
        const orbRadiusScale = mobile ? 0.65 : 1;
        const stageW = stage.offsetWidth;
        const stageH = Math.max(stage.offsetHeight, 320);

        // Viewport → hero-local coordinate conversion
        const rect = stage.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;

        const circleObs = [];
        for (let i = 0; i < viewportOrbs.length; i++) {
            const orb = viewportOrbs[i];
            const localX = orb.x - rect.left;
            const localY = orb.y - rect.top;
            const effectiveR = orb.r * orbRadiusScale;
            if (localX + effectiveR > 0 && localX - effectiveR < rect.width &&
                localY + effectiveR > 0 && localY - effectiveR < rect.height) {
                circleObs.push({
                    cx: localX, cy: localY, r: effectiveR,
                    hPad: mobile ? 8 : 10, vPad: mobile ? 2 : 3,
                });
            }
        }

        // Headline layout
        const headlineMaxH = Math.floor(stageH * 0.3);
        const headlineMaxW = stageW - pad * 2;
        const maxFontSize = mobile ? 28 : 38;
        const hl = fitHeadline(headlineMaxW, headlineMaxH, maxFontSize);
        const headlineFont = '700 ' + hl.fontSize + 'px ' + HEADLINE_FONT_FAMILY;
        const headlineLH = hl.lineHeight;

        const hlResult = layoutTextAroundObstacles(
            prepareWithSegments(headlineText, headlineFont),
            { segmentIndex: 0, graphemeIndex: 0 },
            0, 0, stageW, headlineMaxH, headlineLH, circleObs, pad,
        );

        // Body layout below headline
        const bodyTop = headlineLH * Math.max(1, hlResult.lines.length) + 8;
        const bodyHeight = stageH - bodyTop - 40;
        const bodyResult = layoutTextAroundObstacles(
            preparedBody,
            { segmentIndex: 0, graphemeIndex: 0 },
            0, bodyTop, stageW, bodyHeight, BODY_LINE_HEIGHT, circleObs, pad,
        );

        // --- DOM projection ---
        syncPool(headlinePool, hlResult.lines.length, () => {
            const el = document.createElement('span');
            el.className = 'hero-headline-line';
            return el;
        });
        for (let i = 0; i < hlResult.lines.length; i++) {
            const el = headlinePool[i];
            const line = hlResult.lines[i];
            if (el.textContent !== line.text || el.style.left !== line.x + 'px' || el.style.top !== line.y + 'px') {
                el.textContent = line.text;
                el.style.left = line.x + 'px';
                el.style.top = line.y + 'px';
                el.style.font = headlineFont;
                el.style.lineHeight = headlineLH + 'px';
            }
        }

        syncPool(linePool, bodyResult.lines.length, () => {
            const el = document.createElement('span');
            el.className = 'hero-line';
            return el;
        });
        for (let i = 0; i < bodyResult.lines.length; i++) {
            const el = linePool[i];
            const line = bodyResult.lines[i];
            if (el.textContent !== line.text || el.style.left !== line.x + 'px' || el.style.top !== line.y + 'px') {
                el.textContent = line.text;
                el.style.left = line.x + 'px';
                el.style.top = line.y + 'px';
                el.style.font = BODY_FONT;
                el.style.lineHeight = BODY_LINE_HEIGHT + 'px';
            }
        }
    });

    // --- Resize ---
    const resizeObserver = new ResizeObserver(() => {
        cachedHlWidth = -1;
    });
    resizeObserver.observe(hero);

    // --- Cleanup ---
    window.addEventListener('beforeunload', () => {
        resizeObserver.disconnect();
    });
}
