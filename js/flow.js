"use strict";
/* GOLGOTHA — Ablauf: Laufstart, Stationen, Fluch-Angebot, Stufenaufstieg (Waffen/Booster), Händler, Fähigkeiten, Endlos, Werte-Panel, Spielende (Teil von game.js, Reihenfolge siehe index.html) */
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
  G.curseSpawn=1; G.curseFire=1; G.curseHp=1; G.activeCurse=null; G.rewardMul=G.diff.reward*((G.modMul.reward)||1);
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
  buildDecor(region); buildMap(lvl,region);   // Raumaufbau, Boden, Hindernisse je Region (map.js)
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
  regionPool(lvl,pool);
  const eliteChance=lvl>=8?Math.min(0.32,0.08+lvl*0.006):0;
  for(let i=0;i<count;i++){
    const edge=randInt(0,3);let x,y;
    if(edge===0){x=rand(ROOM.x+20,ROOM.x+ROOM.w-20);y=ROOM.y+20;}
    else if(edge===1){x=ROOM.x+ROOM.w-20;y=rand(ROOM.y+20,ROOM.y+ROOM.h-20);}
    else if(edge===2){x=rand(ROOM.x+20,ROOM.x+ROOM.w-20);y=ROOM.y+ROOM.h-20;}
    else{x=ROOM.x+20;y=rand(ROOM.y+20,ROOM.y+ROOM.h-20);}
    if(dist2(x,y,player.x,player.y)<170*170){i--;continue;}
    const e=spawnEnemy(pick(pool),x,y,lvl); i+=packExtra(e,count-1-i);
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
    if(bossStation && RELICS.some(r=>!hasRelic(pl,r.id))) postQueue.push({step:'relic',pl});   // vor dem Händler, damit Würfel/Schlüssel sofort wirken
    if(bossStation) postQueue.push({step:'shop',pl});   // Händler nach jeder Boss-Station, vor den Aufstiegen (gekaufte Marken gelten sofort)
    for(let i=0;i<pl.pendingUp;i++) postQueue.push({step:'upgrade',pl});
    for(let i=0;i<pl.pendingAb;i++) postQueue.push({step:'ability',pl});
    pl.pendingUp=0; pl.pendingAb=0; }
  advancePost();
}
function advancePost(){
  hideAllOverlays();
  if(postQueue.length===0){ finishPostWave(); return; }
  const it=postQueue.shift();
  player=it.pl;                          // aktiver Spieler für Händler/Aufstieg/Gabe
  if(it.step==='shop') openMerchant();
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
      '<div class="rd">'+r.desc+(hint?'<br><span style="color:var(--epic)">'+hint+'</span>':'')+'</div>'+setTagHtml('relic',r.id);
    el.onclick=()=>{ giveRelic(player,r.id); Audio2.ability(); done(); }; wrap.appendChild(el); });
  duoOffer(wrap,done,!after);   // Duo-Segen als 4. Karte (synergy.js)
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

function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=randInt(0,i);[a[i],a[j]]=[a[j],a[i]];} return a; }
function weaponMeta(w,dmgTxt){ return t('dbg_dmg')+' '+dmgTxt+' · '+(w.melee?meleeMeta(w):w.count>1?t('w_proj',{n:w.count}):t('w_single'))+(w.pierce>2?' · '+t('w_pierce'):'')+(w.chain?' · '+t('w_chain'):'')+(w.burn?' · '+t('ammo_burn'):'')+(w.explosive?' · '+t('w_explosive'):'')+(w.deploy?' · '+t('w_deploy'):'')+(w.poison?' · '+t('w_poison'):'')+(w.bounce?' · '+t('w_bounce'):'')+(w.contagion||w.ignite?' · '+t('w_spread'):'')+(w.frostpool?' · '+t('w_frostpool'):'')+(w.hex?' · '+t('w_hex'):'')+(w.nail?' · '+t('w_nail'):'')+(w.rail?' · '+t('w_rail'):'')+(w.verdict?' · '+t('w_verdict'):'')+(w.strike?' · '+t('w_strike'):''); }

