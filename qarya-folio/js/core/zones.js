// المناطق: circular areas on the ground that open a portfolio section.
// Walk into one → 'zone:enter' (UI shows a prompt); press Enter / tap the
// prompt → 'zone:open' (UI opens the panel). Leaving → 'zone:leave'.
// Standing still inside for a moment also opens it.

export function createZones(ctx) {
  const { events, content, input } = ctx;
  const zones = content.zones;
  let current = null;
  let dwell = 0;
  let opened = false;

  events.on('zone:request-open', () => {
    if (current) open();
  });
  events.on('panel:closed', () => { dwell = -1.5; });

  function open() {
    opened = true;
    events.emit('zone:open', current);
  }

  return {
    zones,
    get current() { return current; },
    update(dt, player) {
      const p = player.position;
      let found = null;
      for (const z of zones) {
        if (Math.hypot(p.x - z.x, p.z - z.z) < z.radius) { found = z; break; }
      }
      if (found !== current) {
        if (current) events.emit('zone:leave', current);
        current = found;
        dwell = 0;
        opened = false;
        if (current) events.emit('zone:enter', current);
      }
      if (current) {
        const still = Math.abs(player.speed) < 0.6;
        dwell = still ? dwell + dt : Math.min(dwell, 0);
        events.emit('zone:progress', { zone: current, progress: Math.max(0, Math.min(1, dwell / 1.2)) });
        if (input.take('interact') && !opened) open();
        else if (dwell > 1.2 && !opened && current.autoOpen !== false) open();
      } else {
        input.take('interact');
      }
    },
  };
}
