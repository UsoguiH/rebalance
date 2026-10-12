// Flat illustrated salon covers in the style of the Eve/Adam artwork, plus a stylized map.
// Everything is deterministic from a seed, so each salon always gets the same picture.

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const R = (x) => Math.round(x * 10) / 10;

const PAL = {
  eve: { bg: ['#FBEFF1', '#F7E9DF', '#EEF1E6', '#EDEAF5', '#FFF3E3', '#F3E6EA'], blob: ['#F2C6CF', '#EFCDB4', '#CFE0C3', '#D6CFEA', '#F7D9A8', '#E7BFCB'], accent: '#E07D93', deep: '#7B2D4F', ink: '#241B1E', lamp: '#E58A9B' },
  adam: { bg: ['#F1EEE8', '#E7EEF1', '#EFE9E1', '#E9EEE6', '#F3ECE4', '#E6E8EE'], blob: ['#D9D3C8', '#C9D9E0', '#DCCBB5', '#CBD8C4', '#E6CDB0', '#C9CEDB'], accent: '#E8743B', deep: '#2E2A27', ink: '#1C1A19', lamp: '#1F1D1C' },
};

const mirror = (x, y, w, h, p) => `
  <path d="M${x} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}z" fill="${p.ink}"/>
  <path d="M${x + 7} ${y + h - 6}V${y + w / 2}a${w / 2 - 7} ${w / 2 - 7} 0 0 1 ${w - 14} 0V${y + h - 6}z" fill="#FFFFFF" opacity=".92"/>
  <path d="M${x + w * 0.3} ${y + h * 0.75}L${x + w * 0.7} ${y + h * 0.35}M${x + w * 0.42} ${y + h * 0.8}L${x + w * 0.78} ${y + h * 0.45}" stroke="${p.blob[1]}" stroke-width="3" stroke-linecap="round"/>`;

const lamp = (x, len, p) => `
  <path d="M${x} 0V${len}" stroke="${p.ink}" stroke-width="2.4"/>
  <path d="M${x - 26} ${len + 22}a26 22 0 0 1 52 0z" fill="${p.lamp}"/>
  <path d="M${x - 30} ${len + 22}h60" stroke="${p.ink}" stroke-width="2"/>
  <path d="M${x - 26} ${len + 24}L${x - 60} ${len + 140}H${x + 60}L${x + 26} ${len + 24}z" fill="#FFF8E8" opacity=".35"/>`;

const plant = (x, y, s, p) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    ${[-48, -20, 8, 34].map((a, i) => `<path transform="rotate(${a})" d="M0 0C${-14} ${-30} ${-8} ${-62} 0 ${-78}C8 ${-62} 14 ${-30} 0 0z" fill="${['#5E7C4C', '#6F8D58', '#4E6A3E', '#7C9A62'][i]}"/>`).join('')}
    <path d="M-16 0h32l-4 34h-24z" fill="${p.accent}"/>
  </g>`;

const chair = (x, y, s, p) => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="${p.ink}">
    <rect x="-34" y="-70" width="68" height="62" rx="12"/>
    <rect x="-46" y="-14" width="92" height="20" rx="8"/>
    <rect x="-4" y="6" width="8" height="30"/>
    <ellipse cx="0" cy="40" rx="34" ry="6"/>
  </g>`;

const shelf = (x, y, p, r) => {
  let o = `<rect x="${x}" y="${y}" width="70" height="4" rx="2" fill="${p.ink}" opacity=".6"/><rect x="${x}" y="${y + 46}" width="70" height="4" rx="2" fill="${p.ink}" opacity=".6"/>`;
  for (let row = 0; row < 2; row++) for (let i = 0; i < 3; i++) {
    const h = 18 + Math.floor(r() * 16);
    o += `<rect x="${x + 6 + i * 22}" y="${y + row * 46 - h}" width="12" height="${h}" rx="3" fill="${r() > 0.5 ? p.accent : p.deep}" opacity=".85"/>`;
  }
  return o;
};

