"use strict";
/* GOLGOTHA — Nahkampfwaffen
   w.melee = {kind, reach, ...}: 'arc' Schwung im Bogen, 'stab' Stoß nach vorn, 'slam' Bodenschlag (Ring), 'orbit' kreisende Kette.
   Die Trefferzone ist genau die gezeichnete Fläche (drawMelee zeichnet aus denselben Werten):
     Schwung = Kreissektor um den Spieler (Radius R) vom Startwinkel bis zum aktuellen Klingenwinkel,
     Stoß = Kapsel (Halbbreite wd), deren Rundung genau an der Spitze endet, Bodenschlag = Scheibe bis zum Wellenradius,
     Kette = Kette (Halbbreite cw) vom Spieler bis zur Kugel plus Kugel (Radius br) auf der Kreisbahn (Radius R).
   Ein Gegner zählt als getroffen, sobald sein Körper (e.r) die Fläche berührt — wie bei Geschossen.
   Schaden wie beim Strahl: Figur, Klassen-Gegenstände, Raserei, Fluch, Totenschädel/Märtyrerblut; Krit je Schwung.
   Treffer laufen über damageEnemy(src = w.id, owner) → Messung, Waffen-Kills, Henker-Nähe, Heilig-Klasse, Hinrichtung.
   Ohne Gegner in Reichweite wird nicht geschwungen; die Waffe bleibt bereit (fireMelee gibt false zurück). */
Object.assign(ICONS,{
  whip:'M4 20c3-7 7-9 11-8s4-4 3-8 M18 4l2-1', knife:'M5 19l3-3 M8 16l9-11 2 2-9 11z M6 17l2 2',
  fork:'M12 21V10 M7 3v5q0 2 5 2t5-2V3 M12 3v7', flail:'M4 20l7-7 M14 7a3 3 0 1 0 .01 0 M14 2v2 M19 7h-2 M17.5 3.5l-1.4 1.4',
  bell:'M6 17h12 M7 17c0-7 2-11 5-11s5 4 5 11 M12 6V4 M11 20h2', axe:'M5 20L15 10 M12 6c3-3 8-1 8 4-3 1-6 0-8-4z',
});
const MELEE_W=[
 {id:'scourge',     name:'Geißel',                 rk:'common',   ic:'whip',  cls:['eisen'],          dmg:19,fr:620, kb:60, color:'#c8a070',
   melee:{kind:'arc', reach:165,arc:1.2, dur:0.16,sp:'lash',maxHits:2}},
 {id:'ritualknife', name:'Opfermesser',            rk:'common',   ic:'knife', cls:['seuche'],         dmg:7, fr:240, kb:25, poison:true,color:'#b8c8a0',
   melee:{kind:'stab',reach:95, wd:9, dur:0.08,sp:'blood'}},
 {id:'pitchfork',   name:'Ketzergabel',            rk:'uncommon', ic:'fork',  cls:['feuer'],          dmg:22,fr:680, kb:170,pierce:1,burn:true,color:C.candle,
   melee:{kind:'stab',reach:140,wd:13,dur:0.12,sp:'burnkb'}},
 {id:'penancechain',name:'Büßerkette',             rk:'rare',     ic:'flail', cls:['blitz','eisen'],  dmg:52,fr:420, kb:90, chain:true,color:'#9aa0a8',
   melee:{kind:'orbit',reach:86,ball:12,cw:4,spin:5.2,sp:'speed'}},
 {id:'bellclapper', name:'Glockenklöppel',         rk:'rare',     ic:'bell',  cls:['heilig'],         dmg:84,fr:1800,kb:120,color:C.gold2,
   melee:{kind:'slam',reach:130,dur:0.28,sp:'stun'}},
 {id:'headsaxe',    name:'Henkersbeil',            rk:'ultrarare',ic:'axe',   cls:['eisen','heilig'], dmg:104,fr:1100,kb:230,color:'#c0c4cc',
   melee:{kind:'arc', reach:130,arc:2.6, dur:0.24,sp:'exec',exec:0.15}},
 {id:'gravescythe', name:'Sense des Totengräbers', rk:'epic',     ic:'scythe',cls:['frost'],          dmg:78,fr:820, kb:110,slow:true,color:'#a8d8e0',
   melee:{kind:'arc', reach:150,arc:Math.PI,dur:0.22,sp:'souls'}},
];
for(const w of MELEE_W){ Object.assign(w,{count:1,spread:0,spd:0,size:6,pierce:w.pierce||0}); WEAPON_CLS[w.id]=w.cls; WEAPONS.push(w); }
const isMelee=id=>{ const w=weaponById(id); return !!(w&&w.melee); };
let meleeFx=[];   // laufende Schwünge/Stöße/Bodenschläge

