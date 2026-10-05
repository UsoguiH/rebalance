import { BOTANICAL, BOTANICAL_THEMES, stretch } from './botanical.js';
export { stretch };

// Universal invitation renderer — imported by the server (Node) and the browser (builder preview).
// Renders the 9:16 "poster" that is both the top of the guest page and every frame of the video.

export const OCCASIONS = {
  wedding: {
    label: 'زواج', icon: '💍',
    sample: ['فهد', 'نورة'],
    name1: 'اسم العريس', name2: 'اسم العروس', hasName2: true,
    defaults: {
      topLine: 'بسم الله الرحمن الرحيم',
      verse: 'بارك الله لكما وبارك عليكما وجمع بينكما في خير',
      hosts: '',
      hosts2: '',
      inviteText: 'يتشرفون بدعوتكم لحضور حفل زفاف',
      closing: 'أفراحنا تزدان بحضوركم',
      notes: 'جنة الأطفال منازلهم',
    },
  },
  milka: {
    label: 'ملكة', icon: '🤍',
    sample: ['سلطان', 'ريم'],
    name1: 'اسم العريس', name2: 'اسم العروس', hasName2: true,
    defaults: {
      topLine: 'بسم الله الرحمن الرحيم',
      verse: '',
      hosts: '',
      inviteText: 'يتشرفون بدعوتكم لحضور عقد قران',
      closing: 'حضوركم يزيدنا فرحاً',
    },
  },
  graduation: {
    label: 'تخرج', icon: '🎓',
    sample: ['رهف العنزي', ''],
    name1: 'اسم الخريج / الخريجة', name2: '', hasName2: false,
    defaults: {
      topLine: '',
      verse: '',
      hosts: '',
      inviteText: 'يسعدني دعوتكم لمشاركتي فرحة تخرجي',
      subtitle: 'بكالوريوس — جامعة الملك سعود',
      closing: 'ونِعمَ الحضور حضوركم',
    },
  },
  newborn: {
    label: 'مولود', icon: '🍼',
    sample: ['جود', ''],
    name1: 'اسم المولود', name2: '', hasName2: false,
    defaults: {
      topLine: 'بسم الله الرحمن الرحيم',
      verse: 'المال والبنون زينة الحياة الدنيا',
      hosts: 'والدا المولود',
      inviteText: 'يسعدنا دعوتكم لمشاركتنا فرحة قدوم مولودنا',
      closing: 'جعله الله من الصالحين',
    },
  },
  opening: {
    label: 'افتتاح', icon: '✨',
    sample: ['مقهى نخلة', ''],
    name1: 'اسم المشروع', name2: '', hasName2: false,
    defaults: {
      topLine: '',
      verse: '',
      hosts: 'إدارة المشروع',
      inviteText: 'يسرّها دعوتكم لحضور حفل افتتاح',
      subtitle: 'تجربة جديدة بانتظاركم',
      closing: 'حضوركم شرفٌ لنا',
    },
  },
  gathering: {
    label: 'عزيمة', icon: '☕',
    sample: ['عشاء العائلة', ''],
    name1: 'عنوان المناسبة', name2: '', hasName2: false,
    defaults: {
      topLine: '',
      verse: '',
      hosts: '',
      inviteText: 'يسعدنا دعوتكم إلى',
      subtitle: '',
      closing: 'لا تحرمونا من طلّتكم',
    },
  },
};

export const THEMES = {
  ...BOTANICAL_THEMES,
  royal:     { name: 'ذهبي ملكي', desc: 'كحلي عميق وأقواس ذهبية وفوانيس', swatch: ['#0B1222', '#D8B46A'] },
  sadu:      { name: 'سدو', desc: 'نقوش السدو النجدية بالأحمر والأسود', swatch: ['#F2E7D6', '#A63A24'] },
  hijazi:    { name: 'رواشين', desc: 'مشربيات حجازية خشبية على فيروزي', swatch: ['#0F3B3A', '#D9A774'] },
  bloom:     { name: 'ورد', desc: 'نباتات ناعمة بألوان الوردي والزيتي', swatch: ['#F7ECE6', '#B9776A'] },
  editorial: { name: 'حبر', desc: 'فخامة هادئة: أبيض عاجي وحبر أسود', swatch: ['#F4F1EA', '#161412'] },
  oasis:     { name: 'واحة', desc: 'غروب الصحراء والكثبان والنخيل', swatch: ['#2A2147', '#E8A06A'] },
};

