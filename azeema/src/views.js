import { config, PACKAGES, priceOf } from './config.js';
import { renderPoster, esc, THEMES, OCCASIONS, DEMOS, formatDates, eventInstant, titleFor, FONTS_URL } from '../public/js/shared/invite.js';
import { loadingIndicator, shapeBadge } from '../public/js/shared/shapes.js';
import { icon } from '../public/js/shared/icons.js';

const V = '21'; // asset cache-buster
const ICON = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#EF5A2A"/><text x="32" y="45" font-size="36" text-anchor="middle" fill="#fff" font-family="serif">ع</text></svg>')}`;
const ar = (n) => new Intl.NumberFormat('en-US').format(n); // app UI uses Western digits (invitations keep Arabic-Indic)
const img = (t) => `/img/designs/${THEMES[t] ? t : 'sage'}.jpg`;

// ---------------------------------------------------------------- icons (Google Material Symbols, Rounded)
const ms = (n, size = 24, cls = '') => icon(n, { size, cls });
const I = {
  search: ms('search', 26), chevDown: ms('expand_more', 22, 'chev'), chevUp: ms('expand_less', 28, 'chev'), back: ms('arrow_back', 24, 'flip-rtl'),
  pin: ms('location_on_f', 22), bell: ms('notifications_f', 30), copy: ms('content_copy', 20), cal: ms('calendar_month', 22),
  share: ms('ios_share', 22), map: ms('map_f', 22), x: ms('close', 22), check: ms('check', 20), play: ms('play_arrow_f', 18), star: ms('star', 20),
  wa: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.3-.2-.5-.3z"/></svg>',
};
// navigation: outlined when idle, filled when active (M3 navigation bar behaviour)
const navIcon = (n) => `<span class="ni">${ms(n, 28, 'ni-o')}${ms(n + '_f', 28, 'ni-f')}</span>`;
const OCC_ICON = { wedding: 'favorite', milka: 'auto_awesome', graduation: 'school', newborn: 'child_care', opening: 'storefront', gathering: 'coffee' };
const occIcon = (k, size = 22) => ms(OCC_ICON[k] + '_f', size);

const brand = (href = '/') => `<a class="brand pressable" href="${href}" aria-label="عزيمة — الرئيسية"><span class="brand-mark">ع</span><span class="brand-word">عزيمة</span></a>`;

// ---------------------------------------------------------------- shell
// Fonts each invitation theme actually renders with (preloaded on the guest page)
const THEME_FONTS = {
  sage: ['Tajawal-300-arabic', 'Tajawal-400-arabic', 'ArefRuqaa-700-arabic'],
  arch: ['Tajawal-300-arabic', 'Tajawal-400-arabic', 'ReemKufi-400_700-arabic', 'ArefRuqaa-400-arabic'],
  lilac: ['Tajawal-300-arabic', 'Tajawal-400-arabic', 'ReemKufi-400_700-arabic', 'ArefRuqaa-700-arabic'],
  royal: ['Amiri-400-arabic', 'ArefRuqaa-700-arabic'], hijazi: ['Amiri-400-arabic', 'ArefRuqaa-700-arabic'],
  sadu: ['Amiri-400-arabic', 'ReemKufi-400_700-arabic'], bloom: ['Amiri-400-arabic', 'ElMessiri-400_700-arabic'],
  editorial: ['Amiri-700-arabic', 'IBMPlexSansArabic-300-arabic'], oasis: ['ReemKufi-400_700-arabic', 'IBMPlexSansArabic-400-arabic'],
};

function page({ title, desc = 'دعوات رقمية متحركة مع صفحة تأكيد حضور — جاهزة خلال ساعة.', body, js = [], css = [], og = {}, bodyClass = '', noindex = false, nav = null, theme = '#F9F5F2', fonts = null }) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="${theme}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(og.title || title)}">
<meta property="og:description" content="${esc(og.desc || desc)}">
<meta property="og:image" content="${esc(og.image || `${config.baseUrl}/img/og.jpg`)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${ICON}">
${(fonts || ['IBMPlexSansArabic-400-arabic', 'IBMPlexSansArabic-600-arabic', 'IBMPlexSansArabic-700-arabic', 'ArefRuqaa-700-arabic'])
    .map((f) => `<link rel="preload" href="/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`).join('\n')}
<link rel="stylesheet" href="${FONTS_URL}?v=${V}">
${['springs.css', 'm3.css', 'app.css', ...css].map((c) => `<link rel="stylesheet" href="/css/${c}?v=${V}">`).join('\n')}
</head>
<body class="${bodyClass}">
${body}
${nav ? navbar(nav) : ''}
${js.map((s) => `<script type="module" src="/js/${s}?v=${V}"></script>`).join('\n')}
</body>
</html>`;
}

function navbar(active) {
  const item = (k, href, icon, label) =>
    `<a class="nav-item pressable" href="${href}" ${active === k ? 'aria-current="page"' : ''} aria-label="${label}">${icon}<span class="tip">${label}</span></a>`;
  return `<nav class="navbar" aria-label="التنقل">
  <div class="nav-group">
    <i class="nav-indicator"></i>
    ${item('home', '/', navIcon('home'), 'الرئيسية')}
    ${item('offers', '/#pricing', navIcon('sell'), 'الأسعار والعروض')}
    ${item('designs', '/designs', navIcon('grid_view'), 'التصاميم')}
    ${item('orders', '/orders', `<span class="badge-wrap">${navIcon('package_2')}<span class="badge" data-orders-badge></span></span>`, 'طلباتي')}
  </div>
  <div class="nav-solo"><a class="nav-item pressable" href="/create" ${active === 'create' ? 'aria-current="page"' : ''} aria-label="صمّم دعوتك">${ms('add', 32)}<span class="tip">صمّم دعوتك</span></a></div>