const meleeSize=p=>1+((p.projSize||1)-1)*0.5;                 // Schweres Blei: +halbe Projektilgröße als Reichweite
const meleeExtra=(p,w)=>(p.multishot||0)+charShots(p,w);      // Zusatzgeschosse: breiterer Bogen / mehr Durchschlag / größerer Ring / mehr Kugeln
function meleeReach(p,w){ const m=w.melee; let R=m.reach*meleeSize(p);
  if(m.kind==='orbit') R*=clamp(p.speed/215,0.6,2.2);         // Büßerkette: Radius wächst mit dem Tempo
  if(m.kind==='slam') R*=1+0.1*meleeExtra(p,w);
  return R; }
const meleeArc=(p,w)=>Math.min(TAU*0.9,w.melee.arc*(1+0.25*meleeExtra(p,w)));
function meleeDmg(p,w){ const lvl=p.wLevel[w.id]||0;
  let d=w.dmg*(1+lvl*0.22)*charDmgMul(p,w)*p.dmgMult*(p.frenzyActive?1+p.frenzyPow:1)*((p.curseMartyr&&p.hp<p.maxHP*0.5)?1.9:1)*bonusMul(p)*Admin.dmg;
  if(w.melee.sp==='blood') d*=1+clamp(1-p.hp/p.maxHP,0,1);   // Opfermesser: +1% je fehlendem Prozent Leben
  return d; }
/* Kreis (x,y,r) berührt den Sektor um (cx,cy), Radius R, zwischen den Winkeln a und b (genau) */
function inSector(x,y,r,cx,cy,R,a,b){ const dx=x-cx, dy=y-cy, d=Math.hypot(dx,dy); if(d-r>R)return false; if(d<=r)return true;
  const lo=Math.min(a,b), hi=Math.max(a,b);
  if(Math.abs(angDiff(Math.atan2(dy,dx),(lo+hi)/2))<=(hi-lo)/2) return true;
  return distToSeg(x,y,cx,cy,cx+Math.cos(lo)*R,cy+Math.sin(lo)*R)<r || distToSeg(x,y,cx,cy,cx+Math.cos(hi)*R,cy+Math.sin(hi)*R)<r; }

/* aus fireWeapon: player = Besitzer */
function fireMelee(w,base){ const p=player, m=w.melee; if(m.kind==='orbit')return false;
  const R=meleeReach(p,w), tg=nearestEnemy(p.x,p.y);
  if(!tg||Math.hypot(tg.x-p.x,tg.y-p.y)-tg.r>R) return false;   // niemand in Reichweite: bereit bleiben
  let dmg=meleeDmg(p,w), crit=false; if(Math.random()<p.crit){ dmg*=p.critMult; crit=true; }
  const sw={w,owner:p,kind:m.kind,R,dmg,crit,t:0,dur:m.dur,hit:new Set(),aim:base,x:p.x,y:p.y};
  if(m.sp==='lash'){ p._lash=(p._lash||0)+1;   // Geißel: jeder 3. Hieb doppelt, kostet 1 LP
    if(p._lash%3===0){ sw.dmg*=2; sw.blood=true; if(p.hp>2&&!Admin.god){ p.hp-=1; spawnFloater(p.x,p.y-p.r-12,'−1',false); updateHP(); } } }
  if(m.kind==='arc'){ const A=meleeArc(p,w), dir=(p._swDir=-(p._swDir||1)); sw.a0=base-dir*A/2; sw.a1=base+dir*A/2; sw.cur=sw.prev=sw.a0; if(m.maxHits)sw.left=m.maxHits+meleeExtra(p,w); }
  else if(m.kind==='stab'){ const feather=hasRelic(p,'feather')&&p.featherNext[w.id]; if(feather)p.featherNext[w.id]=false;
    sw.wd=m.wd*meleeSize(p); sw.len=0; sw.left=w.pierce+p.pierce+clsB(p,'eisen','pierce')+meleeExtra(p,w)+(feather?2:0)+1; }
  else { sw.rr=0; G.shake=Math.max(G.shake,3); }
  if(crit&&hasRelic(p,'feather')) p.featherNext[w.id]=true;
  meleeFx.push(sw); Audio2.shoot(); synOnSwing(p,w,base,dmg);
  return true; }

