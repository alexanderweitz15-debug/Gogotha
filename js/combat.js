"use strict";
/* GOLGOTHA — Geschosse und ihre Effekte, Reliquien-Auslöser, Schreine, Pfützen, Aufsammeln, Partikel (Teil von game.js, Reihenfolge siehe index.html) */
/* =========================================================================
   BULLETS / PICKUPS / PARTICLES / PUDDLES
   ========================================================================= */
/* ---------- GESCHOSS-EFFEKTE ----------
   Jedes Geschoss trägt Besitzer (owner) und eine Effektliste (fx). Hooks: fly(b,dt), dmg(b,dmg,e)→dmg, hit(b,e),
   wall(b), obstacle(b,ob), expire(b). hit 'die' beendet das Geschoss, wall/obstacle 'keep' hält es am Leben.
   depth = Auslöse-Tiefe (0 = Waffe); Auslöser-Effekte sollen ab depth 1 gedrosselt, ab 2 gar nicht mehr feuern. */
const BULLET_FX={
  burn:   { hit(b,e){ applyBurn(e,b.dmg*0.5+2,b.wid,b.owner); } },
  slow:   { hit(b,e){ applySlow(e,b.owner); } },
  puddle: { hit(b,e){ spawnPuddle(b.x,b.y,b.dmg*0.4,{hostile:false,src:b.wid,owner:b.owner,life:2.2*(1+clsB(b.owner,'seuche','life'))*((b.owner&&b.owner.puddleMul)||1),rMul:1+clsB(b.owner,'seuche','rad')}); } },
  chain:  { hit(b,e){ chainLightning(b,e); } },
  explode:{ hit(b,e){ explodeBullet(b); return 'die'; } },
  poison: { hit(b,e){ applyPoison(e,b.dmg*0.5+1,b.wid,b.owner,true); } },
  /* Wurfwaffen: Wolke/Pfütze beim Aufprall oder am Ende der Wurfweite (je Geschoss einmal) */
  toxcloud:{ hit(b){ dropPool(b,'toxin'); }, expire(b){ dropPool(b,'toxin'); } },
  frostpool:{ hit(b){ dropPool(b,'chill'); }, expire(b){ dropPool(b,'chill'); } },
  /* Schädelschleuder: springt nach einem Treffer zum nächsten Gegner in 160 px (w.bounce-mal) */
  bounce: { hit(b,e){ const w=weaponById(b.wid); if((b.bnc||0)>=((w&&w.bounce)||0))return;
      let best=null,bd=160*160; for(const o of enemies){ if(o===e||b.hitIds.has(o.id))continue; const d=dist2(e.x,e.y,o.x,o.y); if(d<bd){bd=d;best=o;} }
      if(!best)return; const sp=Math.hypot(b.vx,b.vy), a=Math.atan2(best.y-b.y,best.x-b.x);
      b.vx=Math.cos(a)*sp; b.vy=Math.sin(a)*sp; b.bnc=(b.bnc||0)+1; b.pierce++; b.life=Math.max(b.life,0.6); if(w.bounceGrow)b.dmg*=1+w.bounceGrow; } },
  /* --- Eigenheiten einzelner Waffen --- */
  /* Hexenfeuer: jeder 5. Treffer auf denselben Gegner entlädt das Hexenmal (+150% Schaden) */
  hex:    { hit(b,e){ if(b.depth>0||e.hp<=0)return; e.hex=(e.hex||0)+1; if(e.hex<5)return; e.hex=0;
      novaRings.push({x:e.x,y:e.y,r:6,max:e.r+22,t:0.25,color:'#b06ad0'}); damageEnemy(e,b.dmg*1.5,0,0,false,b.wid,b.owner); } },
  /* Nagelkanzel: jeder 8. Nagel im selben Gegner nagelt ihn 0,8 s fest (nicht Bosse) */
  nail:   { hit(b,e){ if(e.isBoss||e.hp<=0)return; e.nails=(e.nails||0)+1; if(e.nails%8)return; e.rootT=Math.max(e.rootT||0,0.8); spawnFloater(e.x,e.y-e.r-8,'✚',false); } },
  /* Schienennagel: geht durch Hindernisse und wird mit jedem durchschlagenen Gegner stärker */
  rail:   { obstacle(){ return 'keep'; }, hit(b){ const w=weaponById(b.wid); b.dmg*=1+((w&&w.rail)||0.2); } },
  /* Jüngstes Gericht: richtet Gegner (nicht Bosse) unter 25% Leben sofort hin */
  verdict:{ dmg(b,d,e){ const w=weaponById(b.wid); if(!e||e.isBoss||!w||!w.verdict)return d;
      if(e.hp-d<e.maxHp*w.verdict && e.hp-d>0){ spawnFloater(e.x,e.y-e.r-8,'✝',true); return e.hp*2+10; } return d; } },   // Puffer gegen Schadensabzüge danach
  /* Geschoss-Modifikatoren (Gaben, je 1× pro Lauf) */
  pitch:  { hit(b){ pitchPuddle(b); }, expire(b){ pitchPuddle(b); } },
  ricochet:{ wall(b){ if(b.rico)return; b.rico=1;
      if(b.x<ROOM.x){b.x=ROOM.x;b.vx=Math.abs(b.vx);} else if(b.x>ROOM.x+ROOM.w){b.x=ROOM.x+ROOM.w;b.vx=-Math.abs(b.vx);}
      if(b.y<ROOM.y){b.y=ROOM.y;b.vy=Math.abs(b.vy);} else if(b.y>ROOM.y+ROOM.h){b.y=ROOM.y+ROOM.h;b.vy=-Math.abs(b.vy);}
      return 'keep'; },
    obstacle(b,ob){ if(b.rico||b.fx.includes('ghost'))return; b.rico=1;   // Spiegelung an der Normalen des Hindernisses
      const dx=b.x-ob.x, dy=b.y-ob.y, d=Math.hypot(dx,dy)||1, nx=dx/d, ny=dy/d, dot=b.vx*nx+b.vy*ny;
      b.vx-=2*dot*nx; b.vy-=2*dot*ny; b.x=ob.x+nx*(ob.r+b.r+1); b.y=ob.y+ny*(ob.r+b.r+1); return 'keep'; } },
  ghost:  { obstacle(){ return 'keep'; }, dmg(b,d){ return d*0.85; } },
  heavy:  { spawn(b){ b.r*=1.4; b.vx*=0.75; b.vy*=0.75; b.dist=0; }, fly(b,dt){ b.dist+=Math.hypot(b.vx,b.vy)*dt; },
            dmg(b,d){ return d*lerp(1.6,0.7,clamp(b.dist/600,0,1)); } },
  split:  { hit(b,e){ if(b.depth>0)return; const base=Math.atan2(b.vy,b.vx), spd=Math.hypot(b.vx,b.vy)*0.8;
      for(const off of [-0.61,0,0.61]){ const a=base+off;
        bullets.push({id:uid++,x:b.x,y:b.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,dmg:b.dmg*0.3,r:Math.max(2,b.r*0.6),pierce:0,life:0.35,kb:20,color:b.color,crit:false,
          fx:b.fx.filter(f=>f==='burn'||f==='slow'),owner:b.owner,depth:b.depth+1,wid:b.wid,hitIds:new Set([e.id])}); } } },
};
/* Pechfass: höchstens eine Pfütze pro Waffe alle 0,2 s, nur aus Waffen-Geschossen (nicht aus Splittern) */
function pitchPuddle(b){ if(b.depth>0||!b.owner)return; const tt=b.owner._pitchT||(b.owner._pitchT={});
  if(G.time-(tt[b.wid]!=null?tt[b.wid]:-9)<0.2)return; tt[b.wid]=G.time;
  spawnPuddle(b.x,b.y,b.dmg*0.25,{hostile:false,effect:'fire',life:1.5,src:b.wid,owner:b.owner}); }
