// Light botanical themes (watercolor washes, sage foliage, line-art florals, kashida typography).
// Modeled on contemporary Saudi digital wedding invitations.

const NONJOIN = 'اأإآدذرزوؤةءى';
const isLetter = (c) => /[ء-ي]/.test(c || '');

// Elegant kashida stretching: «الاستقبال» → «الاسـتـقـبـال»
export function stretch(text, n = 2) {
  return String(text || '').split(' ').map((w) => {
    const ch = [...w];
    let out = '';
    ch.forEach((c, i) => {
      out += c;
      const nx = ch[i + 1];
      if (!nx || !isLetter(c) || !isLetter(nx)) return;
      if (NONJOIN.includes(c)) return;
      if (c === 'ل' && 'اأإآ'.includes(nx)) return; // keep lam-alef ligature
      if (i === 1 && ch[0] === 'ا' && c === 'ل') return; // keep the definite article tight
      if (i + 1 === ch.length - 1 && ch.length <= 3) return;
      out += 'ـ'.repeat(n);
    });
    return out;
  }).join(' ');
}

// Display-name stretch: «طارق» → «طـــارق»
export function stretchName(name, n = 3) {
  const ch = [...String(name || '')];
  for (let i = 0; i < ch.length - 1; i++) {
    if (isLetter(ch[i]) && isLetter(ch[i + 1]) && !NONJOIN.includes(ch[i]) && !(ch[i] === 'ل' && 'اأإآ'.includes(ch[i + 1]))) {
      ch.splice(i + 1, 0, 'ـ'.repeat(n));
      return ch.join('');
    }
  }
  return ch.join('');
}

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const svg = (inner) =>
  `<svg viewBox="0 0 540 960" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

// ---------- painterly building blocks ----------
const washFilter = (id, seed, scale = 70, blur = 10) => `
  <filter id="${id}" x="-40%" y="-40%" width="180%" height="180%">
    <feTurbulence type="fractalNoise" baseFrequency=".011" numOctaves="4" seed="${seed}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feGaussianBlur in="d" stdDeviation="${blur}"/>
  </filter>`;

const paperFilter = (id) => `
  <filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="5"/>
  <feColorMatrix values="0 0 0 0 .35  0 0 0 0 .35  0 0 0 0 .3  0 0 0 .045 0"/></filter>`;

const edgeFilter = (id) => `
  <filter id="${id}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="7" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2"/></filter>`;

const leafGrads = (p) => `
  <linearGradient id="${p}A" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5F7150"/><stop offset="1" stop-color="#A9B898"/></linearGradient>
  <linearGradient id="${p}B" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7D8C6E"/><stop offset="1" stop-color="#C7D0BA"/></linearGradient>
  <linearGradient id="${p}C" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#93998C"/><stop offset="1" stop-color="#D6D9D1"/></linearGradient>`;

// Watercolor eucalyptus / olive branch along a quadratic stem
function branch({ x, y, rot, len, bend = 0.2, leaves = 7, size = 46, p = 'lg', seed = 1, cls = '', edge = '' }) {
  const r = rng(seed);
  const P1 = [len * 0.5, -len * bend];
  const pt = (t) => [2 * (1 - t) * t * P1[0] + t * t * len, 2 * (1 - t) * t * P1[1]];
  const tan = (t) => {
    const dx = 2 * (1 - t) * P1[0] + 2 * t * (len - P1[0]);
    const dy = 2 * (1 - t) * P1[1] + 2 * t * (0 - P1[1]);
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };
  let out = `<path d="M0 0 Q ${P1[0]} ${P1[1]} ${len} 0" fill="none" stroke="#7B866C" stroke-width="2" stroke-linecap="round" opacity=".75"/>`;
  for (let i = 0; i < leaves; i++) {
    const t = 0.12 + (i / leaves) * 0.86;
    const [px, py] = pt(t);
    const side = i % 2 ? 1 : -1;
    const ang = tan(t) + side * (42 + r() * 26);
    const L = size * (0.75 + r() * 0.45) * (1 - t * 0.35);
    const W = L * (0.36 + r() * 0.12);
    const g = ['A', 'B', 'C'][Math.floor(r() * 3)];
    const op = (0.62 + r() * 0.33).toFixed(2);
    out += `<g transform="translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${ang.toFixed(1)})" opacity="${op}">
      <path d="M0 0 C ${L * 0.22} ${-W} ${L * 0.78} ${-W * 0.92} ${L} 0 C ${L * 0.78} ${W * 0.92} ${L * 0.22} ${W} 0 0Z" fill="url(#${p}${g})" ${edge ? `filter="url(#${edge})"` : ''}/>
      <path d="M2 0 Q ${L * 0.5} ${-W * 0.1} ${L * 0.92} 0" stroke="#4F5E42" stroke-width=".7" fill="none" opacity=".35"/>
    </g>`;
  }
  // terminal leaf
  out += `<g transform="translate(${len} 0) rotate(${tan(1).toFixed(1)})" opacity=".85"><path d="M0 0 C ${size * 0.2} ${-size * 0.3} ${size * 0.7} ${-size * 0.28} ${size * 0.9} 0 C ${size * 0.7} ${size * 0.28} ${size * 0.2} ${size * 0.3} 0 0Z" fill="url(#${p}A)" ${edge ? `filter="url(#${edge})"` : ''}/></g>`;
  return `<g class="sway ${cls}" style="transform-origin:${x}px ${y}px"><g transform="translate(${x} ${y}) rotate(${rot})">${out}</g></g>`;
}

