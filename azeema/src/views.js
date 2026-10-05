import { config, PACKAGES, priceOf } from './config.js';
import { renderPoster, esc, THEMES, OCCASIONS, DEMOS, formatDates, eventInstant, titleFor, FONTS_URL } from '../public/js/shared/invite.js';

const V = '7'; // asset cache-buster
const ICON = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#6E7B47"/><text x="32" y="44" font-size="34" text-anchor="middle" fill="#F7F5EE" font-family="serif">ع</text></svg>')}`;

function page({ title, desc = 'دعوات رقمية متحركة مع صفحة تأكيد حضور — جاهزة خلال ساعة.', body, css = [], js = [], og = {}, bodyClass = '', noindex = false }) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#F7F5EE">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(og.title || title)}">
<meta property="og:description" content="${esc(og.desc || desc)}">
${og.image ? `<meta property="og:image" content="${esc(og.image)}"><meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="icon" href="${ICON}">
<link rel="preload" href="/fonts/Tajawal-400-arabic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${FONTS_URL}?v=${V}">
${['app.css', ...css].map((c) => `<link rel="stylesheet" href="/css/${c}?v=${V}">`).join('\n')}
</head>
<body class="${bodyClass}">
${body}
${js.map((s) => `<script type="module" src="/js/${s}?v=${V}"></script>`).join('\n')}
</body>
</html>`;
}

const logo = (href = '/') => `<a class="logo" href="${href}" aria-label="عزيمة"><span class="logo-mark">${leafMark()}</span><span class="logo-word">عزيمة</span></a>`;
const leafMark = () => `<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><path d="M6 27 C 10 18 16 10 27 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 19 C 9 15 9 11 12 8 C 15 11 15 15 12 19Z" fill="currentColor" opacity=".55"/><path d="M18 13 C 18 9 20 6 24 5 C 24 9 22 12 18 13Z" fill="currentColor" opacity=".8"/><path d="M15 17 C 19 17 22 19 23 22 C 19 23 16 21 15 17Z" fill="currentColor" opacity=".7"/></svg>`;

const header = (cta = true) => `
<header class="site-header">
  <div class="wrap header-in">
    ${logo()}
    <nav class="nav">
      <a href="/#designs">التصاميم</a><a href="/#features">المميزات</a><a href="/#how">كيف تشتغل</a><a href="/#pricing">الأسعار</a><a href="/#faq">الأسئلة</a>
    </nav>
    ${cta ? '<a class="btn btn-primary btn-sm" href="/create">صمّم دعوتك</a>' : ''}
  </div>
</header>`;

const footer = () => `
<footer class="site-footer">
  <div class="wrap footer-in">
    <div>${logo()}<p class="muted">دعوات رقمية متحركة لمناسباتكم السعيدة.<br>صُنعت بحب في السعودية 🇸🇦</p></div>
    <div class="footer-links">
      <a href="/create">صمّم دعوتك</a><a href="/#designs">التصاميم</a><a href="/#pricing">الأسعار</a>
      ${config.whatsappContact ? `<a href="https://wa.me/${esc(config.whatsappContact)}">تواصل واتساب</a>` : ''}
    </div>
  </div>
  <div class="wrap fine">© ${new Date().getFullYear()} عزيمة</div>
</footer>`;

const themeOrder = ['sage', 'arch', 'lilac', 'royal', 'sadu', 'hijazi', 'bloom', 'editorial', 'oasis'];
const demoData = (t) => ({ ...(DEMOS[t] || DEMOS.sage), template: t });

const check = `<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ic = {
  video: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="13" height="14" rx="3"/><path d="M16 10l5-3v10l-5-3"/></svg>',
  page: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10 18.5h4"/></svg>',
  users: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.5c2.4.2 4 1.8 4.6 4.5"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
  wa: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.3-.2-.5-.3z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  cal: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  share: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 15V3M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
};

// ======================= landing =======================
export function landing() {
  const heroThemes = ['sage', 'lilac', 'arch'];
  const full = PACKAGES.full, video = PACKAGES.video;
  const body = `
