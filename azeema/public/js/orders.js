import { $, $$, ar, api, initCommon, myOrders, snackbar } from './m3.js';
import { blurIn } from './motion.js';

initCommon();
const list = $('#list');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STAR = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.8z"/></svg>';

function card(o) {
  const paid = o.status === 'paid';
  const ready = paid && o.video === 'ready';
  const date = new Date(o.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('en-GB');
  const status = !paid ? ['wait', 'بانتظار الدفع'] : ready ? ['ok', 'دعوتك جاهزة'] : ['', 'الفيديو قيد التجهيز'];
  const s = o.summary;
  return `<article class="order card" data-kind="${paid ? 'ready' : 'pending'}">
    <div class="o-head">
      <img class="o-avatar" src="/img/designs/${esc(o.template)}.jpg" alt="">
      <div class="o-title"><b>${esc(o.title)}</b></div>
      ${paid ? `<a class="btn btn-dark btn-sm pressable" href="/host/${esc(o.slug)}?key=${esc(o.key)}">${STAR} إدارة الدعوة</a>`
    : `<a class="btn btn-filled btn-sm pressable" href="/checkout/${esc(o.slug)}?key=${esc(o.key)}">إكمال الدفع</a>`}
    </div>
    <div class="o-row">
      <img class="o-thumb" src="/img/designs/${esc(o.template)}.jpg" alt="">
      <div class="o-meta">${s ? `<span>✓ ${ar(s.yes)} أكدوا</span><span>· ${ar(s.guests)} ضيف متوقع</span>` : `<span>${esc(o.when)}</span>`}</div>
      <span class="o-price">${ar(o.price)} <small>ر.س</small></span>
    </div>
    <div class="o-foot"><span class="${status[0]}">${status[1]}</span><span dir="ltr">${date}</span></div>
  </article>`;
}

async function load() {
  const mine = myOrders.list();
  if (!mine.length) { list.innerHTML = ''; $('#empty').hidden = false; blurIn($('#empty')); return; }
  try {
    const { items } = await api('/api/my', { items: mine });
    list.setAttribute('aria-busy', 'false');
    if (!items.length) { list.innerHTML = ''; $('#empty').hidden = false; return; }
    list.innerHTML = items.map(card).join('');
    $$('.order', list).forEach((c, i) => blurIn(c, { y: 30, delay: i * 0.06 }));
    const total = items.reduce((n, o) => n + (o.summary?.responses || 0), 0);
    const b = $('#bell-n'); b.textContent = total ? ar(total) : ''; b.dataset.n = total;
    $('#bell').onclick = (e) => { e.preventDefault(); snackbar(total ? `وصلك ${ar(total)} رد على دعواتك 🤍` : 'ما فيه ردود جديدة'); };
  } catch (e) { snackbar(e.message, { action: 'إعادة', onAction: load }); }
}

$('.chips').addEventListener('click', (e) => {
  const c = e.target.closest('.chip');
  if (!c) return;
  $$('.chips .chip').forEach((x) => x.classList.toggle('on', x === c));
  $$('.order[data-kind]').forEach((o) => {
    const show = c.dataset.f === 'all' || o.dataset.kind === c.dataset.f;
    if (show && o.hidden) { o.hidden = false; blurIn(o, { y: 16 }); } else o.hidden = !show;
  });
});
load();