const pole = (x, y) => `
  <rect x="${x - 4}" y="${y - 12}" width="32" height="14" rx="7" fill="#1C1A19"/>
  <clipPath id="pc${x}"><rect x="${x}" y="${y}" width="24" height="90" rx="10"/></clipPath>
  <rect x="${x}" y="${y}" width="24" height="90" rx="10" fill="#FFFFFF"/>
  <g clip-path="url(#pc${x})">${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${x - 10} ${y + i * 22}l44 -26v12l-44 26z" fill="${i % 2 ? '#2E57A8' : '#D9473B'}"/>`).join('')}</g>
  <rect x="${x - 4}" y="${y + 88}" width="32" height="14" rx="7" fill="#1C1A19"/>`;

const dots = (r, p) => Array.from({ length: 7 }, () => {
  const cx = R(r() * 400), cy = R(r() * 260), rr = R(2 + r() * 4);
  return r() > 0.5 ? `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${p.ink}"/>` : `<circle cx="${cx}" cy="${cy}" r="${rr + 2}" fill="none" stroke="${p.ink}" stroke-width="1.6"/>`;
}).join('');

export function coverArt(salon) {
  const r = rng(salon.art);
  const p = PAL[salon.section] || PAL.eve;
  const k = Math.floor(r() * p.bg.length), bg = p.bg[k], blob = p.blob[k];
  const flip = r() > 0.5;
  const bx = 60 + r() * 160;
  let s = `<rect width="400" height="260" fill="${bg}"/>
    <path d="M${R(bx)} 260C${R(bx - 40)} 170 ${R(bx - 10)} 60 ${R(bx + 90)} 50C${R(bx + 200)} 40 ${R(bx + 230)} 150 ${R(bx + 220)} 260z" fill="${blob}"/>`;
  s += mirror(flip ? 250 : 70, 70, 74, 150, p);
  s += lamp(flip ? 150 : 250, 30 + r() * 25, p);
  s += salon.section === 'adam' && r() > 0.35 ? pole(flip ? 40 : 340, 70) : shelf(flip ? 30 : 300, 90, p, r);
  s += r() > 0.4 ? chair(flip ? 160 : 230, 222, 0.9, p) : plant(flip ? 190 : 210, 230, 0.8, p);
  s += `<rect y="246" width="400" height="14" fill="${p.ink}" opacity=".08"/>` + dots(r, p);
  return `<svg class="cover-art" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${s}</svg>`;
}

// Stylized street map with salon pins (pins are positioned from salon.x/.y)
export function mapArt(salons = [], { activeId = '', section = 'eve', h = 300 } = {}) {
  // h: viewBox height — full-screen maps pass a tall box so streets/pins keep their real size
  const r = rng(section === 'eve' ? 3 : 5), k = h / 300;
  let streets = '';
  for (let i = 0; i < 9; i++) streets += `<path d="M${R(-40 + i * 60)} -20L${R(60 + i * 60 + r() * 30)} ${R(h + 40)}" stroke="#FFFFFF" stroke-width="${i % 3 ? 4 : 9}" stroke-linecap="round"/>`;
  for (let i = 0; i < Math.round(7 * k); i++) streets += `<path d="M-20 ${R(20 + i * 48)}L420 ${R(-30 + i * 52 + r() * 30)}" stroke="#FFFFFF" stroke-width="${i % 3 ? 4 : 8}" stroke-linecap="round"/>`;
  const pins = salons.map((s, i) => `
    <g class="pin${s.id === activeId ? ' on' : ''}" data-id="${s.id}" style="--i:${i}" transform="translate(${R(s.x * 400)} ${R(40 + s.y * (h - 120))})">
      <path d="M0 0C-12-14-16-20-16-28a16 16 0 0 1 32 0c0 8-4 14-16 28z" fill="var(--md-primary)" stroke="#fff" stroke-width="2.5"/>
      <circle cy="-28" r="6" fill="#fff"/>
    </g>`).join('');
  const cy = R(h / 2);
  return `<svg class="map-art" viewBox="0 0 400 ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="400" height="${h}" fill="#ECE9E2"/>
    <path d="M-20 ${R(h * .77)}C60 ${R(h * .67)} 120 ${R(h * .87)} 200 ${R(h * .8)}S340 ${R(h * .6)} 420 ${R(h * .7)}V${h + 20}H-20z" fill="#D3E3EC"/>
    <ellipse cx="300" cy="${R(h * .27)}" rx="70" ry="44" fill="#D5E4C8"/><ellipse cx="80" cy="${R(h * .4)}" rx="44" ry="30" fill="#D5E4C8"/>
    ${streets}
    <circle cx="200" cy="${cy}" r="9" fill="#2F7BF6" stroke="#fff" stroke-width="3"/><circle cx="200" cy="${cy}" r="22" fill="#2F7BF6" opacity=".15"/>
    ${pins}
  </svg>`;
}

export const initials = (name) => name.replace(/^(صالون|مركز|حلاق|سبا|استوديو)\s+/, '').trim().replace(/^ال(?=..)/, '').charAt(0);
