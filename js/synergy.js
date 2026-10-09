"use strict";
/* GOLGOTHA — Duo-Segen, Set-Verwandlungen, Lebensregeneration
   Einstiegspunkte aus dem Spielcode (alle zur Laufzeit):
     damageEnemy → synDmgMul (vor dem Abzug), synOnHit (danach) · killEnemy → synOnKill · hurtPlayer setzt p.hurtT
     updateBullets → updateSynergy (pro Bild) · drawPlayer → drawSynergyMarks · openRelic → duoOffer
     buyItem / giveUpgradeDef / giveRelic → checkSets · Shop-/Gaben-/Reliquienkarten → setTagHtml · fillStats → synStatRows/synStatsHtml
   Auslöser-Bremse: Schaden aus einem Duo-Effekt läuft mit G._duoD (Tiefe). Treffer-Effekte feuern nur bei Tiefe 0 und nicht
   aus Reliquien-Schaden (G._relicD); Schwefel-Explosionen lösen aus Tiefe 1 nur mit 20 % weitere aus, ab Tiefe 2 nie. */

/* ---------- LEBENSREGENERATION: über healPlayer (Heilungsfaktor der Figur), pausiert 2 s nach einem erlittenen Treffer ---------- */
ICONS.flask='M10 3h4 M10 3v5l-4 9a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-4-9V3 M8 14h8';
ITEMS.push({id:'i_holywater',name:'Weihwasserflasche',rk:'uncommon',ic:'flask',up:'+0,4 LP/s Regeneration',down:'pausiert 2 s nach Treffer',apply:p=>{p.regen=(p.regen||0)+0.4;}});
UPGRADE_DEFS.push({id:'regen',name:'Gnadenquell',ic:'flask',minRank:1,desc:r=>'+'+(0.3+r*0.1).toFixed(1)+' LP/s Regeneration',apply:(p,r)=>{p.regen=(p.regen||0)+0.3+r*0.1;}});
const REGEN_PAUSE=2;
const regenRate=p=>(p.regen||0)+(hasSet(p,'pilgrim')&&p.moving?1.5:0);
const regenPaused=p=>G.time-(p.hurtT!=null?p.hurtT:-99)<REGEN_PAUSE;

/* ---------- DUO-SEGEN (Hades): ≥2 Waffen aus Klasse a und ≥2 aus Klasse b → bei der nächsten Boss-Reliquie mit 50 % als 4. Karte ----------
   'nahkampf' zählt hier wie eine Klasse (Anzahl Nahkampfwaffen). */
