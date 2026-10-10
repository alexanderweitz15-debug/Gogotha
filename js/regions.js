"use strict";
/* GOLGOTHA — Regionen: je Region zwei eigene Gegner (Bilder in sprites.js) und eine Umgebungsgefahr mit Vorwarnung.
   Gegner hängen über ETYPES[typ].ai (Verhalten), .guard (Geschoss-Abwehr, siehe updateBullets), .init und .onDeath am
   bestehenden Ablauf; Gefahren laufen in updateRegion/drawRegion (aufgerufen aus updateHazards/drawHazards). */
const REGION_TYPES=[['rat','sapper'],['bonewall','ghost'],['plaguedoc','colossus'],['hook','bull'],['crossbearer','seraph']];
const regionIdx=lvl=>clamp(Math.floor((lvl-1)/10),0,4);
const R={room:null,mines:[],zones:[],envT:7,chk:0,runId:null,dirty:false};
const firing=()=>!Admin.noFire;
const fireDiv=()=>diffMul('fireRate')*(G.curseFire||1);
/* Abstand halten und seitlich umkreisen (Fernkämpfer) */
function keepRange(e,dt,ang,d,sp,want,orbit){ const dir=e.wob>Math.PI?1:-1;
  if(e._mLos===false){ e.x+=Math.cos(ang)*sp*0.8*dt; e.y+=Math.sin(ang)*sp*0.8*dt; return; }   // ohne Sichtlinie erst um die Wand (map.js)
  let mx=Math.cos(ang+Math.PI/2*dir)*(orbit||0.45), my=Math.sin(ang+Math.PI/2*dir)*(orbit||0.45);
  if(d<want-30){ mx-=Math.cos(ang); my-=Math.sin(ang); } else if(d>want+30){ mx+=Math.cos(ang); my+=Math.sin(ang); }
  const m=Math.hypot(mx,my)||1; e.x+=mx/m*sp*dt; e.y+=my/m*sp*dt; }

/* ---------- GRÄBEN ---------- */
/* Grabenratte: im Rudel, schlängelt sich heran, beißt und weicht kurz zurück */
function aiRat(e,dt,p,ang,d,sp){
  if(e.fleeT>0) e.fleeT-=dt; else if(e.touchCd>0.5) e.fleeT=0.6;
  const a=e.fleeT>0?ang+Math.PI+Math.sin(e.wob)*0.8:ang+Math.sin(G.time*7+e.wob)*0.75*clamp(d/160,0,1);
  e.x+=Math.cos(a)*sp*dt; e.y+=Math.sin(a)*sp*dt; }
/* Grabenpionier: hält Abstand und wirft Tellerminen in deinen Weg (scharf nach 0,8 s, zünden mit Warnkreis) */
function aiSapper(e,dt,p,ang,d,sp){ keepRange(e,dt,ang,d,sp,240); e.fireCd-=dt;
  if(e.fireCd<=0 && firing() && d<520){ e.fireCd=rand(3.4,4.6)/fireDiv();
    const own=R.mines.filter(m=>m.owner===e); if(own.length>=3) R.mines.splice(R.mines.indexOf(own[0]),1);
    const k=rand(0.45,0.75), tx=clamp(e.x+(p.x-e.x)*k+rand(-30,30),ROOM.x+20,ROOM.x+ROOM.w-20), ty=clamp(e.y+(p.y-e.y)*k+rand(-30,30),ROOM.y+20,ROOM.y+ROOM.h-20);
    R.mines.push({sx:e.x,sy:e.y,x:tx,y:ty,t:0,owner:e,dmg:e.bdmg}); } }
function updateMines(dt){ for(let i=R.mines.length-1;i>=0;i--){ const m=R.mines[i]; m.t+=dt;
  if(m.t>16){ R.mines.splice(i,1); continue; }
  if(m.t<1.4) continue;   // 0,6 s Flug + 0,8 s Scharfmachen
  if(players.some(pl=>!pl.dead&&dist2(pl.x,pl.y,m.x,m.y)<(46+pl.r)*(46+pl.r))){ R.mines.splice(i,1);
    addHazard({kind:'circle',x:m.x,y:m.y,r:64,delay:0.5,dmg:m.dmg,color:'#e05a3a',onHit:h=>{ for(let k=0;k<12;k++)spawnParticle(h.x,h.y,C.candle,rand(1.5,3),rand(80,200)); Audio2.boss(); }}); } } }

