"use strict";
/* GOLGOTHA — Spieldaten: Waffen, Klassen, Reliquien, Gaben, Fähigkeiten, Charaktere und ihre Profile, Schwierigkeit, Flüche, Seelenschmiede, Erfolge; Laufwertung, Admin, globaler Zustand (Teil von game.js, Reihenfolge siehe index.html) */
/* ---------- WEAPONS (Shop, mit Gold gekauft) ---------- */
const WEAPONS=[
 {id:'revolver',name:'Rostiger Revolver',rk:'common',ic:'bullet',dmg:13,fr:380,spd:620,count:1,spread:0.03,pierce:0,size:5,kb:140,color:C.bone},
 {id:'scatter',name:'Schädelbrecher',rk:'common',ic:'spread',dmg:7,fr:760,spd:560,count:6,spread:0.4,pierce:0,size:4,kb:120,life:0.5,pattern:'random',color:C.candle},
 {id:'witchfire',name:'Hexenfeuer',rk:'common',ic:'witch',dmg:4,fr:130,spd:720,count:1,spread:0.09,pierce:0,size:5,kb:50,hex:true,color:C.sick},
 {id:'nailgun',name:'Nagelkanzel',rk:'common',ic:'nail',dmg:3.6,fr:90,spd:780,count:1,spread:0.16,pierce:0,size:3,kb:30,nail:true,color:C.steel},
 {id:'handcannon',name:'Donnerbüchse',rk:'uncommon',ic:'cannon',dmg:30,fr:900,spd:560,count:1,spread:0.02,pierce:1,size:9,kb:340,color:C.gold2},
 {id:'bolt',name:'Geißelbogen',rk:'uncommon',ic:'bolt',dmg:17,fr:520,spd:840,count:1,spread:0.02,pierce:2,size:5,kb:90,color:C.blood2},
 {id:'flame',name:'Läuterungsflamme',rk:'uncommon',ic:'flame',dmg:2.6,fr:42,spd:340,count:1,spread:0.28,pierce:2,size:7,kb:10,life:0.4,burn:true,color:C.candle},
 {id:'plague',name:'Seuchenmörser',rk:'uncommon',ic:'plague',dmg:9,fr:850,spd:430,count:1,spread:0.03,pierce:0,size:7,kb:60,puddle:true,color:C.sick},
 {id:'trinity',name:'Dreifaltigkeit',rk:'rare',ic:'trinity',dmg:11,fr:420,spd:700,count:3,spread:0.20,pierce:1,size:5,kb:90,pattern:'even',color:C.gold2},
 {id:'wrath',name:'Zorn des Heiligen',rk:'rare',ic:'lightning',dmg:17,fr:520,spd:900,count:1,spread:0.02,pierce:0,size:5,kb:60,chain:true,color:'#bcd6ff'},
 {id:'gatling',name:'Weihrauch-Gatling',rk:'rare',ic:'gatling',dmg:4.6,fr:150,frMin:55,spd:760,count:1,spread:0.12,pierce:0,size:4,kb:40,ramp:true,color:C.gold},
 {id:'lance',name:'Heilige Lanze',rk:'rare',ic:'lance',dmg:18,fr:300,spd:920,count:1,spread:0.01,pierce:3,size:6,kb:160,color:C.gold2},
 {id:'shardstorm',name:'Splittersturm',rk:'ultrarare',ic:'snow',dmg:14,fr:480,spd:680,count:5,spread:0.22,pierce:2,size:4,kb:60,slow:true,pattern:'even',color:C.chill},
 {id:'frostlance',name:'Frostpike',rk:'ultrarare',ic:'beam',dmg:22,fr:330,spd:980,count:1,spread:0.01,pierce:4,size:6,kb:120,slow:true,color:'#a8e8ff'},
 {id:'reaper',name:'Sensenwurf',rk:'epic',ic:'scythe',dmg:34,fr:560,spd:560,count:2,spread:0.16,pierce:6,size:8,kb:140,pattern:'even',color:'#cfd6d0'},
 {id:'seraph',name:'Seraphsalve',rk:'epic',ic:'wing',dmg:14,fr:300,spd:820,count:5,spread:0.5,pierce:1,size:5,kb:70,pattern:'even',color:'#ffe0a0'},
 {id:'judgement',name:'Jüngstes Gericht',rk:'legendary',ic:'beam',dmg:52,fr:520,spd:1200,count:1,spread:0,pierce:99,size:9,kb:220,verdict:0.25,color:'#fff2c0'},
 {id:'tempest',name:'Sturm der Engel',rk:'legendary',ic:'lightning',dmg:24,fr:240,spd:1000,count:3,spread:0.3,pierce:0,size:5,kb:60,chain:true,pattern:'even',color:'#cfe0ff'},
 {id:'apocalypse',name:'Apokalypse',rk:'mythic',ic:'explosion',dmg:30,fr:300,spd:720,count:3,spread:0.26,pierce:2,size:7,kb:160,explosive:true,burn:true,pattern:'even',color:C.candle},
 {id:'voidmaw',name:'Schlund der Leere',rk:'mythic',ic:'voidh',dmg:44,fr:420,spd:600,count:1,spread:0.02,pierce:99,size:11,kb:260,explosive:true,color:'#c89bff'},
 {id:'godhand',name:'Hand Gottes',rk:'godlike',ic:'hand',dmg:60,fr:150,spd:1000,count:3,spread:0.18,pierce:99,size:8,kb:200,chain:true,explosive:true,burn:true,pattern:'even',color:'#ffe9a0'},
 /* --- NEUE WAFFENTYPEN (Phase 6): Geschütze/Totems/Minen/Begleiter/Laser --- */
 {id:'sentry',   name:'Geschützturm',     rk:'rare',     ic:'gatling',   deploy:'turret',   deployMax:2,deployLife:9, deployFire:300,dmg:7, spd:720,count:1,spread:0.05,pierce:0,size:4,fr:1500,kb:40,color:C.steel},
 {id:'totem',    name:'Totem der Qual',   rk:'rare',     ic:'nova',      deploy:'totem',    deployMax:2,deployLife:11,deployFire:900,dmg:13,spd:0,  count:1,spread:0,   pierce:0,size:5,fr:1700,kb:40,novaR:96,burn:true,color:C.candle},
 {id:'minelayer',name:'Minenleger',       rk:'uncommon', ic:'explosion', deploy:'mine',     deployMax:6,deployLife:16,             dmg:22,spd:0,  count:1,spread:0,   pierce:0,size:7,fr:650, kb:0, explosive:true,color:C.blood2},
 {id:'familiar', name:'Höllenbrut',       rk:'epic',     ic:'ghost',     deploy:'companion',deployMax:2,deployLife:18,deployFire:420,dmg:10, spd:780,count:1,spread:0.06,pierce:1,size:4,fr:2200,kb:30,color:'#c89bff'},
 {id:'laser',    name:'Läuterungsstrahl', rk:'rare',     ic:'beam',      beam:true,         dmg:7, spd:780,count:1,spread:0,pierce:3,size:7,fr:150, kb:30,burn:true,color:'#ff5a6a'},
 {id:'railspike',name:'Schienennagel',    rk:'epic',     ic:'lance',     dmg:46,fr:620,spd:1300,count:1,spread:0,pierce:99,size:6,kb:160,rail:0.2,color:'#cfe0ff'},
 {id:'stormcaller',name:'Sturmrufer',     rk:'epic',     ic:'lightning', strike:true,      dmg:14,fr:300,spd:480,count:1,spread:0,pierce:0,size:5,kb:50,chain:true,color:'#9bbcff'},
 /* --- SCHRITT 7: neue Waffen für die dünnen Klassen (Seuche, Frost, Feuer) --- */
 {id:'pestflask', name:'Pestflasche',      rk:'common',  ic:'plague', dmg:4.5, fr:900, spd:420,count:1,spread:0.05,pierce:0,size:6,kb:20,life:0.55,poison:true,toxcloud:true,contagion:true,color:C.sick},
 {id:'ratcage',   name:'Rattenkäfig',      rk:'rare',    ic:'leech',  deploy:'rat',deployMax:6,deployLife:5,dmg:5,fr:2400,spd:170,count:3,spread:0,pierce:0,size:5,kb:0,poison:true,color:'#8a7a5a'},
 {id:'litany',    name:'Eisige Litanei',   rk:'uncommon',ic:'snow',   dmg:11, fr:900,spd:520,count:8,spread:0.785,pierce:1,size:5,kb:40,life:0.8,slow:true,pattern:'ring',color:C.chill},
 {id:'tears',     name:'Gefrorene Tränen', rk:'rare',    ic:'snow',   dmg:14, fr:1000,spd:400,count:1,spread:0.05,pierce:0,size:6,kb:0,life:0.6,slow:true,frostpool:true,color:'#a8e8ff'},
 {id:'firearrow', name:'Brandpfeil',       rk:'common',  ic:'bolt',   dmg:10,fr:520, spd:760,count:1,spread:0.03,pierce:0,size:4,kb:60,burn:true,ignite:true,color:C.candle},
 {id:'skullsling',name:'Schädelschleuder', rk:'uncommon',ic:'weight', dmg:15,fr:800, spd:600,count:1,spread:0.04,pierce:0,size:6,kb:80,bounce:2,color:C.bone},
 /* --- EVOLVIERTE WAFFEN (nur durch Verschmelzung, nicht im normalen Shop) --- */
 {id:'pestburst',name:'Seuchenschlund',rk:'mythic',evo:true,ic:'plague',dmg:14,fr:560,spd:520,count:7,spread:0.5,pierce:1,size:6,kb:120,puddle:true,burn:true,pattern:'even',color:C.sick},
 {id:'reckoning',name:'Vergeltung',rk:'epic',evo:true,ic:'bolt',dmg:22,fr:300,spd:980,count:1,spread:0.01,pierce:5,size:6,kb:200,chain:true,color:C.blood2},
 {id:'hellwitch',name:'Höllenhexe',rk:'epic',evo:true,ic:'witch',dmg:5,fr:70,spd:760,count:2,spread:0.14,pierce:2,size:5,kb:40,burn:true,pattern:'even',color:C.candle},
 {id:'naildriver',name:'Sturmnagler',rk:'legendary',evo:true,ic:'gatling',dmg:6,fr:55,frMin:38,spd:900,count:1,spread:0.1,pierce:1,size:4,kb:50,ramp:true,slow:true,color:C.steel},
 {id:'godsedge',name:'Götterzorn',rk:'legendary',evo:true,ic:'trinity',dmg:16,fr:360,spd:920,count:3,spread:0.22,pierce:2,size:6,kb:120,chain:true,pattern:'even',color:C.gold2},
 /* --- ENDFORMEN aus Waffe St. 10 + Reliquie (Schritt 9) --- */
 {id:'blackdeath',name:'Schwarzer Tod',rk:'mythic',evo:true,ic:'plague',dmg:12,fr:620,spd:440,count:3,spread:0.3,pierce:0,size:6,kb:20,life:0.6,poison:true,toxcloud:true,contagion:true,contagionMax:3,pattern:'even',color:'#5a7a1a'},
 {id:'bonehail',name:'Knochenhagel',rk:'legendary',evo:true,ic:'weight',dmg:22,fr:650,spd:640,count:1,spread:0.04,pierce:0,size:7,kb:100,bounce:4,bounceGrow:0.15,color:'#e8e0c8'},
 {id:'pyresalvo',name:'Scheiterhaufen-Salve',rk:'legendary',evo:true,ic:'bolt',dmg:14,fr:480,spd:780,count:3,spread:0.18,pierce:0,size:4,kb:60,burn:true,ignite:true,igniteN:2,pattern:'even',color:'#ff9a40'},
 /* --- BOSS-WAFFEN (abgespeckt, nur via Boss-Freischaltung, nicht im Shop) --- */
 {id:'bw_preach',name:'Predigtkreis',rk:'epic',evo:true,ic:'nova',dmg:14,fr:680,spd:560,count:8,spread:0.8,pierce:1,size:5,kb:60,pattern:'ring',color:C.blood2},
 {id:'bw_plague',name:'Madenbrut',rk:'epic',evo:true,ic:'plague',dmg:11,fr:600,spd:430,count:1,spread:0.05,pierce:0,size:8,kb:60,puddle:true,color:C.sick},
 {id:'bw_surgeon',name:'Skalpellfächer',rk:'epic',evo:true,ic:'spread',dmg:9,fr:500,spd:820,count:5,spread:0.32,pierce:1,size:4,kb:70,pattern:'even',slow:true,color:'#a8e8ff'},
 {id:'bw_lamb',name:'Wollgeißel',rk:'epic',evo:true,ic:'bolt',dmg:13,fr:150,spd:700,count:1,spread:0.04,pierce:1,size:5,kb:50,color:C.bone},
 {id:'bw_cross',name:'Kreuzsalve',rk:'epic',evo:true,ic:'trinity',dmg:16,fr:520,spd:760,count:5,spread:0.5,pierce:1,size:5,kb:90,pattern:'even',color:C.gold2},
];
const weaponById=id=>WEAPONS.find(w=>w.id===id);