</nav>`;
}

const themeOrder = ['sage', 'arch', 'lilac', 'royal', 'sadu', 'hijazi', 'bloom', 'editorial', 'oasis'];
const GROUPS = [
  { title: 'ناعمة ونباتية', themes: ['sage', 'arch', 'lilac', 'bloom'] },
  { title: 'تراثية سعودية', themes: ['sadu', 'hijazi', 'royal'] },
  { title: 'عصرية وهادئة', themes: ['editorial', 'oasis'] },
];
// Palm frond: curved rib + paired leaflets (for the hero still-life)
function frond(x, y, rot, sc, seed) {
  let d = ''; // all leaflets in one path (one element instead of ~30)
  for (let i = 2; i < 17; i++) {
    const t = i / 17, px = Math.sin(t * 1.2) * 18, py = -t * 240, L = 26 + Math.sin(t * Math.PI) * 30;
    for (const side of [-1, 1]) d += `M${px.toFixed(1)} ${py.toFixed(1)}q${(side * L * 0.5).toFixed(1)} ${(-L * 0.15).toFixed(1)} ${(side * L).toFixed(1)} ${(L * 0.35).toFixed(1)}`;
  }
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})" fill="none" stroke="hsl(${125 + seed * 4} 28% ${14 + seed * 2.2}%)" stroke-linecap="round">
    <path d="M0 0 C 8 -80 18 -160 18 -250" stroke-width="3.2"/><path d="${d}" stroke-width="${2.6 - seed * 0.1}"/></g>`;
}
const demoData = (t) => ({ ...(DEMOS[t] || DEMOS.sage), template: t });

// ================================================================ HOME
export function landing() {
  const full = PACKAGES.full, video = PACKAGES.video;
  const slides = [['دعوتك', 'هديّة'], ['فرحتكم', 'تستاهل'], ['حضوركم', 'يسعدنا']];
  const stage = ['bloom', 'lilac', 'sage', 'arch', 'royal'];
  const body = `
<header class="hero" data-hero>
  <div class="scene" aria-hidden="true">
    <div class="sc-window"><i></i><i></i></div>
    <div class="sc-light"></div>
    <svg class="sc-plant" viewBox="0 0 220 320">${frond(70, 320, -58, 1, 1)}${frond(70, 320, -32, .95, 2)}${frond(70, 320, -8, 1.05, 3)}${frond(70, 320, 16, .85, 4)}${frond(70, 320, -78, .75, 5)}${frond(70, 320, 34, .7, 6)}</svg>
    <div class="sc-stones"><i></i><i></i><i></i></div>
    <div class="sc-stage">${stage.map((t, i) => `<figure class="bottle b${i}" style="--i:${i}"><img src="${img(t)}" alt="" loading="eager"><span class="refl"></span></figure>`).join('')}</div>
    <div class="sc-wood">${[0, 1, 2, 3, 4].map((i) => `<i style="--i:${i}"></i>`).join('')}</div>
    <div class="sc-vignette"></div>
  </div>
  <div class="hero-top wrap">
    <button class="glass-pill pressable" id="occ-pick" type="button" aria-haspopup="menu">${I.pin}<span id="occ-label">زواج</span>${I.chevDown}</button>
    <a class="avatar pressable badge-wrap" href="/orders" aria-label="طلباتي"><span class="brand-mark lg">ع</span><span class="badge dark" data-orders-badge></span></a>
  </div>
  <form class="wrap hero-search" action="/designs" role="search">
    <label class="search glass"><input name="q" placeholder="ابحث عن تصميم أو مناسبة" aria-label="ابحث عن تصميم أو مناسبة"><button class="icon-plain" aria-label="بحث">${I.search}</button></label>
  </form>
  <div class="hero-title" aria-live="polite">
    ${slides.map(([a, b], i) => `<h1 class="calli${i === 0 ? ' on' : ''}" data-slide="${i}"><span>${a}</span><b>${b}</b></h1>`).join('')}
  </div>
  <div class="dots" role="tablist" aria-label="الشرائح">${slides.map((_, i) => `<button role="tab" aria-label="شريحة ${i + 1}" ${i === 0 ? 'aria-selected="true"' : ''} data-go="${i}"></button>`).join('')}</div>
  <div class="occ-strip">
    ${Object.entries(OCCASIONS).map(([k, o], i) => `${i ? '<i class="sep"></i>' : ''}<a href="/designs?occasion=${k}" class="occ-logo pressable">${occIcon(k, 24)}${esc(o.label)}</a>`).join('')}
  </div>
</header>

<main class="home">
  <section class="promo-row" aria-label="عروض">
    <article class="promo promo-white pressable" data-reveal>
      <p class="promo-kicker">${esc(full.name)} · عرض الإطلاق</p>
      <h2>دعوتك كاملة</h2>
      <p class="promo-sub">فيديو + صفحة دعوة + تأكيد حضور</p>
      <a class="btn btn-filled btn-sm" href="/create">اطلبها الآن</a>
      <img class="promo-img tilt" src="${img('sage')}" alt="" loading="lazy">
    </article>
    <a class="promo promo-photo pressable" href="/create?template=lilac" data-reveal style="--bg:url(${img('lilac')})">
      <span class="promo-brand">ليلك</span><span class="promo-tag">إكليل مرسوم باليد</span>
    </a>
    <article class="promo promo-dark pressable" data-reveal>
      <video src="/media/sage-preview.mp4" poster="${img('sage')}" muted loop playsinline preload="none"></video>
      <div class="promo-dark-in"><span class="promo-kicker">${I.play} فيديو متحرك</span><h2>١٥ ثانية<br>من الفرح</h2></div>
    </article>
    <a class="promo promo-photo pressable" href="/create?template=arch" data-reveal style="--bg:url(${img('arch')})">
      <span class="promo-brand">قوس</span><span class="promo-tag">قوس ذهبي وأوراق مائية</span>
    </a>
  </section>

  <section class="wrap sec" data-reveal>
    <div class="sec-head"><h2 class="headline-s">لكل مناسباتكم</h2><a class="btn btn-text btn-sm" href="/designs">عرض الكل</a></div>
    <div class="chips">${Object.entries(OCCASIONS).map(([k, o], i) => `<a class="chip pressable${i === 0 ? ' on' : ''}" href="/designs?occasion=${k}">${occIcon(k, 20)}${esc(o.label)}</a>`).join('')}</div>
  </section>

  <section class="wrap sec" id="designs">
    <div class="sec-head" data-reveal><h2 class="headline-s">الأكثر طلباً</h2><a class="btn btn-text btn-sm" href="/designs">كل التصاميم</a></div>
    <div class="tiles">
      ${themeOrder.slice(0, 6).map((t) => `<a class="tile pressable" href="/create?template=${t}" data-reveal>
        <span class="tile-img"><img src="${img(t)}" alt="" loading="lazy"></span>
        <span class="tile-meta"><b>${esc(THEMES[t].name)}</b><small>${esc(THEMES[t].desc)}</small><em>من ${ar(priceOf('video'))} ر.س</em></span>
      </a>`).join('')}
    </div>
  </section>

  <section class="wrap sec" data-reveal>
    <h2 class="headline-s">وش يوصلك؟</h2>
    <section class="xp details" data-morph data-open="false">
      <button class="xp-head pressable" type="button" aria-expanded="false">${I.chevDown}<span>تفاصيل الباقة الكاملة</span></button>
      <div class="xp-body"><div class="xp-inner">
        <dl class="kv">
          <div class="span2"><dt>الباقة</dt><dd>${esc(full.name)}</dd></div>
          <div><dt>الفيديو</dt><dd>١٥ ثانية</dd></div><div><dt>المقاس</dt><dd dir="ltr">1080×1920</dd></div>
          <div><dt>التسليم</dt><dd>خلال ساعة</dd></div><div><dt>التعديل</dt><dd>مرة مجاناً</dd></div>
          <div><dt>تأكيد الحضور</dt><dd>غير محدود</dd></div><div><dt>السعر</dt><dd>${ar(full.launchPrice)} ر.س</dd></div>
        </dl>
      </div></div>
    </section>
  </section>

  <section class="wrap sec steps" data-reveal>
    ${[['١', 'اختر التصميم', 'اكتب الأسماء والموعد وشوف دعوتك تتشكل قدامك.'], ['٢', 'ادفع بأمان', 'مدى، Apple Pay أو بطاقة.'], ['٣', 'أرسلها لضيوفك', 'الفيديو ورابط الدعوة ولوحة الحضور خلال ساعة.']]
    .map(([n, t, d]) => `<div class="step card"><span class="step-n">${n}</span><div><h3 class="title-m">${t}</h3><p class="body-m on-variant">${d}</p></div></div>`).join('')}
  </section>

  <section class="wrap sec" id="pricing">
    <h2 class="headline-s" data-reveal>الأسعار</h2>
    <div class="prices">
      <article class="price card featured" data-reveal>
        <span class="pill-orange">عرض الإطلاق</span>
        <h3 class="title-l">${esc(full.name)}</h3>
        <p class="amount"><b>${ar(full.launchPrice)}</b> ر.س <s>${ar(full.price)}</s></p>
        <ul>${full.features.map((f) => `<li>${I.check}${esc(f)}</li>`).join('')}</ul>
        <a class="btn btn-filled btn-block btn-lg" href="/create?package=full">ابدأ الآن</a>
      </article>
      <article class="price card" data-reveal>
        <h3 class="title-l">${esc(video.name)}</h3>
        <p class="amount"><b>${ar(video.price)}</b> ر.س</p>
        <ul>${video.features.map((f) => `<li>${I.check}${esc(f)}</li>`).join('')}</ul>
        <a class="btn btn-tonal btn-block btn-lg" href="/create?package=video">اختر الباقة</a>
      </article>
    </div>
  </section>

  <section class="wrap sec" id="faq">
    <h2 class="headline-s" data-reveal>أسئلة شائعة</h2>
    <div class="faq">
      ${[
    ['متى توصلني الدعوة؟', 'صفحة الدعوة تشتغل فوراً بعد الدفع، والفيديو يجهز عادةً خلال دقائق.'],
    ['هل أقدر أعدّل بعد الدفع؟', 'نعم، تعديل مجاني مرة واحدة ويتجدد الفيديو تلقائياً.'],
    ['هل الضيوف يحتاجون تطبيق؟', 'لا. الدعوة رابط يفتح مباشرة من الواتساب.'],
    ['هل بيانات ضيوفي خاصة؟', 'نعم. قائمة الحضور ما يشوفها إلا أنت عبر رابط لوحتك الخاص.'],
  ].map(([q, a]) => `<section class="xp faq-item" data-open="false" data-reveal>
        <button class="xp-head pressable" type="button" aria-expanded="false"><span>${esc(q)}</span>${I.chevDown}</button>
        <div class="xp-body"><div class="xp-inner"><p>${esc(a)}</p></div></div></section>`).join('')}
    </div>
  </section>
  <footer class="wrap foot">${brand()}<p class="body-m on-variant">صُنعت بحب في السعودية 🇸🇦 — © ${new Date().getFullYear()}</p></footer>
</main>`;
  const occJson = JSON.stringify(Object.fromEntries(Object.entries(OCCASIONS).map(([k, o]) => [k, { label: o.label, icon: occIcon(k, 22) }])));
  return page({ title: 'عزيمة — دعوات رقمية متحركة وتأكيد حضور', body: body + `<script>window.__OCC__=${occJson};</script>`, js: ['home.js'], nav: 'home', bodyClass: 'is-home', theme: '#0F1011' });
}