${header()}
<main>
  <section class="hero">
    <div class="wash w1"></div><div class="wash w2"></div><div class="wash w3"></div>
    <div class="wrap hero-in">
      <div class="hero-copy">
        <span class="eyebrow">${leafMark()} دعوات رقمية فاخرة</span>
        <h1>دعوتك تُفتح<br>كأنها <em>هدية</em></h1>
        <p class="lead">فيديو دعوة متحرك بتصاميم سعودية أنيقة، وصفحة دعوة فيها العدّاد والموقع وتأكيد الحضور. <strong>جاهزة خلال ساعة.</strong></p>
        <div class="hero-cta">
          <a class="btn btn-primary btn-lg" href="/create">صمّم دعوتك الآن</a>
          <a class="btn btn-ghost btn-lg" href="/demo/sage?to=${encodeURIComponent('أبو محمد')}">شاهد دعوة حقيقية</a>
        </div>
        <ul class="trust">
          <li>${check} جاهزة خلال ساعة</li><li>${check} بدون تطبيق</li><li>${check} تعديل مجاني</li>
        </ul>
      </div>
      <div class="hero-visual">
        <div class="phone" data-rotator>
          <div class="phone-notch"></div>
          <div class="phone-screen">
            ${heroThemes.map((t, i) => `<div class="rot-item${i === 0 ? ' on' : ''}">${renderPoster(demoData(t), { mode: 'page' })}</div>`).join('')}
          </div>
        </div>
        <div class="float-card fc-1"><span class="dot ok"></span><div><b>أبو فيصل</b><small>أكّد حضوره + ٣ مرافقين</small></div></div>
        <div class="float-card fc-2"><b class="num">١٤٨</b><small>ضيف أكدوا الحضور</small></div>
      </div>
    </div>
  </section>

  <section class="occasions">
    <div class="wrap">
      <p class="muted center">لكل مناسباتكم</p>
      <div class="chips">${Object.entries(OCCASIONS).map(([k, o]) => `<a class="chip" href="/create?occasion=${k}"><span>${o.icon}</span>${esc(o.label)}</a>`).join('')}</div>
    </div>
  </section>

  <section id="designs" class="section">
    <div class="wrap">
      <div class="section-head">
        <span class="eyebrow">${leafMark()} التصاميم</span>
        <h2>اختر الطابع اللي <em>يشبهكم</em></h2>
        <p class="muted">كل تصميم يتحرك بهدوء في الفيديو وصفحة الدعوة. اضغط «معاينة حية» وشوفه مثل ما بيشوفه ضيوفك.</p>
      </div>
      <div class="gallery">
        ${themeOrder.map((t) => `
        <article class="design-card">
          <div class="design-thumb">${renderPoster(demoData(t), { mode: 'static' })}</div>
          <div class="design-meta">
            <div><h3>${esc(THEMES[t].name)}</h3><p class="muted">${esc(THEMES[t].desc)}</p></div>
            <div class="design-actions">
              <a class="btn btn-primary btn-sm" href="/create?template=${t}">استخدم التصميم</a>
              <a class="btn btn-link btn-sm" href="/demo/${t}">معاينة حية ←</a>
            </div>
          </div>
        </article>`).join('')}
      </div>
    </div>
  </section>

  <section id="features" class="section section-alt">
    <div class="wrap">
      <div class="section-head">
        <span class="eyebrow">${leafMark()} وش تحصل</span>
        <h2>أكثر من بطاقة… <em>تجربة كاملة</em></h2>
      </div>
      <div class="features">
        <div class="feature"><span class="f-ic">${ic.video}</span><h3>فيديو دعوة متحرك</h3><p>١٥ ثانية بمقاس الجوال، تتحرك فيه النقوش والخطوط بنعومة. جاهز للواتساب والسناب والستوري.</p></div>
        <div class="feature"><span class="f-ic">${ic.page}</span><h3>صفحة دعوة أنيقة</h3><p>تُفتح مثل الظرف، فيها عدّاد تنازلي، وزر الموقع على الخريطة، وإضافة الموعد للتقويم.</p></div>
        <div class="feature"><span class="f-ic">${ic.users}</span><h3>تأكيد الحضور</h3><p>الضيف يأكد حضوره وعدد المرافقين بضغطة. وأنت تشوف القائمة والعدد لحظة بلحظة.</p></div>
        <div class="feature"><span class="f-ic">${ic.link}</span><h3>روابط بأسماء ضيوفك</h3><p>«إلى: أبو محمد» — كل ضيف يفتح دعوة باسمه. لمسة صغيرة تفرق كثير.</p></div>
      </div>
      <div class="dash-mock">
        <div class="dm-head"><b>لوحة الضيوف</b><span class="pill ok">مباشر</span></div>
        <div class="dm-stats"><div><b>١٤٨</b><small>سيحضرون</small></div><div><b>٤٢</b><small>ردود</small></div><div><b>٩</b><small>معتذرين</small></div><div><b>٦١٢</b><small>مشاهدة</small></div></div>
        <div class="dm-rows">
          <div><span class="dot ok"></span><b>أم خالد</b><small>+٤ مرافقين</small><em>«الله يتمم بخير ويسعدكم»</em></div>
          <div><span class="dot ok"></span><b>سارة العتيبي</b><small>+١</small><em>«مبروك مقدماً 🤍»</em></div>
          <div><span class="dot no"></span><b>نوف</b><small>معتذرة</small><em>«ألف مبروك، والله يعوضني بشوفتكم»</em></div>
        </div>
      </div>
    </div>
  </section>

  <section id="how" class="section">
    <div class="wrap">
      <div class="section-head"><span class="eyebrow">${leafMark()} كيف تشتغل</span><h2>ثلاث خطوات <em>وبس</em></h2></div>
      <ol class="steps">
        <li><span class="step-n">١</span><h3>اختر التصميم</h3><p>واكتب الأسماء والموعد والقاعة، وتشوف دعوتك تتشكل قدامك.</p></li>
        <li><span class="step-n">٢</span><h3>ادفع بأمان</h3><p>مدى، Apple Pay، أو بطاقة ائتمانية.</p></li>
        <li><span class="step-n">٣</span><h3>أرسلها لضيوفك</h3><p>خلال ساعة يجيك الفيديو ورابط الدعوة ولوحة الحضور.</p></li>
      </ol>
    </div>
  </section>

  <section id="pricing" class="section section-alt">
    <div class="wrap">
      <div class="section-head"><span class="eyebrow">${leafMark()} الأسعار</span><h2>سعر واحد، <em>بدون مفاجآت</em></h2></div>
      <div class="pricing">
        <div class="price-card featured">
          <span class="badge">عرض الإطلاق</span>
          <h3>${esc(full.name)}</h3>
          <div class="price"><b>${full.launchPrice}</b><span>ريال</span><s>${full.price}</s></div>
          <ul>${full.features.map((f) => `<li>${check}${esc(f)}</li>`).join('')}</ul>
          <a class="btn btn-primary btn-block" href="/create?package=full">ابدأ الآن</a>
        </div>
        <div class="price-card">
          <h3>${esc(video.name)}</h3>
          <div class="price"><b>${video.price}</b><span>ريال</span></div>
          <ul>${video.features.map((f) => `<li>${check}${esc(f)}</li>`).join('')}</ul>
          <a class="btn btn-ghost btn-block" href="/create?package=video">اختر الباقة</a>
        </div>
      </div>
    </div>
  </section>

  <section id="faq" class="section">
    <div class="wrap narrow">
      <div class="section-head"><span class="eyebrow">${leafMark()} أسئلة شائعة</span><h2>عندك سؤال؟</h2></div>
      <div class="faq">
        ${[
    ['متى توصلني الدعوة؟', 'صفحة الدعوة تشتغل فوراً بعد الدفع، والفيديو يجهز عادةً خلال دقائق، وأقصاها ساعة.'],
    ['هل أقدر أعدّل بعد الدفع؟', 'نعم، عندك تعديل مجاني مرة واحدة (اسم، وقت، قاعة…) ويتجدد الفيديو تلقائياً.'],
    ['هل الضيوف يحتاجون تطبيق؟', 'لا. الدعوة رابط يفتح مباشرة من الواتساب على أي جوال.'],
    ['هل أقدر أخلي الحفل للنساء فقط أو عائلي؟', 'أكيد، تختار نوع الحضور ويظهر بوضوح في الدعوة.'],
    ['هل بيانات ضيوفي خاصة؟', 'نعم. قائمة الحضور ما يشوفها إلا أنت عبر رابط لوحة التحكم الخاص فيك.'],
    ['أبي تصميم خاص بشعار أو ألوان معينة؟', 'تواصل معنا وبنجهزه لك.'],
  ].map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
      </div>
    </div>
  </section>

  <section class="cta-band">
    <div class="wrap cta-in">
      <h2>فرحتكم تستاهل دعوة <em>تليق فيها</em></h2>
      <a class="btn btn-light btn-lg" href="/create">صمّم دعوتك خلال دقائق</a>
    </div>
  </section>
</main>
${footer()}`;
  return page({ title: 'عزيمة — دعوات رقمية متحركة وتأكيد حضور', body, css: ['invite.css'], js: ['landing.js'], og: { image: `${config.baseUrl}/img/og.jpg` } });
}

// ======================= builder =======================
export function builder({ edit, template, occasion, ref }) {
  const initial = edit
    ? { data: edit.data, package: edit.package, contactName: edit.contact_name, contactPhone: edit.contact_phone }
    : { data: { template: THEMES[template] ? template : 'sage', occasion: OCCASIONS[occasion] ? occasion : 'wedding' }, package: 'full' };
  const body = `
<header class="site-header slim"><div class="wrap header-in">${logo()}<span class="muted small">${edit ? 'تعديل الدعوة' : 'صمّم دعوتك'}</span></div></header>
<main class="builder wrap">
  <form id="builder" class="b-form" novalidate>
    <nav class="b-steps" aria-label="الخطوات">
      <a href="#s-occasion">المناسبة</a><a href="#s-design">التصميم</a><a href="#s-text">النصوص</a><a href="#s-when">الموعد</a><a href="#s-pay">الباقة</a>
    </nav>

    <section id="s-occasion" class="b-card">
      <h2><span>١</span> وش المناسبة؟</h2>
      <div class="opt-grid occ">
        ${Object.entries(OCCASIONS).map(([k, o]) => `<label class="opt"><input type="radio" name="occasion" value="${k}"><span><i>${o.icon}</i>${esc(o.label)}</span></label>`).join('')}
      </div>
    </section>

    <section id="s-design" class="b-card">
      <h2><span>٢</span> اختر التصميم</h2>
      <div class="opt-grid themes">
        ${themeOrder.map((t) => `<label class="opt theme-opt"><input type="radio" name="template" value="${t}">
          <span><b class="sw" style="--a:${THEMES[t].swatch[0]};--b:${THEMES[t].swatch[1]}"></b>${esc(THEMES[t].name)}</span></label>`).join('')}
      </div>
    </section>

    <section id="s-text" class="b-card">
      <h2><span>٣</span> الأسماء والنصوص</h2>
      <div class="fields">
        <label class="f"><span data-label="name1">الاسم</span><input name="name1" maxlength="40" required></label>
        <label class="f" data-show="name2"><span data-label="name2">الاسم الثاني</span><input name="name2" maxlength="40"></label>
        <label class="f wide"><span>العبارة الافتتاحية <small>(البسملة)</small></span><input name="topLine" maxlength="80"></label>
        <label class="f wide"><span>آية أو دعاء أو بيت شعر</span><input name="verse" maxlength="160"></label>
        <label class="f"><span>أصحاب الدعوة</span><textarea name="hosts" rows="2" maxlength="200" placeholder="عائلة …"></textarea></label>
        <label class="f"><span>أصحاب الدعوة (الطرف الثاني) <small>اختياري</small></span><textarea name="hosts2" rows="2" maxlength="200"></textarea></label>
        <label class="f wide"><span>نص الدعوة</span><input name="inviteText" maxlength="140"></label>
        <label class="f wide"><span>سطر إضافي <small>(تخصص، شعار…) اختياري</small></span><input name="subtitle" maxlength="120"></label>
        <label class="f wide"><span>ملاحظات للضيوف <small>كل ملاحظة بسطر</small></span><textarea name="notes" rows="2" maxlength="240" placeholder="جنة الأطفال منازلهم"></textarea></label>
        <label class="f wide"><span>العبارة الختامية</span><input name="closing" maxlength="90"></label>
      </div>
    </section>

    <section id="s-when" class="b-card">
      <h2><span>٤</span> الموعد والمكان</h2>
      <div class="fields">
        <label class="f"><span>التاريخ (ميلادي)</span><input type="date" name="date" required><small class="hint" id="hijri-hint"></small></label>
        <label class="f"><span>وقت الاستقبال</span><input type="time" name="time" value="20:30"></label>
        <label class="f"><span>اسم القاعة / المكان</span><input name="venue" maxlength="90" placeholder="قاعة …"></label>
        <label class="f"><span>المدينة</span><input name="city" maxlength="60" placeholder="الرياض"></label>
        <label class="f wide"><span>رابط الموقع في قوقل ماب <small>اختياري</small></span><input name="mapUrl" type="url" inputmode="url" placeholder="https://maps.app.goo.gl/…" dir="ltr"></label>
        <label class="f"><span>الحضور</span><select name="audience"><option value="">بدون تحديد</option><option value="women">للنساء</option><option value="men">للرجال</option><option value="family">عائلي</option></select></label>
        <label class="f"><span>أقصى عدد مرافقين لكل ضيف</span><input type="number" name="maxCompanions" min="0" max="10" value="3"></label>
      </div>
    </section>

    <section id="s-pay" class="b-card">
      <h2><span>٥</span> الباقة وبيانات التواصل</h2>
      <div class="pkg-grid">
        ${Object.entries(PACKAGES).map(([k, p]) => `<label class="pkg"><input type="radio" name="package" value="${k}">
          <span><b>${esc(p.name)}</b><em>${priceOf(k)} ريال ${p.launchPrice ? `<s>${p.price}</s>` : ''}</em><small>${esc(p.features.slice(0, 3).join('، '))}</small></span></label>`).join('')}
      </div>
      <div class="fields">
        <label class="f"><span>اسمك</span><input name="contactName" maxlength="60" autocomplete="name"></label>
        <label class="f"><span>جوالك (واتساب)</span><input name="contactPhone" inputmode="tel" autocomplete="tel" placeholder="05XXXXXXXX" dir="ltr" required></label>
      </div>
      <p class="error" id="form-error" role="alert" hidden></p>
      <button class="btn btn-primary btn-lg btn-block" type="submit">${edit ? 'احفظ التعديلات' : 'التالي: الدفع ←'}</button>
      <p class="muted small center">تقدر تعدّل الدعوة مجاناً مرة واحدة بعد الدفع.</p>
    </section>
  </form>

  <aside class="b-preview" aria-label="معاينة">
    <div class="phone sm"><div class="phone-notch"></div><div class="phone-screen" id="preview"></div></div>
    <p class="muted small center">معاينة مباشرة — تتحدث مع كل حرف</p>
  </aside>
  <button type="button" class="preview-fab btn btn-primary" id="preview-toggle">👁 معاينة</button>
</main>
<script>window.__INITIAL__=${JSON.stringify({ ...initial, edit: edit ? { slug: edit.slug, key: edit.host_key } : null, ref: ref || null }).replace(/</g, '\\u003c')};</script>`;
  return page({ title: 'صمّم دعوتك — عزيمة', body, css: ['invite.css', 'builder.css'], js: ['builder.js'], bodyClass: 'is-builder', noindex: !!edit });
}

// ======================= checkout =======================
export function checkout(inv, mode) {
  const p = PACKAGES[inv.package];
  const d = inv.data;
  const dates = formatDates(d.date, d.time);
  const hostUrl = `${config.baseUrl}/host/${inv.slug}?key=${inv.host_key}`;
  const body = `
<header class="site-header slim"><div class="wrap header-in">${logo()}<span class="muted small">إتمام الطلب</span></div></header>
<main class="wrap checkout">
  <div class="co-preview"><div class="phone sm"><div class="phone-notch"></div><div class="phone-screen">${renderPoster(d, { mode: 'static', preview: true })}</div></div></div>
  <div class="co-card b-card">
    <h1>${esc(titleFor(d))}</h1>
    <p class="muted">${esc([`${dates.weekday} ${dates.hijri}`, d.venue].filter(Boolean).join(' — '))}</p>
    <div class="co-line"><span>${esc(p.name)}</span><b>${inv.price} ريال ${p.launchPrice ? `<s>${p.price}</s>` : ''}</b></div>
    <ul class="co-feats">${p.features.map((f) => `<li>${check}${esc(f)}</li>`).join('')}</ul>
    <div id="pay-area" data-slug="${esc(inv.slug)}" data-key="${esc(inv.host_key)}" data-mode="${mode}">
      ${mode === 'moyasar' ? `<button class="btn btn-primary btn-lg btn-block" data-pay>ادفع ${inv.price} ريال بأمان</button><p class="pay-logos">مدى · Apple Pay · Visa · Mastercard</p>` : ''}
      ${mode === 'link' ? `<a class="btn btn-primary btn-lg btn-block" href="${esc(config.paymentLink)}" target="_blank" rel="noopener">ادفع ${inv.price} ريال</a>
        <p class="note">بعد الدفع نفعّل دعوتك خلال دقائق (رقم الطلب: <b dir="ltr">${esc(inv.slug)}</b>)، وتوصلك رسالة واتساب.</p>` : ''}
      ${mode === 'demo' ? `<button class="btn btn-primary btn-lg btn-block" data-pay data-demo>تفعيل تجريبي (بيئة التجربة)</button>` : ''}
      ${mode === 'none' ? `<p class="note">الدفع غير مفعّل بعد. رقم طلبك: <b dir="ltr">${esc(inv.slug)}</b></p>` : ''}
      <p class="error" role="alert" hidden></p>
    </div>
    <div class="keep-link">
      <b>🔑 احفظ رابط لوحة التحكم</b>
      <p class="muted small">من خلاله تتابع الحضور وتحمّل الفيديو. لا تشاركه مع أحد.</p>
      <div class="copy-row"><input readonly value="${esc(hostUrl)}" dir="ltr"><button class="btn btn-ghost btn-sm" data-copy="${esc(hostUrl)}">${ic.copy} نسخ</button></div>
    </div>
    <a class="btn btn-link" href="/create?edit=${esc(inv.slug)}&key=${esc(inv.host_key)}">← تعديل البيانات</a>
  </div>
</main>`;
  return page({ title: 'إتمام الطلب — عزيمة', body, css: ['invite.css', 'builder.css'], js: ['checkout.js'], noindex: true });
}

// ======================= guest page =======================
export function guestPage({ inv, demo, to = '' }) {
  const isDemo = !!demo;
  const d = isDemo ? demoData(demo) : inv.data;
  const paid = isDemo || inv.status === 'paid';
  const rsvp = isDemo || (paid && PACKAGES[inv.package]?.rsvp);
  const dates = formatDates(d.date, d.time);
  const start = eventInstant(d.date, d.time);
  const theme = THEMES[d.template] || THEMES.sage;
  const occ = OCCASIONS[d.occasion] || OCCASIONS.wedding;
  const mono = [occ.hasName2 ? (d.name2 || '').charAt(0) : '', (d.name1 || '').charAt(0)].join('');
  const mapHref = d.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([d.venue, d.city].filter(Boolean).join(' '))}`;
  const slug = isDemo ? '' : inv.slug;
  const title = titleFor(d);
  const og = {
    title, desc: `${dates.weekday} ${dates.hijri} — ${[d.venue, d.city].filter(Boolean).join('، ')}`,
    image: !isDemo && paid ? `${config.baseUrl}/media/${slug}/poster.jpg` : undefined,
  };
  const body = `
<div class="cover" id="cover" style="--c-bg:${theme.swatch[0]};--c-ac:${theme.swatch[1]}">
  <div class="cover-half r"></div><div class="cover-half l"></div>
  <div class="cover-in">
    <p class="cover-kicker">دعوة خاصة</p>
    ${to ? `<p class="cover-to">إلى: ${esc(to)}</p>` : ''}
    <button class="seal" id="open" aria-label="افتح الدعوة"><span>${esc(mono)}</span></button>
    <p class="cover-hint">اضغط لفتح الدعوة</p>
  </div>
</div>
<main class="guest closed" id="guest" style="--g-bg:${theme.swatch[0]};--g-ac:${theme.swatch[1]}">
  <div class="g-poster">${renderPoster(d, { mode: 'page', preview: !paid, to })}</div>
  <section class="g-card g-count" data-start="${start ? start.toISOString() : ''}">
    <p class="g-kicker">باقي على الموعد</p>
    <div class="count"><div><b data-u="d">٠</b><small>يوم</small></div><div><b data-u="h">٠</b><small>ساعة</small></div><div><b data-u="m">٠</b><small>دقيقة</small></div><div><b data-u="s">٠</b><small>ثانية</small></div></div>
    <p class="g-when">${esc(`يوم ${dates.weekday}، ${dates.hijri}`)}<br><span>${esc(dates.greg)}${dates.time ? ' — الساعة ' + esc(dates.time) : ''}</span></p>
  </section>
  <section class="g-actions">
    <a class="g-act" href="${esc(mapHref)}" target="_blank" rel="noopener">${ic.pin}<span>الموقع</span></a>
    <a class="g-act" href="${isDemo ? '#' : `/i/${esc(slug)}/invite.ics`}">${ic.cal}<span>أضف للتقويم</span></a>
    <button class="g-act" data-share data-title="${esc(title)}">${ic.share}<span>مشاركة</span></button>
  </section>
  ${rsvp ? `
  <section class="g-card g-rsvp" id="rsvp">
    <h2>تأكيد الحضور</h2>
    <p class="muted">${esc(d.closing || 'يسعدنا حضوركم')}</p>
    <form id="rsvp-form" data-slug="${esc(slug)}" data-demo="${isDemo ? 1 : 0}">
      <label class="f"><span>الاسم</span><input name="name" maxlength="60" required value="${esc(to)}" autocomplete="name"></label>
      <div class="seg" role="radiogroup">
        <label><input type="radio" name="attending" value="yes" checked><span>سأحضر بإذن الله</span></label>
        <label><input type="radio" name="attending" value="no"><span>أعتذر</span></label>
      </div>
      ${(d.maxCompanions ?? 3) > 0 ? `<label class="f companions"><span>عدد المرافقين</span>
        <div class="stepper"><button type="button" data-step="-1" aria-label="أقل">−</button><input name="companions" type="number" min="0" max="${d.maxCompanions ?? 3}" value="0" readonly><button type="button" data-step="1" aria-label="أكثر">+</button></div></label>` : ''}
      <label class="f"><span>رسالة تهنئة <small>اختياري</small></span><textarea name="message" rows="2" maxlength="300" placeholder="ألف مبروك…"></textarea></label>
      <button class="btn btn-primary btn-lg btn-block" type="submit">إرسال</button>
      <p class="error" role="alert" hidden></p>
    </form>
    <div class="rsvp-done" hidden><div class="done-ic">✓</div><h3>وصلنا ردّك</h3><p class="muted">شكراً لك، ونتشرف فيك 🤍</p></div>
  </section>` : ''}
  ${!paid ? '<p class="g-note">هذه معاينة — تأكيد الحضور يتفعّل بعد إتمام الطلب.</p>' : ''}
  <footer class="g-foot"><a href="/?ref=${esc(slug || 'demo')}">${leafMark()} صمّم دعوتك مع <b>عزيمة</b></a></footer>
</main>`;
  return page({ title, desc: og.desc, body, css: ['invite.css', 'guest.css'], js: ['guest.js'], og, bodyClass: 'is-guest', noindex: !isDemo });
}