function meleeStep(sw,dt){ const p=sw.owner; sw.x=p.x; sw.y=p.y; sw.t+=dt; if(sw.done)return;
  const k=clamp(sw.t/sw.dur,0,1), e1=1-(1-k)*(1-k);   // schnell heraus, weich am Ende
  if(sw.kind==='arc'){ sw.prev=sw.cur; sw.cur=sw.a0+(sw.a1-sw.a0)*e1;
    for(const e of enemies.slice()){ if(sw.left!=null&&sw.left<=0)break; if(!sw.hit.has(e.id)&&inSector(e.x,e.y,e.r,sw.x,sw.y,sw.R,sw.prev,sw.cur)){ if(sw.left!=null)sw.left--; meleeHit(sw,e); } } }
  else if(sw.kind==='stab'){ sw.len=sw.R*e1; const L=Math.max(0,sw.len-sw.wd), ex=sw.x+Math.cos(sw.aim)*L, ey=sw.y+Math.sin(sw.aim)*L;
    const c=enemies.filter(e=>!sw.hit.has(e.id)&&distToSeg(e.x,e.y,sw.x,sw.y,ex,ey)<e.r+sw.wd).sort((a,b)=>dist2(sw.x,sw.y,a.x,a.y)-dist2(sw.x,sw.y,b.x,b.y));
    for(const e of c){ if(sw.left<=0)break; sw.left--; meleeHit(sw,e); } }
  else { sw.rr=sw.R*e1; for(const e of enemies.slice()) if(!sw.hit.has(e.id)&&Math.hypot(e.x-sw.x,e.y-sw.y)-e.r<=sw.rr) meleeHit(sw,e); }
  if(k>=1) sw.done=true; }

function meleeHit(sw,e){ sw.hit.add(e.id); const p=sw.owner, w=sw.w, m=w.melee; let d=sw.dmg;
  if(m.exec&&!e.isBoss&&e.hp-d>0&&e.hp-d<e.maxHp*m.exec){ d=e.hp*2+10; sw.execd=1; spawnFloater(e.x,e.y-e.r-8,'✝',true); }   // Henkersbeil
  const ang=Math.atan2(e.y-sw.y,e.x-sw.x), kb=w.kb*p.kbMult*(1+clsB(p,'eisen','kb'))*(m.sp==='burnkb'&&e.burnT>0?2:1);   // Ketzergabel: Brennende fliegen doppelt
  const ex=e.x, ey=e.y;
  damageEnemy(e,d,ang,kb,true,w.id,p); relicOnHit({owner:p,depth:0},e,d);
  spawnFloater(ex,ey-e.r,Math.round(d),sw.crit); if(!sw.sound){ sw.sound=1; Audio2.hit(); }
  for(let k=0;k<4;k++)spawnParticle(ex,ey,sw.blood?C.blood2:w.color,1.4,80);
  if(e.hp<=0){ if(sw.execd)synExecuted(p,e); if(m.sp==='souls'&&!e.isBoss)graveSoul(p,ex,ey); }
  else { if(w.burn||p.burn) applyBurn(e,d*0.5+2,w.id,p); if(w.slow||p.slow||(sw.crit&&p.critSlow)) applySlow(e,p); if(w.poison) applyPoison(e,d*0.5+1,w.id,p,true);
    if(m.sp==='stun'){ if(e.isBoss) applySlow(e,p); else e.rootT=Math.max(e.rootT||0,0.5); } }   // Glockenklöppel: betäubt, Bosse nur verlangsamt
  if(w.chain&&Math.random()<0.35) chainLightning({dmg:d,owner:p,wid:w.id,depth:0},e);
  if(p.explosive&&!sw.boom){ sw.boom=1; explodeBullet({x:ex,y:ey,dmg:d,wid:w.id,owner:p}); } }   // Höllenfeuer: einmal je Schwung