// ================================================================ DESIGNS (categories)
export function designsPage({ q = '', occasion = 'wedding' } = {}) {
  const occ = OCCASIONS[occasion] ? occasion : 'wedding';
  const body = `
<main class="cat">
  <form class="wrap cat-search" role="search" onsubmit="return false">
    <label class="search"><input id="q" value="${esc(q)}" placeholder="ابحث عن اللي في بالك" aria-label="ابحث في التصاميم"><span aria-hidden="true">${I.search}</span></label>
  </form>
  <div class="wrap cat-body">
    <aside class="cat-side" aria-label="المناسبات">
      ${Object.entries(OCCASIONS).map(([k, o]) => `<button class="side-item pressable${k === occ ? ' on' : ''}" data-occ="${k}" type="button"><span class="side-ico">${occIcon(k, 30)}</span><span>${esc(o.label)}</span></button>`).join('')}
    </aside>
    <div class="cat-main">
      ${GROUPS.map((g) => `
      <section class="xp group card-flat" data-open="true" data-reveal>
        <button class="xp-head pressable" type="button" aria-expanded="true">
          <span class="g-title"><b>${esc(g.title)}</b><small>${ar(g.themes.length)} تصاميم</small></span>${I.chevUp}
        </button>
        <div class="xp-body"><div class="xp-inner">
          <div class="g-grid">
            ${g.themes.map((t) => `<button type="button" class="g-tile pressable" data-theme="${t}" data-name="${esc(THEMES[t].name)} ${esc(THEMES[t].desc)}">
              <span class="g-img"><img src="${img(t)}" alt="" loading="lazy"></span><span>${esc(THEMES[t].name)}</span></button>`).join('')}
          </div>
        </div></div>
      </section>`).join('')}
      <p class="empty-q on-variant" hidden>ما لقينا تصميم بهالاسم — جرّب كلمة ثانية</p>
    </div>
  </div>
</main>
<div class="sheet" id="design-sheet" hidden role="dialog" aria-modal="true" aria-label="تفاصيل التصميم">
  <div class="handle" aria-hidden="true"></div>
  <button class="icon-btn pressable sheet-close" type="button" data-close aria-label="إغلاق">${I.x}</button>
  <div class="ds">
    <img class="ds-img" alt="">
    <div class="ds-info">
      <h2 class="headline-s ds-name"></h2>
      <p class="body-l on-variant ds-desc"></p>
      <p class="title-m">من ${ar(priceOf('video'))} ر.س <span class="on-variant body-m">· الباقة الكاملة ${ar(priceOf('full'))} ر.س</span></p>
      <div class="ds-actions"><a class="btn btn-filled btn-lg ds-use">استخدم التصميم</a><a class="btn btn-tonal btn-lg ds-demo">معاينة حية</a></div>
    </div>
  </div>
</div>
<script>window.__THEMES__=${JSON.stringify(Object.fromEntries(themeOrder.map((t) => [t, { name: THEMES[t].name, desc: THEMES[t].desc }])))};</script>`;
  return page({ title: 'التصاميم — عزيمة', body, js: ['designs.js'], nav: 'designs', bodyClass: 'is-app' });
}

