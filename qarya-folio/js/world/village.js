// STUB — replaced by the village agent. Contract: see ARCHITECTURE.md.
export function createVillage(ctx) {
  const b = new ctx.Builder();
  for (const z of ctx.content.zones) {
    const x = z.landmark.x, zz = z.landmark.z;
    b.box([3, 3, 3], ctx.P.mud, { position: [x, ctx.heightAt(x, zz) + 1.5, zz] });
    ctx.physics.addBox({ size: [3, 3, 3], position: [x, ctx.heightAt(x, zz) + 1.5, zz] });
  }
  ctx.scene.add(b.build());
  return { update() {} };
}
