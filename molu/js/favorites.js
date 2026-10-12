import { boot, $, icon, favs, salonCard, bindFavs } from './shell.js';
import { salonById } from './data.js';
import { spring } from './motion.js';
import { shapeBadge } from './shapes.js';

// The whole screen is one function: a full page load runs it once; moving between screens in place (js/vt.js)
// calls it again on the fresh markup, without downloading or re-evaluating this file.
export default function mount() {
  boot({ page: 'favs' });
  function render() {
    const list = favs.list().map(salonById).filter(Boolean);
    $('#list').innerHTML = list.length ? list.map((s, i) => salonCard(s, { i })).join('') : `
      <div class="empty" style="grid-column:1/-1">${shapeBadge({ shape: 5, size: 96 })}
        <h3>المفضلة فاضية</h3>
        <p>اضغط على القلب في أي صالون يعجبك، ويصير هنا عشان ترجع له بسرعة.</p>
        <a class="btn btn-filled pressable" href="explore.html">${icon('search', 20)}تصفّح الصالونات</a>
      </div>`;
  }
  render();
  bindFavs(document, (id, on) => {
    if (on) return;
    const el = document.querySelector(`.sc-card[data-id="${id}"]`);
    spring(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.92)' }], 'snappy').finished.then(render);
  });
}
if (!window.__softnav) mount();
