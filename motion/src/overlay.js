// 2D layer: kinetic captions and the flat UI elements pinned to 3D anchors.
import * as THREE from 'three';
import { E, seg } from './shots.js';

const W = 1080, H = 1920;
const INK = '#26272b', YELLOW = '#f4d73c', RED = '#d42a42', CARD_RED = '#75011d';
const CAP = 0.811;          // Le Murmure cap height / em
const SX = 0.8;            // horizontal condensing to match the reference face
const MARGIN = 78;
const YOFF = 10;            // reference was measured on a 1900px-tall crop

const lerp = (a, b, k) => a + (b - a) * k;

export class Overlay {
  constructor(cues, director) {
    this.c = (id, end) => cues.at(id, end);
    this.d = director;
    this.build();
  }

  build() {
    const c = this.c;
    const L = (cap, pitch, words, opts = {}) => ({ cap, pitch, words, ...opts });
    const w = (text, id, opts = {}) => ({ text, id, ...opts });
    this.slides = [
      { top: 162, out: c('talk') - 0.22, lines: [
        L(128, 185, [w('WHEN', 'when'), w('YOU', 'you'), w('KNOW', 'know'), w('NOBODY', 'nobody')]),
        L(128, 185, [w('AT', 'at'), w('AN', 'an'), w('EVENT.', 'event')]) ] },
      { top: 170, out: c('skip') - 0.55, lines: [
        L(196, 282, [w('TALK', 'talk'), w('TO', 'to'), w('THIS', 'this')]),
        L(196, 282, [w('PERSON', 'person'), w('FIRST.', 'first')], { box: { from: 'person', at: c('first') - 0.02, dur: 0.3 } }) ] },
      { top: 170, out: c('find') - 0.75, lines: [
        L(182, 262, [w('SKIP', 'skip', { zoom: true }), w('THE', 'the'), w('SPEAKER.', 'speaker')]),
        L(182, 262, [w('AND', 'and'), w('THE', 'the2'), w('CEO.', 'ceo')]) ] },
      { top: 170, out: c('say') - 0.48, lines: [
        L(165, 295, [w('FIND', 'find'), w('THE', 'the3'), w('CONNECTOR.', 'connector')], { under: { from: 'connector', at: c('connector') + 0.12, dur: 0.4, trim: true } }),
        L(135, 194, [w('THE', 'the4'), w('GUY', 'guy'), w('WHO', 'who'), w('KNOWS', 'knows')]),
        L(135, 194, [w('HALF', 'half'), w('THE', 'the5'), w('ROOM.', 'room')]) ] },
      { top: 170, out: c('youll') - 0.12, lines: [
        L(182, 263, [w('SAY', 'say'), w('HIS', 'his'), w("NAME'S", 'names')]),
        L(182, 263, [w('DANIEL.', 'daniel', { zoom: true, at: c('daniel') - 0.28 })], { box: { from: 'daniel', at: c('daniel') - 0.02, dur: 0.22 } }) ] },
      { top: 170, out: c('he') - 0.2, lines: [
        L(196, 281, [w("YOU'LL", 'youll'), w('SPOT', 'spot')]),
        L(196, 281, [w('HIM', 'him'), w('FAST.', 'fast')]) ] },
      { top: 170, out: c('and2') - 0.3, lines: [
        L(189, 271, [w('HE', 'he'), w('NEVER', 'never'), w('STAYS', 'stays')]),
        L(189, 271, [w('IN', 'in'), w('ONE', 'one'), w('GROUP.', 'group')]) ] },
      { top: 170, out: c('tonight') - 0.25, lines: [
        L(196, 281, [w('HE', 'hes'), w('WAVES', 'waves'), w('THE', 'the7')]),
        L(196, 281, [w('NEW', 'new'), w('GUY', 'guy2'), w('OVER.', 'over')]) ] },
      { top: 170, out: c('but') - 0.4, lines: [
        L(207, 291, [w('TONIGHT.', 'tonight')]),
        L(207, 291, [w("THAT'S", 'thats'), w('YOU.', 'you2', { zoom: true })], { box: { from: 'you2', at: c('you2') + 0.02, dur: 0.22 } }) ] },
      { top: 170, out: c('hell') - 0.15, lines: [
        L(196, 281, [w('A', 'a'), w('QUICK', 'quick'), w('"HEY"', 'hey')]),
        L(196, 281, [w("WON'T", 'wont'), w('WORK.', 'work')], { color: RED }) ] },
      { top: 170, out: c('so') - 0.32, lines: [
        L(169, 242, [w("HE'LL", 'hell'), w('FORGET', 'forget'), w('YOU', 'you3')]),
        L(169, 242, [w('BY', 'by'), w('THE', 'the8'), w('NEXT', 'next'), w('GROUP.', 'group2')]) ] },
      { top: 170, out: c('im') - 0.32, cut: true, lines: [
        L(203, 291, [w('SO', 'so'), w('GIVE', 'give'), w('HIM', 'him2')]),
        L(203, 291, [w('A', 'a2'), w('JOB.', 'job')], { under: { from: 'a2', at: c('job') + 0.08, dur: 0.35 } }) ] },
      { top: 263, out: c('me') + 0.6, cut: true, pre: { text: "You're thinking,", id: 'youre', y: 192 }, lines: [
        L(148, 212, [w('WHY', 'why'), w('WOULD', 'would'), w('A', 'a3'), w('GUY', 'guy3')]),
        L(148, 212, [w('LIKE', 'like'), w('THAT', 'that')]),
        L(148, 212, [w('HELP', 'help'), w('ME?', 'me')]) ] },
    ];
    // resolve entry times
    for (const s of this.slides) {
      for (const l of s.lines) for (const wd of l.words) wd.in = wd.at ?? c(wd.id) - 0.1;
      s.in = s.lines[0].words[0].in;
      if (s.pre) s.pre.in = c(s.pre.id) - 0.12;
    }
    // a slide must finish leaving before the next one starts arriving
    this.slides.forEach((s, i) => {
      const next = this.slides[i + 1];
      if (next && !s.cut) s.out = Math.min(s.out, next.in - 0.24);
    });
  }

