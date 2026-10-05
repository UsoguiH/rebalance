// Payments: Moyasar hosted invoices when a key is configured; otherwise a manual payment link
// (bank transfer / STC Pay) that the admin confirms from /admin. DEMO_MODE adds an instant test button.
import { config, PACKAGES } from './config.js';

const auth = () => 'Basic ' + Buffer.from(config.moyasarSecret + ':').toString('base64');

export const paymentMode = () => (config.moyasarSecret ? 'moyasar' : config.paymentLink ? 'link' : config.demoMode ? 'demo' : 'none');

export async function createCheckout(inv) {
  const mode = paymentMode();
  if (mode === 'moyasar') {
    const res = await fetch('https://api.moyasar.com/v1/invoices', {
      method: 'POST',
      headers: { Authorization: auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: inv.price * 100,
        currency: 'SAR',
        description: `عزيمة — ${PACKAGES[inv.package]?.name || 'دعوة'} (${inv.slug})`,
        success_url: `${config.baseUrl}/pay/return/${inv.slug}`,
        back_url: `${config.baseUrl}/checkout/${inv.slug}?key=${inv.host_key}`,
        metadata: { slug: inv.slug },
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.url) throw new Error(body.message || `Moyasar error ${res.status}`);
    return { mode, url: body.url, ref: body.id };
  }
  if (mode === 'link') return { mode, url: config.paymentLink };
  return { mode };
}

export async function verifyMoyasar(invoiceId) {
  if (!config.moyasarSecret || !invoiceId) return false;
  const res = await fetch(`https://api.moyasar.com/v1/invoices/${encodeURIComponent(invoiceId)}`, { headers: { Authorization: auth() } });
  if (!res.ok) return false;
  const body = await res.json();
  return body.status === 'paid';
}
