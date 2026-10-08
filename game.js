"use strict";
/* =========================================================================
   GOLGOTHA — grimdark roguelike
   Features: Login/DB, große Map + Kamera + Minimap, Gold-Waffenshop,
   Stufen-Upgrades, Fähigkeiten (Lvl 10/20/30/40/50), 8 Seltenheitsstufen,
   verschiedene Bosse mit eigenen Mustern, einklappbares HUD, Endlos-Modus.
   ========================================================================= */
const cv=document.getElementById('game'), cx=cv.getContext('2d');
const W=cv.width, H=cv.height;                 // Viewport (Kamera-Fenster)
const head=document.getElementById('headCanvas'), hcx=head.getContext('2d');
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>v<a?a:v>b?b:v, rand=(a,b)=>a+Math.random()*(b-a), randInt=(a,b)=>Math.floor(rand(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)], TAU=Math.PI*2;
const dist2=(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;};
const lerp=(a,b,t)=>a+(b-a)*t;
function distToSeg(px,py,ax,ay,bx,by){ const dx=bx-ax,dy=by-ay, l2=dx*dx+dy*dy;
  let tt=l2?((px-ax)*dx+(py-ay)*dy)/l2:0; tt=tt<0?0:tt>1?1:tt;
  return Math.hypot(px-(ax+dx*tt),py-(ay+dy*tt)); }
let uid=1;
const C={blood:'#8a1418',blood2:'#c01f24',bone:'#d8cdb8',gold:'#b8893b',gold2:'#e0b25a',sick:'#9bbf3a',candle:'#e08a2f',steel:'#8a93a0',xp:'#79e6c0',chill:'#7fd0e6'};

/* ---------- I18N (DE/EN) ----------
   ponytail: nur die Navigations-/HUD-/Werte-Oberfläche wird übersetzt. Eigennamen
   (Charaktere/Bosse/Waffen/Regionen), Lore und Karten-Beschreibungen bleiben deutsch. */
let LANG=(()=>{try{return localStorage.getItem('golgotha_lang')||'de';}catch(e){return 'de';}})();
const I18N={
 de:{
  subtitle:'Kreuzzug der Verdammten',
  gate_sub:'Diese Pforte ist verschlossen. Nenne die Losung, um einzutreten.',
  gate_ph:'Zugangswort', gate_btn:'Eintreten',
  login_sub:'Melde dich an oder weihe einen neuen Pilger. Dein Fortschritt wird auf dem Server bewahrt.',
  login_user:'Pilgername', login_pass:'Losungswort', login_btn:'Anmelden', register_btn:'Neuen Pilger weihen',
  menu_start:'Beginnen', menu_how:'Steuerung', menu_profile:'Statistik', menu_admin:'Admin-Panel', menu_logout:'Abmelden',
  menu_tagline:'Vierzehn mal vierzehn Schritte trennen dich vom Gipfel. An jeder Station wartet das Fegefeuer, und am Ende der Straße steht das Kreuz, das auf dich gewartet hat. Nimm eine Waffe. Bereue später.',
  menu_hint:'WASD Bewegen · Leertaste Ausweichen · Automatisches Zielen & Feuern · Kopf-Symbol = Werte',
  how_title:'Steuerung', how_back:'Zurück',
  how_body:'<b>WASD / Pfeile</b> — Bewegen<br><b>Leertaste</b> — Ausweichschritt (kurz unverwundbar, langer Cooldown)<br><b>Esc</b> — Pause &nbsp;·&nbsp; <b>Kopf-Symbol</b> (oben links) — aktuelle Werte<br><br>Deine Waffen zielen und feuern <b>automatisch</b> auf den nächsten Gegner. Schüsse fliegen geradeaus. Feinde lassen <b>Gold</b> und <b>XP-Splitter</b> fallen. Nach jeder Welle öffnet sich ein Menü: kaufe <b>Waffen mit Gold</b>, verbessere deinen <b>Charakter mit Stufen</b>, und bei Stufe 10/20/30/40/50 erwachen <b>Fähigkeiten</b>.',
  char_title:'Wähle deinen Büßer', char_sub:'Jeder trägt eine andere Sünde — eine andere Waffe — andere Fähigkeiten.', char_back:'Zurück',
  mod_title:'Modifikatoren', mod_back:'Zurück', mod_start:'Beginnen',
  mod_char:'{name} — wähle deinen Schwierigkeitsgrad. Je härter, desto mehr Gegner, Leben, Schaden und Feuer — aber bessere Beute.',
  diff_note:'Gewählt: <b style="color:{color}">{name}</b> — {pct}% Chance auf einen <b style="color:#e0405f">Fluch</b> (deutlich härter, dafür ×1,35 Beute obendrauf).',
  dc_enemies:'Gegner', dc_hp:'LP', dc_dmg:'Schaden', dc_fire:'Feuer', dc_reward:'Beute', dc_curse:'Fluch',
  shop_title:'Waffenkammer', shop_skip:'Weiter', shop_gold:'Gold:',
  shop_sub_full:'Arsenal voll ({cap} Waffen) — veredle sie (bis Stufe 10). Ein Kauf pro Markt.',
  shop_sub_buy:'Welle überstanden. Kaufe EINE Waffe mit Gold — oder ziehe weiter.',
  shop_nothing:'Nichts mehr feilzubieten — ziehe weiter.', shop_reroll:'Neu würfeln ({cost} Gold)',
  up_title:'Aufstieg', up_sub:'Stufe {lvl} — wähle eine Verbesserung.',
  ab_title:'Erwachte Gabe', ab_sub:'Stufe {lvl} — eine Macht erwacht. Wähle eine von dreien.',
  stats_title:'Aktuelle Werte', stats_close:'Zurück', prof_title:'Pilgerbuch', prof_close:'Zurück',
  pause_title:'Innehalten', pause_resume:'Fortsetzen', pause_stats:'Werte ansehen', pause_admin:'Admin-Panel', pause_quit:'Aufgeben',
  go_title:'GEFALLEN', go_retry:'Erneut bereuen', go_menu:'Hauptmenü',
  win_sub:'Du hast den Gipfel erreicht', win_menu:'Hauptmenü', endless_go:'Endlos weiter', endless_restart:'Neu beginnen',
  hud_level:'Stufe', hud_gold:'Gold', hud_kills:'Tötungen', hud_diff:'Grad', hud_dodge:'Ausweichen',
  hud_station:'Station', hud_endless:'Endlos',
  s_hp:'Leben', s_shield:'Schild', s_dmg:'Schaden', s_fr:'Feuerrate', s_speed:'Tempo', s_armor:'Rüstung',
  s_crit:'Krit-Chance', s_pierce:'Durchschlag', s_multi:'Mehrschuss', s_leech:'Lebensraub', s_thorns:'Dornen',
  s_ammo:'Munition', s_luck:'Glück', s_xp:'XP', s_items:'Gaben',
  ammo_burn:'Brand', ammo_slow:'Verlangsamung', ammo_explosive:'Explosiv', val_none:'—', val_no:'Nein',
  weapons_label:'Waffen', abilities_label:'Fähigkeiten',
  p_runs:'Läufe', p_wins:'Siege', p_deaths:'Tode', p_kills:'Tötungen gesamt', p_bosses:'Bosse erlegt',
  p_bestlevel:'Beste Station', p_bestchar:'Höchste Stufe', p_gold:'Gold gesammelt', p_playtime:'Spielzeit',
  prof_line:'Angemeldet als <b>{name}</b> · Läufe <b>{runs}</b> · Beste Station <b>{best}</b> · Tötungen <b>{kills}</b>',
  curse_label:'✠ Fluch', leech_unit:'LP',
 },
 en:{
  subtitle:'Crusade of the Damned',
  gate_sub:'This gate is locked. Speak the watchword to enter.',
  gate_ph:'Watchword', gate_btn:'Enter',
  login_sub:'Sign in or consecrate a new pilgrim. Your progress is kept on the server.',
  login_user:'Pilgrim name', login_pass:'Watchword', login_btn:'Sign in', register_btn:'Consecrate new pilgrim',
  menu_start:'Begin', menu_how:'Controls', menu_profile:'Statistics', menu_admin:'Admin panel', menu_logout:'Sign out',
  menu_tagline:'Fourteen times fourteen steps stand between you and the summit. At every station purgatory waits, and at the end of the road stands the cross that has been waiting for you. Take a weapon. Repent later.',
  menu_hint:'WASD Move · Space Dodge · Auto aim & fire · Head icon = stats',
  how_title:'Controls', how_back:'Back',
  how_body:'<b>WASD / Arrows</b> — Move<br><b>Space</b> — Dodge step (briefly invulnerable, long cooldown)<br><b>Esc</b> — Pause &nbsp;·&nbsp; <b>Head icon</b> (top left) — current stats<br><br>Your weapons aim and fire <b>automatically</b> at the nearest enemy. Shots fly straight. Enemies drop <b>Gold</b> and <b>XP shards</b>. After each wave a menu opens: buy <b>weapons with gold</b>, improve your <b>character with levels</b>, and at level 10/20/30/40/50 <b>abilities</b> awaken.',
  char_title:'Choose your Penitent', char_sub:'Each carries a different sin — a different weapon — different abilities.', char_back:'Back',
  mod_title:'Modifiers', mod_back:'Back', mod_start:'Begin',
  mod_char:'{name} — choose your difficulty. The harder it is, the more enemies, health, damage and fire — but better loot.',
  diff_note:'Selected: <b style="color:{color}">{name}</b> — {pct}% chance of a <b style="color:#e0405f">Curse</b> (much harder, but ×1.35 loot on top).',
  dc_enemies:'Enemies', dc_hp:'HP', dc_dmg:'Damage', dc_fire:'Fire', dc_reward:'Loot', dc_curse:'Curse',
  shop_title:'Armory', shop_skip:'Continue', shop_gold:'Gold:',
  shop_sub_full:'Arsenal full ({cap} weapons) — refine them (up to level 10). One purchase per market.',
  shop_sub_buy:'Wave survived. Buy ONE weapon with gold — or move on.',
  shop_nothing:'Nothing left to offer — move on.', shop_reroll:'Reroll ({cost} gold)',
  up_title:'Ascension', up_sub:'Level {lvl} — choose an upgrade.',
  ab_title:'Awakened Gift', ab_sub:'Level {lvl} — a power awakens. Choose one of three.',
  stats_title:'Current Stats', stats_close:'Back', prof_title:'Pilgrim Book', prof_close:'Back',
  pause_title:'Pause', pause_resume:'Resume', pause_stats:'View stats', pause_admin:'Admin panel', pause_quit:'Give up',
  go_title:'FALLEN', go_retry:'Repent again', go_menu:'Main menu',
  win_sub:'You have reached the summit', win_menu:'Main menu', endless_go:'Endless onward', endless_restart:'Start over',
  hud_level:'Level', hud_gold:'Gold', hud_kills:'Kills', hud_diff:'Diff', hud_dodge:'Dodge',
  hud_station:'Station', hud_endless:'Endless',
  s_hp:'Health', s_shield:'Shield', s_dmg:'Damage', s_fr:'Fire rate', s_speed:'Speed', s_armor:'Armor',
  s_crit:'Crit chance', s_pierce:'Pierce', s_multi:'Multishot', s_leech:'Lifesteal', s_thorns:'Thorns',
  s_ammo:'Ammo', s_luck:'Luck', s_xp:'XP', s_items:'Gifts',
  ammo_burn:'Burn', ammo_slow:'Slow', ammo_explosive:'Explosive', val_none:'—', val_no:'No',
  weapons_label:'Weapons', abilities_label:'Abilities',
  p_runs:'Runs', p_wins:'Wins', p_deaths:'Deaths', p_kills:'Total kills', p_bosses:'Bosses slain',
  p_bestlevel:'Best station', p_bestchar:'Highest level', p_gold:'Gold gathered', p_playtime:'Play time',
  prof_line:'Signed in as <b>{name}</b> · Runs <b>{runs}</b> · Best station <b>{best}</b> · Kills <b>{kills}</b>',
  curse_label:'✠ Curse', leech_unit:'HP',
 }
};
function t(k,v){ let s=(I18N[LANG]&&I18N[LANG][k])||I18N.de[k]||k; if(v)for(const p in v)s=s.split('{'+p+'}').join(v[p]); return s; }
function diffName(d){ return LANG==='en'?(d.name_en||d.name):d.name; }
function applyLang(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent=t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{ el.innerHTML=t(el.getAttribute('data-i18n-html')); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{ el.placeholder=t(el.getAttribute('data-i18n-ph')); });
  const lb=$('#langBtn'); if(lb) lb.textContent=LANG==='de'?'EN':'DE';
  if(player&&$('#diffTag')) $('#diffTag').textContent=diffName(G.diff);
  if(G.state==='modifiers'){ renderDiffCards(); updateDiffNote(); $('#modChar').textContent=t('mod_char',{name:charById(G.pendingChar).name}); }
  G._foeN=-1;
  if(G.state==='shop') renderShop();
  if(G.state==='charselect') renderCharCards();
  if(G.state==='meta') renderMeta();
  if(G.state==='achievements') renderAchievements();
  if(G.state==='stats') fillStats();
  if($('#profile')&&$('#profile').classList.contains('show')) fillProfile();
  if(DB.current) refreshProfile();
}
function setLang(l){ LANG=l; try{localStorage.setItem('golgotha_lang',l);}catch(e){}
  if(DB.current){ DB.current.meta=DB.current.meta||{}; DB.current.meta.lang=l; DB.save(); } applyLang(); }
function toggleLang(){ setLang(LANG==='de'?'en':'de'); }
Object.assign(I18N.de,{
  menu_meta:'Seelenschmiede', menu_ach:'Erfolge', souls:'Seelen',
  meta_title:'Seelenschmiede', meta_sub:'Dauerhafte Macht für alle Läufe · Seelen: <b>{souls}</b>',
  meta_lvl:'St. {lvl}/{max}', meta_buy:'{cost} Seelen', meta_max:'✦ MAX', meta_back:'Zurück',
  ach_title:'Errungenschaften', ach_sub:'{have} / {total} freigeschaltet', ach_unlocked:'✦ Errungenschaft', ach_back:'Zurück',
  souls_earned:'Seelen verdient: <b>{n}</b>', char_locked:'Gesperrt',
  unlock_level:'Erreiche Charakterstufe {n}', unlock_boss:'Besiege {name}', unlock_kills:'{n} Kills mit {w}',
  char_unlocked:'✦ Charakter frei', m_dmg:'Schaden', m_hp:'Leben', m_speed:'Tempo', m_fr:'Feuerrate', m_gold:'Goldgewinn', m_xp:'Erfahrung',
  custom_hint:'Frei einstellbar — zählt NICHT.', custom_note:'<b style="color:#7fd0e6">Eigener Grad</b> — frei per Regler, zählt NICHT in Fortschritt, Erfolge oder Freischaltungen.',
  coop_down:'Gefallen', coop_revive:'belebt nächste Runde wieder', coop_player:'Spieler', coop_dead:'✝ Tot',
  run_unranked:'<span style="color:#7fd0e6">Lauf nicht gewertet (Admin/Eigener Grad)</span>',
  hud_foes:'Gegner: {n}', gate_err:'Falsche Losung', rotate_hint:'Bitte Gerät quer halten',
  hint_shop:'1–3 kaufen · R neu würfeln · Enter weiter', hint_pick:'1–3 wählen', endless_sub:'Der Gipfel ist erreicht',
  shop_evo:'Verschmelzung', shop_evo_free:'Verschmelzen (gratis)', shop_refine:'Veredeln', shop_max:'✦ MAX · Stufe 10', lvl_short:'St.',
  w_proj:'{n} Projektile', w_single:'Einzelschuss', w_pierce:'durchbohrt', w_chain:'Blitz', w_explosive:'explosiv', w_deploy:'platzierbar',
  evo_done:'ist entstanden!', ab_evo:'Erwachte Verschmelzung', ab_evo_done:'entfesselt!', ab_card:'Fähigkeit', ab_owned:'Verstärkt deine Fähigkeit',
  end_all50:'Du hast alle 50 Stationen überstanden.', end_clvl:'Charakterstufe', end_station:'Erreichte Station', end_class:'Klasse', endless_q:'Wie weit reicht die Gnade?',
  dbg_title:'Schaden pro Quelle (F3)', dbg_dmg:'Schaden', dbg_export:'Verlauf exportieren (JSON)',
  src_orbit:'Kreisende Klingen', src_nova:'Nova', src_aura:'Pestaura', src_thorns:'Dornen', src_exec:'Hinrichtung', src_burn:'Brand', src_puddle:'Pfützen', 'src_?':'Unbekannt',
  coop_off:'Koop: AUS', coop_on:'Koop: AN', coop_p1pick:'Spieler 1 wählt …', coop_p2:'Spieler 2 wählt … (Pfeiltasten + Rechte Umschalt)',
});
Object.assign(I18N.en,{
  menu_meta:'Soul Forge', menu_ach:'Achievements', souls:'Souls',
  meta_title:'Soul Forge', meta_sub:'Permanent power for all runs · Souls: <b>{souls}</b>',
  meta_lvl:'Lv {lvl}/{max}', meta_buy:'{cost} Souls', meta_max:'✦ MAX', meta_back:'Back',
  ach_title:'Achievements', ach_sub:'{have} / {total} unlocked', ach_unlocked:'✦ Achievement', ach_back:'Back',
  souls_earned:'Souls earned: <b>{n}</b>', char_locked:'Locked',
  unlock_level:'Reach character level {n}', unlock_boss:'Defeat {name}', unlock_kills:'{n} kills with {w}',
  char_unlocked:'✦ Character unlocked', m_dmg:'Damage', m_hp:'Health', m_speed:'Speed', m_fr:'Fire rate', m_gold:'Gold gain', m_xp:'XP gain',
  custom_hint:'Freely adjustable — does NOT count.', custom_note:'<b style="color:#7fd0e6">Custom</b> — set freely via sliders, does NOT count toward progress, achievements or unlocks.',
  coop_down:'Down', coop_revive:'revives next round', coop_player:'Player', coop_dead:'✝ Dead',
  run_unranked:'<span style="color:#7fd0e6">Run not counted (admin/custom)</span>',
  hud_foes:'Enemies: {n}', gate_err:'Wrong watchword', rotate_hint:'Please turn your device sideways',
  hint_shop:'1–3 buy · R reroll · Enter continue', hint_pick:'1–3 choose', endless_sub:'The summit is reached',
  shop_evo:'Fusion', shop_evo_free:'Fuse (free)', shop_refine:'Refine', shop_max:'✦ MAX · Level 10', lvl_short:'Lv',
  w_proj:'{n} projectiles', w_single:'Single shot', w_pierce:'piercing', w_chain:'lightning', w_explosive:'explosive', w_deploy:'deployable',
  evo_done:'has been forged!', ab_evo:'Awakened fusion', ab_evo_done:'unleashed!', ab_card:'Ability', ab_owned:'Strengthens your ability',
  end_all50:'You survived all 50 stations.', end_clvl:'Character level', end_station:'Station reached', end_class:'Class', endless_q:'How far does grace reach?',
  dbg_title:'Damage by source (F3)', dbg_dmg:'Damage', dbg_export:'Export history (JSON)',
  src_orbit:'Orbiting blades', src_nova:'Nova', src_aura:'Plague aura', src_thorns:'Thorns', src_exec:'Execution', src_burn:'Burn', src_puddle:'Puddles', 'src_?':'Unknown',
  coop_off:'Co-op: OFF', coop_on:'Co-op: ON', coop_p1pick:'Player 1, choose …', coop_p2:'Player 2, choose … (Arrows + Right Shift)',
});

