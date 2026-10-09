"use strict";
/* GOLGOTHA — Ablauf: Laufstart, Stationen, Fluch-Angebot, Shop, Aufstieg, Fähigkeiten, Endlos, Werte-Panel, Spielende (Teil von game.js, Reihenfolge siehe index.html) */
/* =========================================================================
   LEVEL FLOW
   ========================================================================= */
function setWorld(lvl){
  const dims=[[1300,880],[1550,1040],[1820,1180],[2150,1380],[2500,1600]];
  let tier=randInt(0,4);
  if(lvl%5===0) tier=Math.min(4,tier+1);
  const d=dims[tier], ms=G.modMapScale||1;
  WORLD={w:Math.round(d[0]*ms),h:Math.round(d[1]*ms)}; ROOM={x:40,y:40,w:WORLD.w-80,h:WORLD.h-80};
}
function updateCamera(instant){
  const c=camTarget();
  const tx=clamp(c.x-W/2,0,Math.max(0,WORLD.w-W));
  const ty=clamp(c.y-H/2,0,Math.max(0,WORLD.h-H));
  if(instant){cam.x=tx;cam.y=ty;} else {cam.x+=(tx-cam.x)*0.16;cam.y+=(ty-cam.y)*0.16;}
}
function startRun(charId){
  if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
  /* stapelbare Modifikatoren auswerten (vor setWorld, da bigmap die Welt skaliert) */
  G.modMul={}; G.modEnemySpeed=1; G.modMapScale=1; let pSpeedMod=1;
  for(const id of G.activeMods){ const m=MODIFIERS.find(x=>x.id===id); if(!m)continue;
    ['enemyHp','enemyDmg','enemyCount','fireRate','reward'].forEach(k=>{ if(m[k])G.modMul[k]=(G.modMul[k]||1)*m[k]; });
    if(m.enemySpeed)G.modEnemySpeed*=m.enemySpeed; if(m.mapScale)G.modMapScale*=m.mapScale; if(m.playerSpeed)pSpeedMod*=m.playerSpeed; }
  /* Custom-Grad: Werte aus Slidern, zählt NICHT in die Datenbank (noSave) */
  if(G.pendingDiff==='custom'){ const cd=diffById('custom'); cd.enemyCount=G.customDiff.count; cd.enemyHp=G.customDiff.hp; cd.enemyDmg=G.customDiff.dmg; cd.fireRate=G.customDiff.fire; cd.curseChance=0;
    cd.reward=Math.max(0.3,(cd.enemyCount+cd.enemyHp+cd.enemyDmg+cd.fireRate)/4);   // härter eingestellt → mehr Gold & XP
    G.diff=cd; G.noSave=true; }
  else { G.diff=diffById(G.pendingDiff); G.noSave=false; }
  G.curseSpawn=1; G.curseFire=1; G.curseHp=1; G.silence=false; G.activeCurse=null; G.rewardMul=G.diff.reward*((G.modMul.reward)||1);
  G.charId=charId; setWorld(clamp(Admin.startLevel,1,50));
  /* Spieler erstellen (Koop = 2 lokale Spieler). pSpeedMod (Hetzjagd) + Meta auf jeden. */
  const mk=(cid,ctrl)=>{ const pl=makePlayer(cid,ctrl); pl.speed*=pSpeedMod; applyMeta(pl); return pl; };
  players=[ mk(charId, G.coop?'p1':'solo') ];
  if(G.coop) players.push( mk(G.pendingChar2||charId, 'p2') );
  player=players[0];
  /* Fluch gilt für alle Spieler (nicht bei Custom) */
  const curseOffer=(!G.noSave && Math.random()<G.diff.curseChance)?pick(CURSE_DEFS):null;   // E4: wird angeboten, nicht verhängt
  $('#diffTag').textContent=diffName(G.diff);
  G.level=clamp(Admin.startLevel,1,50); G.coins=Admin.startCoins; G.kills=0; G.time=0; G.endless=false;
  postQueue=[];
  G.run={kills:0,gold:0,bossKills:0,time:0,level:G.level,charLevel:1,died:false,won:false,weaponKills:{},bossKinds:{},cheated:adminActive(),id:Date.now(),dmg:{}};
  G.runCommitted=null;
  enemies=[];bullets=[];ebullets=[];pickups=[];particles=[];puddles=[];floaters=[];bolts=[];obstacles=[];novaRings=[];deployables=[];beams=[];
  charPreviews=[];
  hideAllOverlays(); $('#hud').classList.add('show'); G.state='playing';
  setDock('weaponDock',false); setDock('itemDock',false);
  updateWeaponBar(); updateItemPills(); updateHP(); updateXPBar(); updateStatusBar();
  $('#coinTag').textContent=G.coins; $('#killTag').textContent=0;
  buildLevel(G.level); updateCamera(true);
  if(curseOffer) openCurseOffer(curseOffer);
}
/* ---------- FLUCH-ANGEBOT: annehmen = Fluch für alle Spieler + ×1,35 Beute, ablehnen = normaler Lauf ---------- */
function openCurseOffer(c){ G.state='curse'; G.menuAt=performance.now(); $('#hud').classList.remove('show');
  const wrap=$('#curseCards'); wrap.innerHTML='';
  const acc=document.createElement('div'); acc.className='rcard cursed'; acc.dataset.key=1;
  acc.innerHTML='<div class="ic">'+svgIcon(c.ic,'#e0405f',34)+'</div><div class="rk">'+t('curse_label')+'</div><div class="rn">'+c.name+'</div>'+
    '<div class="rd"><span style="color:#5fbf52">'+c.up+'</span><span class="curse-down">'+c.down+'</span><span style="color:var(--gold2);display:block;margin-top:6px">'+t('curse_reward')+'</span></div>'+
    '<div class="price">'+t('curse_accept')+'</div>';
  acc.onclick=()=>{ players.forEach(pl=>c.apply(pl)); G.activeCurse=c; G.rewardMul*=1.35; updateHP(); closeCurseOffer(); };
  const dec=document.createElement('div'); dec.className='rcard'; dec.dataset.key=2;
  dec.innerHTML='<div class="ic">'+svgIcon('shield',C.bone,34)+'</div><div class="rk" style="color:var(--bone-dim)">—</div><div class="rn">'+t('curse_decline')+'</div><div class="rd">'+t('curse_decline_d')+'</div>';
  dec.onclick=closeCurseOffer;
  wrap.append(acc,dec); show('curse'); }