// ================================================================ ORDERS
export function ordersPage() {
  const sk = `<div class="order card skel-card" aria-hidden="true"><div class="o-head"><span class="skeleton" style="width:56px;height:56px;border-radius:50%"></span><span class="skeleton" style="width:46%;height:20px"></span></div><span class="skeleton" style="display:block;width:30%;height:22px;margin:18px 0"></span><span class="skeleton" style="display:block;width:100%;height:18px"></span></div>`;
  const body = `
<main class="orders wrap">
  <header class="app-head">
    <h1 class="headline-l">طلباتي</h1>
    <a class="badge-wrap bell pressable" href="#list" aria-label="الردود الجديدة" id="bell">${I.bell}<span class="badge" id="bell-n" data-n="0"></span></a>
  </header>
  <div class="chips" role="tablist" aria-label="تصفية">
    <button class="chip pressable on" data-f="all" type="button">الكل</button>
    <button class="chip pressable" data-f="ready" type="button">جاهزة</button>
    <button class="chip pressable" data-f="pending" type="button">بانتظار الدفع</button>
  </div>
  <div class="order-list" id="list" aria-busy="true">${sk}${sk}</div>
  <div class="empty card" id="empty" hidden>
    ${shapeBadge({ shape: 4, size: 76 })}
    <h2 class="title-l">ما عندك دعوات على هالجهاز</h2>
    <p class="body-m on-variant">دعواتك تنحفظ هنا تلقائياً لما تصممها من هذا الجوال.</p>
    <a class="btn btn-filled pressable" href="/create">صمّم دعوتك الأولى</a>
  </div>
</main>`;
  return page({ title: 'طلباتي — عزيمة', body, js: ['orders.js'], nav: 'orders', bodyClass: 'is-app', noindex: true });
}

