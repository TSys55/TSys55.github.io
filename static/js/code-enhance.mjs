// code-enhance.mjs — Language badge + enhanced copy button for code blocks
(function () {
    const LANG_MAP = {
        'language-bash': 'bash', 'language-sh': 'sh', 'language-shell': 'shell',
        'language-python': 'python', 'language-py': 'py',
        'language-javascript': 'js', 'language-js': 'js',
        'language-typescript': 'ts', 'language-ts': 'ts',
        'language-go': 'go', 'language-rust': 'rust', 'language-rs': 'rs',
        'language-java': 'java', 'language-c': 'c', 'language-cpp': 'c++',
        'language-css': 'css', 'language-html': 'html', 'language-xml': 'xml',
        'language-json': 'json', 'language-yaml': 'yaml', 'language-yml': 'yaml',
        'language-toml': 'toml', 'language-markdown': 'md', 'language-md': 'md',
        'language-sql': 'sql', 'language-ruby': 'ruby', 'language-rb': 'ruby',
        'language-php': 'php', 'language-swift': 'swift', 'language-kotlin': 'kt',
        'language-dockerfile': 'docker', 'language-diff': 'diff',
    };

    const preBlocks = document.querySelectorAll('.post-content pre');

    preBlocks.forEach(pre => {
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        let lang = '';
        const code = pre.querySelector('code');
        if (code) {
            for (const cls of code.classList) {
                if (LANG_MAP[cls]) { lang = LANG_MAP[cls]; break; }
            }
        }

        if (lang) {
            const badge = document.createElement('span');
            badge.className = 'code-lang-badge';
            badge.textContent = lang;
            wrapper.appendChild(badge);
        }

        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-copy-btn';
        copyBtn.textContent = 'Copy';
        copyBtn.setAttribute('aria-label', 'Copy code');
        wrapper.appendChild(copyBtn);

        copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const text = (code || pre).textContent;
            try {
                await navigator.clipboard.writeText(text);
                copyBtn.textContent = 'Copied!';
                copyBtn.classList.add('code-copy-btn--copied');
                setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                    copyBtn.classList.remove('code-copy-btn--copied');
                }, 1500);
            } catch {
                copyBtn.textContent = 'Failed';
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
            }
        });
    });
})();
