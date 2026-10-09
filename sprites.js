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

/* ---------- DIE 4 START-CHARAKTERE (gleiche Identität wie vorher, mehr Details) ---------- */
Object.assign(HERO_ART,{
  /* Büßer: Kapuzenkutte mit Strickgürtel, ein rot glühendes Auge, Holzkreuz, Revolver */
  penitent(g,s,t,sw,aim){
    spRobe(g,s,sw,'#23222a',-0.45,0.48,0.8);
    g.strokeStyle='rgba(216,205,184,.35)'; g.lineWidth=Math.max(1,s*0.06); g.beginPath(); g.moveTo(-s*0.8+sw,s*0.97); g.lineTo(s*0.8-sw,s*0.97); g.stroke();
    g.strokeStyle='#8a7a4a'; g.lineWidth=Math.max(1,s*0.07); g.beginPath(); g.moveTo(-s*0.42,s*0.15); g.lineTo(s*0.42,s*0.15); g.stroke();
    spLine(g,s*0.1,s*0.15,s*0.16,s*0.55,'#8a7a4a',s*0.05);
    g.fillStyle='#5a4028'; g.fillRect(-s*0.05,-s*0.3,s*0.1,s*0.34); g.fillRect(-s*0.14,-s*0.22,s*0.28,s*0.08);
    g.fillStyle='#17161c'; g.beginPath(); g.moveTo(-s*0.5,-s*0.3); g.quadraticCurveTo(-s*0.55,-s*1.12,s*0.08,-s*1.12); g.quadraticCurveTo(s*0.52,-s*1.0,s*0.5,-s*0.3); g.closePath(); g.fill();
    g.fillStyle='#050507'; g.beginPath(); g.ellipse(s*0.06,-s*0.55,s*0.3,s*0.32,0,0,TAU); g.fill();
    spCirc(g,s*0.16,-s*0.58,s*0.08,C.blood2); g.save(); g.globalAlpha=0.35+Math.sin(t*3)*0.15; spCirc(g,s*0.16,-s*0.58,s*0.17,C.blood2); g.restore();
    spAim(g,aim,()=>{ g.fillStyle='#5a3a20'; g.beginPath(); g.moveTo(s*0.28,s*0.05); g.lineTo(s*0.48,s*0.05); g.lineTo(s*0.4,s*0.38); g.lineTo(s*0.26,s*0.36); g.closePath(); g.fill();
      g.fillStyle='#9aa0a8'; g.fillRect(s*0.4,-s*0.08,s*0.2,s*0.2); spLine(g,s*0.55,-s*0.02,s*1.08,-s*0.02,C.bone,s*0.12); });
  },
  /* Henker: spitze schwarze Henkerskapuze, nackte Arme, Lederschürze, großes Beil */
  executioner(g,s,t,sw,aim){ const ww=1.2;
    spLine(g,-s*0.3,s*0.55,-s*0.38+sw,s*1.0,'#1a1214',s*0.22); spLine(g,s*0.3,s*0.55,s*0.38-sw,s*1.0,'#1a1214',s*0.22);
    g.fillStyle='#8a6a58'; g.beginPath(); g.ellipse(0,-s*0.05,s*0.62*ww,s*0.55,0,0,TAU); g.fill();
    g.fillStyle='#4a2418'; g.beginPath(); g.moveTo(-s*0.42,-s*0.25); g.lineTo(s*0.42,-s*0.25); g.lineTo(s*0.5,s*0.85); g.lineTo(-s*0.5,s*0.85); g.closePath(); g.fill();
    g.strokeStyle='#2a140c'; g.lineWidth=Math.max(1,s*0.05); g.beginPath(); g.moveTo(-s*0.42,s*0.2); g.lineTo(s*0.42,s*0.2); g.stroke();
    spCirc(g,-s*0.68*ww,-s*0.15,s*0.2,'#9a7a66');
    g.fillStyle='#0f0c0e'; g.beginPath(); g.moveTo(-s*0.36,-s*0.32); g.lineTo(0,-s*1.35); g.lineTo(s*0.36,-s*0.32); g.closePath(); g.fill();
    spCirc(g,-s*0.12,-s*0.62,s*0.07,C.blood2); spCirc(g,s*0.12,-s*0.62,s*0.07,C.blood2);
    spAim(g,aim,()=>{ spLine(g,s*0.25,s*0.15,s*1.15,s*0.15,'#5a3a20',s*0.16);
      g.fillStyle='#9aa0a8'; g.beginPath(); g.moveTo(s*0.85,s*0.15); g.quadraticCurveTo(s*1.0,-s*0.55,s*1.45,-s*0.35); g.quadraticCurveTo(s*1.25,s*0.15,s*1.45,s*0.62); g.quadraticCurveTo(s*1.0,s*0.75,s*0.85,s*0.15); g.fill();
      g.strokeStyle='#d8dee4'; g.lineWidth=Math.max(1,s*0.05); g.beginPath(); g.moveTo(s*1.45,-s*0.35); g.quadraticCurveTo(s*1.25,s*0.15,s*1.45,s*0.62); g.stroke(); });
  },
  /* Ketzerin: Hörner, langes Haar, zerrissenes Kleid mit grünen Runen, grünes Leuchten, Stab mit Giftkugel */
  heretic(g,s,t,sw,aim){
    g.save(); g.globalAlpha=0.1+Math.sin(t*2.5)*0.05; spCirc(g,0,-s*0.1,s*0.85,C.sick); g.restore();
    g.fillStyle='#191a14'; g.beginPath(); g.moveTo(-s*0.35,-s*0.4); g.lineTo(s*0.35,-s*0.4); g.lineTo(s*0.66-sw,s*0.55);
    for(let i=0;i<=6;i++){ const xx=s*0.66-(s*1.32)*(i/6); g.lineTo(xx,s+(i%2?-s*0.2:0)); } g.lineTo(-s*0.66+sw,s*0.55); g.closePath(); g.fill();
    g.strokeStyle='rgba(155,191,58,.75)'; g.lineWidth=Math.max(1,s*0.04);
    for(let i=0;i<3;i++){ const y=s*(0.05+i*0.25); g.beginPath(); g.moveTo(-s*0.2,y); g.lineTo(-s*0.1,y-s*0.1); g.lineTo(0,y); g.lineTo(s*0.1,y-s*0.1); g.lineTo(s*0.2,y); g.stroke(); }
    g.fillStyle='#24261a'; g.beginPath(); g.moveTo(-s*0.38,-s*0.6); g.quadraticCurveTo(-s*0.6,s*0.1,-s*0.32,s*0.2); g.lineTo(-s*0.2,-s*0.4); g.closePath(); g.fill();
    spCirc(g,0,-s*0.52,s*0.34,'#14140f');
    g.fillStyle='#0a0a08'; g.beginPath(); g.moveTo(-s*0.24,-s*0.78); g.quadraticCurveTo(-s*0.55,-s*1.0,-s*0.48,-s*1.28); g.lineTo(-s*0.12,-s*0.84); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(s*0.24,-s*0.78); g.quadraticCurveTo(s*0.55,-s*1.0,s*0.48,-s*1.28); g.lineTo(s*0.12,-s*0.84); g.closePath(); g.fill();
    spCirc(g,-s*0.12,-s*0.52,s*0.07,C.sick); spCirc(g,s*0.12,-s*0.52,s*0.07,C.sick);
    spAim(g,aim,()=>{ spLine(g,s*0.15,s*0.12,s*1.0,s*0.0,'#3a3a24',s*0.1);
      g.save(); g.globalAlpha=0.5+Math.sin(t*5)*0.25; spCirc(g,s*1.08,0,s*0.24,C.sick); g.restore(); spCirc(g,s*1.08,0,s*0.12,'#e8ffa0'); });
  },
  /* Pestpriester: Krempenhut, knöcherne Schnabelmaske mit Glasaugen, langer Mantel mit Knöpfen, Räucherfass */
  plaguepriest(g,s,t,sw,aim){
    spRobe(g,s,sw,'#16160f',-0.35,0.4,0.66);
    g.strokeStyle='#2a2a18'; g.lineWidth=Math.max(1,s*0.05); g.beginPath(); g.moveTo(0,-s*0.3); g.lineTo(0,s*0.95); g.stroke();
    for(let i=0;i<4;i++) spCirc(g,s*0.08,-s*0.15+i*s*0.25,s*0.045,'#8a7a4a');
    spCirc(g,0,-s*0.55,s*0.36,'#12120c');
    g.fillStyle='#cdbf8a'; g.beginPath(); g.moveTo(s*0.1,-s*0.6); g.quadraticCurveTo(s*0.6,-s*0.5,s*0.85,-s*0.25); g.quadraticCurveTo(s*0.45,-s*0.32,s*0.1,-s*0.4); g.closePath(); g.fill();
    g.strokeStyle='#8a7a4a'; g.lineWidth=Math.max(1,s*0.03); g.beginPath(); g.moveTo(s*0.15,-s*0.5); g.lineTo(s*0.7,-s*0.32); g.stroke();
    spCirc(g,-s*0.1,-s*0.62,s*0.1,'#2a2a18'); spCirc(g,-s*0.1,-s*0.62,s*0.06,'rgba(155,191,58,.85)');
    g.fillStyle='#0a0a06'; g.beginPath(); g.ellipse(0,-s*0.85,s*0.62,s*0.15,0,0,TAU); g.fill(); g.beginPath(); g.ellipse(0,-s*1.02,s*0.3,s*0.22,0,0,TAU); g.fill();
    g.fillStyle='#3a3a20'; g.fillRect(-s*0.3,-s*0.95,s*0.6,s*0.06);
    spAim(g,aim,()=>{ g.strokeStyle='#6a6a40'; g.lineWidth=Math.max(1,s*0.05); g.beginPath(); g.moveTo(s*0.3,s*0.05); g.lineTo(s*0.82,s*0.22); g.stroke();
      spCirc(g,s*0.9,s*0.25,s*0.2,'#5a5a30'); g.save(); g.globalAlpha=0.4+Math.sin(t*4)*0.2; spCirc(g,s*0.95+Math.sin(t*2)*s*0.08,s*0.0,s*0.22,C.sick); g.restore(); });
  },
});

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

