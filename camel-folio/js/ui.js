import { profile, projects, skills, contact, ui } from './content.js';

const $ = (s) => document.querySelector(s);

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export class UI {
  constructor({ touch }) {
    this.touch = touch;
    this.panel = $('#panel');
    this.panelBody = $('#panel-body');
    this.prompt = $('#prompt');
    this.toastEl = $('#toast');
    this.jarsEl = $('#jars');
    this.open = false;
    this.onClose = null;
    this.onPromptTap = null;
    this.onMenuPick = null;

    $('#panel-close').addEventListener('click', () => this.closePanel());
    this.panel.addEventListener('click', (e) => { if (e.target === this.panel) this.closePanel(); });
    this.prompt.addEventListener('click', () => this.onPromptTap && this.onPromptTap());
    $('#btn-help').addEventListener('click', () => this.showHelp());
    $('#btn-menu').addEventListener('click', () => this.showMenu());
    document.body.classList.toggle('touch', touch);
  }

  setLoading(p, label) {
    $('#load-bar').style.transform = `scaleX(${p})`;
    if (label) $('#load-label').textContent = label;
  }

  ready(onStart) {
    const btn = $('#start');
    btn.disabled = false;
    btn.textContent = ui.start;
    btn.classList.add('ready');
    $('#load-label').textContent = '';
    btn.focus();
    btn.addEventListener('click', () => {
      $('#loader').classList.add('gone');
      setTimeout(() => $('#loader').remove(), 1200);
      onStart();
    }, { once: true });
  }

  setSound(on) {
    const b = $('#btn-sound');
    b.setAttribute('aria-pressed', String(on));
    b.title = on ? ui.soundOn : ui.soundOff;
    b.setAttribute('aria-label', b.title);
    b.classList.toggle('off', !on);
  }

  showPrompt(label) {
    if (!label) { this.prompt.classList.remove('on'); return; }
    this.prompt.querySelector('.p-label').textContent = label;
    this.prompt.querySelector('.p-key').textContent = this.touch ? ui.tap : ui.press;
    this.prompt.classList.add('on');
  }

  toast(text, ms = 2200) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('on');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => this.toastEl.classList.remove('on'), ms);
  }

  setJars(n, total, show) {
    this.jarsEl.textContent = ui.jars(n, total);
    this.jarsEl.classList.toggle('on', show);
  }

  openPanel(html, accent = '#e07a3f') {
    this.panelBody.innerHTML = html;
    this.panel.style.setProperty('--accent', accent);
    this.panel.classList.add('on');
    document.body.classList.add('modal');
    this.panel.setAttribute('aria-hidden', 'false');
    this.open = true;
    this.lastFocus = document.activeElement;
    $('#panel-close').focus();
    this.panelBody.scrollTop = 0;
  }

  closePanel() {
    if (!this.open) return;
    this.panel.classList.remove('on');
    document.body.classList.remove('modal');
    this.panel.setAttribute('aria-hidden', 'true');
    this.open = false;
    if (this.lastFocus && this.lastFocus.focus) this.lastFocus.blur();
    if (this.onClose) this.onClose();
  }

  project(p) {
    this.openPanel(`
      <div class="hero" style="background:${esc(p.color)}"><span class="year">${esc(p.year)}</span></div>
      <h2>${esc(p.title)}</h2>
      <p class="sub">${esc(p.subtitle)}</p>
      <ul class="tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <p>${esc(p.body)}</p>
      <a class="btn" href="${esc(p.link)}" target="_blank" rel="noopener">${ui.visit} ←</a>
    `, p.color);
  }

  about() {
    this.openPanel(`
      <h2>${esc(profile.name)}</h2>
      <p class="sub">${esc(profile.role)}</p>
      ${profile.about.map((t) => `<p>${esc(t)}</p>`).join('')}
      <dl class="facts">${profile.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    `, '#8e2f2a');
  }

  skills() {
    this.openPanel(`
      <h2>${ui.sections.skills}</h2>
      <p class="sub">كل صندوق في الصحراء يحمل مهارة. ادفعها بالجمل!</p>
      <ul class="tags big">${skills.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    `, '#c8894f');
  }

  // focus: id of the link whose pad the camel is standing on; it is listed first.
  contact(focus) {
    const list = focus ? [...contact].sort((a, b) => (b.id === focus) - (a.id === focus)) : contact;
    this.openPanel(`
      <h2>${ui.sections.contact}</h2>
      <p class="sub">يسعدني سماع أفكارك ومشاريعك.</p>
      <ul class="links">${list.map((c) => `<li><a href="${esc(c.href)}" target="_blank" rel="noopener" class="${c.id === focus ? 'focus' : ''}" style="--c:${esc(c.color)}"><b>${esc(c.label)}</b><span dir="ltr">${esc(c.value)}</span></a></li>`).join('')}</ul>
    `, '#2f6f73');
  }

  showHelp() {
    const rows = [...(this.touch ? ui.helpMobile : ui.helpDesktop)];
    this.openPanel(`
      <h2>${ui.help}</h2>
      <table class="keys">${rows.map(([k, v]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(v)}</td></tr>`).join('')}</table>
      <p class="sub">قِف على الدوائر المضيئة في الرمال لفتح الأقسام.</p>
    `, '#3b3a6b');
  }

  // Menu doubles as the accessible, no-3D way to read the whole portfolio.
  showMenu() {
    const s = ui.sections;
    const items = [
      ['welcome', s.welcome], ['projects', s.projects], ['about', s.about],
      ['skills', s.skills], ['contact', s.contact], ['playground', s.playground], ['oasis', s.oasis],
    ];
    this.openPanel(`
      <h2>${ui.menu}</h2>
      <p class="sub">انتقل مباشرة إلى أي مكان في الصحراء.</p>
      <ul class="menu">${items.map(([id, label]) => `<li><button data-go="${id}">${esc(label)}</button></li>`).join('')}</ul>
      <h3>${s.projects}</h3>
      <ul class="menu">${projects.map((p) => `<li><button data-project="${esc(p.id)}">${esc(p.title)} <small>${esc(p.subtitle)}</small></button></li>`).join('')}</ul>
    `, '#e07a3f');
    this.panelBody.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => this.onMenuPick && this.onMenuPick({ zone: b.dataset.go })));
    this.panelBody.querySelectorAll('[data-project]').forEach((b) => b.addEventListener('click', () => this.onMenuPick && this.onMenuPick({ project: b.dataset.project })));
  }
}