/* ---------- KATAKOMBEN ---------- */
/* Knochenwand: stellt sich zwischen dich und ihre Verbündeten; Schüsse bleiben in ihr stecken (kein Durchschlag) */
function aiWall(e,dt,p,ang,d,sp){ e.reT=(e.reT||0)-dt;
  if(e._mLos===false){ e.x+=Math.cos(ang)*sp*dt; e.y+=Math.sin(ang)*sp*dt; return; }   // ohne Sichtlinie erst um die Kartenwand (map.js)
  if(e.reT<=0){ e.reT=0.5; let ax=0,ay=0,n=0; for(const o of enemies){ if(o===e||o.type==='bonewall'||dist2(o.x,o.y,p.x,p.y)>450*450)continue; ax+=o.x; ay+=o.y; n++; }
    const ca=n?Math.atan2(ay/n-p.y,ax/n-p.x):Math.atan2(e.y-p.y,e.x-p.x); e.tx=p.x+Math.cos(ca)*120; e.ty=p.y+Math.sin(ca)*120; }
  let dx=e.tx-e.x, dy=e.ty-e.y; const m=Math.hypot(dx,dy); if(m<=6)return; dx/=m; dy/=m;
  if(d<110){ dx-=Math.cos(ang)*1.3; dy-=Math.sin(ang)*1.3; }   // nicht durch den Spieler hindurch, außen herum
  const n=Math.hypot(dx,dy)||1; e.x+=dx/n*sp*dt; e.y+=dy/n*sp*dt; }
function guardWall(){ return 'absorb'; }
/* Gruftgeist: schwebt durch Hindernisse und wird zeitweise körperlos (Schüsse gehen durch, er verletzt dann auch nicht) */
function aiGhost(e,dt,p,ang,d,sp){ e.phT=(e.phT==null?rand(1,3):e.phT)-dt;
  if(e.phT<=0){ e.phased=!e.phased; e.phT=e.phased?1.4:rand(2.4,3.4); e.touch=!e.phased; for(let k=0;k<6;k++)spawnParticle(e.x,e.y,'#bfe8ff',1.4,50); }
  e.alpha=e.phased?0.28+Math.sin(G.uiTime*12)*0.06:0.9;
  const a=ang+Math.sin(G.time*2.2+e.wob)*0.6, s=sp*(e.phased?1.3:1); e.x+=Math.cos(a)*s*dt; e.y+=Math.sin(a)*s*dt; }
function guardGhost(e){ return e.phased?'pass':null; }

/* ---------- LAZARETT ---------- */
/* Pestarzt: umkreist dich und hinterlässt eine Spur vergifteten Bodens */
function aiDoc(e,dt,p,ang,d,sp){ keepRange(e,dt,ang,d,sp,150,1.1); e.dropT=(e.dropT||0)-dt;
  if(e.dropT<=0 && firing()){ e.dropT=0.75/fireDiv(); spawnPuddle(e.x,e.y,e.bdmg*0.35,{hostile:true,effect:'poison',life:3.2}); } }
/* Fleischkoloss: teilt sich beim Tod in zwei kleinere (zweimal) */
function splitColossus(e){ const gen=e.gen||0; if(gen>=2)return;
  for(const s of [-1,1]){ const a=rand(0,TAU), x=clamp(e.x+Math.cos(a)*e.r*0.7*s,ROOM.x+12,ROOM.x+ROOM.w-12), y=clamp(e.y+Math.sin(a)*e.r*0.7*s,ROOM.y+12,ROOM.y+ROOM.h-12);
    const c=spawnEnemy('colossus',x,y,G.level); c.gen=gen+1; c.r=Math.max(8,Math.round(e.r*0.72)); c.maxHp=c.hp=e.maxHp*0.4;
    c.speed=e.speed*1.3; c.dmg=e.dmg*0.7; c.xpValue=Math.max(1,Math.round((e.xpValue||1)*0.4)); c.spawnT=0.3; }
  for(let k=0;k<16;k++)spawnParticle(e.x,e.y,pick(['#b0685a','#7a1418','#d89a8a']),rand(2,4),rand(60,180)); G.shake=Math.max(G.shake,3); }
