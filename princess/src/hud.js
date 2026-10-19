// HUD drawn as DOM + inline SVG, laid out like the original: castle badges with the
// caged princess portraits in the corners, the rank/score pill, the heart bar, the
// wood/metal pill, the respawn countdown, a kill feed and world-anchored prompts.
import * as THREE from 'three';
import { TEAM_COLORS } from './castle.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const heartPath = 'M50 88 C20 66 4 48 4 30 C4 14 16 4 30 4 C40 4 46 10 50 17 C54 10 60 4 70 4 C84 4 96 14 96 30 C96 48 80 66 50 88 Z';

function castleSVG(team) {
  const c = TEAM_COLORS[team];
  const fill = team === 0 ? '#4b8fe2' : '#ef6a3e';
  const light = team === 0 ? '#6aa8f0' : '#f78659';
  const dark = team === 0 ? '#1f4e9a' : '#7a2614';
  const flip = team === 1 ? 'scale(-1,1) translate(-200,0)' : '';
  return `<svg viewBox="0 0 200 220" class="castle-svg" aria-hidden="true">
    <g transform="${flip}">
      <path d="M58 22 H88 V44 H104 V22 H134 V44 H150 V22 H182 V150 L162 172 V214 H96 V150 Z" fill="${fill}" stroke="${dark}" stroke-width="9" stroke-linejoin="round"/>
      <path d="M68 60 H176 M68 92 H176 M68 124 H176 M100 60 V92 M140 60 V92 M120 92 V124 M160 92 V124 M100 124 V150 M140 124 V150 M128 150 V210 M160 172 V210" stroke="${light}" stroke-width="6" opacity="0.9" fill="none"/>
      <path d="M66 34 H80 M112 34 H126 M158 34 H172" stroke="${light}" stroke-width="5"/>
    </g>
    <g class="portrait" transform="translate(${team === 0 ? 62 : 138} 160)">
      <circle r="58" fill="${dark}"/>
      <circle r="52" fill="${fill}"/>
      <circle r="44" fill="#9aa0a8" stroke="#3a3f48" stroke-width="3"/>
      <circle r="37" class="bg" fill="#fff8e8"/>
      <g class="face">${princessFaceSVG(1 - team)}</g>
      <g class="bars">
        <rect x="-21" y="-40" width="8" height="80" rx="3" fill="#8d939c" stroke="#3a3f48" stroke-width="2.5"/>
        <rect x="-4" y="-42" width="8" height="84" rx="3" fill="#8d939c" stroke="#3a3f48" stroke-width="2.5"/>
        <rect x="13" y="-40" width="8" height="80" rx="3" fill="#8d939c" stroke="#3a3f48" stroke-width="2.5"/>
        <circle cx="-24" cy="10" r="7" fill="#f8dcc8" stroke="#3a1a0a" stroke-width="2.5"/>
        <circle cx="24" cy="10" r="7" fill="#f8dcc8" stroke="#3a1a0a" stroke-width="2.5"/>
      </g>
      <circle r="44" fill="none" stroke="#3a3f48" stroke-width="3"/>
      <circle r="56" fill="none" stroke="${dark}" stroke-width="6" class="alarm"/>
    </g>
  </svg>`;
}

