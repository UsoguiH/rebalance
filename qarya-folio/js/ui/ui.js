// STUB — replaced by the UI agent. Contract: see ARCHITECTURE.md.
export function createUI(ctx) {
  const bar = document.getElementById('load-bar');
  let resolveReady;
  const readyP = new Promise((r) => { resolveReady = r; });
  return {
    setProgress(k) {
      if (bar) bar.style.width = `${Math.round(k * 100)}%`;
      if (k >= 1) {
        const l = document.getElementById('loader');
        l?.addEventListener('click', () => { l.remove(); resolveReady(); }, { once: true });
        addEventListener('keydown', () => { l?.remove(); resolveReady(); }, { once: true });
      }
    },
    ready: () => readyP,
    update() {},
  };
}
