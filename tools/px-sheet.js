#!/usr/bin/env node
/* GOLGOTHA — Pixel-Bogen: zeichnet alle Pixel-Figuren (PX_HERO, PX_GUN, PX_ENEMY, PX_BOSS, PX_PROJ, PX_TILE)
   mit allen Bildern, dem Treffer-Blitz und im Spielmaßstab vor dem Boden jeder Region in ein PNG, und prüft die Raster.
   Aufruf (braucht Playwright):  node tools/px-sheet.js [ausgabe.png, Standard px-sheet.png] [Vergrößerung, Standard 3] [Katalog, z. B. PX_ENEMY]
   Ende mit Fehlercode 1, wenn ein Raster fehlerhaft ist (falsche Zeilenlänge, unbekannte Farbe). */
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || 'px-sheet.png', ZOOM = +process.argv[3] || 3, ONLY = process.argv[4] || '';

(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await pg.waitForTimeout(900);
  const res = await pg.evaluate(([ZOOM, ONLY]) => {
    const cats = { PX_HERO, PX_GUN, PX_ENEMY, PX_BOSS, PX_PROJ, PX_TILE }, bad = [], rows = [];
    for (const cn in cats) { if (ONLY && cn !== ONLY) continue; bad.push(...pxCheckAll(cats[cn]));
      for (const k in cats[cn]) { const v = cats[cn][k]; const defs = v.frames ? { '': v } : (v.sprites || {});
        for (const sn in defs) rows.push({ cat: cn, name: k + (sn ? '.' + sn : ''), def: defs[sn] }); } }
    if (!rows.length) return { bad, url: null, n: 0 };
    const floors = (typeof REGIONS !== 'undefined' ? REGIONS.map(r => r.floor) : ['#171a14']);
    const pad = 6, lab = 150;
    const cellW = d => (d.w + 2 * pxBorder(d)) * PX_S + pad, rowH = d => Math.max(18, (d.h + 2 * pxBorder(d)) * PX_S + pad);
    let W = 0, H = 0; const lay = [];
    for (const r of rows) { const d = r.def, frs = []; for (const fn in d.frames) d.frames[fn].forEach((_, i) => frs.push([fn, i]));
      const w = lab + (frs.length + 1 + floors.length) * cellW(d); W = Math.max(W, w); lay.push({ r, frs, y: H }); H += rowH(d); }
    const c = document.createElement('canvas'); c.width = W * ZOOM; c.height = H * ZOOM; const g = c.getContext('2d');
    g.imageSmoothingEnabled = false; g.scale(ZOOM, ZOOM); g.fillStyle = '#3a3a3a'; g.fillRect(0, 0, W, H);
    for (const { r, frs, y } of lay) { const d = r.def, cw = cellW(d), rh = rowH(d);
      g.fillStyle = '#eee'; g.font = '9px monospace'; g.fillText(r.cat.replace('PX_', '') + ' ' + r.name, 3, y + 11);
      g.fillText(d.w + '×' + d.h, 3, y + 22);
      let x = lab; const at = (fn, i, o, bg) => { if (bg) { g.fillStyle = bg; g.fillRect(x, y, cw - 2, rh - 2); }
        pxDraw(g, d, fn, i, x + (d.ax + pxBorder(d)) * PX_S + pad / 2, y + (d.ay + pxBorder(d)) * PX_S + pad / 2, o); x += cw; };
      for (const [fn, i] of frs) at(fn, i, {}, '#55505a');
      at(frs[0][0], 0, { white: true }, '#55505a');
      for (const f of floors) at(frs[frs.length > 2 ? 2 : 0][0], 0, {}, f); }
    return { bad, url: c.toDataURL('image/png'), n: rows.length };
  }, [ZOOM, ONLY]);
  await b.close();
  if (res.url) require('fs').writeFileSync(OUT, Buffer.from(res.url.split(',')[1], 'base64'));
  console.log(res.n + ' Figuren → ' + (res.url ? OUT : '(keine)'));
  if (res.bad.length) console.error('Rasterfehler:\n  ' + res.bad.join('\n  '));
  if (errs.length) console.error('Fehler im Spiel:', errs);
  process.exit(res.bad.length || errs.length ? 1 : 0);
})();
