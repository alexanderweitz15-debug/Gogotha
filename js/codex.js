"use strict";
/* GOLGOTHA — Kodex (Sammlung aller Waffen, Gegenstände, Reliquien, Gegner, Bosse, Figuren) und weitere Erfolge.
   Entdeckt-Status je Konto in DB.current.codex = {w:{id:1},i:{},r:{},e:{},b:{}} (wird mit dem Konto gespeichert).
   Erfasst wird nur in gewerteten Läufen (kein Admin-Eingriff). */
const CDX_CATS=['w','i','r','e','b'];
function codexData(){ const u=DB.current; if(!u)return null; const c=u.codex||(u.codex={}); for(const k of CDX_CATS) c[k]=c[k]||{}; return c; }
function codexHas(cat,id){ const c=DB.current&&DB.current.codex; return !!(c&&c[cat]&&c[cat][id]); }
function codexSeen(cat,id){ if(!id||!G.run||G.run.cheated||adminActive()||G.state==='paused')return;   // Pause = Admin-Panel
  const c=codexData(); if(!c)return; const m=c[cat]||(c[cat]={}); if(m[id])return; m[id]=1; R.dirty=true; }
const cdxEnemyTypes=()=>Object.keys(ETYPES);
function codexLists(){ return {w:WEAPONS.map(w=>w.id),i:ITEMS.map(i=>i.id),r:RELICS.map(r=>r.id),e:cdxEnemyTypes(),b:BOSS_KINDS.slice()}; }
function codexCount(){ const L=codexLists(); let have=0,total=0; for(const k of CDX_CATS){ total+=L[k].length; have+=L[k].filter(id=>codexHas(k,id)).length; } return {have,total}; }
function codexPct(){ const n=codexCount(); return n.total?n.have/n.total:0; }