export const AUDIENCES = { '': '', men: 'للرجال', women: 'للنساء', family: 'عائلي' };

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ---------- dates ----------
const asDate = (iso, time = '12:00') => {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  const [hh, mm] = String(time || '12:00').split(':').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, hh || 0, mm || 0));
};

// Intl formatters are expensive to construct — build each one once.
const fmtCache = new Map();
const fmt = (loc, o) => {
  const k = loc + JSON.stringify(o);
  if (!fmtCache.has(k)) fmtCache.set(k, new Intl.DateTimeFormat(loc, { timeZone: 'UTC', ...o }));
  return fmtCache.get(k);
};
let numAr, numArPlain;
const nAr = (x) => (numAr ??= new Intl.NumberFormat('ar-SA-u-nu-arab')).format(x);
const nArPlain = (x) => (numArPlain ??= new Intl.NumberFormat('ar-SA-u-nu-arab', { useGrouping: false })).format(x);

export function formatDates(date, time) {
  const dt = asDate(date, time);
  if (!dt) return { weekday: '', hijri: '', greg: '', time: '', dotted: '' };
  const f = (loc, o) => fmt(loc, o).format(dt);
  let timeLabel = '';
  if (time) {
    const [h, m] = time.split(':').map(Number);
    const period = h < 12 ? 'صباحاً' : h < 16 ? 'ظهراً' : h < 18 ? 'عصراً' : 'مساءً';
    const h12 = ((h + 11) % 12) + 1;
    const n = nAr;
    timeLabel = `${n(h12)}:${n(String(m).padStart(2, '0')).padStart(2, '٠')} ${period}`;
  }
  return {
    weekday: f('ar-SA', { weekday: 'long' }),
    hijri: f('ar-SA-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' }),
    greg: f('ar-SA-u-ca-gregory-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' }),
    time: timeLabel,
    dotted: [dt.getUTCDate(), dt.getUTCMonth() + 1, dt.getUTCFullYear()].map(nArPlain).join(' . '),
  };
}

// Event start as an absolute instant (Saudi time, UTC+3) — used by countdown and .ics
export function eventInstant(date, time) {
  const dt = asDate(date, time || '20:00');
  return dt ? new Date(dt.getTime() - 3 * 3600 * 1000) : null;
}

// ---------- deterministic randomness ----------
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------- shared SVG bits ----------
const star8 = (cx, cy, r, attrs = '') => {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.62 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" ${attrs}/>`;
};

// Pointed (ogee-flavoured) arch spanning x0..x1, springing at ySpring, apex at yApex, down to yBase
const archPath = (x0, x1, ySpring, yApex, yBase) => {
  const w = x1 - x0, mid = x0 + w / 2;
  return `M${x0},${yBase} L${x0},${ySpring} C${x0},${ySpring - w * 0.42} ${mid - w * 0.18},${yApex + w * 0.16} ${mid},${yApex} C${mid + w * 0.18},${yApex + w * 0.16} ${x1},${ySpring - w * 0.42} ${x1},${ySpring} L${x1},${yBase}`;
};

