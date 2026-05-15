// toc-spy.mjs — Highlight current heading in TOC sidebar
(function () {
    const toc = document.querySelector('.toc');
    if (!toc) return;

    const tocLinks = toc.querySelectorAll('a');
    if (tocLinks.length === 0) return;

    // Add class for styling
    tocLinks.forEach(link => link.classList.add('toc-link'));

    // Find headings that correspond to TOC links
    const headings = [];
    tocLinks.forEach(link => {
        const id = link.getAttribute('href')?.slice(1);
        if (id) {
            const el = document.getElementById(id);
            if (el) headings.push({ el, link });
        }
    });

    if (headings.length === 0) return;

    let activeLink = null;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const heading = headings.find(h => h.el === entry.target);
                if (heading) {
                    if (activeLink) activeLink.classList.remove('toc-link--active');
                    heading.link.classList.add('toc-link--active');
                    activeLink = heading.link;
                }
            }
        });
    }, {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0
    });

    headings.forEach(({ el }) => observer.observe(el));

    // Smooth scroll on TOC link click
    tocLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const id = link.getAttribute('href')?.slice(1);
            if (id) {
                const target = document.getElementById(id);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
})();