/* ---------- ERFOLGE (je +25 Seelen wie die übrigen) ---------- */
const feat=(s,k)=>!!(s.feats&&s.feats[k]);
function setFeat(k){ if(!DB.current||!runCounts())return false; const s=DB.current.stats, f=s.feats||(s.feats={}); if(f[k])return false; f[k]=1; return true; }
ACHIEVEMENTS.push(
 {id:'cls_4',      de:'Meister der Klasse',     en:'Class Master',          dd:'Erreiche Stufe IV eines Klassenbonus.',            ed:'Reach stage IV of a class bonus.',              ic:'crown',    check:s=>feat(s,'cls4')},
 {id:'fusion',     de:'Schmiedefeuer',          en:'Forge Fire',            dd:'Verschmelze zwei Waffen.',                         ed:'Fuse two weapons.',                             ic:'trinity',  check:s=>feat(s,'fusion')},
 {id:'endform',    de:'Endform',                en:'Final Form',            dd:'Schmiede eine Endform aus Waffe St. 10 und Reliquie.',ed:'Forge a final form from a Lv 10 weapon and a relic.',ic:'explosion',check:s=>feat(s,'endform')},
 {id:'ab_fusion',  de:'Erwachte Einheit',       en:'Awakened Unity',        dd:'Verschmelze zwei Fähigkeiten.',                    ed:'Fuse two abilities.',                           ic:'nova',     check:s=>feat(s,'abfusion')},
 {id:'weapon_10',  de:'Bis zur Vollendung',     en:'To Perfection',         dd:'Veredle eine Waffe auf Stufe 10.',                 ed:'Refine a weapon to level 10.',                  ic:'sword',    check:s=>feat(s,'w10')},
 {id:'items_10',   de:'Krämerseele',            en:'Peddler\'s Soul',       dd:'Kaufe 10 Gegenstände in einem Lauf.',              ed:'Buy 10 items in one run.',                      ic:'weight',   check:s=>feat(s,'items10')},
 {id:'relics_5',   de:'Reliquienhüter',         en:'Keeper of Relics',      dd:'Trage 5 Reliquien in einem Lauf.',                 ed:'Carry 5 relics in one run.',                    ic:'eye',      check:s=>feat(s,'relics5')},
 {id:'all_played', de:'Jede Sünde getragen',    en:'Every Sin Borne',       dd:'Beginne mit jeder Figur einen Lauf.',              ed:'Start a run with every character.',             ic:'multi',    check:s=>CHARS.every(c=>s.played&&s.played[c.id])},
 {id:'boss_nohit', de:'Unberührt',              en:'Untouched',             dd:'Besiege einen Boss, ohne getroffen zu werden.',    ed:'Defeat a boss without being hit.',              ic:'shield',   check:s=>feat(s,'bossnohit')},
 {id:'all_bosses', de:'Zehn Kreuze',            en:'Ten Crosses',           dd:'Besiege jeden der zehn Bosse.',                    ed:'Defeat each of the ten bosses.',                ic:'star',     check:s=>BOSS_KINDS.every(k=>s.bossKinds&&s.bossKinds[k])},
 {id:'reach_31',   de:'Im Schlachthof',         en:'Into the Slaughterhouse',dd:'Erreiche Station 31 (Der Schlachthof).',          ed:'Reach station 31 (the Slaughterhouse).',        ic:'arrow',    check:s=>(s.bestLevel||0)>=31},
 {id:'reach_41',   de:'Am Fuß des Hügels',      en:'At the Foot of the Hill',dd:'Erreiche Station 41 (Golgotha).',                 ed:'Reach station 41 (Golgotha).',                  ic:'arrow',    check:s=>(s.bestLevel||0)>=41},
 {id:'endless_60', de:'Jenseits der Gnade',     en:'Beyond Grace',          dd:'Erreiche Endlos-Station 10 (Station 60).',         ed:'Reach endless station 10 (station 60).',        ic:'clock',    check:s=>(s.bestLevel||0)>=60},
 {id:'heresy_20',  de:'Ketzerische Ausdauer',   en:'Heretical Endurance',   dd:'Erreiche Station 20 auf Heresy.',                  ed:'Reach station 20 on Heresy.',                   ic:'eye',      check:s=>feat(s,'heresy20')},
 {id:'coop_win',   de:'Seite an Seite',         en:'Side by Side',          dd:'Gewinne einen Lauf im Koop.',                      ed:'Win a co-op run.',                              ic:'wing',     check:s=>feat(s,'coopwin')},
 {id:'curse_win',  de:'Fluchträger',            en:'Curse Bearer',          dd:'Gewinne einen Lauf mit angenommenem Fluch.',       ed:'Win a run with an accepted curse.',             ic:'leech',    check:s=>feat(s,'cursewin')},
 {id:'region_hunt',de:'Kammerjäger',            en:'Exterminator',          dd:'Töte jeden der zehn Regionsgegner.',               ed:'Kill each of the ten regional enemies.',        ic:'scythe',   check:()=>REGION_TYPES.flat().every(ty=>codexHas('e',ty))},
 {id:'codex_25',   de:'Chronist',               en:'Chronicler',            dd:'Fülle ein Viertel des Kodex.',                     ed:'Fill a quarter of the codex.',                  ic:'eye',      check:()=>codexPct()>=0.25},
 {id:'codex_50',   de:'Archivar',               en:'Archivist',             dd:'Fülle die Hälfte des Kodex.',                      ed:'Fill half of the codex.',                       ic:'eye',      check:()=>codexPct()>=0.5},
 {id:'codex_100',  de:'Buch der Verdammten',    en:'Book of the Damned',    dd:'Vervollständige den Kodex.',                       ed:'Complete the codex.',                           ic:'crown',    check:()=>codexPct()>=1},
);
/* laufende Prüfung im Spiel (alle 0,5 s aus updateRegion) */
function achLive(){ if(!DB.current||!G.run||!runCounts())return; let n=false; const has=(id,relic)=>WEAPON_EVOS.some(r=>r.result===id&&!!r.relic===relic);
  for(const p of players){
    if(Object.keys(p.clsSt||{}).some(c=>p.clsSt[c]>=4)) n=setFeat('cls4')||n;
    if(p.weapons.some(id=>has(id,false))) n=setFeat('fusion')||n;
    if(p.weapons.some(id=>has(id,true))) n=setFeat('endform')||n;
    if(p.abilities.some(a=>ABILITY_EVOS.some(r=>r.result===a.id))) n=setFeat('abfusion')||n;
    if(p.weapons.some(id=>(p.wLevel[id]||0)>=WEAPON_MAX_LEVEL-1)) n=setFeat('w10')||n;
    let it=0; for(const k in p.itemsOwned||{}) it+=p.itemsOwned[k]; if(it>=10) n=setFeat('items10')||n;
    if(Object.keys(p.relics||{}).length>=5) n=setFeat('relics5')||n; }
  if(G.diff&&G.diff.id==='heresy'&&G.level>=20) n=setFeat('heresy20')||n;
  if(n) checkAchievements(); }