function closeCurseOffer(){ hideAllOverlays(); G.state='playing'; $('#hud').classList.add('show'); last=performance.now(); }
function buildLevel(lvl){
  setWorld(lvl);
  enemies=[];bullets=[];ebullets=[];puddles=[];bolts=[];novaRings=[];pickups=[];deployables=[];beams=[];
  G.cleared=false; G.clearTimer=0;
  /* Koop: tote Spieler in der nächsten Runde wiederbeleben; alle Statuseffekte löschen + platzieren */
  players.forEach((pl,i)=>{ clearStatuses(pl); pl.waveHit=false; if(pl.dead){ pl.dead=false; pl.hp=Math.round(pl.maxHP*0.6); } pl.bondKills=0; pl.invuln=0.9;
    pl.x=WORLD.w/2 + (players.length>1?(i===0?-44:44):0); pl.y=WORLD.h-160; });
  player=players[0];
  const region=REGIONS[clamp(Math.floor((lvl-1)/10),0,4)];
  $('#stationLabel').textContent= lvl>50? t('hud_endless')+' '+(lvl-50) : t('hud_station')+' '+lvl+' / 50';
  $('#regionLabel').textContent=region.name;
  buildDecor(region); buildObstacles();
  G.waveGoldMul=1; G.shrine=null;
  G.hazards=[];
  if(lvl%5===0) spawnBoss(lvl); else { spawnWave(lvl); maybeShrine(); }   // auch im Endlos-Modus alle 5 Stationen ein Boss
  updateCamera(true);
}
function spawnWave(lvl){
  if(Admin.noSpawn)return;
  const areaF=(ROOM.w*ROOM.h)/(1220*800);
  const count=clamp(Math.round((4+lvl*0.8)*areaF*diffMul('enemyCount')*G.curseSpawn),4,90);
  const pool=['chaser','chaser','chaser'];
  if(lvl>=2)pool.push('swarmer','swarmer');
  if(lvl>=4)pool.push('shooter','shooter');
  if(lvl>=6)pool.push('flyer');
  if(lvl>=7)pool.push('tank');
  if(lvl>=8)pool.push('healer');
  if(lvl>=9)pool.push('spitter');
  if(lvl>=11)pool.push('exploder');
  if(lvl>=11)pool.push('summoner');
  const eliteChance=lvl>=8?Math.min(0.32,0.08+lvl*0.006):0;
  for(let i=0;i<count;i++){
    const edge=randInt(0,3);let x,y;
    if(edge===0){x=rand(ROOM.x+20,ROOM.x+ROOM.w-20);y=ROOM.y+20;}
    else if(edge===1){x=ROOM.x+ROOM.w-20;y=rand(ROOM.y+20,ROOM.y+ROOM.h-20);}
    else if(edge===2){x=rand(ROOM.x+20,ROOM.x+ROOM.w-20);y=ROOM.y+ROOM.h-20;}
    else{x=ROOM.x+20;y=rand(ROOM.y+20,ROOM.y+ROOM.h-20);}
    if(dist2(x,y,player.x,player.y)<170*170){i--;continue;}
    const e=spawnEnemy(pick(pool),x,y,lvl);
    if(eliteChance && !e.support && !e.explode && Math.random()<eliteChance) makeElite(e);
  }
}
function checkCleared(dt){
  if(G.cleared){G.clearTimer-=dt;if(G.clearTimer<=0)onCleared();return;}
  if(enemies.length===0){ G.cleared=true; G.clearTimer=0.6; }
}
function onCleared(){
  for(const pl of players) healPlayer(pl,pl.maxHP*0.10);   // alle lebenden Spieler (früher nur Spieler 1)
  const clearGold=Math.round(G.level*3*(G.rewardMul||1)*(G.waveGoldMul||1));
  G.coins+=clearGold; if(G.run)G.run.gold+=clearGold;
  for(const pl of players){ if(!pl.dead && hasRelic(pl,'confess') && !pl.waveHit){ G.coins+=5; pl.maxHP+=2; pl.hp+=2; updateHP(); showToast(relicById('confess').name,'+5 '+t('hud_gold')+' · +2 '+t('s_hp')); } }
  if(players.some(pl=>hasRelic(pl,'coffer'))){ const z=Math.min(20,Math.floor(G.coins*0.05)); G.coins+=z; if(G.run)G.run.gold+=z; }
  $('#coinTag').textContent=G.coins;
  G.state='collect'; G.collectT=0;
}
function openPostWave(){
  postQueue=[];
  const bossStation=G.level%5===0;
  for(const pl of players){ if(pl.dead)continue;
    if(bossStation && RELICS.some(r=>!hasRelic(pl,r.id))) postQueue.push({step:'relic',pl});   // vor dem Shop, damit Würfel/Schlüssel sofort wirken
    if(!(G.silence && G.level%2===1)) postQueue.push({step:'shop',pl});   // Pakt des Schweigens: Shop nur nach geraden Stationen
    for(let i=0;i<pl.pendingUp;i++) postQueue.push({step:'upgrade',pl});
    for(let i=0;i<pl.pendingAb;i++) postQueue.push({step:'ability',pl});
    pl.pendingUp=0; pl.pendingAb=0; }
  advancePost();
}
function advancePost(){
  hideAllOverlays();
  if(postQueue.length===0){ finishPostWave(); return; }
  const it=postQueue.shift();
  player=it.pl;                          // aktiver Spieler für Shop/Aufstieg/Gabe
  if(it.step==='shop') openShop();
  else if(it.step==='upgrade') openUpgrade();
  else if(it.step==='ability') openAbility();
  else if(it.step==='relic') openRelic();
}
function openRelic(after){ G.state='relic'; const done=after||advancePost; G.menuAt=performance.now(); $('#hud').classList.remove('show');
  const pool=shuffle(RELICS.filter(r=>!hasRelic(player,r.id))).slice(0,3);
  $('#relicSub').textContent=playerTag()+t('relic_sub');
  const wrap=$('#relicCards'); wrap.innerHTML='';
  pool.forEach((r,i)=>{ const el=document.createElement('div'); el.className='rcard relic'; el.dataset.key=i+1; const hint=relicRecipeHint(r.id);
    el.innerHTML='<div class="ic">'+svgIcon(r.ic,C.gold2,34)+'</div><div class="rk" style="color:var(--gold2)">✦ '+t('relic_label')+'</div><div class="rn">'+r.name+'</div>'+
      '<div class="rd">'+r.desc+(hint?'<br><span style="color:var(--epic)">'+hint+'</span>':'')+'</div>';
    el.onclick=()=>{ giveRelic(player,r.id); Audio2.ability(); done(); }; wrap.appendChild(el); });
  Audio2.ability(); show('relic'); }
