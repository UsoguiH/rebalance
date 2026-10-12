// لأصحاب الصالونات — for owners. Built to be understood without reading: a short promise, a picture of what you get
// (a booking arriving on your phone, and your own page), three benefits in a few words, three steps, one price line,
// and one button that stays on screen. Plans open in a sheet for those who want the detail.
import { boot, $, $$, ar, icon, getSection, secSwitch, swap, catArt } from './shell.js';
import { PLANS, CATEGORIES, salonById } from './data.js';
import { coverArt } from './art.js';
import { openSheet } from './m3.js';
import { spring } from './motion.js';

export default function mount() {
  let section = getSection();
  boot({ page: 'home', section, nav: false });
  document.body.classList.add('owner');
  const mine = salonById('mine');
  const F = () => section === 'eve';
  const g = (f, m) => (F() ? f : m);

  $('#app').innerHTML = `
    <header class="o-top">
      <a class="round pressable" href="explore.html" aria-label="رجوع">${icon('arrow_back', 22, 'flip-rtl')}</a>
      <div id="sec"></div>
    </header>
    <div id="o-body"></div>`;

  function paint() {
    const S = section, name = g('صالون لمسة', 'حلاق الفخامة'), cats = CATEGORIES[S];
    const join = (home) => `join.html?s=${S}${home ? '&kind=home' : ''}`;
    $('#o-body').innerHTML = `
      ${mine ? `<a class="o-mine pressable" href="dashboard.html">${icon('storefront', 20)}<span class="grow"><b>${mine.name}</b><small>صفحتك شغّالة</small></span><span class="pill-dark">لوحتي</span></a>` : ''}
      <section class="o-hero">
        <span class="o-eyebrow">${g('لأصحاب الصالونات', 'لأصحاب محلات الحلاقة')}</span>
        <h1>${g('حجوزات صالونك', 'حجوزات محلّك')}<br><em>بدون اتصالات</em></h1>
        <p>${g('عميلاتك يحجزن بأنفسهن، 24 ساعة', 'زبائنك يحجزون بأنفسهم، 24 ساعة')}</p>
      </section>

      <div class="o-show" aria-hidden="true">
        <div class="o-page">
          <span class="o-cover">${coverArt({ art: S === 'eve' ? 11 : 23, section: S })}</span>
          <div class="o-page-b"><b>${name}</b><small>${ar(cats.length)} أقسام · ${g('تحجزين', 'تحجز')} بدقيقة</small>
            <div class="o-icons">${cats.slice(0, 4).map((c) => `<span>${catArt(S, c.id, 30)}</span>`).join('')}</div>
            <span class="o-book">${g('احجزي', 'احجز')}</span></div>
        </div>
        <div class="o-ping"><span class="o-ping-ic">${icon('event_available', 20)}</span><span class="grow"><b>حجز جديد</b><small>${g('نورة · استشوار · اليوم 7:30 م', 'فهد · قص وتحديد · اليوم 7:30 م')}</small></span><i>الآن</i></div>
      </div>

      <section class="o-perks">
        <div><span>${icon('schedule', 26)}</span><b>حجز 24 ساعة</b><small>من رابط واحد</small></div>
        <div><span>${icon('notifications_active', 26)}</span><b>تذكير تلقائي</b><small>غياب أقل</small></div>
        <div><span>${icon('percent', 26)}</span><b>بدون عمولة</b><small>كل الريال لك</small></div>
      </section>

      <section class="o-steps">
        <h2>تبدأ في دقيقتين</h2>
        <ol>
          <li><i>١</i><b>${g('اسم صالونك', 'اسم محلّك')}</b></li>
          <li><i>٢</i><b>خدماتك وأسعارك</b></li>
          <li><i>٣</i><b>شارك رابطك</b></li>
        </ol>
      </section>

      <button type="button" class="o-price pressable" id="plans">
        <span class="grow"><b>مجاناً 14 يوم</b><small>بعدها مجانية للأبد، أو من 99 ر.س بالشهر</small></span>
        <span class="o-more">الباقات${icon('chevron_left', 18)}</span>
      </button>

      <a class="o-solo" href="${join(true)}">${icon('home_work', 20)}<span>${g('تشتغلين في البيوت؟ سجّلي كمستقلة', 'تشتغل في البيوت؟ سجّل كمستقل')}</span>${icon('chevron_left', 18)}</a>`;
    $('#cta').href = mine ? 'dashboard.html' : join(false);
    $('#cta span').textContent = mine ? 'افتح لوحتك' : g('سجّلي صالونك مجاناً', 'سجّل محلّك مجاناً');
    spring($('.o-ping'), [{ opacity: 0, transform: 'translateY(-14px) scale(.96)' }, { opacity: 1, transform: 'none' }], 'bouncy', { delay: 0.35 });
  }

  // the one action, always on screen
  document.body.insertAdjacentHTML('beforeend', `<div class="o-cta"><a class="btn btn-black btn-lg btn-block pressable" id="cta" href="join.html"><span></span>${icon('chevron_left', 20)}</a><small>بدون بطاقة · تلغي متى ما تبي</small></div>
    <div class="sheet" id="plans-sheet" hidden role="dialog" aria-label="الباقات"><div class="handle"></div><div id="plans-body"></div></div>`);
  paint();

  $('#app').addEventListener('click', (e) => {
    if (!e.target.closest('#plans')) return;
    $('#plans-body').innerHTML = `<h2 class="title-l">الباقات</h2><p class="muted" style="margin:2px 0 14px">كلها تبدأ بـ 14 يوم مجاناً بكل المزايا</p>
      <div class="o-plans">${PLANS.map((p) => `<div class="o-plan${p.popular ? ' pop' : ''}"><span class="grow"><b>${p.solo ? g('المستقلة', 'المستقل') : p.name}${p.popular ? ' <em>الأكثر اختياراً</em>' : ''}</b><small>${p.feats.slice(0, 3).join(' · ')}</small></span><span class="o-plan-p">${p.month ? `<b>${ar(p.month)}</b><small>ر.س/شهر</small>` : '<b>مجاناً</b><small>للأبد</small>'}</span></div>`).join('')}</div>
      <p class="muted" style="font-size:.84rem;margin:12px 0 0">السنوي بشهرين مجاناً. بدون عمولة على أي حجز.</p>`;
    openSheet($('#plans-sheet'));
  });
  secSwitch($('#sec'), section, (k) => { section = k; swap($('#o-body'), paint); });
}
if (!window.__softnav) mount();
