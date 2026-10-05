import crypto from 'node:crypto';
import path from 'node:path';

const env = process.env;
const root = path.resolve(import.meta.dirname, '..');

export const config = {
  root,
  port: Number(env.PORT || 3000),
  baseUrl: (env.BASE_URL || `http://localhost:${env.PORT || 3000}`).replace(/\/$/, ''),
  dataDir: path.resolve(env.DATA_DIR || path.join(root, 'data')),
  adminKey: env.ADMIN_KEY || 'dev-admin',
  // Demo mode: lets you "pay" without a gateway. Never enable in production.
  demoMode: env.DEMO_MODE === '1',
  moyasarSecret: env.MOYASAR_SECRET_KEY || '',
  paymentLink: env.PAYMENT_LINK || '', // fallback: manual link (bank/STC Pay); admin confirms
  whatsappContact: env.WHATSAPP_CONTACT || '', // e.g. 9665XXXXXXXX — support button
  renderToken: env.RENDER_TOKEN || crypto.randomBytes(16).toString('hex'),
  renderConcurrency: Number(env.RENDER_CONCURRENCY || 1),
  renderEnabled: env.RENDER_DISABLED !== '1',
};

export const PACKAGES = {
  video: {
    name: 'فيديو الدعوة',
    price: 149,
    features: ['فيديو دعوة متحرك ١٥ ثانية', 'بمقاس الجوال للواتساب والسناب', 'تعديل مجاني مرة واحدة'],
    rsvp: false,
  },
  full: {
    name: 'الباقة الكاملة',
    price: 299,
    launchPrice: 199,
    features: ['كل ما في باقة الفيديو', 'صفحة دعوة بعداد تنازلي وموقع القاعة', 'تأكيد الحضور ولوحة الضيوف', 'روابط شخصية بأسماء المدعوين', 'رسالة تذكير جاهزة'],
    rsvp: true,
  },
};

export const priceOf = (pkg) => {
  const p = PACKAGES[pkg] || PACKAGES.full;
  return p.launchPrice ?? p.price;
};
