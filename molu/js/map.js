// Real map: OpenStreetMap streets and parks of north Riyadh (data/riyadh-north.json, © OSM contributors, ODbL),
// drawn by Leaflet on one canvas. No tile server: it renders instantly, works offline, and is styled like the app.
// Leaflet and the street data load on first use; if either fails, callers fall back to the drawn map (art.js mapArt).
import { ME, SECTIONS } from './data.js';

const LEAFLET_JS = 'js/vendor/leaflet.js';
let ready;
export function loadMap() {
  ready ||= Promise.all([
    window.L ? Promise.resolve(window.L) : new Promise((ok, no) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'css/leaflet.css'; document.head.append(css);
      const s = document.createElement('script'); s.src = LEAFLET_JS; s.onload = () => ok(window.L); s.onerror = no; document.head.append(s);
    }),
    fetch('data/riyadh-north.json').then((r) => { if (!r.ok) throw new Error('map data'); return r.json(); }),
  ]).catch((e) => { ready = null; throw e; });
  return ready;
}
// warm up in idle time (pages with a map button call this)
export const prefetchMap = () => (window.requestIdleCallback || setTimeout)(() => loadMap().catch(() => {}), { timeout: 3000 });

const decode = (f) => { let a = f[0], b = f[1]; const out = [[a / 1e5, b / 1e5]]; for (let i = 2; i < f.length; i += 2) { a += f[i]; b += f[i + 1]; out.push([a / 1e5, b / 1e5]); } return out; };
// road classes: 0 motorway/trunk · 1 primary/secondary · 2 tertiary/links · 3 residential · 4 parks
const ROADS = [
  { color: '#F7D27E', casing: '#E9B95A', w: [4, 6, 9, 12, 16] },
  { color: '#FFFFFF', casing: '#E2DCCF', w: [2.5, 4, 6, 8, 11] },
  { color: '#FFFFFF', casing: null, w: [1.2, 2, 3.5, 5, 7] },
  { color: '#FFFFFF', casing: null, w: [0, .8, 1.6, 3, 5] },
];
const short = (n) => n.replace(/^(صالون|حلاق|مركز)\s+/, '');

/**
 * Draw the real map into `host`.
 * opts: salons, activeId, interactive (default true), onPick(id), padBottom (px kept clear for a card)
 * returns { map, select(id), destroy() }
 */
export async function realMap(host, { salons = [], activeId = '', interactive = true, onPick, padBottom = 0 } = {}) {
  const [L, geo] = await loadMap();
  const [S, W, N, E] = geo.bbox;
  const map = L.map(host, {
    zoomControl: false, attributionControl: true, preferCanvas: true, minZoom: 12, maxZoom: 18, zoomSnap: 0.25,
    maxBounds: [[S - 0.02, W - 0.02], [N + 0.02, E + 0.02]], maxBoundsViscosity: 0.9,
    dragging: interactive, touchZoom: interactive, scrollWheelZoom: interactive, doubleClickZoom: interactive, boxZoom: false, keyboard: interactive, tap: false,
  });
  map.attributionControl.setPosition('bottomleft').setPrefix(false).addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>');
  host.classList.add('real-map');
  const canvas = L.canvas({ padding: 0.4 });

  L.polygon(geo.lines[4].map(decode), { renderer: canvas, stroke: false, fillColor: '#D6E6C3', fillOpacity: 1, interactive: false }).addTo(map);
  // minor → major so big roads sit on top; casing drawn under each major class
  const layers = [3, 2, 1, 0].flatMap((c) => {
    const lines = geo.lines[c].map(decode), st = ROADS[c];
    const casing = st.casing ? L.polyline(lines, { renderer: canvas, color: st.casing, lineCap: 'round', lineJoin: 'round', interactive: false }) : null;
    const road = L.polyline(lines, { renderer: canvas, color: st.color, lineCap: 'round', lineJoin: 'round', interactive: false });
    return [[c, casing, true], [c, road, false]].filter(([, l]) => l);
  });
  layers.forEach(([, l]) => l.addTo(map));
  const restyle = () => {
    const z = map.getZoom(), k = Math.max(0, Math.min(4, Math.round(z - 13)));
    layers.forEach(([c, l, isCasing]) => {
      const w = ROADS[c].w[k];
      l.setStyle({ weight: isCasing ? w + 2 : w, opacity: w ? 1 : 0 });
    });
    host.classList.toggle('z-near', z >= 14.5);
  };

  // road names (major roads), shown when zoomed in
  geo.roads.forEach(([name, lat, lng]) => L.marker([lat, lng], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'road-label', html: `<span>${name}</span>`, iconSize: null }) }).addTo(map));

  // you
  L.marker([ME.lat, ME.lng], { interactive: false, keyboard: false, zIndexOffset: -100, icon: L.divIcon({ className: 'me-dot', html: '<i></i>', iconSize: [22, 22] }) }).addTo(map);

  // salons: a pill with the name; the chosen one turns black and grows
  const pins = new Map();
  salons.forEach((s, i) => {
    const m = L.marker([s.lat, s.lng], {
      keyboard: interactive, riseOnHover: true, title: s.name,
      icon: L.divIcon({ className: 'sal-pin', html: `<span class="sp" style="--i:${i}"><i></i><b>${short(s.name)}</b></span>`, iconSize: null }),
    }).addTo(map);
    if (interactive) m.on('click', () => { select(s.id, true); onPick?.(s.id); });
    pins.set(s.id, m);
  });
  function select(id, pan) {
    pins.forEach((m, k) => { m.getElement()?.classList.toggle('on', k === id); m.setZIndexOffset(k === id ? 1000 : 0); });
    const s = salons.find((x) => x.id === id);
    if (s && pan) map.panTo(offset(s), { animate: true, duration: 0.45 });
  }
  // keep the chosen pin above the bottom card
  const offset = (s) => { const p = map.project([s.lat, s.lng]); p.y += padBottom / 2; return map.unproject(p); };

  // pins closer than a pill apart: stack the later one above the earlier (its tail still points at its spot)
  const declutter = () => {
    const placed = [];
    [...pins.values()].sort((a, b) => b.getLatLng().lat - a.getLatLng().lat).forEach((m) => {
      const el = m.getElement()?.firstElementChild; if (!el) return;
      const p = map.latLngToLayerPoint(m.getLatLng()), w = el.offsetWidth;
      let dy = 0;
      while (placed.some((q) => Math.abs(q.x - p.x) < (q.w + w) / 2 + 4 && Math.abs(q.y - q.dy - (p.y - dy)) < 36)) dy += 38;
      el.style.setProperty('--dy', dy + 'px');
      placed.push({ x: p.x, y: p.y, dy, w });
    });
  };
  map.on('zoomend', () => { restyle(); declutter(); });
  const active = salons.find((s) => s.id === activeId);
  if (active && salons.length === 1) map.setView([active.lat, active.lng], interactive ? 16 : 15);
  else map.fitBounds(L.latLngBounds([...salons.map((s) => [s.lat, s.lng]), [ME.lat, ME.lng]]), { paddingTopLeft: [80, 100], paddingBottomRight: [80, 50 + padBottom], maxZoom: 15.5 });
  restyle(); declutter();
  select(activeId, false);
  return { map, select, destroy: () => map.remove() };
}

// real directions in the visitor's maps app
export const directionsUrl = (s) => `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
export const sourceNote = (s) => s.real ? `الموقع من OpenStreetMap · الأسعار والتقييمات تجريبية` : `صالون تجريبي · ${SECTIONS[s.section].name}`;