function guardSpawn(e){ return e.spawnT>0?'pass':null; }   // frisch abgespaltene Hälften: 0,3 s nicht vom selben Schuss treffbar

/* ---------- SCHLACHTHOF ---------- */
/* Fleischerhaken: zielt sichtbar (Linie) und wirft einen Kettenhaken; Treffer zieht dich zu ihm — Ausweichen reißt los */
function aiHook(e,dt,p,ang,d,sp){
  if(e.windT>0){ e.windT-=dt; e.aimA=ang;
    if(e.windT<=0){ const b={x:e.x,y:e.y,vx:Math.cos(ang)*560,vy:Math.sin(ang)*560,r:7,dmg:e.bdmg,life:440/560,color:'#c8ccd2',hookOf:e,onHit:pl=>{ if(!pl.dead)pl._pull={e,t:0.55}; }};
      ebullets.push(b); e.hookB=b; e.fireCd=rand(3.2,4.2)/fireDiv(); } return; }
  keepRange(e,dt,ang,d,sp,250); e.fireCd-=dt;
  if(e.fireCd<=0 && firing() && d<420){ e.windT=0.65; e.aimA=ang; } }
/* Schlachtstier: scharrt (Warnstreifen in Laufrichtung), stürmt dann geradeaus; prallt er gegen Wand/Hindernis, ist er benommen */
function aiBull(e,dt,p,ang,d,sp){ const st=e.st||0;
  if(st===0){ e.faceX=null; e.x+=Math.cos(ang)*sp*dt; e.y+=Math.sin(ang)*sp*dt; e.fireCd-=dt;
    if(e.fireCd<=0 && d<380 && d>80){ e.st=1; e.stT=0.9; e.cdx=Math.cos(ang); e.cdy=Math.sin(ang); e.faceX=e.cdx<0?-1:1; } return; }
  e.stT-=dt;
  if(st===1){ if(Math.random()<0.4)spawnParticle(e.x-e.cdx*e.r,e.y+e.r*0.8,'#5a3a2a',1.5,40); if(e.stT<=0){ e.st=2; e.stT=0.75; G.shake=Math.max(G.shake,2); } return; }
  if(st===2){ const v=620*(sp/Math.max(1,e.speed)); e.x+=e.cdx*v*dt; e.y+=e.cdy*v*dt;
    if(Math.random()<0.5)spawnParticle(e.x-e.cdx*e.r,e.y,'#8a1418',1.6,50);
    for(const pl of players){ if(pl.dead||e.touchCd>0||dist2(pl.x,pl.y,e.x,e.y)>(e.r+pl.r)*(e.r+pl.r))continue;
      hurtPlayer(e.dmg*1.6,pl); e.touchCd=0.6; pl.x=clamp(pl.x-e.cdy*34,ROOM.x+pl.r,ROOM.x+ROOM.w-pl.r); pl.y=clamp(pl.y+e.cdx*34,ROOM.y+pl.r,ROOM.y+ROOM.h-pl.r); }
    const wall=e.x<=ROOM.x+e.r||e.x>=ROOM.x+ROOM.w-e.r||e.y<=ROOM.y+e.r||e.y>=ROOM.y+ROOM.h-e.r, ob=obstacles.some(o=>dist2(o.x,o.y,e.x,e.y)<(o.r+e.r)*(o.r+e.r));
    if(wall||ob){ e.st=3; e.stT=1.1; G.shake=Math.max(G.shake,5); for(let k=0;k<10;k++)spawnParticle(e.x+e.cdx*e.r,e.y+e.cdy*e.r,'#b8b0a0',2,140); }
    else if(e.stT<=0){ e.st=3; e.stT=0.45; } return; }
  if(e.stT<=0){ e.st=0; e.fireCd=rand(2.4,3.4); } }

