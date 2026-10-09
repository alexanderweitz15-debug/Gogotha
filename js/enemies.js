"use strict";
/* GOLGOTHA — Hindernisse, Gegner, Schaden/Tod, Bosse und ihre Gefahrenzonen, Balance-Messung (F3) (Teil von game.js, Reihenfolge siehe index.html) */
/* =========================================================================
   OBSTACLES
   ========================================================================= */
function buildObstacles(){
  obstacles=[];
  if(Admin.noObs)return;
  const area=ROOM.w*ROOM.h, n=clamp(Math.round(area/95000),3,12); let tries=0;
  while(obstacles.length<n && tries<260){
    tries++;
    const r=rand(16,30);
    const x=rand(ROOM.x+55,ROOM.x+ROOM.w-55), y=rand(ROOM.y+55,ROOM.y+ROOM.h-55);
    if(dist2(x,y,player.x,player.y)<150*150) continue;
    let ok=true; for(const ob of obstacles){ if(Math.hypot(x-ob.x,y-ob.y)<r+ob.r+44){ok=false;break;} }
    if(!ok) continue;
    obstacles.push({x,y,r,type:pick(['cross','pillar','tomb','rubble']),seed:rand(0,TAU)});
  }
}
function collideObstacles(o){
  for(const ob of obstacles){
    const dx=o.x-ob.x, dy=o.y-ob.y, d=Math.hypot(dx,dy), min=o.r+ob.r;
    if(d<min && d>0.001){ const push=(min-d); o.x+=dx/d*push; o.y+=dy/d*push; }
  }
}
function bulletHitsObstacle(b){
  for(const ob of obstacles){ if(dist2(b.x,b.y,ob.x,ob.y)<(b.r+ob.r)*(b.r+ob.r)) return ob; }
  return null;
}

/* =========================================================================
   ENEMIES
   ========================================================================= */