const DUOS=[
 {id:'sulfur',       a:'feuer',   b:'seuche',   ic:'explosion',name:'Schwefel',         name_en:'Brimstone',
   desc:'Brennende und vergiftete Gegner explodieren beim Tod (85 px, 30% ihres Lebens)', desc_en:'Burning and poisoned enemies explode on death (85 px, 30% of their health)'},
 {id:'plaguecarrier',a:'konstrukt',b:'seuche',  ic:'plague',   name:'Seuchenträger',    name_en:'Plague Carrier',
   desc:'Geschütze, Totems, Minen, Ratten und Begleiter vergiften bei jedem Treffer', desc_en:'Turrets, totems, mines, rats and familiars poison on every hit'},
 {id:'supercond',    a:'frost',   b:'blitz',    ic:'snow',     name:'Supraleiter',      name_en:'Superconductor',
   desc:'Blitz-Treffer auf verlangsamte Gegner: +50% Schaden und eine Frostwelle (70 px), die verlangsamt', desc_en:'Lightning hits on slowed enemies: +50% damage and a frost wave (70 px) that slows'},
 {id:'hellstorm',    a:'feuer',   b:'blitz',    ic:'lightning',name:'Höllengewitter',   name_en:'Hellstorm',
   desc:'Alle 1,2 s fährt ein Blitz von oben in bis zu 3 Gegner, die du in Brand gesetzt hast', desc_en:'Every 1.2 s lightning strikes up to 3 enemies you set on fire'},
 {id:'witchhammer',  a:'heilig',  b:'eisen',    ic:'nail',     name:'Hammer der Hexen', name_en:'Witch Hammer',
   desc:'Jeder 8. Eisen-Treffer am selben Gegner nagelt ihn 0,6 s fest; festgehaltene Gegner nehmen +40% Schaden', desc_en:'Every 8th iron hit on the same enemy pins it for 0.6 s; pinned enemies take +40% damage'},
 {id:'shrapnel',     a:'pulver',  b:'eisen',    ic:'spread',   name:'Schrapnell',       name_en:'Shrapnel',
   desc:'Tötet eine Pulver-Waffe, zerplatzt der Gegner in 5 Splitter (je 40% des letzten Treffers)', desc_en:'Powder kills burst into 5 shards (40% of the last hit each)'},
 {id:'thermal',      a:'frost',   b:'feuer',    ic:'nova',     name:'Thermoschock',     name_en:'Thermal Shock',
   desc:'Treffer auf brennende und verlangsamte Gegner: Dampfstoß (75 px, 80% Schaden), betäubt 0,4 s', desc_en:'Hits on burning, slowed enemies: steam burst (75 px, 80% damage), stuns 0.4 s'},
 {id:'tribunal',     a:'heilig',  b:'blitz',    ic:'crown',    name:'Strafgericht',     name_en:'Tribunal',
   desc:'Jeder 7. Treffer deiner Heilig- oder Blitz-Waffen ruft einen goldenen Blitz (120%) — gegen Elite/Bosse fast doppelt so oft', desc_en:'Every 7th hit of your holy or lightning weapons calls a golden bolt (120%) — almost twice as often vs elites/bosses'},
 {id:'glowblade',    a:'nahkampf',b:'feuer',    ic:'sword',    name:'Glühende Schneide',name_en:'Glowing Edge',
   desc:'Nahkampftreffer entzünden immer; brennende Gegner nehmen durch Nahkampf +30% Schaden', desc_en:'Melee hits always ignite; burning enemies take +30% melee damage'},
 {id:'blades',       a:'nahkampf',b:'eisen',    ic:'scythe',   name:'Wurfklingen',      name_en:'Throwing Blades',
   desc:'Jeder 3. Nahkampfschwung wirft eine kreisende Klinge (70% Schaden, durchbohrt 3)', desc_en:'Every 3rd melee swing throws a spinning blade (70% damage, pierces 3)'},
];
let DUO_CHANCE=0.5;
const MELEE_CLS={name:'Nahkampf',name_en:'Melee',color:'#d8a878',ic:'sword'};
const duoById=id=>DUOS.find(d=>d.id===id);
const duoName=d=>LANG==='en'?d.name_en:d.name, duoDesc=d=>LANG==='en'?d.desc_en:d.desc;
const hasDuo=(p,id)=>!!(p&&p.duos&&p.duos[id]);
const duoClsName=c=>c==='nahkampf'?(LANG==='en'?MELEE_CLS.name_en:MELEE_CLS.name):clsName(c);
function duoClsChip(c,txt){ const k=c==='nahkampf'?MELEE_CLS:CLASSES[c]; return '<span class="cls-chip" style="color:'+k.color+';border-color:'+k.color+'55">'+svgIcon(k.ic,k.color,11)+' '+txt+'</span>'; }
function duoCount(p,c){ return c==='nahkampf'?p.weapons.filter(isMelee).length:((p.clsN&&p.clsN[c])||0); }
const duoReady=(p,d)=>!hasDuo(p,d.id)&&duoCount(p,d.a)>=2&&duoCount(p,d.b)>=2;
const duoReqText=d=>duoClsName(d.a)+' 2 + '+duoClsName(d.b)+' 2';
function giveDuo(p,id){ const d=duoById(id); if(!p||!d||hasDuo(p,id))return; (p.duos||(p.duos={}))[id]=true; codexSeen('d',id);
  p.items.push({ic:d.ic,color:C.gold2,relic:true}); updateItemPills(); Audio2.ability();
  showToast(t('duo_label'),'<b style="color:var(--gold2)">'+duoName(d)+'</b> · '+duoDesc(d)); }
