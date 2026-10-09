#!/usr/bin/env node
/* GOLGOTHA — Waffen-Funktionsprüfung
   Leitet aus der Definition jeder Waffe ab, was sie können muss, und prüft im Spiel, ob es passiert:
   Treffer, Geschosszahl, Durchschlag, Brand, Verlangsamung, Gift, Pfützen/Wolken, Kettenblitz, Explosion,
   Abprallen, Hochdrehen, Ansteckung/Entzünden, Strahl, Geschütz/Totem/Mine/Begleiter/Ratten,
   Nahkampf (trifft im Bogen, nicht dahinter, Reichweite, Trefferzone = gezeichnete Fläche, Besonderheit, Zusammenspiel mit Boni).
   Danach Gruppen von Waffen mit gleicher Mechanik (Einzigartigkeit).
   Aufruf (braucht Playwright):  node tools/weapon-audit.js   → Konsole + tools/weapon-audit.json */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');

(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await pg.waitForTimeout(500);
  const res = await pg.evaluate(() => {
    G.state = 'audit'; Admin.noFire = true;
    const dt = 1 / 60, rnd0 = Math.random;
    const seeded = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    // Spione auf Effekt-Funktionen
    const spy = {}; for (const fn of ['chainLightning', 'explodeBullet', 'deployShoot', 'doDeployNova', 'deployMineExplode', 'spreadOnDeath']) {
      const orig = window[fn]; window[fn] = function () { spy[fn] = (spy[fn] || 0) + 1; return orig.apply(this, arguments); }; }
    function reset(wid, lvl) {
      Math.random = seeded(4242);
      WORLD = { w: 1820, h: 1180 }; ROOM = { x: 40, y: 40, w: WORLD.w - 80, h: WORLD.h - 80 }; obstacles = [];
      const p = makePlayer('penitent', 'solo'); p.charId = '_neutral'; /* ohne Charakter-Boni */ p.weapons = [wid]; p.wCd = [0]; p.wLevel = {}; if (lvl > 1) p.wLevel[wid] = lvl - 1;
      recalcClasses(p); p.invuln = 1e9; p.crit = 0; p.x = 600; p.y = WORLD.h / 2; players = [p]; player = p;
      enemies = []; bullets = []; ebullets = []; puddles = []; deployables = []; beams = []; pickups = []; bolts = []; novaRings = []; G.hazards = []; G.shrine = null;
      G.level = 10; G.time = 0; G.curseHp = 1; G.diff = diffById('medium'); G.modMul = {}; G.run = { kills: 0, gold: 0, weaponKills: {}, bossKinds: {}, dmg: {}, id: 0 };
      for (const k in spy) delete spy[k]; return p; }
    const dummy = (x, y, hp, r) => { const e = spawnEnemy('chaser', x, y, 10); e.maxHp = e.hp = hp || 1e9; e.speed = 0; e.touch = false; if (r) e.r = r; return e; };
    const step = (n, fire) => { for (let k = 0; k < n; k++) { G.time += dt; G.uiTime += dt; player.invuln = 1e9;
      if (fire) updatePlayer(dt); for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i]) updateEnemy(enemies[i], dt);
      updateDeployables(dt); updateBullets(dt); updatePuddles(dt); } };
    /* ---------- Nahkampf ---------- */
    const spyFn = name => { const o = window[name]; let n = 0; window[name] = function () { n++; return o.apply(this, arguments); }; return { n: () => n, off: () => { window[name] = o; } }; };
    function meleeChecks(w, exp, ok, note) {
      const m = w.melee, orbit = m.kind === 'orbit', ex = (k, v, n) => { exp.push(k); ok[k] = !!v; if (n != null) note[k] = n; };
      const rev = Math.ceil(TAU / (m.spin || 1) / dt) + 4;
      const swing = (ang) => { if (!orbit) fireWeapon(weaponById(w.id), ang || 0); step(orbit ? rev : 40, false); };
      /* Schaden des ersten Treffers (vor Brand-/Gift-Ticks) */
      const hitOnce = (e, ang) => { const h0 = e.hp; if (!orbit) fireWeapon(weaponById(w.id), ang || 0); for (let k = 0; k < rev + 40 && e.hp === h0; k++) step(1, false); return h0 - e.hp; };
      const hit = e => e.hp < e.maxHp || !enemies.includes(e);
      /* Boss-Dummy: Schlund (bewegt sich nicht); Ausweich-Zustand verhindert sein Ansaugen */
      const boss = e => { Object.assign(e, { isBoss: true, bossKind: 'maw', pullT: 0, burstN: 0, atkCd: 1e9, spin: 0, moveT: 0 }); player.dashTime = 1e9; return e; };
      let p = reset(w.id, 1); const R = meleeReach(p, w), er = 13, at = (d, a) => dummy(p.x + Math.cos(a || 0) * d, p.y + Math.sin(a || 0) * d, 1e9, er);
      // Bogen / Reichweite (ohne Kettenblitz, der sonst Nachbarziele trifft)
      const chain0 = w.chain; w.chain = false;
      if (orbit) { const a = at(R), i = at(R * 0.4, 2), o = at(R + m.ball + er + 6, 4); swing();
        ex('ringHit', hit(a)); ex('chainInner', hit(i)); ex('ringNotOuter', !hit(o)); }
      else {
        p = reset(w.id, 1); const f = at(R * 0.6); swing(); ex('front', hit(f));
        p = reset(w.id, 1); const f2 = at(R * 0.5), bk = at(R * 0.6, Math.PI); swing(); if (m.kind === 'slam') ex('ringAround', hit(f2) && hit(bk)); else ex('notBehind', hit(f2) && !hit(bk));
        p = reset(w.id, 1); const ein = at(R + er - 3); swing(); ex('reachIn', hit(ein), Math.round(R) + ' px');
        p = reset(w.id, 1); const f3 = at(R * 0.4, 0.3), eout = at(R + er + 6); swing(); ex('reachOut', hit(f3) && !hit(eout));
      }
      w.chain = chain0;
      // Trefferzone = gezeichnete Fläche: zufällige Ziele, unabhängig per Stichproben gegen die Werte, aus denen drawMelee zeichnet
      { p = reset(w.id, 1); const sv = { chain: w.chain, kb: w.kb, pierce: w.pierce, burn: w.burn, slow: w.slow, poison: w.poison }, mh = m.maxHits; Object.assign(w, { chain: false, kb: 0, pierce: 99, burn: false, slow: false, poison: false }); delete m.maxHits;
        const rr = 8, ds = [at(orbit ? R : R * 0.5)]; for (let k = 0; k < 50; k++) ds.push(dummy(p.x + (Math.random() * 2 - 1) * (R * 1.3), p.y + (Math.random() * 2 - 1) * (R * 1.3), 1e9, rr));
        const pos = ds.map(e => [e.x, e.y, e.r]); let sw = null;
        if (orbit) { const st = (p._orb && p._orb[w.id]); const a0 = st ? st.ang : null; swing(); sw = p._orb[w.id]; sw._a0 = a0; }
        else { fireWeapon(w, 0); sw = meleeFx[meleeFx.length - 1]; step(40, false); }
        Object.assign(w, sv); if (mh) m.maxHits = mh;
        let pts = [];
        if (!sw) pts = null;
        else if (m.kind === 'arc') { const lo = Math.min(sw.a0, sw.cur), hi = Math.max(sw.a0, sw.cur); for (let r = 0; r <= sw.R; r += 1) for (let a = lo; a <= hi; a += 0.6 / Math.max(r, 1)) pts.push([p.x + Math.cos(a) * r, p.y + Math.sin(a) * r]); }
        else if (m.kind === 'stab') { for (let s = 0; s <= Math.max(0, sw.len - sw.wd); s += 1) for (let a = 0; a < TAU; a += 0.2) for (const q of [0.5, 1]) pts.push([p.x + s + Math.cos(a) * sw.wd * q, p.y + Math.sin(a) * sw.wd * q]); }
        else if (m.kind === 'slam') { for (let r = 0; r <= sw.rr; r += 1) for (let a = 0; a < TAU; a += 0.6 / Math.max(r, 1)) pts.push([p.x + Math.cos(a) * r, p.y + Math.sin(a) * r]); }
        else { for (let a = 0; a < TAU; a += 0.01) { for (let s = 0; s <= sw.R; s += 1) for (const q of [-1, 0, 1]) pts.push([p.x + Math.cos(a) * s - Math.sin(a) * q * sw.cw, p.y + Math.sin(a) * s + Math.cos(a) * q * sw.cw]); } for (let a = 0; a < TAU; a += 0.01) for (let r = 0; r <= sw.br; r += 1) for (let b = 0; b < TAU; b += 0.6 / Math.max(r, 1)) pts.push([p.x + Math.cos(a) * sw.R + Math.cos(b) * r, p.y + Math.sin(a) * sw.R + Math.sin(b) * r]); }
        let bad = 0, n = 0;
        if (pts) ds.forEach((e, i) => { const [x, y, r] = pos[i]; let md = 1e9; for (const q of pts) { const d = Math.hypot(q[0] - x, q[1] - y); if (d < md) md = d; }
          if (Math.abs(md - r) < 2) return; n++; if ((md < r) !== hit(e)) bad++; });
        ex('zone', pts && n > 20 && !bad, bad + ' falsch von ' + n); }
      // Besonderheit
      p = reset(w.id, 1);
      if (m.maxHits) { const ds = [0, 1, 2, 3].map(i => at(R * 0.6, (i - 1.5) * 0.15)); swing(); const nh = ds.filter(hit).length; ex('maxHits', nh === m.maxHits, nh + '/' + m.maxHits); p = reset(w.id, 1); }
      if (m.sp === 'lash') { const e = at(R * 0.5), hp0 = p.hp, d = [hitOnce(e), hitOnce(e), hitOnce(e)]; ex('lash', d[2] > d[0] * 1.9 && p.hp === hp0 - 1, d.map(Math.round).join('/') + ' LP ' + (hp0 - p.hp)); }
      if (m.sp === 'blood') { const d1 = hitOnce(at(R * 0.5)); p = reset(w.id, 1); p.hp = p.maxHP * 0.2; const d2 = hitOnce(at(R * 0.5)); ex('blood', Math.abs(d2 / d1 - 1.8) < 0.02, (d2 / d1).toFixed(2) + '×'); }
      if (m.sp === 'burnkb') { const a = at(R * 0.5); const x0 = a.x; swing(); const k1 = a.x - x0; p = reset(w.id, 1); const b2 = at(R * 0.5); applyBurn(b2, 1, w.id, p); const x1 = b2.x; swing(); const k2 = b2.x - x1;
        ex('burnKnock', k2 > k1 * 1.9, k1.toFixed(1) + '→' + k2.toFixed(1) + ' px');
        p = reset(w.id, 1); const row = [0, 1, 2, 3].map(i => at(R * 0.3 + i * R * 0.2)); swing(); const nh = row.filter(hit).length; ex('pierce', nh === w.pierce + 1, nh + '/' + (w.pierce + 1)); }
      if (m.sp === 'speed') { const r1 = meleeReach(p, w); p.speed *= 1.5; const r2 = meleeReach(p, w); ex('speedRadius', Math.abs(r2 / r1 - 1.5) < 0.01, Math.round(r1) + '→' + Math.round(r2)); }
      if (m.sp === 'stun') { const e = at(R * 0.5), bo = boss(at(R * 0.5, Math.PI)); hitOnce(e); ex('stun', e.rootT > 0 && hit(bo) && !(bo.rootT > 0) && bo.slowT > 0); }
      if (m.sp === 'exec') { const d = meleeDmg(p, w); const e = at(R * 0.5), bo = at(R * 0.5, 1.2); for (const x of [e, bo]) { x.maxHp = 1e6; x.hp = x.maxHp * 0.12 + d; } boss(bo); const bh = bo.hp;
        swing(0); ex('execute', !enemies.includes(e) && e.hp <= 0 && bo.hp > 0 && bo.hp < bh); }
      if (m.sp === 'souls') { p.hp = 50; const ds = []; for (let k = 0; k < 10; k++) ds.push(dummy(p.x + R * (0.3 + 0.05 * k), p.y + (k - 5) * 6, 1, 8)); swing(0);
        ex('souls', ds.every(e => !enemies.includes(e)) && p.hp >= 55.9 && (p.graveSouls || 0) === 0, 'LP ' + Math.round(p.hp)); }
      // Zusammenspiel mit Figur, Klassen, Krit, Gaben, Lebensraub, Hinrichtung, Messung
      const place = () => at(orbit ? R : R * 0.5);
      p = reset(w.id, 1); const base = hitOnce(place());
      p = reset(w.id, 1); p.charId = 'executioner'; const close = hitOnce(place()); ex('charClose', Math.abs(close / base - 1.35) < 0.01, (close / base).toFixed(2) + '×');
      p = reset(w.id, 1); p.crit = 1; const cr = hitOnce(place()); ex('crit', Math.abs(cr / base - p.critMult) < 0.01, (cr / base).toFixed(2) + '×');
      p = reset(w.id, 1); addClsDmg(p, w.cls[0], 0.1); const ci = hitOnce(place()); ex('classItem', Math.abs(ci / base - 1.1) < 0.01, (ci / base).toFixed(2) + '×');
      p = reset(w.id, 1); p.burn = true; p.slow = true; p.explosive = true; const sx = spyFn('explodeBullet'); const e1 = place(); hitOnce(e1); sx.off();
      ex('gifts', e1.burnT > 0 && e1.slowT > 0 && sx.n() > 0);
      p = reset(w.id, 1); p.lifesteal = 5; p.hp = 50; const weak = place(); weak.maxHp = weak.hp = 1; hitOnce(weak);
      ex('lifesteal', p.hp >= 55, 'LP ' + Math.round(p.hp));
      ex('tracked', (G.run.dmg[w.id] || {}).d > 0 && G.run.weaponKills[w.id] === 1);
      p = reset(w.id, 1); p.execPct = 0.5; const ee = place(); ee.maxHp = 1e6; ee.hp = 0.5e6 + meleeDmg(p, w) * 0.5; hitOnce(ee);
      ex('execPct', !enemies.includes(ee));
    }
    const out = [];
    for (const w of WEAPONS) {
      const exp = [], ok = {}, note = {};
      const proj = !w.deploy && !w.beam && !w.strike && !w.melee;
      // 1) Salve: Anzahl, Effektliste, Reichweite
      let p = reset(w.id, 1);
      if (proj) { fireWeapon(w, 0); const n = bullets.length; exp.push('count'); ok.count = n === w.count; note.count = n + '/' + w.count;
        const x0 = p.x, life = w.life || 1.8; let far = 0; for (let k = 0; k < 240 && bullets.length; k++) { updateBullets(dt); for (const bb of bullets) far = Math.max(far, Math.abs(bb.x - x0)); }
        exp.push('range'); const want = Math.min(w.spd * life, ROOM.x + ROOM.w - x0); ok.range = far > want * 0.7 && far < want * 1.15 + 20; note.range = Math.round(far) + '≈' + Math.round(want); }
      // 2) Durchschlag: eine Salve gegen 6 Gegner in einer Reihe
      if (proj && !w.bounce && !w.chain && !w.explosive && !w.toxcloud && !w.frostpool && (w.count % 2 === 1)) {
        // ohne Streuung (sonst verfehlt ein Einzelschuss die Reihe zufällig) und die Reihe innerhalb der Reichweite
        p = reset(w.id, 1); const reach = (w.life || 1.8) * w.spd, x0 = Math.min(110, reach * 0.3), gap = Math.min(55, (reach * 0.9 - x0) / 5);
        const line = [0, 1, 2, 3, 4, 5].map(i => dummy(p.x + x0 + i * gap, p.y, 1e9, 13));
        fireWeapon(Object.assign({}, w, { spread: 0 }), 0); step(150, false); const hit = line.filter(e => e.hp < e.maxHp).length, want = Math.min(6, w.pierce + 1);
        exp.push('pierce'); ok.pierce = hit === want; note.pierce = hit + '/' + want; }
      // 3) Wirkung im Kampf: 4 s feuern auf Reihe + Gruppe
      p = reset(w.id, 10); const D = w.melee ? (w.melee.kind === 'orbit' ? meleeReach(p, w) : meleeReach(p, w) * 0.5) : 140, S = w.melee ? 0.3 : 1;   // Nahkampf: Ziele in Reichweite
      const line = [0, 1, 2, 3].map(i => dummy(p.x + D + i * 60 * S, p.y, 1e9, 13));
      const side = [[-30, 40], [-30, -40], [30, 50], [30, -50]].map(([dx, dy]) => dummy(p.x + D + dx * S, p.y + dy * S, 1e9, 13));
      const all = line.concat(side); const seen = { burn: 0, slow: 0, poison: 0, toxin: 0, chill: 0, ppoison: 0, fire: 0, root: 0, beams: 0, deployed: {} };
      for (let k = 0; k < 240; k++) { step(1, true);
        for (const e of all) { if (e.burnT > 0) seen.burn = 1; if (e.slowT > 0) seen.slow = 1; if (e.poisonStacks > 0) seen.poison = 1; }
        for (const pu of puddles) if (!pu.hostile) seen[pu.effect === 'poison' ? 'ppoison' : pu.effect] = 1;
        if (beams.length) seen.beams = 1; for (const d of deployables) seen.deployed[d.kind] = (seen.deployed[d.kind] || 0) + 1; }
      const dmg = all.reduce((s, e) => s + (e.maxHp - e.hp), 0);
      if (w.deploy !== 'mine') { exp.push('hits'); ok.hits = dmg > 0; note.hits = Math.round(dmg); }   // Minen: stillstehende Ziele laufen nicht hinein → Prüfung 4
      if (w.burn) { exp.push('burn'); ok.burn = !!seen.burn; } if (w.slow) { exp.push('slow'); ok.slow = !!seen.slow; }
      if (w.poison) { exp.push('poison'); ok.poison = !!seen.poison; } if (w.puddle) { exp.push('puddle'); ok.puddle = !!seen.ppoison; }
      if (w.toxcloud) { exp.push('toxcloud'); ok.toxcloud = !!seen.toxin; } if (w.frostpool) { exp.push('frostpool'); ok.frostpool = !!seen.chill; }
      if (w.chain) { exp.push('chain'); ok.chain = (spy.chainLightning || 0) > 0; } if (w.explosive && !w.deploy) { exp.push('explosive'); ok.explosive = (spy.explodeBullet || 0) > 0; }
      if (w.beam) { exp.push('beam'); ok.beam = !!seen.beams; }
      if (w.deploy) { exp.push('deploy:' + w.deploy); ok['deploy:' + w.deploy] = !!seen.deployed[w.deploy];
        if (w.deploy === 'turret' || w.deploy === 'companion') { exp.push('deployShoots'); ok.deployShoots = (spy.deployShoot || 0) > 0; }
        if (w.deploy === 'totem') { exp.push('totemNova'); ok.totemNova = (spy.doDeployNova || 0) > 0; } }
      // 4) Mine: Gegner läuft hinein
      if (w.deploy === 'mine') { p = reset(w.id, 1); deployFromWeapon(w); const d = deployables[0]; const e = spawnEnemy('chaser', d.x + 200, d.y, 10); e.maxHp = e.hp = 1e9; step(240, false);
        exp.push('mineBlast'); ok.mineBlast = (spy.deployMineExplode || 0) > 0 && e.hp < e.maxHp; }
      // 4b) Strahl: durchdringt eine Reihe (ohne nähere Seitenziele, auf die er sonst zielt)
      if (w.beam) { p = reset(w.id, 1); const row = [0, 1, 2, 3].map(i => dummy(p.x + 140 + i * 60, p.y, 1e9, 13)); step(120, true);
        const hit = row.filter(e => e.hp < e.maxHp).length; exp.push('beamPierce'); ok.beamPierce = hit === Math.min(4, w.pierce + 1 + clsB(p, 'eisen', 'pierce')); note.beamPierce = hit + '/4'; }
      // 4c) Eigenheiten
      if (w.strike) { p = reset(w.id, 1); const ds = [0, 1, 2].map(i => dummy(p.x + 150 + i * 70, p.y + (i - 1) * 60, 1e9, 13)); obstacles = [{ x: p.x + 70, y: p.y, r: 40 }];
        fireWeapon(w, 0); const hit = ds.filter(e => e.hp < e.maxHp).length; exp.push('strike'); ok.strike = hit >= 1 + (w.chain ? 1 : 0); note.strike = hit + ' getroffen'; }
      if (w.hex) { p = reset(w.id, 1); const e = dummy(p.x + 150, p.y); const hits = [];
        for (let k = 0; k < 5; k++) { const h0 = e.hp; const nb = { id: 1e6 + k, x: e.x - 20, y: e.y, vx: 600, vy: 0, dmg: 10, r: 5, pierce: 0, life: 1, kb: 0, fx: bulletFx(w, p), owner: p, depth: 0, wid: w.id, hitIds: new Set() };
          bullets.push(nb); step(3, false); hits.push(h0 - e.hp); }
        exp.push('hex'); ok.hex = hits[4] > hits[0] * 2; note.hex = hits.map(Math.round).join('/'); }
      if (w.nail) { p = reset(w.id, 1); const e = dummy(p.x + 150, p.y);
        for (let k = 0; k < 8; k++) { bullets.push({ id: 2e6 + k, x: e.x - 20, y: e.y, vx: 600, vy: 0, dmg: 1, r: 3, pierce: 0, life: 1, kb: 0, fx: bulletFx(w, p), owner: p, depth: 0, wid: w.id, hitIds: new Set() }); step(3, false); }
        exp.push('nail'); ok.nail = e.rootT > 0; }
      if (w.rail) { p = reset(w.id, 1); obstacles = [{ x: p.x + 80, y: p.y, r: 30 }]; const row = [0, 1, 2].map(i => dummy(p.x + 200 + i * 60, p.y, 1e9, 13));
        fireWeapon(w, 0); step(60, false); const dm = row.map(e => e.maxHp - e.hp); exp.push('rail'); ok.rail = dm[0] > 0 && dm[2] > dm[0] * 1.3; note.rail = dm.map(Math.round).join('/'); }
      if (w.verdict) { p = reset(w.id, 1); const e = dummy(p.x + 150, p.y, 1000); e.hp = 300; const b2 = dummy(p.x + 150, p.y + 300, 1000); b2.hp = 300; b2.isBoss = true;
        fireWeapon(w, 0); fireWeapon(w, Math.atan2(300, 150)); step(60, false); exp.push('verdict'); ok.verdict = e.hp <= 0 && !enemies.includes(e) && b2.hp > 0; }
      // 5) Begleiter folgt dem Besitzer
      if (w.deploy === 'companion') { p = reset(w.id, 1); deployFromWeapon(w); p.x += 400; step(120, false); const d = deployables[0];
        exp.push('follows'); ok.follows = Math.hypot(d.x - p.x, d.y - p.y) < 90; }
      // 6) Ratten laufen zum Ziel und vergiften
      if (w.deploy === 'rat') { p = reset(w.id, 1); const e = dummy(p.x + 250, p.y); deployFromWeapon(w); exp.push('ratCount'); ok.ratCount = deployables.length === w.count; step(150, false);
        exp.push('ratBite'); ok.ratBite = e.hp < e.maxHp && e.poisonStacks > 0; }
      // 7) Hochdrehen (Gatling)
      if (w.ramp) { p = reset(w.id, 1); dummy(p.x + 200, p.y); const shots = []; const fw = window.fireWeapon; window.fireWeapon = function (ww, a) { shots.push(G.time); return fw.apply(this, arguments); };
        step(180, true); window.fireWeapon = fw; const d0 = shots[1] - shots[0], d1 = shots[shots.length - 1] - shots[shots.length - 2];
        exp.push('ramp'); ok.ramp = d1 < d0 * 0.75; note.ramp = (d0 * 1000).toFixed(0) + '→' + (d1 * 1000).toFixed(0) + 'ms'; }
      // 8) Abprallen
      if (w.bounce) { p = reset(w.id, 1); const ds = [[90, 0], [90, 110], [-30, 140], [-110, 40], [-130, -80], [0, -150]].map(([dx, dy]) => dummy(p.x + dx, p.y - 200 + dy, 1e9, 13));
        fireWeapon(w, Math.atan2(-200, 90)); step(150, false); const hit = ds.filter(e => e.hp < e.maxHp).length;
        exp.push('bounce'); ok.bounce = hit === Math.min(ds.length, w.bounce + 1); note.bounce = hit + '/' + (w.bounce + 1);
        if (w.bounceGrow) { const dm = ds.filter(e => e.hp < e.maxHp).map(e => e.maxHp - e.hp); exp.push('bounceGrow'); ok.bounceGrow = dm.length > 1 && Math.max(...dm) > Math.min(...dm) * 1.1; } }
      // 9) Ansteckung (Gift) / Entzünden (Brand) beim Tod
      if (w.contagion || w.ignite) { p = reset(w.id, 1); const chainN = (w.contagion ? (w.contagionMax || 1) : 1) + 1;
        const row = [0, 1, 2, 3, 4].map(i => dummy(p.x + 100 + i * 60, p.y, i ? 1e9 : 5, 13));
        if (w.contagion) applyPoison(row[0], 5, w.id, p, true); else applyBurn(row[0], 5, w.id, p);
        damageEnemy(row[0], 99, 0, 0, false, w.id, p);
        if (w.contagion) { for (let g = 1; g < row.length; g++) { if (!(row[g].poisonStacks > 0)) break; row[g].hp = 1; damageEnemy(row[g], 99, 0, 0, false, w.id, p); }
          const gens = row.filter(e => e.poisonGen > 0).length; exp.push('contagion'); ok.contagion = gens === (w.contagionMax || 1); note.contagion = gens + ' Gen.'; }
        else { const lit = row.slice(1).filter(e => e.burnT > 0).length; exp.push('ignite'); ok.ignite = lit === (w.igniteN || 1); note.ignite = lit + ' angesteckt'; } }
      if (w.melee) meleeChecks(w, exp, ok, note);
      const fails = exp.filter(k => !ok[k]);
      out.push({ id: w.id, name: w.name, rk: w.rk, evo: !!w.evo, checks: exp.length, fails, notes: Object.fromEntries(fails.map(k => [k, note[k]])), all: note });
    }
    // Einzigartigkeit: Mechanik-Signatur
    const bucket = (v, cuts) => cuts.findIndex(c => v <= c);
    const sig = w => [w.melee ? 'melee:' + w.melee.kind + ':' + w.melee.sp : w.deploy ? 'deploy:' + w.deploy : w.beam ? 'beam' : w.strike ? 'strike' : 'proj', w.pattern || 'single', 'n' + bucket(w.count, [1, 3, 6, 99]), 'p' + bucket(w.pierce, [0, 2, 6, 99]),
      'r' + bucket((w.life || 1.8) * (w.spd || 0), [300, 700, 99999]),
      ...['burn', 'slow', 'poison', 'puddle', 'toxcloud', 'frostpool', 'chain', 'explosive', 'bounce', 'ramp', 'contagion', 'ignite', 'hex', 'nail', 'rail', 'verdict', 'strike'].filter(k => w[k])].join(' ');
    const groups = {}; for (const w of WEAPONS) (groups[sig(w)] = groups[sig(w)] || []).push(w.name + (w.evo ? '*' : ''));
    Math.random = rnd0;
    return { weapons: out, sameMechanic: Object.entries(groups).filter(([, v]) => v.length > 1).map(([k, v]) => ({ signature: k, weapons: v })) };
  });
  await b.close();
  fs.writeFileSync(path.resolve(__dirname, 'weapon-audit.json'), JSON.stringify(res, null, 1));
  let bad = 0;
  for (const w of res.weapons) { const st = w.fails.length ? '✗ ' + w.fails.map(f => f + (w.notes[f] ? '(' + w.notes[f] + ')' : '')).join(', ') : '✓';
    if (w.fails.length) bad++; console.log((w.name + (w.evo ? '*' : '')).padEnd(24) + String(w.checks).padEnd(4) + st); }
  console.log('\n' + (res.weapons.length - bad) + '/' + res.weapons.length + ' Waffen bestehen alle Prüfungen.\n\nGleiche Mechanik (Signatur → Waffen):');
  for (const g of res.sameMechanic) console.log('  ' + g.weapons.join(', ') + '   [' + g.signature + ']');
  if (errs.length) { console.error('Fehler im Spiel:', errs); process.exit(1); }
})();