// ================================================================ BUILDER
export function builder({ edit, template, occasion, ref }) {
  const initial = edit
    ? { data: edit.data, package: edit.package, contactName: edit.contact_name, contactPhone: edit.contact_phone }
    : { data: { template: THEMES[template] ? template : 'sage', occasion: OCCASIONS[occasion] ? occasion : 'wedding' }, package: 'full' };
  const sw = (name, label, sub) => `<label class="switch"><span class="sw-text"><b class="title-s">${label}</b>${sub ? `<small class="body-m on-variant">${sub}</small>` : ''}</span><input type="checkbox" data-toggle="${name}" checked><span class="track"><span class="thumb">${I.check}</span></span></label>`;
  const body = `
<header class="app-bar">
  <a class="icon-btn pressable" href="/" aria-label="رجوع">${I.back}</a>
  <h1 class="title-l">${edit ? 'تعديل الدعوة' : 'صمّم دعوتك'}</h1>
  <span class="app-bar-space"></span>
  <div class="progress-linear" aria-hidden="true"><i id="step-progress"></i></div>
</header>
<main class="builder wrap">
  <form id="builder" class="b-form" novalidate>
    <section class="card b-sec" id="s-occasion">
      <h2 class="title-l">وش المناسبة؟</h2>
      <div class="chips wrap-chips">${Object.entries(OCCASIONS).map(([k, o]) => `<label class="chip pressable"><input type="radio" name="occasion" value="${k}" class="vh">${occIcon(k, 20)}${esc(o.label)}</label>`).join('')}</div>
    </section>

    <section class="card b-sec" id="s-design">
      <h2 class="title-l">اختر التصميم</h2>
      <div class="d-scroll">
        ${themeOrder.map((t) => `<label class="d-opt pressable"><input type="radio" name="template" value="${t}" class="vh"><span class="d-img"><img src="${img(t)}" alt="" loading="lazy"><i class="d-check">${I.check}</i></span><span class="label-l">${esc(THEMES[t].name)}</span></label>`).join('')}
      </div>
    </section>

    <section class="card b-sec" id="s-text">
      <h2 class="title-l">الأسماء والنصوص</h2>
      <div class="grid2">
        <label class="field"><span class="lbl" data-label="name1">الاسم</span><input name="name1" maxlength="40" required></label>
        <label class="field" data-show="name2"><span class="lbl" data-label="name2">الاسم الثاني</span><input name="name2" maxlength="40"></label>
        <label class="field"><span class="lbl">أصحاب الدعوة <small>اختياري</small></span><textarea name="hosts" rows="2" maxlength="200" placeholder="عائلة …"></textarea></label>
        <label class="field"><span class="lbl">الطرف الثاني <small>اختياري</small></span><textarea name="hosts2" rows="2" maxlength="200" placeholder="عائلة …"></textarea></label>
        <label class="field span2"><span class="lbl">نص الدعوة</span><input name="inviteText" maxlength="140"></label>
        <label class="field span2"><span class="lbl">سطر إضافي <small>تخصص، شعار… اختياري</small></span><input name="subtitle" maxlength="120"></label>
        <label class="field span2"><span class="lbl">العبارة الختامية</span><input name="closing" maxlength="90"></label>
      </div>
      <div class="toggles">
        <div class="tg">${sw('topLine', 'البسملة')}<div class="tg-body"><label class="field"><input name="topLine" maxlength="80" aria-label="البسملة"></label></div></div>
        <div class="tg">${sw('verse', 'آية أو دعاء', 'يظهر تحت البسملة')}<div class="tg-body"><label class="field"><input name="verse" maxlength="160" aria-label="آية أو دعاء"></label></div></div>
        <div class="tg">${sw('notes', 'ملاحظات للضيوف', 'مثل: جنة الأطفال منازلهم')}<div class="tg-body"><label class="field"><textarea name="notes" rows="2" maxlength="240" aria-label="ملاحظات — كل ملاحظة بسطر"></textarea></label></div></div>
      </div>
    </section>

    <section class="card b-sec" id="s-when">
      <h2 class="title-l">الموعد والمكان</h2>
      <div class="grid2">
        <label class="field"><span class="lbl">التاريخ</span><input type="date" name="date" required><span class="hint" id="hijri-hint"></span></label>
        <label class="field"><span class="lbl">وقت الاستقبال</span><input type="time" name="time" value="20:30"></label>
        <label class="field"><span class="lbl">القاعة / المكان</span><input name="venue" maxlength="90" placeholder="قاعة …"></label>
        <label class="field"><span class="lbl">المدينة</span><input name="city" maxlength="60" placeholder="الرياض"></label>
        <label class="field span2"><span class="lbl">رابط قوقل ماب <small>اختياري</small></span><input name="mapUrl" type="url" inputmode="url" placeholder="https://maps.app.goo.gl/…" dir="ltr"></label>
      </div>
      <p class="title-s sub-lbl">الحضور</p>
      <div class="segmented" role="radiogroup" aria-label="الحضور">
        ${[['', 'الكل'], ['women', 'نساء'], ['men', 'رجال'], ['family', 'عائلي']].map(([v, l]) => `<label><input type="radio" name="audience" value="${v}"><span>${l}</span></label>`).join('')}
      </div>
      <p class="title-s sub-lbl">أقصى عدد مرافقين لكل ضيف</p>
      <div class="slider"><span class="bubble"></span><input type="range" name="maxCompanions" min="0" max="10" value="3" aria-label="أقصى عدد مرافقين"></div>
    </section>

    <section class="card b-sec" id="s-pay">
      <h2 class="title-l">الباقة</h2>
      <div class="pkgs">
        ${Object.entries(PACKAGES).map(([k, p]) => `<label class="pkg pressable"><input type="radio" name="package" value="${k}" class="vh"><span class="pkg-in">
          <b class="title-m">${esc(p.name)}</b><span class="pkg-price"><b>${ar(priceOf(k))}</b> ر.س ${p.launchPrice ? `<s>${ar(p.price)}</s>` : ''}</span>
          <small class="body-m on-variant">${esc(p.features.slice(0, 3).join('، '))}</small><i class="pkg-radio"></i></span></label>`).join('')}
      </div>
      <div class="grid2">
        <label class="field"><span class="lbl">اسمك</span><input name="contactName" maxlength="60" autocomplete="name"></label>
        <label class="field"><span class="lbl">جوالك (واتساب)</span><input name="contactPhone" inputmode="tel" autocomplete="tel" placeholder="05XXXXXXXX" dir="ltr" required></label>
      </div>
      <button class="btn btn-filled btn-lg btn-block submit" type="submit">${edit ? 'احفظ التعديلات' : 'التالي: الدفع'}</button>
      <p class="body-m on-variant center">تقدر تعدّل مجاناً مرة واحدة بعد الدفع.</p>
    </section>
  </form>

  <aside class="b-preview" aria-label="معاينة">
    <div class="phone"><div class="phone-notch"></div><div class="phone-screen" id="preview"></div></div>
    <p class="label-m on-variant center">معاينة مباشرة</p>
  </aside>
</main>
<button class="fab pressable preview-fab" id="preview-open" type="button">${I.play} معاينة</button>
<div class="sheet" id="preview-sheet" hidden data-keep role="dialog" aria-modal="true" aria-label="معاينة الدعوة">
  <div class="handle"></div>
  <button class="icon-btn pressable sheet-close" type="button" data-close aria-label="إغلاق">${I.x}</button><div class="sheet-preview" id="preview-m"></div>
</div>
<script>window.__INITIAL__=${JSON.stringify({ ...initial, edit: edit ? { slug: edit.slug, key: edit.host_key } : null, ref: ref || null }).replace(/</g, '\\u003c')};</script>`;
  return page({ title: 'صمّم دعوتك — عزيمة', body, css: ['invite.css'], js: ['builder.js'], bodyClass: 'is-app is-builder', noindex: !!edit });
}