/* ---------- WAFFENKLASSEN ----------
   Jede Waffe hat 1–2 Klassen. Ab 2/3/4/5 Waffen derselben Klasse greift Stufe 1/2/3/4 des Klassenbonus
   (gilt für alle Angriffe des Spielers). Werte sind Startwerte zum Testen. */
const CLASSES={
 pulver:   {name:'Pulver',   name_en:'Powder',    color:'#e0b25a', ic:'bullet'},
 eisen:    {name:'Eisen',    name_en:'Iron',      color:'#a8b0bc', ic:'pierce'},
 feuer:    {name:'Feuer',    name_en:'Fire',      color:'#e08a2f', ic:'flame'},
 seuche:   {name:'Seuche',   name_en:'Plague',    color:'#9bbf3a', ic:'plague'},
 frost:    {name:'Frost',    name_en:'Frost',     color:'#7fd0e6', ic:'snow'},
 blitz:    {name:'Blitz',    name_en:'Lightning', color:'#bcd6ff', ic:'lightning'},
 heilig:   {name:'Heilig',   name_en:'Holy',      color:'#ffe9a0', ic:'crown'},
 konstrukt:{name:'Konstrukt',name_en:'Construct', color:'#c89bff', ic:'gatling'},
};
const WEAPON_CLS={
 revolver:['pulver'], scatter:['pulver'], witchfire:['seuche'], nailgun:['pulver','eisen'], handcannon:['pulver'], bolt:['eisen'],
 flame:['feuer'], plague:['seuche'], trinity:['heilig'], wrath:['blitz','heilig'], gatling:['pulver'], lance:['heilig','eisen'],
 shardstorm:['frost'], frostlance:['frost','eisen'], reaper:['eisen'], seraph:['heilig'], judgement:['heilig'], tempest:['blitz'],
 apocalypse:['feuer'], voidmaw:['eisen'], godhand:['heilig','blitz'], sentry:['konstrukt','pulver'], totem:['konstrukt','feuer'],
 minelayer:['konstrukt','pulver'], familiar:['konstrukt'], laser:['feuer'], railspike:['eisen'], stormcaller:['blitz'],
 pestburst:['seuche','feuer'], reckoning:['blitz','eisen'], hellwitch:['feuer','seuche'], naildriver:['eisen','frost'], godsedge:['heilig','blitz'],
 blackdeath:['seuche'], bonehail:['eisen'], pyresalvo:['feuer'], pestflask:['seuche'], ratcage:['seuche','konstrukt'], litany:['frost'], tears:['frost'], firearrow:['feuer'], skullsling:['eisen'],
 bw_preach:['heilig'], bw_plague:['seuche'], bw_surgeon:['frost','eisen'], bw_lamb:['eisen'], bw_cross:['heilig'],
};
WEAPONS.forEach(w=>{ w.cls=WEAPON_CLS[w.id]||[]; });
/* Bonus je Stufe [0..4] */
const CLS_BONUS={
 pulver:   {fr:[0,.05,.10,.15,.25], spread:[0,.10,.20,.30,.40]},
 eisen:    {pierce:[0,1,1,2,3], kb:[0,.10,.20,.30,.40]},
 feuer:    {dur:[0,.5,1,1.5,2.5], dmg:[0,0,.10,.20,.40]},
 seuche:   {life:[0,.25,.50,.75,1.2], rad:[0,0,0,.30,.30]},
 frost:    {slow:[.45,.40,.35,.30,.25], dur:[0,.3,.6,.9,1.4]},
 blitz:    {jumps:[2,3,3,4,5], range:[0,0,20,40,60]},
 heilig:   {boss:[0,.10,.20,.30,.45], normal:[0,.05,.10,.15,.20]},
 konstrukt:{life:[0,.15,.30,.45,.70], max:[0,0,1,1,2]},
};
const clsName=c=>LANG==='en'?CLASSES[c].name_en:CLASSES[c].name;
const clsStage=(p,c)=>(p&&p.clsSt&&p.clsSt[c])||0;
const clsB=(p,c,k)=>CLS_BONUS[c][k][clsStage(p,c)];
function recalcClasses(p){ p.clsN={}; p.clsSt={};
  for(const id of p.weapons){ const w=weaponById(id); if(w) for(const c of w.cls) p.clsN[c]=(p.clsN[c]||0)+1; }
  p.clsDistinct=Object.keys(p.clsN).length;
  const pr=CHAR_PROFILE[p.charId]; if(pr&&pr.aff) p.clsN[pr.aff]=(p.clsN[pr.aff]||0)+1;   // Lieblingsklasse zählt eine Waffe mehr
  for(const c in p.clsN){ const n=p.clsN[c]; p.clsSt[c]=n>=5?4:n>=4?3:n>=3?2:n>=2?1:0; } }
