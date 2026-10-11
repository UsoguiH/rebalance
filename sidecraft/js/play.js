// Gameplay rules: mining and placing, using blocks and items, combat,
// mob spawning and furnaces.
(function () {
  const SC = window.SC;
  const B = SC.B, I = SC.I;
  const blocks = SC.blocks;
  const G = SC.game;
  const REACH = 5.2;

  // ---------- breaking and placing ----------
  function breakTime(id, held, wall) {
    const d = blocks[id];
    if (d.hard < 0) return -1;
    if (G.creative) return 0.12;
    if (d.hard === 0) return 0.05;
    const it = held && SC.items[held.id];
    let speed = 1;
    if (it && it.tool && it.tool === d.tool) speed = it.speed;
    if (it && it.tool === 'sword' && (id === B.LEAVES || id === B.SPRUCE_LEAVES)) speed = 1.5;
    const ok = canHarvest(id, held);
    let t = (d.hard * (ok ? 1.5 : 5)) / speed;
    if (!G.player.onGround && !G.player.onLadder) t *= 2;
    if (G.player.headInWater) t *= 2;
    if (wall) t *= 0.75;
    return t;
  }
  function canHarvest(id, held) {
    const d = blocks[id];
    if (d.tier < 0) return true;
    const it = held && SC.items[held.id];
    return !!(it && it.tool === 'pick' && it.tier >= d.tier);
  }
  function rayTarget(x0, y0, x1, y1, maxD) {
    const w = G.world;
    let dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const mtx = Math.floor(x1), mty = Math.floor(y1);
    const pick = (tx, ty) => {
      const id = w.get(tx, ty);
      if (!id || blocks[id].fluid || !w.inb(tx, ty)) return false;
      if (tx === mtx && ty === mty) return true;
      return w.solid(tx, ty);
    };
    if (len < 1e-6) return pick(mtx, mty) ? { x: mtx, y: mty } : null;
    dx /= len;
    dy /= len;
    const end = Math.min(len, maxD);
    let tx = Math.floor(x0), ty = Math.floor(y0);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const tdx = dx ? 1 / Math.abs(dx) : Infinity, tdy = dy ? 1 / Math.abs(dy) : Infinity;
    let tmx = dx ? (dx > 0 ? tx + 1 - x0 : x0 - tx) * tdx : Infinity;
    let tmy = dy ? (dy > 0 ? ty + 1 - y0 : y0 - ty) * tdy : Infinity;
    let t = 0;
    let first = true;
    while (t <= end) {
      if (!(first && w.solid(tx, ty) && !(tx === mtx && ty === mty))) if (pick(tx, ty)) return { x: tx, y: ty };
      first = false;
      if (tmx < tmy) {
        t = tmx;
        tmx += tdx;
        tx += sx;
      } else {
        t = tmy;
        tmy += tdy;
        ty += sy;
      }
    }
    return null;
  }
  function entityBlocks(tx, ty) {
    const all = [G.player, ...G.entities];
    for (const e of all) {
      if (!e || e.dead || e.kind === 'item' || e.kind === 'arrow' || e.kind === 'falling') continue;
      if (e.overlapsTile(tx, ty)) return true;
    }
    return false;
  }
  function hasAnchor(tx, ty) {
    const w = G.world;
    if (w.getBg(tx, ty)) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const id = w.get(tx + dx, ty + dy);
      if (id && !blocks[id].fluid) return true;
    }
    return false;
  }

  function useBlock(tx, ty) {
    const w = G.world;
    const id = w.get(tx, ty);
    const use = blocks[id].use;
    const i = w.idx(tx, ty);
    const held = G.player.held();
    switch (use) {
      case 'craft':
        SC.ui.open('craft');
        return true;
      case 'chest': {
        let c = w.containers.get(i);
        if (!c) w.containers.set(i, (c = { type: 'chest', items: new Array(27).fill(null) }));
        SC.ui.open('chest', { c });
        SC.audio.play('door', { v: 0.6 });
        return true;
      }
      case 'furnace': {
        let c = w.containers.get(i);
        if (!c) w.containers.set(i, (c = { type: 'furnace', slots: [null, null, null], burn: 0, burnMax: 0, cook: 0 }));
        SC.ui.open('furnace', { c });
        return true;
      }
      case 'door': {
        const isTop = id === B.DOOR_T || id === B.DOOR_TO;
        const by = isTop ? ty + 1 : ty;
        const open = w.get(tx, by) === B.DOOR_B;
        w.fg[w.idx(tx, by)] = open ? B.DOOR_BO : B.DOOR_B;
        w.fg[w.idx(tx, by - 1)] = open ? B.DOOR_TO : B.DOOR_T;
        SC.audio.at('door', tx, ty);
        return true;
      }
      case 'bed': {
        if (!G.isNight()) {
          G.actionBar('You can only sleep at night');
          G.player.spawn = { x: tx, y: ty };
          return true;
        }
        G.player.spawn = { x: tx, y: ty };
        const near = G.entities.some((e) => e instanceof SC.Mob && e.def.hostile && Math.hypot(e.x - tx, e.y - ty) < 9);
        if (near) {
          G.actionBar('You may not rest now; there are monsters nearby');
          return true;
        }
        G.sleepT = 2.2;
        G.chat('Respawn point set');
        return true;
      }
      case 'tnt':
        if (held && SC.items[held.id].block) return false;
        w.set(tx, ty, 0);
        G.entities.push(new SC.PrimedTNT(tx, ty, 4));
        SC.audio.at('fuse', tx, ty);
        return true;
    }
    return false;
  }

  function placeHeld(tx, ty, wallMode) {
    const w = G.world;
    const p = G.player;
    const s = p.held();
    if (!s) return false;
    const it = SC.items[s.id];
    if (it.place === 'door') {
      if (!w.open(tx, ty) || !w.open(tx, ty - 1) || !w.solid(tx, ty + 1)) return false;
      if (entityBlocks(tx, ty) || entityBlocks(tx, ty - 1)) return false;
      // write the top half first without updates so the pair supports itself
      const top = w.idx(tx, ty - 1);
      w.fg[top] = B.DOOR_T;
      w.meta[top] = 0;
      w.set(tx, ty, B.DOOR_B);
      p.consumeHeld();
      SC.audio.at('place', tx, ty, { mat: 'wood' });
      return true;
    }
    const id = it.place;
    if (id === null || id === undefined || !it.block) return false;
    const d = blocks[id];
    if (wallMode) {
      if (!d.wall || w.getBg(tx, ty)) return false;
      let ok = blocks[w.get(tx, ty)].solid;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (w.getBg(tx + dx, ty + dy) || w.solid(tx + dx, ty + dy)) ok = true;
      if (!ok) return false;
      w.setBg(tx, ty, id);
      p.consumeHeld();
      SC.audio.at('place', tx, ty, { mat: d.sound });
      return true;
    }
    if (!w.open(tx, ty)) return false;
    const cur = w.get(tx, ty);
    if (blocks[cur].fluid && (d.support === 'torch' || d.support === 'plant')) return false;
    if (d.solid && entityBlocks(tx, ty)) return false;
    if (d.support && !w.supported(tx, ty, id)) return false;
    if (!d.support && !hasAnchor(tx, ty)) return false;
    w.set(tx, ty, id);
    if (cur === B.LAVA || cur === B.WATER) w.activateAround(tx, ty);
    p.consumeHeld();
    SC.audio.at('place', tx, ty, { mat: d.sound });
    return true;
  }

  function useItem(tx, ty, reachOk) {
    const w = G.world;
    const p = G.player;
    const s = p.held();
    if (!s) return false;
    const it = SC.items[s.id];
    if (!reachOk) return false;
    const fill = (newId) => {
      if (G.creative) return;
      if (s.n > 1) {
        s.n--;
        const left = p.give(newId, 1);
        if (left) G.dropItem(p.x, p.y - 1, newId, 1);
      } else p.inv[p.sel] = { id: newId, n: 1, d: 0 };
    };
    if (s.id === I.BUCKET) {
      const f = w.get(tx, ty);
      if (f === B.WATER || f === B.LAVA) {
        w.set(tx, ty, 0);
        fill(f === B.WATER ? I.WATER_BUCKET : I.LAVA_BUCKET);
        SC.audio.at('splash', tx, ty);
        return true;
      }
      return false;
    }
    if (s.id === I.WATER_BUCKET || s.id === I.LAVA_BUCKET) {
      if (!w.open(tx, ty)) return false;
      const fid = s.id === I.WATER_BUCKET ? B.WATER : B.LAVA;
      const cur = w.get(tx, ty);
      if (cur && !blocks[cur].fluid) w.breakBlock(tx, ty, true);
      w.set(tx, ty, fid, 8);
      if (!G.creative) p.inv[p.sel] = { id: I.BUCKET, n: 1, d: 0 };
      SC.audio.at('splash', tx, ty);
      return true;
    }
    if (s.id === I.BONE_MEAL) {
      const id = w.get(tx, ty);
      if (id === B.SAPLING) {
        if (Math.random() < 0.45) w.growTree(tx, ty, G.world.surfaceBiome(tx) === 'snow' ? 'spruce' : 'oak', Math.random);
        p.consumeHeld();
        SC.puff(tx + 0.5, ty + 0.5, 6, [120, 220, 120]);
        return true;
      }
      if (id === B.GRASS) {
        for (let k = 0; k < 8; k++) {
          const x = tx + Math.floor((Math.random() - 0.5) * 7);
          for (let y = ty - 3; y <= ty + 3; y++)
            if (w.get(x, y) === B.GRASS && w.get(x, y - 1) === 0) {
              const r = Math.random();
              w.set(x, y - 1, r < 0.15 ? B.ROSE : r < 0.3 ? B.DANDELION : B.TALL_GRASS);
              break;
            }
        }
        p.consumeHeld();
        SC.puff(tx + 0.5, ty, 8, [120, 220, 120]);
        return true;
      }
    }
    return false;
  }

  function interact(dt) {
    const inp = SC.input;
    const p = G.player;
    const w = G.world;
    const [mx, my] = SC.renderer.toWorld(inp.mx, inp.my, G.cam);
    G.mouseW = [mx, my];
    const ex = p.x, ey = p.eyeY();
    const reach = G.creative ? 9 : REACH;
    const shift = SC.key('sneak');
    const held = p.held();
    const it = held && SC.items[held.id];
    // a click can start and end between two frames, so count presses too
    const lmb = SC.key('attack') || SC.keyPressed('attack'), rmb = SC.key('use') || SC.keyPressed('use');
    const rHeld = SC.key('use');

    // mob under the cursor?
    let mob = null;
    for (const e of G.entities) {
      if (!(e instanceof SC.Mob) || e.dead) continue;
      if (mx > e.x - e.w / 2 - 0.15 && mx < e.x + e.w / 2 + 0.15 && my > e.y - e.h - 0.15 && my < e.y + 0.1 && Math.hypot(e.x - ex, e.y - e.h / 2 - ey) < reach - 1) mob = e;
    }
    G.hoverMob = mob;

    // what would we mine?
    const mtx = Math.floor(mx), mty = Math.floor(my);
    const mdist = Math.hypot(mtx + 0.5 - ex, mty + 0.5 - ey);
    let tgt = null;
    if (shift && !it?.food) {
      const fid = w.get(mtx, mty);
      if (mdist <= reach + 0.5 && w.getBg(mtx, mty) && (!fid || blocks[fid].fluid)) tgt = { x: mtx, y: mty, wall: true };
    } else {
      const r = rayTarget(ex, ey, mx, my, reach);
      if (r) tgt = r;
    }
    G.target = mob ? null : tgt;
    const reachOk = mdist <= reach + 0.5;
    G.placeAt = reachOk ? { x: mtx, y: mty } : null;

    // face where we are working
    const busy = lmb || rmb || p.bowT > 0;
    p.faceMouse = busy ? Math.sign(mx - p.x) || p.facing : 0;

    // ---- left button: attack or mine ----
    if (lmb && !p.dead) {
      if (mob) {
        p.mine = null;
        if (p.attackCd <= 0) {
          let dmg = it && it.dmg ? it.dmg : 1;
          if (p.vy > 1 && !p.onGround) dmg = Math.floor(dmg * 1.5);
          if (mob.damage(dmg, { x: p.x, kb: p.sprint ? 10 : 7, by: 'player' }, 'player')) G.stat('damageDealt', dmg);
          p.attackCd = it && it.tool === 'sword' ? 0.45 : 0.6;
          p.swing = 1;
          p.exhaust(0.1);
          if (it && it.dur) p.wearHeld(it.tool === 'sword' ? 1 : 2);
          SC.audio.at('hurt', mob.x, mob.y, { v: 0.4 });
        }
      } else if (tgt) {
        const id = tgt.wall ? w.getBg(tgt.x, tgt.y) : w.get(tgt.x, tgt.y);
        if (!p.mine || p.mine.x !== tgt.x || p.mine.y !== tgt.y || p.mine.wall !== !!tgt.wall || p.mine.id !== id) p.mine = { x: tgt.x, y: tgt.y, wall: !!tgt.wall, id, p: 0, snd: 0 };
        const m = p.mine;
        p.mineCd = (p.mineCd || 0) - dt;
        const t = breakTime(id, held, m.wall);
        if (t >= 0 && p.mineCd <= 0) {
          m.p += t > 0 ? dt / t : 1;
          m.snd -= dt;
          if (p.swing < 0.2) p.swing = 1;
          if (m.snd <= 0) {
            m.snd = 0.22;
            SC.audio.at('dig', tgt.x + 0.5, tgt.y + 0.5, { mat: blocks[id].sound });
            SC.debris(tgt.x, tgt.y, id, 2, 0.6);
          }
          if (m.p >= 1) {
            const ok = canHarvest(id, held) && !G.creative;
            SC.audio.at('break', tgt.x + 0.5, tgt.y + 0.5, { mat: blocks[id].sound });
            if (m.wall) {
              w.setBg(tgt.x, tgt.y, 0);
              SC.debris(tgt.x, tgt.y, id, 8);
              if (ok) G.dropItem(tgt.x + 0.5, tgt.y + 0.5, id, 1);
              w.checkSupport(tgt.x, tgt.y);
            } else {
              w.breakBlock(tgt.x, tgt.y, ok);
              if (ok && id === B.COAL_ORE) SC.dropXP(tgt.x + 0.5, tgt.y + 0.5, Math.floor(Math.random() * 3));
              if (ok && id === B.DIAMOND_ORE) SC.dropXP(tgt.x + 0.5, tgt.y + 0.5, 3 + Math.floor(Math.random() * 5));
            }
            G.statMap('mined', id, 1);
            if (blocks[id].hard > 0) p.wearHeld(it && it.tool === 'sword' ? 2 : 1);
            p.exhaust(0.005);
            p.mine = null;
            p.mineCd = G.creative ? 0.15 : 0.12;
          }
        }
      } else p.mine = null;
    } else p.mine = null;

    // ---- right button: use, eat, draw bow, place ----
    if (it && it.food && rmb && (p.food < 20 || G.creative)) {
      p.eatT += dt;
      if (Math.floor(p.eatT * 5) !== Math.floor((p.eatT - dt) * 5)) {
        SC.audio.at('eat', p.x, p.y);
        SC.debris(p.x + p.facing * 0.4 - 0.5, p.y - 1.9, held.id, 1, 0.3);
      }
      if (p.eatT >= 1.6) {
        p.food = Math.min(20, p.food + it.food[0]);
        p.sat = Math.min(p.food, p.sat + it.food[1]);
        p.consumeHeld();
        p.eatT = 0;
        SC.audio.at('burp', p.x, p.y);
      }
    } else p.eatT = 0;

    if (held && held.id === I.BOW) {
      if (rHeld && (G.creative || p.count(I.ARROW) > 0)) p.bowT = Math.min(1.2, p.bowT + dt);
      else if (!rHeld && p.bowT > 0) {
        const f = Math.min(1, p.bowT);
        if (f > 0.15) {
          const ang = Math.atan2(my - ey, mx - ex);
          const sp = 10 + 22 * f;
          G.entities.push(new SC.Arrow(p, ex + Math.cos(ang) * 0.6, ey + Math.sin(ang) * 0.6, Math.cos(ang) * sp, Math.sin(ang) * sp, Math.round(1 + 8 * f)));
          SC.audio.at('bow', p.x, p.y);
          if (!G.creative) p.take(I.ARROW, 1);
          p.wearHeld(1);
        }
        p.bowT = 0;
      }
    } else p.bowT = 0;

    if (rmb && p.useCd <= 0 && !p.dead && !(it && it.food) && !(held && held.id === I.BOW)) {
      let done = false;
      if (reachOk && !shift && blocks[w.get(mtx, mty)].use) done = useBlock(mtx, mty);
      if (!done) done = useItem(mtx, mty, reachOk);
      if (!done && it && it.armor !== undefined) {
        // right click with armor puts it on (swapping what was worn)
        const cur = p.armor[it.armor];
        p.armor[it.armor] = held;
        p.inv[p.sel] = cur;
        SC.audio.at('place', p.x, p.y, { mat: 'stone', v: 0.5 });
        done = true;
      }
      if (!done && reachOk && !mob) done = placeHeld(mtx, mty, shift);
      // the offhand places blocks when the main hand has nothing to do
      if (!done && reachOk && !mob && p.offhand && SC.items[p.offhand.id].place != null && !(it && it.place != null)) {
        const keep = p.inv[p.sel];
        p.inv[p.sel] = p.off[0];
        done = placeHeld(mtx, mty, shift);
        p.off[0] = p.inv[p.sel];
        p.inv[p.sel] = keep;
      }
      if (done) {
        p.swing = 1;
        p.useCd = 0.22;
      }
    }

    // ---- middle click: pick block ----
    if (SC.keyPressed('pick')) {
      const t = G.target && !G.target.wall ? G.target : null;
      let id = t ? w.get(t.x, t.y) : 0;
      if (id === B.DOOR_B || id === B.DOOR_T || id === B.DOOR_BO || id === B.DOOR_TO) id = I.DOOR;
      else if (id === B.FURNACE_LIT) id = B.FURNACE;
      if (id && SC.items[id] && (SC.items[id].place != null || id === I.DOOR)) {
        const hot = p.inv.findIndex((s, i) => i < 9 && s && s.id === id);
        if (hot >= 0) p.sel = hot;
        else if (G.creative) {
          const empty = p.inv.findIndex((s, i) => i < 9 && !s);
          if (empty >= 0) p.sel = empty;
          p.inv[p.sel] = { id, n: 1, d: 0 };
        } else {
          const k = p.inv.findIndex((s) => s && s.id === id);
          if (k >= 0) {
            const tmp = p.inv[p.sel];
            p.inv[p.sel] = p.inv[k];
            p.inv[k] = tmp;
          }
        }
      }
    }
  }

  // ---------- mob spawning ----------
  function spawnMobs(dt) {
    G.spawnT -= dt;
    if (G.spawnT > 0) return;
    G.spawnT = 1;
    const p = G.player;
    const w = G.world;
    let hostile = 0, passive = 0;
    for (const e of G.entities) {
      if (!(e instanceof SC.Mob)) continue;
      const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
      if (e.def.hostile) {
        if (d > 80) e.dead = true;
        else hostile++;
      } else {
        if (d > 140) e.dead = true;
        else passive++;
      }
    }
    const dayF = G.dayFactor();
    if (G.difficulty > 0 && hostile < 3 + G.difficulty && Math.random() < 0.5) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = Math.floor(p.x + side * (24 + Math.random() * 26));
      const y0 = Math.floor(p.y - 25 + Math.random() * 50);
      for (let y = y0; y < y0 + 20; y++) {
        if (!w.inb(x, y + 1)) break;
        if (w.solid(x, y + 1) && !w.solid(x, y) && !w.solid(x, y - 1) && !w.fluidAt(x + 0.5, y + 0.5) && !w.fluidAt(x + 0.5, y - 0.5)) {
          const ground = w.get(x, y + 1);
          if (ground === B.BEDROCK || blocks[ground].tree) break;
          if (w.approxLight(x, y, dayF) <= 7) {
            const r = Math.random();
            G.entities.push(new SC.Mob(r < 0.42 ? 'zombie' : r < 0.72 ? 'skeleton' : 'creeper', x + 0.5, y + 1));
          }
          break;
        }
      }
    }
    if (passive < 6 && dayF > 0.6 && Math.random() < 0.08) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = Math.floor(p.x + side * (22 + Math.random() * 40));
      if (w.inb(x, 0)) {
        const y = w.topSolid(x);
        if (w.get(x, y) === B.GRASS && !w.solid(x, y - 1) && !w.solid(x, y - 2)) {
          const kind = Math.random() < 0.5 ? 'pig' : 'sheep';
          const n = 1 + Math.floor(Math.random() * 3);
          for (let k = 0; k < n; k++) G.entities.push(new SC.Mob(kind, x + 0.5 + k * 0.3, y));
        }
      }
    }
  }

  // ---------- furnaces ----------
  function tickFurnaces(dt) {
    const w = G.world;
    for (const [i, c] of w.containers) {
      if (c.type !== 'furnace') continue;
      const [inp, fuel, out] = c.slots;
      const res = inp ? SC.smelt[inp.id] : undefined;
      const can = res !== undefined && (!out || (out.id === res && out.n < SC.maxStack(res)));
      if (c.burn > 0) c.burn -= dt;
      if (c.burn <= 0 && can && fuel && SC.fuelTime(fuel.id)) {
        c.burn = c.burnMax = SC.fuelTime(fuel.id) * (SC.SMELT_TIME / 10);
        if (fuel.id === I.LAVA_BUCKET) c.slots[1] = { id: I.BUCKET, n: 1, d: 0 };
        else {
          fuel.n--;
          if (!fuel.n) c.slots[1] = null;
        }
      }
      if (c.burn > 0 && can) {
        c.cook += dt;
        if (c.cook >= SC.SMELT_TIME) {
          c.cook = 0;
          if (c.slots[2]) c.slots[2].n++;
          else c.slots[2] = { id: res, n: 1, d: 0 };
          c.xp = (c.xp || 0) + (res === I.GOLD_INGOT || res === I.DIAMOND ? 1 : res === I.IRON_INGOT ? 0.7 : SC.items[res].food ? 0.35 : 0.1);
          inp.n--;
          if (!inp.n) c.slots[0] = null;
        }
      } else c.cook = Math.max(0, c.cook - dt * 2);
      const lit = c.burn > 0;
      const id = w.fg[i];
      if (lit && id === B.FURNACE) w.fg[i] = B.FURNACE_LIT;
      else if (!lit && id === B.FURNACE_LIT) w.fg[i] = B.FURNACE;
    }
  }


  SC.play = { interact, spawnMobs, tickFurnaces };
})();
