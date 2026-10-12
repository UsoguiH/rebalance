// Demo content for the MoLu prototype (no backend). Deterministic, so screens are stable.

export const SECTIONS = {
  eve: {
    key: 'eve', name: 'حواء', for: 'للسيدات', tagline: 'صالونات ومراكز التجميل', img: 'img/eve',
    enter: 'تفضّلي', book: 'احجزي', bookNow: 'احجزي الآن', you: 'كِ', near: 'القريبة منكِ', searchPh: 'ابحثي عن صالون أو خدمة',
    title: 'صالونات حواء', start: 'ابدئي مجاناً', choose: 'اختاري', place: 'صالون',
    staffWord: 'المختصة', anyStaff: 'أي مختصة متاحة', hello: 'أهلاً بكِ',
  },
  adam: {
    key: 'adam', name: 'آدم', for: 'للرجال', tagline: 'حلاقون ومراكز العناية', img: 'img/adam',
    enter: 'تفضّل', book: 'احجز', bookNow: 'احجز الآن', you: 'ك', near: 'القريبة منك', searchPh: 'ابحث عن حلاق أو خدمة',
    title: 'صالونات آدم', start: 'ابدأ مجاناً', choose: 'اختر', place: 'صالون',
    staffWord: 'الحلاق', anyStaff: 'أي حلاق متاح', hello: 'أهلاً بك',
  },
};

export const CITIES = ['الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الخبر', 'الطائف', 'أبها', 'بريدة', 'تبوك'];

// category → icon + services [name, minutes, price]
export const CATEGORIES = {
  eve: [
    { id: 'hair', name: 'الشعر', icon: 'content_cut', services: [['قص شعر', 45, 120], ['استشوار وتصفيف', 40, 90], ['صبغة كاملة', 120, 380], ['هايلايت', 150, 520], ['بروتين', 180, 650]] },
    { id: 'nails', name: 'الأظافر', icon: 'back_hand', services: [['مناكير', 40, 80], ['باديكير', 50, 110], ['جل', 60, 150], ['تركيب أظافر', 90, 220]] },
    { id: 'makeup', name: 'المكياج', icon: 'brush', services: [['مكياج سهرة', 75, 350], ['مكياج ناعم', 50, 220], ['مكياج عروس', 150, 1500]] },
    { id: 'brows', name: 'حواجب ورموش', icon: 'visibility', services: [['تشقير حواجب', 20, 45], ['رسم حواجب', 30, 70], ['رموش كلاسيك', 90, 260]] },
    { id: 'skin', name: 'البشرة', icon: 'face_retouching_natural', services: [['تنظيف بشرة', 60, 250], ['هيدرافيشل', 75, 420]] },
    { id: 'massage', name: 'المساج', icon: 'self_care', services: [['مساج استرخائي', 60, 280], ['حمام مغربي', 90, 320]] },
    { id: 'henna', name: 'الحناء', icon: 'draw', services: [['نقش يدين', 45, 120], ['نقش عروس', 120, 450]] },
  ],
  adam: [
    { id: 'cut', name: 'الحلاقة', icon: 'content_cut', services: [['قص شعر', 30, 50], ['قص شعر وتحديد', 40, 70], ['قص أطفال', 25, 40], ['قص على الصفر', 20, 35]] },
    { id: 'beard', name: 'اللحية', icon: 'face_6', services: [['تحديد لحية', 20, 35], ['حلاقة لحية بالموس', 25, 45], ['تشذيب وتهذيب', 25, 40]] },
    { id: 'color', name: 'الصبغة', icon: 'palette', services: [['صبغة شعر', 45, 90], ['صبغة لحية', 30, 60]] },
    { id: 'care', name: 'العناية', icon: 'face_retouching_natural', services: [['تنظيف بشرة', 45, 150], ['ماسك فحم', 20, 50], ['بخار وتنظيف', 30, 70]] },
    { id: 'massage', name: 'المساج', icon: 'self_care', services: [['مساج رأس وأكتاف', 20, 60], ['مساج كامل', 60, 220]] },
    { id: 'groom', name: 'تجهيز عريس', icon: 'workspace_premium', services: [['باقة العريس', 150, 650]] },
  ],
};

export const AMENITIES = {
  eve: ['كادر نسائي بالكامل', 'غرف خاصة', 'غرفة VIP', 'تجهيز عرائس', 'خدمات للأطفال', 'مواقف سيارات', 'Apple Pay', 'قهوة وضيافة', 'أدوات معقّمة لكل زيارة', 'مواعيد مسائية متأخرة'],
  adam: ['مواقف سيارات', 'Apple Pay', 'قهوة وضيافة', 'أدوات معقّمة لكل زيارة', 'خدمات للأطفال', 'مواعيد مسائية متأخرة', 'واي فاي', 'مناسب لذوي الإعاقة'],
};

