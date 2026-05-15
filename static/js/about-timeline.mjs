// about-timeline.mjs — Interactive timeline with scroll-triggered reveal
(function () {
    const container = document.getElementById('about-timeline');
    if (!container) return;

    const milestones = [
        { date: '2026-05-07', title: '博客诞生', desc: '用 Hugo + PaperMod 搭建个人博客，部署到 GitHub Pages' },
        { date: '2026-05-08', title: '基础设施完善', desc: '集成 Giscus 评论、GoatCounter 统计、Decap CMS 在线编辑' },
        { date: '2026-05-10', title: 'Pretext 排版引擎', desc: '引入 Pretext Editorial Engine，实现精准文字布局和首字下沉' },
        { date: '2026-05-12', title: '梅花易数卜卦', desc: '完成梅花易数在线卜卦工具，支持四种起卦方式' },
        { date: '2026-05-14', title: '全页光球效果', desc: '首页光球扩展为全页背景，弹簧物理跟随鼠标' },
        { date: '2026-05-15', title: '视觉重构', desc: '中文字体、水墨配色、阅读进度条、代码增强、灯箱...' },
    ];

    let html = '';
    milestones.forEach((m, i) => {
        html += `
            <div class="tl-item" style="transition-delay: ${i * 80}ms">
                <div class="tl-node"></div>
                <div class="tl-date">${m.date}</div>
                <div class="tl-title">${m.title}</div>
                <div class="tl-desc">${m.desc}</div>
            </div>`;
    });
    container.innerHTML = html;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = container.querySelectorAll('.tl-item');

    if (prefersReduced) {
        items.forEach(item => item.classList.add('tl-item--visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('tl-item--visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    items.forEach(item => observer.observe(item));
})();