/* ---------- SELTENHEITSSTUFEN ---------- */
const RARITIES=[
 {id:'common',   name:'Gewöhnlich',  name_en:'Common',     color:'#9a9384', w:1000},
 {id:'uncommon', name:'Ungewöhnlich',name_en:'Uncommon',   color:'#5fbf52', w:480},
 {id:'rare',     name:'Selten',      name_en:'Rare',       color:'#4f93e6', w:210},
 {id:'ultrarare',name:'Ultraselten', name_en:'Ultra rare', color:'#37d6c4', w:92},
 {id:'epic',     name:'Episch',      name_en:'Epic',       color:'#b15fe0', w:38},
 {id:'legendary',name:'Legendär',    name_en:'Legendary',  color:'#e8a72f', w:13},
 {id:'mythic',   name:'Mythisch',    name_en:'Mythic',     color:'#ef4060', w:4.2},
 {id:'godlike',  name:'Godlike',     name_en:'Godlike',    color:'#ffe9a0', w:1},
];
const RMAP={}; RARITIES.forEach((r,i)=>{r.idx=i;RMAP[r.id]=r;});
const rar=id=>RMAP[id]||RARITIES[0];
const rarColor=id=>rar(id).color;
const rarName=id=>LANG==='en'?rar(id).name_en:rar(id).name;
const rarRank=id=>rar(id).idx;
function rollRarity(luck){ luck=luck||0;
  let total=0; const acc=[];
  for(const r of RARITIES){ const w=r.w*(1+luck*r.idx*1.05); total+=w; acc.push([total,r.id]); }
  const x=Math.random()*total; for(const [t,id] of acc) if(x<=t) return id; return 'common';
}
function currentLuck(){ let l=(player?player.level:1)*0.012 + (player?player.luck:0); return l*(Admin.luck||1); }

/* ---------- SVG ICONS ---------- */
const ICONS={
 bullet:'M10 3h4v8l-2 9-2-9z', spread:'M6 16l3-8 M12 17V8 M18 16l-3-8', witch:'M12 3c4 5-4 7 0 12 M9 16h6',
 nail:'M8 5h8 M12 5v12 M12 17l-1.5 3h3z', cannon:'M9 3h6l-1 7-2 10-2-10z', bolt:'M5 19L19 5 M14 5h5v5 M5 14v5h5',
 flame:'M12 3c3 5-3 6 0 10 M8 13a4 4 0 0 0 8 0c0-1-1-2-1-3', plague:'M12 4a8 8 0 1 0 .01 0 M9 10h.01 M15 10h.01 M12 16h.01',
 trinity:'M12 3v9 M5 18l7-6 M19 18l-7-6', lightning:'M13 3l-7 10h5l-2 8 8-11h-5z',
 gatling:'M12 7a5 5 0 1 0 .01 0 M12 4v3 M12 17v3 M5 12h3 M16 12h3', lance:'M12 3v16 M9 6h6 M12 19l-2 2h4z',
 heart:'M12 4v15 M6 9h12', sword:'M5 19l9-9 M11 4l7 7-2 2-7-7z M5 19l-1 1', clock:'M12 5a7 7 0 1 0 .01 0 M12 8v4l3 2',
 boot:'M9 4v9H6v4h11v-3h-4V4z', arrow:'M4 12h13 M12 7l5 5-5 5', pierce:'M3 12h18 M16 7l5 5-5 5 M9 8v8',
 multi:'M5 7l6 5-6 5 M13 7l6 5-6 5', leech:'M12 4c4 6 4 8 4 10a4 4 0 1 1-8 0c0-2 0-4 4-10z',
 crown:'M5 18h14 M5 18l1-9 4 5 2-8 2 8 4-5 1 9', eye:'M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6z M12 10h.01',
 weight:'M8 8h8l-1 11H9z M9 8a3 3 0 0 1 6 0', ghost:'M6 12a6 6 0 0 1 12 0v8l-2-2-2 2-2-2-2 2-2-2z M10 11h.01 M14 11h.01',
 shield:'M12 4l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V7z',
 explosion:'M12 3l2 5 5-2-2 5 4 2-5 1 1 5-4-3-3 4-2-5-5 1 2-5-4-3 5-1z', snow:'M12 4v16 M4 12h16 M6 6l12 12 M18 6L6 18',
 orbit:'M12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0 M4 12a8 5 0 0 0 16 0 M20 12a8 5 0 0 0 -16 0',
 nova:'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M12 3v3 M12 18v3 M3 12h3 M18 12h3 M6 6l2 2 M16 16l2 2 M18 6l-2 2 M8 16l-2 2',
 aegis:'M12 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6z M9 12l2 2 4-4',
 scythe:'M5 19c8 0 12-5 12-13 M17 6a3 3 0 0 0-3-3 M5 19l3-1',
 wing:'M12 5v14 M12 8c-3-3-7-3-9-1 2 1 3 4 9 5 M12 8c3-3 7-3 9-1-2 1-3 4-9 5',
 beam:'M3 12h18 M7 8l-2 4 2 4 M17 8l2 4-2 4',
 voidh:'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0 M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
 star:'M12 3l2.6 6.2L21 10l-5 4.4L17.4 21 12 17.3 6.6 21 8 14.4 3 10l6.4-.8z',
 hand:'M8 13V6a1.4 1.4 0 0 1 2.8 0v5 M10.8 11V5a1.4 1.4 0 0 1 2.8 0v6 M13.6 11V6a1.4 1.4 0 0 1 2.8 0v8c0 3-2 5.5-5 5.5s-5-2-6-4l-1.6-3.2a1.4 1.4 0 0 1 2.4-1.4L8 13',
};
function svgIcon(key,color,size){size=size||22;const d=ICONS[key]||ICONS.star;return '<svg viewBox="0 0 24 24" width="'+size+'" height="'+size+'" fill="none" stroke="'+(color||'#d8cdb8')+'" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="'+d+'"/></svg>';}

/* ---------- WEAPONS (Shop, mit Gold gekauft) ---------- */
const WEAPONS=[
 {id:'revolver',name:'Rostiger Revolver',rk:'common',ic:'bullet',dmg:13,fr:380,spd:620,count:1,spread:0.03,pierce:0,size:5,kb:140,color:C.bone},
 {id:'scatter',name:'Schädelbrecher',rk:'common',ic:'spread',dmg:6,fr:760,spd:560,count:6,spread:0.55,pierce:0,size:4,kb:120,life:0.42,pattern:'random',color:C.candle},
 {id:'witchfire',name:'Hexenfeuer',rk:'common',ic:'witch',dmg:5,fr:130,spd:720,count:1,spread:0.09,pierce:0,size:5,kb:50,color:C.sick},
 {id:'nailgun',name:'Nagelkanzel',rk:'common',ic:'nail',dmg:3.6,fr:90,spd:780,count:1,spread:0.16,pierce:0,size:3,kb:30,color:C.steel},
 {id:'handcannon',name:'Donnerbüchse',rk:'uncommon',ic:'cannon',dmg:40,fr:900,spd:560,count:1,spread:0.02,pierce:1,size:9,kb:340,color:C.gold2},
 {id:'bolt',name:'Geißelbogen',rk:'uncommon',ic:'bolt',dmg:17,fr:520,spd:840,count:1,spread:0.02,pierce:2,size:5,kb:90,color:C.blood2},
 {id:'flame',name:'Läuterungsflamme',rk:'uncommon',ic:'flame',dmg:2.2,fr:42,spd:340,count:1,spread:0.28,pierce:2,size:7,kb:10,life:0.34,burn:true,color:C.candle},
 {id:'plague',name:'Seuchenmörser',rk:'uncommon',ic:'plague',dmg:9,fr:850,spd:430,count:1,spread:0.03,pierce:0,size:7,kb:60,puddle:true,color:C.sick},
 {id:'trinity',name:'Dreifaltigkeit',rk:'rare',ic:'trinity',dmg:11,fr:420,spd:700,count:3,spread:0.20,pierce:1,size:5,kb:90,pattern:'even',color:C.gold2},
 {id:'wrath',name:'Zorn des Heiligen',rk:'rare',ic:'lightning',dmg:13,fr:600,spd:900,count:1,spread:0.02,pierce:0,size:5,kb:60,chain:true,color:'#bcd6ff'},
 {id:'gatling',name:'Weihrauch-Gatling',rk:'rare',ic:'gatling',dmg:4.6,fr:150,frMin:55,spd:760,count:1,spread:0.12,pierce:0,size:4,kb:40,ramp:true,color:C.gold},
 {id:'lance',name:'Heilige Lanze',rk:'rare',ic:'lance',dmg:26,fr:300,spd:920,count:1,spread:0.01,pierce:99,size:6,kb:160,color:C.gold2},
 {id:'shardstorm',name:'Splittersturm',rk:'ultrarare',ic:'snow',dmg:7,fr:520,spd:680,count:5,spread:0.42,pierce:1,size:4,kb:60,slow:true,pattern:'even',color:C.chill},
 {id:'frostlance',name:'Frostpike',rk:'ultrarare',ic:'beam',dmg:22,fr:330,spd:980,count:1,spread:0.01,pierce:4,size:6,kb:120,slow:true,color:'#a8e8ff'},
 {id:'reaper',name:'Sensenwurf',rk:'epic',ic:'scythe',dmg:34,fr:560,spd:560,count:2,spread:0.16,pierce:6,size:8,kb:140,pattern:'even',color:'#cfd6d0'},
 {id:'seraph',name:'Seraphsalve',rk:'epic',ic:'wing',dmg:14,fr:300,spd:820,count:4,spread:0.5,pierce:1,size:5,kb:70,pattern:'even',color:'#ffe0a0'},
 {id:'judgement',name:'Jüngstes Gericht',rk:'legendary',ic:'beam',dmg:52,fr:520,spd:1200,count:1,spread:0,pierce:99,size:9,kb:220,color:'#fff2c0'},
 {id:'tempest',name:'Sturm der Engel',rk:'legendary',ic:'lightning',dmg:20,fr:240,spd:1000,count:2,spread:0.3,pierce:0,size:5,kb:60,chain:true,pattern:'even',color:'#cfe0ff'},
 {id:'apocalypse',name:'Apokalypse',rk:'mythic',ic:'explosion',dmg:30,fr:300,spd:720,count:3,spread:0.26,pierce:2,size:7,kb:160,explosive:true,burn:true,pattern:'even',color:C.candle},
 {id:'voidmaw',name:'Schlund der Leere',rk:'mythic',ic:'voidh',dmg:44,fr:420,spd:600,count:1,spread:0.02,pierce:99,size:11,kb:260,explosive:true,color:'#c89bff'},
 {id:'godhand',name:'Hand Gottes',rk:'godlike',ic:'hand',dmg:60,fr:150,spd:1000,count:3,spread:0.18,pierce:99,size:8,kb:200,chain:true,explosive:true,burn:true,pattern:'even',color:'#ffe9a0'},
 /* --- NEUE WAFFENTYPEN (Phase 6): Geschütze/Totems/Minen/Begleiter/Laser --- */
 {id:'sentry',   name:'Geschützturm',     rk:'rare',     ic:'gatling',   deploy:'turret',   deployMax:2,deployLife:9, deployFire:300,dmg:7, spd:720,count:1,spread:0.05,pierce:0,size:4,fr:1500,kb:40,color:C.steel},
 {id:'totem',    name:'Totem der Qual',   rk:'rare',     ic:'nova',      deploy:'totem',    deployMax:2,deployLife:11,deployFire:900,dmg:13,spd:0,  count:1,spread:0,   pierce:0,size:5,fr:1700,kb:40,novaR:96,burn:true,color:C.candle},
 {id:'minelayer',name:'Minenleger',       rk:'uncommon', ic:'explosion', deploy:'mine',     deployMax:6,deployLife:16,             dmg:22,spd:0,  count:1,spread:0,   pierce:0,size:7,fr:650, kb:0, explosive:true,color:C.blood2},
 {id:'familiar', name:'Höllenbrut',       rk:'epic',     ic:'ghost',     deploy:'companion',deployMax:2,deployLife:18,deployFire:420,dmg:8, spd:780,count:1,spread:0.06,pierce:1,size:4,fr:2200,kb:30,color:'#c89bff'},
 {id:'laser',    name:'Läuterungsstrahl', rk:'rare',     ic:'beam',      beam:true,         dmg:8, spd:780,count:1,spread:0,pierce:99,size:7,fr:95, kb:30,burn:true,color:'#ff5a6a'},
 {id:'railspike',name:'Schienennagel',    rk:'epic',     ic:'lance',     dmg:46,fr:620,spd:1300,count:1,spread:0,pierce:99,size:6,kb:160,color:'#cfe0ff'},
 {id:'stormcaller',name:'Sturmrufer',     rk:'epic',     ic:'lightning', dmg:14,fr:300,spd:1000,count:1,spread:0.03,pierce:0,size:5,kb:50,chain:true,color:'#9bbcff'},
 /* --- EVOLVIERTE WAFFEN (nur durch Verschmelzung, nicht im normalen Shop) --- */
 {id:'pestburst',name:'Seuchenschlund',rk:'mythic',evo:true,ic:'plague',dmg:14,fr:560,spd:520,count:7,spread:0.5,pierce:1,size:6,kb:120,puddle:true,burn:true,pattern:'even',color:C.sick},
 {id:'reckoning',name:'Vergeltung',rk:'epic',evo:true,ic:'bolt',dmg:30,fr:300,spd:980,count:1,spread:0.01,pierce:5,size:6,kb:200,chain:true,color:C.blood2},
 {id:'hellwitch',name:'Höllenhexe',rk:'epic',evo:true,ic:'witch',dmg:6,fr:70,spd:760,count:2,spread:0.14,pierce:2,size:5,kb:40,burn:true,pattern:'even',color:C.candle},
 {id:'naildriver',name:'Sturmnagler',rk:'legendary',evo:true,ic:'gatling',dmg:6,fr:55,frMin:38,spd:900,count:1,spread:0.1,pierce:1,size:4,kb:50,ramp:true,slow:true,color:C.steel},
 {id:'godsedge',name:'Götterzorn',rk:'legendary',evo:true,ic:'trinity',dmg:18,fr:360,spd:920,count:3,spread:0.22,pierce:2,size:6,kb:120,chain:true,pattern:'even',color:C.gold2},
 /* --- BOSS-WAFFEN (abgespeckt, nur via Boss-Freischaltung, nicht im Shop) --- */
 {id:'bw_preach',name:'Predigtkreis',rk:'epic',evo:true,ic:'nova',dmg:10,fr:680,spd:560,count:8,spread:0.8,pierce:0,size:5,kb:60,pattern:'even',color:C.blood2},
 {id:'bw_plague',name:'Madenbrut',rk:'epic',evo:true,ic:'plague',dmg:11,fr:600,spd:430,count:1,spread:0.05,pierce:0,size:8,kb:60,puddle:true,color:C.sick},
 {id:'bw_surgeon',name:'Skalpellfächer',rk:'epic',evo:true,ic:'spread',dmg:9,fr:500,spd:820,count:5,spread:0.32,pierce:1,size:4,kb:70,pattern:'even',slow:true,color:'#a8e8ff'},
 {id:'bw_lamb',name:'Wollgeißel',rk:'epic',evo:true,ic:'bolt',dmg:13,fr:150,spd:700,count:1,spread:0.04,pierce:1,size:5,kb:50,color:C.bone},
 {id:'bw_cross',name:'Kreuzsalve',rk:'epic',evo:true,ic:'trinity',dmg:16,fr:520,spd:760,count:4,spread:0.5,pierce:1,size:5,kb:90,pattern:'even',color:C.gold2},
];
const weaponById=id=>WEAPONS.find(w=>w.id===id);
const RARITY_PRICE=[28,52,90,150,240,400,650,1100];
const WEAPON_CAP=5, WEAPON_MAX_LEVEL=10, EVO_LEVEL_REQ=5;
const WEAPON_EVOS=[
 {a:'scatter',b:'plague',result:'pestburst'},
 {a:'revolver',b:'bolt',result:'reckoning'},
 {a:'witchfire',b:'flame',result:'hellwitch'},
 {a:'nailgun',b:'gatling',result:'naildriver'},
 {a:'trinity',b:'wrath',result:'godsedge'},
];
function weaponPrice(w){ return Math.round(RARITY_PRICE[rarRank(w.rk)]*(1+G.level*0.03)); }
function weaponLevel(id){ return (player.wLevel[id]||0)+1; }
function upgradePrice(w){ const lvl=weaponLevel(w.id); return Math.round(RARITY_PRICE[rarRank(w.rk)]*0.6*(1+lvl*0.28)*(1+G.level*0.02)); }
function availableWeaponEvos(){
  if(!player) return [];
  return WEAPON_EVOS.filter(r=> player.weapons.includes(r.a)&&player.weapons.includes(r.b)
    && weaponLevel(r.a)>=EVO_LEVEL_REQ && weaponLevel(r.b)>=EVO_LEVEL_REQ && !player.weapons.includes(r.result));
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
};
const ABILITY_LEVELS=[10,20,30,40,50];

/* ---------- CHARACTERS (Balancing angepasst) ---------- */
const CHARS=[
 {id:'penitent',name:'Der Büßer',role:'Ausgewogen',weapon:'revolver',lore:'Trägt die Schuld eines ganzen Dorfes. Ein verlässlicher Revolver, ein ruhiger Schritt.',hp:110,speed:1.0,dmg:1.0,fr:1.0},
 {id:'executioner',name:'Der Henker',role:'Panzer',weapon:'scatter',lore:'Hat tausend Seelen zur Ruhe gebracht. Langsam, doch kaum etwas wirft ihn um.',hp:165,speed:0.8,dmg:0.95,fr:1.0,armor:3},
 {id:'heretic',name:'Die Ketzerin',role:'Glaskanone',weapon:'witchfire',lore:'Sprach mit Dingen jenseits der Mauer. Tödlich — aber zerbrechlich wie Glas.',hp:52,speed:1.16,dmg:1.26,fr:0.92},
 {id:'plaguepriest',name:'Der Pestpriester',role:'Seuche',weapon:'plague',lore:'Predigt das Wort der Fäulnis. Seine Wunden brennen lange, nachdem er sie schlug.',hp:100,speed:0.95,dmg:1.0,fr:1.0,burn:true},
 /* --- FREISCHALTBARE CHARAKTERE (skin = wiederverwendetes Hero-Design bis Phase 6 Redesign) --- */
 {id:'crusader',name:'Der Kreuzritter',role:'Bollwerk',weapon:'handcannon',lore:'Trug das Banner durch zehn Schlachten und ließ es nie sinken.',hp:130,speed:1.0,dmg:1.05,fr:1.0,armor:1,skin:'penitent',unlock:{level:10}},
 {id:'flagellant',name:'Der Flagellant',role:'Panzer',weapon:'nailgun',lore:'Jede Wunde, die er austeilt, hat er sich erst selbst geschlagen.',hp:155,speed:0.9,dmg:1.0,fr:1.1,skin:'executioner',unlock:{level:20}},
 {id:'inquisitor',name:'Der Inquisitor',role:'Glaskanone',weapon:'bolt',lore:'Findet die Ketzerei in jedem Herzen — und brennt sie heraus.',hp:70,speed:1.1,dmg:1.3,fr:0.95,skin:'heretic',unlock:{level:30}},
 {id:'martyr',name:'Die Märtyrerin',role:'Berserker',weapon:'lance',lore:'Je näher dem Tod, desto heller ihr Zorn.',hp:85,speed:1.08,dmg:1.2,fr:1.0,skin:'penitent',unlock:{level:40}},
 {id:'saint',name:'Der Geheiligte',role:'Endzeit',weapon:'wrath',lore:'Hat den Gipfel gesehen und ist zurückgekehrt, um ihn niederzubrennen.',hp:120,speed:1.05,dmg:1.25,fr:0.95,skin:'heretic',unlock:{level:50}},
 {id:'gunslinger',name:'Der Revolverheld',role:'Schütze',weapon:'trinity',lore:'Tausend Tote tragen seine Kugeln. Er zählt nicht mehr mit.',hp:100,speed:1.1,dmg:1.1,fr:0.92,skin:'penitent',unlock:{weapon:'revolver',kills:1000}},
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
const BOSS_KINDS=['preacher','maggot','surgeon','lamb','crucified'];

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
];
const curseById=id=>CURSE_DEFS.find(c=>c.id===id);