/* Explosion zuletzt: früher beendete sie das Geschoss, bevor Kettenblitz und Pfütze auslösen konnten */
const FX_ORDER=['verdict','burn','slow','poison','puddle','toxcloud','frostpool','hex','nail','rail','bounce','chain','explode'];
function applyBurn(e,dmg,src,owner){ e.burnGen=0; e.burnT=2.0+clsB(owner,'feuer','dur')+((owner&&owner.burnPlus)||0); e.burnDmg=Math.max(e.burnDmg,dmg*(1+clsB(owner,'feuer','dmg'))); e.burnSrc=src; e.burnOwner=owner; }
function dropPool(b,effect){ if(b.pooled||b.depth>0)return; b.pooled=1;
  spawnPuddle(b.x,b.y,b.dmg*0.4,{hostile:false,effect,life:2.5*(effect==='toxin'?1+clsB(b.owner,'seuche','life'):1)*((b.owner&&b.owner.puddleMul)||1),rMul:1.3,src:b.wid,owner:b.owner}); }
/* Gift auf Gegnern: bis 3 Stapel, jeder Stapel tickt dps; Wolken halten mindestens 1 Stapel aufrecht */
function applyPoison(e,dps,src,owner,stack){ e.poisonStacks=stack?Math.min(3,(e.poisonStacks||0)+1):Math.max(1,e.poisonStacks||0);
  e.poisonDps=Math.max(e.poisonDps||0,dps); e.poisonT=Math.max(e.poisonT||0,3); e.poisonSrc=src; e.poisonOwner=owner; e.poisonGen=0; }
