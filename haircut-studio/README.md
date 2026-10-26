# Try a New Look

A barbershop try-on app. The customer takes a selfie, taps one of **50 haircuts** or
**50 beards**, and Gemini shows them with that style. Each style is shown with a real
photo of someone wearing it (from Unsplash), and that photo is also sent to Gemini as the
style reference. The result can be turned with a finger (front, left, back, right), and while
the AI works the customer can spin a 3D dot model of their own face.

Big buttons, few screens, few words: it is built for people who are not used to apps.

## The flow

1. **Let's see you**: a 3-2-1 countdown takes the photo, or "Use a picture" uploads one.
2. **Pick a style**: switch between Haircut and Beard. Tap a photo and it drops into the
   orange card at the bottom. One haircut and one beard can be combined.
3. **Making it**: elapsed time, progress, short status lines, and a 3D model of their
   face (MediaPipe face mesh) that they can drag around. **Stop** cancels.
4. **Your new look**: drag sideways to turn the head. "Hold to see before" shows the
   original photo while held. **I like it** opens a "Show this to your barber" card with
   the style names and a Save button. **Done, next customer** clears everything.

## Run it

It is a static site with no build step. Camera access needs `https://` or `localhost`:

```sh
cd haircut-studio
python3 -m http.server 8080      # or: npx http-server -p 8080
# open http://localhost:8080
```

For a shop tablet, host the folder on any static host with HTTPS (Vercel, Netlify,
GitHub Pages) and use "Add to Home Screen".

## Gemini API key (staff only)

**Press and hold the top-left button for 2 seconds** to open Staff settings:

- **Gemini API key**: get one at <https://aistudio.google.com/apikey>. It is stored only
  in this browser (`localStorage`).
- **Image model**: Nano Banana 2.1 by default. If a model is not available to your key,
  the app falls back through the others automatically.
- **Make side & back views**: on by default. This makes 3 extra images per try (about 4×
  the cost) so the result can be turned. Turn it off to make only the front view.

The key is used straight from the browser, so anyone with access to the device could read
it. That is fine for a shop tablet you control. For a public website, put a small proxy in
front of the Gemini API and keep the key on the server.

## Files

| Path | What it is |
|---|---|
| `index.html`, `css/app.css` | The four screens and the components (black stadiums, gray cards, orange accent) |
| `js/app.js` | Screens, camera, picking, the turnable result, settings |
| `js/gemini.js` | Prompts and Gemini calls (`generateContent`, falling back to the Interactions API) |
| `js/face3d.js` | The 3D face dot cloud |
| `js/styles.js` | The 100 styles with their photo links and Gemini descriptions (generated) |
| `credits.html` | Photographer and license for every photo (also linked from Staff settings) |
| `tools/` | Scripts used to find, pick and build the reference photos |

## The reference photos

All 100 are real photos from [Unsplash](https://unsplash.com), free to use under the
[Unsplash License](https://unsplash.com/license), including commercially. Each one was
picked by hand from the search results for its style. As the Unsplash API terms require,
the app loads them straight from Unsplash's image servers (cropped around the face) rather
than copying them, and every photographer is credited in `credits.html`. So the app needs an
internet connection, which it already does for Gemini.

The tools can also use Wikimedia Commons or Openverse photos (those are cropped into
`assets/styles/`), but for these styles their results were much weaker.

To swap a photo (you need a free Unsplash Access Key only for this, not for the app):

```sh
cd haircut-studio/tools
export UNSPLASH_KEY=...                                  # unsplash.com/developers -> Your apps
python3 find_unsplash.py /tmp/cands <style-id>           # search; query from unsplash_queries.json
MAX=16 TW=160 python3 make_sheets.py /tmp/cands 8 4 <style-id>   # numbered sheet in /tmp/cands/sheets
# set "<style-id>": "u7" in picks.json (or "other-style:u7" to borrow another style's photo,
# or ["u7", "focalpoint&fp-y=.3"] to change the crop)
python3 build_assets.py /tmp/cands                       # rebuilds js/styles.js and credits.html
```

The style names and the description sent to Gemini live in `tools/styles.json` and
`tools/descriptions.json`.
