/**
 * Pretext Ambient Background
 * Full-page floating orbs with spring physics toward cursor.
 */
const MOBILE_BREAKPOINT = 768;
const IDLE_TIMEOUT = 2000;
const SLEEP_THRESHOLD = 0.5;
const VIEWPORT_PAD = 20;

const ORB_DEFS = [
    { fx: 0.20, fy: 0.25, r: 48, color: [196, 163, 90],  ox:  40, oy: -30 },
    { fx: 0.50, fy: 0.20, r: 42, color: [100, 140, 255], ox: -50, oy:  20 },
    { fx: 0.80, fy: 0.35, r: 36, color: [232, 100, 130], ox:  30, oy:  40 },
    { fx: 0.30, fy: 0.70, r: 30, color: [80, 200, 180],  ox: -20, oy:  50 },
    { fx: 0.70, fy: 0.65, r: 34, color: [160, 120, 220], ox:  60, oy: -10 },
];

function isDarkTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
}

export function initAmbient() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

    const mobile = isMobile();
    const activeCount = mobile ? 2 : ORB_DEFS.length;

    // Create fixed background layer
    const layer = document.createElement('div');
    layer.className = 'ambient-layer';
    document.body.prepend(layer);

    // Create orbs
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const orbs = ORB_DEFS.slice(0, activeCount).map(def => ({
        x: def.fx * vw,
        y: def.fy * vh,
        vx: 0, vy: 0,
        r: def.r,
        restX: def.fx * vw,
        restY: def.fy * vh,
        color: def.color,
        ox: mobile ? def.ox * 0.5 : def.ox,
        oy: mobile ? def.oy * 0.5 : def.oy,
    }));

    const orbEls = orbs.map(() => {
        const el = document.createElement('div');
        el.className = 'ambient-orb';
        layer.appendChild(el);
        return el;
    });

    // State
    let mouseX = vw / 2;
    let mouseY = vh / 2;
    let lastMoveTime = performance.now();
    let rafId = null;
    let lastFrameTime = null;
    const subscribers = [];

    function updateRestPositions() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        for (let i = 0; i < orbs.length; i++) {
            const def = ORB_DEFS[i];
            orbs[i].restX = def.fx * w;
            orbs[i].restY = def.fy * h;
        }
    }

    function updateOrbVisual(el, orb, rScale, dark) {
        const radius = orb.r * rScale;
        const [r, g, b] = orb.color;
        const a1 = dark ? 0.4 : 0.3;
        const a2 = dark ? 0.12 : 0.08;
        const s1 = dark ? 0.25 : 0.15;
        const s2 = dark ? 0.1 : 0.05;
        el.style.background = `radial-gradient(circle at 35% 35%, rgba(${r},${g},${b},${a1}), rgba(${r},${g},${b},${a2}) 55%, transparent 72%)`;
        el.style.boxShadow = `0 0 60px 15px rgba(${r},${g},${b},${s1}), 0 0 120px 40px rgba(${r},${g},${b},${s2})`;
        el.style.left = (orb.x - radius) + 'px';
        el.style.top = (orb.y - radius) + 'px';
        el.style.width = (radius * 2) + 'px';
        el.style.height = (radius * 2) + 'px';
    }

    function render(now) {
        const mobile = isMobile();
        const rScale = mobile ? 0.65 : 1;
        const dt = lastFrameTime ? Math.min((now - lastFrameTime) / 1000, 0.05) : 0.016;
        lastFrameTime = now;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const idle = (now - lastMoveTime) > IDLE_TIMEOUT;
        const dark = isDarkTheme();
        let stillMoving = false;

        // Spring physics
        for (let i = 0; i < orbs.length; i++) {
            const orb = orbs[i];
            const radius = orb.r * rScale;
            const k = idle ? 2.0 : 5.0;
            const damping = idle ? 0.85 : 0.80;

            const targetX = idle ? orb.restX : mouseX + orb.ox;
            const targetY = idle ? orb.restY : mouseY + orb.oy;

            const dampFactor = Math.pow(damping, dt * 60);
            orb.vx += k * (targetX - orb.x) * dt;
            orb.vy += k * (targetY - orb.y) * dt;
            orb.vx *= dampFactor;
            orb.vy *= dampFactor;
            orb.x += orb.vx * dt;
            orb.y += orb.vy * dt;

            // Soft boundary containment
            if (orb.x - radius < VIEWPORT_PAD) orb.vx += (VIEWPORT_PAD - (orb.x - radius)) * 2 * dt;
            if (orb.x + radius > vw - VIEWPORT_PAD) orb.vx -= ((orb.x + radius) - (vw - VIEWPORT_PAD)) * 2 * dt;
            if (orb.y - radius < VIEWPORT_PAD) orb.vy += (VIEWPORT_PAD - (orb.y - radius)) * 2 * dt;
            if (orb.y + radius > vh - VIEWPORT_PAD) orb.vy -= ((orb.y + radius) - (vh - VIEWPORT_PAD)) * 2 * dt;

            if (Math.abs(orb.vx) + Math.abs(orb.vy) > SLEEP_THRESHOLD) stillMoving = true;
        }

        // Inter-orb repulsion
        for (let i = 0; i < orbs.length; i++) {
            const a = orbs[i];
            const aR = a.r * rScale;
            for (let j = i + 1; j < orbs.length; j++) {
                const b = orbs[j];
                const bR = b.r * rScale;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = aR + bR + 15;
                if (dist >= minDist || dist <= 0.1) continue;
                const force = (minDist - dist) * 0.5;
                const nx = dx / dist;
                const ny = dy / dist;
                a.vx -= nx * force * dt;
                a.vy -= ny * force * dt;
                b.vx += nx * force * dt;
                b.vy += ny * force * dt;
            }
        }

        // Render orb visuals
        for (let i = 0; i < orbs.length; i++) {
            updateOrbVisual(orbEls[i], orbs[i], rScale, dark);
        }

        // Notify subscribers
        for (let i = 0; i < subscribers.length; i++) {
            subscribers[i](orbs, dt);
        }

        // Sleep when idle
        if (stillMoving || !idle) {
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

    // Pointer tracking
    window.addEventListener('pointermove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        lastMoveTime = performance.now();
        scheduleRender();
    });

    // Touch support
    window.addEventListener('touchmove', e => {
        if (e.touches.length > 0) {
            mouseX = e.touches[0].clientX;
            mouseY = e.touches[0].clientY;
            lastMoveTime = performance.now();
            scheduleRender();
        }
    }, { passive: true });

    // Resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateRestPositions, 150);
        scheduleRender();
    });

    // Theme change
    const themeObs = new MutationObserver(() => scheduleRender());
    themeObs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });

    // Visibility
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (rafId !== null) cancelAnimationFrame(rafId);
            rafId = null;
            lastFrameTime = null;
        } else {
            lastMoveTime = performance.now();
            scheduleRender();
        }
    });

    // Start
    scheduleRender();

    return {
        getOrbs() { return orbs; },
        subscribe(fn) {
            subscribers.push(fn);
            return () => {
                const idx = subscribers.indexOf(fn);
                if (idx !== -1) subscribers.splice(idx, 1);
            };
        },
        destroy() {
            if (rafId !== null) cancelAnimationFrame(rafId);
            themeObs.disconnect();
            layer.remove();
        },
    };
}
