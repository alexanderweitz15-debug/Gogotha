"use strict";
/* GOLGOTHA — Spieler: Bewegung, Waffen abfeuern, Strahl, Blitzschlag, Geschütze/Totems/Minen/Begleiter, Fähigkeiten (Teil von game.js, Reihenfolge siehe index.html) */
/* =========================================================================
   PLAYER
   ========================================================================= */
function xpForLevel(l){return Math.floor(6 + (l-1)*5 + (l-1)*(l-1)*0.8);}
function makePlayer(charId,ctrl){
  const ch=charById(charId);
  const p={x:WORLD.w/2,y:WORLD.h/2,r:13,charId:charId,ctrl:ctrl||'solo',dead:false,pendingUp:0,pendingAb:0,
    maxHP:ch.hp,hp:ch.hp,speed:215*(ch.speed||1),
    dmgMult:(ch.dmg||1),frMult:(ch.fr||1),projSpeed:1,projSize:1,
    pierce:0,multishot:0,lifesteal:0,thorns:(ch.thorns||0),crit:0.04,critMult:2.0,
    armor:(ch.armor||0),kbMult:1,homing:0,burn:!!ch.burn,slow:false,explosive:false,
    luck:0,goldMult:1,xpMult:1,
    weapons:[ch.weapon],wLevel:{},wCd:[0],heldTime:0,
    invuln:0,dashCd:0,dashTime:0,dashDir:{x:1,y:0},aim:0,
    level:1,xp:0,xpNext:xpForLevel(1),items:[],abilities:[],taken:{},fxMods:[],magnet:1,priceMul:1,skull:false,relics:{},featherNext:{},mbloodT:0,waveHit:false,
    /* ability state */
    orbitN:0,orbitDmg:0,orbitR:46,orbitAng:0,
    novaDmg:0,novaCd:3,novaR:120,novaT:3,novaColor:C.gold2,
    shield:0,shieldMax:0,shieldRegT:0,
    execPct:0,frenzy:false,frenzyPow:0,frenzyActive:false,
    revive:0,auraDps:0,auraR:0,
    statuses:{poison:{t:0,dps:0},burn:{t:0,dps:0},chill:{t:0,mult:1}}};
  const pr=CHAR_PROFILE[charId]; if(pr){ if(pr.hpMul){ p.maxHP=Math.round(p.maxHP*pr.hpMul); p.hp=p.maxHP; } if(pr.heal) p.healMul=pr.heal;
    const st=pr.stats||{};
    if(st.kbMult) p.kbMult*=st.kbMult; if(st.weaponCap) p.weaponCap=st.weaponCap; if(st.dmgAdd) p.dmgMult+=st.dmgAdd;
    if(st.critAdd) p.crit+=st.critAdd; if(st.critMultAdd) p.critMult+=st.critMultAdd; if(st.revive) p.revive=(p.revive||0)+st.revive;
    for(const k of ['puddleMul','puddleHeal','chainPlus','burnPlus','critSlow']) if(st[k]) p[k]=st[k]; }
  recalcClasses(p); return p;
}
/* Heilung läuft über healMul (Flagellant: −30%) */
function healPlayer(p,amt){ if(!p||p.dead)return; p.hp=clamp(p.hp+amt*(p.healMul||1),0,p.maxHP); updateHP(); }
function giveWeapon(id){ if(!player)return;
  if(!player.weapons.includes(id)){player.weapons.push(id);player.wCd.push(0);}
  else {player.wLevel[id]=Math.min(WEAPON_MAX_LEVEL-1,(player.wLevel[id]||0)+1);}
  recalcClasses(player); updateWeaponBar(); }
function giveUpgradeDef(def,rk){ if(!player||!upAvail(def))return; const r=rarRank(rk); def.apply(player,r); player.taken[def.id]=(player.taken[def.id]||0)+1; player.hp=clamp(player.hp,0,player.maxHP);
  player.items.push({ic:def.ic,color:rarColor(rk)}); updateItemPills(); updateHP(); }
