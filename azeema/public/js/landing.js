// Hero phone: crossfade between live invitation designs, replaying their entrance animation.
const items = [...document.querySelectorAll('[data-rotator] .rot-item')];
let i = 0;
const replay = (el) => {
  const p = el.querySelector('.poster');
  p.getAnimations({ subtree: true }).forEach((a) => { a.cancel(); a.play(); });
};
if (items.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  setInterval(() => {
    items[i].classList.remove('on');
    i = (i + 1) % items.length;
    items[i].classList.add('on');
    replay(items[i]);
  }, 6500);
}

// Remember who referred this visitor (partners, or guests who saw a friend's invitation)
const ref = new URLSearchParams(location.search).get('ref');
if (ref) try { localStorage.setItem('azeema_ref', ref.slice(0, 20)); } catch {}