/* ---------- GOLGOTHA ---------- */
/* Kreuzträger: das Kreuz vor ihm fängt Schüsse von vorn ab (6 Treffer, dann 2 s Taumeln); von der Seite oder hinten trifft man immer */
function aiCross(e,dt,p,ang,d,sp){ if(e.fa==null)e.fa=ang;
  if(e.stagT>0){ e.stagT-=dt; return; }   // taumelt: Schild unten, steht still
  const df=angDiff(ang,e.fa), tr=1.5*dt; e.fa+=clamp(df,-tr,tr); e.faceX=Math.cos(e.fa)<0?-1:1;
  const k=Math.abs(df)<1.2?1:0.35; e.x+=Math.cos(e.fa)*sp*k*dt; e.y+=Math.sin(e.fa)*sp*k*dt; }
/* Das Kreuz fängt 6 Treffer ab, dann taumelt er 2 s ohne Schild (sonst wäre er bei automatischem Zielen praktisch unverwundbar) */
function guardCross(e,b){ if(e.stagT>0||Math.abs(angDiff(Math.atan2(-b.vy,-b.vx),e.fa||0))>1.15)return null;
  for(let k=0;k<4;k++)spawnParticle(b.x,b.y,C.gold2,1.5,110);
  e.blk=(e.blk||0)+1; if(e.blk>=6){ e.blk=0; e.stagT=2; spawnFloater(e.x,e.y-e.r-10,'✝',true); for(let k=0;k<10;k++)spawnParticle(e.x,e.y,C.gold2,2,140); }
  return 'block'; }
/* Seraph: schwebt über allem und richtet einen Lichtstrahl aus (1 s Warnstreifen, dann Treffer entlang der Linie) */
function aiSeraph(e,dt,p,ang,d,sp){
  if(e.castT>0){ e.castT-=dt; return; }
  keepRange(e,dt,ang,d,sp,300,0.7); e.fireCd-=dt;
  if(e.fireCd<=0 && firing() && d<560){ e.fireCd=rand(3.6,4.8)/fireDiv(); e.castT=1.0; const L=900;
    addHazard({kind:'line',x1:e.x,y1:e.y,x2:e.x+Math.cos(ang)*L,y2:e.y+Math.sin(ang)*L,w:30,delay:1.0,dmg:e.bdmg*1.5,color:'#fff2c0'}); } }

Object.assign(ETYPES,{
 rat:{r:7,hp:6,speed:150,dmg:4,color:'#94806a',touch:true,xp:1,name:'Grabenratte',pack:3,ai:aiRat},
 sapper:{r:13,hp:24,speed:62,dmg:0,color:'#5a6248',xp:3,bdmg:15,name:'Grabenpionier',ai:aiSapper},
 bonewall:{r:20,hp:85,speed:34,dmg:12,color:'#cfc4a8',touch:true,xp:4,name:'Knochenwand',ai:aiWall,guard:guardWall},
 ghost:{r:12,hp:22,speed:92,dmg:10,color:'#a8c0d0',touch:true,fly:true,xp:3,name:'Gruftgeist',ai:aiGhost,guard:guardGhost},
 plaguedoc:{r:14,hp:32,speed:72,dmg:6,color:'#3a3a2a',touch:true,xp:3,bdmg:7,name:'Pestarzt',ai:aiDoc},
 colossus:{r:22,hp:95,speed:36,dmg:16,color:'#b0685a',touch:true,xp:5,name:'Fleischkoloss',guard:guardSpawn,onDeath:splitColossus},
 hook:{r:14,hp:34,speed:58,dmg:0,color:'#7a4a40',xp:4,bdmg:12,name:'Fleischerhaken',ai:aiHook},
 bull:{r:18,hp:70,speed:70,dmg:14,color:'#5a3a2a',touch:true,xp:5,name:'Schlachtstier',ai:aiBull},
 crossbearer:{r:16,hp:70,speed:44,dmg:14,color:'#6a5a7a',touch:true,xp:5,name:'Kreuzträger',ai:aiCross,guard:guardCross},
 seraph:{r:14,hp:40,speed:80,dmg:0,color:'#e8d8a0',fly:true,xp:5,bdmg:14,name:'Seraph',ai:aiSeraph},
});