  // ---------- text helpers ----------
  font(ctx, cap) { ctx.font = `${cap / CAP}px Murmure`; }
  wordWidth(ctx, text, cap, extra = 0) {
    this.font(ctx, cap);
    ctx.letterSpacing = '0px';
    const n = [...text].length;
    return ctx.measureText(text).width * SX + (0.05 * cap + extra) * (n - 1);
  }
  drawWord(ctx, text, x, baseline, cap, color, extra = 0) {
    this.font(ctx, cap);
    ctx.save();
    ctx.translate(x, baseline);
    ctx.scale(SX, 1);
    ctx.letterSpacing = `${(0.05 * cap + extra) / SX}px`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  layout(ctx, s) {
    if (s._lay) return s._lay;
    let top = s.top + YOFF;
    const lines = s.lines.map((l) => {
      let x = MARGIN;
      const words = l.words.map((wd) => {
        const width = this.wordWidth(ctx, wd.text, l.cap);
        const r = { ...wd, x, width };
        x += width + 0.2 * l.cap;
        return r;
      });
      const r = { ...l, top, words };
      top += l.pitch;
      return r;
    });
    return (s._lay = lines);
  }

  drawSlide(ctx, s, t) {
    if (t < s.in - 0.01) return;
    if (s.cut ? t >= s.out : t > s.out + 0.3) return;
    const lines = this.layout(ctx, s);
    const exitK = s.cut ? 0 : seg(t, s.out, s.out + 0.26, E.in);

    if (s.pre && t >= s.pre.in) {
      const p = seg(t, s.pre.in, s.pre.in + 0.3, E.out);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, s.pre.y + YOFF - 10, W, 60); ctx.clip();
      ctx.font = '500 41px Montserrat';
      ctx.fillStyle = INK;
      ctx.textBaseline = 'top';
      ctx.fillText(s.pre.text, MARGIN + 4, s.pre.y + YOFF + (1 - p) * 50);
      ctx.restore();
    }

    for (const l of lines) {
      const base = l.top + l.cap;
      const dyExit = -exitK * l.cap * 1.25;
      // highlight box behind
      if (l.box && t >= l.box.at) {
        const i = l.words.findIndex((wd) => wd.id === l.box.from);
        const x0 = l.words[i].x - 0.075 * l.cap;
        const last = l.words[l.words.length - 1];
        const x1 = last.x + last.width + 0.075 * l.cap;
        const k = seg(t, l.box.at, l.box.at + l.box.dur, E.out);
        ctx.save();
        ctx.beginPath(); ctx.rect(0, l.top - 0.16 * l.cap, W, l.cap * 1.42); ctx.clip();
        ctx.fillStyle = YELLOW;
        ctx.globalAlpha = 1 - exitK;
        ctx.fillRect(x0, l.top - 0.13 * l.cap + dyExit, (x1 - x0) * k, l.cap * 1.27);
        ctx.restore();
      }
      if (l.under && t >= l.under.at) {
        const i = l.words.findIndex((wd) => wd.id === l.under.from);
        const last = l.words[l.words.length - 1];
        const x0 = l.words[i].x;
        const x1 = last.x + last.width - (l.under.trim ? 0.12 * l.cap : 0);
        const k = seg(t, l.under.at, l.under.at + l.under.dur, E.out);
        ctx.fillStyle = YELLOW;
        ctx.globalAlpha = 1 - exitK;
        ctx.fillRect(x0, base + 0.17 * l.cap + dyExit, (x1 - x0) * k, Math.max(6, 0.06 * l.cap));
        ctx.globalAlpha = 1;
      }
      for (const wd of l.words) {
        if (t < wd.in) continue;
        const color = wd.color || l.color || INK;
        if (wd.zoom) {
          const p = seg(t, wd.in, wd.in + 0.42, E.out5);
          if (p < 1) {
            const s2 = lerp(2.7, 1, p);
            ctx.save();
            ctx.globalAlpha = lerp(0.2, 1, Math.min(1, p * 1.4));
            const cx = wd.x + wd.width / 2, cy = base - l.cap / 2;
            ctx.translate(cx + (1 - p) * -0.45 * wd.width, cy);
            ctx.scale(s2, s2);
            this.drawWord(ctx, wd.text, -wd.width / 2, l.cap / 2, l.cap, color);
            ctx.restore();
            continue;
          }
        }
        const p = seg(t, wd.in, wd.in + 0.36, E.out);
        const dy = (1 - p) * l.cap * 1.05 + dyExit;
        const extra = (1 - p) * 0.3 * l.cap;
        ctx.save();
        ctx.beginPath();
        ctx.rect(wd.x - 30, l.top - 0.16 * l.cap, W, l.cap * 1.3);
        ctx.clip();
        this.drawWord(ctx, wd.text, wd.x, base + dy, l.cap, color, extra);
        ctx.restore();
      }
    }
  }

