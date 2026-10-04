# Baku Madarame — 3D (Usogui)

`index.html` is a **free-standing, fully rotatable 3D object** of Baku Madarame in the pose of the panel
("The Kings are the top authority"). Serve the folder (`npx http-server baku3d`) and open it.
Drag to rotate, scroll to zoom, **Reference view** returns to the panel's angle, **Download .glb** exports the model
(a pre-built copy is in `baku_madarame.glb`: base mesh with vertex colours + front shell textured with the panel + pedestal).

## How it is built
1. `tools/clean`/`lama_clean.py` – speech boxes and the camera icon are removed from the panel with LaMa inpainting.
2. `tools/infer.py` – TripoSR (single-image → 3D, CPU) reconstructs the seated figure (figure-only cut-out, 352³ marching cubes).
3. `tools/post.py`, `tools/orient.py` – axis fix (found by silhouette IoU against the input), Taubin smoothing, winding fix.
4. `tools/calib.py` – 2D similarity that registers the panel to the reconstruction camera (IoU 0.96).
5. `object.js` – projects the panel onto every surface that faces the original camera and is not occluded (depth pass),
   fades it out toward the silhouette, and fills the unseen sides/back with the nearest projected rim colours (white suit, hair).
   Adds the pedestal, plaque and a throne backdrop that fades as you walk around.

Other viewers: `relief.html` (depth-relief that is pixel-identical to the panel from the front, limited orbit) and
`model.html` (the earlier fully procedural model).

## Honest limits
Only one view of the character exists, so the back and sides are inferred (shape from the neural model, colours from the front rim).
The shape is lumpy/low-detail compared with a hand-sculpted model, and the face is a painting projected onto a smooth head,
so it only looks right from roughly the front half-space.