function clsDesc(c,st){ const B=CLS_BONUS[c], en=LANG==='en', pc=v=>Math.round(v*100)+'%';
  switch(c){
   case 'pulver': return (en?'Fire rate +':'Feuerrate +')+pc(B.fr[st])+(en?', spread +':', Streuung +')+pc(B.spread[st]);
   case 'eisen': return (en?'Pierce +':'Durchschlag +')+B.pierce[st]+(en?', knockback +':', Rückstoß +')+pc(B.kb[st]);
   case 'feuer': return (en?'Burn +':'Brand +')+B.dur[st]+' s'+(B.dmg[st]?(en?', burn dmg +':', Brandschaden +')+pc(B.dmg[st]):'');
   case 'seuche': return (en?'Puddles last +':'Pfützen-Dauer +')+pc(B.life[st])+(B.rad[st]?(en?', radius +':', Radius +')+pc(B.rad[st]):'');
   case 'frost': return (en?'Slow ':'Verlangsamung ')+pc(1-B.slow[st])+(en?', duration +':', Dauer +')+B.dur[st]+' s';
   case 'blitz': return (en?'Chain jumps ':'Kettensprünge ')+B.jumps[st]+(B.range[st]?(en?', range +':', Reichweite +')+B.range[st]+' px':'');
   case 'heilig': return (en?'vs. bosses/elites +':'gegen Bosse/Elite +')+pc(B.boss[st])+(en?', vs. others −':', gegen andere −')+pc(B.normal[st]);
   case 'konstrukt': return (en?'Lifetime +':'Lebensdauer +')+pc(B.life[st])+(B.max[st]?(en?', max +':', Maximum +')+B.max[st]:'');
  } return ''; }
const ROMAN=['','I','II','III','IV'];
function clsChip(c,txt){ const k=CLASSES[c]; return '<span class="cls-chip" style="color:'+k.color+';border-color:'+k.color+'55">'+svgIcon(k.ic,k.color,11)+' '+txt+'</span>'; }
const RARITY_PRICE=[28,52,90,150,240,400,650,1100];
const WEAPON_CAP=5, WEAPON_MAX_LEVEL=10, EVO_LEVEL_REQ=5;
let SHOP_CLS_BIAS=0.25;   // Chance je Shop-Angebot, eine Waffe passend zu getragenen Klassen zu ziehen
const WEAPON_EVOS=[
 {a:'scatter',b:'plague',result:'pestburst'},
 {a:'revolver',b:'bolt',result:'reckoning'},
 {a:'witchfire',b:'flame',result:'hellwitch'},
 {a:'nailgun',b:'gatling',result:'naildriver'},
 {a:'trinity',b:'wrath',result:'godsedge'},
 /* Waffe auf Stufe 10 + Reliquie (Schritt 9) */
 {a:'pestflask',relic:'urn',result:'blackdeath'},
 {a:'skullsling',relic:'feather',result:'bonehail'},
 {a:'firearrow',relic:'bell',result:'pyresalvo'},
];
/* ---------- RELIQUIEN: nach jeder Boss-Station 1 aus 3, je Spieler, einzigartig im Lauf ---------- */
const RELICS=[
 {id:'hammer', name:'Hammer des Zimmermanns', ic:'nail',     desc:'Treffer: 10% Chance auf +50% Schaden und 0,5 s Festnageln'},
 {id:'bell',   name:'Totenglocke',            ic:'nova',     desc:'Kill: Schallwelle (90 px) mit 30% des überschüssigen Schadens'},
 {id:'urn',    name:'Aschenurne',             ic:'explosion',desc:'Kill eines brennenden Gegners: Explosion (60 px) mit 40% des letzten Treffers'},
 {id:'feather',name:'Krähenfeder',            ic:'wing',     desc:'Kritischer Treffer: nächste Salve derselben Waffe +2 Durchschlag'},
 {id:'mblood', name:'Märtyrerblut',           ic:'leech',    desc:'Erlittener Treffer: 2 s lang +30% Schaden'},
 {id:'confess',name:'Beichtstuhl',            ic:'shield',   desc:'Welle ohne Treffer: +5 Gold und +2 Max-LP'},
 {id:'lance',  name:'Lanze des Wächters',     ic:'lance',    desc:'Bosse beginnen mit 10% weniger Leben'},
 {id:'dice',   name:'Würfel des Soldaten',    ic:'star',     desc:'Erstes Neuwürfeln pro Waffenkammer gratis'},
 {id:'coffer', name:'Opferstock',             ic:'crown',    desc:'Wellenende: +5% Zinsen auf dein Gold (max. 20)'},
 {id:'key',    name:'Schlüssel des Türhüters',ic:'eye',      desc:'Waffenkammer: ein 4. verdecktes Angebot zum halben Preis'},
];
const relicById=id=>RELICS.find(r=>r.id===id);
const hasRelic=(p,id)=>!!(p&&p.relics&&p.relics[id]);
const priceMul=()=>(player&&player.priceMul)||1;
function weaponPrice(w){ return Math.round(RARITY_PRICE[rarRank(w.rk)]*(1+G.level*0.03)*priceMul()); }
const rerollCost=()=>player&&player.freeReroll?0:Math.round((15+G.level*2)*priceMul());
function weaponLevel(id){ return (player.wLevel[id]||0)+1; }
function upgradePrice(w){ const lvl=weaponLevel(w.id); return Math.round(RARITY_PRICE[rarRank(w.rk)]*0.6*(1+lvl*0.28)*(1+G.level*0.02)*priceMul()); }
function availableWeaponEvos(){
  if(!player) return [];
  return WEAPON_EVOS.filter(r=> player.weapons.includes(r.a) && !player.weapons.includes(r.result) && (r.relic
    ? weaponLevel(r.a)>=WEAPON_MAX_LEVEL && hasRelic(player,r.relic)                 // Waffe St. 10 + Reliquie
    : player.weapons.includes(r.b) && weaponLevel(r.a)>=EVO_LEVEL_REQ && weaponLevel(r.b)>=EVO_LEVEL_REQ));
}

