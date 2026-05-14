/**
 * Pretext Truncation
 * Replaces CSS -webkit-line-clamp with precise Pretext-based text truncation.
 */
const FONT = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif';
const LINE_HEIGHT = 22.4; // 14px * 1.6
const MAX_LINES = 2;

export function initTruncation(P) {
    const { prepare, layout, prepareWithSegments, layoutWithLines } = P;

    const entries = document.querySelectorAll('.post-entry .entry-content');
    if (!entries.length) return;

    entries.forEach(el => {
        const text = el.textContent?.trim();
        if (!text) return;

        const style = getComputedStyle(el);
        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingRight = parseFloat(style.paddingRight) || 0;
        const width = el.clientWidth - paddingLeft - paddingRight;
        if (width <= 0) return;

        const prepared = prepare(text, FONT);
        const { lineCount } = layout(prepared, width, LINE_HEIGHT);

        if (lineCount <= MAX_LINES) return;

        const segPrepared = prepareWithSegments(text, FONT);
        const { lines } = layoutWithLines(segPrepared, width, LINE_HEIGHT);

        const truncated = lines
            .slice(0, MAX_LINES)
            .map(l => l.text)
            .join('')
            .trimEnd() + '...';

        el.textContent = truncated;
        el.classList.add('pretext-truncated');
    });
}