/* ---------- STUFENAUFSTIEG (wie Vampire Survivors): neue Waffe, neuer Booster oder +1 Stufe auf Eigenes ----------
   Je Platz wird eine Kartenart nach Gewicht gezogen; volle Waffen-/Booster-Plätze bieten nur noch Aufwertungen.
   Verschmelzungen (WEAPON_EVOS) stehen vorn. Alles maximal oder verbannt: Gold oder Heilung. Marken je Spieler (p.rerolls, p.banishes). */
let progCards=[], progBanishMode=false;
const PROG_W={wup:1,bup:1,wnew:1.6,bnew:1.6};   // Aufwertungen zählen je Kandidat (bis 3), Neues fest
const upAvail=u=>!(u.max && (player.taken[u.id]||0)>=u.max) && (!u.coop || players.length>1);   // Sondergaben mit Limit nur bis zum Limit
/* Klassen, die der Spieler trägt oder die Figur mag: Neigung beim Ziehen neuer Waffen und Freigabe der Klassen-Booster */
function progLikedCls(p){ const own=new Set(p.weapons.flatMap(id=>(weaponById(id)||{cls:[]}).cls)), pr=charProf(p);
  if(pr){ if(pr.aff)own.add(pr.aff); for(const c in (pr.wb||{})) if(c!=='*'&&((pr.wb[c].dmg||0)>0||pr.wb[c].shots)) own.add(c); } return own; }
const progBanned=(p,k,id)=>!!(p.banished&&p.banished[k+':'+id]);
const progWeighted=list=>{ let tot=0; for(const o of list) tot+=o.w||1; let x=Math.random()*tot; for(const o of list){ x-=o.w||1; if(x<=0)return o; } return list[list.length-1]; };
/* neue Waffe: Seltenheit gewürfelt (Glück zählt), sonst die nächst niedrigere; mit SHOP_CLS_BIAS eine aus getragenen/Lieblingsklassen */
function progDrawWeapon(p,used){ const ok=x=>!x.evo&&!used.has('w:'+x.id)&&!p.weapons.includes(x.id)&&!progBanned(p,'w',x.id);
  const rk=rollRarity(currentLuck()); let pool=[];
  for(let r=rarRank(rk);r>=0&&!pool.length;r--) pool=WEAPONS.filter(x=>ok(x)&&rarRank(x.rk)===r);
  if(!pool.length) pool=WEAPONS.filter(ok);
  if(Math.random()<SHOP_CLS_BIAS){ const own=progLikedCls(p);
    for(let r=rarRank(rk);r>=0;r--){ const f=WEAPONS.filter(x=>ok(x)&&rarRank(x.rk)===r&&x.cls.some(c=>own.has(c))); if(f.length){pool=f;break;} } }
  return pool.length?pick(pool):null; }
function progBoosterPool(p,used){ const own=progLikedCls(p);
  return BOOSTERS.filter(b=>!boosterLevel(p,b.id)&&!used.has('b:'+b.id)&&!progBanned(p,'b',b.id)&&(!b.cls||own.has(b.cls))); }
