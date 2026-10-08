"use strict";
/* =========================================================================
   GOLGOTHA — Sprites (prozedural gezeichnet, kein Bildmaterial)
   Wird VOR game.js geladen und nutzt dessen Globals (TAU, C, G) erst beim Zeichnen.
   - HERO_ART: eigene Figuren für die 12 freischaltbaren Charaktere
   - ENEMY_ART: Gegnerfiguren; werden pro Typ/Größe/Animationsbild einmal vorgezeichnet
     und zwischengespeichert (bis zu ~90 Gegner gleichzeitig)
   Konvention: Ursprung = Körpermitte, Füße bei +s (Helden) bzw. +r (Gegner), Blick nach rechts.
   ========================================================================= */

/* Farbe aufhellen (amt>0) oder abdunkeln (amt<0) */
function shade(hex,amt){
  const n=parseInt(hex.slice(1),16); let r=n>>16, g=(n>>8)&255, b=n&255;
  const f=v=>Math.round(amt<0?v*(1+amt):v+(255-v)*amt);
  return 'rgb('+f(r)+','+f(g)+','+f(b)+')';
}

/* ---------- Bausteine ---------- */
function spRobe(g,s,sw,col,top,wTop,wBot){ g.fillStyle=col; g.beginPath();
  g.moveTo(-s*wBot+sw,s); g.lineTo(-s*wTop,s*top); g.lineTo(s*wTop,s*top); g.lineTo(s*wBot-sw,s); g.closePath(); g.fill(); }
function spCirc(g,x,y,r,col){ g.fillStyle=col; g.beginPath(); g.arc(x,y,r,0,TAU); g.fill(); }
function spLine(g,x1,y1,x2,y2,col,w){ g.strokeStyle=col; g.lineWidth=Math.max(1,w); g.lineCap='round'; g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.stroke(); }
/* Waffe in Zielrichtung: Callback zeichnet entlang der x-Achse */
function spAim(g,aim,fn){ g.save(); g.rotate(aim); fn(); g.restore(); }