const NAMES = {
  eve: ['صالون لمسة', 'سبا الياسمين', 'استوديو ريم', 'صالون ورد', 'لؤلؤة للأظافر', 'بيوتي لاونج', 'صالون نوال', 'مركز الأميرة'],
};
// آدم: five real barbershops in north Riyadh — names, districts and coordinates from OpenStreetMap (© OSM contributors, ODbL).
// Their services, prices, ratings and reviews are demo content.
export const REAL_BARBERS = [
  { name: 'كويك كتس', en: 'Quick Cuts', district: 'حي الصحافة', street: 'طريق الثمامة', lat: 24.79323, lng: 46.64915, osm: 7801373209 },
  { name: 'توب مان', en: 'Top Man', district: 'حي الربيع', street: 'شارع أبي بن معاذ الأنصاري', lat: 24.79163, lng: 46.65178, osm: 10709780206 },
  { name: 'صالون الشنب الأسود', en: 'Black Mustache Barbershop', district: 'حي الياسمين', street: 'شارع الخيالة', lat: 24.82939, lng: 46.64608, osm: 11365657906 },
  { name: 'حلاق لمسة القمة', en: '', district: 'حي العقيق', street: 'شارع ابن عيدان', lat: 24.78311, lng: 46.61817, osm: 12590095401 },
  { name: 'يوسف أفندي', en: 'Yousef Afandi', district: 'حي حطين', street: 'شارع ربعي الذهلي', lat: 24.75333, lng: 46.60962, osm: 14222316678 },
];
// demo salons sit in real districts around the user (district centres checked against OpenStreetMap)
export const DISTRICTS = [['حي الملقا', 24.805, 46.612], ['حي الصحافة', 24.800, 46.640], ['حي الياسمين', 24.826, 46.650], ['حي العقيق', 24.776, 46.626], ['حي حطين', 24.760, 46.606], ['حي الربيع', 24.797, 46.662], ['حي النخيل', 24.745, 46.640], ['حي الملقا', 24.812, 46.620]];
// where the demo user is: حي الصحافة, الرياض
export const ME = { lat: 24.790, lng: 46.635, label: 'الرياض - الصحافة' };
const kmFrom = (lat, lng) => { const R = 6371, r = Math.PI / 180, a = Math.sin((lat - ME.lat) * r / 2) ** 2 + Math.cos(ME.lat * r) * Math.cos(lat * r) * Math.sin((lng - ME.lng) * r / 2) ** 2; return +(2 * R * Math.asin(Math.sqrt(a))).toFixed(1); };
const STAFF = {
  eve: ['نورة', 'ريم', 'سارة', 'لمى', 'هيا', 'جود', 'دانة', 'أمل'],
  adam: ['أبو فهد', 'سامي', 'محمد', 'خالد', 'ياسر', 'عمر', 'فيصل', 'بدر'],
};
const REVIEWS = {
  eve: [['منيرة', 5, 'تعامل راقي ونظافة ممتازة، والموعد كان بالضبط.'], ['ريما', 5, 'أحلى استشوار سويته، ثابت لآخر الليل.'], ['أسماء', 4, 'خدمة حلوة، بس الانتظار كان عشر دقايق.']],
  adam: [['عبدالله', 5, 'حلاق مرتب ودقيق، والمكان نظيف.'], ['سلمان', 5, 'تحديد اللحية ممتاز، أنصح فيه.'], ['تركي', 4, 'ممتاز، والسعر معقول.']],
};

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function makeSalons(section) {
  const r = rng(section === 'eve' ? 7 : 11);
  const list = section === 'adam' ? REAL_BARBERS : NAMES.eve.map((name, i) => {
    const [district, lat, lng] = DISTRICTS[i % DISTRICTS.length];
    return { name, district, lat: +(lat + (r() - 0.5) * 0.006).toFixed(5), lng: +(lng + (r() - 0.5) * 0.006).toFixed(5) };
  });
  return list.map((place, i) => {
    const { name } = place;
    const cats = CATEGORIES[section].filter((_, k) => k === 0 || r() > 0.4);
    const services = cats.map((c) => ({ ...c, services: c.services.filter((_, k) => k === 0 || r() > 0.25).map(([n, m, p]) => ({ name: n, minutes: m, price: Math.round((p * (0.85 + r() * 0.35)) / 5) * 5 })) }));
    const amen = AMENITIES[section].filter(() => r() > 0.45);
    const minPrice = Math.min(...services.flatMap((c) => c.services.map((s) => s.price)));
    return {
      id: `${section}-${i + 1}`, section, name,
      district: place.district, street: place.street || '', city: 'الرياض', lat: place.lat, lng: place.lng, osm: place.osm || 0, real: !!place.osm,
      rating: +(4.2 + r() * 0.8).toFixed(1), reviews: 40 + Math.floor(r() * 460),
      km: kmFrom(place.lat, place.lng), open: r() > 0.2, offer: r() > 0.62 ? `خصم ${[10, 15, 20][Math.floor(r() * 3)]}٪` : '',
      home: r() > 0.7, verified: !place.osm && r() > 0.3,
      categories: services, amenities: amen, from: minPrice,
      staff: STAFF[section].slice(0, 2 + Math.floor(r() * 3)).map((n) => ({ name: n, rating: +(4.5 + r() * 0.5).toFixed(1) })),
      art: Math.floor(r() * 1e6), x: 0.12 + r() * 0.76, y: 0.15 + r() * 0.7, // x/y: offline fallback map
      nextSlots: ['اليوم 7:30 م', 'اليوم 9:00 م', 'غداً 4:15 م', 'غداً 6:00 م'].filter(() => r() > 0.35).slice(0, 2),
      reviewList: REVIEWS[section],
    };
  });
}
export const SALONS = { eve: makeSalons('eve'), adam: makeSalons('adam') };