  // ---------- UI pieces ----------
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  card(ctx, x, y, w, h, r = 12, shadow = 0.18) {
    ctx.save();
    ctx.shadowColor = `rgba(40,40,50,${shadow})`;
    ctx.shadowBlur = 26; ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#ffffff';
    this.roundRect(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = 1.5;
    this.roundRect(ctx, x, y, w, h, r); ctx.stroke();
    ctx.restore();
  }

  reticle(ctx, t, P) {
    const c = this.c;
    const t0 = c('this') - 0.06, t1 = c('skip') - 0.55;
    if (t < t0 || t > t1 + 0.15) return;
    const head = P(this.d.anchor('connHead').add(new THREE.Vector3(0, 0.3, 0)));
    const feet = P(this.d.anchor('connFeet'));
    const p = seg(t, t0, t0 + 0.25, E.out);
    const a = 1 - seg(t, t1, t1 + 0.15);
    const h = (feet.y - head.y) * 0.98, cx = (head.x + feet.x) / 2 + 2, w = h * 0.52;
    const sc = lerp(1.35, 1, p);
    const x0 = cx - (w / 2) * sc, x1 = cx + (w / 2) * sc, y0 = head.y - 6 - h * (sc - 1) * 0.5, y1 = y0 + h * sc;
    const L = w * 0.22;
    ctx.save();
    ctx.globalAlpha = Math.min(1, p * 2) * a;
    ctx.strokeStyle = YELLOW; ctx.lineWidth = 5; ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(x0, y0 + L); ctx.lineTo(x0, y0); ctx.lineTo(x0 + L, y0);
    ctx.moveTo(x1 - L, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + L);
    ctx.moveTo(x1, y1 - L); ctx.lineTo(x1, y1); ctx.lineTo(x1 - L, y1);
    ctx.moveTo(x0 + L, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - L);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, feet.y - h * 0.12, w * 0.42 * sc, w * 0.42 * sc, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  redX(ctx, t, P, anchor, at, until) {
    if (t < at || t > until) return;
    const h = P(this.d.anchor(anchor).add(new THREE.Vector3(0, 0.36, 0)));
    const ref = P(this.d.anchor(anchor).add(new THREE.Vector3(0, 0.36 + 0.42, 0)));
    const size = Math.abs(h.y - ref.y);
    const p = seg(t, at, at + 0.2, E.back);
    const s = size * p;
    ctx.save();
    ctx.strokeStyle = RED; ctx.lineWidth = Math.max(4, size * 0.085); ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(h.x - s / 2, h.y - s / 2); ctx.lineTo(h.x + s / 2, h.y + s / 2);
    ctx.moveTo(h.x + s / 2, h.y - s / 2); ctx.lineTo(h.x - s / 2, h.y + s / 2);
    ctx.stroke();
    ctx.restore();
  }

  nameCard(ctx, t, P) {
    const c = this.c;
    const tBar = c('say') - 0.15, tCard = c('daniel') - 0.22, tEnd = c('he') - 0.22;
    if (t < tBar || t > tEnd + 0.15) return;
    const a = P(this.d.anchor('connHead').add(new THREE.Vector3(0, 0.66, 0)));
    const bw = 205, bh = 112, cw = 448, ch = 168;
    const kBar = seg(t, tBar, tBar + 0.3, E.out);
    const kCard = seg(t, tCard, tCard + 0.28, E.out5);
    const kOut = seg(t, tEnd, tEnd + 0.15, E.in);
    ctx.save();
    ctx.globalAlpha = 1 - kOut;
    if (kCard > 0) {
      const h = ch * kCard;
      this.card(ctx, a.x - cw / 2, a.y - h / 2, cw, h, 10, 0.16 * kCard);
    }
    const lh = lerp(16, bh, kCard), lw = bw * (kCard > 0 ? 1 : kBar);
    const ly = kCard > 0 ? a.y - lh / 2 : a.y - 0.95 * ch;
    ctx.fillStyle = YELLOW;
    ctx.fillRect(a.x - lw / 2, kCard > 0 ? ly : ly - lh / 2, lw, lh);
    if (kCard > 0.3) {
      ctx.save();
      ctx.beginPath(); ctx.rect(a.x - bw / 2, a.y - bh / 2, bw, bh); ctx.clip();
      const cap = 74, ww = this.wordWidth(ctx, 'DANIEL', cap);
      this.drawWord(ctx, 'DANIEL', a.x - ww / 2, a.y + cap / 2 + (1 - seg(t, tCard + 0.08, tCard + 0.36, E.out)) * 90, cap, INK);
      ctx.restore();
    }
    ctx.restore();
  }

  heyBubble(ctx, t, P) {
    const c = this.c;
    const t0 = c('hey') - 0.32, t1 = c('the8');
    if (t < t0 || t > t1) return;
    const a = P(this.d.anchor('heroHead').add(new THREE.Vector3(0.05, 0.62, 0)));
    const k = seg(t, t0, t0 + 0.3, E.back);
    const fade = 1 - seg(t, c('by') - 0.1, t1);
    const w = 205 * k, h = 100 * k;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 2) * fade;
    this.card(ctx, a.x - w / 2, a.y - h / 2, w, h, 14, 0.15);
    ctx.font = `600 ${46 * k}px Montserrat`;
    ctx.fillStyle = '#2b2b2f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Hey.', a.x, a.y + 2);
    ctx.restore();
  }