// ======================= host dashboard =======================
export function hostPage(inv, rsvps, sum, { welcome }) {
  const d = inv.data;
  const url = `${config.baseUrl}/i/${inv.slug}`;
  const dates = formatDates(d.date, d.time);
  const p = PACKAGES[inv.package];
  const shareText = `${titleFor(d)}\nيوم ${dates.weekday} ${dates.hijri}${dates.time ? ' الساعة ' + dates.time : ''}\nبانتظاركم 🤍\n${url}`;
  const reminder = `تذكير لطيف 🤍\nموعدنا يوم ${dates.weekday} ${dates.hijri}${dates.time ? ' الساعة ' + dates.time : ''}\n📍 ${[d.venue, d.city].filter(Boolean).join(' — ')}\nالموقع والتفاصيل: ${url}`;
  const key = inv.host_key;
  const body = `
<header class="site-header slim"><div class="wrap header-in">${logo()}<span class="muted small">لوحة التحكم</span></div></header>
<main class="wrap host" id="host" data-slug="${esc(inv.slug)}" data-key="${esc(key)}" data-url="${esc(url)}">
  ${welcome ? `<div class="welcome">🎉 <b>مبروك! دعوتك جاهزة.</b> أرسل الرابط لضيوفك، والفيديو يتجهز الحين.</div>` : ''}
  <div class="host-head">
    <div><h1>${esc(titleFor(d))}</h1><p class="muted">${esc(`يوم ${dates.weekday}، ${dates.hijri} — ${dates.greg}`)}</p></div>
    <a class="btn btn-ghost btn-sm" href="/create?edit=${esc(inv.slug)}&key=${esc(key)}">تعديل ${inv.edits_left > 0 ? `<small>(متبقي ${inv.edits_left})</small>` : ''}</a>
  </div>

  <div class="host-grid">
    <section class="b-card h-link">
      <h2>رابط الدعوة</h2>
      <div class="copy-row"><input readonly value="${esc(url)}" dir="ltr"><button class="btn btn-ghost btn-sm" data-copy="${esc(url)}">${ic.copy} نسخ</button></div>
      <div class="row-btns">
        <a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(shareText)}">${ic.wa} أرسل بالواتساب</a>
        <a class="btn btn-ghost" href="/i/${esc(inv.slug)}" target="_blank">فتح الدعوة</a>
      </div>
    </section>

    <section class="b-card h-video" data-video="${esc(inv.video_status)}">
      <h2>فيديو الدعوة</h2>
      <div class="vid-wrap">
        <video ${inv.video_status === 'ready' ? `src="/media/${esc(inv.slug)}/video.mp4"` : ''} playsinline controls muted loop poster="${inv.video_status === 'ready' ? `/media/${esc(inv.slug)}/poster.jpg` : ''}"></video>
        <div class="vid-wait"><span class="spinner"></span><p>نجهّز الفيديو… عادةً خلال دقائق</p></div>
        <div class="vid-fail"><p>تعذّر تجهيز الفيديو — نعيد المحاولة تلقائياً.</p></div>
      </div>
      <a class="btn btn-primary btn-block vid-dl" href="/media/${esc(inv.slug)}/video.mp4?dl=1">تحميل الفيديو</a>
    </section>

    ${p.rsvp ? `
    <section class="b-card h-stats">
      <div class="stat"><b data-k="guests">${sum.guests}</b><small>إجمالي الحضور المتوقع</small></div>
      <div class="stat"><b data-k="yes">${sum.yes}</b><small>أكدوا</small></div>
      <div class="stat"><b data-k="no">${sum.no}</b><small>اعتذروا</small></div>
      <div class="stat"><b data-k="views">${inv.views}</b><small>مشاهدة</small></div>
    </section>

    <section class="b-card h-personal">
      <h2>رابط باسم الضيف</h2>
      <p class="muted small">الضيف يشوف «إلى: اسمه» على الدعوة، والاسم يتعبّى تلقائياً في تأكيد الحضور.</p>
      <div class="copy-row"><input id="guest-name" placeholder="مثال: أبو محمد"><button class="btn btn-ghost btn-sm" id="make-link">إنشاء</button></div>
      <div class="personal-out" hidden><input readonly dir="ltr"><div class="row-btns"><button class="btn btn-ghost btn-sm" data-copy>${ic.copy} نسخ</button><a class="btn btn-wa btn-sm" target="_blank" rel="noopener">${ic.wa} واتساب</a></div></div>
    </section>

    <section class="b-card h-reminder">
      <h2>رسالة التذكير</h2>
      <textarea rows="5" id="reminder">${esc(reminder)}</textarea>
      <div class="row-btns"><button class="btn btn-ghost btn-sm" data-copy-from="#reminder">${ic.copy} نسخ</button><a class="btn btn-wa btn-sm" id="reminder-wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(reminder)}">${ic.wa} أرسل</a></div>
    </section>

    <section class="b-card h-guests">
      <div class="h-guests-head"><h2>قائمة الضيوف</h2><a class="btn btn-ghost btn-sm" href="/host/${esc(inv.slug)}/rsvps.csv?key=${esc(key)}">تصدير Excel</a></div>
      <div class="filter"><button class="on" data-f="all">الكل</button><button data-f="yes">سيحضرون</button><button data-f="no">معتذرون</button></div>
      <ul class="guest-list" id="guest-list">${guestRows(rsvps)}</ul>
    </section>` : `
    <section class="b-card"><h2>تأكيد الحضور</h2><p class="muted">باقتك الحالية تشمل الفيديو فقط. للترقية للباقة الكاملة تواصل معنا.</p></section>`}
  </div>
</main>`;
  return page({ title: 'لوحة التحكم — عزيمة', body, css: ['builder.css', 'host.css'], js: ['host.js'], noindex: true });
}