function giveAbility(def,rk){ if(!player)return; const r=rarRank(rk);
  const existing=player.abilities.find(a=>a.id===def.id);
  if(existing){ existing.level=(existing.level||1)+1; existing.rk=rk; def.apply(player, Math.min(7, r+existing.level-1)); }
  else { def.apply(player,r); player.abilities.push({id:def.id,rk:rk,name:def.name,level:1,ic:def.ic});
    player.items.push({ic:def.ic,color:rarColor(rk),ability:true}); }
  player.hp=clamp(player.hp,0,player.maxHP); updateItemPills(); updateHP();
  checkAbilityEvolution(); }
function performWeaponEvolution(r){
  [r.a,r.b].forEach(id=>{ const i=player.weapons.indexOf(id); if(i>=0){player.weapons.splice(i,1); player.wCd.splice(i,1); delete player.wLevel[id];} });
  giveWeapon(r.result); Audio2.ability();
  const res=weaponById(r.result);
  showToast(t('shop_evo'),'<b style="color:'+rarColor(res.rk)+'">'+res.name+'</b> '+t('evo_done'));
  advancePost();
}
function checkAbilityEvolution(){
  for(const r of ABILITY_EVOS){
    const ha=player.abilities.find(a=>a.id===r.a), hb=player.abilities.find(a=>a.id===r.b);
    if(ha&&hb&&!player.abilities.find(a=>a.id===r.result)){
      player.abilities=player.abilities.filter(a=>a.id!==r.a&&a.id!==r.b);
      const def=abById(r.result); def.apply(player,6);
      player.abilities.push({id:def.id,rk:'godlike',name:def.name,level:1,ic:def.ic});
      player.items.push({ic:def.ic,color:rarColor('godlike'),ability:true});
      updateItemPills(); Audio2.ability();
      showToast(t('ab_evo'),'<b style="color:'+rarColor('godlike')+'">'+def.name+'</b> '+t('ab_evo_done'));
    }
  }
}
let toastTimer=null;
function showToast(title,html){ const t=$('#toast'); if(!t)return;
  t.innerHTML='<div class="toast-t">'+title+'</div><div class="toast-s">'+html+'</div>';
  t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2900); }
function addXP(n,who){ const p=who||player; p.xp+=n*(p.xpMult||1);
  while(p.xp>=p.xpNext){ p.xp-=p.xpNext; p.level++; p.xpNext=xpForLevel(p.level);
    p.pendingUp++; if(ABILITY_LEVELS.includes(p.level)) p.pendingAb++; }
  updateXPBar(); }
function applyStatus(type,dur,strength,who){ const s=(who||player).statuses[type]; if(!s)return;
  if(type==='chill'){ s.t=Math.max(s.t,dur); s.mult=strength; } else { s.t=Math.max(s.t,dur); s.dps=Math.max(s.dps,strength); } }
function clearStatuses(who){ const s=(who||player).statuses; s.poison.t=0;s.burn.t=0;s.chill.t=0; updateStatusBar(); }