  // small task card held out in "so give him a job" — scales with perspective
  taskCard(ctx, t, P) {
    const c = this.c;
    const t0 = c('so') + 0.0, t1 = c('im') - 0.32;
    if (t < t0 || t >= t1) return;
    const hero = this.d.anchor('heroHead'), conn = this.d.anchor('connHead');
    const ctr = hero.clone().lerp(conn, 0.55); ctr.y += 0.36;
    const a = P(ctr), b = P(ctr.clone().add(new THREE.Vector3(1.0, 0, 0)));
    const unit = Math.hypot(b.x - a.x, b.y - a.y) * 1.0;
    const k = seg(t, t0, t0 + 0.3, E.back);
    const w = unit * 0.95 * k, h = unit * 0.55 * k;
    const x = a.x - w / 2, y = a.y - h / 2;
    ctx.save();
    this.card(ctx, x, y, w, h, 8 * k, 0.15);
    ctx.fillStyle = '#c9c9ce';
    const lw = Math.max(2, h * 0.045);
    [[0.72, 0.18], [0.5, 0.31], [0.6, 0.44]].forEach(([f, yy]) => ctx.fillRect(x + w * 0.1, y + h * yy, w * f * 0.85, lw));
    const s = h * 0.36;
    ctx.setLineDash([lw * 1.6, lw * 1.2]);
    ctx.strokeStyle = '#2c2d31'; ctx.lineWidth = Math.max(2, lw * 0.75);
    ctx.strokeRect(x + w + unit * 0.08, y - h * 0.05, s, s);
    ctx.restore();
  }