const arNum = (n) => new Intl.NumberFormat('ar-SA-u-nu-arab').format(n);
export function guestRows(rsvps) {
  if (!rsvps.length) return '<li class="empty">ما وصلت ردود للحين — أرسل الدعوة وتابع هنا 🤍</li>';
  return rsvps.map((r) => `<li data-a="${r.attending ? 'yes' : 'no'}">
    <span class="dot ${r.attending ? 'ok' : 'no'}"></span>
    <div><b>${esc(r.name)}</b>${r.message ? `<em>«${esc(r.message)}»</em>` : ''}</div>
    <small>${r.attending ? (r.companions ? `+${arNum(r.companions)} مرافق` : 'سيحضر') : 'معتذر'}</small></li>`).join('');
}

// ======================= video page (renderer only) =======================
export function videoPage({ data, template }) {
  const d = data || demoData(template);
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONTS_URL}"><link rel="stylesheet" href="/css/invite.css?v=${V}">
<style>html,body{margin:0;width:540px;height:960px;overflow:hidden;background:#000}.poster{width:540px}</style></head>
<body>${renderPoster(d, { mode: 'video' })}
<script>
  document.getAnimations().forEach(a => a.pause());
  window.__seek = (ms) => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms; } };
</script></body></html>`;
}

// ======================= admin =======================
export function adminPage(list, stats, key) {
  const body = `