/* dodge nerf: längerer cooldown, kürzere distanz */
const DASH_SPEED=430, DASH_TIME=0.14, DASH_CD=2.4;
function tryDash(who){
  const p=who||players[0]; if(G.state!=='playing'||!p||p.dead)return;
  if(p.dashCd>0 && !Admin.dash)return;
  const solo=p.ctrl==='solo', p2=p.ctrl==='p2';
  const R=(!p2&&keys.KeyD)||((p2||solo)&&keys.ArrowRight), L=(!p2&&keys.KeyA)||((p2||solo)&&keys.ArrowLeft);
  const D=(!p2&&keys.KeyS)||((p2||solo)&&keys.ArrowDown), U=(!p2&&keys.KeyW)||((p2||solo)&&keys.ArrowUp);
  let dx=(R?1:0)-(L?1:0), dy=(D?1:0)-(U?1:0);
  if(TouchJoy.id!==null && !p2){ dx=TouchJoy.dx; dy=TouchJoy.dy; }
  if(dx===0&&dy===0){ dx=Math.cos(p.aim); dy=Math.sin(p.aim); }
  const m=Math.hypot(dx,dy)||1; p.dashDir={x:dx/m,y:dy/m};
  p.dashTime=DASH_TIME; p.invuln=Math.max(p.invuln,0.22); p.dashCd=DASH_CD;
  G.shake=Math.max(G.shake,3); Audio2.dash();
  for(let i=0;i<6;i++) spawnParticle(p.x,p.y,C.gold2,2,120);
}
function updatePlayer(dt){
  const p=player;
  const solo=p.ctrl==='solo', p2=p.ctrl==='p2';                 // p1=WASD, p2=Pfeile, solo=beides
  const R=(!p2&&keys.KeyD)||((p2||solo)&&keys.ArrowRight), L=(!p2&&keys.KeyA)||((p2||solo)&&keys.ArrowLeft);
  const D=(!p2&&keys.KeyS)||((p2||solo)&&keys.ArrowDown),  U=(!p2&&keys.KeyW)||((p2||solo)&&keys.ArrowUp);
  let dx=(R?1:0)-(L?1:0);
  let dy=(D?1:0)-(U?1:0);
  if(TouchJoy.id!==null && !p2){ dx=TouchJoy.dx; dy=TouchJoy.dy; }
  const mlen=Math.hypot(dx,dy); p.moving=mlen>0||p.dashTime>0;
  const tgt=nearestEnemy(p.x,p.y);
  if(tgt) p.aim=Math.atan2(tgt.y-p.y,tgt.x-p.x);
  else if(mlen>0) p.aim=Math.atan2(dy,dx);
  const chillMult=p.statuses.chill.t>0?p.statuses.chill.mult:1;
  const frenzyMove=p.frenzyActive?(1+p.frenzyPow):1;
  if(p.dashTime>0){p.dashTime-=dt;p.x+=p.dashDir.x*DASH_SPEED*dt;p.y+=p.dashDir.y*DASH_SPEED*dt;if(Math.random()<0.6)spawnParticle(p.x,p.y,'rgba(224,178,90,.5)',2,40);}
  else if(mlen>0){p.x+=(dx/mlen)*p.speed*chillMult*frenzyMove*dt;p.y+=(dy/mlen)*p.speed*chillMult*frenzyMove*dt;}
  collideObstacles(p);
  p.x=clamp(p.x,ROOM.x+p.r,ROOM.x+ROOM.w-p.r);p.y=clamp(p.y,ROOM.y+p.r,ROOM.y+ROOM.h-p.r);
  if(p.invuln>0)p.invuln-=dt;if(p.dashCd>0)p.dashCd-=dt;if(p.mbloodT>0)p.mbloodT-=dt;
  if(tgt) p.heldTime+=dt; else p.heldTime=Math.max(0,p.heldTime-dt*2);
  const frMul=p.frMult*(p.frenzyActive?(1-p.frenzyPow*0.5):1);
  for(let i=0;i<p.weapons.length;i++){
    p.wCd[i]-=dt;
    const w=weaponById(p.weapons[i]);
    if(p.wCd[i]<=0 && (tgt || w.deploy)){
      if(w.deploy) deployFromWeapon(w);
      else fireWeapon(w,Math.atan2(tgt.y-p.y,tgt.x-p.x));
      let fr=w.fr; if(w.ramp)fr=lerp(w.fr,w.frMin,clamp(p.heldTime/1.4,0,1));
      p.wCd[i]=(fr*frMul*(1-clsB(p,'pulver','fr'))*charCdMul(p,w))/1000; (p.wCdMax||(p.wCdMax=[]))[i]=p.wCd[i];
    }
  }
  if(p.ctrl!=='p2') $('#dashPip').classList.toggle('ready',p.dashCd<=0||Admin.dash);
}
const skullMul=p=>p.skull&&G.run?1+Math.min(0.4,G.run.kills/25*0.01):1;
/* Zusatz-Schadensfaktoren aus Gaben/Reliquien: Totenschädel, Märtyrerblut */
const bonusMul=p=>skullMul(p)*(p.mbloodT>0?1.3:1);
function weaponDamage(w){ const lvl=player.wLevel[w.id]||0; return w.dmg*(1+lvl*0.22); }
function fireWeapon(w,base){
  if(w.beam){ fireBeam(w,base); return; }
  if(w.strike){ fireStrike(w); return; }
  const p=player, n=w.count+p.multishot+charShots(p,w), spr=w.spread*(1+clsB(p,'pulver','spread')), total=spr*(n-1);
  Audio2.shoot();
  const baseDmg=weaponDamage(w)*charDmgMul(p,w);
  const frenzyDmg=p.frenzyActive?(1+p.frenzyPow):1;
  const martyrDmg=(p.curseMartyr && p.hp<p.maxHP*0.5)?1.9:1;   // Fluch Märtyrertum: +90% unter 50% LP
  const feather=hasRelic(p,'feather')&&p.featherNext[w.id]; if(feather)p.featherNext[w.id]=false; let anyCrit=false;
  for(let i=0;i<n;i++){
    let ang;
    if(w.pattern==='ring') ang=base+TAU*i/n;   // gleichmäßig rundum, ein Geschoss immer genau aufs Ziel
    else if(w.pattern==='even'&&n>1) ang=base-total/2+total*(i/(n-1));
    else ang=base+rand(-spr,spr);
    let dmg=baseDmg*p.dmgMult*frenzyDmg*martyrDmg*bonusMul(p)*Admin.dmg, crit=false;
    if(Math.random()<p.crit){dmg*=p.critMult;crit=true;anyCrit=true;}
    const spd=w.spd*p.projSpeed, sz=w.size*p.projSize;
    const nb={id:uid++,x:p.x+Math.cos(ang)*16,y:p.y+Math.sin(ang)*16,
      vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,dmg,r:sz,
      pierce:w.pierce+p.pierce+clsB(p,'eisen','pierce')+(feather?2:0),life:w.life||1.8,kb:w.kb*p.kbMult*(1+clsB(p,'eisen','kb')),color:w.color,crit,
      fx:bulletFx(w,p),owner:p,depth:0,wid:w.id,hitIds:new Set()};
    bullets.push(nb); runFx(nb,'spawn');
  }
  if(anyCrit&&hasRelic(p,'feather')) p.featherNext[w.id]=true;
  if(w.kb>250)G.shake=Math.max(G.shake,2.5);
  spawnParticle(p.x+Math.cos(base)*16,p.y+Math.sin(base)*16,'rgba(255,220,150,.7)',2,30);
}

