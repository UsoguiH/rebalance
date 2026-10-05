import { $, api, initCommon, myOrders, setLoading, snackbar } from './m3.js';
import { revealOnScroll } from './motion.js';

initCommon();
revealOnScroll();
const main = $('.checkout');
myOrders.add(main.dataset.slug, main.dataset.key);
$('#pay-area')?.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-pay]');
  if (!b) return;
  setLoading(b, true);
  try {
    const r = await api(`/api/invitations/${main.dataset.slug}/pay?key=${main.dataset.key}`, { demo: 'demo' in b.dataset });
    if (r.redirect) location.href = r.redirect; else setLoading(b, false);
  } catch (ex) { setLoading(b, false); snackbar(ex.message); }
});