// Layered white dahlia
function dahlia(cx, cy, R, seed, id = 'pt') {
  const r = rng(seed);
  const rings = [[18, 1], [15, 0.84], [13, 0.68], [11, 0.53], [9, 0.39], [7, 0.26]];
  let out = `<ellipse cx="${cx}" cy="${cy + R * 0.12}" rx="${R * 0.95}" ry="${R * 0.75}" fill="#6E7A5C" opacity=".14" filter="url(#soft)"/>`;
  out += `<g transform="translate(${cx} ${cy}) rotate(${(r() * 30).toFixed(1)})">`;
  rings.forEach(([n, k], ri) => {
    const rr = R * k, b = rr * 0.22, w = (rr * Math.PI) / n * 0.62;
    for (let j = 0; j < n; j++) {
      const a = (360 / n) * j + ri * (180 / n) + r() * 6;
      out += `<path transform="rotate(${a.toFixed(1)})" d="M0 ${-b} C ${w} ${-(b + (rr - b) * 0.3)} ${w * 0.9} ${-rr * 0.94} 0 ${-rr} C ${-w * 0.9} ${-rr * 0.94} ${-w} ${-(b + (rr - b) * 0.3)} 0 ${-b}Z" fill="url(#${id}${ri > 3 ? 'i' : ''})" stroke="#C3CCB2" stroke-width=".7"/>`;
    }
  });
  out += `<circle r="${R * 0.12}" fill="#B9C68C"/><circle r="${R * 0.07}" fill="#D7E0A9"/></g>`;
  return out;
}

const bud = (x, y, s, rot) => `
  <g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <path d="M0 40 Q 2 60 0 90" stroke="#7B8A5E" stroke-width="3" fill="none"/>
    <path d="M0 -26 C 22 -24 26 12 0 42 C -26 12 -22 -24 0 -26Z" fill="url(#budG)"/>
    <path d="M0 -24 C 8 -6 8 20 0 40 M0 -24 C -8 -6 -8 20 0 40" stroke="#8E9E66" stroke-width="1.2" fill="none" opacity=".7"/>
    <path d="M-16 26 C -10 34 10 34 16 26 L 0 46Z" fill="#7F9156"/>
  </g>`;

const petalGrads = `
  <linearGradient id="pt" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#E1E8D2"/><stop offset=".55" stop-color="#FBFCF7"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient>
  <linearGradient id="pti" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#D3DDB9"/><stop offset="1" stop-color="#F3F6E8"/></linearGradient>
  <linearGradient id="budG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9D59C"/><stop offset="1" stop-color="#7F9156"/></linearGradient>
  <filter id="soft"><feGaussianBlur stdDeviation="8"/></filter>`;