/* Laufbeginn: gespielte Figuren merken */
function achPlayed(){ if(!DB.current||!runCounts())return; const s=DB.current.stats, pl=s.played||(s.played={});
  for(const p of players) if(!pl[p.charId]){ pl[p.charId]=1; R.dirty=true; } }
/* Boss besiegt: Kodex + „Unberührt“ (kein lebender Spieler in dieser Station getroffen, keiner gefallen) */
function regionBossDown(e){ codexSeen('b',e.bossKind);
  if(players.every(p=>!p.dead&&!p.waveHit) && setFeat('bossnohit')) checkAchievements(); }
/* Laufende Wertung (aus finishRun): Koop-Sieg, Sieg mit Fluch */
function runFeats(rec){ if(!rec.won)return; if(G.coop&&players.length>1)setFeat('coopwin'); if(G.activeCurse)setFeat('cursewin'); }

/* ---------- TEXTE ---------- */
Object.assign(I18N.de,{
  cdx_menu:'Kodex', cdx_title:'Kodex der Verdammten', cdx_back:'Zurück', cdx_sub:'{pct}% entdeckt · {have} / {total} Einträge',
  cdx_t_w:'Waffen', cdx_t_i:'Gegenstände', cdx_t_r:'Reliquien', cdx_t_e:'Gegner', cdx_t_b:'Bosse', cdx_t_c:'Figuren', cdx_t_d:'Duo-Segen', cdx_t_s:'Sets',
  cdx_f_all:'Alle', cdx_f_seen:'Entdeckt', cdx_f_miss:'Fehlend', cdx_cls_all:'Alle Klassen', cdx_empty:'Nichts gefunden.',
  cdx_h_w:'Noch nie erhalten.', cdx_h_i:'Noch nie gekauft.', cdx_h_r:'Noch nie erhalten.', cdx_h_e:'Noch nie getötet.', cdx_h_b:'Noch nie besiegt.', cdx_h_x:'Noch nicht entdeckt.',
  cdx_evo:'Verschmelzung: {a} + {b}', cdx_bossw:'Boss-Waffe — nur mit der Boss-Figur', cdx_station:'Station {n}', cdx_everywhere:'Überall', cdx_hazard:'Gefahr: {h}', cdx_seen:'entdeckt',
  reg_h0:'Stacheldraht', reg_h1:'Einstürzende Decke', reg_h2:'Giftschwaden', reg_h3:'Blutlachen', reg_h4:'Blitzeinschläge',
  reg_hd0:'halbiert das Tempo darin', reg_hd1:'Warnkreise, dann fallen Trümmer', reg_hd2:'treibt langsam, vergiftet darin', reg_hd3:'rutschig: schwer anzulaufen, schwer zu bremsen', reg_hd4:'drei Warnkreise nacheinander',
  cdx_e_chaser:'Rennt stumpf auf dich zu.', cdx_e_swarmer:'Klein, schnell, kommt in Mengen.', cdx_e_tank:'Langsam, viel Leben, schwerer Schlag.', cdx_e_shooter:'Hält Abstand und schießt.',
  cdx_e_spitter:'Wirft Giftbrocken, die Pfützen hinterlassen.', cdx_e_exploder:'Läuft heran und explodiert.', cdx_e_flyer:'Fliegt über Hindernisse hinweg.', cdx_e_healer:'Heilt Verbündete in der Nähe.', cdx_e_summoner:'Ruft Maden herbei.',
  cdx_e_rat:'Kommt im Rudel, schlängelt sich heran, beißt und weicht zurück.', cdx_e_sapper:'Wirft Tellerminen in deinen Weg — scharf nach kurzer Zeit, zünden mit Warnkreis.',
  cdx_e_bonewall:'Stellt sich zwischen dich und seine Verbündeten; Schüsse bleiben stecken, kein Durchschlag.', cdx_e_ghost:'Schwebt durch Hindernisse und wird zeitweise körperlos — dann gehen Schüsse hindurch.',
  cdx_e_plaguedoc:'Umkreist dich und hinterlässt eine Spur vergifteten Bodens.', cdx_e_colossus:'Teilt sich beim Tod in zwei kleinere Hälften — zweimal.',
  cdx_e_hook:'Zielt sichtbar und wirft einen Kettenhaken, der dich heranzieht. Ausweichen reißt dich los.', cdx_e_bull:'Scharrt mit Warnstreifen und stürmt geradeaus; prallt er auf, ist er benommen.',
  cdx_e_crossbearer:'Sein Kreuz fängt Schüsse von vorn ab — nach 6 Treffern taumelt er 2 s ohne Schild. Von der Seite trifft man immer.', cdx_e_seraph:'Schwebt über allem und richtet einen Lichtstrahl aus (Warnstreifen).',
  cdx_b_preacher:'Ringe, gezielte Fächer, ruft Gefolge.', cdx_b_maggot:'Kreist, stürmt mit Giftspur, ruft Maden.', cdx_b_surgeon:'Teleportiert sich, feuert Schrotkegel.', cdx_b_lamb:'Schnell kreisend, Spiralsalven.',
  cdx_b_crucified:'Kreuzsalven, wachsende Ringe, Beschwörung.', cdx_b_choir:'Spiralgesang und Aschenregen.', cdx_b_mother:'Giftbrocken und Brut; wird später zornig.', cdx_b_ironsaint:'Schildwall, Ansturm, Kreuzhieb.',
  cdx_b_maw:'Sitzt fest, saugt dich an, speit Knochenringe.', cdx_b_lastcross:'Alles zugleich — und Kreuzbalken über den Raum.',
});
Object.assign(I18N.en,{
  cdx_menu:'Codex', cdx_title:'Codex of the Damned', cdx_back:'Back', cdx_sub:'{pct}% discovered · {have} / {total} entries',
  cdx_t_w:'Weapons', cdx_t_i:'Items', cdx_t_r:'Relics', cdx_t_e:'Enemies', cdx_t_b:'Bosses', cdx_t_c:'Characters', cdx_t_d:'Duo blessings', cdx_t_s:'Sets',
  cdx_f_all:'All', cdx_f_seen:'Discovered', cdx_f_miss:'Missing', cdx_cls_all:'All classes', cdx_empty:'Nothing found.',
  cdx_h_w:'Never obtained.', cdx_h_i:'Never bought.', cdx_h_r:'Never obtained.', cdx_h_e:'Never killed.', cdx_h_b:'Never defeated.', cdx_h_x:'Not discovered yet.',
  cdx_evo:'Fusion: {a} + {b}', cdx_bossw:'Boss weapon — only with the boss character', cdx_station:'Station {n}', cdx_everywhere:'Everywhere', cdx_hazard:'Hazard: {h}', cdx_seen:'discovered',
  reg_h0:'Barbed wire', reg_h1:'Collapsing ceiling', reg_h2:'Poison fumes', reg_h3:'Blood pools', reg_h4:'Lightning strikes',
  reg_hd0:'halves your speed inside', reg_hd1:'warning circles, then rubble falls', reg_hd2:'drifts slowly, poisons inside', reg_hd3:'slippery: slow to start, slow to stop', reg_hd4:'three warning circles in a row',
  cdx_e_chaser:'Runs straight at you.', cdx_e_swarmer:'Small, fast, comes in numbers.', cdx_e_tank:'Slow, lots of health, heavy blow.', cdx_e_shooter:'Keeps its distance and shoots.',
  cdx_e_spitter:'Lobs poison that leaves puddles.', cdx_e_exploder:'Runs up and explodes.', cdx_e_flyer:'Flies over obstacles.', cdx_e_healer:'Heals nearby allies.', cdx_e_summoner:'Summons maggots.',
  cdx_e_rat:'Comes in packs, weaves in, bites and backs off.', cdx_e_sapper:'Throws mines into your path — armed after a moment, they blow with a warning circle.',
  cdx_e_bonewall:'Places itself between you and its allies; shots get stuck, no pierce.', cdx_e_ghost:'Floats through obstacles and turns incorporeal at times — shots pass through then.',
  cdx_e_plaguedoc:'Circles you and leaves a trail of poisoned ground.', cdx_e_colossus:'Splits into two smaller halves on death — twice.',
  cdx_e_hook:'Aims visibly and throws a chain hook that pulls you in. Dodging breaks free.', cdx_e_bull:'Paws the ground with a warning strip, then charges straight; stunned if it crashes.',
  cdx_e_crossbearer:'Its cross blocks shots from the front — after 6 hits it staggers for 2 s without it. Hits from the side always land.', cdx_e_seraph:'Hovers above it all and aims a beam of light (warning strip).',
  cdx_b_preacher:'Rings, aimed fans, summons followers.', cdx_b_maggot:'Circles, charges with a poison trail, summons maggots.', cdx_b_surgeon:'Teleports, fires shotgun cones.', cdx_b_lamb:'Fast circling, spiral volleys.',
  cdx_b_crucified:'Cross volleys, growing rings, summons.', cdx_b_choir:'Spiral chant and ash rain.', cdx_b_mother:'Poison lobs and brood; grows wrathful.', cdx_b_ironsaint:'Shield wall, charge, cross strike.',
  cdx_b_maw:'Rooted, pulls you in, spits bone rings.', cdx_b_lastcross:'Everything at once — and cross beams across the room.',
});