/* Spawn-Pool: die Regionsgegner ersetzen einen Teil der Lose (Anzahl der Gegner bleibt gleich) */
function regionPool(lvl,pool){ if(lvl>50){ for(const t of REGION_TYPES.flat()) pool.push(t); return; }
  const ts=REGION_TYPES[regionIdx(lvl)], loc=(lvl-1)%10;
  if(loc>=1)pool.push(ts[0]); if(loc>=3)pool.push(ts[1]); if(loc>=5)pool.push(ts[0]); if(loc>=7)pool.push(ts[1]); }
/* Rudel (Grabenratten): weitere Tiere neben dem ersten, zählen auf die Wellengröße an */
function packExtra(e,left){ const t=ETYPES[e.type], n=Math.min(((t&&t.pack)||1)-1,left);
  for(let k=0;k<n;k++) spawnEnemy(e.type,clamp(e.x+rand(-24,24),ROOM.x+12,ROOM.x+ROOM.w-12),clamp(e.y+rand(-24,24),ROOM.y+12,ROOM.y+ROOM.h-12),G.level);
  return Math.max(0,n); }
/* Tod eines normalen Gegners: Kodex, Teilung */
function regionOnKill(e){ codexSeen('e',e.type); const t=ETYPES[e.type]; if(t&&t.onDeath)t.onDeath(e); }

/* ---------- UMGEBUNGSGEFAHREN je Region (nicht auf Boss-Stationen) ---------- */
const envDmg=b=>b*scaleFor(G.level).dmg*diffMul('enemyDmg');
function envSpot(spread){ const pl=pick(alivePlayers().length?alivePlayers():players);
  return {x:clamp(pl.x+rand(-spread,spread),ROOM.x+50,ROOM.x+ROOM.w-50),y:clamp(pl.y+rand(-spread,spread),ROOM.y+50,ROOM.y+ROOM.h-50)}; }
function addZone(kind,r,warn,life,extra){ if(R.zones.length>=4)R.zones.shift(); const s=envSpot(150);
  const z=Object.assign({kind,x:s.x,y:s.y,r,warn,life,t:0,seed:rand(0,1000)},extra||{});
  if(kind==='wire'){ z.strands=[]; for(let i=0;i<5;i++){ const a=rand(0,Math.PI), o=rand(-r*0.6,r*0.6), c=Math.cos(a), sn=Math.sin(a), pts=[];
    for(let k=-4;k<=4;k++){ const u=k/4*Math.sqrt(Math.max(0,r*r-o*o))*0.95; pts.push([z.x+c*u-sn*o+rand(-4,4),z.y+sn*u+c*o+rand(-4,4)]); } z.strands.push(pts); } }
  R.zones.push(z); return z; }
