// البوصلة: a small round map card. North is up, like the camera, so the map
// reads the same way as the screen. The SVG uses world metres directly
// (x → right, z → down), so zones and the player need no conversion.

import { sectionAccent, starPath } from './icons.js';

const R = 62; // world radius shown

export function createMinimap(el, ctx) {
  const { content, P, LAYOUT } = ctx;
  const pond = LAYOUT?.oasis || { x: 36, z: -34, r: 12 };
  const ticks = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    const r0 = i % 4 === 0 ? 56 : 58.5;
    ticks.push(`M${(Math.sin(a) * r0).toFixed(1)} ${(-Math.cos(a) * r0).toFixed(1)}L${(Math.sin(a) * 61).toFixed(1)} ${(-Math.cos(a) * 61).toFixed(1)}`);
  }
  el.innerHTML = `
    <svg viewBox="-66 -66 132 132" aria-hidden="true">
      <defs>
        <clipPath id="mm-clip"><circle r="${R}"/></clipPath>
        <radialGradient id="mm-sand" cx="50%" cy="45%" r="60%">
          <stop offset="0" stop-color="${P.sandLight}"/><stop offset="1" stop-color="${P.sandDeep}"/>
        </radialGradient>
      </defs>
      <circle r="${R}" fill="url(#mm-sand)"/>
      <g clip-path="url(#mm-clip)">
        <path d="M-70 40 C-40 28 -10 52 20 40 S60 30 70 44" stroke="${P.sandShadow}" stroke-opacity=".25" stroke-width="3" fill="none"/>
        <path d="M-70 -48 C-40 -58 -10 -40 20 -52 S60 -60 70 -50" stroke="${P.sandShadow}" stroke-opacity=".25" stroke-width="3" fill="none"/>
        <circle r="40" fill="${P.mudLight}" stroke="${P.mudDark}" stroke-opacity=".45" stroke-width="1.5" stroke-dasharray="3 3"/>
        <path d="M0 40 V-30 M-30 -4 H30" stroke="${P.path}" stroke-width="5" stroke-linecap="round" opacity=".8"/>
        <circle cx="${pond.x}" cy="${pond.z}" r="${pond.r || 12}" fill="${P.water}" stroke="${P.waterDeep}" stroke-width="1.5"/>
        <circle cx="${pond.x - 4}" cy="${pond.z - 3}" r="3" fill="${P.waterFoam}" opacity=".5"/>
      </g>
      <path d="${ticks.join('')}" stroke="${P.crimson}" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>
      <g class="mm-zones">
        ${content.zones.map((z) => `<g class="mm-zone" data-id="${z.id}" transform="translate(${z.x} ${z.z})">
          <circle class="mm-halo" r="7" fill="${sectionAccent(z, content, P)}"/>
          <circle r="4" fill="${sectionAccent(z, content, P)}" stroke="${P.cream}" stroke-width="1.6"/>
        </g>`).join('')}
      </g>
      <g class="mm-player">
        <circle r="8" fill="${P.cream}" opacity=".55"/>
        <path d="M0 -8 L5.5 5.5 L0 2.5 L-5.5 5.5Z" fill="${P.crimson}" stroke="${P.cream}" stroke-width="1.6" stroke-linejoin="round"/>
      </g>
      <g transform="translate(0 -53)">
        <path d="${starPath(0, 0, 9, 6)}" fill="${P.crimson}" stroke="${P.cream}" stroke-width="1.2"/>
        <text y="3.4" text-anchor="middle" font-size="9" fill="${P.cream}" font-family="Cairo, sans-serif" font-weight="700">ش</text>
      </g>
    </svg>`;
  const player = el.querySelector('.mm-player');
  const zoneEls = new Map([...el.querySelectorAll('.mm-zone')].map((g) => [g.dataset.id, g]));
  let lastKey = '';

  return {
    setActive(id) {
      for (const [zid, g] of zoneEls) g.classList.toggle('active', zid === id);
    },
    update(p) {
      let x = p.position.x; let z = p.position.z;
      const d = Math.hypot(x, z);
      if (d > R - 6) { x *= (R - 6) / d; z *= (R - 6) / d; }
      // heading h: forward = (sin h, cos h) in (x, z); the arrow points to -y.
      const deg = ((Math.PI - p.heading) * 180) / Math.PI;
      const key = `${x.toFixed(1)},${z.toFixed(1)},${deg.toFixed(0)}`;
      if (key === lastKey) return;
      lastKey = key;
      player.setAttribute('transform', `translate(${x.toFixed(2)} ${z.toFixed(2)}) rotate(${deg.toFixed(1)})`);
    },
  };
}