const ETYPES={
 chaser:{r:13,hp:18,speed:78,dmg:9,color:C.blood,touch:true,xp:1,name:'Verdammter'},
 swarmer:{r:8,hp:7,speed:135,dmg:5,color:'#a86a3a',touch:true,xp:1,name:'Made'},
 tank:{r:20,hp:62,speed:42,dmg:16,color:'#6a5a4a',touch:true,xp:4,name:'Gepanzerter Büßer'},
 shooter:{r:13,hp:20,speed:55,dmg:0,color:'#7a8c4a',ranged:true,fireCd:1.6,bspd:300,bdmg:8,xp:2,name:'Ketzer-Schütze'},
 spitter:{r:16,hp:34,speed:38,dmg:0,color:C.sick,ranged:true,lob:true,fireCd:2.4,bspd:230,bdmg:10,xp:3,name:'Pestbeule'},
 exploder:{r:14,hp:14,speed:118,dmg:0,color:C.candle,explode:true,edmg:26,xp:2,name:'Selbstmörder'},
 flyer:{r:11,hp:16,speed:128,dmg:11,color:'#c0a0e0',touch:true,fly:true,xp:2,name:'Geflügelter'},
 healer:{r:14,hp:30,speed:52,dmg:0,color:'#6abf8a',support:true,heal:true,fireCd:2.2,healAmt:10,xp:3,name:'Kaplan'},
 summoner:{r:16,hp:40,speed:40,dmg:0,color:'#9a6abf',support:true,summon:true,fireCd:3.6,xp:4,name:'Beschwörer'},
};
function scaleFor(lvl){return {hp:1+lvl*0.18+Math.floor(lvl/10)*0.5, dmg:1+lvl*0.07, spd:1+lvl*0.012};}
function spawnEnemy(type,x,y,lvl,opts){opts=opts||{};
  const t=ETYPES[type], sc=scaleFor(lvl), dH=diffMul('enemyHp'), dD=diffMul('enemyDmg');
  const e={id:uid++,type,x,y,r:t.r,maxHp:t.hp*sc.hp*(opts.hpMult||1)*dH*(G.curseHp||1),hp:0,speed:t.speed*sc.spd,
    dmg:(t.dmg||0)*sc.dmg*dD,color:t.color,touch:!!t.touch,touchCd:0,fireCd:rand(0.4,(t.fireCd||1)),
    slowT:0,burnT:0,burnDmg:0,hitFlash:0,name:t.name,isBoss:false,bspd:(t.bspd||0),bdmg:(t.bdmg||0)*sc.dmg*dD,
    ranged:t.ranged,lob:t.lob,explode:t.explode,edmg:(t.edmg||0)*sc.dmg*dD,
    fly:t.fly,support:t.support,heal:t.heal,summon:t.summon,healAmt:(t.healAmt||0)*sc.hp,
    xpValue:t.xp||1,wob:rand(0,TAU),_orbCd:0,ai:t.ai,guard:t.guard};
  e.hp=e.maxHp; if(t.init)t.init(e); enemies.push(e); return e;
}
function updateEnemy(e,dt){
  const p=nearestPlayer(e.x,e.y)||player;   // Gegner zielen auf nächsten lebenden Spieler
  if(e.slowT>0)e.slowT-=dt;
  if(e.hitFlash>0)e.hitFlash-=dt;
  if(e.burnT>0){ e.burnT-=dt; const bh=e.hp; e.hp-=e.burnDmg*dt; trackDmg(e,bh,e.burnSrc||'burn'); if(Math.random()<0.3)spawnParticle(e.x,e.y,C.candle,1.5,30); if(e.hp<=0){killEnemy(e,e.burnOwner,e.burnSrc);return;} }
  if(e.poisonT>0){ e.poisonT-=dt; const ph=e.hp; e.hp-=e.poisonDps*e.poisonStacks*dt; trackDmg(e,ph,e.poisonSrc||'poison'); if(Math.random()<0.2)spawnParticle(e.x,e.y,C.sick,1.3,25);
    if(e.poisonT<=0){e.poisonStacks=0;e.poisonDps=0;} if(e.hp<=0){killEnemy(e,e.poisonOwner,e.poisonSrc);return;} }
  if(e.rootT>0)e.rootT-=dt;
  const sp=e.speed*(e.slowT>0?(e.slowF||0.45):1)*(e.rootT>0?0:1)*(G.modEnemySpeed||1);
  const ang=Math.atan2(p.y-e.y,p.x-e.x), d=Math.hypot(p.x-e.x,p.y-e.y);
  if(e.isBoss){ updateBoss(e,dt,p); }
  else if(e.ranged){
    const want=220;
    if(d<want-30){ e.x-=Math.cos(ang)*sp*dt; e.y-=Math.sin(ang)*sp*dt; }
    else if(d>want+30){ e.x+=Math.cos(ang)*sp*0.6*dt; e.y+=Math.sin(ang)*sp*0.6*dt; }
    e.fireCd-=dt;
    if(e.fireCd<=0 && !Admin.noFire){ e.fireCd=ETYPES[e.type].fireCd*rand(.8,1.2)/(diffMul('fireRate')*G.curseFire); enemyShoot(e,ang,p); }
  } else if(e.explode){
    e.x+=Math.cos(ang)*sp*dt; e.y+=Math.sin(ang)*sp*dt;
    if(d<e.r+p.r+4){ explodeEnemy(e); return; }
  } else if(e.support){
    const want=210;
    if(d<want-30){ e.x-=Math.cos(ang)*sp*dt; e.y-=Math.sin(ang)*sp*dt; }
    else if(d>want+40){ e.x+=Math.cos(ang)*sp*0.7*dt; e.y+=Math.sin(ang)*sp*0.7*dt; }
    e.fireCd-=dt;
    if(e.fireCd<=0 && !Admin.noFire){ e.fireCd=ETYPES[e.type].fireCd*rand(.8,1.2)/(diffMul('fireRate')*G.curseFire);
      if(e.heal) healAllies(e); else if(e.summon) summonAdds(e); }
  } else if(e.ai){ e.ai(e,dt,p,ang,d,sp); }   // Regionsgegner (js/regions.js)
  else { e.x+=Math.cos(ang)*sp*dt; e.y+=Math.sin(ang)*sp*dt; }
  if(!e.isBoss && !e.fly) collideObstacles(e);   // Flieger ignorieren Hindernisse
  e.x=clamp(e.x,ROOM.x+e.r,ROOM.x+ROOM.w-e.r); e.y=clamp(e.y,ROOM.y+e.r,ROOM.y+ROOM.h-e.r);
  if((e.touch||e.isBoss)&&e.touchCd<=0&&d<e.r+p.r){
    hurtPlayer(e.isBoss?(e.dmg||14):e.dmg, p); e.touchCd=0.6;
    e.x-=Math.cos(ang)*10; e.y-=Math.sin(ang)*10;
    if(p.thorns>0) damageEnemy(e,p.thorns,ang,40,false,'thorns',p);
  }
  if(e.touchCd>0)e.touchCd-=dt;
}
function enemyShoot(e,ang,tg){
  if(e.lob){ ebullets.push({x:e.x,y:e.y,vx:Math.cos(ang)*e.bspd,vy:Math.sin(ang)*e.bspd,r:6,dmg:e.bdmg,life:3,lob:true,color:C.sick,startD:0,maxD:Math.hypot(tg.x-e.x,tg.y-e.y)}); }
  else { ebullets.push({x:e.x,y:e.y,vx:Math.cos(ang)*e.bspd,vy:Math.sin(ang)*e.bspd,r:6,dmg:e.bdmg,life:3,color:'#d6c060'}); }
}
function explodeEnemy(e){
  G.shake=Math.max(G.shake,6); Audio2.boss();
  for(let i=0;i<18;i++)spawnParticle(e.x,e.y,C.candle,rand(2,4),rand(120,260));
  for(let i=0;i<8;i++){const a=i/8*TAU; ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*260,vy:Math.sin(a)*260,r:6,dmg:e.edmg*0.5,life:1.2,color:C.candle});}
  spawnPuddle(e.x,e.y,e.edmg*0.45,{hostile:true,effect:'fire',big:true,life:2.6});
  for(const pl of players){ if(!pl.dead && Math.hypot(pl.x-e.x,pl.y-e.y)<70) hurtPlayer(e.edmg,pl); }
  removeEnemy(e);
}
function healAllies(e){ let any=false;
  for(const o of enemies){ if(o!==e && !o.isBoss && o.hp<o.maxHp && dist2(e.x,e.y,o.x,o.y)<150*150){ o.hp=Math.min(o.maxHp,o.hp+e.healAmt); any=true; if(Math.random()<0.5)spawnParticle(o.x,o.y,'#6abf8a',1.4,40); } }
  if(any)for(let i=0;i<5;i++)spawnParticle(e.x,e.y,'#6abf8a',1.5,40);
}
function summonAdds(e){ const n=1+Math.floor(G.level/14);
  for(let i=0;i<1+n;i++){ const a=rand(0,TAU),r=rand(20,42); spawnEnemy('swarmer',clamp(e.x+Math.cos(a)*r,ROOM.x+20,ROOM.x+ROOM.w-20),clamp(e.y+Math.sin(a)*r,ROOM.y+20,ROOM.y+ROOM.h-20),Math.max(1,G.level-3)); }
  for(let i=0;i<6;i++)spawnParticle(e.x,e.y,'#9a6abf',1.6,50);
}
function makeElite(e){ e.elite=true; e.maxHp*=2.6; e.hp=e.maxHp; e.dmg*=1.4; e.bdmg*=1.3; e.r=Math.round(e.r*1.3); e.xpValue=(e.xpValue||1)*3; e.speed*=0.92; }
function damageEnemy(e,dmg,ang,kb,fromBullet,src,owner){
  if(e.hp<=0)return;   // bereits tot: kein zweiter Kill
  if(Admin.one&&fromBullet)dmg=e.maxHp*99;
  if(e.isBoss&&e.shieldT>0) dmg*=0.25;   // Eiserner Heiliger hinter dem Schild
  e.lastHit=dmg;
  const o=owner||player, credit=src; let before=e.hp;
  if(src&&weaponById(src)) dmg*=charHitMul(o,e);
  const hs=clsStage(o,'heilig'); if(hs) dmg*=(e.isBoss||e.elite)?1+CLS_BONUS.heilig.boss[hs]:1-CLS_BONUS.heilig.normal[hs];
  dmg*=synDmgMul(e,src,o);   // Duo-Segen/Sets (synergy.js)
  e.hp-=dmg; e.hitFlash=0.08;
  if(kb){ e.x+=Math.cos(ang)*kb*0.04; e.y+=Math.sin(ang)*kb*0.04;
    e.x=clamp(e.x,ROOM.x+e.r,ROOM.x+ROOM.w-e.r); e.y=clamp(e.y,ROOM.y+e.r,ROOM.y+ROOM.h-e.r); }
  if(!e.isBoss && o.execPct>0 && e.hp>0 && e.hp<e.maxHp*o.execPct){ trackDmg(e,before,src); before=e.hp; src='exec'; e.hp=0; spawnFloater(e.x,e.y-e.r-8,'✝',true); }
  trackDmg(e,before,src);
  synOnHit(e,dmg,credit,o,src==='exec');
  if(e.hp<=0) killEnemy(e,o,credit);
}
/* Schaden ohne Treffer-Effekte (Brand-, Aura-, Pfützen-Ticks) — läuft trotzdem durch die Messung */
function hurtEnemyRaw(e,amt,src,owner){ if(e.hp<=0)return; const before=e.hp; e.hp-=amt; trackDmg(e,before,src); if(e.hp<=0)killEnemy(e,owner,src); }
/* owner = Spieler, dem der Kill gehört (Lebensraub, Goldbonus); src = Quelle — Waffen-Kills zählen für Freischaltungen */
function killEnemy(e,owner,src){
  if(e.isBoss){ bossDefeated(e); return; }
  const o=owner||player;
  G.kills++; if(G.run){G.run.kills++; if(src&&weaponById(src)){G.run.weaponKills[src]=(G.run.weaponKills[src]||0)+1;}} $('#killTag').textContent=G.kills; Audio2.kill();
  for(let i=0;i<10;i++)spawnParticle(e.x,e.y,e.color,rand(1.5,3),rand(60,160));
  const rm=(G.rewardMul||1)*(G.waveGoldMul||1);
  spawnPickup(e.x,e.y,'xp',Math.max(1,Math.round((e.xpValue||1)*rm)));
  const gm=o?o.goldMult:1;
  if(Math.random()<0.8) spawnPickup(e.x,e.y,'coin',Math.max(1,Math.round(randInt(1,3)*gm*rm)));
  if(Math.random()<0.07) spawnPickup(e.x,e.y,'health',randInt(8,14));
  if(o&&!o.dead&&o.lifesteal>0) healPlayer(o,o.lifesteal);
  spreadOnDeath(e); relicOnKill(e,o); soulBondKill(o); synOnKill(e,o,src); regionOnKill(e);
  removeEnemy(e);
}
function removeEnemy(e){ const i=enemies.indexOf(e); if(i>=0)enemies.splice(i,1); }

