import { $, api, bindCopy } from './ui.js';
bindCopy();
const area = $('#pay-area');
area?.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-pay]');
  if (!b) return;
  b.disabled = true;
  const err = $('.error', area);
  err.hidden = true;
  try {
    const r = await api(`/api/invitations/${area.dataset.slug}/pay?key=${area.dataset.key}`, { demo: 'demo' in b.dataset });
    if (r.redirect) location.href = r.redirect;
    else b.disabled = false;
  } catch (ex) { err.textContent = ex.message; err.hidden = false; b.disabled = false; }
});
