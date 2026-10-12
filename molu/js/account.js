import { boot, $, $$, ar, icon, getSection, setSection, favs, appts, snackbar, userStore, faceImg } from './shell.js';
import { SECTIONS, salonById } from './data.js';
import { setLoading } from './m3.js';
import { spring, blurIn } from './motion.js';

// The whole screen is one function: a full page load runs it once; moving between screens in place (js/vt.js)
// calls it again on the fresh markup, without downloading or re-evaluating this file.
export default function mount() {
  let section = boot({ page: 'account' });
  const owner = location.hash === '#owner';
  if (owner) location.replace('join.html'); // salons and barbers sign up in their own flow
  const F = () => section === 'eve';
  const fmtPhone = (p) => `+966 ${p.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3')}`;
  const shake = (el) => spring(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 'bouncy');
  const show = (html) => { $('#app').innerHTML = html; blurIn($('#app').firstElementChild, { y: 18 }); };
  let phone = '';

  // 1 · phone (one field, one button)
  function stepPhone() {
    show(`<div class="stack" style="padding-top:28px">
      <h1 style="font:800 1.8rem/1.3 var(--md-font)">${owner ? 'سجّل صالونك في مولو' : 'وش رقم جوالك؟'}</h1>
      <p class="muted">${owner ? 'نبدأ برقم جوالك، وبعدها نجهّز صفحتك.' : 'نرسل لك رمز تحقق — بدون كلمة مرور.'}</p>
      <label class="phone-field"><span>+966</span><input id="phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="5X XXX XXXX" maxlength="11" value="${phone}"></label>
      <button class="btn btn-black btn-lg btn-block pressable" type="button" id="next">متابعة</button>
      <p class="muted" style="font-size:.8rem;text-align:center">بالمتابعة توافق على الشروط وسياسة الخصوصية.</p>
    </div>`);
    const input = $('#phone');
    setTimeout(() => input.focus(), 300);
    const go = async () => {
      phone = input.value.replace(/\D/g, '').replace(/^0/, '');
      if (!/^5\d{8}$/.test(phone)) { snackbar('الرقم يبدأ بـ 5 ومكوّن من 9 أرقام'); shake(input.parentElement); input.focus(); return; }
      setLoading($('#next'), true);
      await new Promise((r) => setTimeout(r, 650));
      stepCode();
    };
    $('#next').onclick = go;
    input.onkeydown = (e) => e.key === 'Enter' && go();
  }

  // 2 · code (auto-advances, auto-submits)
  function stepCode() {
    show(`<div class="stack" style="padding-top:28px">
      <h1 style="font:800 1.8rem/1.3 var(--md-font)">اكتب الرمز</h1>
      <p class="muted">أرسلناه إلى <b dir="ltr" style="color:var(--md-on-surface)">${fmtPhone(phone)}</b> · <button class="btn-text" style="border:0;background:none;font:inherit;color:var(--md-primary);cursor:pointer;padding:0" id="edit">تعديل</button></p>
      <div class="otp">${[0, 1, 2, 3].map((i) => `<input inputmode="numeric" autocomplete="${i ? 'off' : 'one-time-code'}" maxlength="1" aria-label="الرقم ${i + 1}">`).join('')}</div>
      <p class="muted" style="text-align:center;font-size:.84rem">نسخة تجريبية: أي 4 أرقام تمشي · <span id="rs">إعادة الإرسال بعد <b id="t">30</b> ث</span></p>
    </div>`);
    const boxes = $$('.otp input');
    boxes[0].focus();
    boxes.forEach((b, i) => {
      b.addEventListener('input', () => {
        const d = b.value.replace(/\D/g, '');
        if (d.length > 1) d.split('').slice(0, 4).forEach((c, k) => (boxes[k].value = c)); else b.value = d;
        if (b.value) { spring(b, [{ transform: 'scale(.85)' }, { transform: 'none' }], 'bouncy'); boxes[Math.min(3, i + 1)].focus(); }
        if (boxes.every((x) => x.value)) verify(boxes);
      });
      b.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !b.value && i) boxes[i - 1].focus(); });
    });
    let t = 30;
    const tm = setInterval(() => { const el = $('#t'); if (!el) return clearInterval(tm); el.textContent = --t; if (!t) { clearInterval(tm); $('#rs').innerHTML = '<button type="button" style="border:0;background:none;font:inherit;color:var(--md-primary);cursor:pointer;padding:0">أرسل رمز جديد</button>'; $('#rs button').onclick = () => snackbar('أرسلنا رمز جديد'); } }, 1000);
    $('#edit').onclick = () => { clearInterval(tm); stepPhone(); };
  }
  async function verify(boxes) {
    boxes.forEach((b, i) => spring(b, [{ transform: 'none' }, { transform: 'translateY(-8px)' }, { transform: 'none' }], 'bouncy', { delay: i * 0.06 }));
    await new Promise((r) => setTimeout(r, 600));
    stepName();
  }

  // 3 · name + section (first time only)
  function stepName() {
    show(`<div class="stack" style="padding-top:28px">
      <h1 style="font:800 1.8rem/1.3 var(--md-font)">آخر خطوة</h1>
      <div class="field"><span class="lbl">اسمك</span><input id="name" autocomplete="given-name" placeholder="الاسم الأول"></div>
      <div class="who" role="radiogroup" aria-label="القسم">${['eve', 'adam'].map((k) => `
        <label class="${k}"><input type="radio" name="who" value="${k}"${k === section ? ' checked' : ''}><img src="${SECTIONS[k].img}-560.webp" alt="" width="84" height="84"><b>${SECTIONS[k].name}</b><small>${SECTIONS[k].for}</small></label>`).join('')}</div>
      <button class="btn btn-black btn-lg btn-block pressable" type="button" id="finish">ابدأ</button>
    </div>`);
    $('#name').focus();
    $('.who').onchange = (e) => { section = e.target.value; setSection(section); document.body.dataset.section = section; };
    $('#finish').onclick = () => {
      const name = $('#name').value.trim();
      if (!name) { snackbar('اكتب اسمك'); shake($('#name')); return; }
      userStore.set({ name, phone, section, role: owner ? 'owner' : 'client' });
      snackbar(`${SECTIONS[section].hello} يا ${name} 👋`);
      if (owner) { location.href = 'business.html'; return; }
      profile(true);
    };
  }

  // signed in
  function profile(fresh = false) {
    const u = userStore.get(), mine = salonById('mine');
    const up = appts.upcoming().length, fv = favs.list().length;
    $('#app').innerHTML = `
      <header class="page-h"><h1>حسابي</h1></header>
      <div class="acc-card" id="pc">${faceImg(section)}<div class="grow"><b style="font:800 1.25rem var(--md-font)">${u.name}</b><div class="muted" dir="ltr" style="text-align:end">${fmtPhone(u.phone)}</div></div></div>
      <div class="list-card">
        <a href="appointments.html"><span class="ic">${icon('calendar_month', 22)}</span>مواعيدي<span class="end">${up ? `${ar(up)} قادمة` : ''}${icon('chevron_left', 20)}</span></a>
        <a href="favorites.html"><span class="ic">${icon('favorite', 22)}</span>المفضلة<span class="end">${fv ? ar(fv) : ''}${icon('chevron_left', 20)}</span></a>
        <button type="button" id="sec"><span class="ic">${icon('wc', 22)}</span>القسم<span class="end">${SECTIONS[section].name} · ${SECTIONS[section].for}${icon('chevron_left', 20)}</span></button>
      </div>
      <div class="list-card">
        <button type="button" id="notif"><span class="ic">${icon('notifications', 22)}</span>التذكيرات<span class="end">قبل الموعد بساعتين${icon('chevron_left', 20)}</span></button>
        <button type="button" id="lang"><span class="ic">${icon('language', 22)}</span>اللغة<span class="end">العربية${icon('chevron_left', 20)}</span></button>
        ${mine ? `<a href="salon.html?id=mine"><span class="ic">${icon('storefront', 22)}</span>${mine.name}<span class="end">صفحتي${icon('chevron_left', 20)}</span></a>` : `<a href="join.html"><span class="ic">${icon('storefront', 22)}</span>سجّل صالونك<span class="end">مجاناً${icon('chevron_left', 20)}</span></a>`}
        <button type="button" id="out"><span class="ic" style="color:#D93025">${icon('logout', 22)}</span>تسجيل الخروج</button>
      </div>`;
    $('.acc-card .face').style.cssText = 'width:64px;height:64px';
    $('#sec').onclick = () => {
      const go = () => { section = section === 'eve' ? 'adam' : 'eve'; setSection(section); document.body.dataset.section = section; userStore.set({ ...u, section }); profile(); };
      go();
    };
    $('#notif').onclick = () => snackbar('نذكّرك قبل كل موعد بساعتين برسالة نصية');
    $('#lang').onclick = () => snackbar('English — قريباً');
    $('#out').onclick = () => { userStore.set(null); snackbar('سجّلت خروجك'); stepPhone(); };
    if (fresh) spring($('#pc'), [{ transform: 'scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], 'bouncy');
  }

  userStore.get() && !owner ? profile() : stepPhone();
}
if (!window.__softnav) mount();