/* ---------- HELDEN (12 freischaltbare Charaktere) ---------- */
const HERO_ART={
  /* Kreuzritter: Topfhelm mit Kreuzschlitz, weißer Wappenrock mit rotem Kreuz, Donnerbüchse */
  crusader(g,s,t,sw,aim){
    spRobe(g,s,sw,'#4a4e56',-0.45,0.62,0.85);                       // Kettenhemd
    spRobe(g,s,sw*0.6,'#cfc6b4',-0.35,0.42,0.6);                    // Wappenrock
    g.fillStyle='#a3161b'; g.fillRect(-s*0.07,-s*0.25,s*0.14,s*1.1); g.fillRect(-s*0.3,s*0.05,s*0.6,s*0.13);
    g.fillStyle='#6d727c'; g.fillRect(-s*0.36,-s*1.08,s*0.72,s*0.78);   // Topfhelm
    g.fillStyle='#8a909a'; g.fillRect(-s*0.36,-s*1.08,s*0.72,s*0.12);
    g.fillStyle='#08080a'; g.fillRect(-s*0.28,-s*0.78,s*0.56,s*0.08); g.fillRect(-s*0.04,-s*0.86,s*0.08,s*0.42);
    spCirc(g,s*0.12,-s*0.74,s*0.04,C.blood2);
    spAim(g,aim,()=>{ g.fillStyle='#8a6a2a'; g.fillRect(s*0.25,-s*0.02,s*0.35,s*0.26);
      g.fillStyle=C.gold2; g.fillRect(s*0.5,0,s*0.7,s*0.22); g.fillStyle='#2a1a08'; g.fillRect(s*1.12,s*0.03,s*0.1,s*0.16); });
  },
  /* Flagellant: gebeugt, nackter Oberkörper mit Striemen, Sackkapuze, Ketten, Nagelkanzel */
  flagellant(g,s,t,sw,aim){
    spLine(g,-s*0.22,s*0.4,-s*0.3+sw,s*0.98,'#6a5040',s*0.17); spLine(g,s*0.18,s*0.4,s*0.26-sw,s*0.98,'#6a5040',s*0.17);   // Beine
    spRobe(g,s*0.62,sw*0.5,'#2a1e16',0.1,0.42,0.55);                // Lendentuch
    g.fillStyle='#a8876c'; g.beginPath(); g.moveTo(-s*0.5,-s*0.38); g.quadraticCurveTo(0,-s*0.62,s*0.5,-s*0.38);   // gebeugter Rücken
    g.lineTo(s*0.32,s*0.32); g.lineTo(-s*0.32,s*0.32); g.closePath(); g.fill();
    g.strokeStyle='#7a1014'; g.lineWidth=Math.max(1,s*0.05);                                          // Striemen
    for(let i=0;i<3;i++){ g.beginPath(); g.moveTo(-s*0.36,-s*0.28+i*s*0.18); g.lineTo(s*0.3,-s*0.16+i*s*0.18); g.stroke(); }
    spLine(g,-s*0.45,-s*0.32,-s*0.62,s*0.25,'#a8876c',s*0.15);                                        // Arm mit Geißel
    g.strokeStyle='#5a3a20'; g.lineWidth=Math.max(1,s*0.04); for(const k of [-0.15,0,0.15]){ g.beginPath(); g.moveTo(-s*0.62,s*0.25); g.quadraticCurveTo(-s*(0.9+k),s*0.45,-s*(0.75+k),s*0.8); g.stroke(); }
    g.strokeStyle='#6a6e76'; g.lineWidth=Math.max(1,s*0.06); g.beginPath(); g.moveTo(-s*0.48,-s*0.3); g.quadraticCurveTo(0,s*0.05,s*0.45,-s*0.3); g.stroke();   // Kette
    g.fillStyle='#4a3a28'; g.beginPath(); g.moveTo(-s*0.36,-s*0.42); g.quadraticCurveTo(-s*0.4,-s*1.12,0,-s*1.06); g.quadraticCurveTo(s*0.4,-s*1.12,s*0.36,-s*0.42); g.closePath(); g.fill();
    spCirc(g,-s*0.13,-s*0.72,s*0.07,C.blood2); spCirc(g,s*0.13,-s*0.72,s*0.07,C.blood2);
    spAim(g,aim,()=>{ g.fillStyle='#4a4e56'; g.fillRect(s*0.25,-s*0.12,s*0.4,s*0.34); spLine(g,s*0.6,s*0.05,s*1.15,s*0.05,'#9aa0a8',s*0.12); });
  },
  /* Inquisitor: Hut mit breiter Krempe und Goldschnalle, langer Mantel, Kreuzanhänger, Armbrust */
  inquisitor(g,s,t,sw,aim){
    spRobe(g,s,sw,'#141118',-0.45,0.45,0.78);
    g.fillStyle='#d8d0c0'; g.fillRect(-s*0.3,-s*0.48,s*0.6,s*0.1);     // weißer Kragen
    g.fillStyle=C.gold2; g.fillRect(-s*0.03,-s*0.3,s*0.06,s*0.36); g.fillRect(-s*0.12,-s*0.2,s*0.24,s*0.06);
    spCirc(g,0,-s*0.66,s*0.32,'#c8b8a0');                               // Gesicht
    g.fillStyle='#000'; g.fillRect(-s*0.2,-s*0.72,s*0.4,s*0.07);
    g.fillStyle='#0c0a0e'; g.beginPath(); g.ellipse(0,-s*0.9,s*0.72,s*0.15,0,0,TAU); g.fill();
    g.fillRect(-s*0.32,-s*1.35,s*0.64,s*0.48);
    g.fillStyle=C.gold; g.fillRect(-s*0.12,-s*1.0,s*0.24,s*0.12);
    spAim(g,aim,()=>{ spLine(g,s*0.2,s*0.1,s*1.05,s*0.1,'#5a3a20',s*0.12);
      g.strokeStyle='#8a6a3a'; g.lineWidth=Math.max(1,s*0.08); g.beginPath(); g.arc(s*0.8,s*0.1,s*0.32,-1.3,1.3); g.stroke();
      spLine(g,s*0.9,-s*0.2,s*0.9,s*0.4,'#d8cdb8',s*0.03); });
  },
  /* Märtyrerin: weißes, blutgetränktes Gewand, Schleier, Dornenkranz als Heiligenschein, Lanze */
  martyr(g,s,t,sw,aim){
    spRobe(g,s,sw,'#d6cdbf',-0.45,0.42,0.75);
    g.fillStyle='rgba(150,15,20,.75)'; g.beginPath(); g.moveTo(-s*0.75+sw,s); g.quadraticCurveTo(0,s*0.55,s*0.75-sw,s); g.closePath(); g.fill();
    g.fillStyle='#9a9286'; g.beginPath(); g.moveTo(-s*0.48,-s*0.2); g.quadraticCurveTo(-s*0.5,-s*1.12,0,-s*1.08); g.quadraticCurveTo(s*0.5,-s*1.12,s*0.48,-s*0.2); g.closePath(); g.fill();
    spCirc(g,0,-s*0.62,s*0.28,'#e6d8c6');
    spLine(g,-s*0.15,-s*0.62,-s*0.05,-s*0.6,'#3a2a20',s*0.04); spLine(g,s*0.05,-s*0.6,s*0.15,-s*0.62,'#3a2a20',s*0.04);
    g.strokeStyle='#5a3a1a'; g.lineWidth=Math.max(1,s*0.07); g.beginPath(); g.ellipse(0,-s*1.22,s*0.4,s*0.13,0,0,TAU); g.stroke();
    for(let i=0;i<8;i++){ const a=i/8*TAU; spLine(g,Math.cos(a)*s*0.4,-s*1.22+Math.sin(a)*s*0.13,Math.cos(a)*s*0.52,-s*1.22+Math.sin(a)*s*0.17-s*0.06,'#5a3a1a',s*0.04); }
    g.save(); g.globalAlpha=0.35+Math.sin(t*3)*0.15; g.strokeStyle=C.gold2; g.lineWidth=Math.max(1,s*0.05); g.beginPath(); g.ellipse(0,-s*1.22,s*0.5,s*0.18,0,0,TAU); g.stroke(); g.restore();
    spAim(g,aim,()=>{ spLine(g,-s*0.3,s*0.1,s*1.35,s*0.1,'#8a6a3a',s*0.09);
      g.fillStyle=C.gold2; g.beginPath(); g.moveTo(s*1.35,-s*0.06); g.lineTo(s*1.65,s*0.1); g.lineTo(s*1.35,s*0.26); g.closePath(); g.fill(); });
  },
  /* Geheiligter: tiefblaue Robe mit Goldsaum, goldene Maske, strahlender Schein, Blitzstab */
  saint(g,s,t,sw,aim){
    g.save(); g.globalAlpha=0.55+Math.sin(t*2)*0.15; g.strokeStyle=C.gold2; g.lineWidth=Math.max(1,s*0.05);
    for(let i=0;i<10;i++){ const a=i/10*TAU+t*0.4; spLine(g,Math.cos(a)*s*0.55,-s*0.66+Math.sin(a)*s*0.55,Math.cos(a)*s*0.8,-s*0.66+Math.sin(a)*s*0.8,C.gold2,s*0.04); }
    g.beginPath(); g.arc(0,-s*0.66,s*0.55,0,TAU); g.stroke(); g.restore();
    spRobe(g,s,sw,'#1c1a3c',-0.45,0.45,0.8);
    g.strokeStyle=C.gold; g.lineWidth=Math.max(1,s*0.05); g.beginPath(); g.moveTo(-s*0.8+sw,s*0.92); g.lineTo(s*0.8-sw,s*0.92); g.moveTo(0,-s*0.4); g.lineTo(0,s*0.9); g.stroke();
    spCirc(g,0,-s*0.66,s*0.34,'#d8a838');
    g.fillStyle='#1a1206'; g.fillRect(-s*0.2,-s*0.72,s*0.14,s*0.05); g.fillRect(s*0.06,-s*0.72,s*0.14,s*0.05);
    spAim(g,aim,()=>{ spLine(g,s*0.2,s*0.1,s*1.05,s*0.1,'#cfc6b4',s*0.08);
      g.save(); g.globalAlpha=0.5+Math.sin(t*9)*0.3; spCirc(g,s*1.12,s*0.1,s*0.24,'#9bbcff'); g.restore(); spCirc(g,s*1.12,s*0.1,s*0.12,'#eef4ff'); });
  },
  /* Revolverheld: breiter Hut, gestreifter Poncho, rotes Halstuch, zwei Revolver */
  gunslinger(g,s,t,sw,aim){
    spRobe(g,s,sw,'#3a2a1c',0.2,0.4,0.55);
    g.fillStyle='#6a4428'; g.beginPath(); g.moveTo(-s*0.7,s*0.35); g.lineTo(0,-s*0.45); g.lineTo(s*0.7,s*0.35); g.closePath(); g.fill();
    g.strokeStyle='#c8a060'; g.lineWidth=Math.max(1,s*0.05); g.beginPath(); g.moveTo(-s*0.5,s*0.15); g.lineTo(s*0.5,s*0.15); g.moveTo(-s*0.35,0); g.lineTo(s*0.35,0); g.stroke();
    g.fillStyle='#a3161b'; g.beginPath(); g.moveTo(-s*0.28,-s*0.42); g.lineTo(s*0.28,-s*0.42); g.lineTo(0,-s*0.18); g.closePath(); g.fill();
    spCirc(g,0,-s*0.62,s*0.27,'#1a120c'); spCirc(g,s*0.1,-s*0.6,s*0.05,C.gold2);
    g.fillStyle='#2a1c10'; g.beginPath(); g.ellipse(0,-s*0.84,s*0.75,s*0.14,0,0,TAU); g.fill();
    g.beginPath(); g.ellipse(0,-s*1.0,s*0.32,s*0.22,0,0,TAU); g.fill();
    spAim(g,aim,()=>{ for(const o of [-0.16,0.26]){ g.fillStyle='#4a3a2a'; g.fillRect(s*0.28,s*o,s*0.18,s*0.12); spLine(g,s*0.42,s*(o+0.05),s*0.95,s*(o+0.05),'#b8bec6',s*0.09); } });
  },
  /* Scheiterhexe: Spitzhut, Haar aus Flammen, zerrissenes Kleid, Fackel */
  pyre(g,s,t,sw,aim){
    g.fillStyle='#24120e'; g.beginPath(); g.moveTo(-s*0.4,-s*0.4); g.lineTo(s*0.4,-s*0.4); g.lineTo(s*0.72-sw,s*0.6);
    for(let i=0;i<=6;i++){ const xx=s*0.72-(s*1.44)*(i/6); g.lineTo(xx,s+(i%2?-s*0.2:0)); } g.lineTo(-s*0.72+sw,s*0.6); g.closePath(); g.fill();
    for(let i=0;i<5;i++){ const a=-Math.PI*0.1-i*0.2*Math.PI, fl=Math.sin(t*12+i*1.7)*0.12;   // Flammenhaar
      g.fillStyle=i%2?C.candle:'#ffb040'; g.beginPath(); g.moveTo(Math.cos(a)*s*0.3,-s*0.6+Math.sin(a)*s*0.3);
      g.quadraticCurveTo(Math.cos(a)*s*0.65,-s*0.6+Math.sin(a)*s*(0.55+fl),Math.cos(a+0.25)*s*0.32,-s*0.6+Math.sin(a+0.25)*s*0.32); g.fill(); }
    spCirc(g,0,-s*0.6,s*0.3,'#1a0e0a'); spCirc(g,-s*0.11,-s*0.6,s*0.06,'#ffb040'); spCirc(g,s*0.11,-s*0.6,s*0.06,'#ffb040');
    g.fillStyle='#0c0806'; g.beginPath(); g.ellipse(0,-s*0.86,s*0.55,s*0.12,0,0,TAU); g.fill();
    g.beginPath(); g.moveTo(-s*0.3,-s*0.88); g.lineTo(s*0.15,-s*1.6); g.lineTo(s*0.3,-s*0.88); g.closePath(); g.fill();
    g.fillStyle=C.candle; g.fillRect(-s*0.3,-s*0.95,s*0.6,s*0.07);
    spAim(g,aim,()=>{ spLine(g,s*0.2,s*0.1,s*0.95,s*0.1,'#5a3a20',s*0.1);
      const fl=1+Math.sin(t*14)*0.15; g.fillStyle='#ffb040'; g.beginPath(); g.ellipse(s*1.08,s*0.1,s*0.2*fl,s*0.13,0,0,TAU); g.fill(); spCirc(g,s*1.08,s*0.1,s*0.08,'#fff0c0'); });
  },
  /* Predigt-Echo: geisterhafter Prediger mit rotem Heiligenschein und aufgeschlagenem Buch */
  preacher_c(g,s,t,sw,aim){
    g.save(); g.globalAlpha=0.82;
    g.fillStyle='#3a0a0e'; g.beginPath(); g.moveTo(-s*0.45,-s*0.4); g.lineTo(s*0.45,-s*0.4); g.lineTo(s*0.75,s*0.6);
    for(let i=0;i<=5;i++){ const xx=s*0.75-(s*1.5)*(i/5); g.lineTo(xx,s*0.85+Math.sin(t*5+i)*s*0.12); } g.lineTo(-s*0.75,s*0.6); g.closePath(); g.fill();
    spCirc(g,0,-s*0.62,s*0.36,'#24060a'); spCirc(g,-s*0.12,-s*0.62,s*0.06,'#f0e0d0'); spCirc(g,s*0.12,-s*0.62,s*0.06,'#f0e0d0');
    g.strokeStyle=C.blood2; g.lineWidth=Math.max(1,s*0.07); g.beginPath(); g.ellipse(0,-s*1.12,s*0.36,s*0.1,0,0,TAU); g.stroke();
    g.restore();
    spAim(g,aim,()=>{ g.fillStyle='#3a1a0a'; g.fillRect(s*0.3,-s*0.18,s*0.52,s*0.4); g.fillStyle='#e8dcc0'; g.fillRect(s*0.34,-s*0.15,s*0.21,s*0.34); g.fillRect(s*0.57,-s*0.15,s*0.21,s*0.34);
      g.save(); g.globalAlpha=0.4+Math.sin(t*6)*0.2; spCirc(g,s*0.56,0,s*0.3,C.blood2); g.restore(); });
  },
  /* Madenfürst: aufgedunsener Leib mit Ringen, Kapuze, kriechende Maden, Giftphiole */
  maggot_c(g,s,t,sw,aim){
    g.fillStyle='#4a5a1e'; g.beginPath(); g.ellipse(0,s*0.2,s*0.78,s*0.78,0,0,TAU); g.fill();
    g.strokeStyle='#2e3a10'; g.lineWidth=Math.max(1,s*0.06); for(let i=0;i<3;i++){ g.beginPath(); g.ellipse(0,s*0.2,s*0.78-i*s*0.2,s*0.3,0,0,Math.PI); g.stroke(); }
    for(let i=0;i<4;i++){ const a=t*1.5+i*1.6; spCirc(g,Math.cos(a)*s*0.55,s*0.2+Math.sin(a)*s*0.45,s*0.07,'#e8e0c0'); }
    g.fillStyle='#2a3410'; g.beginPath(); g.moveTo(-s*0.42,-s*0.3); g.quadraticCurveTo(-s*0.45,-s*1.1,0,-s*1.05); g.quadraticCurveTo(s*0.45,-s*1.1,s*0.42,-s*0.3); g.closePath(); g.fill();
    spCirc(g,0,-s*0.58,s*0.24,'#0e1406'); spCirc(g,-s*0.09,-s*0.6,s*0.05,C.sick); spCirc(g,s*0.09,-s*0.6,s*0.05,C.sick);
    spAim(g,aim,()=>{ g.fillStyle='#3a4a1a'; g.fillRect(s*0.3,-s*0.05,s*0.18,s*0.2); g.save(); g.globalAlpha=0.85; spCirc(g,s*0.68,s*0.05,s*0.2,C.sick); g.restore(); spCirc(g,s*0.68,s*0.05,s*0.08,'#e8ffa0'); });
  },
  /* Chirurgen-Schemen: blasse Schürze, weiße Maske, runde Brillengläser, Skalpellfächer */
  surgeon_c(g,s,t,sw,aim){
    g.save(); g.globalAlpha=0.88;
    spRobe(g,s,sw,'#2a3440',-0.45,0.44,0.72);
    g.fillStyle='#c8d4dc'; g.beginPath(); g.moveTo(-s*0.3,-s*0.35); g.lineTo(s*0.3,-s*0.35); g.lineTo(s*0.45,s*0.85); g.lineTo(-s*0.45,s*0.85); g.closePath(); g.fill();
    g.fillStyle='rgba(120,20,24,.6)'; g.beginPath(); g.arc(s*0.1,s*0.35,s*0.16,0,TAU); g.arc(-s*0.15,s*0.6,s*0.1,0,TAU); g.fill();
    spCirc(g,0,-s*0.62,s*0.32,'#8a9aa6');
    g.fillStyle='#e8eef2'; g.fillRect(-s*0.32,-s*0.58,s*0.64,s*0.22);
    g.fillStyle='#cfe8ff'; g.beginPath(); g.arc(-s*0.13,-s*0.72,s*0.1,0,TAU); g.arc(s*0.13,-s*0.72,s*0.1,0,TAU); g.fill();
    g.restore();
    spAim(g,aim,()=>{ for(const a of [-0.3,0,0.3]){ g.save(); g.rotate(a); spLine(g,s*0.3,0,s*1.0,0,'#d8e4ec',s*0.06); spLine(g,s*0.3,0,s*0.5,0,'#5a6a76',s*0.1); g.restore(); } });
  },
  /* Schlachtlamm: wolliger Leib, schwarzes Gesicht, gedrehte Hörner, rote Augen, Wollgeißel */
  lamb_c(g,s,t,sw,aim){
    g.fillStyle='#dcd4c4';
    for(let i=0;i<9;i++){ const a=i/9*TAU; g.beginPath(); g.arc(Math.cos(a)*s*0.48,s*0.15+Math.sin(a)*s*0.5,s*0.32,0,TAU); g.fill(); }
    g.beginPath(); g.arc(0,s*0.15,s*0.55,0,TAU); g.fill();
    spLine(g,-s*0.3,s*0.7,-s*0.3+sw,s*1.0,'#14100c',s*0.12); spLine(g,s*0.3,s*0.7,s*0.3-sw,s*1.0,'#14100c',s*0.12);
    g.fillStyle='#16120e'; g.beginPath(); g.ellipse(0,-s*0.55,s*0.3,s*0.36,0,0,TAU); g.fill();
    g.strokeStyle='#b89a6a'; g.lineWidth=Math.max(1,s*0.12);
    g.beginPath(); g.arc(-s*0.32,-s*0.72,s*0.2,Math.PI*0.2,Math.PI*1.7); g.stroke(); g.beginPath(); g.arc(s*0.32,-s*0.72,s*0.2,-Math.PI*0.7,Math.PI*0.8); g.stroke();
    spCirc(g,-s*0.11,-s*0.58,s*0.06,C.blood2); spCirc(g,s*0.11,-s*0.58,s*0.06,C.blood2);
    spAim(g,aim,()=>{ g.strokeStyle=C.bone; g.lineWidth=Math.max(1,s*0.07); g.beginPath(); g.moveTo(s*0.3,s*0.1);
      g.quadraticCurveTo(s*0.75,s*(0.1+Math.sin(t*10)*0.3),s*1.15,s*0.1); g.stroke(); spCirc(g,s*1.15,s*0.1,s*0.08,'#dcd4c4'); });
  },
  /* Gekreuzigtes Echo: Holzkreuz im Rücken, rote Robe, Dornenkrone, goldener Schein, Kreuzsalve */
  crucified_c(g,s,t,sw,aim){
    g.fillStyle='#3a2414'; g.fillRect(-s*0.12,-s*1.35,s*0.24,s*2.3); g.fillRect(-s*0.85,-s*0.55,s*1.7,s*0.2);
    spRobe(g,s,sw,'#4a0c10',-0.42,0.38,0.62);
    spCirc(g,0,-s*0.66,s*0.28,'#c8a890');
    spLine(g,-s*0.14,-s*0.64,-s*0.04,-s*0.66,'#2a1810',s*0.04); spLine(g,s*0.04,-s*0.66,s*0.14,-s*0.64,'#2a1810',s*0.04);
    g.strokeStyle='#4a3018'; g.lineWidth=Math.max(1,s*0.07); g.beginPath(); g.ellipse(0,-s*0.88,s*0.3,s*0.09,0,0,TAU); g.stroke();
    g.save(); g.globalAlpha=0.45+Math.sin(t*2.5)*0.15; g.strokeStyle=C.gold2; g.lineWidth=Math.max(1,s*0.06); g.beginPath(); g.arc(0,-s*0.7,s*0.48,0,TAU); g.stroke(); g.restore();
    spAim(g,aim,()=>{ g.fillStyle=C.gold2; g.fillRect(s*0.55,-s*0.03,s*0.5,s*0.16); g.fillRect(s*0.72,-s*0.2,s*0.14,s*0.5); spLine(g,s*0.2,s*0.05,s*0.6,s*0.05,'#8a6a3a',s*0.08); });
  },
};

