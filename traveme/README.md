# Traveme onboarding

A clone of the three-slide onboarding for the "Traveme" travel app, rebuilt from a screen
recording. Everything is drawn live with Three.js: the iridescent suitcase, the helical
kinetic-type ribbons, the packed items and the luggage carousel. There are no image assets.

1. **Welcome to Traveme!** The closed suitcase floats inside a "TRAVEL LIKE NEVER BEFORE" ribbon. The ribbon starts as a tight ring at the top, uncoils down around the case, holds, and then the loop restarts. The lettering is printed on the inside of the ribbon, so it reads normally across the back and mirrored where it passes in front.
2. **Pack The Possibility.** The ribbon spins and collapses away, the case spins a full turn, the lid swings open and the packed items pop out. Titles blur out together and come back line by line.
3. **Let's get ready!** The carousel slides in, the open case rides onto it, the lid shuts as the case turns, and "LET'S GET READY!" uncoils around it. The next button becomes a pink **Get started** pill.

Use Next, Skip, swipe, or the arrow keys. Add `#1` or `#2` to the URL to open on slide 2 or 3.
Phones get the full screen. On wider screens the app sits in a phone frame with a status bar.

## Run

It is a static page, but ES modules need http:

```sh
npx http-server traveme -p 8080   # then visit http://localhost:8080
```

| File | What it does |
|---|---|
| `index.html` | Layout, gradient, copy, dots, buttons, phone frame |
| `app.js` | Slide state, gestures, the 3D scene and its per-slide choreography |
