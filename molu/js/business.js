// For business — a merchant page in the manner of Uber Eats': a black hero with the sign-up form right in it
// (type of place, its name, a phone number → the sign-up opens with all three filled in), three facts, why join,
// three steps, plans side by side, questions, and a closing call to action. Black and white, bold type, green ticks.
import { boot, $, $$, ar, icon, getSection, catArt, snackbar } from './shell.js';
import { PLANS, CATEGORIES, salonById } from './data.js';
import { initSegmented } from './m3.js';
import { spring } from './motion.js';

export default function mount() {
  let section = getSection();
  boot({ page: 'home', section, nav: false });
  document.body.classList.add('merchant');
  const mine = salonById('mine');
  const g = (f, m) => (section === 'eve' ? f : m);
  const tick = icon('check_circle_f', 20);
  const FAQ = [
    ['هل يحتاج العميل يحمّل تطبيق؟', 'لا. يفتح رابط صفحتك من أي جوال ويحجز خلال 30 ثانية.'],
    ['هل فيه عمولة على الحجوزات؟', 'لا. اشتراك ثابت فقط، وكل ريال من خدماتك لك.'],
    ['وش يصير بعد الـ 14 يوم المجانية؟', 'إذا ما اشتركت تنتقل للباقة المجانية (40 حجز بالشهر)، وتبقى صفحتك وبياناتك.'],
    ['أقدر أضيف حجوزات الاتصال والحضور؟', 'نعم، من لوحتك بضغطة «+ موعد»، وتظهر مع حجوزات صفحتك في جدول واحد.'],
  ];

  $('#app').innerHTML = `
    <header class="m-bar">
      <a class="m-brand" href="explore.html" aria-label="رجوع للتطبيق">${icon('arrow_back', 20, 'flip-rtl')}<b>مولو</b><span>للأعمال</span></a>
      ${mine ? '<a class="m-bar-btn" href="dashboard.html">لوحتي</a>' : '<a class="m-bar-btn" href="#start">ابدأ</a>'}
    </header>

    <section class="m-hero">
      <div class="m-art"><img id="m-img" alt="" width="628" height="868"></div>
      <h1 id="m-title"></h1>
      <p id="m-sub"></p>
    </section>

    <form class="m-form" id="start" novalidate>
      <h2>${mine ? 'صفحتك شغّالة' : 'ابدأ مجاناً'}</h2>
      ${mine ? `<p class="m-note">${mine.name} · ${mine.district}</p><a class="btn btn-black btn-lg btn-block pressable" href="dashboard.html">افتح لوحتك</a>` : `
      <div class="segmented" role="radiogroup" aria-label="نوع المحل">
        <label><input type="radio" name="type" value="eve"${section === 'eve' ? ' checked' : ''}><span>صالون نسائي</span></label>
        <label><input type="radio" name="type" value="adam"${section === 'adam' ? ' checked' : ''}><span>محل حلاقة</span></label>
      </div>
      <label class="m-field"><span>اسم المحل</span><input id="f-name" maxlength="40" autocomplete="organization"></label>
      <label class="m-field"><span>رقم الجوال</span><span class="m-phone"><i>+966</i><input id="f-phone" type="tel" inputmode="numeric" maxlength="11" autocomplete="tel-national" placeholder="5X XXX XXXX"></span></label>
      <button class="btn btn-black btn-lg btn-block pressable" type="submit">ابدأ ${icon('chevron_left', 20)}</button>
      <p class="m-note">14 يوم مجاناً بكل المزايا · بدون بطاقة · بدون عمولة</p>`}
    </form>

    <section class="m-facts">
      <div><b>٠٪</b><small>عمولة على الحجوزات</small></div>
      <div><b>١٤</b><small>يوم مجاناً</small></div>
      <div><b>٥</b><small>دقائق وتجهز صفحتك</small></div>
    </section>

    <section class="m-sec">
      <h2 class="m-h">ليش تنضم؟</h2>
      <div class="m-why">
        <article><span class="m-pic"><img src="img/icons/fire.webp" alt="" width="96" height="96"></span><b>عملاء جدد يلقونك</b><p>تطلع لكل من يبحث في حيّك، في الدليل وعلى الخريطة.</p></article>
        <article><span class="m-pic"><img src="img/icons/home.webp" alt="" width="96" height="96"></span><b>صفحة حجز باسمك</b><p>رابط واحد للإنستقرام والواتساب وقوقل ماب. يحجزون 24 ساعة.</p></article>
        <article><span class="m-pic"><img src="img/icons/gift.webp" alt="" width="96" height="96"></span><b>غياب أقل، دخل أكثر</b><p>تأكيد وتذكير تلقائي، وعروض وبطاقة ولاء ترجّع عملاءك.</p></article>
      </div>
    </section>

    <section class="m-sec m-gray">
      <h2 class="m-h">كيف تبدأ</h2>
      <ol class="m-steps">
        <li><i>1</i><div><b>سجّل محلّك</b><p>الاسم، الموقع على الخريطة، ورقم جوالك.</p></div></li>
        <li><i>2</i><div><b>أضف خدماتك</b><p>جهّزنا لك الخدمات بأسعار السوق، عدّل اللي تبي.</p></div></li>
        <li><i>3</i><div><b>استقبل الحجوزات</b><p>شارك رابطك، وتابع كل شي من لوحتك.</p></div></li>
      </ol>
      <div class="m-svcs" id="m-svcs"></div>
    </section>

    <section class="m-sec">
      <h2 class="m-h">الباقات</h2>
      <p class="m-lead">كلها تبدأ بـ 14 يوم مجاناً. بدون عمولة، وتلغي متى ما تبي.</p>
      <div class="m-plans">${PLANS.map((p) => `
        <article class="${p.popular ? 'pop' : ''}">
          ${p.popular ? '<em>الأكثر اختياراً</em>' : ''}
          <b>${p.solo ? 'المستقل' : p.name}</b>
          <div class="m-price">${p.month ? `<strong>${ar(p.month)}</strong><small>ر.س / شهر</small>` : '<strong>مجاناً</strong><small>للأبد</small>'}</div>
          <ul>${p.feats.slice(0, 4).map((f) => `<li>${tick}${f}</li>`).join('')}</ul>
          <a class="btn ${p.popular ? 'btn-black' : 'btn-outlined'} btn-block pressable" href="#start" data-plan>اختر ${p.solo ? 'المستقل' : p.name}</a>
        </article>`).join('')}</div>
    </section>

    <section class="m-sec">
      <h2 class="m-h">أسئلة شائعة</h2>
      <div class="m-faq">${FAQ.map(([q, a]) => `<details><summary>${q}${icon('expand_more', 22)}</summary><p>${a}</p></details>`).join('')}</div>
    </section>

    <section class="m-end">
      <h2>جاهز تملأ جدولك؟</h2>
      <a class="btn btn-lg pressable" href="#start">ابدأ مجاناً</a>
    </section>`;

  function paint() {
    $('#m-img').src = `img/${section}-full-960.webp`;
    $('#m-title').textContent = g('حجوزات أكثر لصالونك', 'حجوزات أكثر لمحلّك');
    $('#m-sub').textContent = g('عميلاتك يحجزن بأنفسهن من صفحة باسمك، والتذكير يوصلهن تلقائياً.', 'زبائنك يحجزون بأنفسهم من صفحة باسمك، والتذكير يوصلهم تلقائياً.');
    $('#m-svcs').innerHTML = CATEGORIES[section].map((c) => `<span>${catArt(section, c.id, 44)}<small>${c.name}</small></span>`).join('');
  }
  paint();
  initSegmented($('#app'));

  // the type in the form also switches the page's wording and pictures
  $('#app').addEventListener('change', (e) => {
    if (e.target.name !== 'type') return;
    section = e.target.value;
    spring($('.m-art'), [{ opacity: 0.3, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], 'gentle');
    paint();
  });
  // in-page links to the form: scroll to it and put the cursor in the first field
  $('#app').addEventListener('click', (e) => {
    const a = e.target.closest('a[href="#start"]'); if (!a) return;
    e.preventDefault();
    $('#start').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => $('#f-name')?.focus({ preventScroll: true }), 450);
  });
  $('#start').addEventListener('submit', (e) => {
    e.preventDefault();
    if (mine) return;
    const name = $('#f-name').value.trim(), phone = $('#f-phone').value.replace(/\D/g, '').replace(/^0/, '');
    if (name.length < 2) { snackbar('اكتب اسم المحل'); $('#f-name').focus(); return; }
    if (phone && !/^5\d{8}$/.test(phone)) { snackbar('الرقم يبدأ بـ 5 ومكوّن من 9 أرقام'); $('#f-phone').focus(); return; }
    const q = new URLSearchParams({ s: section, name }); if (phone) q.set('phone', phone);
    location.href = `join.html?${q}`;
  });
}
if (!window.__softnav) mount();
