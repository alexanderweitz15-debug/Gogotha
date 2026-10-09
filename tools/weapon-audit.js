#!/usr/bin/env node
/* GOLGOTHA — Waffen-Funktionsprüfung
   Leitet aus der Definition jeder Waffe ab, was sie können muss, und prüft im Spiel, ob es passiert:
   Treffer, Geschosszahl, Durchschlag, Brand, Verlangsamung, Gift, Pfützen/Wolken, Kettenblitz, Explosion,
   Abprallen, Hochdrehen, Ansteckung/Entzünden, Strahl, Geschütz/Totem/Mine/Begleiter/Ratten.
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
      const p = makePlayer('penitent', 'solo'); p.weapons = [wid]; p.wCd = [0]; p.wLevel = {}; if (lvl > 1) p.wLevel[wid] = lvl - 1;
      recalcClasses(p); p.invuln = 1e9; p.crit = 0; p.x = 600; p.y = WORLD.h / 2; players = [p]; player = p;
      enemies = []; bullets = []; ebullets = []; puddles = []; deployables = []; beams = []; pickups = []; bolts = []; novaRings = []; G.hazards = []; G.shrine = null;
      G.level = 10; G.time = 0; G.curseHp = 1; G.diff = diffById('medium'); G.modMul = {}; G.run = { kills: 0, gold: 0, weaponKills: {}, bossKinds: {}, dmg: {}, id: 0 };
      for (const k in spy) delete spy[k]; return p; }
    const dummy = (x, y, hp, r) => { const e = spawnEnemy('chaser', x, y, 10); e.maxHp = e.hp = hp || 1e9; e.speed = 0; e.touch = false; if (r) e.r = r; return e; };
    const step = (n, fire) => { for (let k = 0; k < n; k++) { G.time += dt; G.uiTime += dt; player.invuln = 1e9;
      if (fire) updatePlayer(dt); for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i]) updateEnemy(enemies[i], dt);
      updateDeployables(dt); updateBullets(dt); updatePuddles(dt); } };
    const out = [];
    for (const w of WEAPONS) {
      const exp = [], ok = {}, note = {};
      const proj = !w.deploy && !w.beam;
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
      p = reset(w.id, 10); const line = [0, 1, 2, 3].map(i => dummy(p.x + 140 + i * 60, p.y, 1e9, 13));
      const side = [[-30, 40], [-30, -40], [30, 50], [30, -50]].map(([dx, dy]) => dummy(p.x + 140 + dx, p.y + dy, 1e9, 13));
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
        const hit = row.filter(e => e.hp < e.maxHp).length; exp.push('beamPierce'); ok.beamPierce = hit === Math.min(4, w.pierce + 1); note.beamPierce = hit + '/4'; }
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
      const fails = exp.filter(k => !ok[k]);
      out.push({ id: w.id, name: w.name, rk: w.rk, evo: !!w.evo, checks: exp.length, fails, notes: Object.fromEntries(fails.map(k => [k, note[k]])), all: note });
    }
    // Einzigartigkeit: Mechanik-Signatur
    const bucket = (v, cuts) => cuts.findIndex(c => v <= c);
    const sig = w => [w.deploy ? 'deploy:' + w.deploy : w.beam ? 'beam' : 'proj', w.pattern || 'single', 'n' + bucket(w.count, [1, 3, 6, 99]), 'p' + bucket(w.pierce, [0, 2, 6, 99]),
      'r' + bucket((w.life || 1.8) * (w.spd || 0), [300, 700, 99999]),
      ...['burn', 'slow', 'poison', 'puddle', 'toxcloud', 'frostpool', 'chain', 'explosive', 'bounce', 'ramp', 'contagion', 'ignite'].filter(k => w[k])].join(' ');
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