/* =========================================================================
   BOSSE — eigene Designs & Muster
   ========================================================================= */
function spawnBoss(lvl){
  const idx=Math.max(0,Math.floor(lvl/5)-1)%BOSS_NAMES.length, cycle=Math.floor(Math.max(0,lvl-1)/50);   // ab Station 55: reihum, je Durchlauf +50% Leben
  const kind=BOSS_KINDS[idx%BOSS_KINDS.length];
  const sc=scaleFor(lvl);
  const e={id:uid++,type:'boss',isBoss:true,bossKind:kind,bossIdx:idx,x:WORLD.w/2,y:ROOM.y+120,r:36,
    maxHp:Math.round(460*sc.hp*(1+idx*0.16)*(1+cycle*0.5)*diffMul('enemyHp')*(G.curseHp||1)),hp:0,speed:46+idx*3,dmg:18*sc.dmg*diffMul('enemyDmg'),
    color:C.blood2,touchCd:0,slowT:0,burnT:0,burnDmg:0,hitFlash:0,_orbCd:0,
    name:BOSS_NAMES[idx],atkCd:1.4,bspd:270+idx*12,bdmg:11*sc.dmg*diffMul('enemyDmg'),wob:0,spin:0,moveT:0,
    homeX:WORLD.w/2,homeY:ROOM.y+140,tpT:0,chargeT:0,charging:false,cdx:0,cdy:0,burstN:0,burstT:0,shieldT:0,pullT:0,dropT:0};
  if(kind==='maw'){ e.x=WORLD.w/2; e.y=ROOM.y+ROOM.h*0.42; e.r=44; }   // der Schlund sitzt fest in der Raummitte
  if(kind==='mother'||kind==='lastcross') e.r=42;
  e.hp=e.maxHp; if(players.some(pl=>hasRelic(pl,'lance'))) e.hp=Math.round(e.maxHp*0.9);
  enemies.push(e); G.boss=e; G.bossMode=true;
  $('#bossName').textContent=e.name; $('#bossBarWrap').classList.add('show');
  Audio2.boss(); G.shake=8; return e;
}
function bshoot(e,a,spd,dmg,r,color){ ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:r||6,dmg:dmg,life:4,color:color||C.blood2}); }
function updateBoss(e,dt,tg){
  e.atkCd-=dt; e.moveT+=dt; e.spin+=dt;
  const ang=Math.atan2(tg.y-e.y,tg.x-e.x);
  const cx0=WORLD.w/2, cy0=ROOM.y+140, ax=ROOM.w*0.30, ay=Math.min(ROOM.h*0.22,160);
  const k=e.bossKind;

  if(k==='maggot'){
    /* Made Magna: kreist, lädt auf und stürmt, lässt Giftspur, ruft Maden */
    if(e.charging){
      e.x+=e.cdx*460*dt; e.y+=e.cdy*460*dt; e.chargeT-=dt;
      if(Math.random()<0.6)spawnPuddle(e.x,e.y,e.bdmg*0.5,{hostile:true,effect:'poison',life:2.2});
      if(e.chargeT<=0||e.x<=ROOM.x+e.r||e.x>=ROOM.x+ROOM.w-e.r||e.y<=ROOM.y+e.r||e.y>=ROOM.y+ROOM.h-e.r){e.charging=false;e.atkCd=1.6;}
    } else {
      const tx=cx0+Math.cos(e.moveT*0.8)*ax, ty=cy0+Math.sin(e.moveT*1.1)*ay;
      e.x+=(tx-e.x)*0.9*dt; e.y+=(ty-e.y)*0.9*dt;
      if(e.atkCd<=0 && !Admin.noFire){ const roll=Math.random();
        if(roll<0.5){ e.charging=true; e.chargeT=1.1; e.cdx=Math.cos(ang); e.cdy=Math.sin(ang); G.shake=4; }
        else if(roll<0.8){ for(let i=0;i<3+Math.floor(G.level/12);i++){const a=rand(0,TAU),rr=rand(40,90);spawnEnemy('swarmer',clamp(e.x+Math.cos(a)*rr,ROOM.x+20,ROOM.x+ROOM.w-20),clamp(e.y+Math.sin(a)*rr,ROOM.y+20,ROOM.y+ROOM.h-20),Math.max(1,G.level-3));} e.atkCd=2.2; }
        else { const cnt=10; for(let i=0;i<cnt;i++){const a=i/cnt*TAU;bshoot(e,a,e.bspd*0.7,e.bdmg,6,C.sick);} e.atkCd=1.5; } }
    }
  } else if(k==='surgeon'){
    /* Verschollener Chirurg: teleportiert, feuert gezielte Schrotkegel, ruft Schützen */
    e.tpT-=dt;
    if(e.tpT<=0){ e.x=rand(ROOM.x+80,ROOM.x+ROOM.w-80); e.y=rand(ROOM.y+80,ROOM.y+ROOM.h*0.6); e.tpT=rand(2.6,4); for(let i=0;i<16;i++)spawnParticle(e.x,e.y,'#7fd0e6',2,120); }
    if(e.atkCd<=0 && !Admin.noFire){ const roll=Math.random();
      if(roll<0.6){ for(let i=-3;i<=3;i++){const a=ang+i*0.12;bshoot(e,a,e.bspd*1.1,e.bdmg,6,'#cfe0ff');} e.atkCd=1.2; }
      else if(roll<0.85){ for(let r2=0;r2<2;r2++)for(let i=0;i<8;i++){const a=i/8*TAU+r2*0.2;bshoot(e,a,e.bspd*(0.6+r2*0.25),e.bdmg,5,'#a8e8ff');} e.atkCd=1.6; }
      else { for(let i=0;i<2;i++)spawnEnemy('shooter',clamp(e.x+rand(-60,60),ROOM.x+20,ROOM.x+ROOM.w-20),clamp(e.y+rand(-40,40),ROOM.y+20,ROOM.y+ROOM.h-20),Math.max(1,G.level-2)); e.atkCd=2.2; } }
  } else if(k==='lamb'){
    /* Schlächterlamm: schnell kreisend, Spiral-Bullets */
    const tx=cx0+Math.cos(e.moveT*1.5)*ax*1.05, ty=cy0+Math.sin(e.moveT*1.9)*ay*1.1;
    e.x+=(tx-e.x)*1.4*dt; e.y+=(ty-e.y)*1.4*dt;
    if(e.atkCd<=0 && !Admin.noFire){
      const arms=3; for(let a2=0;a2<arms;a2++){ const a=e.spin*3 + a2*TAU/arms; bshoot(e,a,e.bspd,e.bdmg*0.8,5,C.bone); }
      e.atkCd=0.09;
      if(Math.random()<0.04){ for(let i=-2;i<=2;i++)bshoot(e,ang+i*0.18,e.bspd*1.2,e.bdmg,6,C.blood2); }
    }
  } else if(k==='crucified'){
    /* Erster Gekreuzigter: Kreuz-Salven + expandierende Ringe + Beschwörung */
    const tx=cx0+Math.cos(e.moveT*0.5)*ax*0.7, ty=cy0+Math.sin(e.moveT*0.7)*ay*0.6;
    e.x+=(tx-e.x)*0.7*dt; e.y+=(ty-e.y)*0.7*dt;
    if(e.atkCd<=0 && !Admin.noFire){ const roll=Math.random();
      if(roll<0.4){ for(let d4=0;d4<4;d4++){const base=e.spin*0.6+d4*TAU/4; for(let j=-1;j<=1;j++)bshoot(e,base+j*0.1,e.bspd,e.bdmg,6,C.gold2);} e.atkCd=0.9; }
      else if(roll<0.75){ const cnt=20+Math.floor(G.level/6); for(let i=0;i<cnt;i++){const a=i/cnt*TAU+rand(-.03,.03);bshoot(e,a,e.bspd*0.85,e.bdmg,6,C.blood2);} e.atkCd=1.5; G.shake=4; }
      else { const types=['chaser','shooter','tank']; for(let i=0;i<2+Math.floor(G.level/12);i++){const a=rand(0,TAU),rr=rand(50,100);spawnEnemy(pick(types),clamp(e.x+Math.cos(a)*rr,ROOM.x+20,ROOM.x+ROOM.w-20),clamp(e.y+Math.sin(a)*rr,ROOM.y+20,ROOM.y+ROOM.h-20),Math.max(1,G.level-2));} e.atkCd=2.4; } }
  } else if(k==='choir'||k==='mother'||k==='ironsaint'||k==='maw'||k==='lastcross'){
    BOSS_AI[k](e,dt,tg,ang,cx0,cy0,ax,ay);
  } else {
    /* Grabenpredigter (Standard): radiale Ringe / gezielter Fächer / Beschwörung */
    const tx=cx0+Math.cos(e.moveT*0.6)*ax, ty=cy0+Math.sin(e.moveT*0.9)*ay;
    e.x+=(tx-e.x)*0.6*dt; e.y+=(ty-e.y)*0.6*dt;
    if(e.atkCd<=0 && !Admin.noFire){ const roll=Math.random();
      if(roll<0.34){ const cnt=18+Math.floor(G.level/5); for(let i=0;i<cnt;i++){const a=i/cnt*TAU+rand(-.05,.05);bshoot(e,a,e.bspd*0.8,e.bdmg,6,C.blood2);} e.atkCd=1.5; G.shake=4; }
      else if(roll<0.66){ for(let i=-2;i<=2;i++)bshoot(e,ang+i*0.16,e.bspd,e.bdmg,7,C.candle); e.atkCd=1.1; }
      else { const types=['swarmer','swarmer','chaser','shooter']; for(let i=0;i<3+Math.floor(G.level/10);i++){const a=rand(0,TAU),rr=rand(40,90);spawnEnemy(pick(types),clamp(e.x+Math.cos(a)*rr,ROOM.x+20,ROOM.x+ROOM.w-20),clamp(e.y+Math.sin(a)*rr,ROOM.y+20,ROOM.y+ROOM.h-20),Math.max(1,G.level-3));} e.atkCd=2.4; } }
  }
  e.x=clamp(e.x,ROOM.x+e.r,ROOM.x+ROOM.w-e.r); e.y=clamp(e.y,ROOM.y+e.r,ROOM.y+ROOM.h-e.r);
}
/* ---------- GEFAHRENZONEN (Bosse 6–10): erst sichtbare Warnung, dann Schaden — Ausweichschritt hilft ---------- */
function addHazard(h){ h.t=0; (G.hazards||(G.hazards=[])).push(h); }
function updateHazards(dt){ updateRegion(dt); const hz=G.hazards; if(!hz)return;
  for(let i=hz.length-1;i>=0;i--){ const h=hz[i]; h.t+=dt;
    if(!h.hit && h.t>=h.delay){ h.hit=true; G.shake=Math.max(G.shake,3);
      for(const pl of players){ if(pl.dead)continue;
        const inside=h.kind==='circle'?dist2(pl.x,pl.y,h.x,h.y)<(h.r+pl.r)*(h.r+pl.r):distToSeg(pl.x,pl.y,h.x1,h.y1,h.x2,h.y2)<h.w/2+pl.r;
        if(inside&&h.dmg) hurtPlayer(h.dmg,pl); }
      if(h.onHit) h.onHit(h);
      const px=h.kind==='circle'?h.x:(h.x1+h.x2)/2, py=h.kind==='circle'?h.y:(h.y1+h.y2)/2;
      for(let k=0;k<10;k++)spawnParticle(px+rand(-20,20),py+rand(-20,20),h.color||C.candle,rand(1.5,3),rand(60,160)); }
    if(h.t>=h.delay+0.25) hz.splice(i,1); } }