/* Sense: jeder Kill lässt eine Seele fallen, 10 Seelen heilen 6 LP */
function graveSoul(p,x,y){ p.graveSouls=(p.graveSouls||0)+1; bolts.push({x1:x,y1:y,x2:p.x,y2:p.y,t:0.18,color:'#bfe8f0'});
  if(p.graveSouls>=10){ p.graveSouls=0; healPlayer(p,6); spawnFloater(p.x,p.y-p.r-14,'+6 ☩',true); for(let i=0;i<10;i++)spawnParticle(p.x,p.y,'#bfe8f0',1.6,90); } }

/* pro Bild (aus updateBullets): Schwünge fortsetzen, kreisende Ketten */
function updateMelee(dt){
  for(let i=meleeFx.length-1;i>=0;i--){ const sw=meleeFx[i]; if(!players.includes(sw.owner)||sw.owner.dead){ meleeFx.splice(i,1); continue; }
    meleeStep(sw,dt); if(sw.t>sw.dur+0.18) meleeFx.splice(i,1); }
  for(const p of players){ if(p.dead)continue;
    for(const id of p.weapons){ const w=weaponById(id); if(!w||!w.melee||w.melee.kind!=='orbit')continue;
      const m=w.melee, st=p._orb||(p._orb={}), o=st[id]||(st[id]={ang:rand(0,TAU)});
      o.ang+=m.spin*dt; o.R=meleeReach(p,w); o.n=Math.min(4,1+meleeExtra(p,w)); o.br=m.ball*meleeSize(p); o.cw=m.cw;
      const cd=(w.fr*p.frMult*(p.frenzyActive?(1-p.frenzyPow*0.5):1)*(1-clsB(p,'pulver','fr'))*charCdMul(p,w))/1000;   // Abstand zwischen zwei Treffern am selben Gegner
      for(let k=0;k<o.n;k++){ const a=o.ang+k*TAU/o.n, bx=p.x+Math.cos(a)*o.R, by=p.y+Math.sin(a)*o.R;
        for(const e of enemies.slice()){ if(dist2(bx,by,e.x,e.y)>=(o.br+e.r)*(o.br+e.r)&&distToSeg(e.x,e.y,p.x,p.y,bx,by)>=e.r+o.cw)continue;
          const nx=(e._mcd||(e._mcd={})); if(G.time<(nx[id]||0))continue; nx[id]=G.time+cd;
          let dmg=meleeDmg(p,w), crit=false; if(Math.random()<p.crit){ dmg*=p.critMult; crit=true; }
          meleeHit({w,owner:p,x:p.x,y:p.y,dmg,crit,hit:new Set()},e); } } } } }

/* ---------- Zeichnen (aus renderGame) ---------- */
function drawMelee(){ for(const sw of meleeFx) drawSwing(sw);
  for(const p of players){ if(p.dead||!p._orb)continue;
    for(const id of p.weapons){ const o=p._orb[id], w=weaponById(id); if(o&&o.R&&w&&w.melee&&w.melee.kind==='orbit') drawOrbit(p,w,o); } } }