/* ---------- PHASE 3: GLOBALE META-PROGRESSION (Seelen) ---------- */
const META_UPGRADES=[
 {id:'dmg',   ic:'sword'},  {id:'hp',  ic:'heart'}, {id:'speed',ic:'boot'},
 {id:'fr',    ic:'clock'},  {id:'gold',ic:'crown'}, {id:'xp',   ic:'star'},
];
const META_MAX=20;                                  // +5% pro Stufe → max +100%
const metaCost=lvl=>10+lvl*8;                       // Seelen für die NÄCHSTE Stufe
function metaName(id){ return t('m_'+id); }
function metaLevel(id){ const m=DB.current&&DB.current.meta&&DB.current.meta.levels; return (m&&m[id])||0; }
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

/* =========================================================================
   DATENBANK (lokal, pro Gerät)
   ========================================================================= */
/* Server (server.py + SQLite) ist die Quelle der Wahrheit, sobald über http(s) ausgeliefert.
   localStorage dient als Offline-Fallback/Cache, falls die Seite statisch geöffnet wird. */
const DB=(()=>{
  const KEY='golgotha_db_v1';
  const API=(location.protocol==='http:'||location.protocol==='https:')?'/api':null;
  let current=null, token=null, online=false;
  function loadLocal(){try{return JSON.parse(localStorage.getItem(KEY))||{users:{}};}catch(e){return {users:{}};}}
  let local=loadLocal();
  function saveLocal(){try{localStorage.setItem(KEY,JSON.stringify(local));}catch(e){}}
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
  function newStats(){return {runs:0,kills:0,gold:0,bestLevel:0,bestCharLevel:0,deaths:0,wins:0,bossKills:0,playTime:0};}
  function blankProfile(name){return {name,stats:newStats(),unlocks:{},achievements:{},meta:{currency:0,levels:{}}};}
  function fill(p){ p.stats=p.stats||newStats(); p.unlocks=p.unlocks||{}; p.achievements=p.achievements||{}; p.meta=p.meta||{currency:0,levels:{}}; if(!p.meta.levels)p.meta.levels={}; return p; }
  function dataOf(p){ return {stats:p.stats,unlocks:p.unlocks,achievements:p.achievements,meta:p.meta}; }
  function cache(){ if(!current)return; const k=current.name.toLowerCase(); const prev=local.users[k]||{}; const m=Object.assign({},current); if(prev.pass)m.pass=prev.pass; local.users[k]=m; saveLocal(); }
  function persist(){ if(!current)return; cache(); if(API&&online&&token) api('/save',{token,data:dataOf(current)}).catch(()=>{}); }
  async function api(path,body){ const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); return r.json(); }
  return {
    async register(u,p){ u=(u||'').trim(); if(u.length<2)return 'Name zu kurz (min. 2)'; if(!p)return 'Losungswort fehlt';
      if(API){ try{ const res=await api('/register',{user:u,pass:p}); if(res.error)return res.error; current=fill(res.profile); token=res.token; online=true; cache(); return null; }catch(e){} }
      if(local.users[u.toLowerCase()])return 'Pilger existiert bereits';
      current=fill(Object.assign(blankProfile(u),{pass:hash(p)})); local.users[u.toLowerCase()]=current; saveLocal(); online=false; return null; },
    async login(u,p){ u=(u||'').trim();
      if(API){ try{ const res=await api('/login',{user:u,pass:p}); if(res.error)return res.error; current=fill(res.profile); token=res.token; online=true; cache(); return null; }catch(e){} }
      const rec=local.users[u.toLowerCase()]; if(!rec)return 'Unbekannter Pilger'; if(rec.pass!==hash(p))return 'Falsches Losungswort'; current=fill(rec); online=false; return null; },
    logout(){current=null;token=null;online=false;},
    get current(){return current;},
    get online(){return online;},
    save(){ persist(); },
    commit(run){ if(!current)return; const s=current.stats;
      if(!run.continued)s.runs++; s.kills+=run.kills||0; s.gold+=run.gold||0; s.bossKills+=run.bossKills||0; s.playTime+=run.time||0;
      s.bestLevel=Math.max(s.bestLevel,run.level||0); s.bestCharLevel=Math.max(s.bestCharLevel,run.charLevel||0);
      if(run.died)s.deaths++; if(run.won)s.wins++;
      if(run.weaponKills){ s.weaponKills=s.weaponKills||{}; for(const k in run.weaponKills) s.weaponKills[k]=(s.weaponKills[k]||0)+run.weaponKills[k]; }
      if(run.bossKinds){ s.bossKinds=s.bossKinds||{}; for(const k in run.bossKinds) s.bossKinds[k]=true; }
      if(run.heresyWin) s.heresyWins=(s.heresyWins||0)+1;
      persist(); }
  };
})();

/* ---------- INPUT ---------- */
const keys={};
addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
    if(document.activeElement && document.activeElement.tagName==='INPUT') {} else e.preventDefault();
  }
  if(document.activeElement && document.activeElement.tagName==='INPUT') return;
  keys[e.code]=true; initAudio();
  const deck={shop:'#shopCards',upgrade:'#upgradeCards',ability:'#abilityCards'}[G.state];
  if(deck && !e.repeat && performance.now()-(G.menuAt||0)>250){   // Sperre: kein versehentliches Wählen beim Öffnen
    const n=['Digit1','Digit2','Digit3'].indexOf(e.code)>=0?+e.code.slice(5)-1:['Numpad1','Numpad2','Numpad3'].indexOf(e.code);
    if(n>=0){ const c=document.querySelectorAll(deck+' .rcard')[n]; if(c&&!c.classList.contains('locked'))c.click(); return; }
    if(G.state==='shop'&&e.code==='KeyR'){ $('#shopReroll').click(); return; }
    if(G.state==='shop'&&e.code==='Enter'){ $('#shopSkip').click(); return; }
  }
  if(e.code==='KeyP'){ if(G.state==='playing')togglePause(true); else if(G.state==='paused')togglePause(false); }
  if(e.code==='Space') tryDash(players[0]);
  if((e.code==='ShiftRight'||e.code==='Enter'||e.code==='Numpad0') && G.coop && players[1]) tryDash(players[1]);   // P2 Ausweichen
  if(e.code==='F3'){ e.preventDefault(); toggleDbg(); return; }
  if(e.code==='Escape'){ if(G.state==='playing')togglePause(true); else if(G.state==='paused')togglePause(false); else if(G.state==='stats')closeStats(); }
});
addEventListener('keyup',e=>{keys[e.code]=false;});
cv.addEventListener('mousedown',()=>initAudio());
cv.addEventListener('contextmenu',e=>e.preventDefault());
head.addEventListener('click',()=>{ if(G.state==='playing')openStats(); });

/* ---------- TOUCH: virtueller Stick (linke Hälfte), Ausweich-Knopf rechts; Zielen ist ohnehin automatisch ---------- */
const TouchJoy={id:null,ox:0,oy:0,dx:0,dy:0};
if(matchMedia('(pointer:coarse)').matches) document.body.classList.add('touch');
(function(){ const st=$('#stage'), R=46;
  const pos=tc=>{ const r=st.getBoundingClientRect(); return {x:tc.clientX-r.left,y:tc.clientY-r.top}; };
  st.addEventListener('touchstart',e=>{ initAudio(); if(G.state!=='playing'||TouchJoy.id!==null||e.target.closest('button,#headCanvas'))return;
    const tc=e.changedTouches[0], p=pos(tc); if(p.x>st.clientWidth*0.55)return;
    TouchJoy.id=tc.identifier; TouchJoy.ox=p.x; TouchJoy.oy=p.y; TouchJoy.dx=TouchJoy.dy=0;
    const j=$('#joy'); j.style.left=p.x+'px'; j.style.top=p.y+'px'; j.classList.add('on'); $('#joyKnob').style.transform='translate(-50%,-50%)'; e.preventDefault(); },{passive:false});
  st.addEventListener('touchmove',e=>{ for(const tc of e.changedTouches){ if(tc.identifier!==TouchJoy.id)continue; const p=pos(tc);
    let dx=p.x-TouchJoy.ox, dy=p.y-TouchJoy.oy; const m=Math.hypot(dx,dy); if(m>R){dx=dx/m*R;dy=dy/m*R;}
    TouchJoy.dx=m>8?dx/R:0; TouchJoy.dy=m>8?dy/R:0; $('#joyKnob').style.transform='translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px))'; e.preventDefault(); } },{passive:false});
  const end=e=>{ for(const tc of e.changedTouches) if(tc.identifier===TouchJoy.id){ TouchJoy.id=null; TouchJoy.dx=TouchJoy.dy=0; $('#joy').classList.remove('on'); } };
  st.addEventListener('touchend',end); st.addEventListener('touchcancel',end);
  $('#dashBtn').addEventListener('touchstart',e=>{ e.preventDefault(); initAudio(); tryDash(players[0]); },{passive:false});
})();

/* ---------- AUDIO ---------- */
const Audio2=(()=>{let ctx=null;const ac=()=>{if(!ctx)try{ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}return ctx;};
  function s(f,d,t='square',g=0.03){const c=ac();if(!c)return;const o=c.createOscillator(),gn=c.createGain();o.type=t;o.frequency.value=f;o.connect(gn);gn.connect(c.destination);const n=c.currentTime;gn.gain.setValueAtTime(g,n);gn.gain.exponentialRampToValueAtTime(0.0001,n+d);o.start(n);o.stop(n+d);}
  return{init:ac,shoot:()=>s(150+Math.random()*40,0.05,'square',0.010),hit:()=>s(90,0.04,'sawtooth',0.018),
    hurt:()=>s(70,0.18,'sawtooth',0.05),kill:()=>s(120,0.08,'triangle',0.028),dash:()=>s(280,0.12,'sine',0.03),
    boss:()=>s(50,0.5,'sawtooth',0.05),buy:()=>[0,7].forEach((x,i)=>setTimeout(()=>s(520*Math.pow(2,x/12),0.1,'triangle',0.04),i*60)),
    lvl:()=>[0,4,7].forEach((x,i)=>setTimeout(()=>s(440*Math.pow(2,x/12),0.14,'triangle',0.04),i*70)),
    ability:()=>[0,5,9,12].forEach((x,i)=>setTimeout(()=>s(392*Math.pow(2,x/12),0.18,'sine',0.04),i*80)),
    win:()=>[0,4,7,12].forEach((x,i)=>setTimeout(()=>s(330*Math.pow(2,x/12),0.2,'triangle',0.04),i*90)),
    coin:()=>s(880,0.04,'triangle',0.013)};})();
function initAudio(){Audio2.init();}

/* =========================================================================
   PLAYER
   ========================================================================= */
function xpForLevel(l){return Math.floor(6 + (l-1)*5 + (l-1)*(l-1)*0.8);}
function makePlayer(charId,ctrl){
  const ch=charById(charId);
  return {x:WORLD.w/2,y:WORLD.h/2,r:13,charId:charId,ctrl:ctrl||'solo',dead:false,pendingUp:0,pendingAb:0,
    maxHP:ch.hp,hp:ch.hp,speed:215*(ch.speed||1),
    dmgMult:(ch.dmg||1),frMult:(ch.fr||1),projSpeed:1,projSize:1,
    pierce:0,multishot:0,lifesteal:0,thorns:(ch.thorns||0),crit:0.04,critMult:2.0,
    armor:(ch.armor||0),kbMult:1,homing:0,burn:!!ch.burn,slow:false,explosive:false,
    luck:0,goldMult:1,xpMult:1,
    weapons:[ch.weapon],wLevel:{},wCd:[0],heldTime:0,
    invuln:0,dashCd:0,dashTime:0,dashDir:{x:1,y:0},aim:0,
    level:1,xp:0,xpNext:xpForLevel(1),items:[],abilities:[],
    /* ability state */
    orbitN:0,orbitDmg:0,orbitR:46,orbitAng:0,
    novaDmg:0,novaCd:3,novaR:120,novaT:3,novaColor:C.gold2,
    shield:0,shieldMax:0,shieldRegT:0,
    execPct:0,frenzy:false,frenzyPow:0,frenzyActive:false,
    revive:0,auraDps:0,auraR:0,
    statuses:{poison:{t:0,dps:0},burn:{t:0,dps:0},chill:{t:0,mult:1}}};
}
function giveWeapon(id){ if(!player)return;
  if(!player.weapons.includes(id)){player.weapons.push(id);player.wCd.push(0);}
  else {player.wLevel[id]=Math.min(WEAPON_MAX_LEVEL-1,(player.wLevel[id]||0)+1);}
  updateWeaponBar(); }
function giveUpgradeDef(def,rk){ if(!player)return; const r=rarRank(rk); def.apply(player,r); player.hp=clamp(player.hp,0,player.maxHP);
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
  const mlen=Math.hypot(dx,dy);
  const tgt=nearestEnemy(p.x,p.y);
  if(tgt) p.aim=Math.atan2(tgt.y-p.y,tgt.x-p.x);
  else if(mlen>0) p.aim=Math.atan2(dy,dx);
  const chillMult=p.statuses.chill.t>0?p.statuses.chill.mult:1;
  const frenzyMove=p.frenzyActive?(1+p.frenzyPow):1;
  if(p.dashTime>0){p.dashTime-=dt;p.x+=p.dashDir.x*DASH_SPEED*dt;p.y+=p.dashDir.y*DASH_SPEED*dt;if(Math.random()<0.6)spawnParticle(p.x,p.y,'rgba(224,178,90,.5)',2,40);}
  else if(mlen>0){p.x+=(dx/mlen)*p.speed*chillMult*frenzyMove*dt;p.y+=(dy/mlen)*p.speed*chillMult*frenzyMove*dt;}
  collideObstacles(p);
  p.x=clamp(p.x,ROOM.x+p.r,ROOM.x+ROOM.w-p.r);p.y=clamp(p.y,ROOM.y+p.r,ROOM.y+ROOM.h-p.r);
  if(p.invuln>0)p.invuln-=dt;if(p.dashCd>0)p.dashCd-=dt;
  if(tgt) p.heldTime+=dt; else p.heldTime=Math.max(0,p.heldTime-dt*2);
  const frMul=p.frMult*(p.frenzyActive?(1-p.frenzyPow*0.5):1);
  for(let i=0;i<p.weapons.length;i++){
    p.wCd[i]-=dt;
    const w=weaponById(p.weapons[i]);
    if(p.wCd[i]<=0 && (tgt || w.deploy)){
      if(w.deploy) deployFromWeapon(w);
      else fireWeapon(w,Math.atan2(tgt.y-p.y,tgt.x-p.x));
      let fr=w.fr; if(w.ramp)fr=lerp(w.fr,w.frMin,clamp(p.heldTime/1.4,0,1));
      p.wCd[i]=(fr*frMul)/1000; (p.wCdMax||(p.wCdMax=[]))[i]=p.wCd[i];
    }
  }
  if(p.ctrl!=='p2') $('#dashPip').classList.toggle('ready',p.dashCd<=0||Admin.dash);
}
function weaponDamage(w){ const lvl=player.wLevel[w.id]||0; return w.dmg*(1+lvl*0.22); }
function fireWeapon(w,base){
  if(w.beam){ fireBeam(w,base); return; }
  const p=player, n=w.count+p.multishot, total=w.spread*(n-1);
  Audio2.shoot();
  const baseDmg=weaponDamage(w);
  const frenzyDmg=p.frenzyActive?(1+p.frenzyPow):1;
  const martyrDmg=(p.curseMartyr && p.hp<p.maxHP*0.5)?1.9:1;   // Fluch Märtyrertum: +90% unter 50% LP
  for(let i=0;i<n;i++){
    let ang;
    if(w.pattern==='even'&&n>1) ang=base-total/2+total*(i/(n-1));
    else ang=base+rand(-w.spread,w.spread);
    let dmg=baseDmg*p.dmgMult*frenzyDmg*martyrDmg*Admin.dmg, crit=false;
    if(Math.random()<p.crit){dmg*=p.critMult;crit=true;}
    const spd=w.spd*p.projSpeed, sz=w.size*p.projSize;
    bullets.push({id:uid++,x:p.x+Math.cos(ang)*16,y:p.y+Math.sin(ang)*16,
      vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,dmg,r:sz,
      pierce:w.pierce+p.pierce,life:w.life||1.8,kb:w.kb*p.kbMult,color:w.color,crit,
      burn:w.burn||p.burn,slow:w.slow||p.slow,explosive:w.explosive||p.explosive,chain:w.chain,puddle:w.puddle,
      wid:w.id,hitIds:new Set()});
  }
  if(w.kb>250)G.shake=Math.max(G.shake,2.5);
  spawnParticle(p.x+Math.cos(base)*16,p.y+Math.sin(base)*16,'rgba(255,220,150,.7)',2,30);
}

/* ---------- PHASE 6: LASERSTRAHL (sofortiger Treffer entlang einer Linie) ---------- */
function fireBeam(w,base){
  const p=player; Audio2.shoot();
  const len=w.spd||900, ex=p.x+Math.cos(base)*len, ey=p.y+Math.sin(base)*len;
  const frenzyDmg=p.frenzyActive?(1+p.frenzyPow):1, martyrDmg=(p.curseMartyr&&p.hp<p.maxHP*0.5)?1.9:1;
  let dmg=weaponDamage(w)*p.dmgMult*frenzyDmg*martyrDmg*Admin.dmg, crit=false;
  if(Math.random()<p.crit){dmg*=p.critMult;crit=true;}
  const rad=(w.size||6)*p.projSize;
  for(const e of enemies){ if(distToSeg(e.x,e.y,p.x,p.y,ex,ey)<e.r+rad){
    G._wid=w.id; damageEnemy(e,dmg,base,w.kb||40,true); G._wid=null;
    spawnFloater(e.x,e.y-e.r,Math.round(dmg),crit);
    if(w.burn||p.burn){e.burnT=2.0;e.burnDmg=Math.max(e.burnDmg,dmg*0.4+2);e.burnSrc=w.id;}
    if(w.slow||p.slow){e.slowT=1.4;} } }
  beams.push({x1:p.x,y1:p.y,x2:ex,y2:ey,t:0.09,color:w.color,width:rad*1.6});
}

