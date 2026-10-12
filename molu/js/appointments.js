import { boot, $, $$, ar, icon, appts, isUpcoming, snackbar, money, seedDemo, catArt } from './shell.js';
import { directionsUrl } from './map.js';
import { salonById, SALONS, CATEGORIES, SECTIONS, fmtTime } from './data.js';
import { initials } from './art.js';
import { openSheet, closeSheet } from './m3.js';
import { spring } from './motion.js';
import { shapeBadge } from './shapes.js';

// The whole screen is one function: a full page load runs it once; moving between screens in place (js/vt.js)
// calls it again on the fresh markup, without downloading or re-evaluating this file.
export default function mount() {
  seedDemo(SALONS);
  boot({ page: 'appts' });
  const TABS = [['all', 'الكل'], ['up', 'القادمة'], ['past', 'السابقة'], ['x', 'الملغاة']];
  let tab = appts.upcoming().length ? 'up' : 'all';
  const ddmmyyyy = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const rated = () => { try { return JSON.parse(localStorage.getItem('molu_rated') || '{}'); } catch { return {}; } };
  function until(at) {
    const h = Math.round((new Date(at) - Date.now()) / 36e5);
    if (h < 1) return 'موعدك خلال ساعة';
    if (h < 24) return `موعدك بعد ${ar(h)} ${h > 2 && h <= 10 ? 'ساعات' : 'ساعة'}`;
    const d = Math.round(h / 24);
    return d === 1 ? 'موعدك بكرة' : d === 2 ? 'موعدك بعد يومين' : `موعدك بعد ${ar(d)} ${d <= 10 ? 'أيام' : 'يوماً'}`;
  }
  const svcCat = (a) => (CATEGORIES[a.section] || []).find((c) => c.services.some(([n]) => n === a.services[0]))?.id || 'all';

  function card(a, i) {
    const s = salonById(a.salonId), d = new Date(a.at), up = isUpcoming(a), x = a.status === 'cancelled';
    const stars = rated()[a.id];
    const action = up ? `<button class="pill-dark pressable" type="button" data-manage="${a.id}">${icon('edit_calendar', 18)}إدارة الموعد</button>`
      : x ? `<a class="pill-dark pressable" href="salon.html?id=${s.id}">${icon('history', 18)}احجز مجدداً</a>`
      : `<button class="pill-dark pressable" type="button" data-rate="${a.id}">${icon(stars ? 'star_f' : 'star', 18)}${stars ? `قيّمت ${ar(stars)}/5` : 'قيّم الزيارة'}</button>`;
    return `
    <article class="order" style="--i:${i}" data-id="${a.id}">
      <div class="o1"><a class="o-logo" href="salon.html?id=${s.id}" style="--c:${a.section === 'eve' ? 'var(--eve)' : 'var(--adam)'}">${initials(s.name)}</a><a class="o-name" href="salon.html?id=${s.id}">${s.name}</a>${action}</div>
      <div class="o2"><span class="o-thumb">${catArt(a.section, svcCat(a), 30)}</span><span class="o-svc">${a.services.join('، ')}<br><span class="muted">${fmtTime(d.getHours() * 60 + d.getMinutes())} · ${a.staff}</span></span><span class="o-price">${money(a.total)}</span></div>
      <div class="o3">${up ? `<span class="up">${until(a.at)}</span>` : x ? '<span class="x">موعد ملغى</span>' : '<span>تمت الزيارة</span>'}<span>${ddmmyyyy(d)}</span></div>
    </article>`;
  }

  function render() {
    const all = appts.list();
    const by = { all, up: appts.upcoming(), past: all.filter((a) => !isUpcoming(a) && a.status !== 'cancelled'), x: all.filter((a) => a.status === 'cancelled') };
    const n = by.up.length;
    $('#bell').textContent = n ? ar(n) : ''; $('#bell').dataset.n = n;
    $('#tabs').innerHTML = TABS.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === tab}">${l}</button>`).join('');
    const list = tab === 'all' ? [...by.up, ...all.filter((a) => !isUpcoming(a)).sort((a, b) => new Date(b.at) - new Date(a.at))] : by[tab];
    $('#list').innerHTML = list.length ? list.map(card).join('') : `
      <div class="empty">${shapeBadge({ shape: tab === 'up' ? 3 : 1, size: 96 })}
        <h3>${tab === 'up' ? 'ما عندك مواعيد قادمة' : 'ما فيه شي هنا'}</h3>
        <p>احجز موعدك الجاي بدقيقة — بدون اتصال ولا انتظار.</p>
        <a class="btn btn-filled pressable" href="explore.html">${icon('search', 20)}تصفّح الصالونات</a>
      </div>`;
  }
  render();

  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]'); if (!b || b.dataset.tab === tab) return;
    tab = b.dataset.tab; render();
  });

  // ---------- add-to-calendar (.ics with a 2h alarm) ----------
  function ics(a, s) {
    const d = new Date(a.at), e = new Date(+d + a.minutes * 6e4);
    const f = (x) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const body = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//MoLu//AR\nBEGIN:VEVENT\nUID:${a.id}@molu\nDTSTAMP:${f(new Date())}\nDTSTART:${f(d)}\nDTEND:${f(e)}\nSUMMARY:${s.name} — ${a.services.join('، ')}\nLOCATION:${s.street ? s.street + '، ' : ''}${s.district}، ${s.city}\nGEO:${s.lat};${s.lng}\nBEGIN:VALARM\nTRIGGER:-PT2H\nACTION:DISPLAY\nDESCRIPTION:تذكير بموعدك\nEND:VALARM\nEND:VEVENT\nEND:VCALENDAR`;
    const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
    Object.assign(document.createElement('a'), { href: url, download: 'molu-appointment.ics' }).click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  document.addEventListener('click', (e) => {
    const m = e.target.closest('[data-manage]');
    const r = e.target.closest('[data-rate]');
    if (!m && !r) return;
    const a = appts.list().find((x) => x.id === (m || r).dataset[m ? 'manage' : 'rate']), s = salonById(a.salonId);
    const sheet = $('#manage');
    if (r) {
      let v = rated()[a.id] || 0;
      $('#manage-body').innerHTML = `<h2 class="title-l" style="text-align:center">كيف كانت زيارتك لـ ${s.name}؟</h2>
        <div class="stars-in" id="stars">${[1, 2, 3, 4, 5].map((k) => `<button type="button" data-v="${k}" class="${k <= v ? 'on' : ''}" aria-label="${k} نجوم">${icon('star_f', 40)}</button>`).join('')}</div>
        <button class="btn btn-black btn-block btn-lg pressable" type="button" id="send-rate"${v ? '' : ' disabled'}>أرسل التقييم</button>`;
      openSheet(sheet);
      $('#stars').onclick = (ev) => {
        const b = ev.target.closest('[data-v]'); if (!b) return;
        v = +b.dataset.v;
        $$('#stars button').forEach((x, k) => { x.classList.toggle('on', k < v); if (k < v) spring(x, [{ transform: 'scale(.6)' }, { transform: 'none' }], 'bouncy', { delay: k * 0.04 }); });
        $('#send-rate').disabled = false;
      };
      $('#send-rate').onclick = () => { try { localStorage.setItem('molu_rated', JSON.stringify({ ...rated(), [a.id]: v })); } catch {} closeSheet(sheet); render(); snackbar('شكراً! تقييمك يساعد غيرك يختار صح'); };
      return;
    }
    $('#manage-body').innerHTML = `
      <h2 class="title-l">${s.name}</h2>
      <p class="muted" style="margin:2px 0 14px">${a.services.join('، ')} · ${a.staff}</p>
      <div class="sheet-list">
        <a href="salon.html?id=${s.id}&reschedule=${a.id}">${icon('edit_calendar', 24)}تغيير الموعد</a>
        <button type="button" id="m-cal">${icon('event_available', 24)}أضف للتقويم</button>
        <a href="${directionsUrl(s)}" target="_blank" rel="noopener">${icon('near_me', 24)}الاتجاهات</a>
        <a href="tel:+966500000000">${icon('call', 24)}اتصل بالصالون</a>
        <button type="button" class="danger" id="m-cancel">${icon('cancel', 24)}<span>إلغاء الموعد</span></button>
      </div>`;
    openSheet(sheet);
    $('#m-cal').onclick = () => { ics(a, s); closeSheet(sheet); snackbar('أضفنا الموعد مع تذكير قبلها بساعتين'); };
    let armed = false;
    $('#m-cancel').onclick = (ev) => {
      const b = ev.currentTarget;
      if (!armed) { // two-tap confirm, in place — no extra dialog
        armed = true; $('span', b).textContent = 'متأكد؟ اضغط مرة ثانية';
        spring(b, [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], 'bouncy');
        return;
      }
      appts.update(a.id, { status: 'cancelled' });
      closeSheet(sheet);
      const el = $(`.order[data-id="${a.id}"]`);
      spring(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.94)' }], 'snappy').finished.then(render);
      snackbar('ألغينا الموعد', { action: 'تراجع', onAction: () => { appts.update(a.id, { status: 'booked' }); render(); } });
    };
  });
}
if (!window.__softnav) mount();