function playerTag(){ return (G.coop&&players.length>1) ? (t('coop_player')+' '+(players.indexOf(player)+1)+' · ') : ''; }
function finishPostWave(){
  player=players[0];
  if(G.run){G.run.level=G.level;G.run.charLevel=Math.max.apply(null,players.map(p=>p.level));}
  if(G.level>=50 && !G.endless){ openEndless(); return; }
  nextLevel();
}
function nextLevel(){ G.level++; G.state='playing'; hideAllOverlays(); $('#hud').classList.add('show'); showBanner(); buildLevel(G.level); last=performance.now(); }
function showBanner(){ const region=REGIONS[clamp(Math.floor((G.level-1)/10),0,4)];
  $('#bannerTitle').textContent= G.level>50? t('hud_endless')+' '+(G.level-50) : t('hud_station')+' '+G.level; $('#bannerSub').textContent=region.name;
  const b=$('#banner'); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }

/* ---------- SHOP (Waffen mit Gold) ---------- */
let shopOffer=[];
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=randInt(0,i);[a[i],a[j]]=[a[j],a[i]];} return a; }
function rollShop(){
  const offer=[], used=new Set();
  /* Verschmelzungen zuerst anbieten (besonders) */
  for(const r of availableWeaponEvos()){ if(offer.length<3){ offer.push({evo:r}); } }
  const atCap=player.weapons.length>=capOf(player);
  if(atCap){
    /* nur noch eigene Waffen veredeln (bis Stufe 10) */
    const up=shuffle(player.weapons.filter(id=>weaponLevel(id)<WEAPON_MAX_LEVEL).map(id=>weaponById(id)));
    for(const w of up){ if(offer.length<3){ offer.push({weapon:w,upgrade:true}); used.add(w.id); } }
  } else {
    let guard=0;
    while(offer.length<3 && guard++<50){
      const rk=rollRarity(currentLuck());
      let pool=WEAPONS.filter(x=>!x.evo && x.rk===rk && !used.has(x.id) && !player.weapons.includes(x.id));
      if(!pool.length){ for(let r=rarRank(rk);r>=0 && !pool.length;r--){ pool=WEAPONS.filter(x=>!x.evo && rarRank(x.rk)===r && !used.has(x.id) && !player.weapons.includes(x.id)); } }
      if(Math.random()<SHOP_CLS_BIAS){   // Neigung: Waffe, die eine Klasse mit einer getragenen teilt — gleiche oder niedrigere Seltenheit
        const own=new Set(player.weapons.flatMap(id=>weaponById(id).cls)), pr=charProf(player);   // dazu die Klassen, die die Figur mag
        if(pr){ if(pr.aff)own.add(pr.aff); for(const c in (pr.wb||{})) if(c!=='*'&&((pr.wb[c].dmg||0)>0||pr.wb[c].shots)) own.add(c); }
        for(let r=rarRank(rk);r>=0;r--){ const f=WEAPONS.filter(x=>!x.evo && rarRank(x.rk)===r && !used.has(x.id) && !player.weapons.includes(x.id) && x.cls.some(c=>own.has(c))); if(f.length){pool=f;break;} } }
      if(pool.length){ const w=pick(pool); used.add(w.id); offer.push({weapon:w}); } else break;
    }
    /* nicht genug neue Waffen? mit Veredelungen auffüllen */
    if(offer.length<3){
      const up=shuffle(player.weapons.filter(id=>weaponLevel(id)<WEAPON_MAX_LEVEL).map(id=>weaponById(id)));
      for(const w of up){ if(offer.length<3 && !used.has(w.id)){ used.add(w.id); offer.push({weapon:w,upgrade:true}); } }
    }
  }
  if(hasRelic(player,'key')){
    const fresh=atCap?[]:WEAPONS.filter(x=>!x.evo && !used.has(x.id) && !player.weapons.includes(x.id) && rarRank(x.rk)<=rarRank(rollRarity(currentLuck()+0.1)));
    const up=player.weapons.filter(id=>weaponLevel(id)<WEAPON_MAX_LEVEL && !used.has(id)).map(id=>weaponById(id));
    if(fresh.length) offer.push({weapon:pick(fresh),hidden:true}); else if(up.length) offer.push({weapon:pick(up),upgrade:true,hidden:true});
  }
  return offer;
}
function openShop(){
  G.state='shop'; G.menuAt=performance.now(); $('#hud').classList.remove('show');
  player.freeReroll=hasRelic(player,'dice');
  shopOffer=rollShop(); Audio2.lvl(); renderShop();
  $('#shop').classList.add('show');
}
function renderShop(){
  $('#shopGold').textContent=G.coins;
  $('#shopSub').textContent = playerTag() + (player.weapons.length>=capOf(player) ? t('shop_sub_full',{cap:capOf(player)}) : t('shop_sub_buy'));
  const wrap=$('#shopCards'); wrap.innerHTML=''; wrap.classList.toggle('four',shopOffer.length>3);
  $('#shopHint').textContent=t('hint_shop',{n:Math.max(3,shopOffer.length)});
  if(!shopOffer.length){ wrap.innerHTML='<div class="rd" style="grid-column:1/-1;color:var(--bone-dim);padding:20px">'+t('shop_nothing')+'</div>'; }
  shopOffer.forEach((o,i)=>{
    const el=document.createElement('div'); el.dataset.key=i+1;
    if(o.evo){
      const r=o.evo, res=weaponById(r.result), a=weaponById(r.a), b=r.relic?{name:relicById(r.relic).name}:weaponById(r.b);
      el.className='rcard evo'; el.style.borderColor=rarColor(res.rk);
      el.innerHTML='<div class="ic">'+svgIcon(res.ic,res.color,34)+'</div>'+
        '<div class="rk godlike">✦ '+t('shop_evo')+'</div>'+
        '<div class="rn">'+res.name+'</div>'+
        '<div class="rd">'+a.name+' + '+b.name+' →<br>'+weaponMeta(res,res.dmg)+'</div>'+
        '<div class="price">'+t('shop_evo_free')+'</div>';
      el.onclick=()=>performWeaponEvolution(r);
    } else {
      const w=o.weapon, lvl=weaponLevel(w.id), maxed=lvl>=WEAPON_MAX_LEVEL;
      const price=Math.round((o.upgrade?upgradePrice(w):weaponPrice(w))*(o.hidden?0.5:1)); const can=G.coins>=price && !maxed;
      if(o.hidden){ el.className='rcard hidden-offer'+(can?'':' locked');
        el.innerHTML='<div class="ic">'+svgIcon('eye',C.gold2,32)+'</div><div class="rk" style="color:var(--gold2)">🗝 '+t('key_label')+'</div><div class="rn">???</div><div class="rd">'+t('key_hidden')+'</div>'+
          '<div class="price'+(can?'':' cant')+'">'+price+' '+t('hud_gold')+'</div>';
        if(can) el.onclick=()=>{ showToast(t('key_label'),'<b style="color:'+rarColor(w.rk)+'">'+w.name+'</b>'+(o.upgrade?' · '+t('shop_refine'):'')); buyWeapon(w,price); };
        wrap.appendChild(el); return; }
      el.className='rcard'+(can?'':' locked'); el.style.borderColor=rarColor(w.rk);
      el.innerHTML='<div class="ic">'+svgIcon(w.ic,w.color,32)+'</div>'+
        '<div class="rk '+w.rk+'">'+rarName(w.rk)+(o.upgrade?' · '+t('shop_refine'):'')+'</div>'+
        '<div class="rn">'+w.name+(o.upgrade?' <span style="color:var(--gold2)">'+t('lvl_short')+lvl+'→'+(lvl+1)+'</span>':'')+'</div>'+
        '<div class="cls-row">'+w.cls.map(c=>{ const n=(player.clsN&&player.clsN[c])||0; return clsChip(c,clsName(c)+' '+(o.upgrade?n:n+'→'+(n+1))+'/5'); }).join('')+'</div>'+
        '<div class="rd">'+weaponMeta(w,Math.round(weaponDamage(w))+(o.upgrade?' → '+Math.round(w.dmg*(1+lvl*0.22)):''))+'</div>'+
        (maxed?'<div class="owned">'+t('shop_max')+'</div>':'<div class="price'+(can?'':' cant')+'">'+price+' '+t('hud_gold')+'</div>');
      if(can) el.onclick=()=>buyWeapon(w,price);
    }
    wrap.appendChild(el);
  });
  $('#shopReroll').textContent=t('shop_reroll',{cost:rerollCost()});
  $('#shopReroll').style.opacity=G.coins<rerollCost()?0.45:1;
}
function weaponMeta(w,dmgTxt){ return t('dbg_dmg')+' '+dmgTxt+' · '+(w.count>1?t('w_proj',{n:w.count}):t('w_single'))+(w.pierce>2?' · '+t('w_pierce'):'')+(w.chain?' · '+t('w_chain'):'')+(w.burn?' · '+t('ammo_burn'):'')+(w.explosive?' · '+t('w_explosive'):'')+(w.deploy?' · '+t('w_deploy'):'')+(w.poison?' · '+t('w_poison'):'')+(w.bounce?' · '+t('w_bounce'):'')+(w.contagion||w.ignite?' · '+t('w_spread'):'')+(w.frostpool?' · '+t('w_frostpool'):'')+(w.hex?' · '+t('w_hex'):'')+(w.nail?' · '+t('w_nail'):'')+(w.rail?' · '+t('w_rail'):'')+(w.verdict?' · '+t('w_verdict'):'')+(w.strike?' · '+t('w_strike'):''); }
function buyWeapon(w,price){
  if(G.coins<price)return;
  G.coins-=price; $('#coinTag').textContent=G.coins; giveWeapon(w.id); Audio2.buy();
  advancePost();   // nur EIN Kauf pro Markt
}
$('#shopReroll').onclick=()=>{ const cost=rerollCost(); if(G.coins<cost)return; G.coins-=cost; player.freeReroll=false; $('#coinTag').textContent=G.coins; shopOffer=rollShop(); renderShop(); };
$('#shopSkip').onclick=()=>advancePost();