function drawHazards(){ drawRegion(); const hz=G.hazards; if(!hz)return;
  for(const h of hz){ const pr=clamp(h.t/h.delay,0,1), col=h.color||'#c01f24';
    cx.save();
    if(!h.hit){ cx.globalAlpha=0.12+pr*0.16; cx.fillStyle=col; cx.strokeStyle=col; cx.lineWidth=2;
      if(h.kind==='circle'){ cx.beginPath(); cx.arc(h.x,h.y,h.r,0,TAU); cx.fill(); cx.globalAlpha=0.7; cx.stroke(); cx.globalAlpha=0.35; cx.beginPath(); cx.arc(h.x,h.y,h.r*pr,0,TAU); cx.fill(); }
      else { cx.lineCap='butt'; cx.lineWidth=h.w; cx.beginPath(); cx.moveTo(h.x1,h.y1); cx.lineTo(h.x2,h.y2); cx.stroke(); cx.globalAlpha=0.5; cx.lineWidth=Math.max(2,h.w*pr); cx.stroke(); } }
    else { cx.globalAlpha=clamp(1-(h.t-h.delay)/0.25,0,1)*0.8; cx.fillStyle='#ffd27a'; cx.strokeStyle='#ffd27a';
      if(h.kind==='circle'){ cx.beginPath(); cx.arc(h.x,h.y,h.r,0,TAU); cx.fill(); } else { cx.lineWidth=h.w; cx.beginPath(); cx.moveTo(h.x1,h.y1); cx.lineTo(h.x2,h.y2); cx.stroke(); } }
    cx.restore(); } }