function drawSwing(sw){ const w=sw.w, fade=sw.done?clamp(1-(sw.t-sw.dur)/0.18,0,1):1, glow=hasDuo(sw.owner,'glowblade');
  const col=sw.blood?C.blood2:glow?'#ff8a2a':w.color; cx.save(); cx.translate(sw.x,sw.y);
  if(glow){ cx.shadowColor='#ff6a1a'; cx.shadowBlur=12; if(Math.random()<0.3)spawnParticle(sw.x+rand(-sw.R,sw.R)*0.6,sw.y+rand(-sw.R,sw.R)*0.6,'#ffb050',1.2,40); }
  if(sw.kind==='arc'){ const lo=Math.min(sw.a0,sw.cur), hi=Math.max(sw.a0,sw.cur);
    cx.globalAlpha=0.15*fade; cx.fillStyle=col; cx.beginPath(); cx.moveTo(0,0); cx.arc(0,0,sw.R,lo,hi); cx.closePath(); cx.fill();   // Trefferzone
    cx.globalAlpha=0.85*fade; cx.strokeStyle=col; cx.lineWidth=3; cx.beginPath(); cx.arc(0,0,sw.R-1.5,lo,hi); cx.stroke();
    cx.rotate(sw.cur); cx.globalAlpha=fade; drawBlade(w,sw.R,col,sw.blood); }
  else if(sw.kind==='stab'){ cx.rotate(sw.aim); const L=sw.len;
    cx.globalAlpha=0.22*fade; cx.strokeStyle=col; cx.lineCap='round'; cx.lineWidth=sw.wd*2; cx.beginPath(); cx.moveTo(0,0); cx.lineTo(Math.max(0,L-sw.wd),0); cx.stroke();   // Trefferzone (Kapsel, endet an der Spitze)
    cx.globalAlpha=fade; cx.lineWidth=2.4; cx.strokeStyle='#5a4632'; cx.beginPath(); cx.moveTo(4,0); cx.lineTo(L-sw.wd*0.6,0); cx.stroke();
    cx.strokeStyle=col; cx.fillStyle=col;
    if(w.id==='pitchfork'){ cx.lineWidth=2.2; cx.beginPath(); cx.moveTo(L-sw.wd*1.4,-sw.wd*0.7); cx.lineTo(L-sw.wd*1.4,sw.wd*0.7); for(const o of [-0.7,0,0.7]){ cx.moveTo(L-sw.wd*1.4,o*sw.wd); cx.lineTo(L,o*sw.wd); } cx.stroke(); }
    else { cx.beginPath(); cx.moveTo(L-sw.wd*2.2,-sw.wd*0.45); cx.lineTo(L,0); cx.lineTo(L-sw.wd*2.2,sw.wd*0.45); cx.closePath(); cx.fill(); } }
  else { const r=sw.rr;
    cx.globalAlpha=0.16*fade; cx.fillStyle=col; cx.beginPath(); cx.arc(0,0,r,0,TAU); cx.fill();   // Trefferzone
    cx.globalAlpha=0.9*fade; cx.strokeStyle=col; cx.lineWidth=4; cx.beginPath(); cx.arc(0,0,Math.max(1,r-2),0,TAU); cx.stroke();
    cx.globalAlpha=fade*(1-clamp(sw.t/sw.dur,0,1)*0.6); cx.fillStyle=col; cx.beginPath(); cx.moveTo(-9,-4); cx.quadraticCurveTo(-9,-22,0,-22); cx.quadraticCurveTo(9,-22,9,-4); cx.lineTo(12,0); cx.lineTo(-12,0); cx.closePath(); cx.fill(); }   // Glocke
  cx.restore(); }
/* Klinge entlang der x-Achse, bleibt innerhalb von R */
function drawBlade(w,R,col,blood){ cx.lineCap='round';
  if(w.id==='scourge'){ cx.strokeStyle=blood?C.blood2:'#8a6a4a'; cx.lineWidth=2; cx.beginPath(); cx.moveTo(8,0); cx.quadraticCurveTo(R*0.55,-10,R-3,0); cx.stroke();
    cx.fillStyle=blood?C.blood2:col; cx.beginPath(); cx.arc(R-3,0,3,0,TAU); cx.fill(); return; }
  cx.strokeStyle='#4a3a2a'; cx.lineWidth=3; cx.beginPath(); cx.moveTo(8,0); cx.lineTo(R*0.82,0); cx.stroke(); cx.fillStyle=col;
  if(w.id==='gravescythe'){ cx.beginPath(); cx.moveTo(R*0.78,-2); cx.quadraticCurveTo(R*0.9,22,R*0.55,34); cx.quadraticCurveTo(R*0.8,18,R*0.72,2); cx.closePath(); cx.fill(); cx.fillRect(R*0.8,-2,R*0.2-1,4); }
  else { cx.beginPath(); cx.moveTo(R*0.7,-4); cx.quadraticCurveTo(R-1,-20,R-1,0); cx.quadraticCurveTo(R-1,20,R*0.7,4); cx.closePath(); cx.fill(); } }
