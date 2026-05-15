// lightbox.mjs — Click-to-zoom on post content images
(function () {
    const content = document.querySelector('.post-content');
    if (!content) return;

    const images = content.querySelectorAll('img');
    if (images.length === 0) return;

    let overlay = null;

    function open(src, alt) {
        if (overlay) return;

        overlay = document.createElement('div');
        overlay.className = 'lightbox-overlay';
        overlay.innerHTML = `
            <button class="lightbox-close" aria-label="Close">&times;</button>
            <img src="${src}" alt="${alt || ''}"/>
        `;
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                overlay.classList.add('lightbox-overlay--visible');
            });
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.classList.contains('lightbox-close')) {
                close();
            }
        });

        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
    }

    function close() {
        if (!overlay) return;
        overlay.classList.remove('lightbox-overlay--visible');
        document.removeEventListener('keydown', onKey);
        document.body.style.overflow = '';

        const el = overlay;
        setTimeout(() => el.remove(), 250);
        overlay = null;
    }

    function onKey(e) {
        if (e.key === 'Escape') close();
    }

    images.forEach(img => {
        if (img.closest('a')) return;
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', () => {
            open(img.src, img.alt);
        });
    });
})();