function bossRing(e,cnt,spd,off,col,r){ for(let i=0;i<cnt;i++){ const a=i/cnt*TAU+off; bshoot(e,a,spd,e.bdmg,r||6,col); } }
function bossAdds(e,types,n,lvlOff){ for(let i=0;i<n;i++){ const a=rand(0,TAU),rr=rand(50,100);
  spawnEnemy(pick(types),clamp(e.x+Math.cos(a)*rr,ROOM.x+20,ROOM.x+ROOM.w-20),clamp(e.y+Math.sin(a)*rr,ROOM.y+20,ROOM.y+ROOM.h-20),Math.max(1,G.level-(lvlOff||3))); } }
function rainNear(tg,n,r,dmg,col){ for(let i=0;i<n;i++) addHazard({kind:'circle',x:clamp(tg.x+rand(-170,170),ROOM.x+30,ROOM.x+ROOM.w-30),y:clamp(tg.y+rand(-150,150),ROOM.y+30,ROOM.y+ROOM.h-30),r,delay:rand(0.9,1.3),dmg,color:col}); }
/* Feuerstöße über mehrere Bilder (e.burstN Stöße im Abstand e.burstGap) */
function bossBurst(e,dt){ if(e.burstN<=0)return; e.burstT-=dt; if(e.burstT<=0){ e.burstN--; e.burstT=e.burstGap; e.burstFn(e.burstN); } }
const BOSS_AI={
  /* Choral der Asche: Spiralgesang, Aschenregen (Warnkreise), Geflügelte */
  choir(e,dt,tg,ang,cx0,cy0,ax,ay){ const tx=cx0+Math.cos(e.moveT*0.45)*ax*0.8, ty=cy0+Math.sin(e.moveT*0.7)*ay*0.8;
    e.x+=(tx-e.x)*0.7*dt; e.y+=(ty-e.y)*0.7*dt; bossBurst(e,dt);
    if(e.atkCd<=0 && !Admin.noFire){ const roll=Math.random();
      if(roll<0.4){ e.burstN=5; e.burstGap=0.22; e.burstT=0; e.burstFn=n=>bossRing(e,14,e.bspd*0.75,e.spin+n*0.22,'#b8b0a0',6); e.atkCd=2.0; }
      else if(roll<0.75){ rainNear(tg,5+Math.floor(G.level/15),46,e.bdmg*1.6,'#d06030'); e.atkCd=1.7; }
      else { bossAdds(e,['flyer'],3+Math.floor(G.level/15)); e.atkCd=2.2; } } },
  /* Mutter der Seuche: Giftbrocken, Madenbrut, Giftspur; ab halbem Leben kriecht sie auf dich zu */
  mother(e,dt,tg,ang,cx0,cy0,ax,ay){ const angry=e.hp<e.maxHp*0.5;
    if(angry){ e.x+=Math.cos(ang)*e.speed*0.7*dt; e.y+=Math.sin(ang)*e.speed*0.7*dt; }
    else { const tx=cx0+Math.cos(e.moveT*0.35)*ax*0.6, ty=cy0+Math.sin(e.moveT*0.5)*ay*0.6; e.x+=(tx-e.x)*0.5*dt; e.y+=(ty-e.y)*0.5*dt; }
    e.dropT-=dt; if(e.dropT<=0){ e.dropT=angry?0.8:1.5; spawnPuddle(e.x,e.y,e.bdmg*0.5,{hostile:true,effect:'poison',big:true,life:3.5}); }
    if(e.atkCd<=0 && !Admin.noFire){ const roll=Math.random();
      if(roll<0.45){ for(let i=0;i<4;i++){ const a=ang+rand(-0.5,0.5), d=Math.hypot(tg.x-e.x,tg.y-e.y)*rand(0.6,1.2);
          ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*240,vy:Math.sin(a)*240,r:8,dmg:e.bdmg,life:4,lob:true,color:C.sick,startD:0,maxD:d}); } e.atkCd=angry?1.2:1.6; }
      else if(roll<0.75){ bossAdds(e,['swarmer','swarmer','swarmer','spitter'],5+Math.floor(G.level/12)); e.atkCd=2.4; }
      else { bossRing(e,14,e.bspd*0.6,e.spin,C.sick,7); e.atkCd=1.4; } } },
  /* Der Eiserne Heilige: Schildwall (nimmt 25% Schaden, feuert Salven), Ansturm mit Aufprall, Kreuzhieb */
  ironsaint(e,dt,tg,ang,cx0,cy0,ax,ay){ if(e.shieldT>0)e.shieldT-=dt; bossBurst(e,dt);
    if(e.charging){ e.x+=e.cdx*520*dt; e.y+=e.cdy*520*dt; e.chargeT-=dt;
      if(e.chargeT<=0||e.x<=ROOM.x+e.r||e.x>=ROOM.x+ROOM.w-e.r||e.y<=ROOM.y+e.r||e.y>=ROOM.y+ROOM.h-e.r){ e.charging=false; e.atkCd=1.3;
        addHazard({kind:'circle',x:e.x,y:e.y,r:95,delay:0.55,dmg:e.bdmg*2,color:C.gold2}); } return; }
    if(e.shieldT<=0){ const tx=cx0+Math.cos(e.moveT*0.6)*ax*0.7, ty=cy0+Math.sin(e.moveT*0.8)*ay*0.7; e.x+=(tx-e.x)*0.6*dt; e.y+=(ty-e.y)*0.6*dt; }
    if(e.atkCd<=0 && !Admin.noFire){ const roll=Math.random();
      if(roll<0.35){ e.shieldT=2.6; e.burstN=6; e.burstGap=0.4; e.burstT=0.2; e.burstFn=()=>{ const a=Math.atan2(tg.y-e.y,tg.x-e.x); for(let j=-1;j<=1;j++)bshoot(e,a+j*0.14,e.bspd*1.1,e.bdmg,6,C.gold2); }; e.atkCd=3.0; }
      else if(roll<0.7){ e.charging=true; e.chargeT=0.9; e.cdx=Math.cos(ang); e.cdy=Math.sin(ang); G.shake=4; }
      else { const L=900; for(const a of [0,Math.PI/2]){ addHazard({kind:'line',x1:e.x-Math.cos(a)*L,y1:e.y-Math.sin(a)*L,x2:e.x+Math.cos(a)*L,y2:e.y+Math.sin(a)*L,w:36,delay:0.9,dmg:e.bdmg*1.8,color:C.gold2}); } e.atkCd=1.6; } } },
  /* Schlund von Golgotha: sitzt fest, saugt Spieler an, speit Knochenringe, ruft Selbstmörder */
  maw(e,dt,tg,ang,cx0,cy0,ax,ay){ bossBurst(e,dt); if(e.pullT>0)e.pullT-=dt;
    const pull=e.pullT>0?150:45;
    for(const pl of players){ if(pl.dead||pl.dashTime>0)continue; const d=Math.hypot(e.x-pl.x,e.y-pl.y); if(d<560&&d>e.r){ pl.x+=(e.x-pl.x)/d*pull*dt; pl.y+=(e.y-pl.y)/d*pull*dt; } }
    if(e.atkCd<=0 && !Admin.noFire){ const roll=Math.random();
      if(roll<0.4){ e.burstN=3; e.burstGap=0.35; e.burstT=0; e.burstFn=n=>bossRing(e,20,e.bspd*0.8,e.spin+n*0.16,C.bone,6); e.atkCd=1.9; }
      else if(roll<0.7){ e.pullT=2.0; e.burstN=1; e.burstGap=0; e.burstT=2.0; e.burstFn=()=>bossRing(e,28,e.bspd,e.spin,C.blood2,7); e.atkCd=2.8; }
      else { bossAdds(e,['exploder','exploder','chaser'],3+Math.floor(G.level/15)); e.atkCd=2.3; } } },
  /* Der Letzte Gekreuzigte: Ringe, Kreuzsalven, Beschwörung; unter halbem Leben Kreuzbalken über den Raum und Aschenregen */
  lastcross(e,dt,tg,ang,cx0,cy0,ax,ay){ const p2=e.hp<e.maxHp*0.5; bossBurst(e,dt);
    const tx=cx0+Math.cos(e.moveT*0.5)*ax*0.6, ty=cy0+Math.sin(e.moveT*0.65)*ay*0.6; e.x+=(tx-e.x)*0.7*dt; e.y+=(ty-e.y)*0.7*dt;
    if(e.atkCd<=0 && !Admin.noFire){ const roll=Math.random(), sp=p2?0.75:1;
      if(p2&&roll<0.3){ addHazard({kind:'line',x1:ROOM.x,y1:tg.y,x2:ROOM.x+ROOM.w,y2:tg.y,w:40,delay:1.0,dmg:e.bdmg*2,color:C.blood2});
        addHazard({kind:'line',x1:tg.x,y1:ROOM.y,x2:tg.x,y2:ROOM.y+ROOM.h,w:40,delay:1.0,dmg:e.bdmg*2,color:C.blood2}); e.atkCd=1.5*sp; }
      else if(p2&&roll<0.5){ rainNear(tg,6,44,e.bdmg*1.6,'#8a2020'); e.atkCd=1.4*sp; }
      else if(roll<0.7){ for(let d4=0;d4<4;d4++){ const base=e.spin*0.7+d4*TAU/4; for(let j=-1;j<=1;j++)bshoot(e,base+j*0.1,e.bspd,e.bdmg,6,C.gold2); } e.atkCd=0.9*sp; }
      else if(roll<0.88){ e.burstN=2; e.burstGap=0.3; e.burstT=0; e.burstFn=n=>bossRing(e,22+Math.floor(G.level/8),e.bspd*0.85,e.spin+n*0.14,C.blood2,6); e.atkCd=1.6*sp; }
      else { bossAdds(e,['chaser','shooter','tank','healer'],3+Math.floor(G.level/12),2); e.atkCd=2.4*sp; } } },
};
function bossDefeated(e){
  G.bossMode=false; G.boss=null; $('#bossBarWrap').classList.remove('show'); regionBossDown(e);
  if(G.run){G.run.bossKills=(G.run.bossKills||0)+1; G.run.bossKinds=G.run.bossKinds||{}; G.run.bossKinds[e.bossKind]=true;}
  /* Phase 5: Boss-Charakter sofort freischalten + persistieren */
  if(DB.current && runCounts()){ DB.current.stats=DB.current.stats||{}; const bk=DB.current.stats.bossKinds=DB.current.stats.bossKinds||{};
    const wasNew=!bk[e.bossKind]; bk[e.bossKind]=true; DB.save();
    if(wasNew){ const ch=CHARS.find(c=>c.unlock&&c.unlock.boss===e.bossKind); if(ch) showToast(t('char_unlocked'),'<b style="color:var(--gold2)">'+ch.name+'</b>'); } }
  G.shake=12; Audio2.win();
  for(let i=0;i<60;i++)spawnParticle(e.x,e.y,pick([C.gold2,C.blood2,C.bone]),rand(2,5),rand(120,320));
  for(let i=0;i<10;i++)spawnPickup(e.x+rand(-44,44),e.y+rand(-44,44),'xp',randInt(4,8));
  for(let i=0;i<6;i++)spawnPickup(e.x+rand(-44,44),e.y+rand(-44,44),'coin',randInt(8,16));
  removeEnemy(e);
}