const svg = (inner, cls = '') =>
  `<svg class="${cls}" viewBox="0 0 540 960" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

// Sadu band: repeating Najdi weave motif
const saduBand = (y, h, id, flip = false) => `
  <defs><pattern id="${id}" width="54" height="${h}" patternUnits="userSpaceOnUse" x="0" y="${y}">
    <rect width="54" height="${h}" fill="#1C1512"/>
    <rect y="${h * 0.12}" width="54" height="${h * 0.06}" fill="#A63A24"/>
    <rect y="${h * 0.82}" width="54" height="${h * 0.06}" fill="#A63A24"/>
    <polygon points="0,0 13.5,${h * 0.11} 27,0 40.5,${h * 0.11} 54,0" fill="#F2E7D6"/>
    <polygon points="0,${h} 13.5,${h * 0.89} 27,${h} 40.5,${h * 0.89} 54,${h}" fill="#F2E7D6"/>
    <polygon points="27,${h * 0.24} 41,${h / 2} 27,${h * 0.76} 13,${h / 2}" fill="#A63A24"/>
    <polygon points="27,${h * 0.36} 34,${h / 2} 27,${h * 0.64} 20,${h / 2}" fill="#F2E7D6"/>
    <polygon points="27,${h * 0.44} 30,${h / 2} 27,${h * 0.56} 24,${h / 2}" fill="#1C1512"/>
    <polygon points="0,${h * 0.3} 8,${h / 2} 0,${h * 0.7}" fill="#D9A15B"/>
    <polygon points="54,${h * 0.3} 46,${h / 2} 54,${h * 0.7}" fill="#D9A15B"/>
  </pattern></defs>
  <g class="${flip ? 'sadu-b' : 'sadu-t'}"><rect x="-60" y="${y}" width="660" height="${h}" fill="url(#${id})"/></g>`;

// Mashrabiya lattice pattern
const latticePattern = (id, stroke) => `
  <pattern id="${id}" width="36" height="36" patternUnits="userSpaceOnUse">
    <rect width="36" height="36" fill="none"/>
    ${star8(18, 18, 10, `fill="none" stroke="${stroke}" stroke-width="1.6"`)}
    <path d="M18 0V6M18 30V36M0 18H6M30 18H36M0 0L9 9M36 0L27 9M0 36L9 27M36 36L27 27" stroke="${stroke}" stroke-width="1.6"/>
    <circle cx="18" cy="18" r="2.2" fill="${stroke}"/>
  </pattern>`;

const sprig = (x, y, rot, scale, seed) => {
  const r = rng(seed);
  let leaves = '';
  for (let i = 1; i <= 7; i++) {
    const t = i / 8, px = 140 * t, py = -Math.sin(t * Math.PI) * 26;
    const side = i % 2 ? -1 : 1, ang = (side * (38 + r() * 18)) - 20 * t;
    const L = 22 - t * 9;
    leaves += `<path class="leaf" style="--i:${i}" transform="translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${ang.toFixed(1)})" d="M0 0 Q ${L / 2} ${-L * 0.42} ${L} 0 Q ${L / 2} ${L * 0.42} 0 0Z"/>`;
  }
  return `<g class="sprig" transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})">
    <path class="stem" d="M0 0 Q 70 -34 150 0" fill="none"/>${leaves}
    <g class="flower" transform="translate(150 0)">${[0, 72, 144, 216, 288].map(a => `<ellipse transform="rotate(${a}) translate(0 -9)" rx="6" ry="9.5"/>`).join('')}<circle r="4.2" class="fc"/></g>
  </g>`;
};

const palm = (x, y, s, flip = 1) => `
  <g transform="translate(${x} ${y}) scale(${s * flip} ${s})" class="palm">
    <path d="M0 0 C 4 -40 2 -80 10 -120 L 15 -120 C 9 -80 12 -40 9 0Z"/>
    <g transform="translate(12 -122)">
      ${[-150, -120, -85, -55, -20, 10, 35].map((a, i) => `<path transform="rotate(${a})" d="M0 0 C 18 -${10 + i % 3 * 3} 40 -8 ${56 + (i % 2) * 8} 10 C 38 2 18 2 0 4Z"/>`).join('')}
    </g>
  </g>`;

// ---------- theme ornaments ----------
const ORNAMENTS = {
  royal(d, r) {
    let stars = '';
    for (let i = 0; i < 26; i++) stars += `<circle class="twinkle" style="--i:${i}" cx="${(r() * 540).toFixed(0)}" cy="${(r() * 300).toFixed(0)}" r="${(0.6 + r() * 1.6).toFixed(1)}" fill="#F3DCA4"/>`;
    const lantern = (x, len, i) => `
      <g class="lantern" style="--i:${i};transform-origin:${x}px 0px">
        <line x1="${x}" y1="0" x2="${x}" y2="${len}" stroke="#C9A35A" stroke-width="1.2"/>
        <g transform="translate(${x} ${len})">
          <path d="M-7 0 H7 L10 8 H-10Z" fill="#C9A35A"/>
          <path d="M-12 8 H12 L9 40 H-9Z" fill="url(#lg)" stroke="#E7C77E" stroke-width="1.2"/>
          <path d="M0 8 V40 M-6 8 L-5 40 M6 8 L5 40" stroke="#E7C77E" stroke-width=".6" opacity=".6"/>
          <path d="M-9 40 H9 L4 48 H-4Z" fill="#C9A35A"/><circle cy="52" r="2.4" fill="#C9A35A"/>
        </g>
      </g>`;
    return {
      bg: svg(`
        <defs>
          <radialGradient id="rbg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#1B2A4A"/><stop offset=".55" stop-color="#0D1528"/><stop offset="1" stop-color="#05080F"/></radialGradient>
          <radialGradient id="lg" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#FFE7A8"/><stop offset=".6" stop-color="#E6A94A"/><stop offset="1" stop-color="#8A5A1E"/></radialGradient>
          <pattern id="rpat" width="60" height="60" patternUnits="userSpaceOnUse">${star8(30, 30, 16, 'fill="none" stroke="#D8B46A" stroke-width=".7"')}<path d="M0 30H14M46 30H60M30 0V14M30 46V60" stroke="#D8B46A" stroke-width=".7"/></pattern>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#F6D58E" stop-opacity=".35"/><stop offset="1" stop-color="#F6D58E" stop-opacity="0"/></radialGradient>
        </defs>
        <rect width="540" height="960" fill="url(#rbg)"/>
        <rect width="540" height="960" fill="url(#rpat)" opacity=".07"/>
        <ellipse class="halo" cx="270" cy="470" rx="300" ry="360" fill="url(#glow)"/>
        ${stars}
        ${lantern(78, 70, 0)}${lantern(462, 96, 1)}${lantern(130, 34, 2)}${lantern(410, 44, 3)}
      `),
      frame: svg(`
        <g fill="none" stroke="#D8B46A" stroke-linecap="round">
          <path class="draw" pathLength="1" stroke-width="2.2" d="${archPath(52, 488, 290, 120, 910)}"/>
          <path class="draw d2" pathLength="1" stroke-width="1" d="${archPath(66, 474, 296, 140, 896)}"/>
          <path class="draw d3" pathLength="1" stroke-width="1" d="M52 910 H488"/>
        </g>
        <g class="pop" fill="#D8B46A">${star8(270, 108, 9)}</g>
        <g class="pop d2" fill="none" stroke="#D8B46A" stroke-width="1">${star8(52, 910, 7)}${star8(488, 910, 7)}</g>
      `),
    };
  },

  sadu() {
    return {
      bg: svg(`
        <defs>
          <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .32  0 0 0 0 .2  0 0 0 .06 0"/></filter>
          <radialGradient id="sbg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#F7EEE0"/><stop offset="1" stop-color="#E9DAC3"/></radialGradient>
        </defs>
        <rect width="540" height="960" fill="url(#sbg)"/>
        <rect width="540" height="960" filter="url(#paper)"/>
        ${saduBand(0, 92, 'sp1')}
        ${saduBand(868, 92, 'sp2', true)}
      `),
      frame: svg(`
        <g fill="none" stroke="#A63A24">
          <path class="draw" pathLength="1" stroke-width="1.4" d="M40 120 V840"/>
          <path class="draw" pathLength="1" stroke-width="1.4" d="M500 120 V840"/>
          <path class="draw d2" pathLength="1" stroke-width=".8" d="M48 128 V832 M492 128 V832"/>
        </g>
        <g class="pop" fill="#A63A24">
          <polygon points="270,120 284,134 270,148 256,134"/><polygon points="270,812 284,826 270,840 256,826"/>
        </g>
        <g class="pop d2" fill="#1C1512"><polygon points="270,127 277,134 270,141 263,134"/><polygon points="270,819 277,826 270,833 263,826"/></g>
      `),
    };
  },

  hijazi() {
    return {
      bg: svg(`
        <defs>
          <linearGradient id="hbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14514E"/><stop offset="1" stop-color="#0A2B2A"/></linearGradient>
          ${latticePattern('hl', '#C98E5A')}
          <clipPath id="win"><path d="${archPath(162, 378, 140, 44, 236)} Z"/></clipPath>
          <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A56C3C"/><stop offset="1" stop-color="#5E3A1F"/></linearGradient>
          <radialGradient id="hglow" cx="50%" cy="16%" r="55%"><stop offset="0" stop-color="#F1C48F" stop-opacity=".3"/><stop offset="1" stop-color="#F1C48F" stop-opacity="0"/></radialGradient>
        </defs>
        <rect width="540" height="960" fill="url(#hbg)"/>
        <rect width="540" height="960" fill="url(#hglow)"/>
        <rect width="540" height="960" fill="url(#hl)" opacity=".05"/>
        <g class="rawshan">
          <path d="${archPath(148, 392, 142, 28, 246)} Z" fill="url(#wood)"/>
          <rect x="162" y="40" width="216" height="200" fill="#2A1A0E" clip-path="url(#win)"/>
          <rect class="lattice" x="162" y="40" width="216" height="200" fill="url(#hl)" clip-path="url(#win)"/>
          <rect x="136" y="242" width="268" height="12" rx="3" fill="url(#wood)"/>
          <path d="M156 254 h228 l-12 14 h-204z" fill="#5E3A1F"/>
        </g>
        <g opacity=".45">${latticeStrip(890)}</g>
      `),
      frame: svg(`
        <g fill="none" stroke="#D9A774">
          <rect class="draw" pathLength="1" x="30" y="30" width="480" height="900" rx="4" stroke-width="1.2"/>
          <rect class="draw d2" pathLength="1" x="40" y="40" width="460" height="880" rx="2" stroke-width=".7"/>
        </g>
        <g class="pop" fill="#D9A774">${star8(30, 30, 8)}${star8(510, 30, 8)}${star8(30, 930, 8)}${star8(510, 930, 8)}</g>
      `),
    };
  },

  bloom() {
    return {
      bg: svg(`
        <defs><radialGradient id="bbg" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="#FBF4EF"/><stop offset="1" stop-color="#F0DDD3"/></radialGradient></defs>
        <rect width="540" height="960" fill="url(#bbg)"/>
        <circle class="blob" cx="470" cy="120" r="150" fill="#EBC9BD" opacity=".35"/>
        <circle class="blob d2" cx="60" cy="860" r="170" fill="#D9E0CF" opacity=".45"/>
        ${sprig(-10, 160, -28, 1.25, 3)}${sprig(560, 120, 205, 1.1, 7)}
        ${sprig(-20, 880, 10, 1.15, 11)}${sprig(555, 840, 160, 1.3, 19)}
      `),
      frame: svg(`
        <g fill="none" stroke="#B9776A">
          <path class="draw" pathLength="1" stroke-width="1" d="${archPath(70, 470, 300, 150, 860)} Z"/>
        </g>
      `),
    };
  },

  editorial(d) {
    const mono = esc((d.name1 || 'ع').trim().charAt(0));
    return {
      bg: svg(`
        <defs><filter id="ep"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="9"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .28  0 0 0 0 .25  0 0 0 .05 0"/></filter></defs>
        <rect width="540" height="960" fill="#F4F1EA"/>
        <rect width="540" height="960" filter="url(#ep)"/>
        <text class="mono" x="270" y="640" text-anchor="middle" font-size="560" fill="none" stroke="#161412" stroke-width="1" opacity=".07">${mono}</text>
      `),
      frame: svg(`
        <g fill="none" stroke="#161412">
          <rect class="draw" pathLength="1" x="28" y="28" width="484" height="904" stroke-width="1.4"/>
          <rect class="draw d2" pathLength="1" x="36" y="36" width="468" height="888" stroke-width=".5"/>
        </g>
        <g class="pop" stroke="#B08D57" stroke-width="1"><path d="M220 96 H320"/><path d="M220 864 H320"/></g>
      `),
    };
  },

  oasis(d, r) {
    let stars = '';
    for (let i = 0; i < 40; i++) stars += `<circle class="twinkle" style="--i:${i}" cx="${(r() * 540).toFixed(0)}" cy="${(r() * 380).toFixed(0)}" r="${(0.5 + r() * 1.4).toFixed(1)}" fill="#FFF3DD"/>`;
    return {
      bg: svg(`
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#161433"/><stop offset=".38" stop-color="#3B2A5C"/><stop offset=".62" stop-color="#9A5A6E"/><stop offset=".78" stop-color="#E59A6A"/><stop offset="1" stop-color="#F3C58C"/>
          </linearGradient>
          <radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE7B8"/><stop offset=".55" stop-color="#FBC07E"/><stop offset="1" stop-color="#FBC07E" stop-opacity="0"/></radialGradient>
        </defs>
        <rect width="540" height="960" fill="url(#sky)"/>
        ${stars}
        <circle class="sunset" cx="270" cy="760" r="120" fill="url(#sun)"/>
        <path class="dune d1" d="M-20 790 C 120 730 220 760 320 740 C 420 720 480 750 560 730 V960 H-20Z" fill="#B76A42"/>
        <path class="dune d2" d="M-20 840 C 90 800 200 830 300 812 C 400 795 470 820 560 806 V960 H-20Z" fill="#8F4D2E"/>
        <path class="dune d3" d="M-20 890 C 120 860 240 885 340 868 C 430 853 500 870 560 862 V960 H-20Z" fill="#5E3020"/>
        <g fill="#3A1E15" class="palms">${palm(70, 822, 1.05)}${palm(118, 830, .72, -1)}${palm(470, 812, .9, -1)}</g>
      `),
      frame: svg(`
        <g fill="none" stroke="#F3D6A8" opacity=".8">
          <path class="draw" pathLength="1" stroke-width="1" d="${archPath(60, 480, 260, 90, 700)}"/>
        </g>
        <g class="pop" fill="#F3D6A8">${star8(270, 78, 7)}</g>
      `),
    };
  },
};

function latticeStrip(y) {
  let s = '';
  for (let x = 0; x < 540; x += 36) s += star8(x + 18, y + 18, 10, 'fill="none" stroke="#C98E5A" stroke-width="1.2"');
  return s;
}

// ---------- poster ----------
// mode: 'page' (guest page entrance), 'video' (timeline for frame capture), 'static' (no animation)
// Ornament SVG depends only on the theme (and the monogram letter for «حبر»), so it is built once and cached.
const ornCache = new Map();
function ornamentsFor(theme, d, lite) {
  const key = theme + '|' + (theme === 'editorial' ? (d.name1 || 'ع').trim().charAt(0) : '') + (lite ? '|lite' : '');
  if (!ornCache.has(key)) {
    const bot = BOTANICAL[theme];
    ornCache.set(key, bot ? { bg: bot.bg(d, lite), frame: bot.frame(d) } : ORNAMENTS[theme](d, rng(hash(theme))));
    if (ornCache.size > 40) ornCache.delete(ornCache.keys().next().value);
  }
  return { key, ...ornCache.get(key) };
}

export function renderPoster(input, opts = {}) {
  const p = posterParts(input, opts);
  return `