/* openRelic: Zusatzkarte nur nach einem Boss (nicht am Blutschrein) */
function duoOffer(wrap,done,boss){ wrap.classList.remove('four'); const kh=$('#relic .key-hint'); if(kh)kh.textContent=t('hint_pick'); if(!boss)return;
  const ready=DUOS.filter(d=>duoReady(player,d)); if(!ready.length||Math.random()>=DUO_CHANCE)return;
  const d=pick(ready), el=document.createElement('div'); el.className='rcard duo'; el.dataset.key=wrap.children.length+1;
  el.style.setProperty('--ca',(d.a==='nahkampf'?MELEE_CLS:CLASSES[d.a]).color); el.style.setProperty('--cb',CLASSES[d.b].color);
  el.innerHTML='<div class="ic">'+svgIcon(d.ic,C.gold2,34)+'</div><div class="rk">✦ '+t('duo_label')+'</div><div class="rn">'+duoName(d)+'</div>'+
    '<div class="cls-row">'+duoClsChip(d.a,duoClsName(d.a)+' '+duoCount(player,d.a))+duoClsChip(d.b,duoClsName(d.b)+' '+duoCount(player,d.b))+'</div><div class="rd">'+duoDesc(d)+'</div>';
  el.onclick=()=>{ giveDuo(player,d.id); done(); }; wrap.appendChild(el); wrap.classList.add('four'); if(kh)kh.textContent=t('duo_hint'); }

/* Duo-Schaden: eigene Quelle (Messung), Tiefe für die Auslöser-Bremse */
function duoDmg(e,d,ang,kb,id,o){ G._duoD=(G._duoD||0)+1; try{ damageEnemy(e,d,ang,kb,false,'duo_'+id,o); } finally { G._duoD--; } }
function skyBolt(e,col){ bolts.push({x1:e.x+rand(-30,30),y1:e.y-260,x2:e.x,y2:e.y,t:0.18,color:col}); for(let k=0;k<5;k++)spawnParticle(e.x,e.y,col,1.6,90); }
function burst(x,y,R,col,n){ novaRings.push({x,y,r:6,max:R,t:0.35,color:col}); for(let k=0;k<(n||10);k++)spawnParticle(x+rand(-R,R)*0.4,y+rand(-R,R)*0.4,col,rand(1.5,3),rand(60,160)); }
const near=(x,y,R,skip)=>enemies.filter(n=>n!==skip&&dist2(x,y,n.x,n.y)<R*R);

/* vor dem Abzug in damageEnemy: Schadensfaktor des Besitzers gegen dieses Ziel */
function synDmgMul(e,src,o){ if(!o)return 1; let m=1;
  if(hasSet(o,'penitent')&&o.hp<o.maxHP*0.3) m*=1.5;
  if(hasSet(o,'pyre')&&e.burnT>0) m*=1.25;
  if(hasDuo(o,'witchhammer')&&e.rootT>0&&!e.isBoss) m*=1.4;
  if(hasDuo(o,'glowblade')&&e.burnT>0&&isMelee(src)) m*=1.3;
  return m; }
/* nach dem Treffer (src = Waffe/Quelle, exec = Hinrichtung durch execPct) */
function synOnHit(e,dmg,src,o,exec){ if(!o)return; if(exec) synExecuted(o,e);
  if(!o.duos||G._duoD||G._relicD)return; const w=weaponById(src); if(!w)return; const D=o.duos, alive=e.hp>0;
  if(D.plaguecarrier&&w.deploy&&alive){ applyPoison(e,dmg*0.4+1,'duo_plaguecarrier',o,true); for(let k=0;k<3;k++)spawnParticle(e.x,e.y,C.sick,1.5,60); }
  if(D.supercond&&w.cls.includes('blitz')&&e.slowT>0&&!(e._scT>G.time)){ e._scT=G.time+0.5;
    burst(e.x,e.y,70,C.chill,8); for(const n of near(e.x,e.y,70,e)) applySlow(n,o); if(alive) duoDmg(e,dmg*0.5,0,0,'supercond',o); }
  if(D.thermal&&e.burnT>0&&e.slowT>0&&!(e._stT>G.time)){ e._stT=G.time+2.5; burst(e.x,e.y,75,'#e8eef0',14);
    for(const n of near(e.x,e.y,75)){ if(!n.isBoss)n.rootT=Math.max(n.rootT||0,0.4); duoDmg(n,dmg*0.8,Math.atan2(n.y-e.y,n.x-e.x),60,'thermal',o); } }
  if(D.witchhammer&&w.cls.includes('eisen')&&alive&&!e.isBoss){ e._whN=(e._whN||0)+1;
    if(e._whN%8===0){ e.rootT=Math.max(e.rootT||0,0.6); spawnFloater(e.x,e.y-e.r-10,'✚',true); burst(e.x,e.y,e.r+18,C.gold2,6); } }
  if(D.tribunal&&(w.cls.includes('heilig')||w.cls.includes('blitz'))){ o._trN=(o._trN||0)+((e.isBoss||e.elite)?1.75:1);
    if(o._trN>=7&&alive){ o._trN=0; skyBolt(e,C.gold2); duoDmg(e,dmg*1.2,-Math.PI/2,40,'tribunal',o); } }
  if(D.glowblade&&w.melee&&alive) applyBurn(e,dmg*0.4+2,src,o); }