/* =========================================================================
   BALANCE-MESSUNG (F3): echter Schaden + Kills pro Quelle, Verlauf der letzten 50 Läufe
   ========================================================================= */
function trackDmg(e,before,src){ if(!G.run||before<=0)return; const d=G.run.dmg||(G.run.dmg={});
  const r=d[src||'?']||(d[src||'?']={d:0,k:0}); r.d+=before-Math.max(0,e.hp); if(e.hp<=0)r.k++; }
const BAL_KEY='golgotha_balance';
function srcName(k){ const w=weaponById(k); return w?w.name:t('src_'+k); }
function logBalance(died,won){ if(!G.run)return; let h=[]; try{h=JSON.parse(localStorage.getItem(BAL_KEY))||[];}catch(e){}
  const rec={id:G.run.id,date:new Date().toISOString(),char:G.charId,diff:G.diff&&G.diff.id,mods:G.activeMods.slice(),curse:G.activeCurse&&G.activeCurse.id,
    station:G.level,charLevel:Math.max.apply(null,players.map(p=>p.level)),time:Math.round(G.time),died:!!died,won:!!won,unranked:!runCounts(),
    weapons:player?player.weapons.slice():[],dmg:G.run.dmg};
  h=h.filter(r=>r.id!==rec.id); h.push(rec); while(h.length>50)h.shift();
  try{localStorage.setItem(BAL_KEY,JSON.stringify(h));}catch(e){} }