/* ---------- BOSSE 6–10 (eigene Figuren; col = Körperfarbe bzw. Weiß beim Treffer-Blitz) ---------- */
const BOSS_ART={
  /* Choral der Asche: drei Aschenmasken kreisen um eine dunkle Flamme */
  choir(g,e,col,t){ const s=e.r, fl=col==='#fff'?'#fff':'#5a5048';
    g.save(); g.globalAlpha=0.5+Math.sin(t*4)*0.15; spCirc(g,0,0,s*0.9,'#2a2420'); g.restore();
    g.fillStyle=fl; g.beginPath(); g.moveTo(0,-s*1.05); g.quadraticCurveTo(s*0.6,-s*0.2,s*0.35,s*0.5); g.quadraticCurveTo(0,s*0.75,-s*0.35,s*0.5); g.quadraticCurveTo(-s*0.6,-s*0.2,0,-s*1.05); g.fill();
    spCirc(g,0,s*0.05,s*0.18,'#e08a2f');
    for(let i=0;i<3;i++){ const a=t*1.2+i*TAU/3, x=Math.cos(a)*s*0.95, y=Math.sin(a)*s*0.7;
      g.fillStyle=col==='#fff'?'#fff':'#b8b0a0'; g.beginPath(); g.ellipse(x,y,s*0.28,s*0.34,0,0,TAU); g.fill();
      g.fillStyle='#14100c'; g.beginPath(); g.ellipse(x-s*0.1,y-s*0.06,s*0.05,s*0.08,0,0,TAU); g.ellipse(x+s*0.1,y-s*0.06,s*0.05,s*0.08,0,0,TAU); g.fill();
      g.beginPath(); g.ellipse(x,y+s*0.14,s*0.07,s*0.1+Math.sin(t*6+i)*s*0.03,0,0,TAU); g.fill(); } },
  /* Mutter der Seuche: aufgedunsener Leib voller Beulen, Madenkrone */
  mother(g,e,col,t){ const s=e.r, body=col==='#fff'?'#fff':'#5a6a24', pulse=1+Math.sin(t*3)*0.04;
    g.fillStyle=body; g.beginPath(); g.ellipse(0,s*0.15,s*1.05*pulse,s*0.9*pulse,0,0,TAU); g.fill();
    for(const [x,y,r] of [[-0.5,-0.1,0.24],[0.45,0.3,0.2],[-0.2,0.55,0.18],[0.6,-0.25,0.15],[-0.75,0.4,0.14],[0.15,-0.4,0.13]]){ spCirc(g,s*x,s*y,s*r,'#8aa03a'); spCirc(g,s*x-s*r*0.3,s*y-s*r*0.3,s*r*0.35,'#e8f8b0'); }
    spCirc(g,0,-s*0.75,s*0.36,'#3a4418'); spCirc(g,-s*0.13,-s*0.78,s*0.07,C.sick); spCirc(g,s*0.13,-s*0.78,s*0.07,C.sick);
    g.fillStyle='#1a2006'; g.beginPath(); g.ellipse(0,-s*0.6,s*0.14,s*0.07,0,0,TAU); g.fill();
    for(let i=0;i<6;i++){ const a=-Math.PI*0.9+i*Math.PI*0.16, w=Math.sin(t*5+i)*s*0.05; spLine(g,Math.cos(a)*s*0.35,-s*0.75+Math.sin(a)*s*0.35,Math.cos(a)*s*0.55+w,-s*0.75+Math.sin(a)*s*0.55,'#e8e0c0',s*0.08); } },
  /* Der Eiserne Heilige: Plattenrüstung, Heiligenschein, Turmschild; leuchtet golden im Schildwall */
  ironsaint(g,e,col,t){ const s=e.r, steel=col==='#fff'?'#fff':'#6d727c';
    if(e.shieldT>0){ g.save(); g.globalAlpha=0.35+Math.sin(t*10)*0.15; spCirc(g,0,0,s*1.35,C.gold2); g.restore(); }
    g.fillStyle='#3a3e46'; g.fillRect(-s*0.45,s*0.45,s*0.3,s*0.55); g.fillRect(s*0.15,s*0.45,s*0.3,s*0.55);
    g.fillStyle=steel; g.beginPath(); g.moveTo(-s*0.75,-s*0.35); g.lineTo(s*0.75,-s*0.35); g.lineTo(s*0.55,s*0.6); g.lineTo(-s*0.55,s*0.6); g.closePath(); g.fill();
    g.fillStyle='#8a909a'; g.beginPath(); g.ellipse(-s*0.7,-s*0.32,s*0.3,s*0.2,0,0,TAU); g.ellipse(s*0.7,-s*0.32,s*0.3,s*0.2,0,0,TAU); g.fill();
    g.fillStyle='#4a4e56'; g.fillRect(-s*0.3,-s*1.0,s*0.6,s*0.65); g.fillStyle='#0a0a0c'; g.fillRect(-s*0.22,-s*0.75,s*0.44,s*0.07); g.fillRect(-s*0.035,-s*0.85,s*0.07,s*0.35);
    g.strokeStyle=C.gold2; g.lineWidth=Math.max(1,s*0.07); g.beginPath(); g.ellipse(0,-s*1.15,s*0.42,s*0.12,0,0,TAU); g.stroke();
    g.fillStyle='#3a3228'; g.fillRect(s*0.6,-s*0.7,s*0.45,s*1.5); g.strokeStyle=C.gold; g.lineWidth=Math.max(1,s*0.06); g.strokeRect(s*0.6,-s*0.7,s*0.45,s*1.5);
    g.fillStyle=C.gold2; g.fillRect(s*0.78,-s*0.5,s*0.09,s*1.0); g.fillRect(s*0.66,-s*0.2,s*0.33,s*0.09); },
  /* Schlund von Golgotha: riesiges Maul mit rotierendem Zahnkranz, Augen ringsum */
  maw(g,e,col,t){ const s=e.r;
    spCirc(g,0,0,s*1.1,col==='#fff'?'#fff':'#3a1418'); spCirc(g,0,0,s*0.78,'#120406');
    g.save(); g.rotate(t*0.6); g.fillStyle='#e8dcc0';
    for(let i=0;i<16;i++){ const a=i/16*TAU; g.save(); g.rotate(a); g.beginPath(); g.moveTo(s*0.78,-s*0.08); g.lineTo(s*0.5,0); g.lineTo(s*0.78,s*0.08); g.closePath(); g.fill(); g.restore(); }
    g.restore();
    g.save(); g.globalAlpha=0.5+Math.sin(t*3)*0.2; spCirc(g,0,0,s*0.3,'#5a0a0e'); g.restore();
    for(let i=0;i<6;i++){ const a=i/6*TAU+0.3, x=Math.cos(a)*s*0.95, y=Math.sin(a)*s*0.95; spCirc(g,x,y,s*0.13,'#e8dcc0'); spCirc(g,x+Math.cos(t+i)*s*0.04,y,s*0.06,C.blood2); } },
  /* Der Letzte Gekreuzigte: Gestalt am brennenden Kreuz, Aschenflügel, roter Schein */
  lastcross(g,e,col,t){ const s=e.r, p2=e.hp<e.maxHp*0.5;
    g.save(); g.globalAlpha=0.4+Math.sin(t*2)*0.15; g.strokeStyle=p2?C.blood2:C.gold2; g.lineWidth=Math.max(1,s*0.08); g.beginPath(); g.arc(0,-s*0.85,s*0.5,0,TAU); g.stroke(); g.restore();
    for(const sd of [-1,1]){ g.fillStyle='#2a2420'; g.beginPath(); g.moveTo(sd*s*0.3,-s*0.4);
      for(let i=0;i<=4;i++){ g.lineTo(sd*s*(0.6+i*0.22),-s*0.7+i*s*0.3+Math.sin(t*3+i)*s*0.06); } g.lineTo(sd*s*0.3,s*0.4); g.closePath(); g.fill(); }
    g.fillStyle='#3a2414'; g.fillRect(-s*0.12,-s*1.3,s*0.24,s*2.4); g.fillRect(-s*0.9,-s*0.6,s*1.8,s*0.2);
    if(p2) for(let i=0;i<5;i++){ const x=rand(-s*0.8,s*0.8), y=rand(-s*1.2,s*1.0); g.save(); g.globalAlpha=0.6; spCirc(g,x,y,s*0.08,i%2?C.candle:'#ffb040'); g.restore(); }
    g.fillStyle=col==='#fff'?'#fff':'#5a0c10'; g.beginPath(); g.moveTo(-s*0.3,-s*0.4); g.lineTo(s*0.3,-s*0.4); g.lineTo(s*0.45,s*0.9); g.lineTo(-s*0.45,s*0.9); g.closePath(); g.fill();
    spCirc(g,0,-s*0.68,s*0.26,'#c8a890'); g.strokeStyle='#4a3018'; g.lineWidth=Math.max(1,s*0.07); g.beginPath(); g.ellipse(0,-s*0.88,s*0.28,s*0.08,0,0,TAU); g.stroke();
    spCirc(g,-s*0.09,-s*0.68,s*0.04,'#1a0a0a'); spCirc(g,s*0.09,-s*0.68,s*0.04,'#1a0a0a'); },
};

