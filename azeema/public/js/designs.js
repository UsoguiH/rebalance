import { $, $$, initCommon, openSheet } from './m3.js';
import { revealOnScroll, blurIn, spring } from './motion.js';

initCommon();
revealOnScroll();
const T = window.__THEMES__;
let occ = new URLSearchParams(location.search).get('occasion') || 'wedding';

// Sidebar (occasion) selection
$('.cat-side').addEventListener('click', (e) => {
  const b = e.target.closest('.side-item');
  if (!b) return;
  $$('.side-item').forEach((x) => x.classList.toggle('on', x === b));
  occ = b.dataset.occ;
  $$('.g-tile').forEach((t, i) => blurIn(t, { y: 12, delay: i * 0.025 }));
});

// Live search
const q = $('#q');
const filter = () => {
  const v = q.value.trim();
  let any = false;
  $$('.group').forEach((g) => {
    let n = 0;
    $$('.g-tile', g).forEach((t) => { const hit = !v || t.dataset.name.includes(v); t.hidden = !hit; n += hit; });
    g.hidden = !n; any ||= !!n;
  });
  $('.empty-q').hidden = any;
};
q.addEventListener('input', filter);
filter();

// warm the image cache as soon as a finger lands on a tile
document.addEventListener('pointerdown', (e) => { const t = e.target.closest('.g-tile'); if (t) new Image().src = `/img/designs/${t.dataset.theme}.jpg`; });

// Design details → bottom sheet
const sheet = $('#design-sheet');
document.addEventListener('click', async (e) => {
  const t = e.target.closest('.g-tile');
  if (!t) return;
  const k = t.dataset.theme;
  const im = $('.ds-img', sheet);
  im.src = `/img/designs/${k}.jpg`;
  await Promise.race([im.decode().catch(() => {}), new Promise((r) => setTimeout(r, 120))]); // decode off the animation
  $('.ds-name', sheet).textContent = T[k].name;
  $('.ds-desc', sheet).textContent = T[k].desc;
  $('.ds-use', sheet).href = `/create?template=${k}&occasion=${occ}`;
  $('.ds-demo', sheet).href = `/demo/${k}`;
  openSheet(sheet);
  spring($('.ds-img', sheet), [{ transform: 'scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], 'bouncy', { delay: 0.08 });
});
