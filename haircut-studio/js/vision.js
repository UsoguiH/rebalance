/* On-device vision (MediaPipe), shared by the 3D face and the face lock.
   Loaded lazily from the CDN; everything that uses it works without it. */
(function () {
  const VISION = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
  const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
  const HAIR_MODEL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/1/hair_segmenter.tflite";
  let baseP = null, faceP = null, hairP = null;

  function once(get, set, make) {
    if (!get()) { const p = make(); set(p); p.catch(() => set(null)); }
    return get();
  }
  const base = () => once(() => baseP, (p) => { baseP = p; }, async () => {
    const vision = await import(VISION + "/vision_bundle.mjs");
    return { vision, files: await vision.FilesetResolver.forVisionTasks(VISION + "/wasm") };
  });

  // Up to two faces, so a photo with two people can be caught.
  const landmarker = () => once(() => faceP, (p) => { faceP = p; }, async () => {
    const { vision, files } = await base();
    const lm = await vision.FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: FACE_MODEL }, runningMode: "IMAGE", numFaces: 2,
    });
    return { lm, edges: vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION };
  });

  const hairSegmenter = () => once(() => hairP, (p) => { hairP = p; }, async () => {
    const { vision, files } = await base();
    return vision.ImageSegmenter.createFromOptions(files, {
      baseOptions: { modelAssetPath: HAIR_MODEL }, runningMode: "IMAGE",
      outputCategoryMask: true, outputConfidenceMasks: false,
    });
  });

  // Landmarks of every face in a canvas, in pixels.
  async function faces(canvas) {
    const { lm } = await landmarker();
    const r = lm.detect(canvas);
    return (r.faceLandmarks || []).map((L) => L.map((p) => ({ x: p.x * canvas.width, y: p.y * canvas.height, z: p.z * canvas.width })));
  }

  // Hair mask of a canvas as a canvas of the same size: white, alpha = hair.
  async function hairMask(canvas) {
    const seg = await hairSegmenter();
    const r = seg.segment(canvas);
    const m = r.categoryMask;
    const w = m.width, h = m.height, cat = m.getAsUint8Array();
    const small = document.createElement("canvas");
    small.width = w; small.height = h;
    const g = small.getContext("2d");
    const img = g.createImageData(w, h);
    for (let i = 0; i < cat.length; i++) { img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = cat[i] > 0 ? 255 : 0; }
    g.putImageData(img, 0, 0);
    m.close && m.close();
    const out = document.createElement("canvas");
    out.width = canvas.width; out.height = canvas.height;
    out.getContext("2d").drawImage(small, 0, 0, out.width, out.height);
    return out;
  }

  window.Vision = {
    landmarker, faces, hairMask,
    warm() { landmarker().catch(() => {}); hairSegmenter().catch(() => {}); },
  };
})();