/* ---------- KODEX-ANSICHT ---------- */
const CDX={tab:'w',filter:'all',cls:null};
(function(){ const ov=document.createElement('div'); ov.className='overlay'; ov.id='codex';
  ov.innerHTML='<div class="sect-title" data-i18n="cdx_title"></div><div class="sect-sub" id="cdxSub"></div><div class="cdx-tabs" id="cdxTabs"></div>'+
    '<div class="cdx-filters" id="cdxFilters"></div><div class="cdx-grid" id="cdxGrid"></div><div class="menu-btns"><button class="mbtn" id="cdxBack" data-i18n="cdx_back"></button></div>';
  $('#stage').appendChild(ov);
  const btn=document.createElement('button'); btn.className='mbtn ghost'; btn.id='btnCodex'; btn.setAttribute('data-i18n','cdx_menu'); btn.textContent=t('cdx_menu');
  const ach=$('#btnAch'); if(ach)ach.after(btn); else $('#menu .menu-btns').appendChild(btn);
  btn.onclick=()=>openCodex();
  $('#cdxBack').onclick=()=>{ hideAllOverlays(); G.state='menu'; show('menu'); };
  $('#langBtn').addEventListener('click',()=>setTimeout(()=>{ if(G.state==='codex')renderCodex(); },0)); })();