/* Hinrichtung (execPct oder Henkersbeil) */
function synExecuted(o,e){ if(hasSet(o,'headsman')){ healPlayer(o,2); spawnFloater(o.x,o.y-o.r-14,'+2',false); } }
/* in killEnemy (nicht bei Bossen) */
function synOnKill(e,o,src){ if(!o)return; const depth=G._duoD||0;
  if(hasSet(o,'doctor')&&e.poisonT>0){ const rm=(G.rewardMul||1)*(G.waveGoldMul||1);
    if(Math.random()<0.8) spawnPickup(e.x,e.y,'coin',Math.max(1,Math.round(randInt(1,3)*o.goldMult*rm)));   // doppelt Gold
    if(e.poisonSrc!=='set_doctor') spawnPuddle(e.x,e.y,Math.max(2,e.poisonDps||0),{hostile:false,effect:'toxin',src:'set_doctor',owner:o,life:2.5,rMul:1.3}); }   // Wolke steckt an, Wolken-Tote nicht
  if(hasSet(o,'pyre')&&e.burnT>0&&(e.burnGen||0)<2){ for(const n of near(e.x,e.y,140,e).sort((a,b)=>dist2(e.x,e.y,a.x,a.y)-dist2(e.x,e.y,b.x,b.y)).slice(0,2)){
    applyBurn(n,e.burnDmg,e.burnSrc,o); n.burnGen=(e.burnGen||0)+1; bolts.push({x1:e.x,y1:e.y,x2:n.x,y2:n.y,t:0.14,color:C.candle}); } }
  if(!o.duos)return; const D=o.duos;
  if(D.sulfur&&e.burnT>0&&e.poisonT>0&&depth<2&&(depth===0||Math.random()<0.2)){ const d=e.maxHp*0.3; G.shake=Math.max(G.shake,4); burst(e.x,e.y,85,'#d8d040',16);
    for(const n of near(e.x,e.y,85,e)) duoDmg(n,d,Math.atan2(n.y-e.y,n.x-e.x),80,'sulfur',o); }
  const w=weaponById(src);
  if(D.shrapnel&&w&&w.cls.includes('pulver')&&depth===0){ const d=Math.max(3,(e.lastHit||0)*0.4), a0=rand(0,TAU);
    for(let k=0;k<5;k++){ const a=a0+k*TAU/5; bullets.push({id:uid++,x:e.x,y:e.y,vx:Math.cos(a)*520,vy:Math.sin(a)*520,dmg:d,r:3,pierce:0,life:0.35,kb:30,color:C.gold2,crit:false,fx:[],owner:o,depth:1,wid:'duo_shrapnel',hitIds:new Set([e.id])}); } } }
/* aus fireMelee: Wurfklingen */
function synOnSwing(p,w,ang,dmg){ if(!hasDuo(p,'blades'))return; p._bladeN=(p._bladeN||0)+1; if(p._bladeN%3)return;
  bullets.push({id:uid++,x:p.x+Math.cos(ang)*16,y:p.y+Math.sin(ang)*16,vx:Math.cos(ang)*620,vy:Math.sin(ang)*620,dmg:dmg*0.7,r:7,pierce:3,life:0.7,kb:80,color:'#cfd6d0',crit:false,fx:[],owner:p,depth:1,wid:'duo_blades',hitIds:new Set()}); }
PROJ_SHAPE.duo_blades='scythe'; PROJ_SHAPE.duo_shrapnel='pellet';