/* ---------- PHASE 6: DEPLOYABLES (Geschütz/Totem/Mine/Begleiter) ---------- */
function deployFromWeapon(w){
  const p=player, max=w.deployMax||3;
  const mineList=deployables.filter(d=>d.wid===w.id);
  while(mineList.length>=max){ const old=mineList.shift(); const k=deployables.indexOf(old); if(k>=0)deployables.splice(k,1); }
  let x=p.x,y=p.y;
  if(w.deploy!=='companion'){ x=clamp(p.x+Math.cos(p.aim)*38,ROOM.x+12,ROOM.x+ROOM.w-12); y=clamp(p.y+Math.sin(p.aim)*38,ROOM.y+12,ROOM.y+ROOM.h-12); }
  const frenzyDmg=p.frenzyActive?(1+p.frenzyPow):1;
  deployables.push({kind:w.deploy,wid:w.id,x,y,r:w.deploy==='mine'?8:13,
    dmg:weaponDamage(w)*p.dmgMult*frenzyDmg*Admin.dmg, fireCd:(w.deployFire||600)/1000, fireT:0.3,
    life:w.deployLife||10, color:w.color, spd:(w.spd||640)*p.projSpeed, count:w.count||1, spread:w.spread||0,
    pierce:(w.pierce||0)+p.pierce, size:(w.size||5)*p.projSize, novaR:w.novaR||90,
    burn:w.burn||p.burn, slow:w.slow||p.slow, explosive:w.explosive||p.explosive, puddle:w.puddle, phase:rand(0,TAU)});
  for(let i=0;i<6;i++)spawnParticle(x,y,w.color,1.6,50);
}
function updateDeployables(dt){
  for(let i=deployables.length-1;i>=0;i--){ const d=deployables[i]; d.life-=dt;
    if(d.kind==='companion'){ const tx=player.x+Math.cos(G.uiTime*1.3+d.phase)*54, ty=player.y+Math.sin(G.uiTime*1.3+d.phase)*54;
      d.x+=(tx-d.x)*7*dt; d.y+=(ty-d.y)*7*dt; }
    if(d.kind==='turret'||d.kind==='companion'){ d.fireT-=dt; const tg=nearestEnemy(d.x,d.y);
      if(tg && d.fireT<=0){ deployShoot(d,Math.atan2(tg.y-d.y,tg.x-d.x)); d.fireT=d.fireCd; } }
    else if(d.kind==='totem'){ d.fireT-=dt; if(d.fireT<=0){ d.fireT=d.fireCd; doDeployNova(d); } }
    else if(d.kind==='mine'){ for(const e of enemies){ if(!e.isBoss && dist2(d.x,d.y,e.x,e.y)<(d.r+e.r+12)*(d.r+e.r+12)){ deployMineExplode(d); d.life=0; break; } } }
    if(d.life<=0) deployables.splice(i,1);
  }
}
function deployShoot(d,base){ const n=d.count, total=d.spread*(n-1);
  for(let i=0;i<n;i++){ const ang=(n>1)?base-total/2+total*(i/(n-1)):base+rand(-d.spread,d.spread);
    bullets.push({id:uid++,x:d.x,y:d.y,vx:Math.cos(ang)*d.spd,vy:Math.sin(ang)*d.spd,dmg:d.dmg,r:d.size,
      pierce:d.pierce,life:1.6,kb:60,color:d.color,crit:false,burn:d.burn,slow:d.slow,explosive:d.explosive,puddle:d.puddle,wid:d.wid,hitIds:new Set()}); }
  Audio2.shoot();
}
function doDeployNova(d){ novaRings.push({x:d.x,y:d.y,r:10,max:d.novaR,t:0.4,color:d.color});
  for(const e of enemies){ if(dist2(d.x,d.y,e.x,e.y)<d.novaR*d.novaR){ G._wid=d.wid; damageEnemy(e,d.dmg,Math.atan2(e.y-d.y,e.x-d.x),50,false); G._wid=null;
    if(d.burn){e.burnT=2.0;e.burnDmg=Math.max(e.burnDmg,d.dmg*0.4+2);e.burnSrc=d.wid;} } }
  for(let k=0;k<6;k++){const a=rand(0,TAU);spawnParticle(d.x+Math.cos(a)*d.novaR*0.4,d.y+Math.sin(a)*d.novaR*0.4,d.color,1.6,80);}
}
function deployMineExplode(d){ G.shake=Math.max(G.shake,4); Audio2.boss();
  for(let i=0;i<14;i++)spawnParticle(d.x,d.y,d.color,rand(2,4),rand(100,220));
  novaRings.push({x:d.x,y:d.y,r:8,max:78,t:0.35,color:C.candle});
  for(const e of enemies){ if(dist2(d.x,d.y,e.x,e.y)<78*78){ G._wid=d.wid; damageEnemy(e,d.dmg*1.6,Math.atan2(e.y-d.y,e.x-d.x),120,false); G._wid=null; } }
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
      for(const e of enemies){ if(e._orbCd&&e._orbCd>0)continue; if(dist2(ox,oy,e.x,e.y)<(e.r+9)*(e.r+9)){ damageEnemy(e,p.orbitDmg,a,40,false,'orbit'); e._orbCd=0.22; spawnFloater(e.x,e.y-e.r,Math.round(p.orbitDmg),false);} } }
  }
  for(const e of enemies){ if(e._orbCd>0)e._orbCd-=dt; }
  if(p.novaDmg>0){ p.novaT-=dt; if(p.novaT<=0){ p.novaT=p.novaCd; doNova(); } }
  if(p.shieldMax>0){ p.shieldRegT-=dt; if(p.shieldRegT<=0 && p.shield<p.shieldMax){ p.shield=clamp(p.shield+p.shieldMax*0.30,0,p.shieldMax); p.shieldRegT=1.1; updateHP(); } }
  if(p.auraDps>0){ for(const e of enemies){ if(!e.isBoss && dist2(p.x,p.y,e.x,e.y)<p.auraR*p.auraR){ hurtEnemyRaw(e,p.auraDps*dt,'aura');} }
    if(Math.random()<0.4)spawnParticle(p.x+rand(-p.auraR,p.auraR),p.y+rand(-p.auraR,p.auraR),C.sick,1.2,20); }
}
function doNova(){ const p=player; G.shake=Math.max(G.shake,3);
  novaRings.push({x:p.x,y:p.y,r:14,max:p.novaR,t:0.45,color:p.novaColor});
  for(const e of enemies){ if(dist2(p.x,p.y,e.x,e.y)<p.novaR*p.novaR){ damageEnemy(e,p.novaDmg,Math.atan2(e.y-p.y,e.x-p.x),90,false,'nova');} }
  for(let i=0;i<10;i++){const a=rand(0,TAU);spawnParticle(p.x+Math.cos(a)*p.novaR*0.5,p.y+Math.sin(a)*p.novaR*0.5,p.novaColor,2,120);}
}
function doRevive(who){ const p=who||player; p.revive--; p.hp=p.maxHP*0.55; p.invuln=2.2; p.shield=p.shieldMax; clearStatuses(p);
  G.shake=10; Audio2.ability(); for(let i=0;i<40;i++)spawnParticle(p.x,p.y,pick([C.gold2,C.bone,'#fff']),rand(2,4),rand(120,300)); updateHP(); }

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
  const e={id:uid++,type,x,y,r:t.r,maxHp:t.hp*sc.hp*(opts.hpMult||1)*dH,hp:0,speed:t.speed*sc.spd,
    dmg:(t.dmg||0)*sc.dmg*dD,color:t.color,touch:!!t.touch,touchCd:0,fireCd:rand(0.4,(t.fireCd||1)),
    slowT:0,burnT:0,burnDmg:0,hitFlash:0,name:t.name,isBoss:false,bspd:(t.bspd||0),bdmg:(t.bdmg||0)*sc.dmg*dD,
    ranged:t.ranged,lob:t.lob,explode:t.explode,edmg:(t.edmg||0)*sc.dmg*dD,
    fly:t.fly,support:t.support,heal:t.heal,summon:t.summon,healAmt:(t.healAmt||0)*sc.hp,
    xpValue:t.xp||1,wob:rand(0,TAU),_orbCd:0};
  e.hp=e.maxHp; enemies.push(e); return e;
}
function updateEnemy(e,dt){
  const p=nearestPlayer(e.x,e.y)||player;   // Gegner zielen auf nächsten lebenden Spieler
  if(e.slowT>0)e.slowT-=dt;
  if(e.hitFlash>0)e.hitFlash-=dt;
  if(e.burnT>0){ e.burnT-=dt; const bh=e.hp; e.hp-=e.burnDmg*dt; trackDmg(e,bh,e.burnSrc||'burn'); if(Math.random()<0.3)spawnParticle(e.x,e.y,C.candle,1.5,30); if(e.hp<=0){killEnemy(e);return;} }
  const sp=e.speed*(e.slowT>0?0.45:1)*(G.modEnemySpeed||1);
  const ang=Math.atan2(p.y-e.y,p.x-e.x), d=Math.hypot(p.x-e.x,p.y-e.y);
  if(e.isBoss){ updateBoss(e,dt); }
  else if(e.ranged){
    const want=220;
    if(d<want-30){ e.x-=Math.cos(ang)*sp*dt; e.y-=Math.sin(ang)*sp*dt; }
    else if(d>want+30){ e.x+=Math.cos(ang)*sp*0.6*dt; e.y+=Math.sin(ang)*sp*0.6*dt; }
    e.fireCd-=dt;
    if(e.fireCd<=0 && !Admin.noFire){ e.fireCd=ETYPES[e.type].fireCd*rand(.8,1.2)/(diffMul('fireRate')*G.curseFire); enemyShoot(e,ang); }
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
  } else { e.x+=Math.cos(ang)*sp*dt; e.y+=Math.sin(ang)*sp*dt; }
  if(!e.isBoss && !e.fly) collideObstacles(e);   // Flieger ignorieren Hindernisse
  e.x=clamp(e.x,ROOM.x+e.r,ROOM.x+ROOM.w-e.r); e.y=clamp(e.y,ROOM.y+e.r,ROOM.y+ROOM.h-e.r);
  if((e.touch||e.isBoss)&&e.touchCd<=0&&d<e.r+p.r){
    hurtPlayer(e.isBoss?(e.dmg||14):e.dmg, p); e.touchCd=0.6;
    e.x-=Math.cos(ang)*10; e.y-=Math.sin(ang)*10;
    if(p.thorns>0) damageEnemy(e,p.thorns,ang,40,false,'thorns');
  }
  if(e.touchCd>0)e.touchCd-=dt;
}
function enemyShoot(e,ang){
  if(e.lob){ ebullets.push({x:e.x,y:e.y,vx:Math.cos(ang)*e.bspd,vy:Math.sin(ang)*e.bspd,r:6,dmg:e.bdmg,life:3,lob:true,color:C.sick,startD:0,maxD:Math.hypot(player.x-e.x,player.y-e.y)}); }
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
function damageEnemy(e,dmg,ang,kb,fromBullet,src){
  if(Admin.one&&fromBullet)dmg=e.maxHp*99;
  src=src||G._wid; let before=e.hp;
  e.hp-=dmg; e.hitFlash=0.08;
  if(kb){ e.x+=Math.cos(ang)*kb*0.04; e.y+=Math.sin(ang)*kb*0.04;
    e.x=clamp(e.x,ROOM.x+e.r,ROOM.x+ROOM.w-e.r); e.y=clamp(e.y,ROOM.y+e.r,ROOM.y+ROOM.h-e.r); }
  if(!e.isBoss && player.execPct>0 && e.hp>0 && e.hp<e.maxHp*player.execPct){ trackDmg(e,before,src); before=e.hp; src='exec'; e.hp=0; spawnFloater(e.x,e.y-e.r-8,'✝',true); }
  trackDmg(e,before,src);
  if(e.hp<=0) killEnemy(e);
}
/* Schaden ohne Treffer-Effekte (Brand-, Aura-, Pfützen-Ticks) — läuft trotzdem durch die Messung */
function hurtEnemyRaw(e,amt,src){ const before=e.hp; e.hp-=amt; trackDmg(e,before,src); if(e.hp<=0)killEnemy(e); }
function killEnemy(e){
  if(e.isBoss){ bossDefeated(e); return; }
  G.kills++; if(G.run){G.run.kills++; if(G._wid){G.run.weaponKills[G._wid]=(G.run.weaponKills[G._wid]||0)+1;}} $('#killTag').textContent=G.kills; Audio2.kill();
  for(let i=0;i<10;i++)spawnParticle(e.x,e.y,e.color,rand(1.5,3),rand(60,160));
  const rm=G.rewardMul||1;
  spawnPickup(e.x,e.y,'xp',Math.max(1,Math.round((e.xpValue||1)*rm)));
  const gm=player?player.goldMult:1;
  if(Math.random()<0.8) spawnPickup(e.x,e.y,'coin',Math.max(1,Math.round(randInt(1,3)*gm*rm)));
  if(Math.random()<0.07) spawnPickup(e.x,e.y,'health',randInt(8,14));
  if(player.lifesteal>0){ player.hp=clamp(player.hp+player.lifesteal,0,player.maxHP); updateHP(); }
  removeEnemy(e);
}
function removeEnemy(e){ const i=enemies.indexOf(e); if(i>=0)enemies.splice(i,1); }

/* =========================================================================
   BOSSE — eigene Designs & Muster
   ========================================================================= */
function spawnBoss(lvl){
  const idx=clamp(Math.floor(lvl/5)-1,0,BOSS_NAMES.length-1);
  const kind=BOSS_KINDS[idx%BOSS_KINDS.length];
  const sc=scaleFor(lvl);
  const e={id:uid++,type:'boss',isBoss:true,bossKind:kind,bossIdx:idx,x:WORLD.w/2,y:ROOM.y+120,r:36,
    maxHp:Math.round(460*sc.hp*(1+idx*0.16)*diffMul('enemyHp')),hp:0,speed:46+idx*3,dmg:18*sc.dmg*diffMul('enemyDmg'),
    color:C.blood2,touchCd:0,slowT:0,burnT:0,burnDmg:0,hitFlash:0,_orbCd:0,
    name:BOSS_NAMES[idx],atkCd:1.4,bspd:270+idx*12,bdmg:11*sc.dmg*diffMul('enemyDmg'),wob:0,spin:0,moveT:0,
    homeX:WORLD.w/2,homeY:ROOM.y+140,tpT:0,chargeT:0,charging:false,cdx:0,cdy:0};
  e.hp=e.maxHp; enemies.push(e); G.boss=e; G.bossMode=true;
  $('#bossName').textContent=e.name; $('#bossBarWrap').classList.add('show');
  Audio2.boss(); G.shake=8; return e;
}
function bshoot(e,a,spd,dmg,r,color){ ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:r||6,dmg:dmg,life:4,color:color||C.blood2}); }
function updateBoss(e,dt){
  e.atkCd-=dt; e.moveT+=dt; e.spin+=dt;
  const ang=Math.atan2(player.y-e.y,player.x-e.x);
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
function bossDefeated(e){
  G.bossMode=false; G.boss=null; $('#bossBarWrap').classList.remove('show');
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

/* =========================================================================
   BULLETS / PICKUPS / PARTICLES / PUDDLES
   ========================================================================= */
function nearestEnemy(x,y){let best=null,bd=1e9;for(const e of enemies){const d=dist2(x,y,e.x,e.y);if(d<bd){bd=d;best=e;}}return best;}
function updateBullets(dt){
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i]; b.life-=dt;
    /* ponytail: keine Zielsuche mehr — Schüsse fliegen geradeaus, ändern nie die Richtung */
    b.x+=b.vx*dt; b.y+=b.vy*dt;
    let dead=b.life<=0;
    if(b.x<ROOM.x||b.x>ROOM.x+ROOM.w||b.y<ROOM.y||b.y>ROOM.y+ROOM.h) dead=true;
    if(!dead && bulletHitsObstacle(b)){ for(let k=0;k<3;k++)spawnParticle(b.x,b.y,b.color,1.2,40); dead=true; }
    if(!dead){
      for(const e of enemies){
        if(b.hitIds.has(e.id))continue;
        if(dist2(b.x,b.y,e.x,e.y)<(b.r+e.r)*(b.r+e.r)){
          const ang=Math.atan2(b.vy,b.vx);
          G._wid=b.wid;                 // Kill dieser Waffe zuschreiben
          damageEnemy(e,b.dmg,ang,b.kb,true);
          spawnFloater(e.x,e.y-e.r,Math.round(b.dmg),b.crit); Audio2.hit();
          if(b.burn){e.burnT=2.0;e.burnDmg=Math.max(e.burnDmg,b.dmg*0.5+2);e.burnSrc=b.wid;}
          if(b.slow){e.slowT=1.4;}
          if(b.explosive){ explodeBullet(b); dead=true; break; }
          if(b.puddle){ spawnPuddle(b.x,b.y,b.dmg*0.4,{hostile:false}); }
          if(b.chain){ chainLightning(b,e); }
          b.hitIds.add(e.id); b.pierce--;
          for(let k=0;k<3;k++)spawnParticle(b.x,b.y,b.color,1.2,40);
          if(b.pierce<0){dead=true;break;}
        }
      }
      G._wid=null;                       // nur während Geschoss-Treffern aktiv
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
    if(!dead){ for(const pl of players){ if(pl.dead||pl.invuln>0)continue; if(dist2(b.x,b.y,pl.x,pl.y)<(b.r+pl.r)*(b.r+pl.r)){ hurtPlayer(b.dmg,pl); dead=true; break; } } }
    if(dead) ebullets.splice(i,1);
  }
}
function explodeBullet(b){
  G.shake=Math.max(G.shake,3);
  for(let i=0;i<10;i++)spawnParticle(b.x,b.y,C.candle,rand(1.5,3),rand(80,180));
  for(const e of enemies){ if(dist2(b.x,b.y,e.x,e.y)<60*60){ damageEnemy(e,b.dmg*0.7,Math.atan2(e.y-b.y,e.x-b.x),40,true); } }
}
function chainLightning(b,from){
  let last=from,jumps=2; const hitS=new Set([from.id]);
  while(jumps-->0){
    let best=null,bd=140*140;
    for(const e of enemies){if(hitS.has(e.id))continue;const d=dist2(last.x,last.y,e.x,e.y);if(d<bd){bd=d;best=e;}}
    if(!best)break;
    damageEnemy(best,b.dmg*0.6,0,20,true); hitS.add(best.id);
    bolts.push({x1:last.x,y1:last.y,x2:best.x,y2:best.y,t:0.12}); last=best;
  }
}
function spawnPuddle(x,y,dps,opts){ opts=opts||{}; puddles.push({x,y,r:opts.big?42:26,dps,life:opts.life||2.2,hostile:!!opts.hostile,effect:opts.effect||'poison',src:opts.src||G._wid}); for(let i=0;i<6;i++)spawnParticle(x,y, opts.effect==='fire'?C.candle:C.sick,1.5,40); }
function updatePuddles(dt){
  for(let i=puddles.length-1;i>=0;i--){const pu=puddles[i];pu.life-=dt;
    if(pu.hostile){
      for(const pl of players){ if(pl.dead)continue; if(dist2(pu.x,pu.y,pl.x,pl.y)<pu.r*pu.r){
        if(pu.effect==='fire') applyStatus('burn',1.6,pu.dps,pl); else applyStatus('poison',2.4,pu.dps,pl);
      } }
    } else {
      for(const e of enemies){ if(!e.isBoss && dist2(pu.x,pu.y,e.x,e.y)<pu.r*pu.r){ hurtEnemyRaw(e,pu.dps*dt,pu.src||'puddle');} }
    }
    if(pu.life<=0)puddles.splice(i,1);
  }
}
function spawnPickup(x,y,type,val){ pickups.push({x:clamp(x+rand(-8,8),ROOM.x,ROOM.x+ROOM.w),y:clamp(y+rand(-8,8),ROOM.y,ROOM.y+ROOM.h),type,val,r:7,life:24,bob:rand(0,TAU)}); }
function updatePickups(dt){
  for(let i=pickups.length-1;i>=0;i--){const pk=pickups[i];pk.life-=dt;pk.bob+=dt*4;
    const tp=nearestPlayer(pk.x,pk.y); if(!tp){ if(pk.life<=0)pickups.splice(i,1); continue; }
    const d=Math.hypot(pk.x-tp.x,pk.y-tp.y);
    const magnet=pk.type==='xp'?105:80;
    if(d<magnet){const a=Math.atan2(tp.y-pk.y,tp.x-pk.x);pk.x+=Math.cos(a)*250*dt;pk.y+=Math.sin(a)*250*dt;}
    if(collectPickup(pk,i,d,tp)) continue;
    if(pk.life<=0)pickups.splice(i,1);
  }
}
function collectPickup(pk,i,d,who){ const p=who||player;
  if(d<p.r+pk.r){
    if(pk.type==='coin'){G.coins+=pk.val;if(G.run)G.run.gold+=pk.val;$('#coinTag').textContent=G.coins;Audio2.coin();}
    else if(pk.type==='xp'){addXP(pk.val,p);Audio2.coin();for(let k=0;k<3;k++)spawnParticle(pk.x,pk.y,C.xp,1.2,40);}
    else{p.hp=clamp(p.hp+pk.val,0,p.maxHP);updateHP();for(let k=0;k<6;k++)spawnParticle(pk.x,pk.y,C.blood2,1.5,50);}
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
  dmg=Math.max(1,dmg-(p.armorLocked?0:p.armor));   // Fluch Eiserne Gier: Rüstung wirkt nicht
  if(p.shield>0){ const a=Math.min(p.shield,dmg); p.shield-=a; dmg-=a; p.shieldRegT=Math.max(p.shieldRegT,2.0);
    for(let i=0;i<6;i++)spawnParticle(p.x,p.y,C.chill,2,90); }
  if(dmg>0){ p.hp-=dmg; G.hurtFlash=0.35; for(let i=0;i<8;i++)spawnParticle(p.x,p.y,C.blood2,2,120); }
  p.invuln=0.6; G.shake=Math.max(G.shake,5); Audio2.hurt();
  updateHP();
  if(p.hp<=0){ if(p.revive>0){ doRevive(p); return; } onPlayerDead(p); }
}

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
  G.curseSpawn=1; G.curseFire=1; G.activeCurse=null; G.rewardMul=G.diff.reward*((G.modMul.reward)||1);
  G.charId=charId; setWorld(clamp(Admin.startLevel,1,50));
  /* Spieler erstellen (Koop = 2 lokale Spieler). pSpeedMod (Hetzjagd) + Meta auf jeden. */
  const mk=(cid,ctrl)=>{ const pl=makePlayer(cid,ctrl); pl.speed*=pSpeedMod; applyMeta(pl); return pl; };
  players=[ mk(charId, G.coop?'p1':'solo') ];
  if(G.coop) players.push( mk(G.pendingChar2||charId, 'p2') );
  player=players[0];
  /* Fluch gilt für alle Spieler (nicht bei Custom) */
  if(!G.noSave && Math.random()<G.diff.curseChance){ const c=pick(CURSE_DEFS); players.forEach(pl=>c.apply(pl)); G.activeCurse=c; G.rewardMul*=1.35; }
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
  if(G.activeCurse){ const c=G.activeCurse;
    showToast(t('curse_label')+' · '+c.name,'<span style="color:#e0405f">'+c.down+'</span> &nbsp;·&nbsp; <span style="color:#5fbf52">'+c.up+'</span>'); }
}
function buildLevel(lvl){
  setWorld(lvl);
  enemies=[];bullets=[];ebullets=[];puddles=[];bolts=[];novaRings=[];pickups=[];deployables=[];beams=[];
  G.cleared=false; G.clearTimer=0;
  /* Koop: tote Spieler in der nächsten Runde wiederbeleben; alle Statuseffekte löschen + platzieren */
  players.forEach((pl,i)=>{ clearStatuses(pl); if(pl.dead){ pl.dead=false; pl.hp=Math.round(pl.maxHP*0.6); } pl.invuln=0.9;
    pl.x=WORLD.w/2 + (players.length>1?(i===0?-44:44):0); pl.y=WORLD.h-160; });
  player=players[0];
  const region=REGIONS[clamp(Math.floor((lvl-1)/10),0,4)];
  $('#stationLabel').textContent= lvl>50? t('hud_endless')+' '+(lvl-50) : t('hud_station')+' '+lvl+' / 50';
  $('#regionLabel').textContent=region.name;
  buildDecor(region); buildObstacles();
  if(lvl%5===0 && lvl<=50) spawnBoss(lvl); else spawnWave(lvl);
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
  player.hp=clamp(player.hp+player.maxHP*0.10,0,player.maxHP); updateHP();
  const clearGold=Math.round(G.level*3*(G.rewardMul||1));
  G.coins+=clearGold; if(G.run)G.run.gold+=clearGold; $('#coinTag').textContent=G.coins;
  G.state='collect'; G.collectT=0;
}
function openPostWave(){
  postQueue=[];
  for(const pl of players){ if(pl.dead)continue;
    postQueue.push({step:'shop',pl});
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
}
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
  const atCap=player.weapons.length>=WEAPON_CAP;
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
      if(pool.length){ const w=pick(pool); used.add(w.id); offer.push({weapon:w}); } else break;
    }
    /* nicht genug neue Waffen? mit Veredelungen auffüllen */
    if(offer.length<3){
      const up=shuffle(player.weapons.filter(id=>weaponLevel(id)<WEAPON_MAX_LEVEL).map(id=>weaponById(id)));
      for(const w of up){ if(offer.length<3 && !used.has(w.id)){ used.add(w.id); offer.push({weapon:w,upgrade:true}); } }
    }
  }
  return offer;
}
function openShop(){
  G.state='shop'; G.menuAt=performance.now(); $('#hud').classList.remove('show');
  shopOffer=rollShop(); Audio2.lvl(); renderShop();
  $('#shop').classList.add('show');
}
function renderShop(){
  $('#shopGold').textContent=G.coins;
  $('#shopSub').textContent = playerTag() + (player.weapons.length>=WEAPON_CAP ? t('shop_sub_full',{cap:WEAPON_CAP}) : t('shop_sub_buy'));
  const wrap=$('#shopCards'); wrap.innerHTML='';
  if(!shopOffer.length){ wrap.innerHTML='<div class="rd" style="grid-column:1/-1;color:var(--bone-dim);padding:20px">'+t('shop_nothing')+'</div>'; }
  shopOffer.forEach((o,i)=>{
    const el=document.createElement('div'); el.dataset.key=i+1;
    if(o.evo){
      const r=o.evo, res=weaponById(r.result), a=weaponById(r.a), b=weaponById(r.b);
      el.className='rcard evo'; el.style.borderColor=rarColor(res.rk);
      el.innerHTML='<div class="ic">'+svgIcon(res.ic,res.color,34)+'</div>'+
        '<div class="rk godlike">✦ '+t('shop_evo')+'</div>'+
        '<div class="rn">'+res.name+'</div>'+
        '<div class="rd">'+a.name+' + '+b.name+' →<br>'+weaponMeta(res,res.dmg)+'</div>'+
        '<div class="price">'+t('shop_evo_free')+'</div>';
      el.onclick=()=>performWeaponEvolution(r);
    } else {
      const w=o.weapon, lvl=weaponLevel(w.id), maxed=lvl>=WEAPON_MAX_LEVEL;
      const price=o.upgrade?upgradePrice(w):weaponPrice(w); const can=G.coins>=price && !maxed;
      el.className='rcard'+(can?'':' locked'); el.style.borderColor=rarColor(w.rk);
      el.innerHTML='<div class="ic">'+svgIcon(w.ic,w.color,32)+'</div>'+
        '<div class="rk '+w.rk+'">'+rarName(w.rk)+(o.upgrade?' · '+t('shop_refine'):'')+'</div>'+
        '<div class="rn">'+w.name+(o.upgrade?' <span style="color:var(--gold2)">'+t('lvl_short')+lvl+'→'+(lvl+1)+'</span>':'')+'</div>'+
        '<div class="rd">'+weaponMeta(w,Math.round(weaponDamage(w))+(o.upgrade?' → '+Math.round(w.dmg*(1+lvl*0.22)):''))+'</div>'+
        (maxed?'<div class="owned">'+t('shop_max')+'</div>':'<div class="price'+(can?'':' cant')+'">'+price+' '+t('hud_gold')+'</div>');
      if(can) el.onclick=()=>buyWeapon(w,price);
    }
    wrap.appendChild(el);
  });
  const rerollCost=15+G.level*2;
  $('#shopReroll').textContent=t('shop_reroll',{cost:rerollCost});
  $('#shopReroll').style.opacity=G.coins<rerollCost?0.45:1;
}
function weaponMeta(w,dmgTxt){ return t('dbg_dmg')+' '+dmgTxt+' · '+(w.count>1?t('w_proj',{n:w.count}):t('w_single'))+(w.pierce>2?' · '+t('w_pierce'):'')+(w.chain?' · '+t('w_chain'):'')+(w.burn?' · '+t('ammo_burn'):'')+(w.explosive?' · '+t('w_explosive'):'')+(w.deploy?' · '+t('w_deploy'):''); }
function buyWeapon(w,price){
  if(G.coins<price)return;
  G.coins-=price; $('#coinTag').textContent=G.coins; giveWeapon(w.id); Audio2.buy();
  advancePost();   // nur EIN Kauf pro Markt
}
$('#shopReroll').onclick=()=>{ const cost=15+G.level*2; if(G.coins<cost)return; G.coins-=cost; $('#coinTag').textContent=G.coins; shopOffer=rollShop(); renderShop(); };
$('#shopSkip').onclick=()=>advancePost();