const REGION_ENV=[
  /* Gräben: Stacheldraht — halbiert das Tempo darin */
  ()=>addZone('wire',rand(75,100),1.2,9),
  /* Katakomben: einstürzende Decke — Warnkreise, dann Trümmer */
  ()=>{ for(let i=0;i<2;i++){ const s=envSpot(170);   /* 2 Kreise, 1,7 s Vorwarnung: in engen Katakomben-Gängen war mehr kaum auszuweichen */
    addHazard({kind:'circle',x:s.x,y:s.y,r:52,delay:1.7+i*0.3,dmg:envDmg(10),color:'#a89880',onHit:h=>{ for(let k=0;k<14;k++)spawnParticle(h.x+rand(-30,30),h.y+rand(-30,30),pick(['#6a6058','#8a8070','#3a3430']),rand(2,4),rand(40,120)); }}); } },
  /* Lazarett: Giftschwaden — treibt langsam, vergiftet darin */
  ()=>{ const a=rand(0,TAU); addZone('gas',rand(85,110),1.5,7,{vx:Math.cos(a)*16,vy:Math.sin(a)*16,dps:envDmg(3)}); },
  /* Schlachthof: Blutlache — rutschig, man kommt schwer in Gang und schwer zum Stehen */
  ()=>addZone('blood',rand(85,115),1.0,10),
  /* Golgotha: Blitzeinschläge — drei Warnkreise nacheinander */
  ()=>{ for(let i=0;i<3;i++){ const s=envSpot(160);
    addHazard({kind:'circle',x:s.x,y:s.y,r:44,delay:1.1+i*0.35,dmg:envDmg(15),color:'#9bbcff',onHit:h=>{ bolts.push({x1:h.x+rand(-40,40),y1:h.y-320,x2:h.x,y2:h.y,t:0.2,color:'#cfe0ff'}); for(let k=0;k<8;k++)spawnParticle(h.x,h.y,'#cfe0ff',1.6,140); }}); } },
];
const zoneIn=(z,pl)=>z.t>=z.warn && dist2(pl.x,pl.y,z.x,z.y)<z.r*z.r;
function regionReset(){ R.room=ROOM; R.mines=[]; R.zones=[]; R.envT=rand(6,9);
  for(const pl of players){ pl._pull=null; pl._rx=pl.x; pl._ry=pl.y; pl._rvx=0; pl._rvy=0; }
  for(const pl of players) for(const id of pl.weapons) codexSeen('w',id);
  if(G.run&&G.run.id!==R.runId){ R.runId=G.run.id; achPlayed(); }
  if(R.dirty){ R.dirty=false; checkAchievements(); if(DB.current)DB.save(); } }
function updateRegion(dt){ if(R.room!==ROOM) regionReset();
  updateMines(dt);
  if(!G.bossMode && !Admin.noSpawn){ R.envT-=dt; if(R.envT<=0){ R.envT=rand(9,13); REGION_ENV[G.level>50?randInt(0,4):regionIdx(G.level)](); } }
  for(let i=R.zones.length-1;i>=0;i--){ const z=R.zones[i]; z.t+=dt; if(z.vx){ z.x=clamp(z.x+z.vx*dt,ROOM.x+z.r*0.5,ROOM.x+ROOM.w-z.r*0.5); z.y=clamp(z.y+z.vy*dt,ROOM.y+z.r*0.5,ROOM.y+ROOM.h-z.r*0.5); }
    if(z.t>z.warn+z.life) R.zones.splice(i,1); }
  for(const e of enemies) if(e.spawnT>0)e.spawnT-=dt;
  for(const pl of players){ if(pl.dead){ pl._pull=null; continue; }
    const dx=pl.x-(pl._rx==null?pl.x:pl._rx), dy=pl.y-(pl._ry==null?pl.y:pl._ry), jump=dx*dx+dy*dy>70*70;
    let wire=false, blood=false;
    for(const z of R.zones){ if(!zoneIn(z,pl))continue;
      if(z.kind==='wire')wire=true; else if(z.kind==='blood')blood=true; else if(z.kind==='gas') applyStatus('poison',1.0,z.dps,pl); }
    if(!jump && pl.dashTime<=0 && dt>0){
      if(wire){ pl.x=pl._rx+dx*0.5; pl.y=pl._ry+dy*0.5; }
      if(blood){ const k=Math.min(1,dt*2.2); pl._rvx+=(dx/dt-pl._rvx)*k; pl._rvy+=(dy/dt-pl._rvy)*k; pl.x=pl._rx+pl._rvx*dt; pl.y=pl._ry+pl._rvy*dt; }
      else if(dt>0){ pl._rvx=dx/dt; pl._rvy=dy/dt; } }
    const pu=pl._pull; if(pu){ pu.t-=dt; const e=pu.e, d=Math.hypot(e.x-pl.x,e.y-pl.y);
      if(pu.t<=0||pl.dashTime>0||e.hp<=0||!enemies.includes(e)||d<=e.r+pl.r+16) pl._pull=null;
      else { const s=Math.min(d-(e.r+pl.r+16),640*dt); pl.x+=(e.x-pl.x)/d*s; pl.y+=(e.y-pl.y)/d*s; } }
    if(wire||blood||pl._pull){ collideObstacles(pl); pl.x=clamp(pl.x,ROOM.x+pl.r,ROOM.x+ROOM.w-pl.r); pl.y=clamp(pl.y,ROOM.y+pl.r,ROOM.y+ROOM.h-pl.r); }
    pl._rx=pl.x; pl._ry=pl.y; }
  R.chk-=dt; if(R.chk<=0){ R.chk=0.5; achLive(); } }