// ================================================================ CHECKOUT
export function checkout(inv, mode) {
  const p = PACKAGES[inv.package];
  const d = inv.data;
  const dates = formatDates(d.date, d.time);
  const hostUrl = `${config.baseUrl}/host/${inv.slug}?key=${inv.host_key}`;
  const body = `
<header class="app-bar"><a class="icon-btn pressable" href="/create?edit=${esc(inv.slug)}&key=${esc(inv.host_key)}" aria-label="رجوع">${I.back}</a><h1 class="title-l">إتمام الطلب</h1><span class="app-bar-space"></span></header>
<main class="wrap checkout" data-slug="${esc(inv.slug)}" data-key="${esc(inv.host_key)}">
  <div class="co-poster" data-reveal>${renderPoster(d, { mode: 'static', preview: true })}</div>
  <div class="co-col">
    <section class="card" data-reveal>
      <div class="o-head"><img class="o-avatar" src="${img(d.template)}" alt=""><div><h2 class="title-m">${esc(titleFor(d))}</h2><p class="body-m on-variant">${esc([`${dates.weekday} ${dates.hijri}`, d.venue].filter(Boolean).join(' — '))}</p></div></div>
      <div class="co-line"><span class="title-m">${esc(p.name)}</span><span class="pkg-price"><b>${ar(inv.price)}</b> ر.س ${p.launchPrice ? `<s>${ar(p.price)}</s>` : ''}</span></div>
      <ul class="feats">${p.features.map((f) => `<li>${I.check}${esc(f)}</li>`).join('')}</ul>
      <div id="pay-area" data-mode="${mode}">
        ${mode === 'moyasar' ? `<button class="btn btn-filled btn-lg btn-block" data-pay>ادفع ${ar(inv.price)} ر.س بأمان</button><p class="label-m on-variant center">مدى · Apple Pay · Visa · Mastercard</p>` : ''}
        ${mode === 'link' ? `<a class="btn btn-filled btn-lg btn-block" href="${esc(config.paymentLink)}" target="_blank" rel="noopener">ادفع ${ar(inv.price)} ر.س</a><p class="note">بعد الدفع نفعّل دعوتك خلال دقائق (رقم الطلب: <b dir="ltr">${esc(inv.slug)}</b>).</p>` : ''}
        ${mode === 'demo' ? `<button class="btn btn-dark btn-lg btn-block" data-pay data-demo>تفعيل تجريبي</button>` : ''}
        ${mode === 'none' ? `<p class="note">الدفع غير مفعّل بعد. رقم طلبك: <b dir="ltr">${esc(inv.slug)}</b></p>` : ''}
      </div>
    </section>
    <section class="card keep" data-reveal>
      <p class="title-m">🔑 رابط لوحة التحكم</p>
      <p class="body-m on-variant">انحفظ في «طلباتي» على هذا الجوال. لا تشاركه مع أحد.</p>
      <div class="copy-row"><input class="input" readonly value="${esc(hostUrl)}" dir="ltr"><button class="btn btn-tonal btn-sm pressable" data-copy="${esc(hostUrl)}">${I.copy} نسخ</button></div>
    </section>
  </div>
</main>`;
  return page({ title: 'إتمام الطلب — عزيمة', body, css: ['invite.css'], js: ['checkout.js'], bodyClass: 'is-app', noindex: true });
}

// ================================================================ GUEST
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
  const place = [d.venue, d.city].filter(Boolean).join(' ');
  const mapHref = d.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
  const embed = `https://maps.google.com/maps?q=${encodeURIComponent(place || 'الرياض')}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const slug = isDemo ? '' : inv.slug;
  const title = titleFor(d);
  const og = {
    title, desc: `${dates.weekday} ${dates.hijri} — ${[d.venue, d.city].filter(Boolean).join('، ')}`,
    image: !isDemo && paid ? `${config.baseUrl}/media/${slug}/poster.jpg` : `${config.baseUrl}${img(d.template)}`,
  };
  const ac = theme.swatch[1];
  const body = `
<div class="cover" id="cover" style="--c-bg:${theme.swatch[0]};--c-ac:${ac}">
  <div class="cover-half r"></div><div class="cover-half l"></div>
  <div class="cover-in">
    <p class="cover-kicker">دعوة خاصة</p>
    ${to ? `<p class="cover-to">إلى: ${esc(to)}</p>` : ''}
    <button class="seal pressable" id="open" aria-label="افتح الدعوة"><span>${esc(mono)}</span></button>
    <p class="cover-hint">اضغط لفتح الدعوة</p>
  </div>
</div>
<main class="guest closed" id="guest" style="--g-bg:${theme.swatch[0]};--md-primary:${ac}">
  <div class="g-poster">${renderPoster(d, { mode: 'page', preview: !paid, to })}</div>
  <div class="g-col">
    <section class="card g-count" data-start="${start ? start.toISOString() : ''}">
      <p class="label-l on-variant">باقي على الموعد</p>
      <div class="count">${['d:يوم', 'h:ساعة', 'm:دقيقة', 's:ثانية'].map((x) => { const [k, l] = x.split(':'); return `<div><b data-u="${k}">0</b><small>${l}</small></div>`; }).join('')}</div>
      <p class="body-l">${esc(`يوم ${dates.weekday}، ${dates.hijri}`)}<br><span class="on-variant body-m">${esc(dates.greg)}${dates.time ? ' — الساعة ' + esc(dates.time) : ''}</span></p>
    </section>

    <div class="map-slot" id="map-slot">
      <button class="map-pill pressable" id="map-pill" type="button">
        <span class="map-tex" aria-hidden="true"></span><span class="map-label">${I.map}<b>عرض على الخريطة</b></span>
      </button>
      <div class="map-card" id="map-card" hidden data-embed="${esc(embed)}">
        <div class="map-loading">${loadingIndicator({ contained: true })}</div>
        <button class="map-close pressable" id="map-close" type="button" aria-label="إغلاق الخريطة">${I.x}</button>
        <a class="btn btn-light btn-sm map-open pressable" href="${esc(mapHref)}" target="_blank" rel="noopener">${I.pin} فتح في قوقل ماب</a>
      </div>
    </div>

    <div class="g-actions">
      <a class="btn btn-tonal pressable" href="${isDemo ? '#' : `/i/${esc(slug)}/invite.ics`}">${I.cal} أضف للتقويم</a>
      <button class="btn btn-tonal pressable" data-share data-title="${esc(title)}" type="button">${I.share} مشاركة</button>
    </div>

    ${rsvp ? `
    <section class="card g-rsvp" id="rsvp">
      <h2 class="headline-s">تأكيد الحضور</h2>
      <p class="body-m on-variant">${esc(d.closing || 'يسعدنا حضوركم')}</p>
      <form id="rsvp-form" data-slug="${esc(slug)}" data-demo="${isDemo ? 1 : 0}">
        <label class="field"><span class="lbl">الاسم</span><input name="name" maxlength="60" required value="${esc(to)}" autocomplete="name"></label>
        <div class="segmented" role="radiogroup" aria-label="الحضور">
          <label><input type="radio" name="attending" value="yes" checked><span>سأحضر بإذن الله</span></label>
          <label><input type="radio" name="attending" value="no"><span>أعتذر</span></label>
        </div>
        ${(d.maxCompanions ?? 3) > 0 ? `<div class="companions"><span class="title-s">عدد المرافقين</span>
          <div class="stepper"><button type="button" class="icon-btn pressable" data-step="1" aria-label="زيادة">+</button><output id="comp-out">0</output><button type="button" class="icon-btn pressable" data-step="-1" aria-label="إنقاص">−</button></div>
          <input type="hidden" name="companions" value="0" data-max="${d.maxCompanions ?? 3}"></div>` : ''}
        <label class="field"><span class="lbl">رسالة تهنئة <small>اختياري</small></span><textarea name="message" rows="2" maxlength="300" placeholder="ألف مبروك…"></textarea></label>
        <button class="btn btn-filled btn-lg btn-block" type="submit">إرسال</button>
      </form>
      <div class="rsvp-done" hidden><div class="done-ic">${I.check}</div><h3 class="title-l">وصلنا ردّك</h3><p class="body-m on-variant">شكراً لك، ونتشرف فيك 🤍</p></div>
    </section>` : ''}
    ${!paid ? '<p class="g-note body-m">هذه معاينة — تأكيد الحضور يتفعّل بعد إتمام الطلب.</p>' : ''}
    <footer class="g-foot"><a class="pressable" href="/?ref=${esc(slug || 'demo')}">صمّم دعوتك مع <b>عزيمة</b></a></footer>
  </div>