const progWUp=(p,used)=>p.weapons.filter(id=>weaponLevel(id)<WEAPON_MAX_LEVEL&&!used.has('w:'+id)&&!progBanned(p,'w',id));
const progBUp=(p,used)=>Object.keys(p.boosters).filter(id=>p.boosters[id]<BOOSTER_MAX&&!used.has('b:'+id)&&!progBanned(p,'b',id));
function progRoll(p,n){ const cards=[], used=new Set(), dead=new Set(); let guard=0;
  for(const r of availableWeaponEvos()) if(cards.length<Math.max(1,n-1)) cards.push({kind:'evo',evo:r});
  while(cards.length<n&&guard++<40){
    const wu=progWUp(p,used), bu=progBUp(p,used);
    const opts=[{k:'wup',w:PROG_W.wup*Math.min(3,wu.length)},{k:'bup',w:PROG_W.bup*Math.min(3,bu.length)},
      {k:'wnew',w:p.weapons.length<capOf(p)?PROG_W.wnew:0},{k:'bnew',w:boosterCount(p)<progBCap(p)?PROG_W.bnew:0}].filter(o=>o.w>0&&!dead.has(o.k));
    if(!opts.length)break;
    const k=progWeighted(opts).k; let c=null;
    if(k==='wup') c={kind:'wup',id:pick(wu)};
    else if(k==='bup') c={kind:'bup',id:pick(bu)};
    else if(k==='wnew'){ const w=progDrawWeapon(p,used); if(w) c={kind:'wnew',id:w.id}; }
    else { const pool=progBoosterPool(p,used); if(pool.length) c={kind:'bnew',id:progWeighted(pool).id}; }
    if(c){ used.add((c.kind[0]==='w'?'w:':'b:')+c.id); cards.push(c); } else dead.add(k); }
  if(!cards.length) cards.push({kind:'gold'},{kind:'heal'});
  return cards; }
const progCanGrow=p=>availableWeaponEvos().length>0||progRoll(p,1)[0].kind!=='gold';
const progFillGold=()=>Math.round(20+G.level*3);
/* 4. Karte: 10% + Glück (Galgenstrick), höchstens 60% */
const progExtraChance=p=>Math.min(0.6,0.1+(p.luck||0));
/* gewählte Karte anwenden (aktiver Spieler = player) */
function progApply(c){ const p=player;
  if(c.kind==='evo') performWeaponEvolution(c.evo);
  else if(c.kind==='wnew'||c.kind==='wup') giveWeapon(c.id);
  else if(c.kind==='bnew'||c.kind==='bup') giveBooster(p,c.id);
  else if(c.kind==='gold'){ const g=progFillGold(); G.coins+=g; if(G.run)G.run.gold+=g; $('#coinTag').textContent=G.coins; }
  else if(c.kind==='heal') healPlayer(p,p.maxHP*0.3); }
function progLabel(c){ if(c.kind==='evo')return weaponById(c.evo.result).name; if(c.kind[0]==='w')return weaponById(c.id).name;
  if(c.kind[0]==='b')return boosterName(boosterById(c.id)); return c.kind==='gold'?'+'+progFillGold()+' '+t('hud_gold'):t('up_heal'); }
