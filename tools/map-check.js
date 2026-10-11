#!/usr/bin/env node
/* GOLGOTHA — Vorlagen-Prüfung: baut je Region viele Räume über buildMap und zählt, wie oft die erste Wahl die Prüfung
   (mapCheck) besteht und wie oft auf buildObstacles zurückgefallen wird; dazu je Vorlage die Ablehnungsgründe.
   Aufruf (braucht Playwright):  node tools/map-check.js [Räume je Region, 200] [Kartenmaßstab, 1]
   Ende mit Fehlercode 1 bei Fehlern im Spiel oder beim Vorzeichnen. */
const { chromium } = require('playwright');
const path = require('path');
const N = +process.argv[2] || 200, MS = +process.argv[3] || 1;
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await pg.waitForTimeout(900);
  await pg.fill('#loginUser', 'mc' + Date.now() % 100000); await pg.fill('#loginPass', 'pw'); await pg.click('#registerBtn'); await pg.waitForSelector('#menu.show');
  await pg.click('#btnStart'); await pg.waitForTimeout(200); await pg.click('.char-card >> nth=0');
  await pg.click('#diffCards .diff-card >> nth=2'); await pg.click('#modStart'); await pg.waitForTimeout(300);
  const res = await pg.evaluate(([N, MS]) => {
    Admin.noSpawn = true; G.modMapScale = MS; const out = [], over = {}; out.over = over;
    for (let ri = 0; ri < 5; ri++) {
      const r = { region: ri, rooms: 0, first: 0, scatter: 0, tries: 0, boss: { rooms: 0, first: 0, scatter: 0 }, tpl: {} };
      for (let k = 0; k < N; k++) {
        const boss = k % 4 === 3, lvl = ri * 10 + (boss ? pick([5, 10]) : pick([1, 2, 3, 4, 6, 7, 8, 9]));
        setWorld(lvl); player.x = WORLD.w / 2; player.y = WORLD.h - 160;
        buildMap(lvl, REGIONS[ri]);
        if (k % 8 === 0) for (const g of MAP.groups) { if (!g.img) continue;   /* Überstand: deckende Bildpunkte jenseits des nächsten Kreisrands */
          const W = g.img.width, H = g.img.height, d = g.img.getContext('2d').getImageData(0, 0, W, H).data; let mx = 0;
          for (let y = 1; y < H; y += 2) for (let x = 1; x < W; x += 2) { if (d[(y * W + x) * 4 + 3] < 200) continue; const wx = g.bx + x, wy = g.by + y; let m = 1e9;
            for (const o of g.obs) { const v = Math.hypot(wx - o.x, wy - o.y) - o.r; if (v < m) m = v; if (m <= 0) break; } if (m > mx) mx = m; }
          over[g.style] = Math.max(over[g.style] || 0, Math.round(mx)); }
        const s = boss ? r.boss : r; s.rooms++; if (MAP.tpl === 'scatter') s.scatter++; else if (MAP.tries === 1) s.first++;
        if (!boss) r.tries += MAP.tries;
      }
      /* je Vorlage: einzelne Versuche mit Grund */
      const tpl = MAP_TPL[ri];
      for (const nm of Object.keys(tpl).concat(['arena'])) { const t = r.tpl[nm] = { n: 0, ok: 0, why: {} };
        for (let k = 0; k < Math.ceil(N / 2); k++) { setWorld(ri * 10 + (nm === 'arena' ? 5 : 3)); const c = mapCtx(); let why;
          try { if (nm === 'arena') mapBossLayout(c, ri); else { tpl[nm](c); if (c.groups.length < 3) why = 'few'; else mapPlaceBreakables(c, ri); } } catch (e) { why = 'err:' + e.message; }
          if (!why) why = mapCheck(c.groups.flatMap(g => g.circ).concat(c.brk), c.sx, c.sy);
          t.n++; if (!why) t.ok++; else t.why[why] = (t.why[why] || 0) + 1; } }
      out.push(r);
    }
    return { regions: out, over };
  }, [N, MS]).then(x => { x.regions.over = x.over; return x.regions; });
  await b.close();
  let tot = 0, first = 0, sc = 0;
  for (const r of res) { tot += r.rooms; first += r.first; sc += r.scatter;
    console.log(`Region ${r.region}: Räume ${r.rooms}  1. Versuch ok ${(100 * r.first / r.rooms).toFixed(1)}%  Rückfall ${r.scatter}  Ø Versuche ${(r.tries / r.rooms).toFixed(2)}  | Boss ${r.boss.rooms}: 1. ok ${(100 * r.boss.first / Math.max(1, r.boss.rooms)).toFixed(1)}% Rückfall ${r.boss.scatter}`);
    for (const nm in r.tpl) { const t = r.tpl[nm]; console.log(`    ${nm.padEnd(10)} ok ${(100 * t.ok / t.n).toFixed(0).padStart(3)}%  ${JSON.stringify(t.why)}`); } }
  console.log(`Gesamt (ohne Boss): 1. Versuch ok ${(100 * first / tot).toFixed(1)}%  Rückfall ${sc}/${tot}`);
  console.log('Überstand der Optik über die Kreise (px, max je Stil; Ziel ≤ 4, hooks: Schiene über den Lücken gewollt):', JSON.stringify(res.over));
  if (errs.length) { console.error('Fehler im Spiel:', [...new Set(errs)].slice(0, 10)); process.exit(1); }
})();
