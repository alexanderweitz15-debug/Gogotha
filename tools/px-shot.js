#!/usr/bin/env node
/* GOLGOTHA — Spielbild: startet einen Lauf, stellt Gegner (und optional einen Boss) um den Spieler und speichert ein Bildschirmfoto.
   Zum Prüfen von Figuren, Böden und Wänden im echten Spielbild (Maßstab, Lesbarkeit, Kanten).
   Aufruf (braucht Playwright):
     node tools/px-shot.js <ausgabe.png> [Figur-Index, 0] [Gegnertypen, kommagetrennt, z. B. chaser,tank] [Boss-Art, z. B. maggot] [Station, 3]
   Der Boss wird festgehalten (kein Angriff, keine Bewegung). Bei Station 11, 21, 31, 41 erscheint die nächste Region (Boden, Wände). Ende mit Fehlercode 1 bei Fehlern im Spiel. */
const { chromium } = require('playwright');
const path = require('path');
const [,, OUT, CHAR, TYPES, BOSS, LVL] = process.argv;
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await pg.waitForTimeout(900);
  await pg.fill('#loginUser', 'shot' + Date.now() % 100000); await pg.fill('#loginPass', 'pw'); await pg.click('#registerBtn'); await pg.waitForSelector('#menu.show');
  await pg.click('#btnStart'); await pg.waitForTimeout(200); await pg.click('.char-card >> nth=' + (+CHAR || 0));
  await pg.click('#diffCards .diff-card >> nth=2'); await pg.click('#modStart'); await pg.waitForTimeout(400);
  await pg.evaluate(([TYPES, BOSS, LVL]) => {
    const lvl = +LVL || 3; Admin.god = true; Admin.noSpawn = true; if (lvl !== G.level) { G.level = lvl - 1; nextLevel(); }
    enemies.length = 0; ebullets.length = 0;
    const p = player, types = (TYPES || 'chaser').split(',').filter(Boolean);
    types.forEach((t, i) => { const a = i / types.length * Math.PI * 2; const e = spawnEnemy(t, p.x + Math.cos(a) * 90, p.y + Math.sin(a) * 70, lvl); e.speed = 0; e.fireCd = 1e9; });
    if (BOSS) { G.level = Math.max(5, BOSS_KINDS.indexOf(BOSS) * 5 + 5); const e = spawnBoss(G.level); e.bossKind = BOSS; e.x = p.x; e.y = p.y - 140; e.speed = 0; e.atkCd = 1e9;
      window.updateBoss = (b, dt) => { b.spin = (b.spin || 0) + dt; b.moveT = (b.moveT || 0) + dt; };   // Boss bleibt stehen, nur Drehung und Animation laufen
    }
  }, [TYPES, BOSS, LVL]);
  await pg.waitForTimeout(900);
  await pg.locator('#game').screenshot({ path: OUT });
  await b.close();
  console.log('→ ' + OUT); if (errs.length) { console.error('Fehler im Spiel:', errs); process.exit(1); }
})();
