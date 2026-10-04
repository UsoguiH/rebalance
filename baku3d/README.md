# Baku Madarame — 3D

Open `index.html` (serve the folder: `npx http-server baku3d`). Drag to orbit, scroll to zoom, "Reference view" resets.

**index.html — 3D reconstruction of the panel.** The panel (speech boxes/icon removed with LaMa inpainting) is
projection-mapped onto a height-field mesh built from a Depth Anything V2 depth map plus artwork-driven micro-relief,
with baked normals for real lighting. The mesh is displaced along rays from the reference camera, so the default view is
pixel-identical to the panel (same face, pose, colours) while orbiting shows true volume/parallax. Stretched cells across depth
cliffs are dropped and a backdrop layer shows through. Orbit is limited (~±43° yaw) because only one view exists.
Rebuild assets with `tools/lama_clean.py`, `tools/run2.py`, `tools/build_assets.py` (needs onnxruntime + the ONNX models).

**model.html — the earlier fully procedural Three.js model** (hand-sculpted body/head, ink shader), kept for reference.