function openUpgrade(){
  G.state='upgrade'; G.menuAt=performance.now(); $('#hud').classList.remove('show'); progBanishMode=false;
  $('#upgradeSub').textContent=playerTag()+t('up_sub',{lvl:player.level});
  progCards=progRoll(player,Math.random()<progExtraChance(player)?4:3);
  Audio2.lvl(); renderUpgrade(); $('#upgrade').classList.add('show');
}
/* Karte (auch für die Truhe im Kodex/Händler-Toast): Kopf „NEU“ bzw. „St. 2 → 3“, Wirkung der nächsten Stufe */
function progCardHtml(c){ const p=player, lv=t('lvl_short');
  if(c.kind==='evo'){ const r=c.evo, res=weaponById(r.result), a=weaponById(r.a), b=r.relic?{name:relicById(r.relic).name}:weaponById(r.b);
    return {cls:'rcard evo',border:rarColor(res.rk),html:'<div class="ic">'+svgIcon(res.ic,res.color,34)+'</div><div class="rk godlike">✦ '+t('shop_evo')+'</div><div class="rn">'+res.name+'</div>'+
      '<div class="rd">'+a.name+' + '+b.name+' →<br>'+weaponMeta(res,res.dmg)+'</div>'}; }
  if(c.kind==='wnew'||c.kind==='wup'){ const w=weaponById(c.id), up=c.kind==='wup', l=up?weaponLevel(w.id):0;
    return {cls:'rcard',border:rarColor(w.rk),html:'<div class="ic">'+svgIcon(w.ic,w.color,32)+'</div>'+
      '<div class="rk '+w.rk+'">'+(up?'':'<span class="prog-new">'+t('up_new')+'</span> · ')+rarName(w.rk)+'</div>'+
      '<div class="rn">'+w.name+(up?' <span class="prog-lv">'+lv+l+' → '+(l+1)+'</span>':'')+'</div>'+
      '<div class="cls-row">'+w.cls.map(k=>{ const n=(p.clsN&&p.clsN[k])||0; return clsChip(k,clsName(k)+' '+(up?n:n+'→'+(n+1))+'/5'); }).join('')+'</div>'+
      '<div class="rd">'+weaponMeta(w,up?Math.round(weaponDamage(w))+' → '+Math.round(w.dmg*(1+l*0.22)):Math.round(w.dmg))+
      (up?'':'<br><span class="prog-slot">'+t('up_wslot',{n:p.weapons.length+1,m:capOf(p)})+'</span>')+'</div>'}; }
  if(c.kind==='bnew'||c.kind==='bup'){ const b=boosterById(c.id), L=boosterLevel(p,c.id);
    return {cls:'rcard booster',border:b.cls?CLASSES[b.cls].color:'',html:'<div class="ic">'+svgIcon(b.ic,b.cls?CLASSES[b.cls].color:C.gold2,32)+'</div>'+
      '<div class="rk prog-brk">'+(L?'':'<span class="prog-new">'+t('up_new')+'</span> · ')+t('booster_label')+'</div>'+
      '<div class="rn">'+boosterName(b)+(L?' <span class="prog-lv">'+lv+L+' → '+(L+1)+'</span>':'')+'</div>'+
      '<div class="rd"><span class="up">'+progBText(b,L+1,L)+'</span>'+(L?'':'<br><span class="prog-slot">'+t('up_bslot',{n:boosterCount(p)+1,m:progBCap(p)})+'</span>')+'</div>'+setTagHtml('booster',c.id)}; }
  if(c.kind==='gold') return {cls:'rcard',border:'',html:'<div class="ic">'+svgIcon('crown',C.gold2,32)+'</div><div class="rk" style="color:var(--gold2)">'+t('up_full')+'</div><div class="rn">+'+progFillGold()+' '+t('hud_gold')+'</div><div class="rd">'+t('up_full_d')+'</div>'};
  return {cls:'rcard',border:'',html:'<div class="ic">'+svgIcon('heart',C.blood2,32)+'</div><div class="rk" style="color:var(--gold2)">'+t('up_full')+'</div><div class="rn">'+t('up_heal')+'</div><div class="rd">'+t('up_heal_d')+'</div>'}; }
function renderUpgrade(){ const p=player, wrap=$('#upgradeCards'); wrap.innerHTML=''; wrap.classList.toggle('four',progCards.length>3); wrap.classList.toggle('banish',progBanishMode);
  progCards.forEach((c,i)=>{ const h=progCardHtml(c), el=document.createElement('div'); el.className=h.cls; el.dataset.key=i+1; if(h.border)el.style.borderColor=h.border; el.innerHTML=h.html;
    const canBan=c.kind==='wnew'||c.kind==='wup'||c.kind==='bnew'||c.kind==='bup';
    if(progBanishMode&&!canBan) el.classList.add('locked');
    el.onclick=()=>{ if(progBanishMode){ if(canBan) progBanish(c); return; } progApply(c); advancePost(); };
    wrap.appendChild(el); });
  const rr=$('#upReroll'), bn=$('#upBanish');
  rr.textContent=t('up_reroll',{n:p.rerolls||0}); rr.disabled=!(p.rerolls>0);
  bn.textContent=progBanishMode?t('up_banish_cancel'):t('up_banish',{n:p.banishes||0}); bn.disabled=!(p.banishes>0)&&!progBanishMode; bn.classList.toggle('on',progBanishMode);
  $('#upSkip').textContent=t('up_skip',{g:Math.round(progFillGold()/2)});
  $('#upHint').textContent=progBanishMode?t('hint_banish',{n:progCards.length}):t('hint_up',{n:progCards.length}); }