/* Ansteckung beim Tod (Pestflasche: Gift, Brandpfeil: Brand) — springt genau einmal auf den nächsten Gegner */
function spreadOnDeath(e){
  const near=(r,k)=>enemies.filter(o=>o!==e&&dist2(e.x,e.y,o.x,o.y)<r*r).sort((a,b)=>dist2(e.x,e.y,a.x,a.y)-dist2(e.x,e.y,b.x,b.y)).slice(0,k);
  const wp=weaponById(e.poisonSrc), wb=weaponById(e.burnSrc), pg=e.poisonGen||0, bgn=e.burnGen||0;
  if(e.poisonT>0 && wp&&wp.contagion && pg<(wp.contagionMax||1)){ for(const n of near(140,1)){ applyPoison(n,e.poisonDps,e.poisonSrc,e.poisonOwner,true); n.poisonGen=pg+1; bolts.push({x1:e.x,y1:e.y,x2:n.x,y2:n.y,t:0.12,color:C.sick}); } }
  if(e.burnT>0 && wb&&wb.ignite && bgn<1){ for(const n of near(140,wb.igniteN||1)){ applyBurn(n,e.burnDmg,e.burnSrc,e.burnOwner); n.burnGen=bgn+1; bolts.push({x1:e.x,y1:e.y,x2:n.x,y2:n.y,t:0.12,color:C.candle}); } } }
function applySlow(e,owner){ e.slowT=1.4+clsB(owner,'frost','dur'); e.slowF=clsB(owner,'frost','slow'); }
function bulletFx(w,p){ const on={burn:w.burn||p.burn,slow:w.slow||p.slow,poison:w.poison,puddle:w.puddle,toxcloud:w.toxcloud,frostpool:w.frostpool,bounce:w.bounce,chain:w.chain,explode:w.explosive||p.explosive,
    hex:w.hex,nail:w.nail,rail:w.rail,verdict:w.verdict};
  return FX_ORDER.filter(k=>on[k]).concat(p.fxMods||[]); }
function runFx(b,hook,a1,a2){ let res; for(const id of b.fx){ const h=BULLET_FX[id]&&BULLET_FX[id][hook]; if(h){ const r=h(b,a1,a2); if(r)res=r; } } return res; }
function fxDmg(b,e){ let d=b.dmg; for(const id of b.fx){ const h=BULLET_FX[id]&&BULLET_FX[id].dmg; if(h)d=h(b,d,e); } return d; }

/* ---------- RELIQUIEN-AUSLÖSER ----------
   Bremse: Schaden aus einem Auslöser löst keine weiteren Auslöser aus (G._relicD); Hammer feuert aus
   Splittern (depth 1) nur mit 20% der Chance, ab depth 2 gar nicht. */
function relicOnHit(b,e,dmg){ const o=b.owner; if(!hasRelic(o,'hammer')||b.depth>1||G._relicD||e.hp<=0)return;
  if(Math.random()<0.1*(b.depth?0.2:1)){ G._relicD=1; e.rootT=0.5; damageEnemy(e,dmg*0.5,0,0,false,'r_hammer',o); G._relicD=0; spawnFloater(e.x,e.y-e.r-10,'✚',true); } }