function drawOrbit(p,w,o){ const col=hasDuo(p,'glowblade')?'#ff8a2a':w.color; cx.save();
  cx.globalAlpha=0.08; cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash([3,6]); cx.beginPath(); cx.arc(p.x,p.y,o.R,0,TAU); cx.stroke(); cx.setLineDash([]);
  for(let k=0;k<o.n;k++){ const a=o.ang+k*TAU/o.n, bx=p.x+Math.cos(a)*o.R, by=p.y+Math.sin(a)*o.R;
    cx.globalAlpha=0.35; cx.strokeStyle=col; cx.lineCap='round'; cx.lineWidth=o.cw*2; cx.beginPath(); cx.moveTo(p.x,p.y); cx.lineTo(bx,by); cx.stroke();   // Trefferzone der Kette
    cx.globalAlpha=0.9; cx.strokeStyle='#6a6258'; cx.lineWidth=1.4; const n=Math.max(3,Math.floor(o.R/8));
    for(let i=1;i<n;i++){ const tt=i/n; cx.beginPath(); cx.ellipse(p.x+(bx-p.x)*tt,p.y+(by-p.y)*tt,3.4,2,a+(i%2?Math.PI/2:0),0,TAU); cx.stroke(); }
    cx.globalAlpha=1; cx.fillStyle='#3a3630'; cx.beginPath(); cx.arc(bx,by,o.br*0.72,0,TAU); cx.fill();
    cx.fillStyle=col; for(let s=0;s<8;s++){ const sa=s/8*TAU+o.ang*2; cx.beginPath(); cx.moveTo(bx+Math.cos(sa-0.3)*o.br*0.6,by+Math.sin(sa-0.3)*o.br*0.6); cx.lineTo(bx+Math.cos(sa)*o.br,by+Math.sin(sa)*o.br); cx.lineTo(bx+Math.cos(sa+0.3)*o.br*0.6,by+Math.sin(sa+0.3)*o.br*0.6); cx.fill(); }
    cx.strokeStyle=col; cx.lineWidth=1.5; cx.beginPath(); cx.arc(bx,by,o.br*0.72,0,TAU); cx.stroke(); }
  cx.restore(); }

/* Shop-Text: Angriffsart, Reichweite, Besonderheit */
function meleeMeta(w){ const m=w.melee, k=m.kind;
  return t('mel_'+k,{a:Math.round((m.arc||0)*180/Math.PI),r:m.reach})+' · '+t('mel_sp_'+m.sp); }

Object.assign(I18N.de,{
  mel_arc:'Schwung {a}°, {r} px', mel_stab:'Stoß {r} px', mel_slam:'Bodenschlag {r} px', mel_orbit:'kreist ({r} px)',
  mel_sp_lash:'trifft bis zu 2, jeder 3. Hieb doppelt, kostet 1 LP', mel_sp_blood:'+1% Schaden je 1% fehlender LP, Gift', mel_sp_burnkb:'durchbohrt 2, Brennende fliegen doppelt weit',
  mel_sp_speed:'Radius wächst mit dem Tempo, Kettenblitz', mel_sp_stun:'betäubt 0,5 s, Bosse nur verlangsamt', mel_sp_exec:'richtet unter 15% LP hin',
  mel_sp_souls:'Kills geben Seelen, 10 Seelen heilen 6 LP',
});
Object.assign(I18N.en,{
  mel_arc:'Swing {a}°, {r} px', mel_stab:'Thrust {r} px', mel_slam:'Ground slam {r} px', mel_orbit:'orbits ({r} px)',
  mel_sp_lash:'hits up to 2, every 3rd lash deals double, costs 1 HP', mel_sp_blood:'+1% damage per 1% missing HP, poison', mel_sp_burnkb:'pierces 2, burning foes fly twice as far',
  mel_sp_speed:'radius grows with speed, chain lightning', mel_sp_stun:'stuns 0.5 s, bosses only slowed', mel_sp_exec:'executes below 15% HP',
  mel_sp_souls:'kills drop souls, 10 souls heal 6 HP',
});
