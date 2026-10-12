# مولو (MoLu): UI redesign prototype

This is a redesign of the **MoLu** salon booking UI (حواء for women's salons, آدم for barbers).

- **Look:** the visual language of **محلي**.
- **Flows:** kept as simple as **Uber Eats**.
- **Motion:** built on the same design system and spring motion as عزيمة (`css/m3.css`, `css/springs.css`, `js/motion.js`, `js/m3.js`).

It is a static prototype. All data is mock data from `js/data.js`, and appointments, favourites and the profile are saved in `localStorage`.

```bash
cd molu && python3 -m http.server 4610      # open http://localhost:4610
node scripts/flow.mjs /tmp/out             # recorded end-to-end booking flow (Playwright)
node scripts/shoot.mjs /tmp/out index.html # screenshots
```

## Screens
| Page | Pattern |
|---|---|
| `index.html` | محلي dark hero: glass location pill, avatar badge, glass search, calligraphy carousel with page dots, featured-salon strip. Below it, **حواء / آدم** appear as محلي's tall promo cards, followed by the next appointment, colourful offer tiles and the owner banner. |
| `explore.html` | Uber Eats feed: one search bar, one row of category shortcuts, carousels (nearest, today's offers, top rated), then every salon. A floating «الخريطة» pill morphs into a full-screen map. |
| `salon.html` | Uber Eats store: cover, logo, one meta line and info pills, a «الأكثر طلباً» row, sticky tabs with scroll-spy, and service rows. Tapping **+** adds a service and brings up a black «اختر الموعد» bar. |
| Booking | **One sheet**: who (optional) · day · time · confirm. The button morphs into a loader, then a success check with confetti and a ticket. |
| `appointments.html` | محلي «الطلبات»: bell with badge, orange chips, cards with black pill actions (manage / rate / re-book). Includes cancel with undo, an `.ics` calendar file, and rating. |
| `categories.html` | محلي side rail with collapsible groups of tiles. Offers use 3D gradient numbers. |
| `offers.html`, `favorites.html`, `account.html`, `business.html` | Offers grid, favourites, sign-in (phone → code → name) and the owner pricing page. |

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
