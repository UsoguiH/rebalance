# Molu onboarding

A three-slide onboarding for [Molu](https://molu-tau.vercel.app/), the salon and barber booking app for
Riyadh, built with the same kinetic-type effect as the Traveme clone in `../traveme`. It uses Molu's
own onboarding copy, colours (`#ff385c` and its rose gradient, ink `#222`) and fonts (Readex Pro for
Arabic, DM Sans for English). Arabic is the default, laid out right to left; the toggle switches to English.

The hero is Molu's low-poly fox mark extruded into a faceted 3D head. Its charcoal half is Adam and its
rose half is Eve, as in the logo.

1. **جمالك وأناقتك… بضغطة / Look your best, in one tap.** The fox floats among salon and barber tools
   inside a helix of text that winds up and unwinds on a loop.
2. **عالمٌ لحواء… وعالمٌ لآدم / A world for Eve, a world for Adam.** The head spins and parts into its
   Adam and Eve halves. The tools gather on each side and "حواء • آدم" winds through the gap.
3. **احجز وأنت مطمّن / Book with total peace of mind.** The halves snap back together, a booking reminder
   drops in, and "بدون اتصالات • بدون انتظار • بدون رسوم" wraps the head. The button turns into Molu's
   gradient "ابدأ الآن".

The ribbon words are signed-distance-field images, one per word so Arabic letters stay joined. In Arabic
the helix winds the other way so the words read right to left. GSAP drives all the motion. SplitText
animates the titles by letter in English and by word in Arabic.

Run it from any static server, for example `npx http-server molu -p 8080`. Add `#1` or `#2` to the URL
to open on slide 2 or 3.