/* ---------- GEGNER ---------- */
const ENEMY_ART={
  /* Verdammter: gebückter Ghul, Kopf vorgestreckt, Krallenarm */
  chaser(g,r,c,f){ const d=shade(c,-0.5), l=shade(c,0.3), sw=Math.sin(f/4*TAU)*r*0.22;
    spLine(g,-r*0.25,r*0.35,-r*0.35+sw,r*0.95,d,r*0.2); spLine(g,r*0.15,r*0.35,r*0.2-sw,r*0.95,d,r*0.2);
    g.fillStyle=c; g.beginPath(); g.ellipse(-r*0.1,r*0.02,r*0.72,r*0.55,-0.4,0,TAU); g.fill();
    g.strokeStyle=d; g.lineWidth=Math.max(1,r*0.07); for(let i=0;i<3;i++){ g.beginPath(); g.arc(-r*0.15,r*0.05,r*(0.2+i*0.14),-2.2,-1.3); g.stroke(); }
    g.fillStyle=l; g.beginPath(); g.ellipse(r*0.55,-r*0.18,r*0.36,r*0.3,0.2,0,TAU); g.fill();
    spCirc(g,r*0.7,-r*0.26,r*0.08,'#ffd9a0'); g.fillStyle='#1a0204'; g.fillRect(r*0.62,-r*0.06,r*0.26,r*0.07);
    spLine(g,r*0.2,r*0.12,r*0.92,r*0.32-sw*0.4,c,r*0.17);
    for(let k=-1;k<=1;k++) spLine(g,r*0.92,r*0.32-sw*0.4,r*1.15,r*(0.32+k*0.14)-sw*0.4,'#d8cdb8',r*0.06); },
  /* Made: bleicher Wurm aus Segmenten, windet sich */
  swarmer(g,r,c,f){ const ph=f/4*TAU;
    for(let i=4;i>=0;i--){ const x=-r*0.9+i*r*0.45, y=Math.sin(ph+i*1.1)*r*0.22, rr=r*(0.42+i*0.07);
      spCirc(g,x,y,rr,i===4?shade(c,0.25):(i%2?c:shade(c,0.12))); }
    spCirc(g,r*1.0,Math.sin(ph+4.4)*r*0.22,r*0.18,'#2a1408'); },
  /* Gepanzerter Büßer: wuchtige Rüstung mit Nieten, Topfhelm, Turmschild vorn */
  tank(g,r,c,f){ const d=shade(c,-0.45), sw=Math.sin(f/4*TAU)*r*0.12;
    g.fillStyle=d; g.fillRect(-r*0.45+sw,r*0.45,r*0.3,r*0.5); g.fillRect(r*0.1-sw,r*0.45,r*0.3,r*0.5);
    g.fillStyle=c; g.beginPath(); g.moveTo(-r*0.85,-r*0.4); g.lineTo(r*0.6,-r*0.4); g.lineTo(r*0.5,r*0.55); g.lineTo(-r*0.7,r*0.55); g.closePath(); g.fill();
    g.fillStyle=shade(c,0.25); g.beginPath(); g.ellipse(-r*0.7,-r*0.38,r*0.3,r*0.2,0,0,TAU); g.ellipse(r*0.48,-r*0.38,r*0.28,r*0.2,0,0,TAU); g.fill();
    for(let i=0;i<3;i++) spCirc(g,-r*0.45+i*r*0.35,r*0.1,r*0.05,'#c8bca8');
    g.fillStyle='#4a4e56'; g.fillRect(-r*0.3,-r*0.98,r*0.55,r*0.6); g.fillStyle='#0a0a0c'; g.fillRect(-r*0.22,-r*0.75,r*0.4,r*0.07);
    spCirc(g,r*0.1,-r*0.72,r*0.05,C.blood2);
    g.fillStyle='#3a3228'; g.fillRect(r*0.55,-r*0.75,r*0.38,r*1.5); g.strokeStyle='#8a7a5a'; g.lineWidth=Math.max(1,r*0.06); g.strokeRect(r*0.55,-r*0.75,r*0.38,r*1.5);
    g.fillStyle='#8a1418'; g.fillRect(r*0.7,-r*0.55,r*0.08,r*0.9); g.fillRect(r*0.6,-r*0.25,r*0.28,r*0.08); },
  /* Ketzer-Schütze: Kapuzenrobe, gelbe Augen, Armbrust */
  shooter(g,r,c,f){ const d=shade(c,-0.45);
    g.fillStyle=c; g.beginPath(); g.moveTo(-r*0.15,-r*1.0); g.quadraticCurveTo(r*0.5,-r*0.9,r*0.55,r*0.95); g.lineTo(-r*0.75,r*0.95); g.quadraticCurveTo(-r*0.7,-r*0.4,-r*0.15,-r*1.0); g.fill();
    g.fillStyle=d; g.beginPath(); g.ellipse(r*0.12,-r*0.42,r*0.3,r*0.32,0,0,TAU); g.fill();
    spCirc(g,r*0.06,-r*0.45,r*0.07,'#ffe060'); spCirc(g,r*0.24,-r*0.45,r*0.07,'#ffe060');
    spLine(g,0,r*0.1,r*1.1,r*0.1,'#4a3220',r*0.13);
    g.strokeStyle='#8a6a3a'; g.lineWidth=Math.max(1,r*0.09); g.beginPath(); g.arc(r*0.85,r*0.1,r*0.42,-1.25,1.25); g.stroke();
    spLine(g,r*0.98,-r*0.3,r*0.98,r*0.5,'#d8cdb8',r*0.04); },
  /* Pestbeule: aufgedunsener Sack mit Eiterbeulen, tropfendes Maul */
  spitter(g,r,c,f){ const d=shade(c,-0.5), pulse=1+Math.sin(f/4*TAU)*0.05;
    spLine(g,-r*0.4,r*0.6,-r*0.45,r*0.98,d,r*0.18); spLine(g,r*0.3,r*0.6,r*0.35,r*0.98,d,r*0.18);
    g.fillStyle=shade(c,-0.15); g.beginPath(); g.ellipse(0,0,r*0.92*pulse,r*0.8*pulse,0,0,TAU); g.fill();
    for(const [x,y,rr] of [[-0.4,-0.35,0.22],[0.1,-0.5,0.16],[-0.15,0.25,0.18],[0.35,0.3,0.12],[-0.55,0.15,0.12]]){ spCirc(g,r*x,r*y,r*rr,shade(c,0.25)); spCirc(g,r*x-r*rr*0.3,r*y-r*rr*0.3,r*rr*0.35,'#f0f8c0'); }
    g.fillStyle='#1a2006'; g.beginPath(); g.ellipse(r*0.7,-r*0.05,r*0.2,r*0.28,0,0,TAU); g.fill();
    spLine(g,r*0.72,r*0.2,r*0.74,r*(0.45+Math.sin(f/4*TAU)*0.1),shade(c,0.2),r*0.08); },
  /* Selbstmörder: hagere Gestalt mit Pulverfass vor dem Bauch, Lunte */
  exploder(g,r,c,f){ const d='#2a1a10', sw=Math.sin(f/4*TAU)*r*0.25;
    spLine(g,-r*0.2,r*0.4,-r*0.3+sw,r*0.98,d,r*0.16); spLine(g,r*0.1,r*0.4,r*0.15-sw,r*0.98,d,r*0.16);
    g.fillStyle='#3a2418'; g.beginPath(); g.ellipse(-r*0.15,-r*0.15,r*0.35,r*0.55,0,0,TAU); g.fill();
    spCirc(g,-r*0.05,-r*0.78,r*0.28,'#5a3a28'); spCirc(g,r*0.08,-r*0.8,r*0.06,'#ffd080');
    g.fillStyle='#6a4020'; g.beginPath(); g.ellipse(r*0.35,r*0.15,r*0.48,r*0.55,0,0,TAU); g.fill();
    g.strokeStyle='#2a1a0c'; g.lineWidth=Math.max(1,r*0.07); for(const y of [-0.15,0.45]){ g.beginPath(); g.moveTo(-r*0.1,r*y); g.lineTo(r*0.8,r*y); g.stroke(); }
    spLine(g,r*0.35,-r*0.4,r*0.5,-r*0.75,'#c8bca8',r*0.05); },
  /* Geflügelter: kleiner Leib mit Fledermausflügeln (4 Flügelbilder) */
  flyer(g,r,c,f){ const wf=[0.9,0.35,-0.25,0.35][f%4], d=shade(c,-0.7);
    for(const sd of [-1,1]){ g.fillStyle=d; g.beginPath(); g.moveTo(0,-r*0.1);
      g.lineTo(sd*r*1.25,-r*0.1-wf*r*0.9); g.lineTo(sd*r*1.1,r*0.25-wf*r*0.4); g.lineTo(sd*r*0.75,r*0.05-wf*r*0.2); g.lineTo(sd*r*0.5,r*0.3); g.closePath(); g.fill(); }
    g.fillStyle=c; g.beginPath(); g.ellipse(0,r*0.05,r*0.42,r*0.55,0,0,TAU); g.fill();
    spCirc(g,r*0.15,-r*0.45,r*0.3,shade(c,0.2)); spCirc(g,r*0.28,-r*0.5,r*0.08,'#fff0ff');
    g.fillStyle=d; g.beginPath(); g.moveTo(r*0.05,-r*0.7); g.lineTo(-r*0.05,-r*0.95); g.lineTo(r*0.2,-r*0.72); g.fill(); },
  /* Kaplan: Priesterrobe mit weißem Kragen, Kreuzstab */
  healer(g,r,c,f){ const d=shade(c,-0.6);
    g.fillStyle=d; g.beginPath(); g.moveTo(-r*0.35,-r*0.45); g.lineTo(r*0.35,-r*0.45); g.lineTo(r*0.65,r*0.98); g.lineTo(-r*0.65,r*0.98); g.closePath(); g.fill();
    g.fillStyle=shade(c,-0.3); g.fillRect(-r*0.08,-r*0.4,r*0.16,r*1.35);
    g.fillStyle='#e8e8e0'; g.fillRect(-r*0.25,-r*0.5,r*0.5,r*0.1);
    spCirc(g,0,-r*0.72,r*0.27,'#c8b8a0'); g.fillStyle='#1a1410'; g.fillRect(-r*0.15,-r*0.76,r*0.3,r*0.06);
    spLine(g,r*0.6,-r*1.1,r*0.6,r*0.95,'#6a5030',r*0.1);
    g.fillStyle=shade(c,0.35); g.fillRect(r*0.54,-r*1.18,r*0.12,r*0.45); g.fillRect(r*0.42,-r*1.04,r*0.36,r*0.11); },
  /* Beschwörer: Kapuzenrobe, erhobene Hände, leuchtende Augen */
  summoner(g,r,c,f){ const d=shade(c,-0.55), up=Math.sin(f/4*TAU)*r*0.1;
    g.fillStyle=d; g.beginPath(); g.moveTo(-r*0.4,-r*0.5); g.lineTo(r*0.4,-r*0.5); g.lineTo(r*0.75,r*0.98); g.lineTo(-r*0.75,r*0.98); g.closePath(); g.fill();
    g.fillStyle=c; g.beginPath(); g.moveTo(-r*0.4,-r*0.35); g.quadraticCurveTo(-r*0.45,-r*1.15,0,-r*1.1); g.quadraticCurveTo(r*0.45,-r*1.15,r*0.4,-r*0.35); g.closePath(); g.fill();
    spCirc(g,0,-r*0.6,r*0.24,'#0c0610'); spCirc(g,-r*0.09,-r*0.62,r*0.06,'#e0c0ff'); spCirc(g,r*0.09,-r*0.62,r*0.06,'#e0c0ff');
    spLine(g,-r*0.35,-r*0.2,-r*0.75,-r*0.75-up,c,r*0.14); spLine(g,r*0.35,-r*0.2,r*0.75,-r*0.75-up,c,r*0.14);
    spCirc(g,-r*0.78,-r*0.8-up,r*0.1,'#e0c0ff'); spCirc(g,r*0.78,-r*0.8-up,r*0.1,'#e0c0ff'); },
};
const ENEMY_FRAMES={chaser:4,swarmer:4,tank:4,spitter:4,exploder:4,flyer:4,summoner:4};