/* ---------- UPGRADE (Stufenaufstieg) ---------- */
function rollUpgrades(){
  const cards=[]; const usedIds=new Set();
  for(let n=0;n<3;n++){
    let def=null,rk='common',tries=0;
    while(tries++<30){
      rk=rollRarity(currentLuck()); const r=rarRank(rk);
      const pool=UPGRADE_DEFS.filter(u=>(u.minRank||0)<=r && !usedIds.has(u.id));
      if(pool.length){ def=pick(pool); break; }
    }
    if(!def){ const pool=UPGRADE_DEFS.filter(u=>!usedIds.has(u.id)); def=pool.length?pick(pool):pick(UPGRADE_DEFS); rk='common'; }
    usedIds.add(def.id); cards.push({def,rk});
  }
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
    const el=document.createElement('div'); el.className='rcard'; el.dataset.key=i+1; el.style.borderColor=rarColor(c.rk);
    el.innerHTML='<div class="ic">'+svgIcon(c.def.ic,rarColor(c.rk),32)+'</div>'+
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
  if(G.run){G.run.won=true;} const souls=finishRun(false,true);
  $('#endlessStats').innerHTML=t('end_all50')+'<br>'+t('end_clvl')+': <b>'+player.level+'</b> · '+t('hud_kills')+': <b>'+G.kills+'</b><br>'+soulsLine(souls)+'<br>'+t('endless_q');
  Audio2.win(); $('#endless').classList.add('show');
}
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
    [t('s_xp'),p.xp+' / '+p.xpNext],
    [t('s_items'),p.items.length],
  ];
  $('#statGrid').innerHTML=rows.map(r=>'<div class="stat-row"><span class="l">'+r[0]+'</span><span class="v">'+r[1]+'</span></div>').join('');
  const wlist=p.weapons.map(id=>{const w=weaponById(id);const l=weaponLevel(id);return '<b>'+w.name+'</b> <span style="color:var(--gold2)">St.'+l+'</span>';}).join(' · ');
  $('#statWeapons').innerHTML=t('weapons_label')+': '+wlist;
  $('#statAbilities').innerHTML=p.abilities.length?(t('abilities_label')+': '+p.abilities.map(a=>'<b style="color:'+rarColor(a.rk)+'">'+a.name+'</b>'+(a.level>1?' St.'+a.level:'')).join(' · ')):'';
}
$('#statsClose').onclick=closeStats;

/* ---------- GAME OVER / VICTORY ---------- */
const EPITAPHS=['Der Weg endet hier','Nicht alle Sünden lassen sich abtragen','Das Kreuz blieb leer','Asche zu Asche'];
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
  const souls=finishRun(true,false);
  $('#goEpitaph').textContent=pick(EPITAPHS);
  $('#goStats').innerHTML=t('end_station')+': <b>'+G.level+(G.level>50?' ('+t('hud_endless')+')':' / 50')+'</b><br>'+t('end_clvl')+': <b>'+player.level+'</b><br>'+t('hud_kills')+': <b>'+G.kills+'</b><br>'+t('hud_gold')+': <b>'+G.coins+'</b><br>'+t('end_class')+': <b>'+charById(G.charId).name+'</b><br>'+soulsLine(souls);
  $('#gameover').classList.add('show');
}
function victory(){
  G.state='victory'; $('#hud').classList.remove('show'); $('#bossBarWrap').classList.remove('show');
  const souls=finishRun(false,true);
  $('#winStats').innerHTML=t('end_all50')+'<br>'+t('end_clvl')+': <b>'+player.level+'</b> · '+t('hud_kills')+': <b>'+G.kills+'</b><br>'+t('s_items')+': <b>'+player.items.length+'</b><br>'+soulsLine(souls);
  Audio2.win(); $('#victory').classList.add('show');
}

/* =========================================================================
   RENDER
   ========================================================================= */
