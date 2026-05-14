/**
 * Pretext Grid
 * Wraps post cards into a two-column equal-height grid layout.
 */
const SUMMARY_FONT = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif';
const SUMMARY_LINE_HEIGHT = 22.4;

export function initGrid(P) {
    const { prepare, layout } = P;

    const entries = document.querySelectorAll('.post-entry');
    if (entries.length < 2) return;

    // Wrap entries in a grid container
    const grid = document.createElement('div');
    grid.className = 'post-card-grid';

    const parent = entries[0].parentNode;
    parent.insertBefore(grid, entries[0]);
    entries.forEach(entry => grid.appendChild(entry));

    // Set min-height on each card based on summary measurement
    if (window.innerWidth >= 769) {
        const gridStyle = getComputedStyle(grid);
        const gridWidth = grid.clientWidth;
        const gap = parseFloat(gridStyle.gap) || 24;
        const cardWidth = (gridWidth - gap) / 2;

        entries.forEach(entry => {
            const content = entry.querySelector('.entry-content');
            if (!content) return;

            const text = content.textContent?.trim();
            if (!text) return;

            const style = getComputedStyle(content);
            const padL = parseFloat(style.paddingLeft) || 0;
            const padR = parseFloat(style.paddingRight) || 0;
            const entryPad = parseFloat(getComputedStyle(entry).padding) || 24;
            const availWidth = cardWidth - entryPad * 2 - padL - padR;

            if (availWidth <= 0) return;

            const prepared = prepare(text, SUMMARY_FONT);
            const { height } = layout(prepared, availWidth, SUMMARY_LINE_HEIGHT);

            // header(~35px) + summary + footer(~20px) + margins
            const minH = 35 + height + 20 + 16 + entryPad * 2;
            entry.style.minHeight = minH + 'px';
        });
    }
}
