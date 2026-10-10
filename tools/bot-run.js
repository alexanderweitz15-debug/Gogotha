#!/usr/bin/env node
/* GOLGOTHA — Bot-Läufe: spielt komplette Läufe ohne Zeichnen mit fester Zufallsfolge und misst, wie weit er kommt
   (Lebensverlust je Station, getrennt nach Treffern und Gift/Brand/Boden, Dauer, Gegnerzahl; bei einer Station
   über 5 Minuten die übrigen Gegner). Der Bot kitet im Kreis, weicht Geschossen, Gefahrenzonen und giftigem Boden
   aus, kauft keine Nahkampfwaffen und geht über das Wegraster auf Gegner zu, wenn er 8 s nichts trifft.
   Er spielt besser ausweichend und schlechter taktisch als ein Mensch: gut für Vergleiche zwischen zwei Ständen,
   kein Ersatz für echte Läufe. Bekannte Schwäche: mit nur einer Kurzstrecken-Waffe hängt er an Bossen fest.
   Aufruf (braucht Playwright):
     node tools/bot-run.js <Ordner mit index.html> <seed> <Figur-Index> <ausgabe.json> [Grad-Index, 2 = Mittel] [noenemies|nohazards|nomap]
   Beispiel: node tools/bot-run.js . 1 0 /tmp/lauf.json 3 */