<div class="${p.className}" data-key="${p.key}">
  <div class="p-bg">${p.bg}</div>
  <div class="p-frame">${p.frame}</div>
  <div class="p-content">${p.content}</div>
  <div class="p-particles">${p.particles}</div>
  ${p.overlay}
</div>`;
}

// Same poster, returned as parts so live previews can patch only the text layer.
export function posterParts(input, { mode = 'page', preview = false, to = '' } = {}) {
  const occ = OCCASIONS[input.occasion] || OCCASIONS.wedding;
  const d = { ...occ.defaults, ...stripEmpty(input) };
  const theme = ORNAMENTS[d.template] || BOTANICAL[d.template] ? d.template : 'sage';
  const r = rng(hash(theme + 'particles'));
  const bot = BOTANICAL[theme];
  const orn = ornamentsFor(theme, d, mode !== 'video');
  const dates = formatDates(d.date, d.time);
  const aud = AUDIENCES[d.audience] || '';
  const hasName2 = occ.hasName2 && d.name2;

  // [videoDelay, pageDelay] in seconds
  const at = (v, p) => `style="--v:${v}s;--p:${p}s"`;
  let particles = '';
  if (mode !== 'static') {
    for (let i = 0, n = mode === 'video' ? 18 : 8; i < n; i++) {
      particles += `<i style="--x:${(r() * 100).toFixed(1)}%;--y:${(40 + r() * 60).toFixed(1)}%;--s:${(2 + r() * 4).toFixed(1)}px;--t:${(5 + r() * 6).toFixed(1)}s;--dl:${(-r() * 10).toFixed(1)}s"></i>`;
    }
  }

  const nameLen = (d.name1 || '').length + (hasName2 ? (d.name2 || '').length : 0);
  const nameSize = nameLen > 16 ? 'xs' : nameLen > 11 ? 's' : nameLen > 7 ? 'm' : 'l';

  return {
    key: orn.key + '|' + mode + '|' + (preview ? 1 : 0),
    className: `poster t-${theme}${bot ? ' t-botanical' : ''} m-${mode}${preview ? ' is-preview' : ''}`,
    bg: orn.bg, frame: orn.frame, particles,
    content: `
    ${bot ? (to ? `<div class="p-to a" ${at(0.4, 0.05)}>إلى: ${esc(to)}</div>` : '') + bot.layout({ d, occ, dates, esc, at, hasName2, aud }) : `
    ${to ? `<div class="p-to a" ${at(0.6, 0.1)}>إلى: ${esc(to)}</div>` : ''}
    ${d.topLine ? `<div class="p-top a" ${at(1.0, 0.15)}>${esc(d.topLine)}</div>` : ''}
    ${d.verse ? `<div class="p-verse a" ${at(1.8, 0.3)}>${esc(d.verse)}</div>` : ''}
    ${d.hosts ? `<div class="p-hosts a" ${at(3.0, 0.45)}>${esc(d.hosts.replace(/\n/g, ' ') + (d.hosts2 ? ' و' + d.hosts2.replace(/\n/g, ' ') : ''))}</div>` : ''}
    ${d.inviteText ? `<div class="p-invite a" ${at(3.8, 0.6)}>${esc(d.inviteText)}</div>` : ''}
    <h1 class="p-names n-${nameSize} a-name" ${at(5.0, 0.8)}>
      <span class="n1">${esc(d.name1 || occ.name1)}</span>
      ${hasName2 ? `<span class="amp">و</span><span class="n2">${esc(d.name2)}</span>` : ''}
    </h1>
    ${d.subtitle ? `<div class="p-sub a" ${at(6.6, 1.0)}>${esc(d.subtitle)}</div>` : ''}
    <div class="p-divider a" ${at(7.2, 1.1)}><span></span>${dividerStar()}<span></span></div>
    ${dates.weekday ? `<div class="p-date a" ${at(8.0, 1.25)}>
      <div class="p-day">يوم ${esc(dates.weekday)}</div>
      <div class="p-dates"><span>${esc(dates.hijri)}</span><b></b><span>${esc(dates.greg)}</span></div>
      ${dates.time ? `<div class="p-time">الساعة ${esc(dates.time)}</div>` : ''}
    </div>` : ''}
    ${d.venue || d.city ? `<div class="p-venue a" ${at(9.4, 1.4)}>${pin()}<span>${esc([d.venue, d.city].filter(Boolean).join(' — '))}</span></div>` : ''}
    ${aud ? `<div class="p-aud a" ${at(10.0, 1.5)}>${esc(aud)}</div>` : ''}
    ${d.closing ? `<div class="p-closing a" ${at(11.0, 1.6)}>${esc(d.closing)}</div>` : ''}`}`,
    overlay: (mode === 'video' ? '<div class="p-shine"></div><div class="p-fade"></div>' : '') + (preview ? '<div class="p-watermark"><span>معاينة · عزيمة</span></div>' : ''),
  };
}

const dividerStar = () => `<svg viewBox="-12 -12 24 24" width="1em" height="1em">${star8(0, 0, 10, 'fill="currentColor"')}</svg>`;
const pin = () => `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>`;

function stripEmpty(o) {
  const out = {};
  for (const [k, v] of Object.entries(o || {})) if (v !== undefined && v !== null) out[k] = v;
  return out;
}

function hash(s) {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function titleFor(d) {
  const occ = OCCASIONS[d.occasion] || OCCASIONS.wedding;
  const names = occ.hasName2 && d.name2 ? `${d.name1} و${d.name2}` : d.name1;
  const kind = { wedding: 'دعوة زواج', milka: 'دعوة ملكة', graduation: 'دعوة تخرج', newborn: 'دعوة مولود', opening: 'دعوة افتتاح', gathering: 'دعوة' }[d.occasion] || 'دعوة';
  return `${kind} ${names || ''}`.trim();
}

export const VIDEO_SECONDS = 15;

export const FONTS_URL = '/css/fonts.css'; // self-hosted (see public/fonts)

export const DEMOS = {
  sage: { occasion: 'wedding', name1: 'ناصر', name2: 'تهاني', verse: 'إن السرور إذا تشارك ضوعفت بسماته', hosts: '', hosts2: '', inviteText: 'بكل الحب والود نتشرف بدعوتكم لحضور حفل زفاف', date: '2026-12-12', time: '20:00', venue: 'قاعة الفريدة', city: 'الرياض', notes: 'يمنع اصطحاب جوالات الكاميرا\nجنة الأطفال منازلهم' },
  arch: { occasion: 'wedding', topLine: 'بسم الله الرحمن الرحيم', hosts: 'السيد أحمد محمد العثمان\nالسيدة سارة علي', hosts2: 'السيد إبراهيم عمر الأحمد\nالسيدة حنان مراد', name1: 'فيصل', name2: 'جود', date: '2026-12-24', time: '20:30', venue: 'قاعة الماسة', city: 'جدة', notes: '' },
  lilac: { occasion: 'wedding', name1: 'طارق', name2: 'هدى', inviteText: 'نتشرف بدعوتكم لحضور حفل زفاف', date: '2026-12-20', time: '20:30', venue: 'قاعة الأفراح', city: 'الرياض', notes: '' },
  royal: { occasion: 'wedding', name1: 'فهد', name2: 'نورة', hosts: 'عائلة القحطاني وعائلة العتيبي', date: '2026-12-17', time: '20:30', venue: 'قاعة ليالي الأندلس', city: 'الرياض', audience: 'women' },
  sadu: { occasion: 'milka', name1: 'سلطان', name2: 'ريم', hosts: 'عائلة الدوسري', date: '2026-11-26', time: '19:00', venue: 'استراحة الوادي', city: 'الخرج' },
  hijazi: { occasion: 'wedding', name1: 'عبدالله', name2: 'لمى', hosts: 'عائلة باناجة وعائلة الحربي', date: '2027-01-08', time: '21:00', venue: 'قاعة البحر الأحمر', city: 'جدة', audience: 'women' },
  bloom: { occasion: 'newborn', name1: 'جود', hosts: 'محمد وسارة', date: '2026-11-13', time: '17:30', venue: 'منزل العائلة', city: 'الدمام', audience: 'family', verse: '' },
  editorial: { occasion: 'graduation', name1: 'رهف العنزي', subtitle: 'بكالوريوس هندسة البرمجيات — جامعة الملك سعود', date: '2026-12-03', time: '18:00', venue: 'مطعم ميدان', city: 'الرياض' },
  oasis: { occasion: 'gathering', name1: 'كشتة الشتاء', hosts: 'أبو فيصل', date: '2026-12-25', time: '16:00', venue: 'روضة خريم', city: 'شمال الرياض', subtitle: 'شبّة نار، وقهوة، وسوالف' },
};
