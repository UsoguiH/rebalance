// محتوى الأقسام: builds the HTML for each portfolio section from content.js.
// Used by the in-world panels and by the no-WebGL fallback page.

import { icon, SECTION_ICON, sectionAccent, CONTACT_ICON } from './icons.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const paras = (list) => (list || []).map((p) => `<p>${esc(p)}</p>`).join('');

/** Controls table rows → HTML. Keys like "↑ ↓ أو W S" become keycaps. */
export function controlsTable(rows, { compact = false } = {}) {
  const keys = (k) => {
    // Split on " أو " (or) and spaces between short tokens → keycaps.
    const parts = String(k).split(' أو ');
    return parts.map((part) => {
      const tokens = part.split(' ');
      const short = tokens.every((t) => t.length <= 6 && /^[\x20-\x7e←→↑↓]+$/.test(t));
      return short
        ? tokens.map((t) => `<kbd dir="ltr">${esc(t)}</kbd>`).join('')
        : `<span class="k-text">${esc(part)}</span>`;
    }).join('<span class="k-or">أو</span>');
  };
  return `<table class="controls${compact ? ' compact' : ''}"><tbody>${rows.map(([k, v]) => `
    <tr><th scope="row">${keys(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`;
}

/** Header band shared by all panels. */
function header({ accent, iconName, kicker, title, sub, badge = '' }) {
  return `
  <header class="sheet-head" style="--accent:${esc(accent)}">
    <div class="head-pattern" aria-hidden="true"></div>
    <div class="head-row">
      <span class="head-ico">${icon(iconName)}</span>
      <div class="head-text">
        ${kicker ? `<p class="head-kicker">${esc(kicker)}${badge ? ` <span class="head-year">${esc(badge)}</span>` : ''}</p>` : ''}
        <h2 class="head-title" id="sheet-title">${esc(title)}</h2>
        ${sub ? `<p class="head-sub">${esc(sub)}</p>` : ''}
      </div>
    </div>
  </header>`;
}

export function sectionHTML(zone, ctx, { standalone = false } = {}) {
  const { content, P } = ctx;
  const U = content.ui;
  const ar = content.toArabicDigits;
  const accent = sectionAccent(zone, content, P);
  const ic = SECTION_ICON[zone.section] || 'starLine';
  const touch = !!ctx.touch;

  switch (zone.section) {
    case 'project': {
      const pr = content.projects[zone.project];
      if (!pr) return '';
      const n = content.projects.length;
      const visit = pr.link && pr.link !== '#' ? pr.link : null;
      return header({
        accent, iconName: ic,
        kicker: `${U.sections.project} ${ar(zone.project + 1)} من ${ar(n)}`,
        title: pr.title, sub: pr.subtitle,
        badge: ar(pr.year),
      }) + `
      <div class="sheet-body">
        <p class="lead">${esc(pr.body)}</p>
        <ul class="chips" aria-label="التقنيات">${pr.tags.map((t) => `<li class="chip" style="--c:${esc(pr.color)}"><bdi>${esc(t)}</bdi></li>`).join('')}</ul>
        <div class="actions">
          <a class="btn btn-primary" style="--accent:${esc(pr.color)}" href="${esc(pr.link || '#')}" ${visit ? 'target="_blank" rel="noopener"' : ''}>
            ${icon('link')}<span>${esc(U.visit)}</span></a>
        </div>
      </div>`;
    }
    case 'about': {
      const pf = content.profile;
      return header({ accent, iconName: ic, kicker: U.sections.about, title: zone.title }) + `
      <div class="sheet-body">
        <div class="about-id">
          <p class="about-name">${esc(pf.name)}</p>
          <p class="about-role">${esc(pf.role)}</p>
        </div>
        <div class="prose">${paras(pf.about)}</div>
        <dl class="facts">${pf.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(ar(v))}</dd></div>`).join('')}</dl>
      </div>`;
    }
    case 'skills': {
      const colors = [P.crimson, P.teal, P.orange, P.indigo, P.brass, P.red];
      return header({ accent, iconName: ic, kicker: U.sections.skills, title: zone.title, sub: `${ar(content.skills.length)} مهارات أحملها في رحلتي` }) + `
      <div class="sheet-body">
        <ul class="chips chips-big">${content.skills.map((s, i) => `<li class="chip" style="--c:${colors[i % colors.length]}"><span class="chip-star">${icon('star')}</span><bdi>${esc(s)}</bdi></li>`).join('')}</ul>
      </div>`;
    }
    case 'contact': {
      return header({ accent, iconName: ic, kicker: U.sections.contact, title: zone.title, sub: 'أرسل رسالة، وسيحملها الحمام الزاجل إليّ' }) + `
      <div class="sheet-body">
        <ul class="links">${content.contact.map((c) => {
          const ext = !/^mailto:/.test(c.href);
          return `<li><a class="link-row" href="${esc(c.href)}" ${ext ? 'target="_blank" rel="noopener"' : ''}>
            <span class="link-ico">${icon(CONTACT_ICON[c.id] || 'link')}</span>
            <span class="link-text"><strong>${esc(c.label)}</strong><span dir="ltr">${esc(c.value)}</span></span>
            <span class="link-go">${icon('chevron')}</span></a></li>`;
        }).join('')}</ul>
      </div>`;
    }
    case 'oasis':
      return header({ accent, iconName: ic, kicker: U.sections.oasis, title: zone.title }) + `
      <div class="sheet-body">
        <div class="prose">${paras(U.oasisBody)}</div>
        <div class="oasis-art" aria-hidden="true">${oasisArt(P)}</div>
      </div>`;
    case 'welcome':
    default: {
      const rows = (touch ? U.helpMobile : U.helpDesktop).slice(0, 4);
      return header({ accent, iconName: ic, kicker: U.sections.welcome, title: zone.title || 'أهلاً بك' }) + `
      <div class="sheet-body">
        <div class="prose">${paras(U.welcomeBody)}</div>
        ${standalone ? '' : `<h3 class="sub-h">${esc(U.help)}</h3>${controlsTable(rows, { compact: true })}
        <div class="actions">
          <button type="button" class="btn btn-primary" data-act="close" style="--accent:${esc(accent)}">${icon('camel')}<span>لنبدأ الجولة</span></button>
          <button type="button" class="btn btn-ghost" data-act="menu">${icon('menu')}<span>${esc(U.menu)}</span></button>
        </div>`}
      </div>`;
    }
  }
}

