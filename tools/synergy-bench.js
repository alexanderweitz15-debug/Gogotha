#!/usr/bin/env node
/* GOLGOTHA — Duo-Segen-Benchmark
   Je Duo eine passende Ausrüstung (2 Waffen aus Klasse A, 2 aus Klasse B, Stufe 5) und der Schaden pro Sekunde
   mit und ohne das Duo, gleiche Bedingungen wie balance-bench.js (Welle mit kitendem Spieler, Einzelziel),
   3 feste Zufallsfolgen, Median. Zeigt, wie viel ein Duo-Segen gegenüber seinem Fehlen bringt.
   Aufruf (braucht Playwright):  node tools/synergy-bench.js [Sekunden, Standard 30] [Leben der Wellengegner, Standard 150] */
const { chromium } = require('playwright');
const path = require('path');
const SECS = +process.argv[2] || 30, HP = +process.argv[3] || 150;   // Leben der Wellengegner: im Spiel ~60 (Station 10) bis ~225 (Station 50)

(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await pg.waitForTimeout(900);
  const rows = await pg.evaluate(([SECS, HP]) => {
    G.state = 'bench'; Admin.noFire = true;
    const dt = 1 / 60, ring = 380;
    const seeded = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const median = a => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
    const shopW = WEAPONS.filter(w => !w.evo && !w.beam);
    /* zwei Waffen je Klasse, möglichst ohne die andere Klasse des Duos; „nahkampf“ = Nahkampfwaffen */
    function pickFor(c, other, used) {
      const has = w => c === 'nahkampf' ? !!w.melee : w.cls.includes(c) && !w.melee;
      const pool = shopW.filter(w => has(w) && !used.has(w.id)).sort((x, y) => (x.cls.includes(other) - y.cls.includes(other)) || (rarRank(x.rk) - rarRank(y.rk)));
      return pool.slice(0, 2).map(w => w.id); }
    function sim(weps, duo, mode) {
      WORLD = { w: 1820, h: 1180 }; ROOM = { x: 40, y: 40, w: WORLD.w - 80, h: WORLD.h - 80 }; obstacles = [];
      const p = makePlayer('penitent', 'solo'); p.charId = '_neutral'; p.weapons = weps.slice(); p.wCd = weps.map(() => 0); p.wLevel = {}; for (const w of weps) p.wLevel[w] = 4;
      recalcClasses(p); p.invuln = 1e9; p.x = WORLD.w / 2; p.y = WORLD.h / 2; players = [p]; player = p;
      if (duo) giveDuo(p, duo);
      enemies = []; bullets = []; ebullets = []; puddles = []; deployables = []; beams = []; pickups = []; G.hazards = []; G.shrine = null;
      G.level = 10; G.time = 0; G.curseHp = 1; G.diff = diffById('medium'); G.modMul = {}; G.run = { kills: 0, gold: 0, weaponKills: {}, bossKinds: {}, dmg: {}, id: 0 };
      const spawn = () => { const a = Math.random() * TAU, e = spawnEnemy('chaser', p.x + Math.cos(a) * ring, p.y + Math.sin(a) * ring, 10); e.maxHp = e.hp = HP; return e; };
      let pin = null; if (mode === 'crowd') for (let i = 0; i < 20; i++) spawn();
      else { const t = spawnEnemy('tank', p.x + 110, p.y, 10); t.r = 36; t.maxHp = t.hp = 1e12; t.speed = 0; t.touch = false; pin = { t, x: t.x, y: t.y }; }
      let th = 0; if (mode === 'crowd') { p.x = WORLD.w / 2 + 260; p.y = WORLD.h / 2; }
      for (let k = 0; k < SECS / dt; k++) {
        G.time += dt; G.uiTime += dt; p.invuln = 1e9;
        updatePlayer(dt); updateAbilities(dt);
        if (mode === 'crowd') { th += 180 / 260 * dt; p.x = WORLD.w / 2 + Math.cos(th) * 260; p.y = WORLD.h / 2 + Math.sin(th) * 260; p.moving = true; }
        for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i]) updateEnemy(enemies[i], dt);
        updateDeployables(dt); updateBullets(dt); updatePuddles(dt); if (pin) { pin.t.x = pin.x; pin.t.y = pin.y; }
        if (mode === 'crowd') while (enemies.length < 20) spawn();
      }
      let d = 0; for (const k in G.run.dmg) d += G.run.dmg[k].d;
      return d / SECS;
    }
    const out = [];
    for (const d of DUOS) {
      const used = new Set(), A = pickFor(d.a, d.b, used); A.forEach(x => used.add(x)); const B = pickFor(d.b, d.a, used); const weps = A.concat(B);
      const r = { id: d.id, name: d.name, cls: d.a + '+' + d.b, weapons: weps.map(id => weaponById(id).name).join(', ') };
      for (const mode of ['crowd', 'single']) for (const on of [false, true]) {
        r[mode + (on ? 'On' : 'Off')] = Math.round(median([1, 2, 3].map(s => { Math.random = seeded(s * 7919 + (mode === 'single' ? 31 : 0)); return sim(weps, on ? d.id : null, mode); }))); }
      out.push(r);
    }
    return out;
  }, [SECS, HP]);
  await b.close();
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('Duo', 20) + pad('Klassen', 18) + pad('Welle ohne→mit', 18) + pad('x', 7) + pad('Ziel ohne→mit', 17) + pad('x', 7) + 'Ausrüstung');
  for (const r of rows) console.log(pad(r.name, 20) + pad(r.cls, 18) + pad(r.crowdOff + '→' + r.crowdOn, 18) + pad((r.crowdOn / r.crowdOff).toFixed(2), 7) +
    pad(r.singleOff + '→' + r.singleOn, 17) + pad((r.singleOn / r.singleOff).toFixed(2), 7) + r.weapons);
  if (errs.length) { console.error('Fehler im Spiel:', errs); process.exit(1); }
})();
