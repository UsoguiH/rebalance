# Assets: sources, licenses, keys, troubleshooting

## Where things come from

| Need | Script | Source order | Notes |
|---|---|---|---|
| Product logo, colours, fonts, copy, screenshots | `brand_kit.mjs --url` | the product's real website (DOM + computed styles) | Pick the logo from `public/brand/preview.png`; customer/partner logos on the page also appear as candidates, so check the name. |
| Extra product pages | `brand_kit.mjs --pages "/pricing,/features"` | same | Or ask the user for app screenshots / screen recordings (best for apps behind login). |
| Real scrolling footage | `brand_kit.mjs --record` | Playwright video of a smooth scroll | `shots/desktop-scroll.webm`, usable as `src` in device/cards. |
| Other brands' logos | `logos.py "Slack" "Notion" "X=domain.com"` | Simple Icons → Wikidata/Wikimedia Commons → site icon | `--style wordmark` prefers full logos. Always look at `public/logos/preview.png`. |
| Photos | `images.py --query` / `--url` | Unsplash (key) → Pexels (key) → Openverse CC0/BY | Check `public/images/preview.jpg`. Avoid people-photos for claims you can't back. |
| Music | `music.py --search / --file / --elevenlabs / --synth` | Openverse (Jamendo, ccMixter, Freesound; CC0/BY only) | CC BY needs the credit line in the description. `--synth` is original and license-free. |
| Voice | `tts.py` | ElevenLabs → OpenAI → Microsoft Edge neural voices (free) | Edge has Gulf voices: ar-SA, ar-AE, ar-KW, ar-QA, ar-BH, ar-OM. |
| Sound effects | `sfx.py` | generated in code | whoosh, click, pop, tick, riser, impact, shimmer, type |
| Fonts | `fetch_fonts.py` | Google Fonts, stored locally | Brand's own font: put `<Family>.woff2` in `public/fonts/`. |

## Optional keys (environment variables)
- `ELEVENLABS_API_KEY`: best voices (multilingual incl. Arabic) + ElevenLabs Music. `ELEVENLABS_MODEL` to override the model.
- `OPENAI_API_KEY`: gpt-4o-mini-tts voices with tone instructions (`--tone`).
- `UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY`: better stock photos.
Nothing is required: the free path (Edge voices, Openverse music/photos, Simple Icons/Wikimedia logos) works.

## Licensing (tell the user, put it in credits.md)
- Other companies' logos are trademarks: fine to show "works with / trusted by" when true; don't imply endorsement that doesn't exist; customer logos only with the customer's OK.
- CC BY music/photos: credit "Title" by Creator (license) in the video description. CC0 needs nothing.
  ND and SA licenses are excluded by the scripts (syncing to video is an adaptation).
- Edge voices: Microsoft's online read-aloud service; fine for drafts and many uses, but for paid ad
  campaigns prefer ElevenLabs/OpenAI (clear commercial terms) and say so.
- Remotion (the renderer) is free for individuals and companies with up to 3 employees; larger companies
  need a Remotion company license (remotion.pro). Mention it once when delivering.

## Troubleshooting
| Symptom | Fix |
|---|---|
| YouTube: "Sign in to confirm you're not a bot" / Vimeo: "logged-in only" | Common on cloud servers. Search the web for the video title: the same film is often on X, Vimeo, Behance or the maker's site (studio sites often host mp4 previews). Or ask the user for the file or a `cookies.txt` (`--cookies`). |
| Chromium `ERR_CERT_AUTHORITY_INVALID` behind a corporate/sandbox proxy | Import the proxy CA into NSS: `certutil -A -d sql:$HOME/.pki/nssdb -n proxy-ca -t "C,," -i ca.pem` (one cert per call; split bundles). Python: set `SSL_CERT_FILE`. Never disable TLS checks. |
| Fonts look like system fonts | Run `fetch_fonts.py --project P --from-spec`; family names must match Google Fonts exactly. |
| `EncodingError: The source image cannot be decoded` / black device screen | Image too big (> ~40 MP) or broken. brand_kit caps full-page shots; resize others with PIL to ≤ 3000 px wide / ≤ 15 MP. |
| Render slow | `--scale 0.5` for drafts; stills first; close other heavy scenes. 30 s at 1080p ≈ 2-7 min on 4 cores. |
| Voice too long for scene | tts.py stretches the scene automatically; or shorten the line (better). |
| Wikimedia 429 | logos.py backs off and retries; run again later or add `Name=domain`. |
| Logo candidate is a customer logo, not the product | brand_kit lists all logo-ish images; choose by looking at preview.png; `logo-shot.png` is the pixel-exact header logo. |
