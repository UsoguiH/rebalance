import { boot, $, $$, ar, icon, getSection, secSwitch, swap } from './shell.js';
import { PLANS } from './data.js';
import { initSegmented, initSliders } from './m3.js';
import { spring, revealOnScroll } from './motion.js';

let section = getSection();
boot({ page: 'home', section });
const F = () => section === 'eve';
const n = (x) => new Intl.NumberFormat('en-US').format(Math.round(x));

const VALUES = [
  ['storefront', 'صفحة حجز باسمك', 'رابط واحد تحطه في الإنستقرام والسناب والواتساب، يحجز منه العميل بنفسه 24 ساعة.'],
  ['notifications_active', 'تذكير يقلّل الغياب', 'رسالة تأكيد فور الحجز، وتذكير قبل الموعد بساعتين. الغياب ينزل بشكل واضح.'],
  ['calendar_month', 'تقويم واحد لكل الفريق', 'مواعيد كل موظف في مكان واحد، بدون تعارض وبدون دفتر.'],
  ['trending_up', 'تقارير ودخل كل موظف', 'كم حجز، كم دخل، ومين أكثر موظف مطلوب — بنظرة وحدة.'],
];

$('#app').innerHTML = `
  <header class="page-h"><a class="round pressable" href="index.html" aria-label="رجوع">${icon('arrow_back', 22, 'flip-rtl')}</a><div id="sec"></div></header>
  <section class="biz-hero" data-reveal>
    <span class="muted" style="display:flex;align-items:center;gap:6px;font-weight:600">${icon('storefront', 18)}<span id="k-for"></span></span>
    <h1 style="margin-top:14px">صالونك مليان، <em>وجوالك هادي</em></h1>
    <p>عملاؤك يحجزون بأنفسهم في أي وقت، ومولو يذكّرهم قبل الموعد. <b>بدون عمولة على أي حجز.</b></p>
    <div class="btns">
      <a class="btn btn-filled btn-lg pressable" href="account.html#owner" id="start">ابدأ مجاناً</a>
      <a class="btn btn-outlined btn-lg pressable" href="#pricing">الأسعار</a>
    </div>
  </section>
  <div class="phone" aria-hidden="true"><div class="screen"><i class="notch"></i>
    <div class="chat-h"><i>م</i><span id="p-name"></span></div>
    <div class="bubble" id="b1"></div>
    <div class="bubble me" id="b2"></div>
    <div class="bubble" id="b3"></div>
  </div></div>

  <section class="block"><div class="block-h"><h2>كل اللي يحتاجه صالونك</h2></div>
    <div class="values">${VALUES.map(([ic, t, d]) => `<div class="value" data-reveal><span class="ic">${icon(ic, 24)}</span><div><b>${t}</b><p>${d}</p></div></div>`).join('')}</div>
  </section>

  <section class="block"><div class="block-h"><h2>تبدأ في ثلاث خطوات</h2></div>
    <ol class="steps"><li data-reveal>سجّل خلال دقيقتين برقم جوالك</li><li data-reveal>أضف خدماتك وأسعارك وفريقك</li><li data-reveal>شارك رابطك أو ملصق QR — وخلّ الحجوزات تجي</li></ol>
  </section>

  <section class="block" id="pricing"><div class="block-h"><h2>أسعار واضحة</h2><span class="label-m">تجربة مجانية 14 يوم لكل الباقات</span></div>
    <div class="segmented billing" role="radiogroup" aria-label="الفوترة">
      <label><input type="radio" name="bill" value="month" checked><span>شهري</span></label>
      <label><input type="radio" name="bill" value="year"><span>سنوي <i class="save">شهرين مجاناً</i></span></label>
    </div>
    <div class="plans">${PLANS.map((p) => `
      <article class="plan${p.popular ? ' popular' : ''}" data-reveal>
        ${p.popular ? '<span class="pop">الأكثر اختياراً</span>' : ''}
        <h3>${p.name}</h3>
        <div class="price"><span class="num" data-m="${p.month}" data-y="${p.year}">${p.month ? n(p.month) : 'مجاناً'}</span>${p.month ? '<small class="per">ر.س / شهرياً</small>' : ''}</div>
        <p class="note">${p.note || ''}</p>
        <a class="btn ${p.popular ? 'btn-filled' : 'btn-tonal'} btn-block pressable" href="account.html#owner">${p.month ? 'جرّبها 14 يوم' : 'ابدأ مجاناً'}</a>
        <ul class="feats">${p.feats.map((f) => `<li>${icon('check_circle_f', 20)}${f}</li>`).join('')}</ul>
      </article>`).join('')}</div>
    <div class="value" style="margin-top:12px;align-items:center" data-reveal><span class="ic">${icon('person', 24)}</span><div class="grow"><b id="fl-t"></b><p>كل مزايا الاحترافية لشخص واحد، بـ <b>99 ر.س</b> شهرياً.</p></div><a class="btn btn-black btn-sm pressable" href="account.html#owner">ابدأ</a></div>
  </section>

  <section class="block"><div class="block-h"><h2>كم توفّر بدون عمولة؟</h2></div>
    <div class="calc" data-reveal>
      <div class="lbl"><span>حجوزات في الشهر</span></div>
      <div class="slider"><input type="range" id="c-n" min="20" max="600" step="10" value="160" aria-label="عدد الحجوزات"><span class="bubble"></span></div>
      <div class="lbl" style="margin-top:6px"><span>متوسط الفاتورة (ر.س)</span></div>
      <div class="slider"><input type="range" id="c-p" min="30" max="600" step="10" value="120" aria-label="متوسط الفاتورة"><span class="bubble"></span></div>
      <div class="out"><span class="body-m">مقارنة بتطبيقات تاخذ 15٪ عمولة، توفّر شهرياً تقريباً</span><b><span id="c-out">0</span> ر.س</b><span class="label-m on-variant">بعد خصم اشتراك الاحترافية</span></div>
    </div>
  </section>

  <section class="block" style="text-align:center" data-reveal>
    <h2 class="headline-s">جاهز تملأ جدولك؟</h2>
    <p class="on-variant" style="margin:6px 0 14px">بدون بطاقة، وتقدر تلغي متى ما تبي.</p>
    <a class="btn btn-filled btn-lg pressable" href="account.html#owner">ابدأ مجاناً الحين</a>
  </section>`;