/* ---------- CHARAKTER-UPGRADES (Stufen, mit XP/Level) ---------- */
const UPGRADE_DEFS=[
 {id:'might',name:'Stärke',ic:'sword',desc:r=>'+'+(8+r*7)+'% Schaden',apply:(p,r)=>p.dmgMult+=(8+r*7)/100},
 {id:'vitality',name:'Lebenskraft',ic:'heart',desc:r=>'+'+(16+r*11)+' Max-LP',apply:(p,r)=>{const v=16+r*11;p.maxHP+=v;p.hp+=v;}},
 {id:'bulwark',name:'Schild',ic:'shield',desc:r=>'+'+(1+r)+' Rüstung',apply:(p,r)=>p.armor+=1+r},
 {id:'haste',name:'Hast',ic:'clock',desc:r=>'+'+(6+r*4)+'% Feuerrate',apply:(p,r)=>p.frMult*=1-(6+r*4)/100},
 {id:'swift',name:'Tempo',ic:'boot',desc:r=>'+'+(6+r*4)+'% Tempo',apply:(p,r)=>p.speed*=1+(6+r*4)/100},
 {id:'pierce',name:'Durchschlag',ic:'pierce',desc:r=>'+'+(1+Math.floor(r/2))+' Durchschlag',apply:(p,r)=>p.pierce+=1+Math.floor(r/2)},
 {id:'wrathstat',name:'Zorn',ic:'eye',desc:r=>'+'+(6+r*3)+'% Krit-Chance',apply:(p,r)=>p.crit+=(6+r*3)/100},
 {id:'leech',name:'Blutzehrung',ic:'leech',desc:r=>'+'+(1+r)+' LP / Tötung',apply:(p,r)=>p.lifesteal+=1+r},
 {id:'thorns',name:'Dornenkrone',ic:'crown',desc:r=>'+'+(10+r*7)+' Dornen',apply:(p,r)=>p.thorns+=10+r*7},
 {id:'projspd',name:'Gesegnetes Pulver',ic:'arrow',desc:r=>'+'+(12+r*6)+'% Projektil-Tempo',apply:(p,r)=>p.projSpeed+=(12+r*6)/100},
 {id:'projsize',name:'Schweres Blei',ic:'weight',desc:r=>'+'+(12+r*6)+'% Projektilgröße',apply:(p,r)=>p.projSize+=(12+r*6)/100},
 {id:'multi',name:'Vielfache Sünde',ic:'multi',minRank:3,desc:r=>'+1 Projektil je Waffe',apply:(p,r)=>p.multishot+=1},
 {id:'critmult',name:'Auge des Zorns',ic:'eye',minRank:3,desc:r=>'Krit-Schaden +'+(0.3+r*0.15).toFixed(2)+'×',apply:(p,r)=>p.critMult+=0.3+r*0.15},
 {id:'burn',name:'Pestodem',ic:'flame',minRank:2,desc:r=>'Schüsse entzünden Gegner',apply:(p,r)=>{p.burn=true;p.dmgMult+=0.05*r;}},
 {id:'slow',name:'Eiserne Gnade',ic:'snow',minRank:1,desc:r=>'Schüsse verlangsamen',apply:(p,r)=>{p.slow=true;}},
 {id:'explosive',name:'Höllenfeuer',ic:'explosion',minRank:4,desc:r=>'Schüsse explodieren',apply:(p,r)=>{p.explosive=true;}},
 /* --- Tausch-Gaben (Schritt 8): Vorteil mit festem Nachteil, Seltenheit wirkt nicht, je 1× pro Lauf --- */
 {id:'t_belt',  name:'Bußgürtel',      ic:'sword', trade:true,max:1,up:'+15% Schaden',down:'−10 Max-LP',apply:p=>{p.dmgMult+=0.15;p.maxHP=Math.max(1,p.maxHP-10);}},
 {id:'t_lead',  name:'Bleischuhe',     ic:'boot',  trade:true,max:1,up:'+5 Rüstung',down:'−12% Tempo',apply:p=>{p.armor+=5;p.speed*=0.88;}},
 {id:'t_staff', name:'Pilgerstab',     ic:'arrow', trade:true,max:1,up:'+10% Tempo',down:'−3 Rüstung',apply:p=>{p.speed*=1.10;p.armor-=3;}},
 {id:'t_chain', name:'Rostige Kette',  ic:'weight',trade:true,max:1,up:'+30% Rückstoß',down:'−8% Feuerrate',apply:p=>{p.kbMult*=1.3;p.frMult*=1.08;}},
 {id:'t_skull', name:'Totenschädel',   ic:'ghost', trade:true,max:1,up:'+1% Schaden je 25 Kills im Lauf (max. 40%)',down:'−10 Max-LP',apply:p=>{p.skull=true;p.maxHP=Math.max(1,p.maxHP-10);}},
 {id:'t_hood',  name:'Schwarze Kapuze', ic:'eye',   trade:true,max:1,up:'+10% Krit-Chance',down:'−20% Sammelradius',apply:p=>{p.crit+=0.10;p.magnet*=0.8;}},
 {id:'t_purse', name:'Almosenbeutel',  ic:'crown', trade:true,max:1,up:'+30% Sammelradius',down:'−5% Schaden',apply:p=>{p.magnet*=1.3;p.dmgMult-=0.05;}},
 {id:'t_letter',name:'Ablassbrief',    ic:'star',  trade:true,max:1,up:'+25% Gold',down:'Shop-Preise +10%',apply:p=>{p.goldMult+=0.25;p.priceMul*=1.10;}},
 /* --- Geschoss-Modifikatoren (Schritt 6): ändern das Geschoss statt einer Zahl, höchstens 1× pro Lauf --- */
 {id:'m_pitch',name:'Pechfass',ic:'flame',minRank:1,max:1,mod:'pitch',desc:r=>'Einschläge hinterlassen 1,5 s eine Brandpfütze (25% Schaden/s)',apply:p=>p.fxMods.push('pitch')},
 {id:'m_rico',name:'Querschläger',ic:'arrow',minRank:2,max:1,mod:'ricochet',desc:r=>'Geschosse prallen 1× von Wänden und Hindernissen ab',apply:p=>p.fxMods.push('ricochet')},
 {id:'m_ghost',name:'Geisterhand',ic:'ghost',minRank:2,max:1,mod:'ghost',desc:r=>'Geschosse fliegen durch Hindernisse · −15% Schaden',apply:p=>p.fxMods.push('ghost')},
 {id:'m_heavy',name:'Schwere Kugeln',ic:'weight',minRank:2,max:1,mod:'heavy',desc:r=>'Größer & langsamer · nah +60% Schaden, ab 600 px −30%',apply:p=>p.fxMods.push('heavy')},
 {id:'m_split',name:'Splitterknochen',ic:'spread',minRank:4,max:1,mod:'split',desc:r=>'Treffer zersplittern in 3 Splitter (je 30% Schaden, erben Brand & Frost)',apply:p=>p.fxMods.push('split')},
];
const upDefById=id=>UPGRADE_DEFS.find(u=>u.id===id);

