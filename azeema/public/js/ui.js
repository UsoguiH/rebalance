// Small shared helpers
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const ar = (n) => new Intl.NumberFormat('ar-SA-u-nu-arab').format(n);

export async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const t = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(t); t.select(); document.execCommand('copy'); t.remove();
  }
  if (btn) { const o = btn.innerHTML; btn.innerHTML = '✓ تم النسخ'; setTimeout(() => (btn.innerHTML = o), 1600); }
}

export function bindCopy(root = document) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy],[data-copy-from]');
    if (!b) return;
    e.preventDefault();
    const text = b.dataset.copyFrom ? $(b.dataset.copyFrom).value : b.dataset.copy || b.closest('.personal-out')?.querySelector('input')?.value;
    if (text) copyText(text, b);
  });
}

export async function api(url, body, method = 'POST') {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حدث خطأ، حاول مرة أخرى');
  return data;
}