  agencyCard(ctx, t) {
    const c = this.c;
    const t0 = c('im') - 0.32, t1 = c('youre') - 0.62;
    if (t < t0 || t > t1 + 0.35) return;
    const kin = seg(t, t0, t0 + 0.24, E.out5);
    const kSquash = seg(t, t1, t1 + 0.12, E.in);
    const kGone = seg(t, t1 + 0.12, t1 + 0.32, E.in);
    const x = 75 + (1 - kin) * -1100, y = 1028, w = 925, h = 476;
    ctx.save();
    ctx.translate(x, y + h / 2);
    ctx.transform(1, -0.028, 0, 1, 0, 0);
    ctx.scale(1 - kGone * 0.15, Math.max(0.025, 1 - kSquash));
    ctx.translate(0, -h / 2);
    ctx.globalAlpha = 1 - kGone;
    // slab edge (perspective thickness) + face
    ctx.fillStyle = CARD_RED;
    this.roundRect(ctx, -12, 6, 30, h - 6, 6); ctx.fill();
    this.card(ctx, 0, 0, w, h, 6, 0.22);
    ctx.fillStyle = CARD_RED;
    ctx.fillRect(0, 2, 7, h - 4);
    if (kSquash < 0.3) {
      const lines = [
        { text: '“I’m starting an agency', at: c('im') - 0.1 },
        { text: 'and want to meet founders.', at: c('and3') - 0.2, hl: true },
        { text: 'Who should I talk to?”', at: c('who3') - 0.1 },
      ];
      ctx.font = '600 57px Montserrat';
      ctx.textBaseline = 'alphabetic';
      lines.forEach((ln, i) => {
        if (t < ln.at) return;
        const by = 140 + i * 103;
        const p = seg(t, ln.at, ln.at + 0.35, E.out);
        ctx.save();
        ctx.beginPath(); ctx.rect(40, by - 62, w - 50, 88); ctx.clip();
        if (ln.hl) {
          const pre = ctx.measureText('and want to ').width;
          const hw = ctx.measureText('meet founders').width;
          const k = seg(t, c('meet') - 0.05, c('meet') + 0.25, E.out);
          ctx.fillStyle = YELLOW;
          ctx.fillRect(70 + pre - 6, by - 50 + (1 - p) * 70, (hw + 12) * k, 64);
        }
        ctx.fillStyle = '#2a2a2e';
        ctx.fillText(ln.text, 70, by + (1 - p) * 70);
        ctx.restore();
      });
    }
    ctx.restore();
  }

  draw(ctx, t, P) {
    const c = this.c;
    this.reticle(ctx, t, P);
    this.redX(ctx, t, P, 'speakerHead', c('speaker') - 0.08, c('find') - 0.42);
    this.redX(ctx, t, P, 'ceoHead', c('and') + 0.12, c('find') - 0.42);
    this.nameCard(ctx, t, P);
    this.heyBubble(ctx, t, P);
    this.taskCard(ctx, t, P);
    this.agencyCard(ctx, t);
    for (const s of this.slides) this.drawSlide(ctx, s, t);
  }
}