/* ---------- UPGRADE (Stufenaufstieg) ---------- */
let TRADE_CHANCE=0.25;   // Chance je Aufstieg, dass eine der drei Karten eine Tausch-Gabe ist
const upAvail=u=>!(u.max && (player.taken[u.id]||0)>=u.max) && (!u.coop || players.length>1);   // Karten mit Limit nur bis zum Limit anbieten
function rollUpgrades(){
  const cards=[]; const usedIds=new Set();
  for(let n=0;n<3;n++){
    let def=null,rk='common',tries=0;
    while(tries++<30){
      rk=rollRarity(currentLuck()); const r=rarRank(rk);
      const pool=UPGRADE_DEFS.filter(u=>!u.trade && (u.minRank||0)<=r && !usedIds.has(u.id) && upAvail(u));
      if(pool.length){ def=pick(pool); break; }
    }
    if(!def){ const pool=UPGRADE_DEFS.filter(u=>!u.trade && !usedIds.has(u.id) && !u.minRank && upAvail(u)); def=pool.length?pick(pool):pick(UPGRADE_DEFS.filter(u=>!u.trade&&!u.minRank)); rk='common'; }
    usedIds.add(def.id); cards.push({def,rk});
  }
  const trades=UPGRADE_DEFS.filter(u=>u.trade && upAvail(u));
  if(trades.length && Math.random()<TRADE_CHANCE) cards[randInt(0,2)]={def:pick(trades),rk:'common'};
  return cards;
}
function openUpgrade(){
  G.state='upgrade'; G.menuAt=performance.now(); $('#hud').classList.remove('show');
  $('#upgradeSub').textContent=playerTag()+t('up_sub',{lvl:player.level});
  Audio2.lvl(); renderUpgrade(rollUpgrades()); $('#upgrade').classList.add('show');
}
function renderUpgrade(cards){
  const wrap=$('#upgradeCards'); wrap.innerHTML='';
  cards.forEach((c,i)=>{
    const r=rarRank(c.rk);
    const el=document.createElement('div'); el.className='rcard'+(c.def.trade?' trade':''); el.dataset.key=i+1; el.style.borderColor=c.def.trade?'':rarColor(c.rk);
    el.innerHTML=c.def.trade
      ? '<div class="ic">'+svgIcon(c.def.ic,'#d8a0a0',32)+'</div><div class="rk trade">⇄ '+t('trade_label')+'</div><div class="rn">'+c.def.name+'</div>'+
        '<div class="rd"><span style="color:#5fbf52">'+c.def.up+'</span><span class="curse-down">'+c.def.down+'</span></div>'
      : '<div class="ic">'+svgIcon(c.def.ic,rarColor(c.rk),32)+'</div>'+
        '<div class="rk '+c.rk+'">'+rarName(c.rk)+'</div>'+
        '<div class="rn">'+c.def.name+'</div>'+
        '<div class="rd">'+c.def.desc(r)+'</div>';
    el.onclick=()=>{ giveUpgradeDef(c.def,c.rk); advancePost(); };
    wrap.appendChild(el);
  });
}

