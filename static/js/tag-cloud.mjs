// tag-cloud.mjs — Canvas-based bubble tag cloud with force-directed layout
(function () {
    const canvas = document.getElementById('tag-cloud-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tags = JSON.parse(canvas.dataset.tags || '[]');
    if (tags.length === 0) return;

    let W, H;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
        const rect = canvas.getBoundingClientRect();
        W = rect.width;
        H = rect.height;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const maxCount = Math.max(...tags.map(t => t.count));
    const minCount = Math.min(...tags.map(t => t.count));

    const bubbles = tags.map((tag) => {
        const ratio = maxCount === minCount ? 0.5 : (tag.count - minCount) / (maxCount - minCount);
        const r = 20 + ratio * 35;
        const fontSize = 12 + ratio * 10;
        return {
            tag,
            x: W * 0.2 + Math.random() * W * 0.6,
            y: H * 0.2 + Math.random() * H * 0.6,
            vx: 0,
            vy: 0,
            r,
            fontSize,
        };
    });

    let hovered = null;
    let mouseX = -1000, mouseY = -1000;

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseleave', () => {
        mouseX = -1000;
        mouseY = -1000;
        hovered = null;
    });

    canvas.addEventListener('click', () => {
        if (hovered) {
            window.location.href = hovered.tag.url;
        }
    });

    function simulate() {
        const cx = W / 2, cy = H / 2;

        for (const b of bubbles) {
            b.vx += (cx - b.x) * 0.0005;
            b.vy += (cy - b.y) * 0.0005;

            for (const o of bubbles) {
                if (o === b) continue;
                const dx = b.x - o.x;
                const dy = b.y - o.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const minDist = b.r + o.r + 4;
                if (dist < minDist) {
                    const force = (minDist - dist) / dist * 0.05;
                    b.vx += dx * force;
                    b.vy += dy * force;
                }
            }

            const mdx = b.x - mouseX;
            const mdy = b.y - mouseY;
            const mdist = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
            if (mdist < b.r + 30) {
                const force = (b.r + 30 - mdist) / mdist * 0.8;
                b.vx += mdx * force;
                b.vy += mdy * force;
            }

            if (b.x - b.r < 0) b.vx += 0.5;
            if (b.x + b.r > W) b.vx -= 0.5;
            if (b.y - b.r < 0) b.vy += 0.5;
            if (b.y + b.r > H) b.vy -= 0.5;

            b.vx *= 0.9;
            b.vy *= 0.9;

            b.x += b.vx;
            b.y += b.vy;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        const style = getComputedStyle(document.documentElement);
        const accent = style.getPropertyValue('--accent').trim() || '#2d4a7a';
        const secondary = style.getPropertyValue('--secondary').trim() || '#5a5a6e';
        const border = style.getPropertyValue('--border').trim() || '#e8e2d8';
        const bodyFont = style.getPropertyValue('--body-font').trim() || 'sans-serif';

        hovered = null;

        for (const b of bubbles) {
            const mdx = b.x - mouseX;
            const mdy = b.y - mouseY;
            const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
            const isHover = mdist < b.r;

            if (isHover) hovered = b;

            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fillStyle = isHover ? accent + '18' : 'transparent';
            ctx.fill();
            ctx.strokeStyle = isHover ? accent : border;
            ctx.lineWidth = isHover ? 2 : 1;
            ctx.stroke();

            ctx.fillStyle = isHover ? accent : secondary;
            ctx.font = `${isHover ? 'bold ' : ''}${b.fontSize}px ${bodyFont}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(b.tag.name, b.x, b.y);
        }

        canvas.style.cursor = hovered ? 'pointer' : 'default';

        simulate();
        requestAnimationFrame(draw);
    }

    draw();
})();
