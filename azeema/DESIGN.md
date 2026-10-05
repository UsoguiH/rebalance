# DESIGN.md: عزيمة design system

The app follows **Google Material 3** (tokens, components and states) and is laid out like a contemporary Saudi super-app. The look comes from the reference screens:

- a dark immersive product hero with a glass search bar
- a category browser with a side rail
- an orders list with black pill actions
- a floating glass bottom bar

The invitations themselves keep their own art direction (see `public/css/invite.css`).

Files: `public/css/m3.css` (tokens and components) · `public/css/app.css` (screens) · `public/css/guest.css` (guest page).

## Color roles (seed `#EF5A2A`, warm neutral)

| Role | Value | Used for |
|---|---|---|
| `--md-primary` | `#EF5A2A` | Selected chip, active nav icon, filled buttons, badges, slider |
| `--md-primary-container` | `#FFDCCF` | Step numbers, contained loading indicator, welcome banner |
| `--md-surface` | `#F9F5F2` | Page background (warm off-white) |
| `--md-surface-container-lowest` | `#FFFFFF` | Cards |
| `--md-surface-container-low/…/highest` | `#F5F0EC` … `#E5DED9` | Inputs, tonal buttons, unselected chips, segmented track |
| `--md-on-surface` / `-variant` | `#1D1B1A` / `#77716C` | Text / secondary text |
| `--md-inverse-surface` | `#121212` | Black pill actions («إدارة الدعوة»), snackbar |
| `--md-success` | `#2F8A4E` | "Ready" states, confirmed guests |

On the guest page, `--md-primary` is re-mapped to the invitation theme's accent, so every component picks up the invitation's palette automatically.

## Shape and elevation
- Shape scale: `xs 4 · sm 8 · md 12 · lg 16 · xl 28 · full`. Cards use **xl (28px)**, as in the references; chips and buttons use **full**.
- Elevation is soft and warm-tinted (`--md-elev-1…3`). Most surfaces rely on tone, not shadow.

## Typography
IBM Plex Sans Arabic for the UI, using the M3 scale (`display-l`, `headline-l/m/s`, `title-l/m/s`, `body-l/m`, `label-l/m`). **Aref Ruqaa** is the brand and calligraphy voice (logo, hero «دعوتك هديّة», monograms). The app UI uses Western digits, as the reference app does; invitations use Arabic-Indic digits.

## Components in use (Material 3)
| Component | Where |
|---|---|
| **Loading indicator (M3 Expressive)**: a morphing shape (cookie → pentagon → pill → sunny → clover → flower → triangle) that spins | Video rendering, empty states, button loading, map loading, 404 |
| Linear progress (determinate and indeterminate) | Builder step progress, video render % |
| Navigation bar (floating, glass) + **badge** | Home, designs, orders, dashboard |
| Search bar (glass variant on the hero) | Home, designs |
| Filter / assist **chips** | Occasions, order filters, guest filters |
| **Segmented button** with a sliding thumb | Audience (رجال/نساء/عائلي), RSVP yes/no |
| **Switch** (thumb grows on press, check icon) | Builder: البسملة · الآية · الملاحظات |
| **Slider** with a value label | Max companions |
| **Bottom sheet** (drag handle, drag-to-dismiss, rubber-band) | Design details, mobile live preview |
| **Snackbar** | Copy, errors, new RSVP, "video ready" |
| **Menu** | Occasion picker in the hero |
| Extended **FAB** | «معاينة» in the builder |
| Cards (filled / elevated) | Everywhere |
| Skeleton loaders | Orders list |
| Filled / tonal / outlined / text / dark buttons, icon buttons | Everywhere |

## Screens
| Screen | Reference pattern |
|---|---|
| `/` Home | Dark still-life hero (window light, palm, stone, invitations standing like product bottles, oud chips), glass location pill + avatar badge, glass search, calligraphy headline, page dots, occasion "brand strip", horizontal promo cards |
| `/designs` | Category browser: occasion rail on the right, collapsible groups («ناعمة ونباتية · 4 تصاميم») with image tiles, a bottom sheet per design |
| `/orders` | «طلباتي»: bell with badge, filter chips (orange selected), order cards: avatar + title + black pill action, thumbnail + price, divider, status + date |
| `/create` | App bar with step progress, chip and image pickers, filled fields, switches, segmented control, slider, package radio cards, morphing submit button |
| `/host/:slug` | Header with avatar + bell, ExpandDetails card, stat tiles, video card with the loading indicator + progress, share and reminder cards, guest list |
| `/i/:slug` | Envelope cover with a wax seal, the invitation, countdown, **View-on-map morph**, RSVP |