function progBanish(c){ const p=player; if(!(p.banishes>0))return; p.banishes--; p.banished[(c.kind[0]==='w'?'w:':'b:')+c.id]=1; progBanishMode=false;
  showToast(t('up_banished'),'<b>'+progLabel(c)+'</b>'); progCards=progRoll(p,progCards.length); renderUpgrade(); }
$('#upReroll').onclick=()=>{ const p=player; if(G.state!=='upgrade'||!(p.rerolls>0))return; p.rerolls--; progBanishMode=false; progCards=progRoll(p,progCards.length); renderUpgrade(); };
$('#upBanish').onclick=()=>{ if(G.state!=='upgrade')return; if(!progBanishMode&&!(player.banishes>0))return; progBanishMode=!progBanishMode; renderUpgrade(); };
$('#upSkip').onclick=()=>{ if(G.state!=='upgrade')return; const g=Math.round(progFillGold()/2); G.coins+=g; if(G.run)G.run.gold+=g; $('#coinTag').textContent=G.coins; advancePost(); };

/* ---------- HÄNDLER nach jeder Boss-Station (ersetzt den Shop zwischen den Wellen) ----------
   Dienste (mehrfach kaufbar): Heilung, Neu-Würfeln- und Verbannen-Marke, Truhe (Preis steigt je Kauf im Besuch).
   Schlüssel des Türhüters: zusätzliche Truhe zum halben Preis. Dazu 2 einmalige Sondergaben (Tausch, Modifikator, Munition, Koop).
   Preise wachsen mit der Station; Ablassbrief (priceMul) verteuert. G.state bleibt 'shop' (Overlay #shop). */
let merchWares=[], merchSpecials=[], merchChests=0;
const merchMul=()=>(1+G.level*0.05)*priceMul();
function merchPrice(o){ const m=merchMul();
  switch(o.kind){ case 'heal': return Math.round(25*m); case 'reroll': return Math.round(20*m); case 'banish': return Math.round(30*m);
    case 'chest': return Math.round(45*m*Math.pow(1.5,merchChests)); case 'keychest': return Math.round(45*m*0.5);
    case 'gift': return Math.round(RARITY_PRICE[rarRank(o.def.rk||'common')]*0.7*m); } return 0; }
/* Sondergaben: bevorzugt ein fehlendes Teil eines angefangenen Sets */
function merchRollSpecials(p){ const pool=UPGRADE_DEFS.filter(upAvail), out=[];
  const want=SETS.filter(s=>!hasSet(p,s.id)&&setCount(p,s)>0).flatMap(s=>s.parts.filter(pt=>pt.k==='gift'&&!setPartOwned(p,pt)).map(pt=>pt.id));
  const fav=pool.filter(u=>want.includes(u.id));
  if(fav.length&&Math.random()<0.6) out.push(pick(fav));
  for(const u of shuffle(pool.slice())) if(out.length<2&&!out.includes(u)) out.push(u);
  return out.map(def=>({kind:'gift',def})); }
function openMerchant(){
  G.state='shop'; G.menuAt=performance.now(); $('#hud').classList.remove('show'); merchChests=0;
  if(hasRelic(player,'dice')&&player.diceAt!==G.level){ player.rerolls=(player.rerolls||0)+1; showToast(relicById('dice').name,t('merch_dice')); }
  merchWares=[{kind:'heal'},{kind:'reroll'},{kind:'banish'},{kind:'chest'}]; if(hasRelic(player,'key')) merchWares.push({kind:'keychest'});
  merchSpecials=merchRollSpecials(player); Audio2.lvl(); renderMerchant(); $('#shop').classList.add('show'); }
