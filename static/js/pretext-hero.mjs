/**
 * Pretext Editorial Engine Hero
 * Interactive orbs + real-time text reflow, inspired by chenglou/pretext editorial-engine demo.
 */
const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif';
const BODY_FONT = '16px ' + FONT_FAMILY;
const BODY_LINE_HEIGHT = 25.6;
const HEADLINE_FONT_FAMILY = FONT_FAMILY;
const PAD = 24;
const MOBILE_PAD = 16;
const MIN_SLOT_WIDTH = 40;
const MOBILE_BREAKPOINT = 768;

const ORB_DEFS = [
    { fx: 0.25, fy: 0.30, r: 45, vx: 15, vy: 10, color: [196, 163, 90] },
    { fx: 0.65, fy: 0.55, r: 38, vx: -12, vy: 14, color: [100, 140, 255] },
    { fx: 0.45, fy: 0.75, r: 32, vx: 10, vy: -11, color: [232, 100, 130] },
];

// --- Geometry helpers (ported from pretext editorial-engine demo) ---

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

function hitTestOrbs(orbs, px, py, activeCount, radiusScale) {
    for (let i = activeCount - 1; i >= 0; i--) {
        const orb = orbs[i];
        const radius = orb.r * radiusScale;
        const dx = px - orb.x;
        const dy = py - orb.y;
        if (dx * dx + dy * dy <= radius * radius) return i;
    }
    return -1;
}

// --- Main module ---