/* ---------- ZEICHNEN (Bodenebene, vor den Gegnern) ---------- */
function drawZone(z){ const pr=clamp(z.t/z.warn,0,1), end=clamp((z.warn+z.life-z.t)/0.6,0,1);
  const col=z.kind==='wire'?'#a8a090':z.kind==='gas'?C.sick:'#a01418';
  cx.save();
  if(z.t<z.warn){ cx.globalAlpha=0.1+pr*0.15; cx.fillStyle=col; cx.beginPath(); cx.arc(z.x,z.y,z.r,0,TAU); cx.fill();
    cx.globalAlpha=0.75; cx.strokeStyle=col; cx.lineWidth=2; cx.setLineDash([8,6]); cx.lineDashOffset=-G.uiTime*30; cx.stroke(); cx.setLineDash([]);
    cx.globalAlpha=0.3; cx.beginPath(); cx.arc(z.x,z.y,z.r*pr,0,TAU); cx.fill(); cx.restore(); return; }
  cx.globalAlpha=end;
  if(z.kind==='wire'){ cx.fillStyle='rgba(40,36,30,.45)'; cx.beginPath(); cx.arc(z.x,z.y,z.r,0,TAU); cx.fill();
    cx.strokeStyle='#8a8478'; cx.lineWidth=1.6;
    for(const s of z.strands){ cx.beginPath(); s.forEach((q,i)=>i?cx.lineTo(q[0],q[1]):cx.moveTo(q[0],q[1])); cx.stroke();
      for(let i=1;i<s.length-1;i++){ const [x,y]=s[i]; cx.beginPath(); cx.moveTo(x-4,y-4); cx.lineTo(x+4,y+4); cx.moveTo(x+4,y-4); cx.lineTo(x-4,y+4); cx.stroke(); } }
    cx.globalAlpha=end*0.5; cx.strokeStyle='#c8bca8'; cx.setLineDash([3,5]); cx.beginPath(); cx.arc(z.x,z.y,z.r,0,TAU); cx.stroke(); cx.setLineDash([]); }
  else if(z.kind==='gas'){ for(let i=0;i<5;i++){ const a=z.seed+i*1.3+G.uiTime*0.4, o=z.r*0.32;
      cx.globalAlpha=end*0.2; cx.fillStyle=i%2?C.sick:'#6a8a2a'; cx.beginPath(); cx.arc(z.x+Math.cos(a)*o,z.y+Math.sin(a*1.3)*o,z.r*0.68,0,TAU); cx.fill(); }
    cx.globalAlpha=end*0.6; cx.strokeStyle=C.sick; cx.lineWidth=1.5; cx.beginPath(); cx.arc(z.x,z.y,z.r,0,TAU); cx.stroke(); }
  else { cx.fillStyle='#3a0406'; cx.globalAlpha=end*0.6;
    for(let i=0;i<4;i++){ const a=z.seed+i*1.7, o=z.r*0.25; cx.beginPath(); cx.ellipse(z.x+Math.cos(a)*o,z.y+Math.sin(a)*o*0.8,z.r*0.74,z.r*0.6,a,0,TAU); cx.fill(); }
    cx.fillStyle='#5a0a0d'; cx.beginPath(); cx.ellipse(z.x,z.y,z.r*0.5,z.r*0.38,z.seed,0,TAU); cx.fill();
    cx.globalAlpha=end*0.35; cx.fillStyle='#ffd0d0'; for(let i=0;i<3;i++){ const a=z.seed*3+i*2.1; cx.beginPath(); cx.ellipse(z.x+Math.cos(a)*z.r*0.45,z.y+Math.sin(a)*z.r*0.35,z.r*0.12,z.r*0.03,-0.4,0,TAU); cx.fill(); }
    cx.globalAlpha=end*0.5; cx.strokeStyle='#8a1418'; cx.lineWidth=1.5; cx.setLineDash([5,6]); cx.beginPath(); cx.arc(z.x,z.y,z.r,0,TAU); cx.stroke(); cx.setLineDash([]); }
  cx.restore(); }
