// particle-calligraphy.mjs — Canvas particles forming Chinese characters
(function () {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const container = document.createElement('div');
    container.className = 'particle-calligraphy';
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    document.body.prepend(container);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W, H;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // Sample "博客" using a tiny offscreen canvas to get pixel positions
    const sampleCanvas = document.createElement('canvas');
    const sampleCtx = sampleCanvas.getContext('2d');
    const charSize = 80;
    const text = '博客';
    sampleCanvas.width = charSize * text.length;
    sampleCanvas.height = charSize;
    sampleCtx.fillStyle = '#000';
    sampleCtx.font = `bold ${charSize}px sans-serif`;
    sampleCtx.textBaseline = 'top';
    sampleCtx.fillText(text, 0, 0);

    const imageData = sampleCtx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height);
    const targets = [];
    const step = 3;
    for (let y = 0; y < sampleCanvas.height; y += step) {
        for (let x = 0; x < sampleCanvas.width; x += step) {
            const idx = (y * sampleCanvas.width + x) * 4;
            if (imageData.data[idx + 3] > 128) {
                targets.push({ x, y });
            }
        }
    }

    const scale = Math.min(W / (sampleCanvas.width + 80), H / (sampleCanvas.height + 80));
    const offsetX = (W - sampleCanvas.width * scale) / 2;
    const offsetY = (H - sampleCanvas.height * scale) / 2;

    const particles = targets.map(t => ({
        tx: t.x * scale + offsetX,
        ty: t.y * scale + offsetY,
        x: Math.random() * W,
        y: Math.random() * H,
        vx: 0,
        vy: 0,
        r: 1.5 + Math.random(),
    }));

    let mouseX = -9999, mouseY = -9999;
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    document.addEventListener('mouseleave', () => {
        mouseX = -9999;
        mouseY = -9999;
    });

    function update() {
        const mouseRadius = 80;

        for (const p of particles) {
            const dx = p.tx - p.x;
            const dy = p.ty - p.y;
            p.vx += dx * 0.03;
            p.vy += dy * 0.03;

            const mdx = p.x - mouseX;
            const mdy = p.y - mouseY;
            const mdist = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
            if (mdist < mouseRadius) {
                const force = (mouseRadius - mdist) / mdist * 3;
                p.vx += mdx * force;
                p.vy += mdy * force;
            }

            p.vx *= 0.88;
            p.vy *= 0.88;

            p.x += p.vx;
            p.y += p.vy;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        const style = getComputedStyle(document.documentElement);
        const accent = style.getPropertyValue('--accent').trim() || '#2d4a7a';
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.6;

        for (const p of particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    loop();
})();