/* Truhe: Verschmelzung, sonst eine zufällige Karte des Stufenaufstiegs (respektiert Plätze und Verbannungen) */
function merchChest(){ const ev=availableWeaponEvos(), c=ev.length?{kind:'evo',evo:pick(ev)}:progRoll(player,1)[0]; if(c.kind==='gold')return false;
  progApply(c); const lv=c.kind==='wup'?' '+t('lvl_short')+weaponLevel(c.id):c.kind==='bup'?' '+t('lvl_short')+boosterLevel(player,c.id):c.kind[1]==='n'?' · '+t('up_new'):'';
  showToast(t('merch_chest'),'<b style="color:var(--gold2)">'+progLabel(c)+'</b>'+lv); return true; }
function merchUseful(o){ const p=player;
  if(o.kind==='heal') return p.hp<p.maxHP-0.5; if(o.kind==='chest'||o.kind==='keychest') return !o.sold&&progCanGrow(p); if(o.kind==='gift') return !o.sold&&upAvail(o.def); return true; }
function merchBuy(o){ const price=merchPrice(o), p=player; if(o.sold||G.coins<price||!merchUseful(o))return;
  if(o.kind==='chest'||o.kind==='keychest'){ if(!merchChest())return; if(o.kind==='chest')merchChests++; else o.sold=true; }
  else if(o.kind==='heal') healPlayer(p,p.maxHP*0.4);
  else if(o.kind==='reroll') p.rerolls=(p.rerolls||0)+1;
  else if(o.kind==='banish') p.banishes=(p.banishes||0)+1;
  else if(o.kind==='gift'){ giveUpgradeDef(o.def); o.sold=true; }
  G.coins-=price; $('#coinTag').textContent=G.coins; Audio2.buy(); renderMerchant(); }
function merchCardHtml(o){ const p=player;
  if(o.kind==='gift'){ const d=o.def, tr=d.trade;
    return '<div class="ic">'+svgIcon(d.ic,tr?'#d8a0a0':rarColor(d.rk),28)+'</div><div class="rk '+(tr?'trade':d.rk)+'">'+(tr?'⇄ '+t('trade_label'):d.mod?t('merch_mod'):d.coop?t('merch_coop'):t('merch_ammo'))+'</div>'+
      '<div class="rn">'+d.name+'</div><div class="rd">'+(tr?'<span class="up">'+d.up+'</span><br><span class="down">'+d.down+'</span>':'<span class="up">'+d.desc(rarRank(d.rk))+'</span>')+'</div>'+setTagHtml('gift',d.id); }
  const M={heal:['heart',C.blood2],reroll:['star',C.gold2],banish:['scythe','#e0405f'],chest:['chest',C.gold2],keychest:['eye',C.gold2]}[o.kind];
  const sub=o.kind==='reroll'?t('merch_have',{n:p.rerolls||0}):o.kind==='banish'?t('merch_have',{n:p.banishes||0}):o.kind==='chest'&&merchChests?t('merch_chest_n',{n:merchChests}):'';
  return '<div class="ic">'+svgIcon(M[0],M[1],28)+'</div><div class="rk" style="color:var(--gold2)">'+t('merch_k_'+o.kind)+'</div><div class="rn">'+t('merch_n_'+o.kind)+'</div>'+
    '<div class="rd">'+t('merch_d_'+o.kind)+(sub?'<br><span class="prog-slot">'+sub+'</span>':'')+'</div>'; }