function buildDecor(region){
  decor=[];G._region=region;
  const nc=Math.round(ROOM.w*ROOM.h/240000*6);
  for(let i=0;i<nc;i++){decor.push({type:'cross',x:rand(ROOM.x+40,ROOM.x+ROOM.w-40),y:rand(ROOM.y+30,ROOM.y+ROOM.h-30),s:rand(.6,1.3),a:rand(.05,.12)});}
  const ncr=Math.round(ROOM.w*ROOM.h/240000*42);
  for(let i=0;i<ncr;i++){decor.push({type:'crack',x:rand(ROOM.x,ROOM.x+ROOM.w),y:rand(ROOM.y,ROOM.y+ROOM.h),l:rand(8,28),r:rand(0,TAU)});}
  const ncan=Math.round(ROOM.w*ROOM.h/240000*5);
  for(let i=0;i<ncan;i++){decor.push({type:'candle',x:rand(ROOM.x+30,ROOM.x+ROOM.w-30),y:rand(ROOM.y+30,ROOM.y+ROOM.h-30)});}
}
function renderGame(){
  updateCamera();
  let ox=0,oy=0; if(G.shake>0){ox=rand(-G.shake,G.shake);oy=rand(-G.shake,G.shake);G.shake=Math.max(0,G.shake-0.4);}
  const reg=G._region||REGIONS[0];
  cx.fillStyle='#050507';cx.fillRect(0,0,W,H);
  cx.save();cx.translate(-cam.x+ox,-cam.y+oy);
  // floor
  cx.fillStyle=reg.floor;cx.fillRect(ROOM.x,ROOM.y,ROOM.w,ROOM.h);
  // grid (nur sichtbarer Bereich)
  cx.strokeStyle='rgba(0,0,0,.32)';cx.lineWidth=1;
  const gx0=Math.max(ROOM.x,Math.floor((cam.x-2)/48)*48), gx1=Math.min(ROOM.x+ROOM.w,cam.x+W+48);
  const gy0=Math.max(ROOM.y,Math.floor((cam.y-2)/48)*48), gy1=Math.min(ROOM.y+ROOM.h,cam.y+H+48);
  for(let x=gx0;x<=gx1;x+=48){cx.beginPath();cx.moveTo(x,ROOM.y);cx.lineTo(x,ROOM.y+ROOM.h);cx.stroke();}
  for(let y=gy0;y<=gy1;y+=48){cx.beginPath();cx.moveTo(ROOM.x,y);cx.lineTo(ROOM.x+ROOM.w,y);cx.stroke();}
  for(const d of decor){
    if(d.x<cam.x-40||d.x>cam.x+W+40||d.y<cam.y-40||d.y>cam.y+H+40) continue;
    if(d.type==='crack'){cx.strokeStyle='rgba(0,0,0,.4)';cx.lineWidth=1.2;cx.beginPath();cx.moveTo(d.x,d.y);cx.lineTo(d.x+Math.cos(d.r)*d.l,d.y+Math.sin(d.r)*d.l);cx.stroke();}
    else if(d.type==='cross'){cx.save();cx.globalAlpha=d.a;cx.fillStyle=reg.tint;cx.translate(d.x,d.y);cx.scale(d.s,d.s);cx.fillRect(-4,-26,8,52);cx.fillRect(-16,-14,32,8);cx.restore();}
    else if(d.type==='candle'){const fl=0.5+Math.sin(G.uiTime*8+d.x)*0.3;cx.fillStyle='rgba(224,138,47,'+(0.05*fl)+')';cx.beginPath();cx.arc(d.x,d.y,15,0,TAU);cx.fill();cx.fillStyle='rgba(224,138,47,.7)';cx.beginPath();cx.arc(d.x,d.y,1.7,0,TAU);cx.fill();}
  }
  cx.strokeStyle=C.gold;cx.lineWidth=3;cx.strokeRect(ROOM.x-2,ROOM.y-2,ROOM.w+4,ROOM.h+4);
  cx.strokeStyle='rgba(184,137,59,.25)';cx.lineWidth=1;cx.strokeRect(ROOM.x-7,ROOM.y-7,ROOM.w+14,ROOM.h+14);

  // Laternenlicht um jeden Spieler: hebt die Umgebung des Spielers vom dunklen Boden ab
  for(const pl of players){ if(pl.dead)continue; const lg=cx.createRadialGradient(pl.x,pl.y,8,pl.x,pl.y,280); lg.addColorStop(0,'rgba(255,214,160,.11)'); lg.addColorStop(1,'rgba(255,214,160,0)'); cx.fillStyle=lg; cx.fillRect(pl.x-280,pl.y-280,560,560); }
  for(const pu of puddles){cx.save();cx.globalAlpha=clamp(pu.life,0,1)*0.5;cx.fillStyle=pu.effect==='fire'?'rgba(224,138,47,1)':C.sick;cx.beginPath();cx.arc(pu.x,pu.y,pu.r,0,TAU);cx.fill();
    if(pu.effect==='fire'){cx.globalAlpha=clamp(pu.life,0,1)*0.3;cx.fillStyle='#ffd27a';cx.beginPath();cx.arc(pu.x,pu.y,pu.r*0.6,0,TAU);cx.fill();}cx.restore();}
  for(const n of novaRings){cx.save();cx.globalAlpha=clamp(n.t/0.45,0,1)*0.6;cx.strokeStyle=n.color;cx.lineWidth=3;cx.beginPath();cx.arc(n.x,n.y,n.r,0,TAU);cx.stroke();cx.restore();}
  for(const ob of obstacles) drawObstacle(ob);
  for(const pk of pickups){const yy=pk.y+Math.sin(pk.bob)*2;
    if(pk.type==='coin'){cx.fillStyle=C.gold2;cx.beginPath();cx.arc(pk.x,yy,4,0,TAU);cx.fill();cx.fillStyle='rgba(255,255,255,.4)';cx.beginPath();cx.arc(pk.x-1,yy-1,1.5,0,TAU);cx.fill();}
    else if(pk.type==='xp'){cx.save();cx.translate(pk.x,yy);cx.rotate(Math.PI/4);cx.shadowColor=C.xp;cx.shadowBlur=6;cx.fillStyle=C.xp;cx.fillRect(-3,-3,6,6);cx.restore();}
    else{cx.fillStyle=C.blood2;cx.fillRect(pk.x-1,yy-4,2,8);cx.fillRect(pk.x-4,yy-1,8,2);}
  }
  drawDeployables();
  for(const e of enemies) drawEnemy(e);
  // eigene Geschosse: weicher Schein ohne Rand (günstiger als shadowBlur)
  for(const b of bullets){cx.globalAlpha=0.18;cx.fillStyle=b.color;cx.beginPath();cx.arc(b.x,b.y,b.r*1.6,0,TAU);cx.fill();cx.globalAlpha=1;cx.fillStyle=b.crit?'#fff':b.color;cx.beginPath();cx.arc(b.x,b.y,b.r,0,TAU);cx.fill();}
  for(const bo of bolts){cx.save();cx.globalAlpha=clamp(bo.t/0.12,0,1);cx.strokeStyle='#cfe0ff';cx.lineWidth=2;cx.shadowColor='#9bbcff';cx.shadowBlur=10;cx.beginPath();cx.moveTo(bo.x1,bo.y1);const mx=(bo.x1+bo.x2)/2+rand(-10,10),my=(bo.y1+bo.y2)/2+rand(-10,10);cx.lineTo(mx,my);cx.lineTo(bo.x2,bo.y2);cx.stroke();cx.restore();}
  for(const bm of beams){cx.save();cx.globalAlpha=clamp(bm.t/0.09,0,1);cx.lineCap='round';cx.shadowColor=bm.color;cx.shadowBlur=14;cx.strokeStyle=bm.color;cx.lineWidth=bm.width||6;cx.beginPath();cx.moveTo(bm.x1,bm.y1);cx.lineTo(bm.x2,bm.y2);cx.stroke();cx.strokeStyle='#fff';cx.lineWidth=(bm.width||6)*0.35;cx.stroke();cx.restore();}
  for(const pl of players){ if(pl.dead)continue; player=pl; drawPlayer(); } player=anchorPlayer();
  // gegnerische Geschosse zuletzt und mit rotem Rand: Gefahr muss immer das Sichtbarste sein
  for(const b of ebullets){cx.fillStyle='rgba(12,0,0,.8)';cx.beginPath();cx.arc(b.x,b.y,b.r+2.4,0,TAU);cx.fill();cx.strokeStyle='rgba(255,70,60,.9)';cx.lineWidth=1.4;cx.stroke();
    cx.fillStyle=b.color;cx.beginPath();cx.arc(b.x,b.y,b.r,0,TAU);cx.fill();cx.fillStyle='rgba(255,255,255,.6)';cx.beginPath();cx.arc(b.x,b.y,b.r*0.42,0,TAU);cx.fill();}
  for(const p of particles){cx.globalAlpha=clamp(p.life*1.6,0,1);cx.fillStyle=p.color;cx.beginPath();cx.arc(p.x,p.y,p.r,0,TAU);cx.fill();}
  cx.globalAlpha=1;
  for(const f of floaters){cx.globalAlpha=clamp(f.life*1.4,0,1);cx.fillStyle=f.crit?C.gold2:C.bone;cx.font=(f.crit?'bold 16px':'13px')+' "JetBrains Mono",monospace';cx.textAlign='center';cx.fillText(f.n,f.x,f.y);}
  cx.globalAlpha=1;
  cx.restore();
  // vignette (screen-space)
  const vg=cx.createRadialGradient(W/2,H/2,H*0.34,W/2,H/2,H*0.8);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');
  cx.fillStyle=vg;cx.fillRect(0,0,W,H);
  drawScreenFx();
  renderMinimap();
}
/* Bildschirm-Effekte: rote Ränder bei Treffer / wenig Leben, Pfeile zu Gegnern außerhalb des Bildes */
function drawScreenFx(){
  const p1=anchorPlayer(); let a=Math.max(0,G.hurtFlash||0)*1.4;
  if(p1&&!p1.dead){ const f=p1.hp/p1.maxHP; if(f<0.3) a+=(0.3-f)/0.3*0.3+(0.5+Math.sin(G.uiTime*6)*0.5)*0.12; }
  if(a>0.01){ const g=cx.createRadialGradient(W/2,H/2,H*0.32,W/2,H/2,H*0.78); g.addColorStop(0,'rgba(150,0,0,0)'); g.addColorStop(1,'rgba(170,10,10,'+Math.min(0.6,a)+')'); cx.fillStyle=g; cx.fillRect(0,0,W,H); }
  if(G.state!=='playing')return;
  const few=enemies.length<=6;
  for(const e of enemies){ if(!few&&!e.isBoss)continue;
    const sx=e.x-cam.x, sy=e.y-cam.y; if(sx>-e.r&&sx<W+e.r&&sy>-e.r&&sy<H+e.r)continue;
    // Pfeile auf einem Rahmen, der oben/unten Platz für das HUD lässt
    const x0=24,x1=W-24,y0=100,y1=H-70, ox=(x0+x1)/2, oy=(y0+y1)/2;
    const ang=Math.atan2(sy-oy,sx-ox), tx=Math.cos(ang), ty=Math.sin(ang);
    const k=Math.min((x1-ox)/Math.max(Math.abs(tx),1e-6),(y1-oy)/Math.max(Math.abs(ty),1e-6));
    cx.save();cx.translate(ox+tx*k,oy+ty*k);cx.rotate(ang);cx.globalAlpha=0.6+Math.sin(G.uiTime*5)*0.25;
    const s=e.isBoss?1.6:1; cx.fillStyle=e.isBoss?C.gold2:C.blood2;cx.strokeStyle='rgba(0,0,0,.7)';cx.lineWidth=2;
    cx.beginPath();cx.moveTo(12*s,0);cx.lineTo(-7*s,-8*s);cx.lineTo(-3*s,0);cx.lineTo(-7*s,8*s);cx.closePath();cx.stroke();cx.fill();cx.restore(); }
}
function renderMinimap(){
  const mc=$('#minimap'); if(!mc)return; const m=mc.getContext('2d'); const MW=mc.width,MH=mc.height;
  m.clearRect(0,0,MW,MH);
  const pad=4;
  const sc=Math.min((MW-pad*2)/WORLD.w,(MH-pad*2)/WORLD.h);
  const offx=(MW-WORLD.w*sc)/2, offy=(MH-WORLD.h*sc)/2;
  m.fillStyle='rgba(8,7,10,.92)';m.fillRect(0,0,MW,MH);
  m.fillStyle='rgba(40,34,26,.9)';m.fillRect(offx+ROOM.x*sc,offy+ROOM.y*sc,ROOM.w*sc,ROOM.h*sc);
  m.fillStyle='#3a342c';for(const ob of obstacles){m.fillRect(offx+ob.x*sc-1.5,offy+ob.y*sc-1.5,3,3);}
  m.fillStyle='rgba(121,230,192,.7)';for(const pk of pickups){if(pk.type==='xp')m.fillRect(offx+pk.x*sc-0.5,offy+pk.y*sc-0.5,1.5,1.5);}
  for(const e of enemies){ m.fillStyle=e.isBoss?'#ff3b3b':'#c01f24'; const r=e.isBoss?3.2:1.6; m.beginPath();m.arc(offx+e.x*sc,offy+e.y*sc,r,0,TAU);m.fill(); }
  // viewport rect
  m.strokeStyle='rgba(224,178,90,.45)';m.lineWidth=1;m.strokeRect(offx+cam.x*sc,offy+cam.y*sc,W*sc,H*sc);
  // player
  m.fillStyle=C.gold2;m.beginPath();m.arc(offx+player.x*sc,offy+player.y*sc,2.6,0,TAU);m.fill();
}
function drawObstacle(ob){
  cx.save();cx.translate(ob.x,ob.y);
  cx.fillStyle='rgba(0,0,0,.45)';cx.beginPath();cx.ellipse(0,ob.r*0.7,ob.r*1.05,ob.r*0.4,0,0,TAU);cx.fill();
  const s=ob.r;
  if(ob.type==='cross'){
    cx.fillStyle='#2a2620';cx.fillRect(-s*0.22,-s*1.1,s*0.44,s*2.0);cx.fillRect(-s*0.7,-s*0.5,s*1.4,s*0.4);
    cx.strokeStyle='#15120e';cx.lineWidth=2;cx.strokeRect(-s*0.22,-s*1.1,s*0.44,s*2.0);
  } else if(ob.type==='pillar'){
    cx.fillStyle='#34302a';cx.fillRect(-s*0.55,-s*1.1,s*1.1,s*2.1);
    cx.fillStyle='#26221c';cx.fillRect(-s*0.7,-s*1.2,s*1.4,s*0.22);cx.fillRect(-s*0.7,s*0.78,s*1.4,s*0.22);
    cx.strokeStyle='rgba(0,0,0,.4)';cx.lineWidth=1;for(let i=-1;i<=1;i++){cx.beginPath();cx.moveTo(i*s*0.2,-s*1.0);cx.lineTo(i*s*0.2,s*0.8);cx.stroke();}
  } else if(ob.type==='tomb'){
    cx.fillStyle='#2c2822';cx.beginPath();cx.moveTo(-s,s*0.7);cx.lineTo(-s,-s*0.5);cx.quadraticCurveTo(0,-s*1.2,s,-s*0.5);cx.lineTo(s,s*0.7);cx.closePath();cx.fill();
    cx.strokeStyle='#17130f';cx.lineWidth=2;cx.stroke();
    cx.fillStyle='#3a342c';cx.fillRect(-s*0.18,-s*0.6,s*0.36,s*0.5);cx.fillRect(-s*0.4,-s*0.45,s*0.8,s*0.18);
  } else {
    cx.fillStyle='#2e2a24';for(let i=0;i<4;i++){const a=ob.seed+i*1.7;cx.beginPath();cx.arc(Math.cos(a)*s*0.4,Math.sin(a)*s*0.3+s*0.2,s*0.5,0,TAU);cx.fill();}
    cx.strokeStyle='rgba(0,0,0,.4)';cx.lineWidth=1;cx.beginPath();cx.arc(0,s*0.2,s*0.7,0,TAU);cx.stroke();
  }
  cx.restore();
}
function drawDeployables(){
  for(const d of deployables){
    if(d.x<cam.x-50||d.x>cam.x+W+50||d.y<cam.y-50||d.y>cam.y+H+50) continue;
    const fade=clamp(d.life,0,1);
    cx.save();cx.globalAlpha=fade;cx.translate(d.x,d.y);
    cx.fillStyle='rgba(0,0,0,.4)';cx.beginPath();cx.ellipse(0,d.r*0.7,d.r*0.9,d.r*0.35,0,0,TAU);cx.fill();
    if(d.kind==='turret'){
      cx.fillStyle='#2a2620';cx.fillRect(-d.r*0.7,-d.r*0.1,d.r*1.4,d.r*1.0);
      cx.fillStyle=d.color;cx.beginPath();cx.arc(0,-d.r*0.3,d.r*0.55,0,TAU);cx.fill();
      const tg=nearestEnemy(d.x,d.y), a=tg?Math.atan2(tg.y-d.y,tg.x-d.x):-Math.PI/2;
      cx.save();cx.rotate(a);cx.fillStyle='#9aa0a8';cx.fillRect(0,-d.r*0.16,d.r*1.4,d.r*0.32);cx.restore();
    } else if(d.kind==='totem'){
      const pulse=0.5+Math.sin(G.uiTime*4+d.phase)*0.5;
      cx.fillStyle=d.color;cx.globalAlpha=fade*(0.1+pulse*0.07);cx.beginPath();cx.arc(0,0,d.novaR*0.5,0,TAU);cx.fill();cx.globalAlpha=fade;
      cx.fillStyle='#3a2a1a';cx.fillRect(-d.r*0.4,-d.r,d.r*0.8,d.r*2);
      cx.fillStyle=d.color;cx.beginPath();cx.arc(0,-d.r*0.6,d.r*0.5,0,TAU);cx.fill();
      cx.fillStyle='#000';cx.fillRect(-d.r*0.22,-d.r*0.72,d.r*0.44,d.r*0.2);
    } else if(d.kind==='mine'){
      const blink=Math.sin(G.uiTime*8+d.phase)>0;
      for(let k=0;k<6;k++){const a=k/6*TAU;cx.strokeStyle='#5a2020';cx.lineWidth=2;cx.beginPath();cx.moveTo(Math.cos(a)*d.r,Math.sin(a)*d.r);cx.lineTo(Math.cos(a)*d.r*1.5,Math.sin(a)*d.r*1.5);cx.stroke();}
      cx.fillStyle='#3a1010';cx.beginPath();cx.arc(0,0,d.r,0,TAU);cx.fill();
      cx.fillStyle=blink?'#ff5a4a':'#7a2020';cx.beginPath();cx.arc(0,0,d.r*0.4,0,TAU);cx.fill();
    } else if(d.kind==='companion'){
      cx.translate(0,Math.sin(G.uiTime*5+d.phase)*2);
      cx.globalAlpha=fade*0.5;cx.fillStyle=d.color;cx.beginPath();cx.arc(0,d.r*0.6,d.r*0.4,0,TAU);cx.fill();cx.globalAlpha=fade;
      cx.fillStyle=d.color;cx.shadowColor=d.color;cx.shadowBlur=8;cx.beginPath();cx.arc(0,0,d.r*0.7,0,TAU);cx.fill();cx.shadowBlur=0;
      cx.fillStyle='#1a1020';cx.beginPath();cx.arc(-d.r*0.2,-d.r*0.1,d.r*0.12,0,TAU);cx.arc(d.r*0.2,-d.r*0.1,d.r*0.12,0,TAU);cx.fill();
    }
    cx.restore();
  }
}
function drawPlayer(){
  const p=player;
  // aura
  if(p.auraDps>0){cx.save();cx.globalAlpha=0.12+Math.sin(G.uiTime*3)*0.03;cx.fillStyle=C.sick;cx.beginPath();cx.arc(p.x,p.y,p.auraR,0,TAU);cx.fill();cx.restore();}
  const moving=(keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight||TouchJoy.dx||TouchJoy.dy);
  const flick=(p.invuln>0&&Math.floor(G.uiTime*20)%2===0);
  if(flick)cx.globalAlpha=0.5;
  cx.save();cx.strokeStyle=p===players[1]?'rgba(127,208,230,.75)':'rgba(224,178,90,.75)';cx.lineWidth=2;cx.beginPath();cx.ellipse(p.x,p.y+p.r*1.25,p.r*1.35,p.r*0.5,0,0,TAU);cx.stroke();cx.restore();
  drawHero(cx,p.charId||G.charId,p.x,p.y,p.r*1.3,G.uiTime,!!moving,p.aim);   // größer gezeichnet, Trefferzone bleibt p.r
  if(G.coop&&players.length>1){ cx.fillStyle=p===players[0]?C.gold2:C.chill; cx.globalAlpha=0.9; cx.font='bold 11px "JetBrains Mono",monospace'; cx.textAlign='center'; cx.fillText('P'+(players.indexOf(p)+1),p.x,p.y-p.r-10); }
  cx.globalAlpha=1;
  // shield ring
  if(p.shield>0){cx.save();cx.globalAlpha=0.3+0.2*(p.shield/Math.max(1,p.shieldMax));cx.strokeStyle=C.chill;cx.lineWidth=2;cx.beginPath();cx.arc(p.x,p.y,p.r+7,0,TAU);cx.stroke();cx.restore();}
  // orbital blades
  if(p.orbitN>0){ for(let i=0;i<p.orbitN;i++){ const a=p.orbitAng+i*TAU/p.orbitN; const ox=p.x+Math.cos(a)*p.orbitR, oy=p.y+Math.sin(a)*p.orbitR;
    cx.save();cx.translate(ox,oy);cx.rotate(a+Math.PI/2);cx.fillStyle=C.gold2;cx.shadowColor=C.gold2;cx.shadowBlur=8;cx.beginPath();cx.moveTo(0,-7);cx.lineTo(3,4);cx.lineTo(-3,4);cx.closePath();cx.fill();cx.restore(); } }
  if(p.statuses.poison.t>0){cx.save();cx.globalAlpha=0.3;cx.strokeStyle=C.sick;cx.lineWidth=2;cx.beginPath();cx.arc(p.x,p.y,p.r+5+Math.sin(G.uiTime*6)*2,0,TAU);cx.stroke();cx.restore();}
  if(p.statuses.burn.t>0){cx.save();cx.globalAlpha=0.35;cx.strokeStyle=C.candle;cx.lineWidth=2;cx.beginPath();cx.arc(p.x,p.y,p.r+5+Math.sin(G.uiTime*9)*2,0,TAU);cx.stroke();cx.restore();}
  if(p.frenzyActive){cx.save();cx.globalAlpha=0.25+Math.sin(G.uiTime*12)*0.1;cx.strokeStyle=C.blood2;cx.lineWidth=2;cx.beginPath();cx.arc(p.x,p.y,p.r+9,0,TAU);cx.stroke();cx.restore();}
}
function drawEnemy(e){
  if(e.x<cam.x-60||e.x>cam.x+W+60||e.y<cam.y-60||e.y>cam.y+H+60) { if(!e.isBoss) return; }
  const bob=Math.sin(G.uiTime*8+e.wob)*1.5;
  cx.save();cx.translate(e.x,e.y+ (e.isBoss?0:bob));
  cx.fillStyle='rgba(0,0,0,.4)';cx.beginPath();cx.ellipse(0,e.r*0.8,e.r*0.9,e.r*0.35,0,0,TAU);cx.fill();
  if(e.elite){ cx.save();cx.globalAlpha=0.5+Math.sin(G.uiTime*5+e.wob)*0.22;cx.strokeStyle=C.gold2;cx.lineWidth=2.5;cx.shadowColor=C.gold2;cx.shadowBlur=8;cx.beginPath();cx.arc(0,0,e.r+5,0,TAU);cx.stroke();cx.restore(); }
  const col=e.hitFlash>0?'#fff':e.color;
  if(!e.isBoss){ cx.strokeStyle='rgba(255,236,210,.32)';cx.lineWidth=2;cx.beginPath();cx.arc(0,0,e.r+1.5,0,TAU);cx.stroke(); }
  if(e.isBoss){ drawBoss(e,col); }
  else {
    cx.fillStyle=col;
    if(e.type==='swarmer'){cx.beginPath();cx.arc(0,0,e.r,0,TAU);cx.fill();cx.fillStyle='#000';cx.beginPath();cx.arc(0,0,e.r*0.4,0,TAU);cx.fill();}
    else if(e.type==='tank'){cx.fillRect(-e.r,-e.r,e.r*2,e.r*2);cx.strokeStyle='#2a241c';cx.lineWidth=2;cx.strokeRect(-e.r,-e.r,e.r*2,e.r*2);cx.fillStyle='#3a342c';cx.fillRect(-e.r*0.5,-e.r*0.5,e.r,e.r);}
    else if(e.type==='shooter'){cx.beginPath();cx.moveTo(0,-e.r);cx.lineTo(e.r,e.r*0.8);cx.lineTo(-e.r,e.r*0.8);cx.closePath();cx.fill();cx.fillStyle='#d6c060';cx.beginPath();cx.arc(0,0,e.r*0.25,0,TAU);cx.fill();}
    else if(e.type==='spitter'){cx.beginPath();cx.arc(0,0,e.r,0,TAU);cx.fill();cx.fillStyle='#5a7020';cx.beginPath();cx.arc(0,0,e.r*0.5,0,TAU);cx.fill();cx.fillStyle='#c8e070';cx.beginPath();cx.arc(e.r*0.2,-e.r*0.2,e.r*0.18,0,TAU);cx.fill();}
    else if(e.type==='exploder'){const pulse=0.5+Math.sin(G.uiTime*10+e.wob)*0.5;cx.shadowColor=C.candle;cx.shadowBlur=10*pulse;cx.beginPath();cx.arc(0,0,e.r,0,TAU);cx.fill();cx.shadowBlur=0;cx.fillStyle='#5a1a08';cx.beginPath();cx.arc(0,0,e.r*0.4,0,TAU);cx.fill();}
    else if(e.type==='flyer'){const wf=Math.sin(G.uiTime*16+e.wob)*0.5;cx.fillStyle='#2a2030';cx.beginPath();cx.ellipse(-e.r*0.95,-e.r*0.1,e.r*0.75,e.r*0.32,wf,0,TAU);cx.fill();cx.beginPath();cx.ellipse(e.r*0.95,-e.r*0.1,e.r*0.75,e.r*0.32,-wf,0,TAU);cx.fill();cx.fillStyle=col;cx.beginPath();cx.arc(0,0,e.r*0.7,0,TAU);cx.fill();cx.fillStyle='#f0e0ff';cx.beginPath();cx.arc(0,-e.r*0.1,e.r*0.22,0,TAU);cx.fill();}
    else if(e.type==='healer'){cx.beginPath();cx.arc(0,0,e.r,0,TAU);cx.fill();cx.fillStyle='#1a3a28';cx.fillRect(-e.r*0.16,-e.r*0.6,e.r*0.32,e.r*1.2);cx.fillRect(-e.r*0.5,-e.r*0.16,e.r*1.0,e.r*0.32);cx.strokeStyle='#bfeacf';cx.lineWidth=2;cx.globalAlpha=0.6+Math.sin(G.uiTime*4+e.wob)*0.3;cx.beginPath();cx.arc(0,0,e.r*0.8,0,TAU);cx.stroke();cx.globalAlpha=1;}
    else if(e.type==='summoner'){cx.beginPath();cx.arc(0,0,e.r,0,TAU);cx.fill();cx.save();cx.rotate(G.uiTime*1.4);cx.strokeStyle='#d0a8ff';cx.lineWidth=1.5;cx.beginPath();for(let k=0;k<=3;k++){const a=k/3*TAU;cx.lineTo(Math.cos(a)*e.r*0.7,Math.sin(a)*e.r*0.7);}cx.stroke();cx.restore();cx.fillStyle='#1a1020';cx.beginPath();cx.arc(0,0,e.r*0.32,0,TAU);cx.fill();}
    else{cx.beginPath();cx.arc(0,0,e.r,0,TAU);cx.fill();cx.fillStyle='#3a0a0c';cx.beginPath();cx.arc(2,-2,e.r*0.4,0,TAU);cx.fill();cx.fillStyle='#e0c0a0';const ea=Math.atan2(player.y-e.y,player.x-e.x);cx.beginPath();cx.arc(Math.cos(ea)*e.r*0.4,Math.sin(ea)*e.r*0.4,e.r*0.14,0,TAU);cx.fill();}
  }
  cx.restore();
  if(!e.isBoss && e.hp<e.maxHp){
    const w=e.r*2,hpw=clamp(e.hp/e.maxHp,0,1)*w;
    cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(e.x-e.r,e.y-e.r-8,w,3);
    cx.fillStyle=C.blood2;cx.fillRect(e.x-e.r,e.y-e.r-8,hpw,3);
  }
}
function drawBoss(e,col){
  const s=e.r, k=e.bossKind, t=G.uiTime;
  if(k==='maggot'){
    // segmentierter Wurm-Körper
    for(let i=4;i>=0;i--){const seg=s*(1-i*0.12);cx.fillStyle=i===0?col:'#7a8c3a';cx.beginPath();cx.arc(-Math.cos(e.spin)*i*6, i*6, seg,0,TAU);cx.fill();}
    cx.fillStyle=col;cx.beginPath();cx.arc(0,0,s,0,TAU);cx.fill();
    cx.fillStyle='#1a2208';cx.beginPath();cx.arc(-s*0.3,-s*0.2,s*0.18,0,TAU);cx.arc(s*0.3,-s*0.2,s*0.18,0,TAU);cx.fill();
    cx.strokeStyle=C.sick;cx.lineWidth=3;cx.beginPath();cx.arc(0,0,s,0,TAU);cx.stroke();
  } else if(k==='surgeon'){
    cx.fillStyle='#14202a';cx.beginPath();cx.arc(0,0,s,0,TAU);cx.fill();
    cx.fillStyle='#cfe0ff';cx.fillRect(-s*0.7,-s*0.16,s*1.4,s*0.32); // Maske
    cx.fillStyle='#0a1016';cx.fillRect(-s*0.5,-s*0.08,s*0.34,s*0.16);cx.fillRect(s*0.16,-s*0.08,s*0.34,s*0.16);
    // Skalpell-Arme
    cx.save();cx.rotate(Math.sin(t*3)*0.4);cx.strokeStyle='#9aa0a8';cx.lineWidth=3;cx.beginPath();cx.moveTo(0,0);cx.lineTo(s*1.5,-s*0.6);cx.stroke();cx.restore();
    cx.strokeStyle='#7fd0e6';cx.lineWidth=2;cx.beginPath();cx.arc(0,0,s,0,TAU);cx.stroke();
  } else if(k==='lamb'){
    cx.fillStyle='#e8e0d0';cx.beginPath();cx.arc(0,0,s,0,TAU);cx.fill(); // wolliger Körper
    for(let i=0;i<8;i++){const a=i/8*TAU+e.spin;cx.beginPath();cx.arc(Math.cos(a)*s,Math.sin(a)*s,s*0.4,0,TAU);cx.fill();}
    cx.fillStyle='#1a1410';cx.beginPath();cx.arc(0,0,s*0.6,0,TAU);cx.fill();
    cx.fillStyle=C.blood2;cx.beginPath();cx.arc(-s*0.22,-s*0.1,s*0.1,0,TAU);cx.arc(s*0.22,-s*0.1,s*0.1,0,TAU);cx.arc(0,s*0.15,s*0.1,0,TAU);cx.fill();
  } else if(k==='crucified'){
    // Kreuzform
    cx.fillStyle='#2a0a0c';cx.fillRect(-s*0.3,-s*1.3,s*0.6,s*2.6);cx.fillRect(-s*1.2,-s*0.4,s*2.4,s*0.6);
    cx.fillStyle=col;cx.beginPath();cx.arc(0,-s*0.4,s*0.7,0,TAU);cx.fill();
    cx.strokeStyle=C.gold2;cx.lineWidth=2;cx.beginPath();cx.arc(0,-s*0.4-s,s*0.4,0,TAU);cx.stroke(); // Heiligenschein
    cx.fillStyle='#000';cx.beginPath();cx.arc(-s*0.2,-s*0.45,s*0.1,0,TAU);cx.arc(s*0.2,-s*0.45,s*0.1,0,TAU);cx.fill();
  } else {
    cx.strokeStyle='rgba(224,178,90,.5)';cx.lineWidth=2;cx.beginPath();cx.arc(0,-e.r-6,10,0,TAU);cx.stroke();
    cx.fillStyle=col;cx.beginPath();cx.arc(0,0,e.r,0,TAU);cx.fill();
    cx.fillStyle='#2a0a0c';cx.fillRect(-4,-e.r-2,8,e.r*1.6);cx.fillRect(-12,-e.r*0.3,24,7);
    cx.strokeStyle=C.gold2;cx.lineWidth=2;cx.beginPath();cx.arc(0,0,e.r,0,TAU);cx.stroke();
  }
}