function exportBalance(){ let h='[]'; try{h=localStorage.getItem(BAL_KEY)||'[]';}catch(e){}
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([h],{type:'application/json'})); a.download='golgotha-balance.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
let dbgOn=false, dbgT=0;
function toggleDbg(){ dbgOn=!dbgOn; $('#dbg').classList.toggle('show',dbgOn); renderDbg(); }
function renderDbg(){ if(!dbgOn)return; const d=(G.run&&G.run.dmg)||{}; const rows=Object.keys(d).map(k=>({k,d:d[k].d,n:d[k].k})).sort((a,b)=>b.d-a.d);
  const tot=rows.reduce((s,r)=>s+r.d,0)||1, tm=Math.max(1,G.time);
  let h='<div class="dbg-h">'+t('dbg_title')+' · '+Math.round(G.time)+'s</div><table><tr><th></th><th>'+t('dbg_dmg')+'</th><th>%</th><th>DPS</th><th>Kills</th></tr>';
  for(const r of rows){ const pct=r.d/tot*100; h+='<tr'+(pct>40?' class="hot"':'')+'><td>'+srcName(r.k)+'</td><td>'+Math.round(r.d)+'</td><td>'+pct.toFixed(1)+'</td><td>'+(r.d/tm).toFixed(1)+'</td><td>'+r.n+'</td></tr>'; }
  h+='<tr class="tot"><td>Σ</td><td>'+(rows.length?Math.round(tot):0)+'</td><td></td><td>'+(rows.length?(tot/tm).toFixed(1):'0')+'</td><td>'+rows.reduce((s,r)=>s+r.n,0)+'</td></tr></table>';
  h+='<button class="amini" id="dbgExport">'+t('dbg_export')+'</button>';
  $('#dbg').innerHTML=h; $('#dbgExport').onclick=exportBalance; }