function drawMine(m){ const fl=clamp(m.t/0.6,0,1), x=m.sx+(m.x-m.sx)*fl, y=m.sy+(m.y-m.sy)*fl-Math.sin(fl*Math.PI)*40, armed=m.t>=1.4;
  cx.save();
  if(armed){ cx.globalAlpha=0.22; cx.strokeStyle='#e05a3a'; cx.lineWidth=1.2; cx.setLineDash([4,5]); cx.beginPath(); cx.arc(x,y,46,0,TAU); cx.stroke(); cx.setLineDash([]); cx.globalAlpha=1; }
  cx.fillStyle='rgba(0,0,0,.4)'; cx.beginPath(); cx.ellipse(m.x,m.y+6,10,4,0,0,TAU); cx.fill();
  cx.fillStyle='#2a1a10'; cx.beginPath(); cx.arc(x,y,9,0,TAU); cx.fill(); cx.strokeStyle='#8a7a5a'; cx.lineWidth=2; cx.stroke();
  cx.fillStyle=armed&&Math.sin(G.uiTime*10+m.sx)>0?'#ff4a3a':'#6a2020'; cx.beginPath(); cx.arc(x,y,3.2,0,TAU); cx.fill();
  cx.restore(); }
function drawRegion(){
  for(const z of R.zones) drawZone(z);
  for(const m of R.mines) drawMine(m);
  for(const e of enemies){ const ty=e.type;
    if(ty==='crossbearer'&&e.fa!=null&&!(e.stagT>0)){ cx.save(); cx.globalAlpha=0.45; cx.strokeStyle=C.gold2; cx.lineWidth=3; cx.beginPath(); cx.arc(e.x,e.y,e.r+8,e.fa-1.15,e.fa+1.15); cx.stroke(); cx.restore(); }
    else if(ty==='bull'&&e.st===1){ const L=470, pr=1-clamp(e.stT/0.9,0,1); cx.save(); cx.lineCap='butt'; cx.strokeStyle='#c01f24';
      cx.globalAlpha=0.14+pr*0.16; cx.lineWidth=e.r*2; cx.beginPath(); cx.moveTo(e.x,e.y); cx.lineTo(e.x+e.cdx*L,e.y+e.cdy*L); cx.stroke();
      cx.globalAlpha=0.5; cx.lineWidth=Math.max(2,e.r*2*pr); cx.beginPath(); cx.moveTo(e.x,e.y); cx.lineTo(e.x+e.cdx*L*pr,e.y+e.cdy*L*pr); cx.stroke(); cx.restore(); }
    else if(ty==='hook'){ const b=e.hookB&&ebullets.includes(e.hookB)?e.hookB:null, pl=players.find(q=>q._pull&&q._pull.e===e);
      if(e.windT>0){ cx.save(); cx.globalAlpha=0.35+Math.sin(G.uiTime*20)*0.15; cx.strokeStyle='#ff5a4a'; cx.lineWidth=1.5; cx.setLineDash([6,6]); cx.beginPath(); cx.moveTo(e.x,e.y); cx.lineTo(e.x+Math.cos(e.aimA)*440,e.y+Math.sin(e.aimA)*440); cx.stroke(); cx.restore(); }
      const tgt=b||pl; if(tgt){ cx.save(); cx.strokeStyle='#9aa0a8'; cx.lineWidth=2; cx.setLineDash([4,3]); cx.beginPath(); cx.moveTo(e.x,e.y); cx.lineTo(tgt.x,tgt.y); cx.stroke(); cx.restore(); } }
    else if(ty==='seraph'&&e.castT>0){ cx.save(); cx.globalAlpha=0.3+Math.sin(G.uiTime*18)*0.15; cx.fillStyle='#fff2c0'; cx.beginPath(); cx.arc(e.x,e.y,e.r*1.6,0,TAU); cx.fill(); cx.restore(); } } }