function renderMerchant(){
  $('#shopGold').textContent=G.coins; $('#shopSub').textContent=playerTag()+t('merch_sub');
  let key=0; const fill=(wrap,list)=>{ wrap.innerHTML='';
    for(const o of list){ const price=merchPrice(o), use=merchUseful(o), can=use&&!o.sold&&G.coins>=price, el=document.createElement('div');
      el.className='rcard item'+(o.kind==='gift'&&o.def.trade?' trade':'')+(can?'':' locked')+(o.sold?' sold':''); el.dataset.key=++key;
      if(o.kind==='gift'&&!o.def.trade) el.style.borderColor=rarColor(o.def.rk);
      el.innerHTML=merchCardHtml(o)+(o.sold?'<div class="owned">'+t('shop_sold')+'</div>':!use?'<div class="owned">'+t('merch_useless')+'</div>':'<div class="price'+(can?'':' cant')+'">'+price+' '+t('hud_gold')+'</div>');
      if(can) el.onclick=()=>merchBuy(o); wrap.appendChild(el); } };
  fill($('#shopCards'),merchWares); fill($('#shopItems'),merchSpecials);
  $('#shopItemsTitle').style.display=merchSpecials.length?'':'none';
  $('#shopHint').textContent=t('hint_merch',{n:key}); }
$('#shopSkip').onclick=()=>{ if(G.state==='shop') advancePost(); };

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
    [t('s_items'),boosterCount(p)+' / '+progBCap(p)],
    [t('s_tokens'),t('tokens_val',{r:p.rerolls||0,b:p.banishes||0})],
  ];
  rows.push(...synStatRows(p));
  $('#statGrid').innerHTML=rows.map(r=>'<div class="stat-row"><span class="l">'+r[0]+'</span><span class="v">'+r[1]+'</span></div>').join('');
  const wlist=p.weapons.map(id=>{const w=weaponById(id);const l=(p.wLevel[id]||0)+1;return '<b>'+w.name+'</b> <span style="color:var(--gold2)">'+t('lvl_short')+l+'</span>';}).join(' · ');
  const act=Object.keys(p.clsSt||{}).filter(c=>p.clsSt[c]>0);
  $('#statWeapons').innerHTML=charPerkHtml(p.charId)+t('weapons_label')+' ('+p.weapons.length+'/'+capOf(p)+'): '+wlist+(act.length?'<div class="stat-cls">'+act.map(c=>clsChip(c,clsName(c)+' '+ROMAN[p.clsSt[c]])+' <span>'+clsDesc(c,p.clsSt[c])+'</span>').join('<br>')+'</div>':'');
  const rl=Object.keys(p.relics||{}).map(id=>'<b style="color:var(--gold2)">'+relicById(id).name+'</b>');
  const il=Object.keys(p.boosters||{}).map(id=>{ const b=boosterById(id); return b?'<b style="color:'+(b.cls?CLASSES[b.cls].color:'var(--gold2)')+'">'+boosterName(b)+'</b> '+t('lvl_short')+p.boosters[id]+' <span>('+progBText(b,p.boosters[id])+')</span>':''; }).filter(Boolean);
  const gl=Object.keys(p.taken||{}).map(id=>{ const u=upDefById(id); return u?'<b>'+u.name+'</b>'+(p.taken[id]>1?' ×'+p.taken[id]:''):''; }).filter(Boolean);
  $('#statAbilities').innerHTML=(il.length?t('boosters_label')+': '+il.join(' · ')+'<br>':'')+(gl.length?t('gifts_label')+': '+gl.join(' · ')+'<br>':'')+(rl.length?t('relics_label')+': '+rl.join(' · ')+'<br>':'')+(p.abilities.length?(t('abilities_label')+': '+p.abilities.map(a=>'<b style="color:'+rarColor(a.rk)+'">'+a.name+'</b>'+(a.level>1?' '+t('lvl_short')+a.level:'')).join(' · ')):'');
  $('#statAbilities').innerHTML+=synStatsHtml(p);   // Duo-Segen, Set-Fortschritt (synergy.js)
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

