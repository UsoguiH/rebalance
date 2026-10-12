// لأصحاب المحلات — an app screen in محلي's language (not a website): an orange promo card with a 3D icon, tiles for
// what you get, the steps as a tracking timeline, plans in a carousel with a monthly/yearly switch, questions as list
// rows that open a sheet, and one orange button fixed at the bottom.
import { boot, $, $$, ar, icon, getSection, secSwitch, swap } from './shell.js';
import { PLANS, salonById } from './data.js';
import { initSegmented, openSheet } from './m3.js';
import { spring } from './motion.js';

export default function mount() {
  let section = getSection(), yearly = false;
  boot({ page: 'home', section, nav: false });
  document.body.classList.add('biz');
  const mine = salonById('mine');
  const g = (f, m) => (section === 'eve' ? f : m);
  const FAQ = [
    ['هل يحتاج العميل يحمّل تطبيق؟', 'لا. يفتح رابط صفحتك من أي جوال ويحجز خلال 30 ثانية.'],
    ['فيه عمولة على الحجوزات؟', 'لا. اشتراك ثابت فقط، وكل ريال من خدماتك لك.'],
    ['وش يصير بعد الـ 14 يوم؟', 'إذا ما اشتركت تنتقل للباقة المجانية (40 حجز بالشهر)، وتبقى صفحتك وبياناتك.'],
    ['أقدر أضيف حجوزات الاتصال والحضور؟', 'نعم، من لوحتك بضغطة «+ موعد»، وتظهر مع حجوزات صفحتك في جدول واحد.'],
  ];
  const join = (home) => `join.html?s=${section}${home ? '&kind=home' : ''}`;

  $('#app').innerHTML = `
    <header class="b-top">
      <a class="round pressable" href="account.html" aria-label="رجوع">${icon('arrow_back', 22, 'flip-rtl')}</a>
      <h1>لأصحاب المحلات</h1>
      <div id="sec"></div>
    </header>
    <div id="b-body"></div>`;

  function paint() {
    $('#b-body').innerHTML = `
      <a class="b-promo pressable" href="${mine ? 'dashboard.html' : join(false)}">
        <span class="b-promo-t">
          <em>${mine ? 'صفحتك شغّالة' : 'بدون عمولة'}</em>
          <b>${mine ? mine.name : g('سجّلي صالونك واستقبلي الحجوزات', 'سجّل محلّك واستقبل الحجوزات')}</b>
          <small>${mine ? 'حجوزاتك وخدماتك وفريقك في مكان واحد' : '14 يوم مجاناً · جاهز خلال 5 دقائق'}</small>
          <span class="b-promo-btn">${mine ? 'افتح لوحتك' : 'ابدأ الآن'}${icon('chevron_left', 18)}</span>
        </span>
        <img src="img/icons/home.webp" alt="" width="132" height="132">
      </a>

      <section class="sec"><div class="sec-h"><h2>وش تحصل</h2></div>
        <div class="b-tiles">
          <div><img src="img/icons/fire.webp" alt="" width="56" height="56"><b>عملاء جدد</b><small>تطلع في الدليل والخريطة</small></div>
          <div><img src="img/icons/home.webp" alt="" width="56" height="56"><b>صفحة باسمك</b><small>رابط للإنستقرام وقوقل ماب</small></div>
          <div><img src="img/icons/gift.webp" alt="" width="56" height="56"><b>عروض وولاء</b><small>ترجّع عملاءك</small></div>
          <div><img src="img/icons/offer.webp" alt="" width="56" height="56"><b>بدون عمولة</b><small>اشتراك ثابت فقط</small></div>
        </div>
      </section>

      <section class="sec"><div class="sec-h"><h2>تبدأ في دقيقتين</h2></div>
        <ol class="b-track">
          <li><i>١</i><span><b>${g('سجّلي صالونك', 'سجّل محلّك')}</b><small>الاسم، الموقع، ورقم جوالك</small></span></li>
          <li><i>٢</i><span><b>أضف خدماتك</b><small>جاهزة بأسعار السوق، عدّل اللي تبي</small></span></li>
          <li><i>٣</i><span><b>استقبل الحجوزات</b><small>شارك رابطك وتابع من لوحتك</small></span></li>
        </ol>
      </section>

      <section class="sec"><div class="sec-h"><h2>الباقات</h2></div>
        <div class="segmented b-bill" role="radiogroup" aria-label="الدفع">
          <label><input type="radio" name="bill" value="m"${yearly ? '' : ' checked'}><span>شهري</span></label>
          <label><input type="radio" name="bill" value="y"${yearly ? ' checked' : ''}><span>سنوي · شهرين مجاناً</span></label>
        </div>
        <div class="b-plans">${PLANS.map((p) => `
          <article class="${p.popular ? 'pop' : ''}">
            ${p.popular ? '<em>الأكثر اختياراً</em>' : ''}
            <b>${p.solo ? g('المستقلة', 'المستقل') : p.name}</b>
            <div class="b-price">${p.month ? `<strong>${ar(yearly ? p.year : p.month)}</strong><small>ر.س / ${yearly ? 'سنة' : 'شهر'}</small>` : '<strong>مجاناً</strong><small>للأبد</small>'}</div>
            <ul>${p.feats.slice(0, 3).map((f) => `<li>${icon('check', 18)}${f}</li>`).join('')}</ul>
            <a class="btn ${p.popular ? 'btn-filled' : 'btn-tonal'} btn-block pressable" href="${join(!!p.solo)}">${p.month ? 'جرّبها 14 يوم' : 'ابدأ مجاناً'}</a>
          </article>`).join('')}</div>
      </section>

      <a class="b-solo pressable" href="${join(true)}"><span class="ic">${icon('home_work', 22)}</span><span class="grow"><b>${g('تشتغلين في البيوت؟', 'تشتغل في البيوت؟')}</b><small>${g('سجّلي كمستقلة وحددي الأحياء ورسوم الزيارة', 'سجّل كمستقل وحدد الأحياء ورسوم الزيارة')}</small></span>${icon('chevron_left', 20)}</a>

      <section class="sec"><div class="sec-h"><h2>أسئلة</h2></div>
        <div class="list-card">${FAQ.map(([q], k) => `<button type="button" data-faq="${k}"><span class="ic">${icon('info', 22)}</span>${q}<span class="end">${icon('chevron_left', 20)}</span></button>`).join('')}</div>
      </section>`;
    initSegmented($('#b-body'));
    $('#b-cta').href = mine ? 'dashboard.html' : join(false);
    $('#b-cta span').textContent = mine ? 'افتح لوحتك' : g('سجّلي صالونك مجاناً', 'سجّل محلّك مجاناً');
  }

  document.body.insertAdjacentHTML('beforeend', `<div class="b-bar"><a class="btn btn-filled btn-lg btn-block pressable" id="b-cta" href="join.html"><span></span>${icon('chevron_left', 20)}</a></div>
    <div class="sheet" id="faq-sheet" hidden role="dialog" aria-label="سؤال"><div class="handle"></div><div id="faq-body"></div></div>`);
  paint();
  spring($('.b-promo img'), [{ transform: 'scale(.6) rotate(-12deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], 'bouncy', { delay: 0.15 });

  $('#app').addEventListener('change', (e) => {
    if (e.target.name !== 'bill') return;
    yearly = e.target.value === 'y';
    $$('.b-price').forEach((el, k) => {
      const p = PLANS[k]; if (!p.month) return;
      el.innerHTML = `<strong>${ar(yearly ? p.year : p.month)}</strong><small>ر.س / ${yearly ? 'سنة' : 'شهر'}</small>`;
      spring(el, [{ transform: 'translateY(8px)', opacity: 0 }, { transform: 'none', opacity: 1 }], 'bouncy', { delay: k * 0.04 });
    });
  });
  $('#app').addEventListener('click', (e) => {
    const f = e.target.closest('[data-faq]'); if (!f) return;
    const [q, a] = FAQ[+f.dataset.faq];
    $('#faq-body').innerHTML = `<h2 class="title-l">${q}</h2><p class="muted" style="margin:8px 0 18px;font-size:1rem;line-height:1.8">${a}</p><a class="btn btn-filled btn-lg btn-block pressable" href="${join(false)}">${g('سجّلي صالونك', 'سجّل محلّك')}</a>`;
    openSheet($('#faq-sheet'));
  });
  secSwitch($('#sec'), section, (k) => { section = k; swap($('#b-body'), paint); });
}
if (!window.__softnav) mount();
