#!/usr/bin/env node
/* GOLGOTHA — Waffen-Benchmark
   Simuliert jede Waffe unter gleichen Bedingungen und misst den echten Schaden pro Sekunde
   (Overkill zählt nicht, Brand/Gift/Pfützen schon):
     - Welle:      20 Verdammte mit je 600 Leben (damit starke Waffen nicht an den Nachschub stoßen), jagen den Spieler,
                   der im Kreis (r 260 px, 180 px/s) vor ihnen herläuft; getötete werden ersetzt
     - Einzelziel: ein unbewegliches Ziel in Bossgröße (r 36) in 220 px — Einzelziel-Schaden zählt vor allem gegen Bosse.
                   Nahkampf: der Spieler steht so nah, dass er es erreicht (Rand bei 70 % der Reichweite, Kette: Bahn durch die Mitte),
                   und das Ziel wird nach jedem Rückstoß zurückgesetzt — im Spiel läuft der Spieler nach, hier steht er still.
                   In der Welle kitet der Spieler dagegen wie bei allen Waffen — das benachteiligt Nahkampf deutlich.
   jeweils mit Waffenstufe 1 und 10, Figur ohne Boni und Upgrades, ist unverwundbar, Gegner schießen nicht.
   Zufall ist festgelegt (3 Durchläufe mit festen Startwerten, Median), damit vorher/nachher vergleichbar ist.
   Das ist KEIN Ersatz für echte Läufe (Spieler bewegen sich, kombinieren Waffen und Gaben), aber es zeigt,
   welche Waffe im Verhältnis zu ihrer Seltenheit aus der Reihe fällt.

   Aufruf (braucht Playwright):  node tools/balance-bench.js [Sekunden pro Messung, Standard 30]
   Ergebnis: tools/balance-bench.json und eine Tabelle auf der Konsole. Öffnet index.html direkt als Datei,
   legt also keine Konten auf dem Server an. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const SECS = +process.argv[2] || 30;

(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await pg.waitForTimeout(500);
  const rows = await pg.evaluate((SECS) => {
    G.state = 'bench'; Admin.noFire = true;                  // echte Spielschleife ruht, Gegner schießen nicht
    const dt = 1 / 60, ring = 380, rnd0 = Math.random;
    const seeded = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const median = a => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
    function sim(wid, lvl, mode) {
      WORLD = { w: 1820, h: 1180 }; ROOM = { x: 40, y: 40, w: WORLD.w - 80, h: WORLD.h - 80 }; obstacles = [];
      const p = makePlayer('penitent', 'solo'); p.charId = '_neutral'; /* ohne Charakter-Boni */ p.weapons = [wid]; p.wCd = [0]; p.wLevel = {}; if (lvl > 1) p.wLevel[wid] = lvl - 1;
      recalcClasses(p); p.invuln = 1e9; p.x = WORLD.w / 2; p.y = WORLD.h / 2; players = [p]; player = p;
      enemies = []; bullets = []; ebullets = []; puddles = []; deployables = []; beams = []; pickups = []; G.hazards = []; G.shrine = null;
      G.level = 10; G.time = 0; G.curseHp = 1; G.diff = diffById('medium'); G.modMul = {}; G.run = { kills: 0, gold: 0, weaponKills: {}, bossKinds: {}, dmg: {}, id: 0 };
      const spawn = () => { const a = Math.random() * TAU, e = spawnEnemy('chaser', p.x + Math.cos(a) * ring, p.y + Math.sin(a) * ring, 10); e.maxHp = e.hp = 600; return e; };
      let pin = null; if (mode === 'crowd') for (let i = 0; i < 20; i++) spawn();
      else { const mw = weaponById(wid).melee, td = !mw ? 220 : mw.kind === 'orbit' ? meleeReach(p, weaponById(wid)) : Math.min(220, meleeReach(p, weaponById(wid)) * 0.7 + 36);
        const t = spawnEnemy('tank', p.x + td, p.y, 10); t.r = 36; t.maxHp = t.hp = 1e12; t.speed = 0; t.touch = false; if (mw) pin = { t, x: t.x, y: t.y }; }
      let th = 0; if (mode === 'crowd') { p.x = WORLD.w / 2 + 260; p.y = WORLD.h / 2; }
      for (let k = 0; k < SECS / dt; k++) {
        G.time += dt; G.uiTime += dt; p.invuln = 1e9;
        updatePlayer(dt); updateAbilities(dt);
        if (mode === 'crowd') { th += 180 / 260 * dt; p.x = WORLD.w / 2 + Math.cos(th) * 260; p.y = WORLD.h / 2 + Math.sin(th) * 260; p.moving = true; }   // Spieler kitet im Kreis
        for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i]) updateEnemy(enemies[i], dt);
        updateDeployables(dt); updateBullets(dt); updatePuddles(dt); if (pin) { pin.t.x = pin.x; pin.t.y = pin.y; }
        if (mode === 'crowd') while (enemies.length < 20) spawn();
      }
      let d = 0; for (const k in G.run.dmg) d += G.run.dmg[k].d;
      return { dps: d / SECS, kps: G.run.kills / SECS };
    }
    const out = [];
    for (const w of WEAPONS) {
      const r = { id: w.id, name: w.name, rk: w.rk, rank: rarRank(w.rk), evo: !!w.evo, cls: w.cls.join('/'), price: w.evo ? null : RARITY_PRICE[rarRank(w.rk)] };
      for (const lvl of [1, 10]) {
        const runs = [1, 2, 3].map(seed => { Math.random = seeded(seed * 7919); const c = sim(w.id, lvl, 'crowd'); Math.random = seeded(seed * 104729); const s = sim(w.id, lvl, 'single'); return { c, s }; });
        r['crowd' + lvl] = Math.round(median(runs.map(x => x.c.dps))); r['kps' + lvl] = +median(runs.map(x => x.c.kps)).toFixed(2); r['single' + lvl] = Math.round(median(runs.map(x => x.s.dps))); }
      out.push(r);
    }
    Math.random = rnd0; return out;
  }, SECS);
  await b.close();
  /* Vergleich innerhalb der Seltenheit: Faktor gegenüber dem Median der gleichen Stufe (Welle + Einzelziel, Stufe 10) */
  const groups = {};
  for (const r of rows) { const g = r.evo ? 'evo:' + r.rk : r.rk; (groups[g] = groups[g] || []).push(r); }
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  /* Einzelziel-Median ohne Waffen, die ein stehendes Ziel prinzipbedingt nicht treffen (Minen, Totem, Flamme außer Reichweite) */
  for (const g in groups) { const mc = med(groups[g].map(r => r.crowd10)), ms = med(groups[g].map(r => r.single10).filter(v => v > 0));
    for (const r of groups[g]) { r.vsCrowd = mc ? +(r.crowd10 / mc).toFixed(2) : null; r.vsSingle = ms ? +(r.single10 / ms).toFixed(2) : null; } }
  rows.sort((a, b) => (a.evo - b.evo) || (a.rank - b.rank) || (b.crowd10 - a.crowd10));
  fs.writeFileSync(path.resolve(__dirname, 'balance-bench.json'), JSON.stringify({ secs: SECS, date: new Date().toISOString(), rows }, null, 1));
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('Waffe', 24) + pad('Seltenheit', 12) + pad('Welle L1', 9) + pad('Welle L10', 10) + pad('Ziel L1', 9) + pad('Ziel L10', 10) + pad('x Welle', 8) + 'x Ziel');
  for (const r of rows) {
    const flag = (r.vsCrowd >= 1.6 || r.vsSingle >= 1.6) ? '  ▲ stark' : (r.vsCrowd <= 0.6 && r.vsSingle <= 0.6) ? '  ▼ schwach' : '';
    console.log(pad(r.name, 24) + pad((r.evo ? '*' : '') + r.rk, 12) + pad(r.crowd1, 9) + pad(r.crowd10, 10) + pad(r.single1, 9) + pad(r.single10, 10) + pad(r.vsCrowd, 8) + r.vsSingle + flag);
  }
  if (errs.length) { console.error('Fehler im Spiel:', errs); process.exit(1); }
})();