/* ---------- ABILITY (Fähigkeiten bei Meilenstein) ---------- */
function rollAbilities(){
  const pool=(CHAR_ABILITIES[player.charId||G.charId]||CHAR_ABILITIES.penitent).slice();
  // mische und nimm 3 (unique), jede mit gewürfelter Seltenheit
  for(let i=pool.length-1;i>0;i--){const j=randInt(0,i);[pool[i],pool[j]]=[pool[j],pool[i]];}
  const ids=pool.slice(0,3);
  return ids.map(id=>({def:abById(id),rk:rollRarity(currentLuck()+0.06)}));
}
function openAbility(){
  G.state='ability'; G.menuAt=performance.now(); $('#hud').classList.remove('show');
  $('#abilitySub').textContent=playerTag()+t('ab_sub',{lvl:player.level});
  Audio2.ability(); renderAbility(rollAbilities()); $('#ability').classList.add('show');
}
function renderAbility(cards){
  const wrap=$('#abilityCards'); wrap.innerHTML='';
  cards.forEach((c,i)=>{
    const r=rarRank(c.rk);
    const owned=player.abilities.find(a=>a.id===c.def.id);
    const el=document.createElement('div'); el.className='rcard'; el.dataset.key=i+1; el.style.borderColor=rarColor(c.rk);
    el.innerHTML='<div class="ic">'+svgIcon(c.def.ic,rarColor(c.rk),34)+'</div>'+
      '<div class="rk '+c.rk+'">'+rarName(c.rk)+' · '+t('ab_card')+'</div>'+
      '<div class="rn">'+c.def.name+(owned?' <span style="color:var(--gold2)">St.'+owned.level+'→'+(owned.level+1)+'</span>':'')+'</div>'+
      '<div class="rd">'+c.def.desc(r)+(owned?'<br><span style="color:var(--gold2)">'+t('ab_owned')+'</span>':'')+'</div>';
    el.onclick=()=>{ giveAbility(c.def,c.rk); advancePost(); };
    wrap.appendChild(el);
  });
}