// Ink line-art flower (open blossom) with a few leaves
function lineFlower(x, y, s, rot, cls = '') {
  return `<g class="${cls}"><g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="none" stroke="#3F3A48" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M0 0 C 6 30 2 60 -6 96"/>
    <path d="M-2 40 C -16 34 -24 22 -22 12 C -12 14 -4 26 -2 40Z"/>
    <path d="M1 62 C 14 58 22 46 22 36 C 12 38 4 50 1 62Z"/>
    <path d="M0 0 C -14 -4 -22 -18 -16 -30 C -10 -24 -4 -22 0 -24 C 4 -22 10 -24 16 -30 C 22 -18 14 -4 0 0Z"/>
    <path d="M-16 -30 C -14 -42 -4 -46 0 -40 C 4 -46 14 -42 16 -30"/>
    <path d="M0 -24 L0 -36 M-6 -22 C -8 -30 -6 -36 -4 -38 M6 -22 C 8 -30 6 -36 4 -38"/>
  </g></g>`;
}

function inkSprig(x, y, s, rot) {
  let leaves = '';
  for (let i = 0; i < 6; i++) {
    const t = i * 14, side = i % 2 ? 1 : -1;
    leaves += `<path transform="translate(${2 + i * 0.5} ${-t}) rotate(${side * 50})" d="M0 0 C 3 -6 9 -7 12 -2 C 8 2 3 2 0 0Z" fill="#3F3A48"/>`;
  }
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0 C 2 -30 4 -60 10 -86" fill="none" stroke="#3F3A48" stroke-width="1.3"/>${leaves}</g>`;
}

function dots(x0, y0, x1, y1, n, seed) {
  const r = rng(seed);
  let o = '';
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    o += `<circle cx="${(x0 + (x1 - x0) * t + (r() - 0.5) * 18).toFixed(1)}" cy="${(y0 + (y1 - y0) * t + (r() - 0.5) * 18).toFixed(1)}" r="${(0.8 + r() * 1.4).toFixed(1)}" fill="#3F3A48"/>`;
  }
  return o;
}

const rings = (x, y, s) => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="#8C9466" stroke-width="2.2">
    <ellipse cx="-14" cy="6" rx="30" ry="22" transform="rotate(-18 -14 6)"/>
    <ellipse cx="-14" cy="6" rx="24" ry="16" transform="rotate(-18 -14 6)" stroke-width="1"/>
    <ellipse cx="18" cy="12" rx="30" ry="22" transform="rotate(14 18 12)"/>
    <ellipse cx="18" cy="12" rx="24" ry="16" transform="rotate(14 18 12)" stroke-width="1"/>
    <path d="M-30 -14 L-24 -26 L-16 -30 L-8 -26 L-2 -14 L-16 -6Z" stroke-width="1.6"/>
    <path d="M-30 -14 H-2 M-24 -26 L-16 -14 L-8 -26" stroke-width="1"/>
  </g>`;

// Lavender watercolor bellflowers spilling from the edge
function lavender(x, y, s, seed) {
  const r = rng(seed);
  let o = '';
  for (let i = 0; i < 7; i++) {
    const px = x + r() * 60 * s, py = y + i * 70 * s + r() * 30, rr = (26 + r() * 22) * s;
    const a = r() * 360;
    let lobes = '';
    for (let k = 0; k < 5; k++) {
      const an = a + k * 72;
      lobes += `<ellipse transform="rotate(${an.toFixed(0)} ${px.toFixed(0)} ${py.toFixed(0)})" cx="${px.toFixed(0)}" cy="${(py - rr * 0.55).toFixed(0)}" rx="${(rr * 0.42).toFixed(0)}" ry="${(rr * 0.62).toFixed(0)}"/>`;
    }
    o += `<g fill="#A994CF" opacity="${(0.28 + r() * 0.22).toFixed(2)}" filter="url(#lavBlur)">${lobes}</g>`;
  }
  return o;
}

// ---------- shared content pieces ----------
const icons = {
  cal: `<svg viewBox="0 0 24 24" width="1em" height="1em"><rect x="3" y="5" width="18" height="16" rx="2.5" fill="currentColor"/><rect x="3" y="5" width="18" height="4.5" rx="2" fill="currentColor"/><g fill="#fff">${[0, 1, 2, 3].map(c => [0, 1, 2].map(rw => `<rect x="${5.3 + c * 3.6}" y="${11 + rw * 3.1}" width="2.2" height="2" rx=".4"/>`).join('')).join('')}</g><rect x="7" y="3" width="2" height="4" rx="1" fill="currentColor"/><rect x="15" y="3" width="2" height="4" rx="1" fill="currentColor"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2z"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-linecap="round"/></svg>`,
};

