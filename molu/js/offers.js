import { boot, $, icon, salonCard, bindFavs, secSwitch, swap } from './shell.js';
import { SECTIONS, SALONS } from './data.js';
import { spring } from './motion.js';

// The whole screen is one function: a full page load runs it once; moving between screens in place (js/vt.js)
// calls it again on the fresh markup, without downloading or re-evaluating this file.
export default function mount() {
  let section = boot({ page: 'offers' });
  const TILES = {
    eve: [['#FF5028', 'أول حجز عليك خصم 20٪', 'لأول موعد عن طريق مولو', 'redeem', '#fff'], ['#FFE45C', 'باقات العرائس', 'مكياج وشعر وحناء', 'celebration'], ['#F7D6DE', 'يوم الراحة', 'مساج وحمام مغربي', 'spa'], ['#1A1A1A', 'في بيتكِ', 'نفس الخدمة بدون مشوار', 'home_work', '#fff']],
    adam: [['#FF5028', 'أول حلاقة خصم 20٪', 'لأول موعد عن طريق مولو', 'redeem', '#fff'], ['#FFE45C', 'باقة العريس', 'حلاقة وتنظيف وعناية', 'workspace_premium'], ['#D6E4EE', 'قص وتحديد', 'بسعر واحد طول الأسبوع', 'content_cut'], ['#1A1A1A', 'في بيتك', 'الحلاق يجيك', 'home_work', '#fff']],
  };
  function render() {
    const deals = SALONS[section].filter((s) => s.offer);
    $('#feed').innerHTML = `
      <div class="ptiles rise">${TILES[section].map(([bg, t, sub, ic, fg], i) => `<a class="ptile pressable" style="--bg:${bg};--fg:${fg || '#1A1A1A'};--i:${i}" href="explore.html?s=${section}&offer=1"><b>${t}</b><small>${sub}</small><span class="art">${icon(ic, 56)}</span></a>`).join('')}</div>
      <section class="sec"><div class="sec-h"><h2>صالونات عليها خصم</h2></div><div class="list rise">${deals.map((s, i) => salonCard(s, { i })).join('')}</div></section>`;
  }
  render();
  bindFavs(document);
  secSwitch($('#sec'), section, (k) => { section = k; swap($('#feed'), render); });
}
if (!window.__softnav) mount();
