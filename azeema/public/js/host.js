import { $, $$, ar, api, initCommon, myOrders, snackbar } from './m3.js';
import { spring, blurIn, revealOnScroll } from './motion.js';

initCommon();
revealOnScroll();
const host = $('#host');
const { slug, key, url } = host.dataset;
myOrders.add(slug, key);

// Personal links
$('#make-link')?.addEventListener('click', () => {
  const name = $('#guest-name').value.trim();
  if (!name) { $('#guest-name').focus(); return snackbar('اكتب اسم الضيف'); }
  const link = `${url}?to=${encodeURIComponent(name)}`;
  const out = $('.personal-out');
  const first = out.hidden;
  out.hidden = false;
  $('input', out).value = link;
  $('[data-copy]', out).dataset.copy = link;
  $('a', out).href = `https://wa.me/?text=${encodeURIComponent(`حياك الله ${name} 🤍\nيسعدنا حضورك، هذي دعوتك:\n${link}`)}`;
  if (first) { const h = out.scrollHeight; spring(out, [{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], 'smooth').finished.then(() => out.getAnimations().forEach((a) => a.cancel())); }
  else blurIn($('input', out), { y: 8 });
});
$('#reminder')?.addEventListener('input', (e) => ($('#reminder-wa').href = `https://wa.me/?text=${encodeURIComponent(e.target.value)}`));

// Filter chips
$('.guests .chips')?.addEventListener('click', (e) => {
  const c = e.target.closest('.chip');
  if (!c) return;
  $$('.guests .chip').forEach((x) => x.classList.toggle('on', x === c));
  $$('#guest-list li[data-a]').forEach((li) => (li.hidden = c.dataset.f !== 'all' && li.dataset.a !== c.dataset.f));
});

// Live refresh with spring number ticks
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let lastCount = null;
async function refresh() {
  try {
    const r = await api(`/api/host/${slug}?key=${key}`, null, 'GET');
    const v = $('.h-video');
    if (v) {
      $('#vid-progress')?.style.setProperty('--v', (r.progress || 0) + '%');
      if ($('#vid-pct')) $('#vid-pct').textContent = ar(r.progress || 0) + '%';
      if (v.dataset.video !== r.video) {
        v.dataset.video = r.video;
        if (r.video === 'ready') {
          const vid = $('video', v); vid.poster = `/media/${slug}/poster.jpg?t=${Date.now()}`; vid.src = `/media/${slug}/video.mp4?t=${Date.now()}`;
          blurIn($('.vid-wrap', v), { y: 20 }); snackbar('الفيديو جاهز 🎉');
        }
      }
    }
    for (const [k, n] of Object.entries({ ...r.summary, views: r.views })) {
      const el = $(`[data-k="${k}"]`);
      if (!el) continue;
      const txt = k === 'responses' ? (n ? ar(n) : '') : ar(n);
      if (el.textContent !== txt) { el.textContent = txt; el.dataset.n = n; spring(el, [{ transform: 'scale(1.35)' }, { transform: 'none' }], 'bouncy'); }
    }
    const list = $('#guest-list');
    if (list && r.rsvps.length && r.rsvps.length !== lastCount) {
      const f = $('.guests .chip.on')?.dataset.f || 'all';
      const fresh = lastCount !== null;
      list.innerHTML = r.rsvps.map((x) => `<li data-a="${x.attending ? 'yes' : 'no'}" ${f !== 'all' && f !== (x.attending ? 'yes' : 'no') ? 'hidden' : ''}>
        <span class="g-avatar ${x.attending ? 'ok' : 'no'}">${esc(x.name.trim().charAt(0))}</span><div><b>${esc(x.name)}</b>${x.message ? `<em>«${esc(x.message)}»</em>` : ''}</div>
        <small class="g-status ${x.attending ? 'ok' : 'no'}">${x.attending ? (x.companions ? `+${ar(x.companions)} مرافق` : 'سيحضر') : 'معتذر'}</small></li>`).join('');
      if (fresh) { blurIn(list.firstElementChild, { y: -16 }); snackbar(`ردّ جديد من ${r.rsvps[0].name}`); }
      lastCount = r.rsvps.length;
    } else if (lastCount === null) lastCount = r.rsvps.length;
  } catch {}
}
refresh();
setInterval(refresh, $('.h-video')?.dataset.video === 'ready' ? 8000 : 2500);