/* ---------- ENDLESS ---------- */
function openEndless(){
  G.state='endless'; $('#hud').classList.remove('show'); $('#bossBarWrap').classList.remove('show');
  if(G.run){G.run.won=true;} G.endSouls=finishRun(false,true); renderEndless();
  Audio2.win(); $('#endless').classList.add('show');
}
/* Endbildschirme werden bei einem Sprachwechsel neu geschrieben (applyLang) */
function renderEndless(){ $('#endlessStats').innerHTML=t('end_all50')+'<br>'+t('end_clvl')+': <b>'+player.level+'</b> · '+t('hud_kills')+': <b>'+G.kills+'</b><br>'+soulsLine(G.endSouls)+'<br>'+t('endless_q'); }
$('#endlessGo').onclick=()=>{ G.endless=true; hideAllOverlays(); $('#hud').classList.add('show'); G.state='playing'; nextLevel(); };
$('#endlessRestart').onclick=()=>{ G.state='menu'; hideAllOverlays(); refreshProfile(); show('menu'); };

/* ---------- STATS PANEL (Kopf-Klick) ---------- */
function openStats(){
  if(G.state!=='playing')return;
  G.state='stats'; $('#hud').classList.remove('show'); fillStats(); $('#stats').classList.add('show');
}
function closeStats(){ if(G.state!=='stats')return; $('#stats').classList.remove('show'); G.state='playing'; $('#hud').classList.add('show'); last=performance.now(); }
function fillStats(){
  const p=player, ch=charById(p.charId||G.charId);
  $('#statsClass').textContent=ch.name+' · '+t('hud_level')+' '+p.level;
  const pct=v=>Math.round(v*100)+'%';
  const ammo=[]; if(p.burn)ammo.push(t('ammo_burn')); if(p.slow)ammo.push(t('ammo_slow')); if(p.explosive)ammo.push(t('ammo_explosive'));
  for(const m of p.fxMods||[]){ const d=UPGRADE_DEFS.find(u=>u.mod===m); if(d)ammo.push(d.name); }
  const rows=[
    [t('s_hp'),Math.ceil(p.hp)+' / '+p.maxHP],
    [t('s_shield'),p.shieldMax>0?Math.ceil(p.shield)+' / '+p.shieldMax:t('val_none')],
    [t('s_dmg'),pct(p.dmgMult)],
    [t('s_fr'),pct(1/p.frMult)],
    [t('s_speed'),pct(p.speed/215)],
    [t('s_armor'),p.armor],
    [t('s_crit'),Math.round(p.crit*100)+'% (×'+p.critMult.toFixed(1)+')'],
    [t('s_pierce'),'+'+p.pierce],
    [t('s_multi'),'+'+p.multishot],
    [t('s_leech'),p.lifesteal+' '+t('leech_unit')],
    [t('s_thorns'),p.thorns],
    [t('s_ammo'),ammo.length?ammo.join(', '):t('val_none')],
    [t('s_luck'),(currentLuck()).toFixed(2)],
    [t('s_magnet'),pct(p.magnet||1)],
    [t('s_xp'),p.xp+' / '+p.xpNext],
    [t('s_items'),p.items.length],
  ];
  $('#statGrid').innerHTML=rows.map(r=>'<div class="stat-row"><span class="l">'+r[0]+'</span><span class="v">'+r[1]+'</span></div>').join('');
  const wlist=p.weapons.map(id=>{const w=weaponById(id);const l=weaponLevel(id);return '<b>'+w.name+'</b> <span style="color:var(--gold2)">'+t('lvl_short')+l+'</span>';}).join(' · ');
  const act=Object.keys(p.clsSt||{}).filter(c=>p.clsSt[c]>0);
  $('#statWeapons').innerHTML=charPerkHtml(p.charId)+t('weapons_label')+': '+wlist+(act.length?'<div class="stat-cls">'+act.map(c=>clsChip(c,clsName(c)+' '+ROMAN[p.clsSt[c]])+' <span>'+clsDesc(c,p.clsSt[c])+'</span>').join('<br>')+'</div>':'');
  const rl=Object.keys(p.relics||{}).map(id=>'<b style="color:var(--gold2)">'+relicById(id).name+'</b>');
  $('#statAbilities').innerHTML=(rl.length?t('relics_label')+': '+rl.join(' · ')+'<br>':'')+(p.abilities.length?(t('abilities_label')+': '+p.abilities.map(a=>'<b style="color:'+rarColor(a.rk)+'">'+a.name+'</b>'+(a.level>1?' '+t('lvl_short')+a.level:'')).join(' · ')):'');
}
$('#statsClose').onclick=closeStats;