export function initHero(P) {
    const { prepareWithSegments, layoutNextLine, walkLineRanges, layoutWithLines } = P;

    const hero = document.querySelector('.first-entry.home-info');
    if (!hero) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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

    const orbEls = ORB_DEFS.map(def => {
        const el = document.createElement('div');
        el.className = 'hero-orb';
        stage.appendChild(el);
        return el;
    });

    const orbs = ORB_DEFS.map(def => ({
        x: def.fx * 300,
        y: def.fy * 320,
        r: def.r,
        vx: def.vx,
        vy: def.vy,
        paused: false,
        color: def.color,
    }));

    let pointer = { x: -9999, y: -9999 };
    let drag = null;
    let lastFrameTime = null;
    let rafId = null;

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

    // --- Orb visuals ---
    function updateOrbVisual(el, orb, radiusScale, isDark) {
        const radius = orb.r * radiusScale;
        const [r, g, b] = orb.color;
        const alpha1 = isDark ? 0.4 : 0.3;
        const alpha2 = isDark ? 0.12 : 0.08;
        const shadow1 = isDark ? 0.25 : 0.15;
        const shadow2 = isDark ? 0.1 : 0.05;
        el.style.background = `radial-gradient(circle at 35% 35%, rgba(${r},${g},${b},${alpha1}), rgba(${r},${g},${b},${alpha2}) 55%, transparent 72%)`;
        el.style.boxShadow = `0 0 60px 15px rgba(${r},${g},${b},${shadow1}), 0 0 120px 40px rgba(${r},${g},${b},${shadow2})`;
        el.style.left = (orb.x - radius) + 'px';
        el.style.top = (orb.y - radius) + 'px';
        el.style.width = (radius * 2) + 'px';
        el.style.height = (radius * 2) + 'px';
        el.style.opacity = orb.paused ? '0.45' : '1';
    }

    function isDarkTheme() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    function getLocalCoords(e) {
        const rect = stage.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    // --- Render ---
    function render(now) {
        const mobile = isMobile();
        const pad = mobile ? MOBILE_PAD : PAD;
        const orbRadiusScale = mobile ? 0.65 : 1;
        const activeCount = mobile ? 2 : orbs.length;
        const stageW = stage.offsetWidth;
        const stageH = Math.max(stage.offsetHeight, 320);
        const isDark = isDarkTheme();

        // Orb physics
        const dt = lastFrameTime ? Math.min((now - lastFrameTime) / 1000, 0.05) : 0.016;
        lastFrameTime = now;
        let stillAnimating = false;

        for (let i = 0; i < orbs.length; i++) {
            if (i >= activeCount) continue;
            const orb = orbs[i];
            const radius = orb.r * orbRadiusScale;
            if (orb.paused || (drag && drag.orbIndex === i)) continue;
            stillAnimating = true;
            orb.x += orb.vx * dt;
            orb.y += orb.vy * dt;

            if (orb.x - radius < pad) { orb.x = radius + pad; orb.vx = Math.abs(orb.vx); }
            if (orb.x + radius > stageW - pad) { orb.x = stageW - pad - radius; orb.vx = -Math.abs(orb.vx); }
            if (orb.y - radius < 8) { orb.y = radius + 8; orb.vy = Math.abs(orb.vy); }
            if (orb.y + radius > stageH - 40) { orb.y = stageH - 40 - radius; orb.vy = -Math.abs(orb.vy); }
        }

        // Inter-orb collision
        for (let i = 0; i < activeCount; i++) {
            const a = orbs[i];
            const aR = a.r * orbRadiusScale;
            for (let j = i + 1; j < activeCount; j++) {
                const b = orbs[j];
                const bR = b.r * orbRadiusScale;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = aR + bR + (mobile ? 10 : 15);
                if (dist >= minDist || dist <= 0.1) continue;
                const force = (minDist - dist) * 0.8;
                const nx = dx / dist;
                const ny = dy / dist;
                if (!a.paused && !(drag && drag.orbIndex === i)) { a.vx -= nx * force * dt; a.vy -= ny * force * dt; }
                if (!b.paused && !(drag && drag.orbIndex === j)) { b.vx += nx * force * dt; b.vy += ny * force * dt; }
            }
        }

        // Circle obstacles
        const circleObs = [];
        for (let i = 0; i < activeCount; i++) {
            const orb = orbs[i];
            circleObs.push({
                cx: orb.x, cy: orb.y, r: orb.r * orbRadiusScale,
                hPad: mobile ? 8 : 10, vPad: mobile ? 2 : 3,
            });
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

        // Update orbs
        for (let i = 0; i < orbs.length; i++) {
            const el = orbEls[i];
            if (i >= activeCount) { el.style.display = 'none'; continue; }
            el.style.display = '';
            updateOrbVisual(el, orbs[i], orbRadiusScale, isDark);
        }

        // Cursor
        const hoveredOrb = hitTestOrbs(orbs, pointer.x, pointer.y, activeCount, orbRadiusScale);
        document.body.style.cursor = drag ? 'grabbing' : hoveredOrb !== -1 ? 'grab' : '';

        if (stillAnimating || drag) {
            rafId = requestAnimationFrame(render);
        } else {
            rafId = null;
            lastFrameTime = null;
        }
    }

    function scheduleRender() {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(render);
    }

    // --- Initialize orb positions ---
    function initOrbPositions() {
        const w = stage.offsetWidth || 800;
        const h = stage.offsetHeight || 320;
        for (let i = 0; i < orbs.length; i++) {
            const def = ORB_DEFS[i];
            orbs[i].x = def.fx * w;
            orbs[i].y = def.fy * h;
        }
    }
    initOrbPositions();

    // --- Pointer events ---
    stage.addEventListener('pointerdown', e => {
        const local = getLocalCoords(e);
        pointer = local;
        const mobile = isMobile();
        const activeCount = mobile ? 2 : orbs.length;
        const radiusScale = mobile ? 0.65 : 1;
        const hitIdx = hitTestOrbs(orbs, local.x, local.y, activeCount, radiusScale);
        if (hitIdx !== -1) {
            drag = {
                orbIndex: hitIdx,
                startX: local.x, startY: local.y,
                orbStartX: orbs[hitIdx].x, orbStartY: orbs[hitIdx].y,
            };
            e.preventDefault();
        }
        scheduleRender();
    });

    window.addEventListener('pointermove', e => {
        const local = getLocalCoords(e);
        pointer = local;
        if (drag) {
            const orb = orbs[drag.orbIndex];
            orb.x = drag.orbStartX + (local.x - drag.startX);
            orb.y = drag.orbStartY + (local.y - drag.startY);
        }
        scheduleRender();
    });

    window.addEventListener('pointerup', e => {
        if (drag) {
            const local = getLocalCoords(e);
            const dx = local.x - drag.startX;
            const dy = local.y - drag.startY;
            if (dx * dx + dy * dy < 16) {
                orbs[drag.orbIndex].paused = !orbs[drag.orbIndex].paused;
            } else {
                orbs[drag.orbIndex].x = drag.orbStartX + dx;
                orbs[drag.orbIndex].y = drag.orbStartY + dy;
            }
            drag = null;
        }
        scheduleRender();
    });

    stage.addEventListener('touchmove', e => {
        if (drag) e.preventDefault();
    }, { passive: false });

    // --- Resize ---
    const resizeObserver = new ResizeObserver(() => {
        cachedHlWidth = -1;
        scheduleRender();
    });
    resizeObserver.observe(hero);

    // --- Theme change ---
    const themeObserver = new MutationObserver(() => scheduleRender());
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });

    // --- Tab visibility ---
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (rafId !== null) cancelAnimationFrame(rafId);
            rafId = null;
            lastFrameTime = null;
        } else {
            scheduleRender();
        }
    });

    // --- Cleanup ---
    window.addEventListener('beforeunload', () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        themeObserver.disconnect();
        resizeObserver.disconnect();
    });

    // Start
    scheduleRender();
}