// team: whose princess (0 blue = auburn up-do, blue tiara; 1 red = blonde, pink tiara)
export function princessFaceSVG(team, mood = 'sad') {
  const blue = team === 0;
  const hair = blue ? '#a4521f' : '#f3cd4a';
  const hairD = blue ? '#6e3410' : '#c99a20';
  const tiara = blue ? '#4fc0f5' : '#f06a8a';
  const dress = blue ? '#4fb3f0' : '#e85a4a';
  const eyes =
    mood === 'happy'
      ? `<path d="M-15 -2 q6 -7 12 0 M3 -2 q6 -7 12 0" stroke="#2a140a" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
      : `<ellipse cx="-9" cy="-2" rx="5" ry="6" fill="#fff" stroke="#2a140a" stroke-width="2.5"/><ellipse cx="9" cy="-2" rx="5" ry="6" fill="#fff" stroke="#2a140a" stroke-width="2.5"/>
         <circle cx="-9" cy="-1" r="2.6" fill="#2a140a"/><circle cx="9" cy="-1" r="2.6" fill="#2a140a"/>
         <path d="M-13 6 q-2 6 1 9 M13 6 q2 6 -1 9" stroke="#7fd0ff" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const mouth = mood === 'happy' ? `<path d="M-7 13 q7 8 14 0" stroke="#2a140a" stroke-width="3" fill="#c0393a"/>` : `<path d="M-6 16 q6 -6 12 0" stroke="#2a140a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  return `
    <path d="M-34 40 Q-30 22 -16 20 H16 Q30 22 34 40 Z" fill="${dress}" stroke="#2a140a" stroke-width="3"/>
    ${blue ? `<ellipse cx="0" cy="-30" rx="20" ry="12" fill="${hair}" stroke="#2a140a" stroke-width="3"/><path d="M-10 -36 q10 -6 20 0 M-12 -28 q12 -6 24 0" stroke="${hairD}" stroke-width="3" fill="none"/>` : ''}
    <path d="M-30 6 Q-34 -32 0 -34 Q34 -32 30 6 Q30 26 22 30 L-22 30 Q-30 26 -30 6 Z" fill="${hair}" stroke="#2a140a" stroke-width="3"/>
    <ellipse cx="0" cy="2" rx="22" ry="22" fill="#f8dcc8" stroke="#2a140a" stroke-width="3"/>
    <path d="M-22 -6 Q-18 -24 0 -24 Q18 -24 22 -6 Q12 -16 0 -14 Q-12 -16 -22 -6 Z" fill="${hair}" stroke="#2a140a" stroke-width="2.5"/>
    <path d="M-12 -24 l4 -10 l4 7 l4 -9 l4 9 l4 -7 l4 10 Z" fill="${tiara}" stroke="#2a140a" stroke-width="2.5" stroke-linejoin="round"/>
    ${eyes}${mouth}
    <circle cx="-15" cy="8" r="4" fill="#f4a0a0" opacity="0.7"/><circle cx="15" cy="8" r="4" fill="#f4a0a0" opacity="0.7"/>`;
}

function heartSVG(i) {
  return `<svg viewBox="0 0 100 92" class="heart" data-i="${i}">
    <path d="${heartPath}" class="slot" fill="#5c2410" stroke="#2a0e04" stroke-width="7" stroke-linejoin="round"/>
    <g class="fillg"><path d="${heartPath}" class="fill" fill="#e8462a" stroke="#2a0e04" stroke-width="7" stroke-linejoin="round"/>
    <path d="M24 22 Q14 30 18 44 Q20 30 32 26 Z" fill="#ff9c6a"/><path d="M58 16 Q68 12 76 18" stroke="#ffb084" stroke-width="7" fill="none" stroke-linecap="round"/></g>
  </svg>`;
}

const logSVG = `<svg viewBox="0 0 100 90" class="res-ico"><ellipse cx="54" cy="45" rx="40" ry="40" fill="#c9893a"/><ellipse cx="50" cy="45" rx="38" ry="40" fill="#f0bd6a"/>
  <ellipse cx="50" cy="45" rx="27" ry="29" fill="none" stroke="#e1a24e" stroke-width="5"/><ellipse cx="50" cy="45" rx="15" ry="16" fill="none" stroke="#e1a24e" stroke-width="5"/><circle cx="50" cy="45" r="5" fill="#e1a24e"/></svg>`;
const ingotSVG = `<svg viewBox="0 0 100 90" class="res-ico"><path d="M8 18 Q50 6 92 18 L92 72 Q50 84 8 72 Z" fill="#b8bcc4"/><path d="M8 18 Q50 6 92 18 L92 40 Q50 30 8 40 Z" fill="#e8ebf0"/>
  <path d="M8 56 Q50 46 92 56 L92 72 Q50 84 8 72 Z" fill="#8c9098"/><path d="M8 40 Q50 30 92 40" stroke="#ffffff" stroke-width="4" fill="none"/></svg>`;

export class HUD {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    root.innerHTML = `
      <div class="hud-top">
        <div class="castle castle-blue">${castleSVG(0)}</div>
        <div class="pill score-pill"><div class="pill-circle"><span class="rank">1</span></div><div class="pill-bar"><span class="score">0</span></div></div>
        <div class="hearts-wrap"><div class="hearts"></div></div>
        <div class="respawn"><span>5</span></div>
        <div class="pill res-pill"><div class="pill-circle"><span class="wood">0</span></div><div class="res-bar">${logSVG}${ingotSVG}</div><div class="pill-circle"><span class="ore">0</span></div></div>
        <div class="castle castle-red">${castleSVG(1)}</div>
      </div>
      <div class="feed"></div>
      <div class="banner"></div>
      <div class="wincount"><div class="wc-label"></div><div class="wc-num"></div></div>
      <div class="prompts"></div>
      <div class="classcard"></div>
      <div class="offscreen"></div>
      <div class="scoreboard"></div>
    `;
    this.el = (s) => root.querySelector(s);
    this.heartsEl = this.el('.hearts');
    this.heartCount = 0;
    this.feedEl = this.el('.feed');
    this.bannerEl = this.el('.banner');
    this.promptsEl = this.el('.prompts');
    this.offEl = this.el('.offscreen');
    this.lastHp = -1;
    this.bannerT = 0;
    this.tmp = new THREE.Vector3();
    this.promptPool = [];
    this.portrait = [0, 1].map((t) => ({ root: root.querySelector(t === 0 ? '.castle-blue' : '.castle-red'), state: '' }));
  }

  setHearts(hp, max) {
    if (this.heartCount !== max) {
      this.heartsEl.innerHTML = Array.from({ length: max }, (_, i) => heartSVG(i)).join('');
      this.heartCount = max;
      this.hearts = [...this.heartsEl.querySelectorAll('.fillg')];
      this.lastHp = -1;
    }
    if (Math.abs(hp - this.lastHp) < 0.01) return;
    if (hp < this.lastHp - 0.05) {
      this.heartsEl.classList.remove('hit');
      void this.heartsEl.offsetWidth;
      this.heartsEl.classList.add('hit');
    }
    this.lastHp = hp;
    this.hearts.forEach((h, i) => {
      const f = Math.max(0, Math.min(1, hp - i));
      const q = Math.ceil(f * 4) / 4;
      const s = q <= 0 ? 0 : 0.35 + q * 0.65;
      h.setAttribute('transform', `translate(50 46) scale(${s}) translate(-50 -46)`);
      h.style.display = q <= 0 ? 'none' : '';
    });
  }

  feed(html, cls = '') {
    const d = document.createElement('div');
    d.className = 'feed-item ' + cls;
    d.innerHTML = html;
    this.feedEl.prepend(d);
    while (this.feedEl.children.length > 5) this.feedEl.lastChild.remove();
    setTimeout(() => d.classList.add('out'), 4500);
    setTimeout(() => d.remove(), 5200);
  }
  banner(text, team = -1) {
    this.bannerEl.textContent = text;
    this.bannerEl.className = 'banner show ' + (team === 0 ? 'b-blue' : team === 1 ? 'b-red' : '');
    this.bannerT = 3.2;
  }

  // prompts: [{x,y,z,key,label}]
  prompts(list, camera, w, h) {
    while (this.promptPool.length < list.length) {
      const d = document.createElement('div');
      d.className = 'prompt';
      d.innerHTML = '<span class="key"></span><span class="lbl"></span>';
      this.promptsEl.appendChild(d);
      this.promptPool.push(d);
    }
    this.promptPool.forEach((d, i) => {
      const p = list[i];
      if (!p) {
        d.style.display = 'none';
        return;
      }
      this.tmp.set(p.x, p.y, p.z).project(camera);
      d.style.display = '';
      d.style.transform = `translate(${((this.tmp.x + 1) / 2) * w}px, ${((1 - this.tmp.y) / 2) * h}px) translate(-50%, -100%)`;
      d.firstChild.textContent = p.key;
      d.lastChild.textContent = p.label;
      d.classList.toggle('dim', !!p.dim);
    });
  }

  // arrows at the screen edge pointing at princesses on the move
  offscreen(list, camera, w, h) {
    this.offEl.innerHTML = list
      .map((p) => {
        this.tmp.set(p.x, p.y, p.z).project(camera);
        let x = this.tmp.x, y = this.tmp.y;
        if (this.tmp.z > 1) {
          x = -x;
          y = -y;
        }
        if (Math.abs(x) < 0.92 && Math.abs(y) < 0.86) return '';
        const ang = Math.atan2(-y, x);
        const k = Math.min(0.9 / Math.abs(x || 1e-3), 0.82 / Math.abs(y || 1e-3), 1);
        const sx = ((x * k + 1) / 2) * w, sy = ((1 - y * k) / 2) * h;
        return `<div class="off-arrow t${p.team}" style="left:${sx}px;top:${sy}px"><div class="off-tip" style="transform:rotate(${ang}rad)"></div><div class="off-face">${`<svg viewBox="-40 -40 80 80">${princessFaceSVG(p.team, 'sad')}</svg>`}</div></div>`;
      })
      .join('');
  }

  scoreboard(show, units, playerTeam) {
    const sb = this.el('.scoreboard');
    sb.classList.toggle('show', show);
    if (!show) return;
    const row = (u) => `<tr class="${u.isPlayer ? 'me' : ''}"><td>${u.name}</td><td>${u.cls}</td><td>${u.kills}</td><td>${u.deaths}</td><td>${u.score}</td></tr>`;
    const col = (t) =>
      `<div class="sb-team t${t}"><h3>${TEAM_COLORS[t].name} Team</h3><table><tr><th>Name</th><th>Class</th><th>K</th><th>D</th><th>Score</th></tr>${units
        .filter((u) => u.team === t)
        .sort((a, b) => b.score - a.score)
        .map(row)
        .join('')}</table></div>`;
    sb.innerHTML = col(0) + col(1);
  }

  update(dt, s) {
    // s: snapshot from the game
    this.el('.rank').textContent = s.rank;
    this.el('.score').textContent = s.score;
    this.el('.wood').textContent = s.wood;
    this.el('.ore').textContent = s.ore;
    const dead = s.respawn > 0;
    this.el('.hearts-wrap').style.visibility = dead ? 'hidden' : 'visible';
    const rs = this.el('.respawn');
    rs.classList.toggle('show', dead);
    if (dead) {
      const n = String(Math.ceil(s.respawn));
      if (rs.firstChild.textContent !== n) {
        rs.firstChild.textContent = n;
        rs.classList.remove('pop');
        void rs.offsetWidth;
        rs.classList.add('pop');
      }
    } else this.setHearts(s.hp, s.maxHp);
    // portraits: which princess sits in each castle's dungeon
    for (const t of [0, 1]) {
      const p = s.princesses[1 - t];
      const pr = this.portrait[t];
      const state = p.state;
      if (pr.state !== state) {
        pr.state = state;
        const bars = pr.root.querySelector('.bars');
        const face = pr.root.querySelector('.face');
        bars.style.display = state === 'prison' ? '' : 'none';
        face.style.opacity = state === 'throne' ? 0.18 : 1;
        if (state === 'throne') face.innerHTML = princessFaceSVG(1 - t, 'happy');
        else face.innerHTML = princessFaceSVG(1 - t, 'sad');
        pr.root.classList.toggle('alarm-on', state === 'carried' || state === 'dropped');
      }
      pr.root.querySelector('.portrait').setAttribute('data-stage', p.stage);
    }
    // win countdown
    const wc = this.el('.wincount');
    if (s.winTeam >= 0) {
      wc.className = 'wincount show t' + s.winTeam;
      this.el('.wc-label').textContent = s.winTeam === s.playerTeam ? 'Hold both princesses!' : 'Stop them!';
      this.el('.wc-num').textContent = Math.ceil(s.winLeft);
    } else wc.className = 'wincount';
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.bannerEl.classList.remove('show');
    }
    this.el('.classcard').innerHTML = s.classCard || '';
  }
}