/* ---------- PHASE 6: LASERSTRAHL (sofortiger Treffer entlang einer Linie) ---------- */
function fireBeam(w,base){
  const p=player; Audio2.shoot();
  const len=w.spd||900, ex=p.x+Math.cos(base)*len, ey=p.y+Math.sin(base)*len;
  const frenzyDmg=p.frenzyActive?(1+p.frenzyPow):1, martyrDmg=(p.curseMartyr&&p.hp<p.maxHP*0.5)?1.9:1;
  let dmg=weaponDamage(w)*charDmgMul(p,w)*p.dmgMult*frenzyDmg*martyrDmg*bonusMul(p)*Admin.dmg, crit=false;
  if(Math.random()<p.crit){dmg*=p.critMult;crit=true;}
  const rad=(w.size||6)*p.projSize;
  /* trifft die nächsten (Durchschlag+1) Gegner auf der Linie, nicht alle */
  const maxHits=(w.pierce||0)+p.pierce+clsB(p,'eisen','pierce')+1;
  const onLine=enemies.filter(e=>distToSeg(e.x,e.y,p.x,p.y,ex,ey)<e.r+rad).sort((a,b)=>dist2(p.x,p.y,a.x,a.y)-dist2(p.x,p.y,b.x,b.y)).slice(0,maxHits);
  for(const e of onLine){ {
    damageEnemy(e,dmg,base,w.kb||40,true,w.id,p);
    spawnFloater(e.x,e.y-e.r,Math.round(dmg),crit);
    if(w.burn||p.burn) applyBurn(e,dmg*0.4+2,w.id,p);
    if(w.slow||p.slow) applySlow(e,p); } }
  beams.push({x1:p.x,y1:p.y,x2:ex,y2:ey,t:0.09,color:w.color,width:rad*1.6});
}