function relicOnKill(e,o){ if(!o||!o.relics||G._relicD)return; G._relicD=1;
  try{
    if(o.relics.bell){ const ok=Math.max(0,-e.hp)*0.3; if(ok>=1){ novaRings.push({x:e.x,y:e.y,r:8,max:90,t:0.3,color:C.bone});
      for(const n of enemies.slice()) if(n!==e&&dist2(e.x,e.y,n.x,n.y)<90*90) damageEnemy(n,ok,Math.atan2(n.y-e.y,n.x-e.x),30,false,'r_bell',o); } }
    if(o.relics.urn && e.burnT>0){ const d=(e.lastHit||0)*0.4; if(d>0){ novaRings.push({x:e.x,y:e.y,r:8,max:60,t:0.3,color:C.candle});
      for(const n of enemies.slice()) if(n!==e&&dist2(e.x,e.y,n.x,n.y)<60*60) damageEnemy(n,d,Math.atan2(n.y-e.y,n.x-e.x),40,false,'r_urn',o); } }
  } finally { G._relicD=0; } }
function giveRelic(p,id){ const r=relicById(id); if(!p||!r||hasRelic(p,id))return; p.relics[id]=true; codexSeen('r',id);
  p.items.push({ic:r.ic,color:C.gold2,relic:true}); updateItemPills(); checkSets(p); }
function relicRecipeHint(id){ const rc=WEAPON_EVOS.find(x=>x.relic===id); return rc?t('relic_recipe',{w:weaponById(rc.a).name,r:weaponById(rc.result).name}):''; }

/* ---------- SCHREINE: auf Nicht-Boss-Stationen mit 35%; 1,5 s darin stehen aktiviert ihn (keine neue Taste) ---------- */
const SHRINES={
  blood:{name:'Blutschrein', color:'#c01f24', ic:'leech', desc:'−10 Max-LP → sofort eine Reliquie'},
  greed:{name:'Schrein der Gier', color:'#e0b25a', ic:'crown', desc:'Alle Gegner +50% Leben · Gold dieser Welle ×2'},
};
function maybeShrine(){ if(Math.random()>=0.35)return;
  const kinds=['greed']; if(players.some(pl=>RELICS.some(r=>!hasRelic(pl,r.id)))) kinds.push('blood');
  for(let k=0;k<40;k++){ const x=rand(ROOM.x+80,ROOM.x+ROOM.w-80), y=rand(ROOM.y+80,ROOM.y+ROOM.h-80);
    if(dist2(x,y,players[0].x,players[0].y)<220*220 || obstacles.some(ob=>dist2(x,y,ob.x,ob.y)<(ob.r+50)*(ob.r+50))) continue;
    G.shrine={x,y,kind:pick(kinds),prog:0,used:false}; return; } }
function updateShrine(dt){ const sh=G.shrine; if(!sh||sh.used)return;
  const pl=players.find(p=>!p.dead&&dist2(p.x,p.y,sh.x,sh.y)<38*38);
  if(!pl){ sh.prog=Math.max(0,sh.prog-dt*2); return; }
  sh.prog+=dt; if(sh.prog<1.5)return; sh.used=true; Audio2.ability(); G.shake=Math.max(G.shake,5);
  for(let i=0;i<24;i++)spawnParticle(sh.x,sh.y,SHRINES[sh.kind].color,rand(1.5,3),rand(80,200));
  if(sh.kind==='greed'){ for(const e of enemies){ if(e.isBoss)continue; e.maxHp*=1.5; e.hp*=1.5; } G.waveGoldMul=2; showToast(SHRINES.greed.name,t('shrine_greed_done')); }
  else { pl.maxHP=Math.max(1,pl.maxHP-10); pl.hp=Math.min(pl.hp,pl.maxHP); updateHP(); player=pl;
    openRelic(()=>{ hideAllOverlays(); player=players[0]; G.state='playing'; $('#hud').classList.add('show'); last=performance.now(); }); } }
