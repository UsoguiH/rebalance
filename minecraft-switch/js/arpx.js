"use strict";
// arpx module: makes every piece of Arabic UI text use the pixel font look (T4-B).
// Bare text nodes are wrapped in <span class="bcpx"> so the pixel filter lands on the letters only,
// never on the semi-transparent boxes behind them (the filter would turn those solid black).
(function () {
  const SKIP = 'script,style,svg,textarea,input,select,option,.bcpx,.bcpxT,canvas,#logo';   // the logo uses gradient-clipped text, a filtered child would hide it
  const AR = /[؀-ۿ]/;
  function wrap(node) {
    if (node.nodeType !== 3 || !AR.test(node.nodeValue)) return;
    const p = node.parentElement; if (!p || p.closest(SKIP)) return;
    const s = document.createElement('span'); s.className = 'bcpx';
    p.replaceChild(s, node); s.appendChild(node);
  }
  function scan(root) {
    if (document.documentElement.lang !== 'ar') return;
    if (root.nodeType === 3) return wrap(root);
    if (root.nodeType !== 1 || root.closest && root.closest(SKIP)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [];
    while (w.nextNode()) list.push(w.currentNode);
    list.forEach(wrap);
  }
  new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') wrap(m.target); else m.addedNodes.forEach(scan); } })
    .observe(document.body, { childList: true, subtree: true, characterData: true });
  scan(document.body);
})();
