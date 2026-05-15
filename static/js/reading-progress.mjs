// reading-progress.mjs — Thin bar at top showing scroll percentage
(function () {
    const bar = document.createElement('div');
    bar.className = 'reading-progress-bar';
    bar.innerHTML = '<div class="reading-progress-bar__fill"></div>';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    const fill = bar.querySelector('.reading-progress-bar__fill');
    let ticking = false;

    function update() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;

        fill.style.transform = `scaleX(${progress})`;

        if (scrollTop > 100) {
            bar.classList.add('reading-progress-bar--visible');
        } else {
            bar.classList.remove('reading-progress-bar--visible');
        }

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });

    update();
})();