/* ---------- GESCHOSSE: eine Form je Waffe, Blick nach +x (Flugrichtung), r = Geschossradius ---------- */
const PROJ_ART={
  /* Kugel: Hülse mit heller Spitze und Spur */
  bullet(g,r,c){ g.globalAlpha=0.35; spLine(g,-r*3,0,-r*0.6,0,c,r*0.8); g.globalAlpha=1;
    g.fillStyle=shade(c,-0.25); g.beginPath(); g.ellipse(0,0,r*1.4,r*0.62,0,0,TAU); g.fill(); spCirc(g,r*0.7,0,r*0.5,'#fff8e8'); },
  /* Schrotkorn */
  pellet(g,r,c){ spCirc(g,0,0,r,c); spCirc(g,-r*0.25,-r*0.25,r*0.4,'rgba(255,255,255,.55)'); },
  /* Nagel: dünner Stahlstift mit Kopf */
  nail(g,r,c){ spLine(g,-r*2.2,0,r*2.2,0,'#c8ccd2',r*0.6); g.fillStyle='#e8ecf0'; g.beginPath(); g.moveTo(r*2.2,-r*0.3); g.lineTo(r*3,0); g.lineTo(r*2.2,r*0.3); g.fill();
    g.fillStyle=shade(c,-0.2); g.fillRect(-r*2.4,-r*0.85,r*0.5,r*1.7); },
  /* Kanonenkugel */
  cannon(g,r,c){ g.globalAlpha=0.3; spCirc(g,-r*1.2,0,r*0.7,c); g.globalAlpha=1; spCirc(g,0,0,r,'#2a2620'); g.strokeStyle=c; g.lineWidth=Math.max(1,r*0.18); g.beginPath(); g.arc(0,0,r*0.92,0,TAU); g.stroke(); spCirc(g,-r*0.3,-r*0.3,r*0.3,'rgba(255,255,255,.5)'); },
  /* Bolzen mit Spitze und Federn */
  bolt(g,r,c){ spLine(g,-r*2.6,0,r*1.8,0,'#6a4a2a',r*0.45); g.fillStyle=c; g.beginPath(); g.moveTo(r*1.6,-r*0.7); g.lineTo(r*3,0); g.lineTo(r*1.6,r*0.7); g.closePath(); g.fill();
    g.fillStyle='#d8cdb8'; for(const sd of [-1,1]){ g.beginPath(); g.moveTo(-r*2.6,0); g.lineTo(-r*1.9,sd*r*0.8); g.lineTo(-r*1.5,0); g.fill(); } },
  /* Brandpfeil: Bolzen mit Flamme an der Spitze */
  firebolt(g,r,c){ PROJ_ART.bolt(g,r,'#8a6a3a'); g.globalAlpha=0.85; spCirc(g,r*2.6,0,r*1.1,c); g.globalAlpha=1; spCirc(g,r*2.7,0,r*0.5,'#fff0c0'); },
  /* Flamme: Tropfen mit Schweif nach hinten, heller Kern */
  flame(g,r,c){ g.fillStyle=c; g.beginPath(); g.moveTo(r*1.1,0); g.quadraticCurveTo(r*0.6,-r*1.1,-r*0.4,-r*0.6); g.quadraticCurveTo(-r*2.6,0,-r*0.4,r*0.6); g.quadraticCurveTo(r*0.6,r*1.1,r*1.1,0); g.fill();
    g.fillStyle='rgba(255,240,190,.85)'; g.beginPath(); g.ellipse(r*0.3,0,r*0.55,r*0.35,0,0,TAU); g.fill(); },
  /* Seuchenbrocken: unförmiger Klumpen mit Tropfen */
  blob(g,r,c){ g.fillStyle=c; g.beginPath(); for(let i=0;i<=10;i++){ const a=i/10*TAU, rr=r*(0.85+((i*7)%3)*0.12); g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr); } g.fill();
    spCirc(g,-r*1.2,r*0.3,r*0.28,c); spCirc(g,-r*1.6,-r*0.2,r*0.18,c); spCirc(g,r*0.25,-r*0.3,r*0.28,shade(c,0.4)); },
  /* Heiliges Kreuz (rotiert) */
  cross(g,r,c){ g.fillStyle=c; g.fillRect(-r*0.3,-r*1.3,r*0.6,r*2.6); g.fillRect(-r*1.0,-r*0.65,r*2.0,r*0.55); g.fillStyle='rgba(255,255,255,.6)'; g.fillRect(-r*0.12,-r*1.1,r*0.24,r*1.0); },
  /* Blitzfunke: Zickzack */
  spark(g,r,c){ g.globalAlpha=0.18; spCirc(g,0,0,r*1.1,c); g.globalAlpha=1; g.strokeStyle=c; g.lineWidth=Math.max(1.2,r*0.4); g.lineJoin='round'; g.beginPath();
    g.moveTo(-r*2.2,-r*0.3); g.lineTo(-r*0.9,r*0.6); g.lineTo(-r*0.2,-r*0.6); g.lineTo(r*0.8,r*0.5); g.lineTo(r*2,0); g.stroke(); g.strokeStyle='#fff'; g.lineWidth=Math.max(1,r*0.15); g.stroke(); },
  /* Lanze: langer Schaft mit Blattspitze */
  spear(g,r,c){ spLine(g,-r*3.5,0,r*1.6,0,'#8a6a3a',r*0.4); g.fillStyle=c; g.beginPath(); g.moveTo(r*1.2,0); g.quadraticCurveTo(r*2,-r*0.75,r*3.4,0); g.quadraticCurveTo(r*2,r*0.75,r*1.2,0); g.fill(); },
  /* Eissplitter: länglicher Kristall */
  shard(g,r,c){ g.fillStyle=c; g.beginPath(); g.moveTo(r*2.2,0); g.lineTo(0,-r*0.75); g.lineTo(-r*1.8,0); g.lineTo(0,r*0.75); g.closePath(); g.fill();
    g.fillStyle='rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(r*1.6,0); g.lineTo(0,-r*0.3); g.lineTo(-r*0.6,0); g.closePath(); g.fill(); },
  /* Sensenblatt (rotiert) */
  scythe(g,r,c){ g.fillStyle=c; g.beginPath(); g.arc(0,0,r*1.3,-Math.PI*0.9,Math.PI*0.35); g.arc(r*0.35,-r*0.2,r*0.95,Math.PI*0.35,-Math.PI*0.9,true); g.closePath(); g.fill();
    spLine(g,-r*0.2,0,-r*1.2,r*1.0,'#5a3a20',r*0.3); },
  /* Seraphsfeder */
  feather(g,r,c){ spLine(g,-r*2,0,r*1.8,0,'#fff8e0',r*0.2); g.fillStyle=c; g.beginPath(); g.moveTo(r*1.8,0); g.quadraticCurveTo(r*0.4,-r*1.1,-r*1.8,-r*0.15); g.lineTo(-r*1.8,r*0.15); g.quadraticCurveTo(r*0.4,r*1.1,r*1.8,0); g.fill();
    g.strokeStyle='rgba(255,255,255,.5)'; g.lineWidth=1; for(let i=-1;i<=1;i++){ g.beginPath(); g.moveTo(i*r*0.6,0); g.lineTo(i*r*0.6-r*0.5,-r*0.6); g.moveTo(i*r*0.6,0); g.lineTo(i*r*0.6-r*0.5,r*0.6); g.stroke(); } },
  /* Schienennagel / Gericht: langer heller Strahl */
  rail(g,r,c){ g.globalAlpha=0.35; spLine(g,-r*5,0,r*1.5,0,c,r*1.6); g.globalAlpha=1; spLine(g,-r*4,0,r*1.8,0,c,r*0.8); spLine(g,-r*3,0,r*1.8,0,'#fff',r*0.3); },
  /* Feuerball mit Flammenschweif */
  fireball(g,r,c){ g.globalAlpha=0.5; g.fillStyle=c; g.beginPath(); g.moveTo(r*0.3,-r); g.quadraticCurveTo(-r*3,0,r*0.3,r); g.fill(); g.globalAlpha=1;
    spCirc(g,0,0,r,c); spCirc(g,r*0.2,-r*0.1,r*0.55,'#ffe0a0'); },
  /* Leere: dunkler Kern, heller violetter Rand */
  void(g,r,c){ g.globalAlpha=0.35; spCirc(g,0,0,r*1.35,c); g.globalAlpha=1; spCirc(g,0,0,r,c); spCirc(g,0,0,r*0.72,'#0a0410'); spCirc(g,r*0.2,-r*0.2,r*0.15,'#fff'); },
  /* Hand Gottes: goldene Kugel mit Kreuz */
  holyorb(g,r,c){ g.globalAlpha=0.35; spCirc(g,0,0,r*1.4,c); g.globalAlpha=1; spCirc(g,0,0,r,c); g.fillStyle='#fff'; g.fillRect(-r*0.12,-r*0.6,r*0.24,r*1.2); g.fillRect(-r*0.45,-r*0.25,r*0.9,r*0.22); },
  /* Irrlicht (Höllenbrut, Predigtkreis): Kugel mit Schweif */
  wisp(g,r,c){ g.globalAlpha=0.45; g.fillStyle=c; g.beginPath(); g.moveTo(0,-r*0.8); g.quadraticCurveTo(-r*3,0,0,r*0.8); g.fill(); g.globalAlpha=1; spCirc(g,0,0,r,c); spCirc(g,r*0.2,-r*0.15,r*0.4,'#fff'); },
  /* Wurfflasche (rotiert) */
  flask(g,r,c){ g.fillStyle=c; g.beginPath(); g.arc(0,r*0.25,r,0,TAU); g.fill(); g.fillStyle='#c8bca8'; g.fillRect(-r*0.3,-r*1.35,r*0.6,r*0.75); g.fillStyle='#6a4a2a'; g.fillRect(-r*0.38,-r*1.55,r*0.76,r*0.3);
    spCirc(g,-r*0.35,0,r*0.25,'rgba(255,255,255,.5)'); },
  /* Frosttropfen */
  tear(g,r,c){ g.fillStyle=c; g.beginPath(); g.moveTo(r*1.1,0); g.quadraticCurveTo(r*0.6,-r*1.0,-r*1.8,0); g.quadraticCurveTo(r*0.6,r*1.0,r*1.1,0); g.fill(); spCirc(g,r*0.3,-r*0.2,r*0.3,'#fff'); },
  /* Schädel (rotiert) */
  skull(g,r,c){ spCirc(g,0,-r*0.15,r,c); g.fillStyle=c; g.fillRect(-r*0.55,r*0.4,r*1.1,r*0.6); g.fillStyle='#1a1410';
    g.beginPath(); g.ellipse(-r*0.38,-r*0.15,r*0.25,r*0.3,0,0,TAU); g.ellipse(r*0.38,-r*0.15,r*0.25,r*0.3,0,0,TAU); g.fill(); g.fillRect(-r*0.3,r*0.55,r*0.12,r*0.35); g.fillRect(r*0.18,r*0.55,r*0.12,r*0.35); },
  /* Skalpell */
  scalpel(g,r,c){ spLine(g,-r*2.4,0,-r*0.4,0,'#5a6a76',r*0.55); g.fillStyle=c; g.beginPath(); g.moveTo(-r*0.4,-r*0.35); g.lineTo(r*2.4,-r*0.1); g.quadraticCurveTo(r*1.4,r*0.6,-r*0.4,r*0.35); g.closePath(); g.fill(); },
};
/* rotierende Formen drehen sich unabhängig von der Flugrichtung */
const PROJ_SPIN={cross:9,scythe:16,flask:10,skull:11};
const PROJ_SHAPE={
  revolver:'bullet', scatter:'pellet', witchfire:'flame', nailgun:'nail', handcannon:'cannon', bolt:'bolt', flame:'flame', plague:'blob',
  trinity:'cross', wrath:'spark', gatling:'bullet', lance:'spear', shardstorm:'shard', frostlance:'spear', reaper:'scythe', seraph:'feather',
  judgement:'rail', tempest:'spark', apocalypse:'fireball', voidmaw:'void', godhand:'holyorb', sentry:'bullet', familiar:'wisp', railspike:'rail',
  stormcaller:'spark', pestflask:'flask', litany:'shard', tears:'tear', firearrow:'firebolt', skullsling:'skull',
  pestburst:'blob', reckoning:'bolt', hellwitch:'flame', naildriver:'nail', godsedge:'cross', blackdeath:'flask', bonehail:'skull', pyresalvo:'firebolt',
  bw_preach:'wisp', bw_plague:'blob', bw_surgeon:'scalpel', bw_lamb:'pellet', bw_cross:'cross',
};
/* Ausdehnung je Form in Vielfachen von r: [hinten, vorn, halbe Höhe] — passgenaue Bilder sind beim Drehen deutlich billiger */
const PROJ_EXT={bullet:[3.1,1.5,0.8],pellet:[1.1,1.1,1.1],nail:[2.5,3.1,0.9],cannon:[1.9,1.1,1.1],bolt:[2.7,3.1,0.9],firebolt:[2.7,3.9,1.2],
  flame:[2.6,1.2,1.15],blob:[1.8,1.1,1.1],cross:[1.4,1.4,1.4],spark:[2.3,2.1,1.2],spear:[3.6,3.5,0.8],shard:[1.9,2.3,0.8],scythe:[1.5,1.5,1.5],
  feather:[2.1,1.9,1.1],rail:[5.1,1.9,0.9],fireball:[3.0,1.1,1.1],void:[1.4,1.4,1.4],holyorb:[1.45,1.45,1.45],wisp:[3.0,1.1,1.0],
  flask:[1.6,1.6,1.6],tear:[1.9,1.2,1.0],skull:[1.2,1.2,1.2],scalpel:[2.5,2.5,0.7]};