function infoRow(d, dates, esc, at) {
  const venueLines = [d.venue, d.city].filter(Boolean);
  return `<div class="b-info a" ${at(9.0, 1.3)}>
    <div class="b-col"><span class="b-ic">${icons.cal}</span>
      <span>${esc(stretch('يوم ' + (dates.weekday || '')))}</span>
      <span class="b-num">${esc(dates.greg)}</span>
      <span class="b-num b-small">${esc(dates.hijri)}</span></div>
    <div class="b-col"><span class="b-ic">${icons.pin}</span>
      ${venueLines.map((l) => `<span>${esc(l)}</span>`).join('') || '<span>—</span>'}</div>
    <div class="b-col"><span class="b-ic">${icons.clock}</span>
      <span>${esc(stretch('الاستقبال'))}</span>
      <span class="b-num">${esc(dates.time || '—')}</span></div>
  </div>`;
}

const notesList = (d, esc, at) => {
  const lines = String(d.notes || '').split(/\n|،\s*(?=[^،]{3,})/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  return lines.length ? `<ul class="b-notes a" ${at(10.4, 1.5)}>${lines.map((l) => `<li>${esc(stretch(l))}</li>`).join('')}</ul>` : '';
};

const initials = (d, hasName2) => {
  const a = (d.name1 || '').trim().charAt(0);
  const b = hasName2 ? (d.name2 || '').trim().charAt(0) : '';
  return b ? b + a : a;
};

// ---------- themes ----------
export const BOTANICAL_THEMES = {
  sage: { name: 'زيتوني', desc: 'داليا بيضاء ومونوغرام بخط الرقعة', swatch: ['#F1F1E8', '#7F8A5A'] },
  arch: { name: 'قوس', desc: 'قوس ذهبي رفيع وأوراق مائية', swatch: ['#F7F7F3', '#B7A266'] },
  lilac: { name: 'ليلك', desc: 'إكليل مرسوم باليد ولمسات بنفسجية', swatch: ['#FAF9F8', '#7E8B4E'] },
};

export const BOTANICAL = {
  sage: {
    bg: () => svg(`
      <defs>${washFilter('wsA', 3)}${paperFilter('ppA')}${petalGrads}${leafGrads('sg')}${edgeFilter('egA')}
        <radialGradient id="sgbg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#F7F7F1"/><stop offset="1" stop-color="#E9EADF"/></radialGradient></defs>
      <rect width="540" height="960" fill="url(#sgbg)"/>
      <g filter="url(#wsA)" opacity=".55"><circle cx="90" cy="140" r="120" fill="#DCE0CF"/><circle cx="470" cy="420" r="130" fill="#E4E6DA"/><circle cx="120" cy="640" r="110" fill="#E1E4D6"/></g>
      <rect width="540" height="960" filter="url(#ppA)"/>
      <g class="bloom-in">
        ${branch({ x: -20, y: 900, rot: -62, len: 170, size: 40, p: 'sg', seed: 4, leaves: 6, edge: 'egA' })}
        ${branch({ x: 560, y: 880, rot: -122, len: 160, size: 38, p: 'sg', seed: 9, leaves: 6, edge: 'egA' })}
        ${bud(40, 790, 0.95, -14)}${bud(500, 800, 0.9, 12)}${bud(150, 846, 0.7, -6)}
        ${dahlia(80, 920, 92, 3)}${dahlia(470, 930, 98, 8)}${dahlia(275, 960, 84, 13)}
        ${dahlia(190, 948, 62, 21)}${dahlia(370, 950, 66, 34)}
      </g>`),
    frame: () => '',
    layout({ d, dates, esc, at, hasName2 }) {
      const mono = initials(d, hasName2);
      return `
        <div class="b-mono a-name" ${at(0.8, 0.1)}>${esc(mono)}</div>
        ${d.verse ? `<div class="b-line b-strong a" ${at(2.2, 0.3)}>${esc(stretch(d.verse))}</div>` : ''}
        ${d.hosts ? `<div class="b-line a" ${at(3.0, 0.4)}>${esc(stretch([d.hosts, d.hosts2].filter(Boolean).join(' و').replace(/\n/g, ' ')))}</div>` : ''}
        ${d.inviteText ? `<div class="b-line a" ${at(3.6, 0.5)}>${esc(stretch(d.inviteText))}</div>` : ''}
        <div class="b-stack a-name" ${at(4.8, 0.7)}>
          ${hasName2 ? `<span class="s2">${esc(d.name2)}</span>` : ''}<span class="s1">${esc(d.name1)}</span>
        </div>
        ${d.subtitle ? `<div class="b-line a" ${at(6.4, 0.9)}>${esc(d.subtitle)}</div>` : ''}
        ${dates.weekday ? `<div class="b-line b-strong a" ${at(7.6, 1.1)}>${esc(stretch('وذلك بمشيئة الله تعالى يوم ' + dates.weekday))}</div>` : ''}
        ${infoRow(d, dates, esc, at)}
        ${notesList(d, esc, at)}`;
    },
  },

  arch: {
    bg: () => svg(`
      <defs>${washFilter('wsB', 11, 80, 12)}${paperFilter('ppB')}${leafGrads('ar')}${edgeFilter('egB')}</defs>
      <rect width="540" height="960" fill="#F8F8F5"/>
      <g filter="url(#wsB)" opacity=".5">
        <circle cx="60" cy="120" r="140" fill="#DADBD6"/><circle cx="500" cy="300" r="110" fill="#E3E4DF"/>
        <circle cx="470" cy="760" r="150" fill="#DCDDD7"/><circle cx="80" cy="820" r="120" fill="#E0E1DB"/>
      </g>
      <rect width="540" height="960" filter="url(#ppB)"/>
      ${branch({ x: 560, y: 40, rot: 150, len: 230, bend: -0.18, size: 62, p: 'ar', seed: 5, leaves: 7, edge: 'egB' })}
      ${branch({ x: 560, y: 210, rot: 172, len: 150, bend: 0.15, size: 50, p: 'ar', seed: 15, leaves: 5, edge: 'egB' })}
      ${branch({ x: -20, y: 940, rot: -38, len: 230, bend: 0.2, size: 60, p: 'ar', seed: 7, leaves: 7, edge: 'egB' })}
      ${branch({ x: -20, y: 760, rot: -12, len: 140, bend: -0.2, size: 46, p: 'ar', seed: 27, leaves: 5, edge: 'egB' })}`),
    frame: () => svg(`
      <path class="draw" pathLength="1" fill="none" stroke="#BFA466" stroke-width="2" d="M92 884 V330 A178 178 0 0 1 448 330 V884 Z"/>`),
    layout({ d, occ, dates, esc, at, hasName2 }) {
      const hostCol = (t) => String(t || '').split(/\n/).map((l) => `<span>${esc(l)}</span>`).join('');
      const pairs = hasName2 && ['wedding', 'milka'].includes(d.occasion);
      return `
        ${d.topLine ? `<div class="b-basmala a" ${at(1.2, 0.15)}>${esc(d.topLine)}</div>` : ''}
        ${d.hosts && d.hosts2 ? `<div class="b-line a" ${at(2.4, 0.3)}>${esc(stretch('يتشرف'))}</div>
          <div class="b-hosts a" ${at(3.0, 0.4)}><div>${hostCol(d.hosts)}</div><div>${hostCol(d.hosts2)}</div></div>` :
          d.hosts ? `<div class="b-line b-strong a" ${at(2.6, 0.35)}>${esc(stretch(d.hosts))}</div>` : ''}
        ${d.inviteText ? `<div class="b-line b-strong a" ${at(3.8, 0.55)}>${esc(stretch(d.hosts && d.hosts2 ? d.inviteText.replace(/^(يتشرف\S*|يسعد\S*|يسر\S*)\s+/, '') : d.inviteText))}</div>` : ''}
        ${pairs ? `<div class="b-pair a-name" ${at(5.0, 0.75)}>
            <div><small>${esc(stretch(d.tag1 || 'الابن'))}</small><b>${esc(d.name1)}</b></div>
            <i>على</i>
            <div><small>${esc(stretch(d.tag2 || 'الابنة'))}</small><b>${esc(d.name2)}</b></div>
          </div>` : `<div class="b-single a-name" ${at(5.0, 0.75)}>${esc(d.name1 || occ.name1)}</div>`}
        ${d.subtitle ? `<div class="b-line a" ${at(6.4, 0.9)}>${esc(d.subtitle)}</div>` : ''}
        <div class="b-line b-strong a" ${at(7.2, 1.0)}>${esc(stretch('وذلك بمشيئة الله تعالى'))}</div>
        ${dates.weekday ? `<div class="b-dateblock a" ${at(8.4, 1.15)}>
          <span>يوم ${esc(dates.weekday)} الموافق ${esc(dates.greg)}</span>
          <span>${esc(dates.hijri)}</span>
          ${dates.time ? `<span>في تمام الساعة ${esc(dates.time)}</span>` : ''}
        </div>` : ''}
        ${d.venue || d.city ? `<div class="b-line a" ${at(9.6, 1.3)}>${esc([d.venue, d.city].filter(Boolean).join(' — '))}</div>` : ''}
        ${notesList(d, esc, at)}`;
    },
  },

  lilac: {
    bg: () => svg(`
      <defs>${washFilter('wsC', 21, 60, 9)}${paperFilter('ppC')}${leafGrads('ll')}${edgeFilter('egC')}
        <filter id="lavBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.5"/></filter></defs>
      <rect width="540" height="960" fill="#FAF9F7"/>
      <g filter="url(#wsC)" opacity=".5"><circle cx="40" cy="200" r="150" fill="#E3DDEB"/><circle cx="40" cy="560" r="120" fill="#E7E2EE"/><circle cx="480" cy="560" r="160" fill="#EBEBE6"/></g>
      <rect width="540" height="960" filter="url(#ppC)"/>
      <g class="bloom-in">${lavender(-40, 10, 1.1, 4)}</g>
      ${branch({ x: 560, y: 960, rot: -128, len: 190, bend: 0.22, size: 40, p: 'll', seed: 31, leaves: 9, edge: 'egC' })}
      ${branch({ x: 560, y: 900, rot: -150, len: 140, bend: -0.2, size: 34, p: 'll', seed: 41, leaves: 7, edge: 'egC' })}
      ${branch({ x: 520, y: 960, rot: -100, len: 150, bend: 0.2, size: 32, p: 'll', seed: 51, leaves: 7, edge: 'egC' })}`),
    frame: () => '',
    layout({ d, occ, dates, esc, at, hasName2 }) {
      const mono = initials(d, hasName2);
      const dot = dates.dotted ? `<div class="b-dotdate">${esc(dates.dotted)}</div>` : '';
      return `
        <div class="b-wreath a" ${at(0.6, 0.05)}>
          <svg viewBox="0 0 300 220" aria-hidden="true">
            <path class="draw" pathLength="1" d="M70 200 C 40 150 46 90 84 50" fill="none" stroke="#3F3A48" stroke-width="1.3"/>
            <path class="draw d2" pathLength="1" d="M200 210 C 250 196 268 150 262 104" fill="none" stroke="#3F3A48" stroke-width="1.3"/>
            ${lineFlower(84, 50, 0.9, -30, 'pop')}${lineFlower(66, 110, 0.75, -70, 'pop d2')}${lineFlower(262, 104, 0.7, 20, 'pop d2')}
            ${inkSprig(250, 190, 0.8, 20)}${inkSprig(60, 190, 0.7, -10)}
            <g class="pop d2">${dots(222, 196, 250, 160, 7, 3)}${dots(255, 70, 268, 30, 6, 8)}</g>
          </svg>
          <div class="b-mono">${esc(mono)}</div>
          ${dot}
        </div>
        ${d.verse ? `<div class="b-dua a" ${at(2.6, 0.35)}>${esc(d.verse)}</div>` : ''}
        ${d.inviteText ? `<div class="b-line b-strong a" ${at(3.6, 0.5)}>${esc(stretch(d.inviteText))}</div>` : ''}
        <div class="b-names a-name" ${at(4.8, 0.7)}>
          <span>${esc(stretchName(d.name1 || occ.name1))}</span>
          ${hasName2 ? `<i>&amp;</i><span>${esc(stretchName(d.name2))}</span>` : ''}
        </div>
        ${d.subtitle ? `<div class="b-line a" ${at(6.2, 0.85)}>${esc(d.subtitle)}</div>` : ''}
        <div class="b-line b-strong a" ${at(7.2, 1.0)}>${esc(stretch('وذلك بمشيئة الله في'))}</div>
        ${infoRow(d, dates, esc, at)}
        ${d.closing ? `<div class="b-line b-big a" ${at(10.6, 1.5)}>${esc(stretch(d.closing))}</div>` : ''}
        <div class="b-rings a" ${at(11.4, 1.6)}><svg viewBox="-60 -40 120 80" aria-hidden="true">${rings(0, 0, 1)}</svg></div>`;
    },
  },
};