/* Sturmrufer: Blitze fallen vom Himmel auf zufällige Gegner in Reichweite — kein Geschoss, verfehlt nie, ignoriert Deckung */
function fireStrike(w){ const p=player, n=w.count+p.multishot+charShots(p,w), R=w.spd||480;
  const pool=enemies.filter(e=>dist2(p.x,p.y,e.x,e.y)<R*R); if(!pool.length)return; Audio2.shoot();
  const frenzyDmg=p.frenzyActive?(1+p.frenzyPow):1, martyrDmg=(p.curseMartyr&&p.hp<p.maxHP*0.5)?1.9:1;
  for(let i=0;i<n&&pool.length;i++){ const e=pool.splice(Math.floor(Math.random()*pool.length),1)[0];
    let dmg=weaponDamage(w)*charDmgMul(p,w)*p.dmgMult*frenzyDmg*martyrDmg*bonusMul(p)*Admin.dmg, crit=false;
    if(Math.random()<p.crit){dmg*=p.critMult;crit=true;}
    bolts.push({x1:e.x+rand(-40,40),y1:e.y-280,x2:e.x,y2:e.y,t:0.16,color:w.color});
    for(let k=0;k<5;k++)spawnParticle(e.x,e.y,w.color,1.6,90);
    const ex=e.x, ey=e.y; damageEnemy(e,dmg,-Math.PI/2,w.kb,true,w.id,p); spawnFloater(ex,ey-e.r,Math.round(dmg),crit);
    if(e.hp>0){ if(p.burn)applyBurn(e,dmg*0.5+2,w.id,p); if(p.slow||(crit&&p.critSlow))applySlow(e,p); }
    if(w.chain) chainLightning({dmg,owner:p,wid:w.id,depth:0},e); } }