// a salon registered on this device (join.html) joins the directory, the map and its own page
export const MY_KEY = 'molu_my_salon';
function mySalon() {
  let m; try { m = JSON.parse(localStorage.getItem(MY_KEY) || 'null'); } catch { return null; }
  if (!m || !SALONS[m.section] || !m.services?.length) return null;
  const cats = CATEGORIES[m.section].map((c) => ({ ...c, services: m.services.filter((x) => x.cat === c.id).map(({ name, minutes, price }) => ({ name, minutes, price })) })).filter((c) => c.services.length);
  let h = 7; for (const ch of m.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    id: 'mine', section: m.section, name: m.name, mine: true, kind: m.kind, slug: m.slug, hours: m.hours,
    district: m.district, street: '', city: 'الرياض', lat: m.lat, lng: m.lng, osm: 0, real: false,
    rating: 0, reviews: 0, km: kmFrom(m.lat, m.lng), open: true, offer: '', home: m.kind === 'home', verified: false,
    categories: cats, amenities: [], from: Math.min(...m.services.map((x) => x.price)),
    staff: [{ name: m.owner || SECTIONS[m.section].staffWord, rating: 5 }], areas: m.areas || [], fee: m.fee || 0,
    art: h, x: 0.5, y: 0.5, nextSlots: ['اليوم 7:30 م', 'غداً 4:15 م'], reviewList: [],
  };
}
const mine = mySalon();
if (mine) SALONS[mine.section].unshift(mine);
export const salonById = (id) => [...SALONS.eve, ...SALONS.adam].find((s) => s.id === id);

// 14 bookable days starting today; deterministic slot availability per salon/day
export function days(n = 14) {
  const out = [];
  const wd = new Intl.DateTimeFormat('ar-SA', { weekday: 'short' });
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({ i, date: d, iso: d.toISOString().slice(0, 10), day: d.getDate(), wd: i === 0 ? 'اليوم' : i === 1 ? 'غداً' : wd.format(d) });
  }
  return out;
}
export function slots(salon, dayIndex) {
  const r = rng((salon.art + dayIndex * 97) >>> 0);
  const list = [];
  for (let m = 10 * 60; m <= 22 * 60; m += 30) {
    if (dayIndex === 0 && m < new Date().getHours() * 60 + new Date().getMinutes() + 45) continue;
    list.push({ m, free: r() > 0.38 });
  }
  return list;
}
export const fmtTime = (m) => { const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0'); return `${((h + 11) % 12) + 1}:${mm} ${h < 12 ? 'ص' : 'م'}`; };
const NF = new Intl.NumberFormat('en-US');
export const money = (n) => `${NF.format(n)} ر.س`;

export const PLANS = [
  { id: 'free', name: 'المجانية', month: 0, year: 0, note: 'للأبد، بلا بطاقة', feats: ['صفحة حجز باسمك على كل الجوالات', '40 حجزاً في الشهر', 'موظف واحد', 'تأكيد وتذكير تلقائي بالبريد'] },
  { id: 'solo', name: 'المستقل', month: 99, year: 990, solo: true, note: 'لمن يشتغل لحاله', feats: ['حجوزات بلا حد', 'لك وحدك', 'تأكيد وتذكير بلا حد', 'وقت تنقّل تلقائي بين الزيارات', 'صفحتك بدون شعار مولو'] },
  { id: 'pro', name: 'الاحترافية', month: 149, year: 1490, popular: true, feats: ['حجوزات بلا حد', '3 موظفين', 'صفحتك بدون شعار مولو', 'العروض ورموز الخصم وبطاقة الولاء', 'التقييمات والمحادثة مع العملاء', 'التقارير وملصق QR'] },
  { id: 'biz', name: 'الأعمال', month: 299, year: 2990, feats: ['كل مزايا الاحترافية', '15 موظفاً', 'حملات لإرجاع العملاء المنقطعين', 'نسبة كل موظف من دخله', 'أولوية في الدعم وإعداد الحساب معك'] },
];