/* ---------- HERO RENDER ---------- */
function drawHero(g,id,x,y,s,t,moving,aim){
  const sk=(charById(id)&&charById(id).skin)||id;   // freischaltbare Chars nutzen ein Basis-Design
  const bob=moving?Math.sin(t*12)*0.14*s:Math.sin(t*2.5)*0.07*s;
  const sw=Math.sin(t*2.5)*0.06*s;
  g.save();g.translate(x,y+bob);
  g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(0,s*1.0,s*0.85,s*0.32,0,0,TAU);g.fill();
  const W2=v=>Math.max(1,v);
  if(sk==='penitent'){
    g.fillStyle='#23222a';g.beginPath();g.moveTo(-s*0.8+sw,s);g.lineTo(-s*0.45,-s*0.45);g.lineTo(s*0.45,-s*0.45);g.lineTo(s*0.8-sw,s);g.closePath();g.fill();
    g.strokeStyle='rgba(216,205,184,.4)';g.lineWidth=W2(s*0.08);g.beginPath();g.moveTo(-s*0.8+sw,s);g.lineTo(s*0.8-sw,s);g.stroke();
    g.strokeStyle='#8a7a4a';g.lineWidth=W2(s*0.07);g.beginPath();g.moveTo(-s*0.4,s*0.15);g.lineTo(s*0.4,s*0.15);g.stroke();
    g.fillStyle='#17161c';g.beginPath();g.arc(0,-s*0.55,s*0.5,0,TAU);g.fill();
    g.fillStyle='#000';g.beginPath();g.arc(0,-s*0.5,s*0.34,0,TAU);g.fill();
    g.fillStyle=C.blood2;g.beginPath();g.arc(Math.cos(aim)*s*0.16,Math.sin(aim)*s*0.12-s*0.5,s*0.09,0,TAU);g.fill();
    g.save();g.rotate(aim);g.strokeStyle=C.bone;g.lineWidth=W2(s*0.16);g.lineCap='round';g.beginPath();g.moveTo(s*0.3,s*0.1);g.lineTo(s*1.1,s*0.1);g.stroke();g.restore();
  } else if(sk==='executioner'){
    const ww=1.25;
    g.fillStyle='#1c1417';g.beginPath();g.moveTo(-s*0.9*ww+sw,s);g.lineTo(-s*0.6*ww,-s*0.3);g.lineTo(s*0.6*ww,-s*0.3);g.lineTo(s*0.9*ww-sw,s);g.closePath();g.fill();
    g.fillStyle='#3a1518';g.beginPath();g.moveTo(-s*0.35,-s*0.2);g.lineTo(s*0.35,-s*0.2);g.lineTo(s*0.3,s*0.95);g.lineTo(-s*0.3,s*0.95);g.closePath();g.fill();
    g.fillStyle='#0f0c0e';g.beginPath();g.ellipse(-s*0.7*ww,-s*0.3,s*0.3,s*0.22,0,0,TAU);g.fill();g.beginPath();g.ellipse(s*0.7*ww,-s*0.3,s*0.3,s*0.22,0,0,TAU);g.fill();
    g.fillStyle='#15080a';g.beginPath();g.arc(0,-s*0.6,s*0.5,0,TAU);g.fill();
    g.fillStyle=C.blood2;g.beginPath();g.arc(-s*0.18,-s*0.6,s*0.07,0,TAU);g.fill();g.beginPath();g.arc(s*0.18,-s*0.6,s*0.07,0,TAU);g.fill();
    g.save();g.rotate(aim);g.strokeStyle='#6a5a4a';g.lineWidth=W2(s*0.22);g.lineCap='round';g.beginPath();g.moveTo(s*0.3,s*0.15);g.lineTo(s*1.0,s*0.15);g.stroke();
    g.fillStyle='#9aa0a8';g.beginPath();g.moveTo(s*0.9,-s*0.15);g.lineTo(s*1.4,s*0.15);g.lineTo(s*0.9,s*0.45);g.closePath();g.fill();g.restore();
  } else if(sk==='heretic'){
    const ww=0.9;
    g.save();g.shadowColor='rgba(155,191,58,.7)';g.shadowBlur=s*0.8;
    g.fillStyle='#191a14';g.beginPath();g.moveTo(-s*0.7*ww+sw,s*0.5);g.lineTo(-s*0.7*ww,s);
    const zig=5;for(let i=0;i<=zig;i++){const xx=-s*0.7*ww+(s*1.4*ww)*(i/zig);const yy=s+(i%2?-s*0.18:0);g.lineTo(xx,yy);}
    g.lineTo(s*0.7*ww-sw,s*0.5);g.lineTo(s*0.45,-s*0.4);g.lineTo(-s*0.45,-s*0.4);g.closePath();g.fill();g.restore();
    g.fillStyle='#14140f';g.beginPath();g.arc(0,-s*0.5,s*0.42,0,TAU);g.fill();
    g.fillStyle='#0a0a08';g.beginPath();g.moveTo(-s*0.3,-s*0.75);g.lineTo(-s*0.5,-s*1.15);g.lineTo(-s*0.16,-s*0.8);g.closePath();g.fill();
    g.beginPath();g.moveTo(s*0.3,-s*0.75);g.lineTo(s*0.5,-s*1.15);g.lineTo(s*0.16,-s*0.8);g.closePath();g.fill();
    g.fillStyle=C.sick;g.beginPath();g.arc(-s*0.14,-s*0.5,s*0.08,0,TAU);g.fill();g.beginPath();g.arc(s*0.14,-s*0.5,s*0.08,0,TAU);g.fill();
    g.save();g.rotate(aim);g.strokeStyle=C.sick;g.lineWidth=W2(s*0.14);g.lineCap='round';g.beginPath();g.moveTo(s*0.2,s*0.05);g.lineTo(s*1.0,s*0.05);g.stroke();
    g.fillStyle='rgba(155,191,58,.9)';g.beginPath();g.arc(s*1.05,s*0.05,s*0.14,0,TAU);g.fill();g.restore();
  } else {
    g.fillStyle='#16160f';g.beginPath();g.moveTo(-s*0.6+sw,s);g.lineTo(-s*0.4,-s*0.3);g.lineTo(s*0.4,-s*0.3);g.lineTo(s*0.6-sw,s);g.closePath();g.fill();
    g.fillStyle='#3a3a20';for(let i=0;i<3;i++){g.beginPath();g.arc(0,-s*0.1+i*s*0.3,s*0.05,0,TAU);g.fill();}
    g.fillStyle='#12120c';g.beginPath();g.arc(0,-s*0.55,s*0.4,0,TAU);g.fill();
    g.save();g.translate(0,-s*0.5);g.rotate(aim);
    g.fillStyle='#cdbf8a';g.beginPath();g.moveTo(0,-s*0.12);g.lineTo(s*0.7,0);g.lineTo(0,s*0.12);g.closePath();g.fill();
    g.fillStyle='#2a2a18';g.beginPath();g.arc(s*0.05,0,s*0.1,0,TAU);g.fill();g.restore();
    g.fillStyle='#0a0a06';g.beginPath();g.ellipse(0,-s*0.78,s*0.55,s*0.16,0,0,TAU);g.fill();g.beginPath();g.ellipse(0,-s*0.95,s*0.26,s*0.2,0,0,TAU);g.fill();
    g.save();g.rotate(aim);g.fillStyle='rgba(155,191,58,.5)';g.beginPath();g.arc(s*0.9,s*0.2,s*0.2,0,TAU);g.fill();
    g.strokeStyle='#6a6a40';g.lineWidth=W2(s*0.06);g.beginPath();g.moveTo(s*0.4,0);g.lineTo(s*0.85,s*0.18);g.stroke();g.restore();
  }
  g.restore();
}

/* ---------- AMBIENT (menu) ---------- */
let embers=[];for(let i=0;i<60;i++)embers.push({x:rand(0,W),y:rand(0,H),s:rand(.3,1.4),v:rand(8,30)});
function renderAmbient(dt){
  cx.fillStyle='#060608';cx.fillRect(0,0,W,H);
  cx.fillStyle='#0c0a0e';cx.beginPath();cx.moveTo(0,H);cx.quadraticCurveTo(W/2,H*0.55,W,H);cx.fill();
  cx.save();cx.globalAlpha=0.5;cx.fillStyle='#141017';cx.translate(W/2,H*0.62);cx.fillRect(-7,-130,14,160);cx.fillRect(-42,-96,84,16);cx.restore();
  const mg=cx.createRadialGradient(W*0.5,H*0.62-110,4,W*0.5,H*0.62-110,260);mg.addColorStop(0,'rgba(192,31,36,.25)');mg.addColorStop(1,'rgba(0,0,0,0)');
  cx.fillStyle=mg;cx.fillRect(0,0,W,H);
  for(const e of embers){e.y-=e.v*dt;e.x+=Math.sin(G.uiTime+e.y*0.02)*8*dt;if(e.y<-4){e.y=H+4;e.x=rand(0,W);}cx.fillStyle='rgba(224,138,47,'+(0.3+e.s*0.3)+')';cx.beginPath();cx.arc(e.x,e.y,e.s,0,TAU);cx.fill();}
  const vg=cx.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,H*0.8);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.7)');
  cx.fillStyle=vg;cx.fillRect(0,0,W,H);
}

/* =========================================================================
   HUD UPDATERS
   ========================================================================= */
function fillHpEls(p,fill,shield,txt){ $(fill).style.width=(p.dead?0:clamp(p.hp/p.maxHP*100,0,100))+'%';
  $(shield).style.width=(p.shieldMax>0?clamp(p.shield/p.maxHP*100,0,100):0)+'%';
  $(txt).textContent=p.dead?'✝':(Math.max(0,Math.ceil(p.hp))+' / '+p.maxHP+(p.shieldMax>0&&p.shield>0?' (+'+Math.ceil(p.shield)+')':'')); }
function updateHP(){ const p1=players[0]; if(!p1)return; fillHpEls(p1,'#hpFill','#shieldFill','#hpText');
  const box=$('#hud2'); if(!box)return; const p2=players[1];
  if(G.coop&&p2){ box.style.display='flex'; fillHpEls(p2,'#hpFill2','#shieldFill2','#hpText2'); $('#lvlTag2').textContent=p2.level; } else box.style.display='none'; }
function updateXPBar(){ const p1=players[0]; if(!p1)return; $('#xpFill').style.width=clamp(p1.xp/p1.xpNext*100,0,100)+'%'; $('#lvlTag').textContent=p1.level;
  if(G.coop&&players[1]&&$('#lvlTag2')) $('#lvlTag2').textContent=players[1].level; }
function updateWeaponBar(){ const p=players[0]||player; if(!p)return;const bar=$('#weaponbar');bar.innerHTML='';
  p.weapons.forEach(id=>{const w=weaponById(id);const l=p.wLevel[id]||0;const el=document.createElement('div');el.className='wslot';
    el.innerHTML='<span>'+svgIcon(w.ic,w.color,16)+'</span><span class="wn">'+w.name+'</span>'+(l?'<span class="wl">+'+l+'</span>':'')+'<i class="wcd"></i>';bar.appendChild(el);});
  autoCollapse('weaponDock',p.weapons.length,5); }
/* pro Frame: Abklingzeiten (Ausweichen, Waffen ab 0,3 s) und verbleibende Gegner */
function updateHudLive(){ const p=players[0]; if(!p)return;
  const dr=Admin.dash?1:clamp(1-p.dashCd/DASH_CD,0,1); $('#dashFill').style.width=dr*100+'%'; $('#dashBtn').style.setProperty('--cd',dr);
  document.querySelectorAll('#weaponbar .wcd').forEach((el,i)=>{ const mx=(p.wCdMax&&p.wCdMax[i])||0; el.style.width=(mx>0.3?clamp(1-p.wCd[i]/mx,0,1)*100:100)+'%'; });
  const n=enemies.length; if(n!==G._foeN){ G._foeN=n; $('#foeLabel').innerHTML=t('hud_foes',{n:'<b>'+n+'</b>'}); } }
function updateItemPills(){ if(!player)return;const wrap=$('#itemPills');wrap.innerHTML='';
  player.items.forEach(it=>{const el=document.createElement('div');el.className='ipill'+(it.ability?' ab':'');el.innerHTML=svgIcon(it.ic,it.color,14);wrap.appendChild(el);});
  autoCollapse('itemDock',player.items.length,10); }
function autoCollapse(dockId,count,threshold){ const d=$('#'+dockId); if(!d)return; if(count>threshold && !d.dataset.user) d.classList.add('collapsed'); }
function setDock(dockId,collapsed){ const d=$('#'+dockId); if(!d)return; d.classList.toggle('collapsed',collapsed); }
$('#weaponToggle').onclick=()=>{const d=$('#weaponDock');d.classList.toggle('collapsed');d.dataset.user='1';};
$('#itemToggle').onclick=()=>{const d=$('#itemDock');d.classList.toggle('collapsed');d.dataset.user='1';};
function updateStatusBar(){ if(!player)return; const bar=$('#statusBar'),s=player.statuses; let html='';
  if(s.poison.t>0) html+=statusBadge('plague',C.sick,s.poison.t);
  if(s.burn.t>0) html+=statusBadge('flame',C.candle,s.burn.t);
  if(s.chill.t>0) html+=statusBadge('snow',C.chill,s.chill.t);
  bar.innerHTML=html; }
function statusBadge(icon,color,t){ return '<span class="sbadge" style="border-color:'+color+'">'+svgIcon(icon,color,16)+'<span class="sb-t" style="color:'+color+'">'+t.toFixed(1)+'s</span></span>'; }
function drawHead(){
  hcx.clearRect(0,0,head.width,head.height);
  drawHero(hcx,G.charId,head.width/2,head.height*0.72,head.width*0.34,G.uiTime,false,Math.sin(G.uiTime*1.5)*0.4);
}

/* =========================================================================
   MAIN LOOP
   ========================================================================= */
let last=performance.now();
function loop(now){
  let dt=(now-last)/1000;last=now;dt=clamp(dt,0,0.05);
  G.uiTime+=dt;
  if(G.state==='playing'){
    G.time+=dt; if(G.run)G.run.time=G.time; if(G.hurtFlash>0)G.hurtFlash-=dt;
    for(const pl of players){ if(pl.dead)continue; player=pl; updatePlayer(dt); updateStatuses(dt); if(G.state!=='playing')break; }
    player=anchorPlayer();
    if(G.state==='playing'){
      for(const pl of players){ if(pl.dead)continue; player=pl; updateAbilities(dt); }
      player=anchorPlayer();
      for(let i=enemies.length-1;i>=0;i--) if(enemies[i]) updateEnemy(enemies[i],dt);
      updateDeployables(dt);updateBullets(dt);updatePuddles(dt);updatePickups(dt);updateParticles(dt);updateFloaters(dt);
      checkCleared(dt);
      if(G.boss)$('#bossFill').style.width=clamp(G.boss.hp/G.boss.maxHp*100,0,100)+'%';
      updateHudLive();
    }
    renderGame();
  } else if(G.state==='collect'){
    G.collectT+=dt;
    vacuumPickups(dt); updateParticles(dt); updateFloaters(dt);
    renderGame();
    if(pickups.length===0 || G.collectT>1.5) openPostWave();
  } else if(G.state==='paused'||G.state==='stats'||G.state==='shop'||G.state==='upgrade'||G.state==='ability'||G.state==='endless'){
    renderGame();
  } else { renderAmbient(dt);
    if(G.state==='charselect') for(const pv of charPreviews){pv.ctx.clearRect(0,0,pv.cv.width,pv.cv.height);pv.ctx.globalAlpha=pv.locked?0.22:1;const aim=Math.sin(G.uiTime*1.1+pv.phase)*0.5-0.2;drawHero(pv.ctx,pv.id,pv.cv.width/2,pv.cv.height*0.66,pv.cv.width*0.26,G.uiTime,false,aim);pv.ctx.globalAlpha=1;}
  }
  if(player && (G.state==='playing'||G.state==='paused'||G.state==='stats'||G.state==='collect')) drawHead();
  if(dbgOn && (dbgT+=dt)>0.4){ dbgT=0; renderDbg(); }
  const lb=$('#langBtn'); if(lb) lb.style.display=document.querySelector('.overlay.show')?'block':'none';
  requestAnimationFrame(loop);
}

