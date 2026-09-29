// أيقونات: small hand-drawn line icons (24×24, stroke = currentColor) and
// the eight-point star (خاتم) used as the ornament everywhere in the UI.

/** Eight-point star path centred on (cx, cy): 16 vertices, outer R, inner r. */
export function starPath(cx = 12, cy = 12, R = 10, r = R * 0.66) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    const rr = i % 2 ? r : R;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

const P = {
  menu: '<path d="M10 6.5h10M10 12h10M10 17.5h10"/><path d="M5 4.6l1.1 1.9-1.1 1.9-1.1-1.9zM5 10.1l1.1 1.9-1.1 1.9-1.1-1.9zM5 15.6l1.1 1.9-1.1 1.9-1.1-1.9z" fill="currentColor"/>',
  help: '<rect x="2.5" y="6.5" width="19" height="11" rx="4"/><path d="M7.5 10v4M5.5 12h4"/><circle cx="15.5" cy="10.8" r="1.1" fill="currentColor" stroke="none"/><circle cx="18" cy="13.4" r="1.1" fill="currentColor" stroke="none"/>',
  soundOn: '<path d="M3.5 9.5h3.2L11.5 5.5v13l-4.8-4H3.5z"/><path d="M15 9.2a4 4 0 0 1 0 5.6M17.8 6.5a7.8 7.8 0 0 1 0 11"/>',
  soundOff: '<path d="M3.5 9.5h3.2L11.5 5.5v13l-4.8-4H3.5z"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5"/>',
  reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4"/><path d="M5 3.8v3.9h3.9"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  jump: '<path d="M6 13.5l6-6 6 6M6 19l6-6 6 6"/>',
  camel: '<path d="M5.5 21c0-4.5 1-8 3.6-10.3l1.3-3.6c.4-1.2 1.5-2 2.8-2h2.4c1 0 1.9.5 2.4 1.3l1.6 2.6c.4.7-.1 1.5-.9 1.5h-2.4l-1.6 1.8c-1.4 1.6-1.9 4.3-1.9 8.7"/><path d="M13 5.2l-.9-2"/><circle cx="15.6" cy="7.7" r=".9" fill="currentColor" stroke="none"/>',
  gate: '<path d="M4 21V10.5a8 8 0 0 1 16 0V21"/><path d="M8.5 21v-8.5a3.5 3.5 0 0 1 7 0V21"/><path d="M2.5 21h19"/>',
  stall: '<path d="M3 9l2-5h14l2 5"/><path d="M3 9c0 1.4 1.3 2.4 3 2.4S9 10.4 9 9c0 1.4 1.3 2.4 3 2.4s3-1 3-2.4c0 1.4 1.3 2.4 3 2.4S21 10.4 21 9"/><path d="M5 11.4V20h14v-8.6M10 20v-4.5h4V20"/>',
  house: '<path d="M4.5 20V9.5h15V20"/><path d="M3.5 9.5V6.5h2.5v1.6h2.5V6.5H11v1.6h2V6.5h2.5v1.6H18V6.5h2.5v3"/><path d="M10 20v-4.2a2 2 0 0 1 4 0V20M2.5 20h19"/>',
  tent: '<path d="M2.5 20L12 5l9.5 15z"/><path d="M12 5V3M9 20l3-5.5 3 5.5"/><path d="M1.5 20h21"/>',
  mail: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3.8 7.2l8.2 6.3 8.2-6.3"/>',
  palm: '<path d="M12.5 21c.3-4.2-.2-8.2-1-11.5"/><path d="M11.5 9.5C9.8 6.8 6.8 6 3.5 7.3c2.8-.2 5 .8 6.3 2.8M11.5 9.5c1.5-2.8 4.6-3.8 8-2.6-2.8 0-5 1.1-6 3.1M11.5 9.5c-.3-3-2-5.3-4.8-6.3M11.5 9.5c.9-2.9 3-4.9 6-5.4"/><path d="M6.5 21h11"/>',
  link: '<path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  code: '<path d="M8 7.5L3.5 12 8 16.5M16 7.5l4.5 4.5-4.5 4.5M13.5 5l-3 14"/>',
  briefcase: '<rect x="3" y="7.5" width="18" height="12" rx="2.5"/><path d="M9 7.5v-2A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2M3 13h18"/>',
  at: '<circle cx="12" cy="12" r="3.6"/><path d="M15.6 12v1.4a2.5 2.5 0 0 0 5 0V12a8.6 8.6 0 1 0-3.4 6.8"/>',
  chevron: '<path d="M14.5 6l-6 6 6 6"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  hand: '<path d="M9 11.5V5.2a1.6 1.6 0 0 1 3.2 0v5.3M12.2 10V8.7a1.6 1.6 0 0 1 3.2 0V11M15.4 10.2a1.6 1.6 0 0 1 3.2 0v4.3c0 3.7-2.6 6.5-6.2 6.5-2.4 0-3.8-.9-5.1-2.6l-2.9-4c-.6-.8-.4-1.9.4-2.4.8-.5 1.7-.3 2.3.4L9 14.3"/>',
  star: `<path d="${starPath(12, 12, 10, 6.6)}" fill="currentColor" stroke="none"/>`,
  starLine: `<path d="${starPath(12, 12, 10, 6.6)}"/>`,
};

/** Returns an inline SVG string for icon `name`. */
export function icon(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || P.starLine}</svg>`;
}

// Section → icon + accent colour (header band, map dot, menu tile).
export const SECTION_ICON = {
  welcome: 'gate', project: 'stall', about: 'house', skills: 'tent', contact: 'mail', oasis: 'palm',
};

export function sectionAccent(zone, content, P) {
  if (zone.section === 'project') return content.projects[zone.project]?.color || P.red;
  return {
    welcome: P.crimson, about: P.mudDark, skills: P.teal, contact: P.indigo, oasis: P.waterDeep,
  }[zone.section] || P.crimson;
}

export const CONTACT_ICON = { mail: 'mail', github: 'code', linkedin: 'briefcase', x: 'at' };