<header class="site-header slim"><div class="wrap header-in">${logo()}<span class="muted small">الإدارة</span></div></header>
<main class="wrap admin">
  <div class="h-stats b-card"><div class="stat"><b>${stats.total}</b><small>طلبات</small></div><div class="stat"><b>${stats.paid || 0}</b><small>مدفوعة</small></div><div class="stat"><b>${stats.revenue}</b><small>ريال</small></div></div>
  <div class="b-card"><table class="tbl"><thead><tr><th>الطلب</th><th>العميل</th><th>الباقة</th><th>الحالة</th><th>الفيديو</th><th>التاريخ</th><th></th></tr></thead><tbody>
  ${list.map((i) => `<tr><td><a href="/i/${esc(i.slug)}" target="_blank">${esc(titleFor(i.data))}</a><br><small dir="ltr">${esc(i.slug)}</small></td>
    <td>${esc(i.contact_name || '')}<br><a dir="ltr" href="https://wa.me/${esc(String(i.contact_phone || '').replace(/^0/, '966').replace(/\D/g, ''))}" target="_blank">${esc(i.contact_phone || '')}</a></td>
    <td>${esc(PACKAGES[i.package]?.name || i.package)}<br>${i.price} ر.س</td>
    <td><span class="pill ${i.status === 'paid' ? 'ok' : ''}">${i.status === 'paid' ? 'مدفوع' : 'بانتظار الدفع'}</span></td>
    <td>${esc(i.video_status)}${i.video_error ? `<br><small title="${esc(i.video_error)}">خطأ</small>` : ''}</td>
    <td><small>${esc(i.created_at)}</small></td>
    <td class="row-btns">${i.status !== 'paid' ? `<button class="btn btn-sm btn-primary" data-admin="mark-paid" data-slug="${esc(i.slug)}">تأكيد الدفع</button>` : ''}
      <button class="btn btn-sm btn-ghost" data-admin="rerender" data-slug="${esc(i.slug)}">إعادة الفيديو</button>
      <a class="btn btn-sm btn-ghost" href="/host/${esc(i.slug)}?key=${esc(i.host_key)}" target="_blank">اللوحة</a></td></tr>`).join('')}
  </tbody></table></div>
</main>
<script>document.addEventListener('click',async e=>{const b=e.target.closest('[data-admin]');if(!b)return;b.disabled=true;
const r=await fetch('/api/admin/'+b.dataset.slug+'/'+b.dataset.admin+'?key=${encodeURIComponent(key)}',{method:'POST'});b.textContent=r.ok?'✓':'خطأ';setTimeout(()=>location.reload(),600)});</script>`;
  return page({ title: 'الإدارة — عزيمة', body, css: ['builder.css', 'host.css'], noindex: true });
}

export function notFound() {
  return page({
    title: 'غير موجود — عزيمة', noindex: true,
    body: `${header()}<main class="wrap nf"><h1>الصفحة غير موجودة</h1><p class="muted">ممكن الرابط ناقص أو انتهت صلاحيته.</p><a class="btn btn-primary" href="/">الرئيسية</a></main>`,
  });
}
