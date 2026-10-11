"use strict";
/* =========================================================================
   GOLGOTHA — Pixel-Kern: Palette, Raster → Bild, Varianten, Zeichnen
   Wird VOR core.js geladen: nur document/Canvas, keine Spiel-Globals beim Laden.
   Stilregeln: PIXEL-STIL.md

   Eine Figur ist ein Raster aus Zeichenketten, ein Zeichen = ein Bildpunkt aus PX_PAL ('.' = leer):
     { w, h,              Rastergröße in Bildpunkten
       ax, ay,            Ankerpunkt im Raster (liegt auf e.x/e.y bzw. p.x/p.y; Konvention: Körpermitte)
       frames:{ name:[ [zeile,…], … ] },   benannte Bildfolgen, z. B. idle/walk/hit
       outline:'0'|false  Umrisszeichen (Standard '0'); wird außen um die Figur gelegt
       halo:false         ohne hellen Lichtsaum außen (für Boden, Wände, Geschosse)
       pal:{ x:'#rrggbb' } eigene Zusatzfarben nur für diese Figur (sparsam) }
   Einfärbbare Bildpunkte (Geschosse: Farbe der Waffe): '*' = Farbe, '+' = heller, '-' = dunkler; Farbe kommt aus pxDraw(…,{tint}).
   Eine Weltzeinheit = ein Canvas-Pixel; ein Bildpunkt = PX_S Welteinheiten.
   ========================================================================= */
const PX_S=2;   // Bildpunkt → Welteinheiten (960×600-Canvas, im Browser hochskaliert)

/* Gemeinsame Palette. Neue Farben nur hier eintragen, nicht in den Figuren (Stil bleibt einheitlich). */
const PX_PAL={
  /* Schwarz und Grautöne (Umriss, Stoff, Stein) */
  '0':'#0b0a0c','1':'#1c1a20','2':'#2e2a30','3':'#4a4448','4':'#6e6660','5':'#9a8e80','6':'#c8bca4','7':'#ece2cc',
  /* Blut */
  'r':'#3a0e10','R':'#7a1418','b':'#c01f24','B':'#ff5a4a',
  /* Holz und Leder */
  'w':'#2a1a12','W':'#4a3018','l':'#7a5030','L':'#a87a4a',
  /* Gold und Kerzenlicht */
  'g':'#8a6a2a','G':'#e0b25a','y':'#ffe08a',
  /* Seuche */
  'v':'#2a3418','V':'#5a7020','e':'#9bbf3a','E':'#d8f080',
  /* Kälte und Geister */
  'c':'#1e2a3a','C':'#4a6a8a','i':'#7fd0e6','I':'#d8f4ff',
  /* Beschwörung */
  'p':'#2a1a3a','P':'#6a4a8a','q':'#b08ae0',
  /* Fleisch und Haut */
  'f':'#6a3a30','F':'#b0685a','h':'#e0a888',
  /* Stahl */
  's':'#3a3e46','S':'#8a909a','t':'#c8ccd2',
  /* Feuer */
  'o':'#8a3a10','O':'#e08a2f','k':'#ffd27a',
};

/* Prüft eine Figur; liefert eine Liste von Fehlern (leer = in Ordnung). Für tools/px-sheet.js und die Konsole. */
function pxCheck(name,def){ const err=[];
  if(!def||!def.frames){ err.push(name+': keine frames'); return err; }
  const pal=Object.assign({'*':1,'+':1,'-':1},PX_PAL,def.pal||{});
  for(const fn in def.frames) def.frames[fn].forEach((rows,i)=>{
    if(rows.length!==def.h) err.push(name+'.'+fn+'['+i+']: '+rows.length+' Zeilen statt '+def.h);
    rows.forEach((row,y)=>{ if(row.length!==def.w) err.push(name+'.'+fn+'['+i+'] Zeile '+y+': '+row.length+' statt '+def.w);
      for(const ch of row) if(ch!=='.'&&!pal[ch]) err.push(name+'.'+fn+'['+i+'] Zeile '+y+': unbekannte Farbe "'+ch+'"'); }); });
  return err; }