/* ---------- FÄHIGKEITEN (Lvl 10/20/30/40/50, charakter-spezifisch) ---------- */
const ABILITIES=[
 {id:'orbital',name:'Heiliger Reigen',ic:'orbit',desc:r=>(2+Math.floor(r*0.7))+' kreisende Klingen',apply:(p,r)=>{p.orbitN=Math.max(p.orbitN,0)+ (p.orbitN?1:(2+Math.floor(r*0.7)));p.orbitDmg=14+r*9+G.level*0.6;p.orbitR=46;}},
 {id:'nova',name:'Zornnova',ic:'nova',desc:r=>'Stoßwelle alle '+(3-r*0.18).toFixed(1)+'s',apply:(p,r)=>{p.novaDmg=24+r*16+G.level;p.novaCd=Math.max(1.4,3-r*0.18);p.novaR=120+r*10;p.novaT=p.novaCd;p.novaColor=C.gold2;}},
 {id:'aegis',name:'Aegis',ic:'aegis',desc:r=>'Regenerierender Schild '+(40+r*30),apply:(p,r)=>{p.shieldMax+=40+r*30;p.shield=p.shieldMax;p.shieldRegT=2;}},
 {id:'exec',name:'Richtspruch',ic:'scythe',desc:r=>'Tötet Gegner unter '+(8+r*3)+'% LP',apply:(p,r)=>{p.execPct=Math.max(p.execPct,(8+r*3)/100);}},
 {id:'frenzy',name:'Raserei',ic:'frenzy',desc:r=>'Bei <35% LP: +'+(40+r*20)+'% Tempo & Schaden',apply:(p,r)=>{p.frenzy=true;p.frenzyPow=(40+r*20)/100;}},
 {id:'revenant',name:'Wiedergänger',ic:'wing',desc:r=>'Auferstehung ('+(1+Math.floor(r/3))+'×)',apply:(p,r)=>{p.revive+=1+Math.floor(r/3);}},
 {id:'plagueaura',name:'Pestaura',ic:'plague',desc:r=>'Giftaura '+(10+r*8)+' SpS',apply:(p,r)=>{p.auraDps+=10+r*8+G.level*0.3;p.auraR=Math.max(p.auraR,74);}},
 {id:'juggernaut',name:'Koloss',ic:'shield',desc:r=>'+'+(60+r*30)+' LP & +'+(2+r)+' Rüstung',apply:(p,r)=>{const v=60+r*30;p.maxHP+=v;p.hp+=v;p.armor+=2+r;}},
 {id:'soulharvest',name:'Seelenernte',ic:'ghost',desc:r=>'+'+(3+r)+' LP/Tötung & +Gold',apply:(p,r)=>{p.lifesteal+=3+r;p.goldMult+=0.3+r*0.1;}},
 {id:'overload',name:'Überladung',ic:'lightning',desc:r=>'+'+(25+r*15)+'% Schaden & +1 Projektil',apply:(p,r)=>{p.dmgMult+=(25+r*15)/100;p.multishot+=1;}},
 {id:'thornmantle',name:'Dornenmantel',ic:'crown',desc:r=>'+'+(30+r*20)+' Dornen & +'+(1+r)+' Rüstung',apply:(p,r)=>{p.thorns+=30+r*20;p.armor+=1+r;}},
 {id:'volley',name:'Salve',ic:'multi',desc:r=>'+2 Projektile & +'+(10+r*5)+'% Projektil-Tempo',apply:(p,r)=>{p.multishot+=2;p.projSpeed+=(10+r*5)/100;}},
 {id:'bloodlust',name:'Blutrausch',ic:'leech',desc:r=>'+'+(3+r)+' LP/Tötung & +8% Krit',apply:(p,r)=>{p.lifesteal+=3+r;p.crit+=0.08;}},
 {id:'critstorm',name:'Klingensturm',ic:'eye',desc:r=>'+'+(15+r*3)+'% Krit & Krit-Schaden +'+(0.5+r*0.1).toFixed(1)+'×',apply:(p,r)=>{p.crit+=(15+r*3)/100;p.critMult+=0.5+r*0.1;}},
 {id:'inferno',name:'Inferno',ic:'explosion',desc:r=>'Schüsse brennen & explodieren · +'+(15+r*3)+'% Schaden',apply:(p,r)=>{p.burn=true;p.explosive=true;p.dmgMult+=(15+r*3)/100;}},
 {id:'guardianorbit',name:'Wächterklingen',ic:'orbit',desc:r=>(3+Math.floor(r*0.5))+' kreisende Klingen',apply:(p,r)=>{p.orbitN=(p.orbitN||0)+(p.orbitN?2:(3+Math.floor(r*0.5)));p.orbitDmg=Math.max(p.orbitDmg,20+r*10+G.level);p.orbitR=Math.max(p.orbitR,58);}},
 /* --- EVOLVIERTE FÄHIGKEITEN (nur durch Verschmelzung) --- */
 {id:'orbnova',name:'Heiliger Orkan',ic:'nova',evo:true,desc:r=>'Klingenwirbel + verstärkte Nova',apply:(p,r)=>{p.orbitN+=4;p.orbitDmg=Math.max(p.orbitDmg,40+G.level);p.orbitR=Math.max(p.orbitR,54);p.novaDmg=Math.max(p.novaDmg*1.3,60+G.level);p.novaCd=1.2;p.novaR=Math.max(p.novaR,165);}},
 {id:'berserkguard',name:'Blutwächter',ic:'aegis',evo:true,desc:r=>'Großer Schild + dauerhafte Raserei',apply:(p,r)=>{p.shieldMax+=130;p.shield=p.shieldMax;p.frenzy=true;p.frenzyPow=Math.max(p.frenzyPow,0.8);p.armor+=4;}},
 {id:'reapersoul',name:'Seelenschnitter',ic:'scythe',evo:true,desc:r=>'Richtspruch + Seelenernte entfesselt',apply:(p,r)=>{p.execPct=Math.max(p.execPct,0.24);p.lifesteal+=8;p.goldMult+=0.6;}},
];
const abById=id=>ABILITIES.find(a=>a.id===id);
const ABILITY_EVOS=[
 {a:'orbital',b:'nova',result:'orbnova'},
 {a:'aegis',b:'frenzy',result:'berserkguard'},
 {a:'exec',b:'soulharvest',result:'reapersoul'},
];
const CHAR_ABILITIES={
 penitent:['orbital','nova','aegis','exec','frenzy','overload','critstorm','volley','bloodlust','guardianorbit'],
 executioner:['aegis','juggernaut','revenant','nova','exec','overload','thornmantle','guardianorbit'],
 heretic:['orbital','nova','exec','frenzy','overload','soulharvest','critstorm','inferno','volley'],
 plaguepriest:['plagueaura','nova','exec','soulharvest','orbital','frenzy','inferno','bloodlust'],
 crusader:['aegis','frenzy','juggernaut','nova','exec','guardianorbit','thornmantle','revenant'],
 flagellant:['frenzy','bloodlust','thornmantle','critstorm','volley','overload','aegis','exec'],
 inquisitor:['exec','soulharvest','critstorm','inferno','nova','volley','overload'],
 martyr:['frenzy','aegis','revenant','bloodlust','critstorm','orbital','nova','overload'],
 saint:['orbital','nova','overload','critstorm','volley','inferno','aegis','guardianorbit'],
 gunslinger:['volley','critstorm','overload','frenzy','aegis','bloodlust','exec'],
 pyre:['inferno','plagueaura','nova','orbital','frenzy','soulharvest','exec'],
 preacher_c:['nova','orbital','guardianorbit','aegis','exec','soulharvest','overload'],
 maggot_c:['plagueaura','soulharvest','exec','juggernaut','inferno','bloodlust','nova'],
 surgeon_c:['critstorm','exec','soulharvest','volley','frenzy','aegis'],
 lamb_c:['frenzy','aegis','bloodlust','volley','critstorm','orbital','nova','revenant'],
 crucified_c:['revenant','aegis','frenzy','nova','orbital','juggernaut','guardianorbit','overload'],
};
/* ---------- CHARAKTER-PROFILE (wie Brotato: jede Figur hat eine Spielweise) ----------
   aff  = Lieblingsklasse (zählt eine Waffe mehr für den Klassenbonus, Shop bietet sie öfter an)
   wb   = Waffenboni nach Klasse: {klasse:{dmg,cd,shots}}; '*' gilt für Waffen ohne eine der genannten Klassen.
          dmg +0.25 = +25% Schaden, cd −0.1 = 10% schnellere Feuerrate, shots = zusätzliche Geschosse
   perk = Sonderregel (siehe charDynMul/charHitMul und makePlayer), stats = feste Werte beim Start
   pros/cons = Text für die Charakterwahl [de, en] */
const CHAR_PROFILE={
 penitent:{perk:'allround',
   pros:[['+6% Schaden je verschiedener Waffenklasse','+6% damage per different weapon class']], cons:[]},
 executioner:{aff:'pulver',perk:'close',
   pros:[['+35% Schaden auf Gegner in deiner Nähe','+35% damage to nearby enemies']], cons:[['−25% Schaden auf große Entfernung','−25% damage at long range']]},
 heretic:{aff:'seuche',wb:{feuer:{dmg:.25},seuche:{dmg:.25},frost:{dmg:.25},blitz:{dmg:.25},pulver:{dmg:-.3},eisen:{dmg:-.3}},
   pros:[['Feuer, Seuche, Frost, Blitz: +25% Schaden','Fire, Plague, Frost, Lightning: +25% damage']], cons:[['Pulver, Eisen: −30% Schaden','Powder, Iron: −30% damage']]},
 plaguepriest:{aff:'seuche',wb:{seuche:{dmg:.25},pulver:{dmg:-.2}},stats:{puddleMul:1.5},
   pros:[['Seuche: +25% Schaden','Plague: +25% damage'],['Pfützen und Wolken halten 50% länger','Puddles and clouds last 50% longer']], cons:[['Pulver: −20% Schaden','Powder: −20% damage']]},
 crusader:{aff:'pulver',wb:{pulver:{dmg:.2},'*':{cd:.1}},stats:{kbMult:1.5},
   pros:[['Pulver: +20% Schaden','Powder: +20% damage'],['+50% Rückstoß','+50% knockback']], cons:[['Andere Waffen feuern 10% langsamer','Other weapons fire 10% slower']]},
 flagellant:{aff:'eisen',heal:0.7,wb:{eisen:{dmg:.2}},perk:'scourge',
   pros:[['Eisen: +20% Schaden','Iron: +20% damage'],['Je 1% fehlender LP +0,6% Schaden','+0.6% damage per 1% missing HP']], cons:[['Heilung −30%','Healing −30%']]},
 inquisitor:{aff:'heilig',wb:{heilig:{dmg:.25}},perk:'hunter',stats:{weaponCap:4},
   pros:[['Heilig: +25% Schaden','Holy: +25% damage'],['+30% Schaden gegen Elite und Bosse','+30% damage to elites and bosses']], cons:[['Nur 4 Waffenplätze','Only 4 weapon slots']]},
 martyr:{aff:'heilig',hpMul:0.85,perk:'zeal',
   pros:[['Unter 50% LP: +35% Schaden und Feuerrate','Below 50% HP: +35% damage and fire rate']], cons:[['Max-LP −15%','Max HP −15%']]},
 saint:{aff:'blitz',wb:{blitz:{dmg:.3},'*':{dmg:-.2}},stats:{chainPlus:1},
   pros:[['Blitz: +30% Schaden','Lightning: +30% damage'],['Kettenblitze springen einmal weiter','Chain lightning jumps once more']], cons:[['Alle anderen Waffen: −20% Schaden','All other weapons: −20% damage']]},
 gunslinger:{aff:'pulver',wb:{pulver:{shots:1,cd:-.1},'*':{dmg:-.25}},
   pros:[['Pulver: +1 Geschoss, 10% schneller','Powder: +1 projectile, 10% faster']], cons:[['Alle anderen Waffen: −25% Schaden','All other weapons: −25% damage']]},
 pyre:{aff:'feuer',wb:{feuer:{dmg:.25},frost:{dmg:-.5}},perk:'kindle',stats:{burnPlus:1},
   pros:[['Feuer: +25% Schaden, Brand +1 s','Fire: +25% damage, burn +1 s'],['Brennende Gegner nehmen +20% Schaden','Burning enemies take +20% damage']], cons:[['Frost: −50% Schaden','Frost: −50% damage']]},
 preacher_c:{aff:'heilig',perk:'choir',stats:{dmgAdd:-.15},
   pros:[['Waffen mit 3+ Geschossen: +1 Geschoss','Weapons with 3+ projectiles: +1 projectile']], cons:[['−15% Schaden','−15% damage']]},
 maggot_c:{aff:'seuche',wb:{seuche:{dmg:.2}},stats:{puddleHeal:2},
   pros:[['Seuche: +20% Schaden','Plague: +20% damage'],['In eigenen Pfützen: +2 LP/s','In your own puddles: +2 HP/s']], cons:[['Langsam','Slow']]},
 surgeon_c:{aff:'frost',hpMul:0.9,stats:{critAdd:.12,critMultAdd:.5,critSlow:true},
   pros:[['+12% Krit-Chance, +50% Krit-Schaden','+12% crit chance, +50% crit damage'],['Kritische Treffer verlangsamen','Critical hits slow']], cons:[['Max-LP −10%','Max HP −10%']]},
 lamb_c:{aff:'eisen',perk:'charge',
   pros:[['In Bewegung: +20% Schaden','While moving: +20% damage']], cons:[['Im Stehen: −20% Schaden','Standing still: −20% damage']]},
 crucified_c:{aff:'heilig',heal:0.75,wb:{heilig:{dmg:.15}},stats:{revive:1},
   pros:[['Steht einmal pro Lauf wieder auf','Rises once per run'],['Heilig: +15% Schaden','Holy: +15% damage']], cons:[['Heilung −25%','Healing −25%']]},
};
const charProf=p=>(p&&CHAR_PROFILE[p.charId])||null;
/* Klassenbonus der Figur für eine Waffe: k = 'dmg' | 'cd' (additiv) | 'shots' */
function charWB(p,w,k){ const pr=charProf(p); if(!pr||!pr.wb||!w)return 0; let v=0, hit=false;
  for(const c in pr.wb){ if(c!=='*'&&w.cls.includes(c)){ hit=true; v+=pr.wb[c][k]||0; } }
  if(!hit&&pr.wb['*']) v+=pr.wb['*'][k]||0; return v; }