/* =========================================================================
   UI WIRING
   ========================================================================= */
function hideAllOverlays(){ document.querySelectorAll('.overlay').forEach(o=>o.classList.remove('show')); }
function show(id){ $('#'+id).classList.add('show'); }

/* ---------- SITE GATE (Zugangswort vor der Seite) ---------- */
const SITE_PASSWORD='Alex';
function passSiteGate(){ hideAllOverlays(); show('login'); setTimeout(()=>$('#loginUser').focus(),50); }
function trySiteGate(){
  if($('#siteGatePass').value===SITE_PASSWORD){ try{sessionStorage.setItem('golgotha_site','1');}catch(e){} passSiteGate(); }
  else { $('#siteGateErr').textContent=t('gate_err'); }
}
$('#siteGateBtn').onclick=()=>{ initAudio(); trySiteGate(); };
$('#siteGatePass').addEventListener('keydown',e=>{ if(e.code==='Enter')$('#siteGateBtn').click(); });
try{ if(sessionStorage.getItem('golgotha_site')==='1') passSiteGate(); }catch(e){}

/* ---------- LOGIN ---------- */
function refreshProfile(){
  const u=DB.current; if(!u){$('#profileBox').textContent='';return;}
  const s=u.stats;
  $('#profileBox').innerHTML=t('prof_line',{name:u.name,runs:s.runs,best:s.bestLevel,kills:s.kills});
}
$('#loginBtn').onclick=async ()=>{ initAudio(); $('#loginErr').textContent='…'; const err=await DB.login($('#loginUser').value,$('#loginPass').value);
  if(err){$('#loginErr').textContent=err;return;} $('#loginErr').textContent=''; $('#loginPass').value=''; if(DB.current.meta&&DB.current.meta.lang)LANG=DB.current.meta.lang; applyLang(); refreshProfile(); hideAllOverlays(); G.state='menu'; show('menu'); };
$('#registerBtn').onclick=async ()=>{ initAudio(); $('#loginErr').textContent='…'; const err=await DB.register($('#loginUser').value,$('#loginPass').value);
  if(err){$('#loginErr').textContent=err;return;} $('#loginErr').textContent=''; $('#loginPass').value=''; applyLang(); refreshProfile(); hideAllOverlays(); G.state='menu'; show('menu'); };
$('#loginPass').addEventListener('keydown',e=>{if(e.code==='Enter')$('#loginBtn').click();});
$('#btnLogout').onclick=()=>{ DB.logout(); G.state='login'; hideAllOverlays(); $('#loginUser').value='';$('#loginPass').value=''; show('login'); };

$('#btnStart').onclick=()=>{initAudio();G.coopPick=0;G.state='charselect';hideAllOverlays();renderCharCards();show('charselect');};
$('#btnHow').onclick=()=>{hideAllOverlays();show('how');};
$('#howBack').onclick=()=>{hideAllOverlays();show('menu');};
$('#btnProfile').onclick=()=>{fillProfile();hideAllOverlays();show('profile');};
$('#profileClose').onclick=()=>{hideAllOverlays();show('menu');};
$('#btnAdmin').onclick=()=>openAdminGate();

/* ---------- META (Seelenschmiede) ---------- */
function openMeta(){ G.state='meta'; hideAllOverlays(); renderMeta(); show('meta'); }
function renderMeta(){
  const cur=(DB.current&&DB.current.meta&&DB.current.meta.currency)||0;
  $('#metaSub').innerHTML=t('meta_sub',{souls:cur});
  const wrap=$('#metaCards'); wrap.innerHTML='';
  META_UPGRADES.forEach(u=>{
    const lvl=metaLevel(u.id), maxed=lvl>=META_MAX, cost=metaCost(lvl), can=!maxed&&cur>=cost;
    const el=document.createElement('div'); el.className='rcard'+(can?'':' locked'); el.style.borderColor='var(--gold)';
    el.innerHTML='<div class="ic">'+svgIcon(u.ic,C.gold2,32)+'</div>'+
      '<div class="rn">'+metaName(u.id)+'</div>'+
      '<div class="mlvl">'+t('meta_lvl',{lvl:lvl,max:META_MAX})+' · +'+(lvl*5)+'%</div>'+
      '<div class="mbar"><div class="mfill" style="width:'+(lvl/META_MAX*100)+'%"></div></div>'+
      (maxed?'<div class="owned">'+t('meta_max')+'</div>':'<div class="price'+(can?'':' cant')+'">'+t('meta_buy',{cost:cost})+'</div>');
    if(can) el.onclick=()=>buyMeta(u.id);
    wrap.appendChild(el);
  });
}
function buyMeta(id){ if(!DB.current)return; const lvl=metaLevel(id); if(lvl>=META_MAX)return;
  const m=DB.current.meta=DB.current.meta||{currency:0,levels:{}}; const cost=metaCost(lvl);
  if((m.currency||0)<cost)return;
  m.currency-=cost; m.levels=m.levels||{}; m.levels[id]=lvl+1; DB.save(); Audio2.buy(); renderMeta(); }
$('#btnMeta').onclick=()=>openMeta();
$('#metaBack').onclick=()=>{hideAllOverlays();show('menu');};

/* ---------- ACHIEVEMENTS ---------- */
function openAchievements(){ G.state='achievements'; hideAllOverlays(); renderAchievements(); show('achievements'); }
function renderAchievements(){
  const got=(DB.current&&DB.current.achievements)||{};
  const have=ACHIEVEMENTS.filter(a=>got[a.id]).length;
  $('#achSub').textContent=t('ach_sub',{have:have,total:ACHIEVEMENTS.length});
  const wrap=$('#achGrid'); wrap.innerHTML='';
  ACHIEVEMENTS.forEach(a=>{
    const done=!!got[a.id];
    const el=document.createElement('div'); el.className='ach '+(done?'done':'todo');
    el.innerHTML='<div class="ai">'+svgIcon(a.ic,done?C.gold2:C.bone,22)+'</div>'+
      '<div><div class="an">'+achName(a)+'</div><div class="ad">'+achDesc(a)+'</div></div>'+
      (done?'<div class="achk">✦</div>':'');
    wrap.appendChild(el);
  });
}
$('#btnAch').onclick=()=>openAchievements();
$('#achBack').onclick=()=>{hideAllOverlays();show('menu');};
$('#charBack').onclick=()=>{charPreviews=[];hideAllOverlays();show('menu');};

function fillProfile(){
  const u=DB.current; if(!u)return; const s=u.stats;
  $('#profileName').textContent=u.name;
  const rows=[
    [t('p_runs'),s.runs],[t('p_wins'),s.wins],[t('p_deaths'),s.deaths],
    [t('p_kills'),s.kills],[t('p_bosses'),s.bossKills],
    [t('p_bestlevel'),s.bestLevel],[t('p_bestchar'),s.bestCharLevel],
    [t('p_gold'),s.gold],[t('p_playtime'),Math.round(s.playTime)+'s'],
  ];
  $('#profileGrid').innerHTML=rows.map(r=>'<div class="stat-row"><span class="l">'+r[0]+'</span><span class="v">'+r[1]+'</span></div>').join('');
}

function renderCharCards(){
  const wrap=$('#charCards');wrap.innerHTML='';charPreviews=[];
  CHARS.forEach((c,idx)=>{
    const w=weaponById(c.weapon);
    const unlocked=isCharUnlocked(c);
    const bar=(v,mn,mx)=>clamp((v-mn)/(mx-mn)*100,8,100);
    const el=document.createElement('div');el.className='char-card'+(unlocked?'':' locked');
    el.innerHTML='<canvas class="char-canvas" width="120" height="144"></canvas>'+
      '<div class="char-name">'+c.name+'</div><div class="char-role">'+c.role+'</div>'+
      (unlocked ? '<div class="char-lore">'+c.lore+'</div>'
                : '<div class="char-lore lock-req">🔒 '+t('char_locked')+'<br><span>'+unlockDesc(c)+'</span></div>')+
      '<div class="char-stats">'+
        '<div class="row">'+t('dc_hp').toUpperCase()+'<div class="bar"><div class="fill" style="width:'+bar(c.hp,40,170)+'%"></div></div></div>'+
        '<div class="row">'+t('s_speed').toUpperCase()+'<div class="bar"><div class="fill" style="width:'+bar(c.speed,0.78,1.2)+'%"></div></div></div>'+
        '<div class="row">'+t('s_dmg').toUpperCase()+'<div class="bar"><div class="fill" style="width:'+bar(c.dmg,0.9,1.35)+'%"></div></div></div>'+
      '</div>'+
      '<div class="char-weapon">'+svgIcon(w.ic,w.color,16)+' '+(unlocked?w.name:'???')+'</div>';
    if(unlocked) el.onclick=()=>{charPreviews=[];pickChar(c.id);};
    wrap.appendChild(el);
    const cvp=el.querySelector('canvas');
    charPreviews.push({cv:cvp,ctx:cvp.getContext('2d'),id:c.id,phase:idx*1.3,locked:!unlocked});
  });
  updateCoopUI();
}
function pickChar(id){
  if(!G.coop){ openModifiers(id); return; }
  if(G.coopPick===0){ G.pendingChar=id; G.coopPick=1; renderCharCards(); }   // Spieler 1 gewählt → Spieler 2 wählt
  else { G.pendingChar2=id; G.coopPick=0; openModifiers(G.pendingChar); }      // beide gewählt → Modifikatoren
}
function updateCoopUI(){ const tb=$('#coopToggle'); if(tb)tb.textContent=G.coop?t('coop_on'):t('coop_off');
  const st=$('#coopStatus'); if(st)st.textContent=G.coop?(G.coopPick===0?t('coop_p1pick'):t('coop_p2')):''; }
$('#coopToggle').onclick=()=>{ G.coop=!G.coop; G.coopPick=0; renderCharCards(); };

/* ---------- MODIFIERS (Schwierigkeit + Fluch-Chance) ---------- */
function openModifiers(charId){
  G.pendingChar=charId; if(!diffById(G.pendingDiff))G.pendingDiff='medium';
  G.state='modifiers'; hideAllOverlays();
  $('#modChar').textContent=t('mod_char',{name:charById(charId).name});
  renderDiffCards(); renderModChips(); updateCustomVis(); updateDiffNote(); show('modifiers');
}
function renderDiffCards(){
  const wrap=$('#diffCards'); wrap.innerHTML='';
  DIFFICULTIES.forEach(d=>{
    const el=document.createElement('div');
    el.className='diff-card'+(d.custom?' custom':'')+(d.id===G.pendingDiff?' sel':'');
    el.style.color=d.color;
    if(d.custom) el.innerHTML='<div class="dn">'+diffName(d)+'</div><div class="dd">'+t('custom_hint')+'</div>';
    else el.innerHTML='<div class="dn">'+diffName(d)+'</div>'+
      '<div class="dd">'+t('dc_enemies')+' ×'+d.enemyCount+' · '+t('dc_hp')+' ×'+d.enemyHp+'<br>'+t('dc_dmg')+' ×'+d.enemyDmg+' · '+t('dc_fire')+' ×'+d.fireRate+'<br><span style="color:var(--gold2)">'+t('dc_reward')+' ×'+d.reward+'</span> · '+t('dc_curse')+' '+Math.round(d.curseChance*100)+'%</div>';
    el.onclick=()=>{ G.pendingDiff=d.id; renderDiffCards(); updateCustomVis(); updateDiffNote(); };
    wrap.appendChild(el);
  });
}
function renderModChips(){ const wrap=$('#modChips'); if(!wrap)return; wrap.innerHTML='';
  MODIFIERS.forEach(m=>{ const on=G.activeMods.includes(m.id);
    const el=document.createElement('div'); el.className='mod-chip'+(on?' on':''); el.textContent=(on?'✓ ':'')+modName(m);
    el.onclick=()=>{ const i=G.activeMods.indexOf(m.id); if(i>=0)G.activeMods.splice(i,1); else G.activeMods.push(m.id); renderModChips(); updateDiffNote(); };
    wrap.appendChild(el); });
}
function updateCustomVis(){ const s=$('#customSliders'); if(s)s.classList.toggle('show',G.pendingDiff==='custom'); }
function updateDiffNote(){ const d=diffById(G.pendingDiff);
  let s = d.custom ? t('custom_note') : t('diff_note',{color:d.color,name:diffName(d),pct:Math.round(d.curseChance*100)});
  if(G.activeMods.length) s+=' · <b style="color:var(--candle)">'+G.activeMods.map(id=>modName(MODIFIERS.find(m=>m.id===id))).join(', ')+'</b>';
  $('#diffNote').innerHTML=s; }
function bindCustomSlider(id,key){ const inp=$('#'+id),out=$('#'+id+'V'); if(!inp)return;
  inp.oninput=()=>{ G.customDiff[key]=+inp.value; out.textContent=parseFloat(inp.value).toFixed(1)+'×'; }; }
['cdCount:count','cdHp:hp','cdDmg:dmg','cdFire:fire'].forEach(s=>{const[a,b]=s.split(':');bindCustomSlider(a,b);});
$('#modBack').onclick=()=>{ G.state='charselect'; G.coopPick=0; hideAllOverlays(); renderCharCards(); show('charselect'); };
$('#modStart').onclick=()=>{ charPreviews=[]; startRun(G.pendingChar); };

function togglePause(on){
  if(on && G.state==='playing'){G.state='paused';show('pause');}
  else if(!on && G.state==='paused'){G.state='playing';hideAllOverlays();$('#hud').classList.add('show');last=performance.now();}
}
$('#resumeBtn').onclick=()=>togglePause(false);
$('#pauseBtn').onclick=()=>togglePause(true);
$('#pauseStats').onclick=()=>{ $('#pause').classList.remove('show'); G.state='playing'; openStats(); };
$('#pauseAdmin').onclick=()=>openAdminGate();
$('#quitBtn').onclick=()=>{ if(player&&G.run){finishRun(true,false);} G.state='menu';hideAllOverlays();$('#hud').classList.remove('show');$('#bossBarWrap').classList.remove('show');refreshProfile();show('menu');};

$('#retryBtn').onclick=()=>{G.coopPick=0;G.state='charselect';hideAllOverlays();renderCharCards();show('charselect');};
$('#goMenu').onclick=()=>{G.state='menu';hideAllOverlays();refreshProfile();show('menu');};
$('#winMenu').onclick=()=>{G.state='menu';hideAllOverlays();refreshProfile();show('menu');};

/* ---------- ADMIN (Passwort 321) ---------- */
function backToContext(){ if(player&&G.state==='paused')show('pause'); else show('menu'); }
function openAdminGate(){
  if(Admin.unlocked){ hideAllOverlays(); backToContext(); openAdmin(true); return; } // diese Sitzung bereits freigeschaltet
  $('#adminErr').textContent=''; $('#adminPass').value=''; hideAllOverlays(); show('adminGate'); setTimeout(()=>$('#adminPass').focus(),50);
}
function tryAdminGate(){ if($('#adminPass').value==='321'){ Admin.unlocked=true; $('#admin').classList.add('authed'); hideAllOverlays(); backToContext(); openAdmin(true); }
  else { $('#adminErr').textContent='Falsches Passwort'; } }
$('#adminGateBtn').onclick=tryAdminGate;
$('#adminPass').addEventListener('keydown',e=>{if(e.code==='Enter')tryAdminGate();});
$('#adminGateCancel').onclick=()=>{ hideAllOverlays(); if(player&&G.state==='paused')show('pause'); else show('menu'); };
function openAdmin(o){ $('#admin').classList.toggle('open',o);$('#adminScrim').classList.toggle('open',o); }
$('#adminClose').onclick=()=>openAdmin(false);
$('#adminScrim').onclick=()=>openAdmin(false);
$('#cGod').onchange=e=>Admin.god=e.target.checked;
$('#cOne').onchange=e=>Admin.one=e.target.checked;
$('#cDash').onchange=e=>Admin.dash=e.target.checked;
$('#cNoFire').onchange=e=>Admin.noFire=e.target.checked;
$('#cNoSpawn').onchange=e=>Admin.noSpawn=e.target.checked;
$('#cNoObs').onchange=e=>Admin.noObs=e.target.checked;
$('#cDmg').oninput=e=>{Admin.dmg=+e.target.value;$('#cDmgVal').textContent=Admin.dmg.toFixed(1);};
$('#cLuck').oninput=e=>{Admin.luck=1+(+e.target.value);$('#cLuckVal').textContent=Admin.luck.toFixed(1);};
$('#cStart').oninput=e=>{Admin.startLevel=+e.target.value;$('#cStartVal').textContent=Admin.startLevel;};
$('#cCoins').oninput=e=>{Admin.startCoins=Math.max(0,+e.target.value||0);};
$('#aHeal').onclick=()=>{if(player){player.hp=player.maxHP;updateHP();}};
$('#aHP').onclick=()=>{if(player){player.maxHP+=50;player.hp+=50;updateHP();}};
$('#aMoney').onclick=()=>{G.coins+=1000;$('#coinTag').textContent=G.coins;};
$('#aXP').onclick=()=>{if(player){for(let i=0;i<5;i++){player.level++;player.xpNext=xpForLevel(player.level);player.pendingUp++;if(ABILITY_LEVELS.includes(player.level))player.pendingAb++;}updateXPBar();}};
$('#aCure').onclick=()=>{if(player)clearStatuses();};
$('#aWeaponGive').onclick=()=>giveWeapon($('#aWeaponSel').value);
$('#aAllWeapons').onclick=()=>{WEAPONS.forEach(w=>giveWeapon(w.id));};
$('#aItemGive').onclick=()=>{const def=upDefById($('#aItemSel').value);if(def)giveUpgradeDef(def,'rare');};
$('#aClear').onclick=()=>{if(G.state==='playing')enemies.length=0;};
$('#aNext').onclick=()=>{if(G.state==='playing'||G.state==='paused'){G.boss=null;G.bossMode=false;$('#bossBarWrap').classList.remove('show');if(G.state==='paused')togglePause(false);nextLevel();}};
$('#aBoss').onclick=()=>{if(G.state==='playing'){enemies.length=0;spawnBoss(Math.max(5,G.level));}};
(function(){const ws=$('#aWeaponSel');WEAPONS.forEach(w=>{const o=document.createElement('option');o.value=w.id;o.textContent=w.name+' ('+rarName(w.rk)+')';ws.appendChild(o);});
  const is=$('#aItemSel');UPGRADE_DEFS.forEach(it=>{const o=document.createElement('option');o.value=it.id;o.textContent=it.name;is.appendChild(o);});})();

[['cGod','change'],['cOne','change'],['cDash','change'],['cNoFire','change'],['cNoSpawn','change'],['cNoObs','change'],['cDmg','input'],['cLuck','input'],
 ['aHeal','click'],['aHP','click'],['aMoney','click'],['aXP','click'],['aCure','click'],['aWeaponGive','click'],['aAllWeapons','click'],['aItemGive','click'],
 ['aClear','click'],['aNext','click'],['aBoss','click']].forEach(([id,ev])=>$('#'+id).addEventListener(ev,markCheated));

$('#langBtn').onclick=toggleLang;
applyLang();

requestAnimationFrame(loop);