initSegmented($('#app')); initSliders($('#app'));

function paint() {
  const f = F();
  $('#k-for').textContent = f ? 'لصالونات ومراكز التجميل النسائية' : 'للحلاقين ومراكز العناية الرجالية';
  
  $('#p-name').textContent = f ? 'صالون لمسة' : 'صالون الفرسان';
  $('#b1').innerHTML = f ? `تذكير من <b>صالون لمسة</b> 🌸<br>موعدك بكرة <b>7:30 م</b> — استشوار وتصفيف مع نورة.<br>للتعديل: molu-app.com/r/8K2<time>9:02 م</time>` : `تذكير من <b>صالون الفرسان</b> ✂️<br>موعدك بكرة <b>9:00 م</b> — قص شعر وتحديد مع سامي.<br>للتعديل: molu-app.com/r/3F7<time>9:02 م</time>`;
  $('#b2').innerHTML = `${f ? 'تمام، أكيد جاية' : 'تمام، أكيد جاي'} 👍<time>9:04 م</time>`;
  $('#b3').innerHTML = `${f ? 'شكراً لزيارتك! قيّمي' : 'شكراً لزيارتك! قيّم'} تجربتك ⭐⭐⭐⭐⭐<time>بعد الزيارة</time>`;
  $('#fl-t').textContent = f ? 'مستقلة؟ تشتغلين لحالك؟' : 'حلاق مستقل؟ تشتغل لحالك؟';
  $('#start').textContent = f ? 'ابدئي مجاناً' : 'ابدأ مجاناً';
}
paint();

// chat bubbles play in sequence each time the phone scrolls into view
const playChat = () => ['#b1', '#b2', '#b3'].forEach((id, i) => spring($(id), [{ opacity: 0, transform: 'translateY(16px) scale(.92)' }, { opacity: 1, transform: 'none' }], 'bouncy', { delay: 0.3 + i * 0.7 }));
new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && playChat()), { threshold: 0.6 }).observe($('.phone'));

secSwitch($('#sec'), section, (k) => { section = k; swap($('#app'), paint); });

// monthly ⇄ yearly: numbers roll (old slides up and out, new rises in)
$$('[name="bill"]').forEach((r) => r.addEventListener('change', () => {
  const y = r.value === 'year';
  $$('.plan .num').forEach((el, i) => {
    const v = +el.dataset[y ? 'y' : 'm'];
    if (!v) return;
    spring(el, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-14px)', opacity: 0 }], 'snappy', { delay: i * 0.05 }).finished.then(() => {
      el.textContent = n(v);
      el.parentElement.querySelector('.per').textContent = y ? 'ر.س / سنوياً' : 'ر.س / شهرياً';
      spring(el, [{ transform: 'translateY(16px)', opacity: 0 }, { transform: 'none', opacity: 1 }], 'bouncy');
    });
  });
}));

// savings calculator
let shown = 0;
function calc() {
  const v = Math.max(0, +$('#c-n').value * +$('#c-p').value * 0.15 - 149);
  const from = shown; shown = v;
  const t0 = performance.now();
  const step = (t) => { const k = Math.min(1, (t - t0) / 450); $('#c-out').textContent = n(from + (v - from) * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
$('#c-n').addEventListener('input', calc); $('#c-p').addEventListener('input', calc); calc();
revealOnScroll();