/* ---------- SET-VERWANDLUNGEN (Isaac): 3 Teile aus Gegenständen, Gaben und Reliquien → dauerhafte Verwandlung + Merkmal an der Figur ---------- */
const SETS=[
 {id:'penitent',name:'Der Büßer',name_en:'The Penitent',ic:'crown',color:'#c01f24',mark:'thorns',
   parts:[{k:'gift',id:'t_belt'},{k:'item',id:'i_bread'},{k:'relic',id:'mblood'}],
   desc:'Unter 30% LP: +50% Schaden und +20% Tempo · Dornenkrone', desc_en:'Below 30% HP: +50% damage and +20% speed · crown of thorns'},
 {id:'headsman',name:'Der Henker',name_en:'The Headsman',ic:'scythe',color:'#8a1418',mark:'hood',
   parts:[{k:'gift',id:'t_hood'},{k:'gift',id:'t_chain'},{k:'gift',id:'t_skull'}],
   desc:'Hinrichtungs-Schwelle +10%, jede Hinrichtung heilt 2 LP · Henkerskapuze', desc_en:'Execution threshold +10%, every execution heals 2 HP · executioner\'s hood',
   apply:p=>{ p._execRaw=p.execPct; p.execPct=Math.min(0.6,p.execPct+0.1); p._execShow=p.execPct; }},
 {id:'doctor',name:'Der Pestdoktor',name_en:'The Plague Doctor',ic:'plague',color:'#9bbf3a',mark:'beak',
   parts:[{k:'item',id:'i_vial'},{k:'relic',id:'urn'},{k:'gift',id:'t_purse'}],
   desc:'Vergiftete Gegner lassen doppelt Gold fallen und hinterlassen beim Tod eine Giftwolke · Schnabelmaske', desc_en:'Poisoned enemies drop double gold and leave a toxic cloud on death · beak mask'},
 {id:'pilgrim',name:'Der Pilger',name_en:'The Pilgrim',ic:'wing',color:'#e0b25a',mark:'halo',
   parts:[{k:'gift',id:'t_staff'},{k:'item',id:'i_sandals'},{k:'item',id:'i_holywater'}],
   desc:'+10% Tempo, in Bewegung +1,5 LP/s, Ausweichen lädt 40% schneller · Heiligenschein', desc_en:'+10% speed, +1.5 HP/s while moving, dodge recharges 40% faster · halo',
   apply:p=>{ p.speed*=1.1; }},
 {id:'pyre',name:'Der Scheiterhaufen',name_en:'The Pyre',ic:'flame',color:'#e08a2f',mark:'flames',
   parts:[{k:'item',id:'i_oil'},{k:'item',id:'i_candle'},{k:'gift',id:'m_pitch'}],
   desc:'Brennende Gegner nehmen +25% Schaden; Brand springt beim Tod auf 2 Nachbarn · Flammenkrone', desc_en:'Burning enemies take +25% damage; burn jumps to 2 neighbours on death · crown of flames'},
];
const setById=id=>SETS.find(s=>s.id===id);
const setName=s=>LANG==='en'?s.name_en:s.name, setDesc=s=>LANG==='en'?s.desc_en:s.desc;
const hasSet=(p,id)=>!!(p&&p.sets&&p.sets[id]);
function setPartOwned(p,pt){ return pt.k==='item'?itemOwned(p,pt.id)>0:pt.k==='relic'?hasRelic(p,pt.id):!!(p.taken&&p.taken[pt.id]); }
function setPartName(pt){ const o=pt.k==='item'?itemById(pt.id):pt.k==='relic'?relicById(pt.id):upDefById(pt.id); return o?o.name:pt.id; }
const setCount=(p,s)=>s.parts.filter(pt=>setPartOwned(p,pt)).length;
function checkSets(p){ if(!p)return;
  for(const s of SETS){ if(hasSet(p,s.id)||setCount(p,s)<s.parts.length)continue;
    (p.sets||(p.sets={}))[s.id]=true; codexSeen('s',s.id); if(s.apply)s.apply(p); Audio2.ability(); G.shake=Math.max(G.shake,6);
    for(let i=0;i<30;i++)spawnParticle(p.x,p.y,s.color,rand(1.5,3.5),rand(80,220));
    showToast(t('set_toast'),'<b style="color:'+s.color+'">'+setName(s)+'</b> · '+setDesc(s)); updateHP(); } }
/* Karten-Hinweis: „Teil von Set X (n/3)“ (k = item | gift | relic) */
function setTagHtml(k,id){ if(!player)return ''; return SETS.filter(s=>s.parts.some(pt=>pt.k===k&&pt.id===id)).map(s=>
  '<div class="set-tag" style="color:'+s.color+'">'+t('set_part',{name:setName(s),n:setCount(player,s),m:s.parts.length})+(hasSet(player,s.id)?' ✦':'')+'</div>').join(''); }