/* Schadensfaktor der Figur beim Abfeuern (Klasse + zustandsabhängige Sonderregeln) */
function charDmgMul(p,w){ const pr=charProf(p); if(!pr)return 1; let m=Math.max(0.1,1+charWB(p,w,'dmg'));
  switch(pr.perk){
   case 'allround': m*=1+0.06*(p.clsDistinct||0); break;
   case 'scourge': m*=1+0.6*clamp(1-p.hp/p.maxHP,0,1); break;
   case 'zeal': if(p.hp<p.maxHP*0.5) m*=1.35; break;
   case 'charge': m*=p.moving?1.2:0.8; break; }
  return m; }
/* Feuerrate (Faktor auf die Abklingzeit) */
function charCdMul(p,w){ const pr=charProf(p); if(!pr)return 1; let m=1+charWB(p,w,'cd'); if(pr.perk==='zeal'&&p.hp<p.maxHP*0.5) m/=1.35; return Math.max(0.2,m); }
function charShots(p,w){ const pr=charProf(p); if(!pr)return 0; return charWB(p,w,'shots')+(pr.perk==='choir'&&w.count>=3?1:0); }
/* Faktor beim Treffer, abhängig vom Ziel (nur Waffenschaden) */
function charHitMul(o,e){ const pr=charProf(o); if(!pr||!pr.perk)return 1;
  switch(pr.perk){
   case 'close': { const d=Math.hypot(e.x-o.x,e.y-o.y); return d<170?1.35:d>320?0.75:1; }
   case 'hunter': return (e.isBoss||e.elite)?1.3:1;
   case 'kindle': return e.burnT>0?1.2:1; }
  return 1; }
const ABILITY_LEVELS=[10,20,30,40,50];

/* ---------- CHARACTERS (Balancing angepasst) ---------- */
const CHARS=[
 {id:'penitent',name:'Der Büßer',role:'Ausgewogen',weapon:'revolver',lore:'Trägt die Schuld eines ganzen Dorfes. Ein verlässlicher Revolver, ein ruhiger Schritt.',hp:110,speed:1.0,dmg:1.0,fr:1.0},
 {id:'executioner',name:'Der Henker',role:'Panzer',weapon:'scatter',lore:'Hat tausend Seelen zur Ruhe gebracht. Langsam, doch kaum etwas wirft ihn um.',hp:165,speed:0.8,dmg:0.95,fr:1.0,armor:3},
 {id:'heretic',name:'Die Ketzerin',role:'Glaskanone',weapon:'witchfire',lore:'Sprach mit Dingen jenseits der Mauer. Tödlich — aber zerbrechlich wie Glas.',hp:52,speed:1.16,dmg:1.26,fr:0.92},
 {id:'plaguepriest',name:'Der Pestpriester',role:'Seuche',weapon:'plague',lore:'Predigt das Wort der Fäulnis. Seine Wunden brennen lange, nachdem er sie schlug.',hp:100,speed:0.95,dmg:1.0,fr:1.0,burn:true},
 /* --- FREISCHALTBARE CHARAKTERE (eigene Figuren in sprites.js/HERO_ART; skin = Rückfall-Design) --- */
 {id:'crusader',name:'Der Kreuzritter',role:'Bollwerk',weapon:'handcannon',lore:'Trug das Banner durch zehn Schlachten und ließ es nie sinken.',hp:130,speed:1.0,dmg:1.05,fr:1.0,armor:1,skin:'penitent',unlock:{level:10}},
 {id:'flagellant',name:'Der Flagellant',role:'Panzer',weapon:'nailgun',lore:'Jede Wunde, die er austeilt, hat er sich erst selbst geschlagen.',hp:155,speed:0.9,dmg:1.0,fr:1.1,skin:'executioner',unlock:{level:20}},
 {id:'inquisitor',name:'Der Inquisitor',role:'Jäger',weapon:'trinity',lore:'Findet die Ketzerei in jedem Herzen — und brennt sie heraus.',hp:70,speed:1.1,dmg:1.3,fr:0.95,skin:'heretic',unlock:{level:30}},
 {id:'martyr',name:'Die Märtyrerin',role:'Berserker',weapon:'lance',lore:'Je näher dem Tod, desto heller ihr Zorn.',hp:85,speed:1.08,dmg:1.2,fr:1.0,skin:'penitent',unlock:{level:40}},
 {id:'saint',name:'Der Geheiligte',role:'Endzeit',weapon:'wrath',lore:'Hat den Gipfel gesehen und ist zurückgekehrt, um ihn niederzubrennen.',hp:120,speed:1.05,dmg:1.25,fr:0.95,skin:'heretic',unlock:{level:50}},
 {id:'gunslinger',name:'Der Revolverheld',role:'Schütze',weapon:'revolver',lore:'Tausend Tote tragen seine Kugeln. Er zählt nicht mehr mit.',hp:100,speed:1.1,dmg:1.1,fr:0.92,skin:'penitent',unlock:{weapon:'revolver',kills:1000}},
 {id:'pyre',name:'Die Scheiterhexe',role:'Brand',weapon:'flame',lore:'Aus tausend Funken ward ein Inferno.',hp:80,speed:1.05,dmg:1.15,fr:1.0,burn:true,skin:'heretic',unlock:{weapon:'witchfire',kills:1000}},
 {id:'preacher_c',name:'Predigt-Echo',role:'Boss',weapon:'bw_preach',lore:'Was vom Grabenpredigter blieb, predigt nun für dich.',hp:130,speed:0.95,dmg:1.1,skin:'executioner',unlock:{boss:'preacher'}},
 {id:'maggot_c',name:'Madenfürst',role:'Boss',weapon:'bw_plague',lore:'Ein Splitter von Made Magna, der deinem Willen folgt.',hp:140,speed:0.9,dmg:1.05,burn:true,skin:'plaguepriest',unlock:{boss:'maggot'}},
 {id:'surgeon_c',name:'Chirurgen-Schemen',role:'Boss',weapon:'bw_surgeon',lore:'Die Skalpelle schneiden jetzt für deine Sache.',hp:95,speed:1.12,dmg:1.2,skin:'heretic',unlock:{boss:'surgeon'}},
 {id:'lamb_c',name:'Schlachtlamm',role:'Boss',weapon:'bw_lamb',lore:'Ein Lamm, das gelernt hat, zurückzuschlagen.',hp:110,speed:1.15,dmg:1.1,skin:'executioner',unlock:{boss:'lamb'}},
 {id:'crucified_c',name:'Gekreuzigtes Echo',role:'Boss',weapon:'bw_cross',lore:'Der erste Gekreuzigte, herabgestiegen an deiner Seite.',hp:135,speed:1.0,dmg:1.2,skin:'penitent',unlock:{boss:'crucified'}},
];
const charById=id=>CHARS.find(c=>c.id===id)||CHARS[0];
const BASE_CHARS=['penitent','executioner','heretic','plaguepriest'];