Object.assign(I18N.de,{
  up_new:'Neu', booster_label:'Booster', up_wslot:'Waffenplatz {n}/{m}', up_bslot:'Booster-Platz {n}/{m}',
  up_full:'Alles ausgebaut', up_full_d:'Alle Plätze voll und ausgebaut.', up_heal:'Heilung', up_heal_d:'Heilt 30% deiner Max-LP.',
  up_reroll:'Neu würfeln ({n})', up_banish:'Verbannen ({n})', up_banish_cancel:'Verbannen abbrechen', up_skip:'Überspringen (+{g} Gold)', up_banished:'Verbannt — kommt in diesem Lauf nicht wieder',
  hint_up:'1–{n} wählen · R neu würfeln · B verbannen · Enter überspringen', hint_banish:'1–{n}: Karte verbannen · B abbrechen',
  merch_sub:'Der Boss ist gefallen. Ein Händler wartet — Gold gegen Heilung, Marken, Truhen und Sondergaben.', hint_merch:'1–{n} kaufen · Enter weiter',
  merch_k_heal:'Dienst', merch_k_reroll:'Marke', merch_k_banish:'Marke', merch_k_chest:'Truhe', merch_k_keychest:'Schlüssel',
  merch_n_heal:'Heiltrank', merch_n_reroll:'Würfelmarke', merch_n_banish:'Bannsiegel', merch_n_chest:'Truhe', merch_n_keychest:'Truhe des Türhüters',
  merch_d_heal:'Heilt 40% deiner Max-LP.', merch_d_reroll:'+1 Neu-Würfeln im Stufenaufstieg.', merch_d_banish:'+1 Verbannen: entfernt eine Karte für den ganzen Lauf.',
  merch_d_chest:'Zufällig: Verschmelzung, neues Teil oder eine Stufe höher. Jede weitere Truhe kostet mehr.', merch_d_keychest:'Wie eine Truhe, zum halben Preis (einmal je Besuch).',
  merch_have:'Du hast {n}', merch_chest_n:'{n}× gekauft', merch_chest:'Truhe', merch_useless:'Nichts zu tun', merch_mod:'Modifikator', merch_coop:'Koop', merch_ammo:'Munition',
  merch_dice:'+1 Würfelmarke', s_tokens:'Marken', tokens_val:'{r}× Neu würfeln · {b}× Verbannen', boosters_label:'Booster', gifts_label:'Sondergaben',
});
Object.assign(I18N.en,{
  up_new:'New', booster_label:'Booster', up_wslot:'Weapon slot {n}/{m}', up_bslot:'Booster slot {n}/{m}',
  up_full:'Fully upgraded', up_full_d:'Every slot is full and maxed.', up_heal:'Healing', up_heal_d:'Heals 30% of your max HP.',
  up_reroll:'Reroll ({n})', up_banish:'Banish ({n})', up_banish_cancel:'Cancel banish', up_skip:'Skip (+{g} gold)', up_banished:'Banished — will not return this run',
  hint_up:'1–{n} choose · R reroll · B banish · Enter skip', hint_banish:'1–{n}: banish a card · B cancel',
  merch_sub:'The boss has fallen. A merchant waits — gold for healing, tokens, chests and special wares.', hint_merch:'1–{n} buy · Enter continue',
  merch_k_heal:'Service', merch_k_reroll:'Token', merch_k_banish:'Token', merch_k_chest:'Chest', merch_k_keychest:'Key',
  merch_n_heal:'Healing draught', merch_n_reroll:'Dice token', merch_n_banish:'Banishing seal', merch_n_chest:'Chest', merch_n_keychest:'Gatekeeper\'s chest',
  merch_d_heal:'Heals 40% of your max HP.', merch_d_reroll:'+1 reroll on level-up.', merch_d_banish:'+1 banish: removes a card for the whole run.',
  merch_d_chest:'Random: a fusion, a new part or one level up. Each further chest costs more.', merch_d_keychest:'Like a chest, at half price (once per visit).',
  merch_have:'You have {n}', merch_chest_n:'{n}× bought', merch_chest:'Chest', merch_useless:'Nothing to do', merch_mod:'Modifier', merch_coop:'Co-op', merch_ammo:'Ammo',
  merch_dice:'+1 dice token', s_tokens:'Tokens', tokens_val:'{r}× reroll · {b}× banish', boosters_label:'Boosters', gifts_label:'Special wares',
});
