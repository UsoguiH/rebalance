// سجّل صالونك — one question per screen, nothing you have to invent: the section and the kind are taps, the booking link
// writes itself from the name, the place is a drag of the real map, services arrive priced (edit what you like), hours are
// presets. No password and no email: a code to your phone. The draft survives leaving the page. When it's done the
// salon joins the directory, the map and its own booking page on this device.
import { $, $$, ar, icon, money, snackbar, boot, getSection, userStore, catArt } from './shell.js';
import { SECTIONS, CATEGORIES, DISTRICTS, ME, MY_KEY } from './data.js';
import { coverArt } from './art.js';
import { setLoading, copyText } from './m3.js';
import { spring, blurIn } from './motion.js';
import { realMap, prefetchMap } from './map.js';

// The whole screen is one function: a full page load runs it once; moving between screens in place (js/vt.js)
// calls it again on the fresh markup, without downloading or re-evaluating this file.
export default function mount() {
  const DRAFT = 'molu_join_draft';
  const LINK = 'molu-app.com/b/';
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
  const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  let d = read(DRAFT) || { step: 0, section: getSection(), kind: '', name: '', lat: ME.lat, lng: ME.lng, district: '', areas: [], fee: 30, services: [], hours: 'day', friday: true, team: 1, owner: '', phone: '' };
  boot({ page: 'join', nav: false, section: d.section });
  const F = () => d.section === 'eve';
  const g = (f, m) => (F() ? f : m);
  const save = () => write(DRAFT, d);
  let rm = null; // live map on the place step

  // Arabic or English name → a clean link
  const TR = { ا: 'a', أ: 'a', إ: 'e', آ: 'a', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh', د: 'd', ذ: 'th', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z', ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', ة: 'a', و: 'w', ي: 'y', ى: 'a', ئ: 'e', ؤ: 'o', ء: '' };
  const slugify = (s) => [...s.trim().toLowerCase()].map((c) => TR[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'salon';
  const nearest = (lat, lng) => DISTRICTS.reduce((b, x) => { const dd = (x[1] - lat) ** 2 + (x[2] - lng) ** 2; return dd < b[1] ? [x[0], dd] : b; }, ['', Infinity])[0];
  const AREAS = [...new Set(DISTRICTS.map((x) => x[0]))];
  const hash = (s) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  const HOURS = {
    day: { label: 'كل يوم 10 ص – 11 م', sub: 'الأكثر شيوعاً' },
    split: { label: 'فترتين: 9 ص – 12 م و 4 م – 11 م', sub: 'صباحي ومسائي' },
    evening: { label: 'مسائي: 4 م – 12 ص', sub: 'بعد العصر لين نص الليل' },
  };
  const on = () => d.services.filter((x) => x.on);

  // ---------- steps ----------
  const STEPS = [
    { // 0 · which side
      title: () => 'وش تقدّم؟', auto: true,
      body: () => `<div class="j-cards two">${['eve', 'adam'].map((k) => `
        <button type="button" class="j-card who-${k}${d.section === k ? ' on' : ''}" data-pick="section" data-v="${k}">
          <img src="${SECTIONS[k].img}-560.webp" alt="" width="96" height="96"><b>${k === 'eve' ? 'صالون نسائي' : 'حلاق رجالي'}</b><small>${k === 'eve' ? 'صالون، مركز تجميل، أو مستقلة' : 'حلاق، مركز عناية، أو مستقل'}</small></button>`).join('')}</div>`,
      ok: () => !!d.section,
    },
    { // 1 · shop or home visits
      title: () => g('وين تشتغلين؟', 'وين تشتغل؟'), auto: true,
      body: () => `<div class="j-cards">
        <button type="button" class="j-card row${d.kind === 'centre' ? ' on' : ''}" data-pick="kind" data-v="centre"><span class="ic">${icon('storefront', 30)}</span><span class="grow"><b>${g('عندي صالون', 'عندي محل')}</b><small>${g('العميلات يجونكِ', 'العملاء يجونك')}</small></span>${icon('chevron_left', 22)}</button>
        <button type="button" class="j-card row${d.kind === 'home' ? ' on' : ''}" data-pick="kind" data-v="home"><span class="ic">${icon('home_work', 30)}</span><span class="grow"><b>${g('أزور العميلات في بيوتهن', 'أزور العملاء في بيوتهم')}</b><small>${g('مستقلة، بدون محل', 'مستقل، بدون محل')}</small></span>${icon('chevron_left', 22)}</button>
      </div>`,
      ok: () => !!d.kind,
    },
    { // 2 · name → link
      title: () => d.kind === 'home' ? g('باسم وش تبين العميلات يعرفونكِ؟', 'باسم وش تبي العملاء يعرفونك؟') : g('وش اسم صالونكِ؟', 'وش اسم محلّك؟'),
      body: () => `<label class="j-input"><input id="name" maxlength="40" autocomplete="organization" placeholder="${g('صالون لمسة', 'حلاق الفخامة')}" value="${esc(d.name)}"></label>
        <p class="j-link">${icon('link', 20)}<span>رابط صفحتك</span><b dir="ltr" id="slug">${LINK}${slugify(d.name || g('lamsa', 'fakhama'))}</b></p>
        <p class="j-hint">تحطه في الإنستقرام والسناب والواتساب، ويحجز منه العميل بنفسه.</p>`,
      mount: () => {
        const i = $('#name'); setTimeout(() => i.focus(), 250);
        i.addEventListener('input', () => { d.name = i.value; $('#slug').textContent = LINK + slugify(d.name || g('lamsa', 'fakhama')); preview(); save(); });
        i.addEventListener('keydown', (e) => e.key === 'Enter' && next());
      },
      ok: () => d.name.trim().length >= 2 || (snackbar('اكتب الاسم'), false),
    },
    { // 3 · where
      title: () => d.kind === 'home' ? g('وين تغطين؟', 'وين تغطي؟') : 'وين مكانك؟',
      body: () => d.kind === 'home' ? `
        <p class="j-hint" style="margin-top:0">اختر الأحياء اللي تزورها. تقدر تزيد عليها بعدين.</p>
        <div class="j-chips">${AREAS.map((a) => `<button type="button" class="chip${d.areas.includes(a) ? ' on' : ''}" data-area="${a}">${a}</button>`).join('')}</div>
        <div class="j-row"><span class="grow"><b>رسوم الزيارة</b><small>تظهر للعميل قبل ما يأكد الحجز</small></span>${stepper('fee', d.fee, 'ر.س')}</div>` : `
        <p class="j-hint" style="margin-top:0">حرّك الخريطة لين يصير الدبوس على باب ${g('الصالون', 'المحل')}.</p>
        <div class="j-map"><div class="map-host" id="pick-map"></div><span class="j-pin" aria-hidden="true">${icon('location_on_f', 46)}</span></div>
        <p class="j-place">${icon('near_me', 20)}<b id="dist">${d.district || nearest(d.lat, d.lng)}</b><span>، الرياض</span></p>`,
      mount: () => {
        if (d.kind === 'home') return;
        const host = $('#pick-map');
        realMap(host, { salons: [] }).then((m) => {
          rm = m; m.map.setView([d.lat, d.lng], 15.5, { animate: false });
          m.map.on('move', () => host.parentElement.classList.add('moving'));
          m.map.on('moveend', () => {
            host.parentElement.classList.remove('moving');
            const c = m.map.getCenter(); d.lat = +c.lat.toFixed(5); d.lng = +c.lng.toFixed(5); d.district = nearest(d.lat, d.lng);
            $('#dist').textContent = d.district; preview(); save();
          });
        }).catch(() => { host.innerHTML = '<p class="j-hint" style="padding:20px">تعذّر تحميل الخريطة — نكمل بموقع تقريبي وتعدّله بعدين.</p>'; });
        d.district ||= nearest(d.lat, d.lng);
      },
      ok: () => {
        if (d.kind === 'home') {
          if (!d.areas.length) return snackbar('اختر حي واحد على الأقل'), false;
          const pts = DISTRICTS.filter((x) => d.areas.includes(x[0]));
          d.lat = +(pts.reduce((s, x) => s + x[1], 0) / pts.length).toFixed(5); d.lng = +(pts.reduce((s, x) => s + x[2], 0) / pts.length).toFixed(5);
          d.district = d.areas[0];
        }
        return true;
      },
    },
    { // 4 · services, already priced
      title: () => g('وش تقدّمين؟', 'وش تقدّم؟'),
      body: () => `<p class="j-hint" style="margin-top:0">اختر الأقسام، وجهّزنا لك الخدمات بأسعار السوق. عدّل السعر أو شيل اللي ما تقدّمه.</p>
        <div class="j-cats">${CATEGORIES[d.section].map((c) => `<button type="button" class="j-cat${d.services.some((x) => x.cat === c.id) ? ' on' : ''}" data-cat="${c.id}"><span>${catArt(d.section, c.id, 34)}</span>${c.name}</button>`).join('')}</div>
        <div id="svc">${svcList()}</div>`,
      ok: () => on().length > 0 || (snackbar('اختر خدمة وحدة على الأقل'), false),
    },
    { // 5 · hours + team
      title: () => 'متى تفتح؟',
      body: () => `<div class="j-cards">${Object.entries(HOURS).map(([k, h]) => `
        <button type="button" class="j-card row slim${d.hours === k ? ' on' : ''}" data-pick="hours" data-v="${k}"><span class="grow"><b>${h.label}</b><small>${h.sub}</small></span><i class="tick">${icon('check', 18)}</i></button>`).join('')}</div>
        <label class="j-row"><span class="grow"><b>الجمعة من 4 م</b><small>${d.friday ? 'تفتح بعد الصلاة' : 'الجمعة إجازة'}</small></span><span class="switch"><input type="checkbox" id="fri"${d.friday ? ' checked' : ''}><span class="track"><span class="thumb">${icon('check', 14)}</span></span></span></label>
        <div class="j-row"><span class="grow"><b>${g('كم وحدة تشتغل معكِ؟', 'كم واحد يشتغل معك؟')}</b><small id="team-l">${teamLabel()}</small></span>${stepper('team', d.team, '')}</div>`,
      mount: () => $('#fri').addEventListener('change', (e) => { d.friday = e.target.checked; e.target.closest('.j-row').querySelector('small').textContent = d.friday ? 'تفتح بعد الصلاة' : 'الجمعة إجازة'; save(); }),
      ok: () => true,
    },
    { // 6 · phone + code (no password, no email)
      title: () => 'آخر خطوة',
      body: () => `<p class="j-hint" style="margin-top:0">نرسل لك رمز تحقق، وتدخل لوحتك فيه كل مرة. بدون كلمة مرور.</p>
        <label class="j-input"><input id="owner" autocomplete="given-name" placeholder="اسمك" value="${esc(d.owner)}"></label>
        <label class="phone-field"><span>+966</span><input id="phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="5X XXX XXXX" maxlength="11" value="${d.phone}"></label>
        <p class="j-hint">بالمتابعة توافق على الشروط وسياسة الخصوصية. ما نأخذ أي عمولة على حجوزاتك.</p>`,
      mount: () => { $('#owner').addEventListener('input', (e) => { d.owner = e.target.value; save(); }); $('#phone').addEventListener('input', (e) => { d.phone = e.target.value; save(); }); if (!d.owner) setTimeout(() => $('#owner').focus(), 250); },
      cta: 'أرسل الرمز',
      ok: async () => {
        d.phone = $('#phone').value.replace(/\D/g, '').replace(/^0/, ''); d.owner = $('#owner').value.trim();
        if (!d.owner) return snackbar('اكتب اسمك'), false;
        if (!/^5\d{8}$/.test(d.phone)) return snackbar('الرقم يبدأ بـ 5 ومكوّن من 9 أرقام'), false;
        setLoading($('#next'), true); await wait(650); setLoading($('#next'), false);
        return code();
      },
    },
  ];

  // ---------- pieces ----------
  function esc(s) { return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const stepper = (k, v, unit) => `<span class="j-step" data-step="${k}"><button type="button" data-d="-1" aria-label="أقل">${icon('remove', 20)}</button><b>${ar(v)}${unit ? ` <small>${unit}</small>` : ''}</b><button type="button" data-d="1" aria-label="أكثر">${icon('add', 20)}</button></span>`;
  const teamLabel = () => d.team === 1 ? g('أنتِ لحالكِ', 'أنت لحالك') : `${ar(d.team)} ${d.team > 2 && d.team < 11 ? 'أشخاص' : 'شخص'} مع${g('كِ', 'ك')}`;
  function svcList() {
    const cats = CATEGORIES[d.section].filter((c) => d.services.some((x) => x.cat === c.id));
    if (!cats.length) return `<p class="j-empty">${icon('touch_app', 22)}اختر قسم من فوق</p>`;
    return cats.map((c) => `<section class="j-svc"><h3>${c.name}</h3>${d.services.map((x, k) => [x, k]).filter(([x]) => x.cat === c.id).map(([x, k]) => `
      <div class="j-srow${x.on ? '' : ' off'}"><button type="button" class="j-check" data-svc="${k}" aria-pressed="${x.on}" aria-label="${x.name}">${icon('check', 16)}</button>
        <span class="grow"><b>${x.name}</b><small>${ar(x.minutes)} دقيقة</small></span>${stepper('price:' + k, x.price, 'ر.س')}</div>`).join('')}</section>`).join('');
  }
  function preview() {
    const box = $('#preview');
    if (i < 2 || i > 5) { box.hidden = true; return; }
    const svc = on(), from = svc.length ? Math.min(...svc.map((x) => x.price)) : 0;
    box.hidden = false;
    box.innerHTML = `<span class="thumb">${coverArt({ art: hash(d.name || 'x'), section: d.section })}</span>
      <span class="grow"><b>${esc(d.name) || `<span class="muted">${g('اسم صالونكِ', 'اسم محلّك')}</span>`}</b><small>${[d.kind === 'home' ? g('تزور البيوت', 'يزور البيوت') : d.district, from ? `من ${money(from)}` : ''].filter(Boolean).join(' · ') || 'هكذا يشوفك العملاء'}</small></span>
      <span class="j-new">جديد</span>`;
  }

  // ---------- flow ----------
  let i = Math.min(d.step || 0, STEPS.length - 1);
  function render(dir = 1) {
    rm?.destroy(); rm = null;
    const s = STEPS[i];
    document.body.dataset.section = d.section;
    $('.j-prog i').style.width = `${((i + 1) / (STEPS.length + 1)) * 100}%`;
    $('.j-prog').setAttribute('aria-valuenow', i + 1);
    $('#count').textContent = `${ar(i + 1)} من ${ar(STEPS.length)}`;
    $('#step').innerHTML = `<h1>${s.title()}</h1>${s.body()}`;
    $('#next').hidden = !!s.auto; $('#next').textContent = s.cta || 'متابعة';
    s.mount?.();
    preview();
    blurIn($('#step'), { y: dir > 0 ? 22 : -14 });
    d.step = i; save();
  }
  async function next() {
    const s = STEPS[i];
    if (!(await s.ok())) { spring($('#next'), [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], 'bouncy'); return; }
    if (i < STEPS.length - 1) { i++; render(1); }
  }
  $('#next').addEventListener('click', next);
  $('#back').addEventListener('click', () => { if (i > 0) { i--; render(-1); } else location.href = 'business.html'; });

  // taps: choices auto-advance; chips, checks and steppers update in place
  $('#step').addEventListener('click', (e) => {
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      const k = pick.dataset.pick, v = pick.dataset.v;
      if (k === 'section' && v !== d.section) { d.section = v; d.services = []; }
      d[k] = v;
      $$(`[data-pick="${k}"]`).forEach((b) => b.classList.toggle('on', b === pick));
      spring(pick, [{ transform: 'scale(.96)' }, { transform: 'none' }], 'bouncy');
      save();
      if (STEPS[i].auto) setTimeout(() => { i++; render(1); }, 260);
      return;
    }
    const area = e.target.closest('[data-area]');
    if (area) { const a = area.dataset.area; d.areas = d.areas.includes(a) ? d.areas.filter((x) => x !== a) : [...d.areas, a]; area.classList.toggle('on'); save(); return; }
    const cat = e.target.closest('[data-cat]');
    if (cat) {
      const id = cat.dataset.cat, had = d.services.some((x) => x.cat === id);
      d.services = had ? d.services.filter((x) => x.cat !== id) : [...d.services, ...CATEGORIES[d.section].find((c) => c.id === id).services.map(([name, minutes, price]) => ({ cat: id, name, minutes, price, on: true }))];
      cat.classList.toggle('on', !had);
      spring($('span', cat), [{ transform: 'scale(.8)' }, { transform: 'none' }], 'bouncy');
      $('#svc').innerHTML = svcList(); if (!had) blurIn($('#svc'), { y: 12 });
      preview(); save(); return;
    }
    const chk = e.target.closest('[data-svc]');
    if (chk) { const x = d.services[+chk.dataset.svc]; x.on = !x.on; chk.setAttribute('aria-pressed', x.on); chk.closest('.j-srow').classList.toggle('off', !x.on); preview(); save(); return; }
    const btn = e.target.closest('.j-step button');
    if (btn) {
      const box = btn.closest('.j-step'), [k, idx] = box.dataset.step.split(':'), dd = +btn.dataset.d;
      let v;
      if (k === 'price') { const x = d.services[+idx]; x.price = Math.max(5, x.price + dd * 5); v = [x.price, 'ر.س']; }
      else if (k === 'fee') { d.fee = Math.max(0, Math.min(300, d.fee + dd * 5)); v = [d.fee, 'ر.س']; }
      else { d.team = Math.max(1, Math.min(15, d.team + dd)); v = [d.team, '']; $('#team-l').textContent = teamLabel(); }
      $('b', box).innerHTML = `${ar(v[0])}${v[1] ? ` <small>${v[1]}</small>` : ''}`;
      spring($('b', box), [{ transform: `translateY(${dd > 0 ? 6 : -6}px)`, opacity: 0.4 }, { transform: 'none', opacity: 1 }], 'snappy');
      preview(); save();
    }
  });

  // ---------- code → done ----------
  function code() {
    return new Promise((resolve) => {
      $('#next').hidden = true;
      $('#step').innerHTML = `<h1>اكتب الرمز</h1><p class="j-hint" style="margin-top:0">أرسلناه إلى <b dir="ltr">+966 ${d.phone.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3')}</b></p>
        <div class="otp">${[0, 1, 2, 3].map((k) => `<input inputmode="numeric" autocomplete="${k ? 'off' : 'one-time-code'}" maxlength="1" aria-label="الرقم ${k + 1}">`).join('')}</div>
        <p class="j-hint" style="text-align:center">نسخة تجريبية: أي 4 أرقام تمشي</p>`;
      blurIn($('#step'), { y: 22 });
      const boxes = $$('.otp input'); boxes[0].focus();
      boxes.forEach((b, k) => {
        b.addEventListener('input', () => {
          const v = b.value.replace(/\D/g, '');
          if (v.length > 1) v.split('').slice(0, 4).forEach((c, j) => (boxes[j].value = c)); else b.value = v;
          if (b.value) boxes[Math.min(3, k + 1)].focus();
          if (boxes.every((x) => x.value)) { finish(); resolve(false); }
        });
        b.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !b.value && k) boxes[k - 1].focus(); });
      });
    });
  }

  function finish() {
    const svc = on();
    const me = { section: d.section, kind: d.kind, name: d.name.trim(), slug: slugify(d.name), lat: d.lat, lng: d.lng, district: d.district, areas: d.areas, fee: d.fee,
      services: svc.map(({ cat, name, minutes, price }) => ({ cat, name, minutes, price })), hours: { id: d.hours, label: HOURS[d.hours].label, friday: d.friday }, team: d.team,
      owner: d.owner, phone: d.phone, createdAt: Date.now() };
    write(MY_KEY, me);
    userStore.set({ name: d.owner, phone: d.phone, section: d.section, role: 'owner' });
    write(DRAFT, null);
    done(me);
  }

  function done(me) {
    const plan = d.kind === 'home' && d.team === 1 ? [g('المستقلة', 'المستقل'), 99] : d.team <= 3 ? ['الاحترافية', 149] : ['الأعمال', 299];
    const url = LINK + me.slug, from = Math.min(...me.services.map((x) => x.price));
    document.body.classList.add('j-done');
    $('.j-prog i').style.width = '100%'; $('#count').textContent = '';
    $('#preview').hidden = true;
    $('#step').innerHTML = `
      <div class="j-tick">${icon('check', 44)}</div>
      <h1 style="text-align:center">${g('صفحتكِ جاهزة', 'صفحتك جاهزة')}</h1>
      <p class="j-hint" style="text-align:center;margin-top:-4px">${g('وصرتِ تطلعين', 'وصرت تطلع')} للعملاء في الدليل والخريطة${d.kind === 'home' ? ` في ${me.areas.join('، ')}` : ` في ${me.district}`}.</p>
      <a class="j-made pressable" href="salon.html?id=mine"><span class="thumb">${coverArt({ art: hash(me.name), section: me.section })}</span><span class="grow"><b>${esc(me.name)}</b><small>${me.district} · ${ar(me.services.length)} خدمة · من ${money(from)}</small></span><span class="j-new">جديد</span></a>
      <div class="j-linkbox"><b dir="ltr">${url}</b><button type="button" class="btn btn-black btn-sm pressable" id="copy">${icon('content_copy', 18)}انسخ</button></div>
      <div class="mini-map" id="done-map"></div>
      <div class="j-trial">${icon('workspace_premium', 24)}<span class="grow"><b>تجربتك المجانية بدأت: 14 يوم بكل المزايا</b><small>بدون بطاقة وبدون عمولة. بعدها ننصحك بـ«${plan[0]}» بـ ${ar(plan[1])} ر.س شهرياً، أو تكمّل على المجانية (40 حجز بالشهر).</small></span></div>
      <ol class="j-next"><li>${icon('photo_camera', 20)}أضف صور ${g('صالونكِ', 'محلّك')} وشغلك</li><li>${icon('share', 20)}حط الرابط في البايو وفي الواتساب</li><li>${icon('qr_code_2', 20)}اطبع ملصق QR وحطه عند الكاشير</li></ol>
      <div class="j-actions"><a class="btn btn-black btn-lg btn-block pressable" href="salon.html?id=mine">${g('شوفي صفحتكِ', 'شوف صفحتك')}</a><a class="btn btn-tonal btn-lg btn-block pressable" href="business.html#pricing">قارن الباقات</a></div>`;
    $('#next').hidden = true;
    spring($('.j-tick'), [{ transform: 'scale(.3) rotate(-30deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], 'bouncy');
    blurIn($('#step'), { y: 22 });
    $('#copy').onclick = () => copyText('https://' + url, 'نسخنا رابط صفحتك ✓');
    realMap($('#done-map'), { salons: [{ id: 'mine', name: me.name, lat: me.lat, lng: me.lng }], activeId: 'mine', interactive: false }).catch(() => $('#done-map').remove());
  }

  prefetchMap();
  render();
}
if (!window.__softnav) mount();