const REGIONS=[
 {name:'Die Gräben',floor:'#171a14',tint:'#2a2e1f'},
 {name:'Die Katakomben',floor:'#15131a',tint:'#26222e'},
 {name:'Das Lazarett',floor:'#1a1512',tint:'#2e231d'},
 {name:'Der Schlachthof',floor:'#1c1210',tint:'#34201c'},
 {name:'Golgotha',floor:'#120f12',tint:'#2a1c24'},
];
const BOSS_NAMES=['Der Grabenpredigter','Made Magna','Der Verschollene Chirurg','Das Schlächterlamm','Erster Gekreuzigter','Choral der Asche','Mutter der Seuche','Der Eiserne Heilige','Schlund von Golgotha','Der Letzte Gekreuzigte'];
const BOSS_KINDS=['preacher','maggot','surgeon','lamb','crucified','choir','mother','ironsaint','maw','lastcross'];

/* ---------- SCHWIERIGKEITSGRADE ---------- *//* je härter: mehr Gegner, mehr LP, mehr Schaden, schnelleres Feuer */
const DIFFICULTIES=[
 {id:'veryeasy', name:'Sehr leicht', name_en:'Very Easy', color:'#5fbf52', enemyCount:0.65, enemyHp:0.6, enemyDmg:0.6, fireRate:0.7,  curseChance:0.04, reward:0.8},
 {id:'easy',     name:'Leicht',      name_en:'Easy',      color:'#9bbf3a', enemyCount:0.82, enemyHp:0.8, enemyDmg:0.8, fireRate:0.85, curseChance:0.07, reward:0.9},
 {id:'medium',   name:'Mittel',      name_en:'Medium',    color:'#e0b25a', enemyCount:1.0,  enemyHp:1.0, enemyDmg:1.0, fireRate:1.0,  curseChance:0.10, reward:1.0},
 {id:'hard',     name:'Schwer',      name_en:'Hard',      color:'#e08a2f', enemyCount:1.3,  enemyHp:1.35,enemyDmg:1.25,fireRate:1.2,  curseChance:0.14, reward:1.3},
 {id:'veryhard', name:'Sehr schwer', name_en:'Very Hard', color:'#c01f24', enemyCount:1.65, enemyHp:1.8, enemyDmg:1.6, fireRate:1.45, curseChance:0.18, reward:1.6},
 {id:'heresy',   name:'Heresy',      name_en:'Heresy',    color:'#b15fe0', enemyCount:2.25, enemyHp:2.6, enemyDmg:2.1, fireRate:1.8,  curseChance:0.32, reward:2.1},
 {id:'custom',   name:'Eigene',      name_en:'Custom',    color:'#7fd0e6', enemyCount:1.0,  enemyHp:1.0, enemyDmg:1.0, fireRate:1.0,  curseChance:0,    reward:1.0, custom:true},
];
const diffById=id=>DIFFICULTIES.find(d=>d.id===id)||DIFFICULTIES[2];
/* stapelbare Modifikatoren (zusätzlich zum Schwierigkeitsgrad) */
const MODIFIERS=[
 {id:'haste',       name:'Hetzjagd',    name_en:'Haste',        enemySpeed:1.5, playerSpeed:1.2, reward:1.25},
 {id:'hardcore',    name:'Hardcore',    name_en:'Hardcore',     enemyHp:1.5, enemyDmg:1.5, enemyCount:1.3, fireRate:1.3, reward:1.6},
 {id:'bigmap',      name:'Weite Welt',  name_en:'Big Map',      mapScale:1.45, enemyCount:1.25, reward:1.15},
 {id:'moreenemies', name:'Überzahl',    name_en:'More Enemies', enemyCount:1.7, reward:1.3},
];
const modName=m=>LANG==='en'?m.name_en:m.name;
function diffMul(key){ return (G.diff?(G.diff[key]||1):1)*((G.modMul&&G.modMul[key])||1); }

/* ---------- VERFLUCHTE UPGRADES (Macht mit Preis) ---------- */
const CURSE_DEFS=[
 {id:'bloodpact',name:'Blutpakt',ic:'leech',up:'+70% Schaden',down:'−30% Max-LP',apply:p=>{p.dmgMult+=0.7;p.maxHP=Math.round(p.maxHP*0.7);p.hp=Math.min(p.hp,p.maxHP);}},
 {id:'glasssin',name:'Sünde aus Glas',ic:'eye',up:'+25% Krit & +0.6× Krit-Schaden',down:'−25% Max-LP',apply:p=>{p.crit+=0.25;p.critMult+=0.6;p.maxHP=Math.round(p.maxHP*0.75);p.hp=Math.min(p.hp,p.maxHP);}},
 {id:'swarmcall',name:'Ruf der Verdammten',ic:'plague',up:'+55% Schaden',down:'+35% Gegner-Spawn',apply:p=>{p.dmgMult+=0.55;G.curseSpawn+=0.35;}},
 {id:'forbidden',name:'Verbotenes Wissen',ic:'eye',up:'+1 Projektil & +30% Schaden',down:'Gegner feuern +30%',apply:p=>{p.multishot+=1;p.dmgMult+=0.3;G.curseFire+=0.3;}},
 {id:'irongreed',name:'Eiserne Gier',ic:'weight',up:'+60% Schaden & +0.6 Gold',down:'Rüstung dauerhaft 0',apply:p=>{p.dmgMult+=0.6;p.goldMult+=0.6;p.armorLocked=true;}},
 {id:'martyrdom',name:'Märtyrertum',ic:'crown',up:'+90% Schaden unter 50% LP',down:'−40% Max-LP',apply:p=>{p.maxHP=Math.round(p.maxHP*0.6);p.hp=Math.min(p.hp,p.maxHP);p.curseMartyr=true;}},
 {id:'recklessrage',name:'Rücksichtslose Wut',ic:'frenzy',up:'+45% Feuerrate',down:'−20% Max-LP & +25% Gegner-Spawn',apply:p=>{p.frMult*=0.55;p.maxHP=Math.round(p.maxHP*0.8);p.hp=Math.min(p.hp,p.maxHP);G.curseSpawn+=0.25;}},
 {id:'greedpact',name:'Pakt der Gier',ic:'crown',up:'Doppeltes Gold',down:'Gegner +30% Leben',apply:p=>{p.goldMult*=2; if(G.curseHp!==1.3){ G.curseHp=1.3; for(const e of enemies){e.maxHp*=1.3;e.hp*=1.3;} } }},   // gilt auch für die schon erschienene erste Welle
 {id:'silencepact',name:'Pakt des Schweigens',ic:'multi',up:'+1 Waffenslot',down:'Waffenkammer nur nach jeder 2. Welle',apply:p=>{p.weaponCap=capOf(p)+1;G.silence=true;}},
];
const curseById=id=>CURSE_DEFS.find(c=>c.id===id);
const capOf=p=>(p&&p.weaponCap)||WEAPON_CAP;

/* ---------- PHASE 3: GLOBALE META-PROGRESSION (Seelen) ---------- */
const META_UPGRADES=[
 {id:'dmg',   ic:'sword'},  {id:'hp',  ic:'heart'}, {id:'speed',ic:'boot'},
 {id:'fr',    ic:'clock'},  {id:'gold',ic:'crown'}, {id:'xp',   ic:'star'},
];
const META_MAX=20;                                  // +5% pro Stufe → max +100%
/* E1: Schaden und Leben höchstens +25 % — sonst ist jede Schwierigkeit nach vielen Läufen eine andere und nicht mehr zu balancen */
const META_CAP={dmg:5,hp:5};
const metaMax=id=>META_CAP[id]||META_MAX;
const metaCost=lvl=>10+lvl*8;                       // Seelen für die NÄCHSTE Stufe
function metaName(id){ return t('m_'+id); }
function metaLevel(id){ const m=DB.current&&DB.current.meta&&DB.current.meta.levels; return Math.min((m&&m[id])||0,metaMax(id)); }
/* Stufen über dem Deckel (aus der Zeit davor) werden in Seelen erstattet */
function normalizeMeta(){ const m=DB.current&&DB.current.meta; if(!m||!m.levels)return; let refund=0;
  for(const id in META_CAP){ const l=m.levels[id]||0; for(let k=META_CAP[id];k<l;k++)refund+=metaCost(k); if(l>META_CAP[id])m.levels[id]=META_CAP[id]; }
  if(refund){ m.currency=(m.currency||0)+refund; DB.save(); showToast(t('meta_title'),t('meta_refund',{n:refund})); } }
function applyMeta(p){
  p.dmgMult*=1+0.05*metaLevel('dmg');
  const hpL=metaLevel('hp'); p.maxHP=Math.round(p.maxHP*(1+0.05*hpL)); p.hp=p.maxHP;
  p.speed*=1+0.05*metaLevel('speed');
  p.frMult*=1/(1+0.05*metaLevel('fr'));
  p.goldMult*=1+0.05*metaLevel('gold');
  p.xpMult=(p.xpMult||1)*(1+0.05*metaLevel('xp'));
}
function awardSouls(snap){ if(!DB.current)return 0;
  const s=Math.floor((snap.kills||0)/20)+(snap.levelGain!=null?snap.levelGain:(snap.level||0))*2+(snap.bossKills||0)*15+(snap.won?50:0);
  DB.current.meta=DB.current.meta||{currency:0,levels:{}}; DB.current.meta.currency=(DB.current.meta.currency||0)+s; return s; }