/* ---------- pro Bild (aus updateBullets) ---------- */
function updateSynergy(dt){
  for(const p of players){ if(p.dead)continue;
    const rg=regenRate(p); if(rg>0&&p.hp<p.maxHP&&!regenPaused(p)) healPlayer(p,rg*dt);
    if(hasSet(p,'pilgrim')&&p.dashCd>0) p.dashCd-=dt*0.4;
    if(hasSet(p,'penitent')){ const on=p.hp<p.maxHP*0.3; if(on!==!!p._penOn){ p._penOn=on; p.speed*=on?1.2:1/1.2; } }
    if(hasSet(p,'headsman')&&p.execPct!==p._execShow){ p._execRaw=p.execPct; p.execPct=Math.min(0.6,p._execRaw+0.1); p._execShow=p.execPct; }   // Fähigkeiten setzen execPct mit Math.max neu
    if(hasDuo(p,'hellstorm')){ p._hsT=(p._hsT||0)-dt;
      if(p._hsT<=0){ p._hsT=1.2; for(const e of shuffle(enemies.filter(e=>e.burnT>0&&e.burnOwner===p)).slice(0,3)){ skyBolt(e,'#ff9a40'); duoDmg(e,6+e.burnDmg*2+G.level*0.5,-Math.PI/2,30,'hellstorm',p); } } } } }

/* ---------- Merkmale an der Figur (aus drawPlayer, nach drawHero) ---------- */
function drawSynergyMarks(p){ if(!p.sets)return; const s=p.r*1.3, tt=G.uiTime, bob=p.moving?Math.sin(tt*12)*0.14*s:Math.sin(tt*2.5)*0.07*s;
  cx.save(); cx.translate(p.x,p.y+bob); if(Math.cos(p.aim)<0) cx.scale(-1,1);
  if(p.sets.headsman){ cx.fillStyle='#0b0a0c'; cx.strokeStyle='#5a1418'; cx.lineWidth=1.5; cx.beginPath(); cx.moveTo(-s*0.52,-s*0.22);
    cx.quadraticCurveTo(-s*0.6,-s*1.0,s*0.05,-s*1.5); cx.quadraticCurveTo(s*0.6,-s*1.0,s*0.52,-s*0.22); cx.closePath(); cx.fill(); cx.stroke();
    cx.fillStyle=C.blood2; cx.fillRect(-s*0.24,-s*0.68,s*0.16,s*0.07); cx.fillRect(s*0.1,-s*0.68,s*0.16,s*0.07); }
  if(p.sets.penitent){ if(p._penOn){ cx.save(); cx.globalAlpha=0.25+Math.sin(tt*10)*0.12; cx.fillStyle=C.blood2; cx.beginPath(); cx.arc(0,0,s*1.5,0,TAU); cx.fill(); cx.restore(); }
    cx.strokeStyle='#6a4a2a'; cx.lineWidth=2.2; cx.beginPath(); cx.ellipse(0,-s*1.05,s*0.42,s*0.13,0,0,TAU); cx.stroke();
    cx.strokeStyle='#a07850'; cx.lineWidth=1.4; for(let i=0;i<9;i++){ const a=i/9*TAU, x=Math.cos(a)*s*0.42, y=-s*1.05+Math.sin(a)*s*0.13; cx.beginPath(); cx.moveTo(x,y); cx.lineTo(x*1.25,y-s*0.16); cx.stroke(); }
    cx.fillStyle=C.blood2; cx.beginPath(); cx.arc(-s*0.2,-s*0.95,1.6,0,TAU); cx.arc(s*0.25,-s*0.98,1.4,0,TAU); cx.fill(); }
  if(p.sets.doctor){ cx.fillStyle='#d8cdb8'; cx.beginPath(); cx.ellipse(s*0.05,-s*0.58,s*0.3,s*0.26,0,0,TAU); cx.fill();
    cx.beginPath(); cx.moveTo(s*0.2,-s*0.72); cx.quadraticCurveTo(s*0.75,-s*0.6,s*1.0,-s*0.35); cx.quadraticCurveTo(s*0.6,-s*0.42,s*0.2,-s*0.44); cx.closePath(); cx.fill();
    cx.strokeStyle='#8a7a5a'; cx.lineWidth=1; cx.stroke(); cx.fillStyle='#1a1a10'; cx.beginPath(); cx.arc(-s*0.06,-s*0.64,s*0.09,0,TAU); cx.arc(s*0.18,-s*0.64,s*0.09,0,TAU); cx.fill();
    cx.fillStyle=C.sick; cx.beginPath(); cx.arc(-s*0.04,-s*0.66,s*0.035,0,TAU); cx.arc(s*0.2,-s*0.66,s*0.035,0,TAU); cx.fill(); }
  if(p.sets.pilgrim){ cx.save(); cx.shadowColor=C.gold2; cx.shadowBlur=10; cx.strokeStyle='#ffe9a0'; cx.lineWidth=2.4; cx.globalAlpha=0.8+Math.sin(tt*3)*0.15;
    cx.beginPath(); cx.ellipse(0,-s*1.32,s*0.4,s*0.12,0,0,TAU); cx.stroke(); cx.restore(); }
  if(p.sets.pyre){ for(let i=0;i<5;i++){ const x=(i-2)*s*0.2, h=s*(0.3+0.12*Math.sin(tt*14+i*1.7)), y=-s*1.0+Math.abs(i-2)*s*0.06;
      cx.fillStyle=i%2?'#ffd27a':C.candle; cx.globalAlpha=0.9; cx.beginPath(); cx.moveTo(x-s*0.09,y); cx.quadraticCurveTo(x,y-h*1.4,x+s*0.09,y); cx.closePath(); cx.fill(); }
    cx.globalAlpha=1; if(Math.random()<0.15) spawnParticle(p.x+rand(-s*0.4,s*0.4),p.y-s,'#ffb050',1.2,30); }
  cx.restore(); }

