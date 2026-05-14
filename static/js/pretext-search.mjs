/**
 * Pretext Search Highlight
 * Enhances search results with keyword highlighting using <mark> elements.
 * Observes #searchResults for DOM changes and wraps matched text in <mark>.
 */
(function() {
    var resList = document.getElementById('searchResults');
    var sInput = document.getElementById('searchInput');
    if (!resList || !sInput) return;

    function highlightResults() {
        var query = sInput.value.trim();
        if (!query) return;

        var items = resList.querySelectorAll('li');
        for (var i = 0; i < items.length; i++) {
            var li = items[i];
            // Find the text node (first child is the title text)
            for (var j = 0; j < li.childNodes.length; j++) {
                var node = li.childNodes[j];
                if (node.nodeType !== Node.TEXT_NODE) continue;
                var text = node.textContent;
                var lower = text.toLowerCase();
                var qLower = query.toLowerCase();
                var idx = lower.indexOf(qLower);
                if (idx === -1) continue;

                var before = text.slice(0, idx);
                var match = text.slice(idx, idx + query.length);
                var after = text.slice(idx + query.length);

                var frag = document.createDocumentFragment();
                if (before) frag.appendChild(document.createTextNode(before));
                var mark = document.createElement('mark');
                mark.className = 'search-highlight';
                mark.textContent = match;
                frag.appendChild(mark);
                if (after) frag.appendChild(document.createTextNode(after));

                li.replaceChild(frag, node);
                break;
            }
        }
    }

    // Observe searchResults for changes (fastsearch.js writes to innerHTML)
    var observer = new MutationObserver(function() {
        // Debounce: wait for rendering to settle
        requestAnimationFrame(highlightResults);
    });

    observer.observe(resList, { childList: true });
})();