function drawShrine(){ const sh=G.shrine; if(!sh)return; const k=SHRINES[sh.kind], tt=G.uiTime;
  cx.save(); cx.translate(sh.x,sh.y);
  cx.fillStyle='rgba(0,0,0,.45)'; cx.beginPath(); cx.ellipse(0,14,30,10,0,0,TAU); cx.fill();
  cx.fillStyle='#2e2a24'; cx.fillRect(-22,-6,44,20); cx.fillStyle='#3a342c'; cx.fillRect(-26,-12,52,8);
  if(!sh.used){ cx.globalAlpha=0.35+Math.sin(tt*3)*0.15; cx.fillStyle=k.color; cx.beginPath(); cx.arc(0,-26,16,0,TAU); cx.fill(); cx.globalAlpha=1;
    cx.save(); cx.translate(-11,-37); cx.drawImage(shrineIcon(sh.kind),0,0); cx.restore();
    cx.strokeStyle='rgba(255,236,210,.25)'; cx.lineWidth=1; cx.setLineDash([4,4]); cx.beginPath(); cx.arc(0,4,38,0,TAU); cx.stroke(); cx.setLineDash([]);
    if(sh.prog>0){ cx.strokeStyle=k.color; cx.lineWidth=3; cx.beginPath(); cx.arc(0,4,38,-Math.PI/2,-Math.PI/2+TAU*sh.prog/1.5); cx.stroke(); }
    cx.fillStyle=k.color; cx.font='bold 10px "JetBrains Mono",monospace'; cx.textAlign='center'; cx.fillText(k.name,0,34); }
  else { cx.fillStyle='rgba(120,110,100,.5)'; cx.fillRect(-4,-30,8,18); }
  cx.restore(); }
