# مولو (MoLu): UI redesign prototype

This is a redesign of the **MoLu** salon booking UI (حواء for women's salons, آدم for barbers).

- **Look:** the visual language of **محلي**.
- **Flows:** kept as simple as **Uber Eats**.
- **Motion:** built on the same design system and spring motion as عزيمة (`css/m3.css`, `css/springs.css`, `js/motion.js`, `js/m3.js`).

It is a static prototype. All data is mock data from `js/data.js`, and appointments, favourites and the profile are saved in `localStorage`.

Pages load built bundles: each page's code is one minified file plus one shared chunk, requested together, and the inner pages share one stylesheet (`css/app.min.css`). After editing anything in `js/` or `css/`, rebuild:

```bash
cd molu && npm install && npm run build     # esbuild → js/dist/*, css/app.min.css (also updates the <script> tags)
python3 -m http.server 4610                 # open http://localhost:4610
node scripts/flow.mjs /tmp/out             # recorded end-to-end booking flow (Playwright)
node scripts/shoot.mjs /tmp/out index.html # screenshots
```

## Screens
| Page | Pattern |
|---|---|
| `index.html` | **Gate**: the whole حواء و آدم illustration on its own cream, a name above each half and a black pill («تفضّلي» / «تفضّل») below it. Static and tiny, so it paints at once. Entering is a cross-document view transition into a fully built home feed. |
| `explore.html` | Section home, Uber Eats feed: next appointment, one search bar, one row of category art shortcuts (emoji for now; see `docs/ICON-PROMPTS.md`), carousels (nearest, today's offers, top rated), then every salon. A floating «الخريطة» pill morphs into a **real map** (below). |
| `salon.html` | Uber Eats store: cover, logo, one meta line and info pills, a «الأكثر طلباً» row, sticky tabs with scroll-spy, and service rows. Tapping **+** adds a service and brings up a black «اختر الموعد» bar. |
| Booking | **One sheet**: who (optional) · day · time · confirm. The button morphs into a loader, then a success check with confetti and a ticket. |
| `appointments.html` | محلي «الطلبات»: bell with badge, orange chips, cards with black pill actions (manage / rate / re-book). Includes cancel with undo, an `.ics` calendar file, and rating. |
| `categories.html` | محلي side rail with collapsible groups of tiles. Offers use 3D gradient numbers. |
| `offers.html`, `favorites.html`, `account.html`, `business.html` | Offers grid, favourites, sign-in (phone → code → name) and the owner pricing page. |
| `join.html` | **سجّل صالونك**: salons and barbers sign up in 7 one-question screens: side (حواء / آدم) · shop or home visits · name (the booking link writes itself) · place (drag the real map under a pin, or pick districts + a visit fee) · services (pick sections, services arrive priced, edit or untick) · hours presets + team size · name, phone and a code. No password, no email, no plan choice up front (14-day trial; the plan is suggested at the end). A live card shows how customers will see you; the draft survives leaving. The new salon then appears in the feed, on the map and on its own page. |

**Moving between screens** (`js/vt.js`): inside the app a tap doesn't load a new document. The next screen's HTML is fetched ahead of time (on touch, and the bar's pages when idle), each page module exports a `mount()` that runs on the swapped-in markup, and a same-document View Transition animates the move (push / pop / tab, the salon picture morph, the bar holding still). Listeners on `window`/`document` and intervals belong to the screen that added them and are removed when you leave. Anything else (the start screen, another site, a failed fetch) is a normal page load, which still animates.

**Bottom bar**: الرئيسية · المفضلة · حسابي, with مواعيدي in its own circle. Offers and categories are reached from the home shortcuts.

**Real map** (`js/map.js`): north Riyadh streets and parks from OpenStreetMap (`data/riyadh-north.json`, © OSM contributors, ODbL), drawn by Leaflet on one canvas. There is no tile server, so it works offline and in the published copy. آدم lists five real barbershops (names, districts and coordinates from OSM); their prices, ratings and reviews are demo content and are labelled so.

## Tokens (taken from محلي's CSS)
| Token | Value |
|---|---|
| Primary | `#FF5028` |
| Ink | `#2D2D2D` / `#1A1A1A` |
| Greys | `#F9F9F9` · `#EFEFF2` · `#E3E3EA` · `#848A98` |
| Danger badge | `#F0412F` |

- Accents for the illustrations only: حواء `#C2456E`, آدم `#3F6C8C`, cream `#FAF6E2`, which matches the artwork.
- Fonts: IBM Plex Sans Arabic for UI and Aref Ruqaa for calligraphy, both self-hosted. محلي uses PingAR LT, which is proprietary.

## Motion
- **Entrances** use محلي's curve `cubic-bezier(.22,1,.36,1)`:
  - `headerIn`: 0.48s, translateY(-10) scale(.94)
  - tab panels: 0.24s
- **Touch** uses physical springs (`smooth`, `snappy`, `bouncy`, `sheet`):
  - pressables and the + → ✓ morph
  - heart pop
  - day and time chips
  - sheet drag with rubber band
- **Search:** the icon rotates 18° on focus, a detail copied from محلي.
- **Clip-path morphs** (ViewOnMap): map pill → full-screen map, mini map → full-screen map.
- **Hero:** the calligraphy swaps with a blur and the page dots stretch.
- **Compositor-only ambient motion:** the barber pole moves its stripes with `transform`, and the mirror sheen runs once. Off-screen cards use `content-visibility: auto`.

Blocking time at 4× CPU throttle: about 200–250ms on home and explore, about 100–200ms elsewhere.