const PROJ_ROUND={pellet:1,void:1,holyorb:1,blob:1};   // ohne Drehung zeichnen
const PROJ_CACHE=new Map();
function projSprite(shape,r,col){ const key=shape+'|'+r+'|'+col; let c=PROJ_CACHE.get(key); if(c)return c;
  const [bk,fr,hh]=PROJ_EXT[shape]||[2.6,2.6,2.6], m=3;
  c=document.createElement('canvas'); c.width=Math.ceil((bk+fr)*r)+m*2; c.height=Math.ceil(hh*2*r)+m*2;
  const g=c.getContext('2d'); c._ox=Math.ceil(bk*r)+m; c._oy=Math.ceil(hh*r)+m; g.translate(c._ox,c._oy);
  PROJ_ART[shape](g,r,col); PROJ_CACHE.set(key,c); return c; }
/* Zeichnet ein Spieler-Geschoss; unbekannte Waffen bleiben ein leuchtender Punkt */
function drawProjectile(g,b,time){ const shp=PROJ_SHAPE[b.wid];
  if(b.crit){ g.globalAlpha=0.35; spCirc(g,b.x,b.y,b.r*2.1,'#fff'); g.globalAlpha=1; }
  if(!shp){ g.globalAlpha=0.18; spCirc(g,b.x,b.y,b.r*1.6,b.color); g.globalAlpha=1; spCirc(g,b.x,b.y,b.r,b.crit?'#fff':b.color); return; }
  const spr=projSprite(shp,Math.max(2,Math.round(b.r)),b.color);
  if(PROJ_ROUND[shp]){ g.drawImage(spr,b.x-spr._ox,b.y-spr._oy); return; }
  const sp=PROJ_SPIN[shp], a=sp?time*sp+b.id:Math.atan2(b.vy,b.vx);
  g.translate(b.x,b.y); g.rotate(a); g.drawImage(spr,-spr._ox,-spr._oy); g.rotate(-a); g.translate(-b.x,-b.y); }