const SHRINE_ICONS={};
function shrineIcon(kind){ if(SHRINE_ICONS[kind])return SHRINE_ICONS[kind]; const img=new Image(); img.src='data:image/svg+xml;utf8,'+encodeURIComponent(svgIcon(SHRINES[kind].ic,'#fff',22).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ')); SHRINE_ICONS[kind]=img; return img; }

function nearestEnemy(x,y){let best=null,bd=1e9;for(const e of enemies){const d=dist2(x,y,e.x,e.y);if(d<bd){bd=d;best=e;}}return best;}
function updateBullets(dt){
  updateMelee(dt); updateSynergy(dt);   // Nahkampf-Schwünge, Duo-/Set-Effekte, Regeneration (melee.js, synergy.js)
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i]; b.life-=dt;
    /* ponytail: keine Zielsuche mehr — Schüsse fliegen geradeaus, ändern nie die Richtung */
    b.x+=b.vx*dt; b.y+=b.vy*dt; runFx(b,'fly',dt);
    let dead=false;
    if(b.life<=0){ runFx(b,'expire'); dead=true; }
    else if(b.x<ROOM.x||b.x>ROOM.x+ROOM.w||b.y<ROOM.y||b.y>ROOM.y+ROOM.h) dead=runFx(b,'wall')!=='keep';
    if(!dead){ const ob=bulletHitsObstacle(b); if(ob && runFx(b,'obstacle',ob)!=='keep'){ for(let k=0;k<3;k++)spawnParticle(b.x,b.y,b.color,1.2,40); dead=true; } }
    if(!dead){
      for(const e of enemies){
        if(b.hitIds.has(e.id))continue;
        if(dist2(b.x,b.y,e.x,e.y)<(b.r+e.r)*(b.r+e.r)){
          const gd=e.guard&&e.guard(e,b); if(gd==='pass')continue; if(gd==='block'){ dead=true; break; }   // Regionsgegner: Geist, Kreuzträger
          const dmg=fxDmg(b,e);
          damageEnemy(e,dmg,Math.atan2(b.vy,b.vx),b.kb,true,b.wid,b.owner); relicOnHit(b,e,dmg);
          if(b.crit&&b.owner&&b.owner.critSlow&&e.hp>0) applySlow(e,b.owner);
          spawnFloater(e.x,e.y-e.r,Math.round(dmg),b.crit); Audio2.hit();
          b.hitIds.add(e.id); b.pierce--;
          if(runFx(b,'hit',e)==='die'||gd==='absorb'){ dead=true; break; }
          for(let k=0;k<3;k++)spawnParticle(b.x,b.y,b.color,1.2,40);
          if(b.pierce<0){dead=true;break;}
        }
      }
    }
    if(dead) bullets.splice(i,1);
  }
  for(let i=ebullets.length-1;i>=0;i--){
    const b=ebullets[i]; b.life-=dt;
    if(b.lob) b.startD+=Math.hypot(b.vx,b.vy)*dt;
    b.x+=b.vx*dt; b.y+=b.vy*dt;
    let dead=b.life<=0;
    if(b.x<ROOM.x-10||b.x>ROOM.x+ROOM.w+10||b.y<ROOM.y-10||b.y>ROOM.y+ROOM.h+10) dead=true;
    if(!dead && !b.lob && bulletHitsObstacle(b)) dead=true;
    if(b.lob && b.startD>=b.maxD){ spawnPuddle(b.x,b.y,b.dmg*0.5,{hostile:true,effect:'poison',big:true}); dead=true; }
    if(!dead){ for(const pl of players){ if(pl.dead||pl.invuln>0)continue; if(dist2(b.x,b.y,pl.x,pl.y)<(b.r+pl.r)*(b.r+pl.r)){ hurtPlayer(b.dmg,pl); if(b.onHit)b.onHit(pl); dead=true; break; } } }
    if(dead) ebullets.splice(i,1);
  }
}
function explodeBullet(b){
  G.shake=Math.max(G.shake,3);
  for(let i=0;i<10;i++)spawnParticle(b.x,b.y,C.candle,rand(1.5,3),rand(80,180));
  for(const e of enemies){ if(dist2(b.x,b.y,e.x,e.y)<60*60){ damageEnemy(e,b.dmg*0.7,Math.atan2(e.y-b.y,e.x-b.x),40,true,b.wid,b.owner); } }
}
function chainLightning(b,from){
  let last=from,jumps=clsB(b.owner,'blitz','jumps')+((b.owner&&b.owner.chainPlus)||0); const hitS=new Set([from.id]), rng=140+clsB(b.owner,'blitz','range');
  while(jumps-->0){
    let best=null,bd=rng*rng;
    for(const e of enemies){if(hitS.has(e.id))continue;const d=dist2(last.x,last.y,e.x,e.y);if(d<bd){bd=d;best=e;}}
    if(!best)break;
    damageEnemy(best,b.dmg*0.6,0,20,true,b.wid,b.owner); hitS.add(best.id);
    bolts.push({x1:last.x,y1:last.y,x2:best.x,y2:best.y,t:0.12}); last=best;
  }
}
function spawnPuddle(x,y,dps,opts){ opts=opts||{}; puddles.push({x,y,r:(opts.big?42:26)*(opts.rMul||1),dps,life:opts.life||2.2,hostile:!!opts.hostile,effect:opts.effect||'poison',src:opts.src,owner:opts.owner}); for(let i=0;i<6;i++)spawnParticle(x,y, opts.effect==='fire'?C.candle:opts.effect==='chill'?C.chill:C.sick,1.5,40); }
function updatePuddles(dt){
  for(let i=puddles.length-1;i>=0;i--){const pu=puddles[i];pu.life-=dt;
    if(pu.hostile){
      for(const pl of players){ if(pl.dead)continue; if(dist2(pu.x,pu.y,pl.x,pl.y)<pu.r*pu.r){
        if(pu.effect==='fire') applyStatus('burn',1.6,pu.dps,pl); else applyStatus('poison',2.4,pu.dps,pl);
      } }
    } else {
      for(const e of enemies){ if(!e.isBoss && dist2(pu.x,pu.y,e.x,e.y)<pu.r*pu.r){
        if(pu.effect==='toxin'){ applyPoison(e,pu.dps,pu.src,pu.owner,false); continue; }    // Wolke vergiftet statt direkt zu schaden
        if(pu.effect==='chill'){ applySlow(e,pu.owner); e.slowF=Math.min(e.slowF,0.3); }      // Frostpfütze: starke Verlangsamung + leichter Schaden
        hurtEnemyRaw(e,pu.dps*dt,pu.src||'puddle',pu.owner);} }
    }
    if(pu.life<=0)puddles.splice(i,1);
  }
}
function spawnPickup(x,y,type,val){ pickups.push({x:clamp(x+rand(-8,8),ROOM.x,ROOM.x+ROOM.w),y:clamp(y+rand(-8,8),ROOM.y,ROOM.y+ROOM.h),type,val,r:7,life:24,bob:rand(0,TAU)}); }
function updatePickups(dt){
  for(let i=pickups.length-1;i>=0;i--){const pk=pickups[i];pk.life-=dt;pk.bob+=dt*4;
    const tp=nearestPlayer(pk.x,pk.y); if(!tp){ if(pk.life<=0)pickups.splice(i,1); continue; }
    const d=Math.hypot(pk.x-tp.x,pk.y-tp.y);
    const magnet=(pk.type==='xp'?105:80)*(tp.magnet||1);
    if(d<magnet){const a=Math.atan2(tp.y-pk.y,tp.x-pk.x);pk.x+=Math.cos(a)*250*dt;pk.y+=Math.sin(a)*250*dt;}
    if(collectPickup(pk,i,d,tp)) continue;
    if(pk.life<=0)pickups.splice(i,1);
  }
}
function collectPickup(pk,i,d,who){ const p=who||player;
  if(d<p.r+pk.r){
    if(pk.type==='coin'){G.coins+=pk.val;if(G.run)G.run.gold+=pk.val;$('#coinTag').textContent=G.coins;Audio2.coin();}
    else if(pk.type==='xp'){addXP(pk.val,p);Audio2.coin();for(let k=0;k<3;k++)spawnParticle(pk.x,pk.y,C.xp,1.2,40);}
    else{healPlayer(p,pk.val);for(let k=0;k<6;k++)spawnParticle(pk.x,pk.y,C.blood2,1.5,50);}
    pickups.splice(i,1);return true;
  }
  return false;
}
function vacuumPickups(dt){
  for(let i=pickups.length-1;i>=0;i--){const pk=pickups[i];
    const tp=nearestPlayer(pk.x,pk.y)||players[0]; if(!tp){pickups.splice(i,1);continue;}
    const a=Math.atan2(tp.y-pk.y,tp.x-pk.x), d=Math.hypot(pk.x-tp.x,pk.y-tp.y);
    pk.x+=Math.cos(a)*Math.max(420,d*6)*dt; pk.y+=Math.sin(a)*Math.max(420,d*6)*dt;
    if(pk.type==='xp')for(let k=0;k<1;k++)spawnParticle(pk.x,pk.y,C.xp,1,20);
    collectPickup(pk,i,d,tp);
  }
}
function spawnParticle(x,y,color,r,spd){const a=rand(0,TAU);particles.push({x,y,vx:Math.cos(a)*spd*rand(.3,1),vy:Math.sin(a)*spd*rand(.3,1),r,color,life:rand(.3,.7)});if(particles.length>620)particles.shift();}
function updateParticles(dt){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.92;p.vy*=0.92;if(p.life<=0)particles.splice(i,1);}
  for(let i=bolts.length-1;i>=0;i--){bolts[i].t-=dt;if(bolts[i].t<=0)bolts.splice(i,1);}
  for(let i=beams.length-1;i>=0;i--){beams[i].t-=dt;if(beams[i].t<=0)beams.splice(i,1);}
  for(let i=novaRings.length-1;i>=0;i--){const n=novaRings[i];n.t-=dt;n.r=lerp(n.r,n.max,0.25);if(n.t<=0)novaRings.splice(i,1);}}
