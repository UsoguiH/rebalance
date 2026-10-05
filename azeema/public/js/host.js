import { $, $$, ar, api, bindCopy } from './ui.js';
bindCopy();
const host = $('#host');
const { slug, key, url } = host.dataset;

// Personal links
$('#make-link')?.addEventListener('click', () => {
  const name = $('#guest-name').value.trim();
  if (!name) return $('#guest-name').focus();
  const link = `${url}?to=${encodeURIComponent(name)}`;
  const out = $('.personal-out');
  out.hidden = false;
  $('input', out).value = link;
  $('a', out).href = `https://wa.me/?text=${encodeURIComponent(`حياك الله ${name} 🤍\nيسعدنا حضورك، هذي دعوتك:\n${link}`)}`;
});
$('#reminder')?.addEventListener('input', (e) => ($('#reminder-wa').href = `https://wa.me/?text=${encodeURIComponent(e.target.value)}`));

// Filter
$('.filter')?.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  $$('.filter button').forEach((x) => x.classList.toggle('on', x === b));
  $$('#guest-list li[data-a]').forEach((li) => (li.hidden = b.dataset.f !== 'all' && li.dataset.a !== b.dataset.f));
});

// Live refresh
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function refresh() {
  try {
    const r = await api(`/api/host/${slug}?key=${key}`, null, 'GET');
    const v = $('.h-video');
    if (v && v.dataset.video !== r.video) {
      v.dataset.video = r.video;
      if (r.video === 'ready') { const vid = $('video', v); vid.poster = `/media/${slug}/poster.jpg?t=${Date.now()}`; vid.src = `/media/${slug}/video.mp4?t=${Date.now()}`; }
    }
    for (const [k, n] of Object.entries({ ...r.summary, views: r.views })) { const el = $(`[data-k="${k}"]`); if (el) el.textContent = ar(n); }
    const list = $('#guest-list');
    if (list && r.rsvps.length) {
      const f = $('.filter .on')?.dataset.f || 'all';
      list.innerHTML = r.rsvps.map((x) => `<li data-a="${x.attending ? 'yes' : 'no'}" ${f !== 'all' && f !== (x.attending ? 'yes' : 'no') ? 'hidden' : ''}>
        <span class="dot ${x.attending ? 'ok' : 'no'}"></span><div><b>${esc(x.name)}</b>${x.message ? `<em>«${esc(x.message)}»</em>` : ''}</div>
        <small>${x.attending ? (x.companions ? `+${ar(x.companions)} مرافق` : 'سيحضر') : 'معتذر'}</small></li>`).join('');
    }
  } catch {}
}
$$('.stat b').forEach((b) => (b.textContent = ar(+b.textContent || 0)));
setInterval(refresh, 8000);
if ($('.h-video')?.dataset.video !== 'ready') setTimeout(refresh, 2500);