/* ---------- GAME OVER / VICTORY ---------- */
const EPITAPHS=['Der Weg endet hier','Nicht alle Sünden lassen sich abtragen','Das Kreuz blieb leer','Asche zu Asche'];
const EPITAPHS_EN=['The path ends here','Not every sin can be atoned','The cross stayed empty','Ashes to ashes'];
function buildRunSnapshot(died,won){ return {kills:G.kills,gold:G.run?G.run.gold:G.coins,bossKills:G.run?G.run.bossKills:0,
  time:G.time,level:G.level,charLevel:players.length?Math.max.apply(null,players.map(p=>p.level)):1,died:!!died,won:!!won,
  weaponKills:G.run?Object.assign({},G.run.weaponKills):{},bossKinds:G.run?G.run.bossKinds:null,heresyWin:!!won&&G.diff&&G.diff.id==='heresy'}; }
function onPlayerDead(who){ const p=who||player; p.dead=true; p.hp=0;
  for(let i=0;i<26;i++)spawnParticle(p.x,p.y,C.blood2,rand(2,4),rand(80,200)); G.shake=Math.max(G.shake,7);
  if(alivePlayers().length===0){ gameOver(); }
  else { showToast(t('coop_down'),'<b>'+charById(p.charId).name+'</b> — '+t('coop_revive')); updateHP(); }
}
function gameOver(){
  if(G.state==='gameover')return;
  G.state='gameover'; $('#hud').classList.remove('show'); $('#bossBarWrap').classList.remove('show');
  G.endSouls=finishRun(true,false); G.epitaph=randInt(0,EPITAPHS.length-1); renderGameOver();
  $('#gameover').classList.add('show');
}
function renderGameOver(){
  $('#goEpitaph').textContent=(LANG==='en'?EPITAPHS_EN:EPITAPHS)[G.epitaph||0];
  $('#goStats').innerHTML=t('end_station')+': <b>'+G.level+(G.level>50?' ('+t('hud_endless')+')':' / 50')+'</b><br>'+t('end_clvl')+': <b>'+player.level+'</b><br>'+t('hud_kills')+': <b>'+G.kills+'</b><br>'+t('hud_gold')+': <b>'+G.coins+'</b><br>'+t('end_class')+': <b>'+charById(G.charId).name+'</b><br>'+soulsLine(G.endSouls); }