function spawnFloater(x,y,n,crit){floaters.push({x:x+rand(-6,6),y,n,crit,life:0.7,vy:-40});if(floaters.length>70)floaters.shift();}
function updateFloaters(dt){for(let i=floaters.length-1;i>=0;i--){const f=floaters[i];f.life-=dt;f.y+=f.vy*dt;f.vy*=0.94;if(f.life<=0)floaters.splice(i,1);}}

function hurtPlayer(dmg,who){
  const p=who||player; if(p.dead||p.invuln>0||Admin.god)return;
  p.waveHit=true; if(hasRelic(p,'mblood')) p.mbloodT=2;
  p.hurtT=G.time;   // Regeneration pausiert danach (synergy.js)
  dmg=Math.max(1,dmg-(p.armorLocked?0:p.armor));   // Fluch Eiserne Gier: Rüstung wirkt nicht
  if(p.shield>0){ const a=Math.min(p.shield,dmg); p.shield-=a; dmg-=a; p.shieldRegT=Math.max(p.shieldRegT,2.0);
    for(let i=0;i<6;i++)spawnParticle(p.x,p.y,C.chill,2,90); }
  if(dmg>0){ p.hp-=dmg; G.hurtFlash=0.35; for(let i=0;i<8;i++)spawnParticle(p.x,p.y,C.blood2,2,120); }
  p.invuln=0.6; G.shake=Math.max(G.shake,5); Audio2.hurt();
  updateHP();
  if(p.hp<=0){ if(p.revive>0){ doRevive(p); return; } onPlayerDead(p); }
}