/* ---------- Werte-Panel ---------- */
function synStatRows(p){ const rg=regenRate(p)*(p.healMul||1);
  return [[t('s_regen'),rg>0?rg.toFixed(1)+' '+t('regen_unit')+(regenPaused(p)?' · '+t('regen_paused'):''):t('val_none')]]; }
function synStatsHtml(p){ const h=[];
  const dl=DUOS.filter(d=>hasDuo(p,d.id)).map(d=>'<b style="color:var(--gold2)">'+duoName(d)+'</b>');
  if(dl.length) h.push(t('duos_label')+': '+dl.join(' · '));
  const sl=SETS.map(s=>({s,n:setCount(p,s)})).filter(x=>x.n>0||hasSet(p,x.s.id)).map(x=>'<b style="color:'+x.s.color+'">'+setName(x.s)+'</b> '+(hasSet(p,x.s.id)?'✦':x.n+'/'+x.s.parts.length));
  if(sl.length) h.push(t('sets_label')+': '+sl.join(' · '));
  return h.length?($('#statAbilities').innerHTML?'<br>':'')+h.join('<br>'):''; }

Object.assign(I18N.de,{
  duo_hint:'1–4 wählen', duo_label:'Duo-Segen', duos_label:'Duo-Segen', sets_label:'Sets', set_toast:'✦ Verwandlung', set_part:'Teil von Set {name} ({n}/{m})',
  s_regen:'Regeneration', regen_unit:'LP/s', regen_paused:'pausiert', set_k_item:'Gegenstand', set_k_gift:'Gabe', set_k_relic:'Reliquie',
  src_duo_sulfur:'Schwefel (Duo)', src_duo_plaguecarrier:'Seuchenträger (Duo)', src_duo_supercond:'Supraleiter (Duo)', src_duo_hellstorm:'Höllengewitter (Duo)',
  src_duo_thermal:'Thermoschock (Duo)', src_duo_tribunal:'Strafgericht (Duo)', src_duo_shrapnel:'Schrapnell (Duo)', src_duo_blades:'Wurfklingen (Duo)', src_set_doctor:'Pestdoktor (Set)',
});
Object.assign(I18N.en,{
  duo_hint:'1–4 choose', duo_label:'Duo Boon', duos_label:'Duo boons', sets_label:'Sets', set_toast:'✦ Transformation', set_part:'Part of set {name} ({n}/{m})',
  s_regen:'Regeneration', regen_unit:'HP/s', regen_paused:'paused', set_k_item:'Item', set_k_gift:'Boon', set_k_relic:'Relic',
  src_duo_sulfur:'Brimstone (duo)', src_duo_plaguecarrier:'Plague carrier (duo)', src_duo_supercond:'Superconductor (duo)', src_duo_hellstorm:'Hellstorm (duo)',
  src_duo_thermal:'Thermal shock (duo)', src_duo_tribunal:'Tribunal (duo)', src_duo_shrapnel:'Shrapnel (duo)', src_duo_blades:'Throwing blades (duo)', src_set_doctor:'Plague doctor (set)',
});