function oasisArt(P) {
  return `<svg viewBox="0 0 320 90" preserveAspectRatio="xMidYMax meet">
    <ellipse cx="160" cy="74" rx="120" ry="12" fill="${P.water}" opacity=".9"/>
    <ellipse cx="160" cy="72" rx="96" ry="7" fill="${P.waterFoam}" opacity=".35"/>
    ${[[92, 0], [212, 1], [150, 2]].map(([x, i]) => `
      <g transform="translate(${x} ${66 - i * 4})">
        <path d="M0 0 C2 -18 -2 -34 3 -48" stroke="${P.palmTrunk}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <g transform="translate(3 -48)" fill="${i === 2 ? P.palmLeafDark : P.palmLeaf}">
          <path d="M0 0 C-10 -8 -24 -6 -32 4 C-22 -2 -12 -1 0 2Z"/>
          <path d="M0 0 C10 -8 24 -6 32 4 C22 -2 12 -1 0 2Z"/>
          <path d="M0 0 C-6 -12 -16 -18 -24 -16 C-14 -12 -8 -8 0 1Z"/>
          <path d="M0 0 C6 -12 16 -18 24 -16 C14 -12 8 -8 0 1Z"/>
          <circle cx="0" cy="3" r="3" fill="${P.date}"/>
        </g>
      </g>`).join('')}
  </svg>`;
}