/* ---------- PHASE 6: DEPLOYABLES (Geschütz/Totem/Mine/Begleiter) ---------- */
function deployFromWeapon(w){
  const p=player, max=(w.deployMax||3)+clsB(p,'konstrukt','max');
  const mineList=deployables.filter(d=>d.wid===w.id);
  while(mineList.length>=max){ const old=mineList.shift(); const k=deployables.indexOf(old); if(k>=0)deployables.splice(k,1); }
  let x=p.x,y=p.y;
  if(w.deploy!=='companion'){ x=clamp(p.x+Math.cos(p.aim)*38,ROOM.x+12,ROOM.x+ROOM.w-12); y=clamp(p.y+Math.sin(p.aim)*38,ROOM.y+12,ROOM.y+ROOM.h-12); }
  const frenzyDmg=p.frenzyActive?(1+p.frenzyPow):1;
  for(let k=0;k<(w.deploy==='rat'?(w.count||1):1);k++){   // Rattenkäfig setzt mehrere Ratten auf einmal frei
  if(k>0){ const ml=deployables.filter(d=>d.wid===w.id); if(ml.length>=max){ const j=deployables.indexOf(ml[0]); if(j>=0)deployables.splice(j,1); } }
  deployables.push({kind:w.deploy,wid:w.id,x:x+(k?rand(-14,14):0),y:y+(k?rand(-14,14):0),r:w.deploy==='mine'?8:w.deploy==='rat'?6:13,
    dmg:weaponDamage(w)*charDmgMul(p,w)*p.dmgMult*frenzyDmg*bonusMul(p)*Admin.dmg, fireCd:(w.deployFire||600)/1000, fireT:0.3,
    life:(w.deployLife||10)*(1+clsB(p,'konstrukt','life')), color:w.color, spd:(w.spd||640)*p.projSpeed, count:w.count||1, spread:w.spread||0,
    pierce:(w.pierce||0)+p.pierce+clsB(p,'eisen','pierce'), size:(w.size||5)*p.projSize, novaR:w.novaR||90,
    burn:w.burn||p.burn, fx:bulletFx(w,p), owner:p, phase:rand(0,TAU)});
  }
  for(let i=0;i<6;i++)spawnParticle(x,y,w.color,1.6,50);
}
function updateDeployables(dt){
  for(let i=deployables.length-1;i>=0;i--){ const d=deployables[i]; d.life-=dt;
    if(d.kind==='companion'){ const o=d.owner.dead?anchorPlayer():d.owner, tx=o.x+Math.cos(G.uiTime*1.3+d.phase)*54, ty=o.y+Math.sin(G.uiTime*1.3+d.phase)*54;
      d.x+=(tx-d.x)*7*dt; d.y+=(ty-d.y)*7*dt; }
    if(d.kind==='turret'||d.kind==='companion'){ d.fireT-=dt; const tg=nearestEnemy(d.x,d.y);
      if(tg && d.fireT<=0){ deployShoot(d,Math.atan2(tg.y-d.y,tg.x-d.x)); d.fireT=d.fireCd; } }
    else if(d.kind==='totem'){ d.fireT-=dt; if(d.fireT<=0){ d.fireT=d.fireCd; doDeployNova(d); } }
    else if(d.kind==='rat'){ const tg=nearestEnemy(d.x,d.y); d.fireT-=dt;
      if(tg){ const a=Math.atan2(tg.y-d.y,tg.x-d.x); d.ang=a; d.x+=Math.cos(a)*d.spd*dt; d.y+=Math.sin(a)*d.spd*dt;
        if(d.fireT<=0 && dist2(d.x,d.y,tg.x,tg.y)<(tg.r+d.r+2)*(tg.r+d.r+2)){ d.fireT=0.5; damageEnemy(tg,d.dmg,a,10,false,d.wid,d.owner); applyPoison(tg,d.dmg*0.5+1,d.wid,d.owner,true); } } }
    else if(d.kind==='mine'){ for(const e of enemies){ if(!e.isBoss && dist2(d.x,d.y,e.x,e.y)<(d.r+e.r+12)*(d.r+e.r+12)){ deployMineExplode(d); d.life=0; break; } } }
    if(d.life<=0) deployables.splice(i,1);
  }
}
function deployShoot(d,base){ const n=d.count, total=d.spread*(n-1);
  for(let i=0;i<n;i++){ const ang=(n>1)?base-total/2+total*(i/(n-1)):base+rand(-d.spread,d.spread);
    const nb={id:uid++,x:d.x,y:d.y,vx:Math.cos(ang)*d.spd,vy:Math.sin(ang)*d.spd,dmg:d.dmg,r:d.size,
      pierce:d.pierce,life:1.6,kb:60,color:d.color,crit:false,fx:d.fx,owner:d.owner,depth:0,wid:d.wid,hitIds:new Set()};
    bullets.push(nb); runFx(nb,'spawn'); }
  Audio2.shoot();
}
function doDeployNova(d){ novaRings.push({x:d.x,y:d.y,r:10,max:d.novaR,t:0.4,color:d.color});
  for(const e of enemies){ if(dist2(d.x,d.y,e.x,e.y)<d.novaR*d.novaR){ damageEnemy(e,d.dmg,Math.atan2(e.y-d.y,e.x-d.x),50,false,d.wid,d.owner);
    if(d.burn) applyBurn(e,d.dmg*0.4+2,d.wid,d.owner); } }
  for(let k=0;k<6;k++){const a=rand(0,TAU);spawnParticle(d.x+Math.cos(a)*d.novaR*0.4,d.y+Math.sin(a)*d.novaR*0.4,d.color,1.6,80);}
}
function deployMineExplode(d){ G.shake=Math.max(G.shake,4); Audio2.boss();
  for(let i=0;i<14;i++)spawnParticle(d.x,d.y,d.color,rand(2,4),rand(100,220));
  novaRings.push({x:d.x,y:d.y,r:8,max:78,t:0.35,color:C.candle});
  for(const e of enemies){ if(dist2(d.x,d.y,e.x,e.y)<78*78){ damageEnemy(e,d.dmg*1.6,Math.atan2(e.y-d.y,e.x-d.x),120,false,d.wid,d.owner); } }
}
function updateStatuses(dt){
  const p=player, s=p.statuses;
  if(s.poison.t>0){ s.poison.t-=dt; if(!Admin.god)p.hp-=s.poison.dps*dt; if(Math.random()<0.25)spawnParticle(p.x,p.y,C.sick,1.3,30); if(p.hp<=0){updateHP();onPlayerDead();return;} }
  if(s.burn.t>0){ s.burn.t-=dt; if(!Admin.god)p.hp-=s.burn.dps*dt; if(Math.random()<0.3)spawnParticle(p.x,p.y,C.candle,1.3,40); if(p.hp<=0){updateHP();onPlayerDead();return;} }
  if(s.chill.t>0){ s.chill.t-=dt; }
  updateHP(); updateStatusBar();
}