/* ---------- PHASE 5: CHARAKTER-FREISCHALTUNGEN ---------- */
const BOSS_KIND_NAME={preacher:'Der Grabenpredigter',maggot:'Made Magna',surgeon:'Der Verschollene Chirurg',lamb:'Das Schlächterlamm',crucified:'Erster Gekreuzigter'};
function isCharUnlocked(c){
  if(!c.unlock) return true;
  const st=DB.current&&DB.current.stats; if(!st) return false;
  const u=c.unlock;
  if(u.level)  return (st.bestCharLevel||0)>=u.level;
  if(u.boss)   return !!(st.bossKinds&&st.bossKinds[u.boss]);
  if(u.weapon) return ((st.weaponKills&&st.weaponKills[u.weapon])||0)>=u.kills;
  return true;
}
function unlockDesc(c){ const u=c.unlock; if(!u)return '';
  if(u.level)  return t('unlock_level',{n:u.level});
  if(u.boss)   return t('unlock_boss',{name:BOSS_KIND_NAME[u.boss]||u.boss});
  if(u.weapon) return t('unlock_kills',{n:u.kills,w:weaponById(u.weapon).name});
  return ''; }

/* ---------- PHASE 4: ERRUNGENSCHAFTEN ---------- */
const BASE_STARTERS=['revolver','scatter','witchfire','plague'];   // "alle Waffen meistern"
const ACHIEVEMENTS=[
 {id:'first_run',  de:'Erste Buße',         en:'First Penance',     dd:'Beende deine erste Runde.',         ed:'Finish your first run.',          ic:'crown',  check:s=>(s.runs||0)>=1},
 {id:'kills_100',  de:'Hundert Seelen',     en:'A Hundred Souls',   dd:'Töte 100 Gegner.',                  ed:'Kill 100 enemies.',               ic:'sword',  check:s=>(s.kills||0)>=100},
 {id:'kills_1000', de:'Tausendfacher Tod',  en:'Thousandfold Death',dd:'Töte 1000 Gegner.',                 ed:'Kill 1000 enemies.',              ic:'sword',  check:s=>(s.kills||0)>=1000},
 {id:'kills_10000',de:'Erntemeister',       en:'Master Reaper',     dd:'Töte 10 000 Gegner.',               ed:'Kill 10,000 enemies.',            ic:'scythe', check:s=>(s.kills||0)>=10000},
 {id:'boss_1',     de:'Gekreuzigtenfäller', en:'Boss Slayer',       dd:'Besiege einen Boss.',               ed:'Defeat a boss.',                  ic:'star',   check:s=>(s.bossKills||0)>=1},
 {id:'heresy_win', de:'Im Angesicht der Ketzerei', en:'In the Face of Heresy', dd:'Gewinne eine Runde auf Heresy.', ed:'Win a run on Heresy.', ic:'eye',    check:s=>(s.heresyWins||0)>=1},
 {id:'all_chars',  de:'Vollzählige Schar',  en:'Full Host',         dd:'Schalte alle Charaktere frei.',     ed:'Unlock every character.',         ic:'multi',  check:()=>CHARS.every(isCharUnlocked)},
 {id:'weapon_master',de:'Waffenmeister',    en:'Weapon Master',     dd:'1000 Kills mit jeder Startwaffe.',  ed:'1000 kills with each starter weapon.',ic:'gatling',check:s=>BASE_STARTERS.every(w=>((s.weaponKills&&s.weaponKills[w])||0)>=1000)},
];
const achName=a=>LANG==='en'?a.en:a.de;
const achDesc=a=>LANG==='en'?a.ed:a.dd;
function checkAchievements(){ if(!DB.current)return; const s=DB.current.stats||{}; DB.current.achievements=DB.current.achievements||{};
  let any=false;
  for(const a of ACHIEVEMENTS){ if(!DB.current.achievements[a.id] && a.check(s)){ DB.current.achievements[a.id]=true; any=true;
    DB.current.meta=DB.current.meta||{currency:0,levels:{}}; DB.current.meta.currency=(DB.current.meta.currency||0)+25;
    showToast(t('ach_unlocked'),'<b style="color:var(--gold2)">'+achName(a)+'</b> &nbsp;·&nbsp; +25 '+t('souls')); } }
  if(any) DB.save();
}
/* Lauf-Ende zentral: Statistik committen, Seelen vergeben, Erfolge prüfen.
   Custom-Grad und Admin-Läufe zählen nicht. Station 50 wertet den Lauf bereits; spätere Wertungen
   (Tod/Aufgeben im Endlos-Modus) buchen nur noch den Zuwachs seit der letzten Wertung. */
function finishRun(died,won){ logBalance(died,won); if(!runCounts()) return 0;
  const snap=buildRunSnapshot(died,won), prev=G.runCommitted; G.runCommitted=snap;
  const rec=prev?runDelta(snap,prev):snap;
  DB.commit(rec); const souls=awardSouls(rec); checkAchievements(); DB.save(); return souls; }
function runCounts(){ return !G.noSave && !(G.run&&G.run.cheated); }
function runDelta(snap,prev){ const wk={};
  for(const k in snap.weaponKills){ const d=snap.weaponKills[k]-(prev.weaponKills[k]||0); if(d>0)wk[k]=d; }
  return Object.assign({},snap,{continued:true,kills:snap.kills-prev.kills,gold:snap.gold-prev.gold,bossKills:snap.bossKills-prev.bossKills,
    time:snap.time-prev.time,levelGain:snap.level-prev.level,won:false,heresyWin:false,weaponKills:wk}); }
function soulsLine(souls){ return runCounts()?t('souls_earned',{n:souls}):t('run_unranked'); }

/* Admin-Läufe zählen nicht: aktiver Cheat beim Laufstart oder irgendein Admin-Eingriff während des Laufs */
function adminActive(){ return Admin.god||Admin.one||Admin.dash||Admin.noFire||Admin.noSpawn||Admin.noObs||Admin.dmg!==1||Admin.luck!==1||Admin.startLevel!==1||Admin.startCoins!==0; }
function markCheated(){ if(G.run&&['playing','paused','stats'].includes(G.state))G.run.cheated=true; }   // Admin-Panel ist im Lauf nur über die Pause erreichbar
const Admin={god:false,one:false,dash:false,noFire:false,noSpawn:false,noObs:false,dmg:1,luck:1,startLevel:1,startCoins:0,unlocked:false};

const G={state:'login',level:1,coins:0,kills:0,time:0,uiTime:0,cleared:false,clearTimer:0,shake:0,bossMode:false,boss:null,charId:'penitent',
  endless:false,collectT:0,run:null,diff:diffById('medium'),pendingChar:'penitent',pendingDiff:'medium',curseSpawn:1,curseFire:1,rewardMul:1,activeCurse:null,
  activeMods:[],modMul:{},modEnemySpeed:1,modMapScale:1,noSave:false,customDiff:{count:1,hp:1,dmg:1,fire:1},
  coop:false,coopPick:0,pendingChar2:null};
let player=null, players=[], postQueue=[];
/* ponytail: Koop verarbeitet jeden Spieler, indem die globale `player`-Referenz getauscht wird —
   spart das Durchreichen eines Parameters durch ~20 Funktionen. pendingUp/pendingAb liegen pro Spieler. */
function alivePlayers(){ return players.filter(p=>!p.dead); }
function nearestPlayer(x,y){ let best=null,bd=1e18; for(const pl of players){ if(pl.dead)continue; const d=dist2(x,y,pl.x,pl.y); if(d<bd){bd=d;best=pl;} } return best; }
function anchorPlayer(){ return alivePlayers()[0]||players[0]; }
function camTarget(){ let ax=0,ay=0,n=0; for(const pl of players){ if(pl.dead)continue; ax+=pl.x;ay+=pl.y;n++; } return n?{x:ax/n,y:ay/n}:{x:player?player.x:WORLD.w/2,y:player?player.y:WORLD.h/2}; }
let enemies=[],bullets=[],ebullets=[],pickups=[],particles=[],puddles=[],floaters=[],bolts=[],obstacles=[],novaRings=[];
let deployables=[],beams=[];   // Phase 6: Totems/Geschütze/Minen/Begleiter + Laserstrahlen
let decor=[], charPreviews=[];
let WORLD={w:1400,h:950};
let ROOM={x:40,y:40,w:WORLD.w-80,h:WORLD.h-80};
let cam={x:0,y:0};