</main>`;
  return page({ title, desc: og.desc, body, css: ['invite.css', 'guest.css'], js: ['guest.js'], og, bodyClass: 'is-guest', noindex: !isDemo, theme: theme.swatch[0], fonts: [...(THEME_FONTS[d.template] || THEME_FONTS.sage), 'IBMPlexSansArabic-400-arabic'] });
}

// ================================================================ HOST
export function hostPage(inv, rsvps, sum, { welcome, progress = 0 }) {
  const d = inv.data;
  const url = `${config.baseUrl}/i/${inv.slug}`;
  const dates = formatDates(d.date, d.time);
  const p = PACKAGES[inv.package];
  const shareText = `${titleFor(d)}\nيوم ${dates.weekday} ${dates.hijri}${dates.time ? ' الساعة ' + dates.time : ''}\nبانتظاركم 🤍\n${url}`;
  const reminder = `تذكير لطيف 🤍\nموعدنا يوم ${dates.weekday} ${dates.hijri}${dates.time ? ' الساعة ' + dates.time : ''}\n📍 ${[d.venue, d.city].filter(Boolean).join(' — ')}\nالموقع والتفاصيل: ${url}`;
  const key = inv.host_key;
  const kv = (k, v, span) => `<div${span ? ' class="span2"' : ''}><dt>${k}</dt><dd>${esc(v || '—')}</dd></div>`;
  const body = `
<main class="wrap host" id="host" data-slug="${esc(inv.slug)}" data-key="${esc(key)}" data-url="${esc(url)}">
  <header class="app-head">
    <div class="o-head"><img class="o-avatar" src="${img(d.template)}" alt=""><div><h1 class="title-l">${esc(titleFor(d))}</h1><p class="body-m on-variant">${esc(`${dates.weekday}، ${dates.hijri}`)}</p></div></div>
    ${p.rsvp ? `<a class="badge-wrap bell pressable" href="#guests" aria-label="الردود">${I.bell}<span class="badge" data-k="responses" data-n="${sum.responses}">${sum.responses ? ar(sum.responses) : ''}</span></a>` : ''}
  </header>
  ${welcome ? `<div class="welcome card" data-reveal>🎉 <b>مبروك! دعوتك جاهزة.</b> أرسل الرابط لضيوفك، والفيديو يتجهز الحين.</div>` : ''}

  <section class="xp details" data-morph data-open="false">
    <button class="xp-head pressable" type="button" aria-expanded="false">${I.chevDown}<span>التفاصيل</span></button>
    <div class="xp-body"><div class="xp-inner">
      <dl class="kv">
        ${kv('المناسبة', `${OCCASIONS[d.occasion]?.label || ''} — ${THEMES[d.template]?.name || ''}`, true)}
        ${kv('التاريخ', dates.greg)}${kv('الهجري', dates.hijri)}
        ${kv('الوقت', dates.time)}${kv('المكان', [d.venue, d.city].filter(Boolean).join('، '))}
        ${kv('الباقة', p.name)}${kv('التعديلات المتبقية', ar(inv.edits_left))}
      </dl>
      <a class="btn btn-tonal btn-sm pressable" href="/create?edit=${esc(inv.slug)}&key=${esc(key)}">تعديل الدعوة</a>
    </div></div>
  </section>

  ${p.rsvp ? `<section class="stats">
    ${[['guests', 'الحضور المتوقع', sum.guests], ['yes', 'أكدوا', sum.yes], ['no', 'اعتذروا', sum.no], ['views', 'مشاهدة', inv.views]].map(([k, l, n]) => `<div class="stat card-flat"><b data-k="${k}">${ar(n)}</b><small>${l}</small></div>`).join('')}
  </section>` : ''}

  <div class="host-grid">
    <section class="card h-video" data-video="${esc(inv.video_status)}">
      <div class="h-title"><h2 class="title-l">فيديو الدعوة</h2></div>
      <div class="vid-wrap">
        <video ${inv.video_status === 'ready' ? `src="/media/${esc(inv.slug)}/video.mp4" poster="/media/${esc(inv.slug)}/poster.jpg"` : ''} playsinline controls muted loop></video>
        <div class="vid-wait">${loadingIndicator({ size: 'lg', contained: true, label: 'نجهز الفيديو' })}<p class="title-m">نجهّز الفيديو…</p><div class="progress-linear"><i id="vid-progress" style="--v:${progress}%"></i></div><p class="label-m on-variant" id="vid-pct">${ar(progress)}%</p></div>
        <div class="vid-fail"><p class="title-m">تعذّر تجهيز الفيديو</p><p class="body-m on-variant">نعيد المحاولة تلقائياً.</p></div>
      </div>
      <a class="btn btn-dark btn-block vid-dl pressable" href="/media/${esc(inv.slug)}/video.mp4?dl=1">تحميل الفيديو</a>
    </section>

    <div class="h-col">
      <section class="card">
        <h2 class="title-l">رابط الدعوة</h2>
        <div class="copy-row"><input class="input" readonly value="${esc(url)}" dir="ltr"><button class="btn btn-tonal btn-sm pressable" data-copy="${esc(url)}">${I.copy} نسخ</button></div>
        <div class="row-btns"><a class="btn btn-wa pressable" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(shareText)}">${I.wa} أرسل بالواتساب</a><a class="btn btn-tonal pressable" href="/i/${esc(inv.slug)}" target="_blank">فتح الدعوة</a></div>
      </section>
      ${p.rsvp ? `
      <section class="card">
        <h2 class="title-l">رابط باسم الضيف</h2>
        <p class="body-m on-variant">يشوف «إلى: اسمه» على الدعوة، ويتعبّى اسمه في تأكيد الحضور.</p>
        <div class="copy-row"><input class="input" id="guest-name" placeholder="مثال: أبو محمد"><button class="btn btn-dark btn-sm pressable" id="make-link" type="button">إنشاء</button></div>
        <div class="personal-out" hidden><input class="input" readonly dir="ltr"><div class="row-btns"><button class="btn btn-tonal btn-sm pressable" data-copy type="button">${I.copy} نسخ</button><a class="btn btn-wa btn-sm pressable" target="_blank" rel="noopener">${I.wa} واتساب</a></div></div>
      </section>
      <section class="card">
        <h2 class="title-l">رسالة التذكير</h2>
        <label class="field"><textarea rows="5" id="reminder" aria-label="نص التذكير">${esc(reminder)}</textarea></label>
        <div class="row-btns"><button class="btn btn-tonal btn-sm pressable" data-copy-from="#reminder" type="button">${I.copy} نسخ</button><a class="btn btn-wa btn-sm pressable" id="reminder-wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(reminder)}">${I.wa} أرسل</a></div>
      </section>` : ''}
    </div>
  </div>

  ${p.rsvp ? `
  <section class="card guests" id="guests">
    <div class="h-title"><h2 class="title-l">قائمة الضيوف</h2><a class="btn btn-tonal btn-sm pressable" href="/host/${esc(inv.slug)}/rsvps.csv?key=${esc(key)}">تصدير Excel</a></div>
    <div class="chips"><button class="chip pressable on" data-f="all" type="button">الكل</button><button class="chip pressable" data-f="yes" type="button">سيحضرون</button><button class="chip pressable" data-f="no" type="button">معتذرون</button></div>
    <ul class="guest-list" id="guest-list">${guestRows(rsvps)}</ul>
  </section>` : `<section class="card"><h2 class="title-l">تأكيد الحضور</h2><p class="body-m on-variant">باقتك تشمل الفيديو فقط.</p></section>`}