/* ---------- FÄHIGKEITEN update ---------- */
function updateAbilities(dt){
  const p=player;
  p.frenzyActive = p.frenzy && p.hp < p.maxHP*0.35;
  if(p.orbitN>0){ p.orbitAng+=dt*2.6;
    for(let i=0;i<p.orbitN;i++){ const a=p.orbitAng+i*TAU/p.orbitN; const ox=p.x+Math.cos(a)*p.orbitR, oy=p.y+Math.sin(a)*p.orbitR;
      for(const e of enemies){ if(e._orbCd&&e._orbCd>0)continue; if(dist2(ox,oy,e.x,e.y)<(e.r+9)*(e.r+9)){ damageEnemy(e,p.orbitDmg,a,40,false,'orbit',p); e._orbCd=0.22; spawnFloater(e.x,e.y-e.r,Math.round(p.orbitDmg),false);} } }
  }
  for(const e of enemies){ if(e._orbCd>0)e._orbCd-=dt; }
  if(p.puddleHeal&&p.hp<p.maxHP&&puddles.some(pu=>!pu.hostile&&pu.owner===p&&dist2(pu.x,pu.y,p.x,p.y)<pu.r*pu.r)) healPlayer(p,p.puddleHeal*dt);
  if(p.novaDmg>0){ p.novaT-=dt; if(p.novaT<=0){ p.novaT=p.novaCd; doNova(); } }
  if(p.shieldMax>0){ p.shieldRegT-=dt; if(p.shieldRegT<=0 && p.shield<p.shieldMax){ p.shield=clamp(p.shield+p.shieldMax*0.30,0,p.shieldMax); p.shieldRegT=1.1; updateHP(); } }
  if(p.auraDps>0){ for(const e of enemies){ if(!e.isBoss && dist2(p.x,p.y,e.x,e.y)<p.auraR*p.auraR){ hurtEnemyRaw(e,p.auraDps*dt,'aura',p);} }
    if(Math.random()<0.4)spawnParticle(p.x+rand(-p.auraR,p.auraR),p.y+rand(-p.auraR,p.auraR),C.sick,1.2,20); }
}
function doNova(){ const p=player; G.shake=Math.max(G.shake,3);
  novaRings.push({x:p.x,y:p.y,r:14,max:p.novaR,t:0.45,color:p.novaColor});
  for(const e of enemies){ if(dist2(p.x,p.y,e.x,e.y)<p.novaR*p.novaR){ damageEnemy(e,p.novaDmg,Math.atan2(e.y-p.y,e.x-p.x),90,false,'nova',p);} }
  for(let i=0;i<10;i++){const a=rand(0,TAU);spawnParticle(p.x+Math.cos(a)*p.novaR*0.5,p.y+Math.sin(a)*p.novaR*0.5,p.novaColor,2,120);}
}
function doRevive(who){ const p=who||player; p.revive--; p.hp=p.maxHP*0.55; p.invuln=2.2; p.shield=p.shieldMax; clearStatuses(p);
  G.shake=10; Audio2.ability(); for(let i=0;i<40;i++)spawnParticle(p.x,p.y,pick([C.gold2,C.bone,'#fff']),rand(2,4),rand(120,300)); updateHP(); }