const { chromium } = require('playwright');
const [,, DIR, SEED, CHAR, OUT, DIFF, ABL] = process.argv;   // DIFF = Index in DIFFICULTIES (2 = Mittel)
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + require('path').resolve(DIR) + '/index.html'); await pg.waitForTimeout(900);
  await pg.fill('#loginUser', 'bot' + SEED + 'x' + CHAR); await pg.fill('#loginPass', 'pw'); await pg.click('#registerBtn'); await pg.waitForSelector('#menu.show');
  await pg.evaluate((seed) => {   // fester Zufall ab Laufbeginn, keine echte Spielschleife mehr
    let a = +seed * 7919 | 0; Math.random = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    window.requestAnimationFrame = () => 0; window.setInterval = () => 0;   // Musik-Takt würfelt sonst dazwischen
  }, SEED);
  await pg.click('#btnStart'); await pg.waitForTimeout(200); await pg.click('.char-card >> nth=' + CHAR); await pg.click('#diffCards .diff-card >> nth=' + (DIFF || 2)); await pg.click('#modStart'); await pg.waitForTimeout(200);
  const res = await pg.evaluate(async ([seed, ABL]) => {
    for (let i = 1; i < 20000; i++) { clearInterval(i); clearTimeout(i); }   // laufende Musik-/UI-Timer stoppen
    let a = +seed * 7919 | 0; Math.random = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    if (G.state === 'curse') { const c = document.querySelectorAll('#curseCards .rcard'); (c[1] || c[0]).click(); }
    /* ABL = Abschalt-Versuch: noenemies | nohazards | nomap */
    if (ABL === 'noenemies') { regionPool = () => {}; packExtra = () => 0; }
    if (ABL === 'nohazards') { for (let i = 0; i < REGION_ENV.length; i++) REGION_ENV[i] = () => {}; }
    if (ABL === 'nomap') { buildMap = () => buildObstacles(); }
    G.level = 0; nextLevel();   // Station 1 mit frischem Zufall neu aufbauen
    renderGame = () => {}; if (typeof renderMinimap === 'function') renderMinimap = () => {};
    const st = { cp: [], hpLoss: 0, stations: [], dmgTaken: 0, dashes: 0, buys: { w: 0, i: 0 } }; let cur = null;
    const hp0 = hurtPlayer; hurtPlayer = function (d, who) { const p = who || player, h = p.hp; const r = hp0.apply(this, arguments); st.dmgTaken += Math.max(0, h - p.hp); if (cur) cur.dmg += Math.max(0, h - p.hp); return r; };
    const click = sel => { const c = [...document.querySelectorAll(sel)].filter(x => !x.classList.contains('locked')); if (c.length) { c[0].click(); return true; } return false; };
    let t = performance.now(), lastLevel = -1;
    const hazIn = (h, x, y, pad) => h.kind === 'circle' ? dist2(x, y, h.x, h.y) < (h.r + pad) * (h.r + pad) : distToSeg(x, y, h.x1, h.y1, h.x2, h.y2) < h.w / 2 + pad;
    let lastDmgT = 0, lastDmgSum = 0;
    function steer(p) {
      let vx = 0, vy = 0;
      const dsum = Object.values(G.run.dmg || {}).reduce((a, x) => a + x.d, 0); if (dsum > lastDmgSum + 0.5) { lastDmgSum = dsum; lastDmgT = G.time; }
      const idle = G.time - lastDmgT > 8 && enemies.length;
      for (const e of enemies) { const dx = p.x - e.x, dy = p.y - e.y, d2 = dx * dx + dy * dy, R = e.isBoss ? 420 : 300; if (d2 > R * R || d2 < 1) continue; const w = (e.isBoss ? 3 : 1) * 9000 / d2; const d = Math.sqrt(d2); vx += dx / d * w; vy += dy / d * w; }
      for (const bb of ebullets) { const dx = p.x - bb.x, dy = p.y - bb.y, d2 = dx * dx + dy * dy; if (d2 > 170 * 170 || d2 < 1) continue; const d = Math.sqrt(d2), w = 14000 / d2; vx += dx / d * w; vy += dy / d * w; }
      for (const h of (G.hazards || [])) { if (h.hit) continue; if (hazIn(h, p.x, p.y, 40)) { const cx = h.kind === 'circle' ? h.x : (h.x1 + h.x2) / 2, cy = h.kind === 'circle' ? h.y : (h.y1 + h.y2) / 2;
        if (h.kind === 'circle') { const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1; vx += dx / d * 4; vy += dy / d * 4; }
        else { const lx = h.x2 - h.x1, ly = h.y2 - h.y1, l = Math.hypot(lx, ly) || 1, nx = -ly / l, ny = lx / l, s = Math.sign((p.x - h.x1) * nx + (p.y - h.y1) * ny) || 1; vx += nx * s * 4; vy += ny * s * 4; } } }
      if (typeof R !== 'undefined' && R.zones) for (const z of R.zones) { if (z.kind !== 'gas' && z.kind !== 'wire' && z.kind !== 'blood') continue; const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy) || 1, rr = (z.r || 60) + 40; if (d < rr) { const k = (rr - d) / 40 * (z.kind === 'gas' ? 3 : 1.5); vx += dx / d * k; vy += dy / d * k; } }
      for (const pu of puddles) { if (!pu.hostile) continue; const dx = p.x - pu.x, dy = p.y - pu.y, d = Math.hypot(dx, dy) || 1; if (d < pu.r + 45) { const k = (pu.r + 45 - d) / 45 * 2.5; vx += dx / d * k; vy += dy / d * k; } }
      for (const ob of obstacles) { const dx = p.x - ob.x, dy = p.y - ob.y, d = Math.hypot(dx, dy) - ob.r; if (d < 30) { const k = (30 - d) / 30 * 1.2, dd = Math.hypot(dx, dy) || 1; vx += dx / dd * k; vy += dy / dd * k; } }
      const mx = 120; if (p.x < ROOM.x + mx) vx += (ROOM.x + mx - p.x) / mx * 1.5; if (p.x > ROOM.x + ROOM.w - mx) vx -= (p.x - (ROOM.x + ROOM.w - mx)) / mx * 1.5;
      if (p.y < ROOM.y + mx) vy += (ROOM.y + mx - p.y) / mx * 1.5; if (p.y > ROOM.y + ROOM.h - mx) vy -= (p.y - (ROOM.y + ROOM.h - mx)) / mx * 1.5;
      const cxr = ROOM.x + ROOM.w / 2, cyr = ROOM.y + ROOM.h / 2, ox = p.x - cxr, oy = p.y - cyr, od = Math.hypot(ox, oy) || 1;
      vx += -oy / od * 0.35; vy += ox / od * 0.35;                       // im Kreis kiten statt in die Ecke laufen
      const near = enemies.some(e => dist2(p.x, p.y, e.x, e.y) < 170 * 170);
      if (!near) { let best = null, bd = 1e12; for (const pk of pickups) { const d = dist2(p.x, p.y, pk.x, pk.y); if (d < bd) { bd = d; best = pk; } }
        if (best) { const dx = best.x - p.x, dy = best.y - p.y, d = Math.sqrt(bd) || 1; vx += dx / d * 0.8; vy += dy / d * 0.8; } }
      if (idle) { let best = null, bd = 1e12; for (const e of enemies) { const d = dist2(p.x, p.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
        if (best) { let tx = best.x, ty = best.y;
          if (typeof MAP !== 'undefined' && MAP.grid && typeof mapLos === 'function' && !mapLos(p.x, p.y, best.x, best.y)) {   // um Wände herum: Raster-Flutung vom Ziel, dann bergab
            const gr = MAP.grid; if (!p._bf || G.time - p._bfT > 0.5) { p._bf = mapFlood(gr, [[best.x, best.y]]); p._bfT = G.time; }
            const f = p._bf, i = clamp(Math.floor((p.x - ROOM.x) / gr.cs), 0, gr.nx - 1), j = clamp(Math.floor((p.y - ROOM.y) / gr.cs), 0, gr.ny - 1); let bk = -1, bv = f[j * gr.nx + i] >= 0 ? f[j * gr.nx + i] : 1e9;
            for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= gr.nx || nj >= gr.ny) continue; const nk = nj * gr.nx + ni; if (f[nk] >= 0 && f[nk] < bv) { bv = f[nk]; bk = nk; } }
            if (bk >= 0) { tx = ROOM.x + (bk % gr.nx + 0.5) * gr.cs; ty = ROOM.y + (Math.floor(bk / gr.nx) + 0.5) * gr.cs; } }
          const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1; vx = dx / d * 2 + vx * 0.2; vy = dy / d * 2 + vy * 0.2; } }   // nichts trifft: hingehen
      const m = Math.hypot(vx, vy); TouchJoy.id = 1; TouchJoy.dx = m > 0.05 ? vx / m : 0; TouchJoy.dy = m > 0.05 ? vy / m : 0;
      const danger = ebullets.some(bb => dist2(p.x, p.y, bb.x, bb.y) < 55 * 55) || enemies.some(e => (e.touch || e.isBoss) && dist2(p.x, p.y, e.x, e.y) < (e.r + p.r + 14) ** 2);
      if (danger && p.dashCd <= 0) { tryDash(p); st.dashes++; }
    }
    function shop() {
      const items = [...document.querySelectorAll('#shopItems .rcard:not(.locked):not(.sold)')];
      for (const c of items) { c.click(); st.buys.i++; }
      const ws = [...document.querySelectorAll('#shopCards .rcard:not(.locked)')].filter(c => { const o = shopOffer[[...c.parentNode.children].indexOf(c)]; return !(o && o.weapon && o.weapon.melee); });
      if (ws.length) { ws[ws.length - 1].click(); st.buys.w++; return; }
      $('#shopSkip').click();
    }
    for (let f = 0; f < 30 * 60 * 75; f++) {      // höchstens 75 Spielminuten
      const s = G.state;
      if (s === 'gameover' || s === 'endless') break;
      if (s === 'curse') { click('#curseCards .rcard:nth-child(2)') || click('#curseCards .rcard'); continue; }
      if (s === 'upgrade') { const c = [...document.querySelectorAll('#upgradeCards .rcard:not(.locked)')]; if (c.length) c[Math.floor(Math.random() * c.length)].click(); continue; }
      if (s === 'ability') { click('#abilityCards .rcard'); continue; }
      if (s === 'relic') { const c = [...document.querySelectorAll('#relicCards .rcard:not(.locked)')]; if (c.length) c[0].click(); else hideAllOverlays(); continue; }
      if (s === 'shop') { shop(); continue; }
      if (G.level !== lastLevel && s === 'playing') { lastDmgT = G.time; if (cur) st.stations.push(cur); lastLevel = G.level; cur = { lvl: G.level, t0: G.time, hp0: Math.round(player.hp), max: player.maxHP, dmg: 0, foesMax: 0 }; }
      if (s === 'playing') { steer(players[0]); if (cur) cur.foesMax = Math.max(cur.foesMax, enemies.length); }
      if (cur && s === 'playing' && G.time - cur.t0 > 300) { cur.stuck = true;
        const pl = players[0]; cur.left = enemies.map(e => ({ t: e.type, hp: Math.round(e.hp), max: Math.round(e.maxHp), d: Math.round(Math.hypot(e.x - pl.x, e.y - pl.y)), inObs: obstacles.some(ob => dist2(e.x, e.y, ob.x, ob.y) < (ob.r + e.r + 2) * (ob.r + e.r + 2)), los: typeof mapLos === 'function' ? mapLos(e.x, e.y, pl.x, pl.y) : true, boss: !!e.isBoss, ghost: !!e.ghost, x: Math.round(e.x), y: Math.round(e.y) }));
        cur.player = { x: Math.round(pl.x), y: Math.round(pl.y), w: pl.weapons.join() }; break; }   // Station dauert >5 min: Bot hängt fest
      if (f % 150 === 0 && st.cp.length < 3000) st.cp.push([f, s, G.level, enemies.length, Math.round(players[0].x), Math.round(players[0].y), G.kills, Math.round(Math.random() * 1e6)]);
      const hpB = players[0].hp; t += 1000 / 30; last = t - 1000 / 30; loop(t); const lost = Math.max(0, hpB - players[0].hp); st.hpLoss += lost; if (cur) cur.loss = (cur.loss || 0) + lost;   // feste Schrittweite: das Spiel setzt last bei Stationswechseln auf die echte Uhr
    }
    if (cur) { cur.dur = Math.round(G.time - cur.t0); st.stations.push(cur); }
    st.stations.forEach((x, i) => { const n = st.stations[i + 1]; if (n) x.dur = Math.round(n.t0 - x.t0); x.dmg = Math.round(x.dmg); });
    return { reached: G.level, state: G.state, time: Math.round(G.time), kills: G.kills, clvl: player.level, weapons: player.weapons, items: Object.keys(player.itemsOwned || {}).length,
      cp: [], hpLoss: Math.round(st.hpLoss), dmgTaken: Math.round(st.dmgTaken), dashes: st.dashes, buys: st.buys, stations: st.stations };
  }, [SEED, ABL || '']);
  res.abl = ABL || ''; res.errors = errs; res.diff = +(DIFF || 2); res.seed = +SEED; res.char = +CHAR; res.build = require('path').resolve(DIR).split('/').pop();
  require('fs').writeFileSync(OUT, JSON.stringify(res)); console.log(res.build, 'seed', SEED, 'char', CHAR, 'diff', res.diff, '→ Station', res.reached, res.state, res.time + 's', 'errors', errs.length);
  await b.close();
})();
