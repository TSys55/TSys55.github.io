// theme-switcher.mjs — Three-theme cycle: 水墨 → 竹简 → 深夜
(function () {
    const THEMES = ['ink', 'bamboo', 'night'];
    const LABELS = { ink: '水墨', bamboo: '竹简', night: '深夜' };
    const STORAGE_KEY = 'pref-theme-3';

    function getCurrent() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && THEMES.includes(stored)) return stored;

        const old = localStorage.getItem('pref-theme');
        if (old === 'dark') return 'night';
        if (old === 'light') return 'ink';

        if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'night';
        return 'ink';
    }

    function apply(theme) {
        const html = document.documentElement;
        html.removeAttribute('data-theme');

        THEMES.forEach(t => html.classList.remove(`theme-${t}`));
        html.classList.add(`theme-${theme}`);

        html.dataset.theme = (theme === 'night') ? 'dark' : 'light';

        localStorage.setItem(STORAGE_KEY, theme);
        localStorage.setItem('pref-theme', (theme === 'night') ? 'dark' : 'light');
    }

    function cycle() {
        const current = getCurrent();
        const idx = THEMES.indexOf(current);
        const next = THEMES[(idx + 1) % THEMES.length];
        apply(next);
        updateButton(next);
    }

    function updateButton(theme) {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        btn.title = `${LABELS[theme]} (Alt + T)`;
        btn.setAttribute('aria-label', `Theme: ${LABELS[theme]}`);
    }

    const initial = getCurrent();
    apply(initial);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => updateButton(initial));
    } else {
        updateButton(initial);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', cycle);
        }
    });
})();