/* Rand je Seite: 1 Bildpunkt Umriss, dazu 1 Bildpunkt Lichtsaum (halo, Standard an: hebt dunkle Figuren vom dunklen Boden ab) */
const pxBorder=def=>def.halo===false?1:2;
/* Raster → Bild in Rastergröße (+Rand). white = Treffer-Blitz (Silhouette weiß). */
function pxMix(hex,amt){ const n=parseInt(hex.slice(1),16), f=v=>Math.round(amt<0?v*(1+amt):v+(255-v)*amt);
  return '#'+[n>>16,(n>>8)&255,n&255].map(v=>f(v).toString(16).padStart(2,'0')).join(''); }
function pxRaster(def,rows,white,tint){
  const B=pxBorder(def), W=def.w+2*B, H=def.h+2*B, pal=Object.assign({},PX_PAL,def.pal||{});
  if(tint&&/^#[0-9a-f]{6}$/i.test(tint)){ pal['*']=tint; pal['+']=pxMix(tint,0.45); pal['-']=pxMix(tint,-0.45); } else { pal['*']='#c8bca4'; pal['+']='#ece2cc'; pal['-']='#6e6660'; }
  const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
  const img=g.createImageData(W,H), d=img.data, solid=new Uint8Array(W*H);
  const put=(x,y,hex,a)=>{ const n=parseInt(hex.slice(1),16), o=(y*W+x)*4; d[o]=n>>16; d[o+1]=(n>>8)&255; d[o+2]=n&255; d[o+3]=a; };
  const near=(m,x,y)=>(x>0&&m[y*W+x-1])||(x<W-1&&m[y*W+x+1])||(y>0&&m[(y-1)*W+x])||(y<H-1&&m[(y+1)*W+x]);
  for(let y=0;y<def.h;y++){ const row=rows[y]||''; for(let x=0;x<def.w;x++){ const ch=row[x]; if(!ch||ch==='.')continue;
    solid[(y+B)*W+x+B]=1; put(x+B,y+B,white?'#ffffff':pal[ch]||'#ff00ff',255); } }
  const ol=def.outline===undefined?'0':def.outline;
  if(ol){ const oc=white?'#ffffff':(pal[ol]||ol), ring=new Uint8Array(W*H);
    for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(!solid[y*W+x]&&near(solid,x,y)){ ring[y*W+x]=1; put(x,y,oc,white?200:255); }
    if(B>1&&!white){ for(let i=0;i<W*H;i++) if(ring[i])solid[i]=1;
      for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(!solid[y*W+x]&&near(ring,x,y)) put(x,y,'#ffecd2',46); } }
  g.putImageData(img,0,0); return c; }

/* Fertige Bilder je Figur/Bildfolge/Bild/Blitz, auf PX_S vergrößert (scharfe Kanten) */
const PX_CACHE=new Map();
function pxImage(def,fn,i,white,tint){
  let m=PX_CACHE.get(def); if(!m){ m=new Map(); PX_CACHE.set(def,m); }
  const fr=def.frames[fn]||def.frames.idle||def.frames[Object.keys(def.frames)[0]], k=(fr===def.frames[fn]?fn:'_')+'|'+(i%fr.length)+'|'+(white?1:0)+'|'+(tint||'');
  let c=m.get(k); if(c)return c;
  const raw=pxRaster(def,fr[i%fr.length],white,tint);
  c=document.createElement('canvas'); c.width=raw.width*PX_S; c.height=raw.height*PX_S; const g=c.getContext('2d');
  g.imageSmoothingEnabled=false; g.drawImage(raw,0,0,c.width,c.height); m.set(k,c); return c; }

/* Zeichnet eine Figur mit dem Anker auf (x,y), Anker auf ganze Gerätepixel gerundet (keine verschmierten Kanten bei Kamerafahrt).
   o: {flip (waagrecht), flipY (senkrecht, z. B. Waffe nach links), white (Treffer-Blitz), alpha, rot (um den Anker), scale, tint} */
function pxDraw(g,def,fn,i,x,y,o){ o=o||{};
  const img=pxImage(def,fn,i|0,!!o.white,o.tint), sc=o.scale||1, B=pxBorder(def), ox=(def.ax+B)*PX_S, oy=(def.ay+B)*PX_S;
  const m=g.getTransform(); if(!m.b&&!m.c&&m.a&&m.d){ x=(Math.round(x*m.a+m.e)-m.e)/m.a; y=(Math.round(y*m.d+m.f)-m.f)/m.d; }
  const sm=g.imageSmoothingEnabled; g.imageSmoothingEnabled=false;
  if(!o.flip&&!o.flipY&&!o.rot&&sc===1&&o.alpha==null){ g.drawImage(img,x-ox,y-oy); g.imageSmoothingEnabled=sm; return; }
  g.save(); g.translate(x,y); if(o.rot)g.rotate(o.rot); if(o.flip||o.flipY)g.scale(o.flip?-1:1,o.flipY?-1:1); if(sc!==1)g.scale(sc,sc);
  if(o.alpha!=null)g.globalAlpha*=o.alpha; g.drawImage(img,-ox,-oy); g.restore(); g.imageSmoothingEnabled=sm; }

/* Bildnummer einer Bildfolge zur Zeit t bei fps Bildern je Sekunde */
function pxFrame(def,fn,t,fps){ const fr=def.frames[fn]; return fr?Math.floor(t*(fps||6))%fr.length:0; }

/* Alle Figuren eines Katalogs prüfen (Konsole: pxCheckAll(PX_HERO)) */
function pxCheckAll(cat){ let err=[]; for(const k in cat){ const v=cat[k]; if(v&&v.frames) err=err.concat(pxCheck(k,v));
  else if(v&&v.sprites) for(const s in v.sprites) err=err.concat(pxCheck(k+'.'+s,v.sprites[s])); } return err; }

/* ---------- Anbindung an render.js (läuft erst beim Zeichnen, darf Spiel-Globals nutzen) ---------- */
const PX_HERO_S=17;   // Zeichengröße s eines Helden im Spiel (p.r*1.3); andere s (Vorschau, Kodex) skalieren
/* Held: Schatten, Körper (idle/walk, blickt in Zielrichtung), Waffe in der Hand in Zielrichtung gedreht */
function pxDrawHero(g,def,x,y,s,t,moving,aim){
  const sc=Math.abs(s-PX_HERO_S)<1.5?1:s/PX_HERO_S, flip=Math.cos(aim)<0, k=PX_S*sc;
  g.fillStyle='rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(x,y+(def.h-def.ay-0.5)*k,def.w*0.42*k,def.w*0.16*k,0,0,Math.PI*2); g.fill();
  const fn=moving&&def.frames.walk?'walk':'idle', i=Math.floor(t*(moving?8:2))%def.frames[fn].length;
  const gun=def.gun&&PX_GUN[def.gun], hx=x+(def.hand?(def.hand[0]-def.ax)*k*(flip?-1:1):0), hy=y+(def.hand?(def.hand[1]-def.ay)*k:0);
  const drawGun=()=>{ if(gun) pxDraw(g,gun,'idle',0,hx,hy,{rot:aim,flipY:flip,scale:sc}); };
  const behind=Math.sin(aim)<-0.45;   // zielt nach oben: Waffe hinter dem Körper
  if(behind)drawGun(); pxDraw(g,def,fn,i,x,y,{flip,scale:sc}); if(!behind)drawGun(); }
/* Gegner (ohne Boss): Bild aus walk, Treffer-Blitz weiß, Größe folgt e.r (Elite ×1,3, geteilte Kolosse kleiner) */
function pxDrawEnemy(g,def,e,face,white,t){
  const base=(ETYPES[e.type]&&ETYPES[e.type].r)||e.r, sc=Math.abs(e.r-base)<0.5?1:e.r/base;
  const fn=white&&def.frames.hit?'hit':'walk', fr=def.frames[fn]||def.frames.idle, i=Math.floor(t*8+e.wob)%fr.length;
  pxDraw(g,def,def.frames[fn]?fn:'idle',i,0,0,{flip:face<0,white,scale:sc,alpha:e.alpha!=null?e.alpha:null}); }
/* Geschoss: PX_PROJ[Form], eingefärbt mit der Waffenfarbe; def.r0 = Trefferradius, für den das Bild gezeichnet ist */
function pxDrawProj(g,def,b,a){ const sc=def.r0?Math.max(0.6,b.r/def.r0):1;
  pxDraw(g,def,'idle',def.frames.idle&&def.frames.idle.length>1?Math.floor(G.uiTime*12+b.id)%def.frames.idle.length:0,b.x,b.y,{rot:def.round?0:a,tint:b.color,scale:sc}); }

/* Kataloge (gefüllt von px-heroes.js, px-enemies.js, px-bosses.js, px-tiles.js). Fehlt ein Eintrag, zeichnet das Spiel die alte Figur aus sprites.js. */
const PX_HERO={}, PX_GUN={}, PX_ENEMY={}, PX_BOSS={}, PX_PROJ={}, PX_TILE={};