/* Vorgezeichnete Gegner-Bilder: Figur + heller Umriss (hebt sich vom dunklen Boden ab), optional weiß (Treffer-Blitz) */
const SPRITE_CACHE=new Map();
function enemySprite(type,r,col,frame,white){
  const key=type+'|'+r+'|'+col+'|'+frame+'|'+(white?1:0); let out=SPRITE_CACHE.get(key); if(out)return out;
  const pad=Math.ceil(r*1.6)+4, size=pad*2;
  const base=document.createElement('canvas'); base.width=base.height=size; const bg=base.getContext('2d');
  bg.translate(pad,pad); (ENEMY_ART[type]||ENEMY_ART.chaser)(bg,r,col,frame);
  if(white){ bg.setTransform(1,0,0,1,0,0); bg.globalCompositeOperation='source-atop'; bg.fillStyle='rgba(255,255,255,.9)'; bg.fillRect(0,0,size,size); }
  out=document.createElement('canvas'); out.width=out.height=size; const og=out.getContext('2d');
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]]) og.drawImage(base,dx*1.5,dy*1.5);
  og.globalCompositeOperation='source-in'; og.fillStyle='rgba(255,236,210,.45)'; og.fillRect(0,0,size,size);
  og.globalCompositeOperation='source-over'; og.drawImage(base,0,0);
  out._pad=pad; SPRITE_CACHE.set(key,out); return out;
}
