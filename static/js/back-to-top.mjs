// back-to-top.mjs — Circular progress indicator + scroll to top
(function () {
    const R = 18;
    const C = 2 * Math.PI * R;

    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = `
        <svg viewBox="0 0 44 44">
            <circle class="back-to-top__bg" cx="22" cy="22" r="${R}"/>
            <circle class="back-to-top__progress" cx="22" cy="22" r="${R}"
                stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
            <path class="back-to-top__arrow" d="M22 16 l-6 7 h12 z"/>
        </svg>`;
    document.body.appendChild(btn);

    const progressCircle = btn.querySelector('.back-to-top__progress');
    let ticking = false;

    function update() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;

        progressCircle.style.strokeDashoffset = C * (1 - progress);

        if (scrollTop > 300) {
            btn.classList.add('back-to-top--visible');
        } else {
            btn.classList.remove('back-to-top--visible');
        }

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    update();
})();