</main>`;
  return page({ title: 'لوحة الدعوة — عزيمة', body, js: ['host.js'], nav: 'orders', bodyClass: 'is-app', noindex: true });
}

export function guestRows(rsvps) {
  if (!rsvps.length) return `<li class="empty">${shapeBadge({ shape: 0, size: 56 })}<span>بانتظار أول رد — أرسل الدعوة 🤍</span></li>`;
  return rsvps.map((r) => `<li data-a="${r.attending ? 'yes' : 'no'}">
    <span class="g-avatar ${r.attending ? 'ok' : 'no'}">${esc(r.name.trim().charAt(0))}</span>
    <div><b>${esc(r.name)}</b>${r.message ? `<em>«${esc(r.message)}»</em>` : ''}</div>
    <small class="g-status ${r.attending ? 'ok' : 'no'}">${r.attending ? (r.companions ? `+${ar(r.companions)} مرافق` : 'سيحضر') : 'معتذر'}</small></li>`).join('');
}

// ================================================================ VIDEO (renderer only)
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

// ================================================================ ADMIN
export function adminPage(list, stats, key) {
  const body = `
<main class="wrap admin">
  <header class="app-head"><h1 class="headline-l">الإدارة</h1></header>
  <section class="stats">${[['طلبات', stats.total], ['مدفوعة', stats.paid || 0], ['ريال', stats.revenue]].map(([l, n]) => `<div class="stat card-flat"><b>${ar(n)}</b><small>${l}</small></div>`).join('')}</section>
  <div class="order-list">
  ${list.map((i) => `<article class="order card">
    <div class="o-head"><img class="o-avatar" src="${img(i.data.template)}" alt=""><div class="o-title"><b class="title-m">${esc(titleFor(i.data))}</b><small class="on-variant" dir="ltr">${esc(i.slug)}</small></div>
      <span class="status-chip ${i.status === 'paid' ? 'ok' : ''}">${i.status === 'paid' ? 'مدفوع' : 'بانتظار الدفع'}</span></div>
    <p class="body-m on-variant">${esc(i.contact_name || '')} · <a dir="ltr" href="https://wa.me/${esc(String(i.contact_phone || '').replace(/^0/, '966').replace(/\D/g, ''))}" target="_blank">${esc(i.contact_phone || '')}</a> · ${esc(PACKAGES[i.package]?.name || i.package)} ${ar(i.price)} ر.س · فيديو: ${esc(i.video_status)} · ${esc(i.created_at)}</p>
    <div class="row-btns">${i.status !== 'paid' ? `<button class="btn btn-filled btn-sm pressable" data-admin="mark-paid" data-slug="${esc(i.slug)}">تأكيد الدفع</button>` : ''}
      <button class="btn btn-tonal btn-sm pressable" data-admin="rerender" data-slug="${esc(i.slug)}">إعادة الفيديو</button>
      <a class="btn btn-tonal btn-sm pressable" href="/host/${esc(i.slug)}?key=${esc(i.host_key)}" target="_blank">اللوحة</a></div>
  </article>`).join('')}
  </div>
</main>
<script type="module">import { snackbar } from '/js/m3.js';
document.addEventListener('click',async e=>{const b=e.target.closest('[data-admin]');if(!b)return;b.disabled=true;
const r=await fetch('/api/admin/'+b.dataset.slug+'/'+b.dataset.admin+'?key=${encodeURIComponent(key)}',{method:'POST'});snackbar(r.ok?'تم ✓':'خطأ');setTimeout(()=>location.reload(),900)});</script>`;
  return page({ title: 'الإدارة — عزيمة', body, bodyClass: 'is-app', noindex: true });
}

export function notFound() {
  return page({
    title: 'غير موجود — عزيمة', noindex: true, nav: 'none', bodyClass: 'is-app',
    body: `<main class="wrap nf">${shapeBadge({ shape: 5, size: 84 })}<h1 class="headline-m">الصفحة غير موجودة</h1><p class="body-l on-variant">ممكن الرابط ناقص أو انتهت صلاحيته.</p><a class="btn btn-filled pressable" href="/">الرئيسية</a></main>`,
  });
}