function openCodex(){ G.state='codex'; hideAllOverlays(); renderCodex(); show('codex'); }
const cdxEsc=s=>String(s).replace(/[<>&"]/g,ch=>'&#'+ch.charCodeAt(0)+';');
/* kleines Bild: Figur auf eigener Leinwand, unentdeckt als dunkle Silhouette */
function cdxCanvas(w,h,draw,seen){ const c=document.createElement('canvas'); c.width=w; c.height=h; c.className='cdx-cv'; const g=c.getContext('2d');
  try{ draw(g,w,h); }catch(e){}
  if(!seen){ g.setTransform(1,0,0,1,0,0); g.globalCompositeOperation='source-atop'; g.fillStyle='#231f1b'; g.fillRect(0,0,w,h); } return c; }
function cdxEnemyImg(g,w,h,ty){ const t=ETYPES[ty], spr=enemySprite(ty,t.r,t.color,0,false), s=Math.min(2.2,(w-6)/spr.width);
  g.translate(w/2,h/2); g.scale(s,s); g.drawImage(spr,-spr._pad,-spr._pad); }
/* Bosse 1–5 zeichnet render.js direkt auf die Spiel-Leinwand: dort kurz zeichnen und herauskopieren (das Menü übermalt sie im nächsten Bild) */
function cdxBossImg(g,w,h,k){ const S=150, e={r:36,bossKind:k,spin:0.6,moveT:0,hp:1,maxHp:1,shieldT:0};
  cx.save(); cx.setTransform(1,0,0,1,0,0); cx.clearRect(0,0,S,S); cx.translate(S/2,S/2+6); drawBoss(e,C.blood2); cx.restore();
  g.drawImage(cv,0,0,S,S,0,0,w,h); }
function cdxEntries(tab){ const L=LANG==='en', out=[];
  if(tab==='w') for(const w of WEAPONS){ if(CDX.cls&&!w.cls.includes(CDX.cls))continue; const seen=codexHas('w',w.id), ev=WEAPON_EVOS.find(r=>r.result===w.id);
    let extra=''; if(ev) extra='<div class="cdx-note">'+t('cdx_evo',{a:weaponById(ev.a).name,b:ev.relic?relicById(ev.relic).name:weaponById(ev.b).name})+'</div>'; else if(w.id.startsWith('bw_')) extra='<div class="cdx-note">'+t('cdx_bossw')+'</div>';
    out.push({seen,img:svgIcon(w.ic,seen?w.color:'#3a342c',30),name:w.name,meta:'<span class="rk '+w.rk+'">'+rarName(w.rk)+'</span>',
      desc:(seen?'<div class="cls-row">'+w.cls.map(c=>clsChip(c,clsName(c))).join('')+'</div>'+weaponMeta(w,Math.round(w.dmg)):t('cdx_h_w'))+extra}); }
  else if(tab==='i') for(const it of ITEMS){ const seen=codexHas('i',it.id);
    out.push({seen,img:svgIcon(it.ic,seen?rarColor(it.rk):'#3a342c',30),name:it.name,meta:'<span class="rk '+it.rk+'">'+rarName(it.rk)+'</span>',
      desc:seen?'<span class="up">'+itemUp(it)+'</span>'+(it.down?'<br><span class="down">'+it.down+'</span>':''):t('cdx_h_i')}); }
  else if(tab==='r') for(const r of RELICS){ const seen=codexHas('r',r.id), hint=relicRecipeHint(r.id);
    out.push({seen,img:svgIcon(r.ic,seen?C.gold2:'#3a342c',30),name:r.name,meta:'<span style="color:var(--gold2)">✦ '+t('relic_label')+'</span>',desc:(seen?r.desc:t('cdx_h_r'))+(seen&&hint?'<div class="cdx-note">'+hint+'</div>':'')}); }
  else if(tab==='e'){ const regOf={}; REGION_TYPES.forEach((ts,i)=>ts.forEach(ty=>regOf[ty]=i));
    const groups=[{head:t('cdx_everywhere'),types:cdxEnemyTypes().filter(ty=>regOf[ty]==null)}].concat(REGIONS.map((rg,i)=>({head:rg.name,sub:t('cdx_hazard',{h:t('reg_h'+i)})+' — '+t('reg_hd'+i),types:REGION_TYPES[i]})));
    for(const gr of groups){ out.push({head:gr.head,sub:gr.sub});
      for(const ty of gr.types){ const seen=codexHas('e',ty), et=ETYPES[ty];
        out.push({seen,draw:(g,w,h)=>cdxEnemyImg(g,w,h,ty),name:et.name,meta:regOf[ty]!=null?REGIONS[regOf[ty]].name:t('cdx_everywhere'),desc:seen?t('cdx_e_'+ty):t('cdx_h_e')}); } } }
  else if(tab==='b') BOSS_KINDS.forEach((k,i)=>{ const seen=codexHas('b',k);
    out.push({seen,draw:(g,w,h)=>cdxBossImg(g,w,h,k),name:BOSS_NAMES[i],meta:t('cdx_station',{n:(i+1)*5}),desc:seen?t('cdx_b_'+k):t('cdx_h_b')}); });
  else if(tab==='c') for(const c of CHARS){ const seen=isCharUnlocked(c), w=weaponById(c.weapon);
    out.push({seen,draw:(g,cw,ch)=>drawHero(g,c.id,cw/2,ch*0.62,cw*0.26,0.4,false,-0.2),tall:true,name:c.name,meta:c.role,
      desc:seen?'<i>'+c.lore+'</i><div class="cdx-note">'+svgIcon(w.ic,w.color,12).replace('display:block','display:inline-block;vertical-align:middle')+' '+w.name+'</div>'+charPerkHtml(c.id):'🔒 '+unlockDesc(c)}); }
  else { const list=tab==='d'?(typeof DUOS!=='undefined'?DUOS:[]):(typeof SETS!=='undefined'?SETS:[]);
    for(const x of list){ const seen=codexHas(tab,x.id);   // Duo-Segen/Sets (js/synergy.js): als Rezept immer lesbar, entdeckt = schon einmal erhalten
      const nm=tab==='d'?duoName(x):setName(x), ds=(tab==='d'?duoDesc(x):setDesc(x))+'<div class="cdx-note">'+(tab==='d'?duoReqText(x):x.parts.map(setPartName).join(' · '))+'</div>';
      out.push({seen:true,mark:seen,img:svgIcon(x.ic||'star',seen?C.gold2:C.bone,30),name:nm,meta:seen?'✦ '+t('cdx_seen'):'',desc:ds}); } }
  return out; }
function cdxTabs(){ const tabs=['w','i','r','e','b','c']; if(typeof DUOS!=='undefined'&&DUOS.length)tabs.push('d'); if(typeof SETS!=='undefined'&&SETS.length)tabs.push('s'); return tabs; }
function renderCodex(){ const n=codexCount();
  $('#cdxSub').textContent=t('cdx_sub',{pct:Math.floor(n.have/Math.max(1,n.total)*100),have:n.have,total:n.total});
  const tabs=cdxTabs(); if(!tabs.includes(CDX.tab))CDX.tab='w';
  const tw=$('#cdxTabs'); tw.innerHTML='';
  for(const k of tabs){ const all=cdxEntries(k).filter(x=>!x.head), have=all.filter(x=>x.mark!=null?x.mark:x.seen).length;
    const b=document.createElement('button'); b.className='cdx-tab'+(k===CDX.tab?' on':''); b.innerHTML=t('cdx_t_'+k)+' <span>'+have+'/'+all.length+'</span>';
    b.onclick=()=>{ CDX.tab=k; CDX.cls=null; renderCodex(); }; tw.appendChild(b); }
  const fw=$('#cdxFilters'); fw.innerHTML='';
  const chip=(label,on,fn,col)=>{ const b=document.createElement('button'); b.className='mod-chip cdx-chip'+(on?' on':''); b.innerHTML=label; if(col)b.style.color=col; b.onclick=fn; fw.appendChild(b); };
  for(const f of ['all','seen','miss']) chip(t('cdx_f_'+f),CDX.filter===f,()=>{ CDX.filter=f; renderCodex(); });
  if(CDX.tab==='w'){ const br=document.createElement('i'); br.className='cdx-sep'; fw.appendChild(br); chip(t('cdx_cls_all'),!CDX.cls,()=>{ CDX.cls=null; renderCodex(); });
    for(const c in CLASSES) chip(svgIcon(CLASSES[c].ic,CLASSES[c].color,11).replace('display:block','display:inline-block;vertical-align:-1px')+' '+clsName(c),CDX.cls===c,()=>{ CDX.cls=CDX.cls===c?null:c; renderCodex(); }); }
  const grid=$('#cdxGrid'); grid.innerHTML=''; let shown=0, pendingHead=null;
  for(const x of cdxEntries(CDX.tab)){
    if(x.head){ pendingHead=x; continue; }
    if(CDX.filter==='seen'&&!x.seen || CDX.filter==='miss'&&x.seen) continue;
    if(pendingHead){ const h=document.createElement('div'); h.className='cdx-head'; h.innerHTML=cdxEsc(pendingHead.head)+(pendingHead.sub?'<span>'+cdxEsc(pendingHead.sub)+'</span>':''); grid.appendChild(h); pendingHead=null; }
    const el=document.createElement('div'); el.className='cdx-card'+(x.seen?'':' unseen')+(x.mark?' marked':'');
    const im=document.createElement('div'); im.className='cdx-img'+(x.tall?' tall':'');
    if(x.draw) im.appendChild(cdxCanvas(x.tall?64:64,x.tall?76:64,x.draw,x.seen)); else im.innerHTML=x.img;
    const body=document.createElement('div'); body.className='cdx-body';
    body.innerHTML='<div class="cdx-name">'+(x.seen?x.name:'???')+'</div><div class="cdx-meta">'+(x.meta||'')+'</div><div class="cdx-desc">'+x.desc+'</div>';
    el.append(im,body); grid.appendChild(el); shown++; }
  if(!shown) grid.innerHTML='<div class="cdx-empty">'+t('cdx_empty')+'</div>';
  grid.scrollTop=0; }
