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
  how_body:'<b>WASD / Pfeile</b> — Bewegen<br><b>Leertaste</b> — Ausweichschritt (kurz unverwundbar, langer Cooldown)<br><b>Esc</b> — Pause &nbsp;·&nbsp; <b>Kopf-Symbol</b> (oben links) — aktuelle Werte<br><b>Gamepad</b> — Stick bewegt, A weicht aus, Start pausiert; in Menüs Steuerkreuz + A/B<br>Tasten belegen, Lautstärke, Bildschirmwackeln: <b>Einstellungen</b> im Hauptmenü oder in der Pause<br><br>Deine Waffen zielen und feuern <b>automatisch</b> auf den nächsten Gegner. Schüsse fliegen geradeaus. Feinde lassen <b>Gold</b> und <b>XP-Splitter</b> fallen. Nach jeder Welle öffnet sich ein Menü: kaufe <b>Waffen mit Gold</b>, verbessere deinen <b>Charakter mit Stufen</b>, und bei Stufe 10/20/30/40/50 erwachen <b>Fähigkeiten</b>.',
  char_title:'Wähle deinen Büßer', char_sub:'Jeder trägt eine andere Sünde — eine andere Waffe — andere Fähigkeiten.', char_back:'Zurück',
  mod_title:'Modifikatoren', mod_back:'Zurück', mod_start:'Beginnen',
  mod_char:'{name} — wähle deinen Schwierigkeitsgrad. Je härter, desto mehr Gegner, Leben, Schaden und Feuer — aber bessere Beute.',
  diff_note:'Gewählt: <b style="color:{color}">{name}</b> — {pct}% Chance, dass dir ein <b style="color:#e0405f">Fluch</b> angeboten wird (deutlich härter, dafür ×1,35 Beute — du entscheidest).',
  dc_enemies:'Gegner', dc_hp:'LP', dc_dmg:'Schaden', dc_fire:'Feuer', dc_reward:'Beute', dc_curse:'Fluch',
  shop_title:'Waffenkammer', shop_skip:'Weiter', shop_gold:'Gold:',
  shop_sub_full:'Arsenal voll ({cap} Waffen) — veredle sie (bis Stufe 10). Ein Kauf pro Markt.',
  shop_sub_buy:'Welle überstanden. Kaufe EINE Waffe mit Gold — oder ziehe weiter.',
  shop_nothing:'Nichts mehr feilzubieten — ziehe weiter.', shop_reroll:'Neu würfeln ({cost} Gold)', shop_items:'Gegenstände — beliebig viele Käufe, der Besuch geht weiter', shop_owned:'{n}× besessen', shop_sold:'Gekauft', items_label:'Gegenstände',
  up_title:'Aufstieg', up_sub:'Stufe {lvl} — wähle eine Verbesserung.',
  ab_title:'Erwachte Gabe', ab_sub:'Stufe {lvl} — eine Macht erwacht. Wähle eine von dreien.',
  stats_title:'Aktuelle Werte', stats_close:'Zurück', prof_title:'Pilgerbuch', prof_close:'Zurück',
  pause_title:'Innehalten', pause_resume:'Fortsetzen', pause_stats:'Werte ansehen', pause_admin:'Admin-Panel', pause_quit:'Aufgeben',
  go_title:'GEFALLEN', go_retry:'Erneut bereuen', go_menu:'Hauptmenü',
  endless_go:'Endlos weiter', endless_restart:'Neu beginnen',
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
  how_body:'<b>WASD / Arrows</b> — Move<br><b>Space</b> — Dodge step (briefly invulnerable, long cooldown)<br><b>Esc</b> — Pause &nbsp;·&nbsp; <b>Head icon</b> (top left) — current stats<br><b>Gamepad</b> — stick moves, A dodges, Start pauses; in menus D-pad + A/B<br>Rebind keys, volume, screen shake: <b>Settings</b> in the main menu or the pause menu<br><br>Your weapons aim and fire <b>automatically</b> at the nearest enemy. Shots fly straight. Enemies drop <b>Gold</b> and <b>XP shards</b>. After each wave a menu opens: buy <b>weapons with gold</b>, improve your <b>character with levels</b>, and at level 10/20/30/40/50 <b>abilities</b> awaken.',
  char_title:'Choose your Penitent', char_sub:'Each carries a different sin — a different weapon — different abilities.', char_back:'Back',
  mod_title:'Modifiers', mod_back:'Back', mod_start:'Begin',
  mod_char:'{name} — choose your difficulty. The harder it is, the more enemies, health, damage and fire — but better loot.',
  diff_note:'Selected: <b style="color:{color}">{name}</b> — {pct}% chance to be offered a <b style="color:#e0405f">Curse</b> (much harder, but ×1.35 loot — your choice).',
  dc_enemies:'Enemies', dc_hp:'HP', dc_dmg:'Damage', dc_fire:'Fire', dc_reward:'Loot', dc_curse:'Curse',
  shop_title:'Armory', shop_skip:'Continue', shop_gold:'Gold:',
  shop_sub_full:'Arsenal full ({cap} weapons) — refine them (up to level 10). One purchase per market.',
  shop_sub_buy:'Wave survived. Buy ONE weapon with gold — or move on.',
  shop_nothing:'Nothing left to offer — move on.', shop_reroll:'Reroll ({cost} gold)', shop_items:'Items — buy as many as you like, the visit goes on', shop_owned:'{n}× owned', shop_sold:'Bought', items_label:'Items',
  up_title:'Ascension', up_sub:'Level {lvl} — choose an upgrade.',
  ab_title:'Awakened Gift', ab_sub:'Level {lvl} — a power awakens. Choose one of three.',
  stats_title:'Current Stats', stats_close:'Back', prof_title:'Pilgrim Book', prof_close:'Back',
  pause_title:'Pause', pause_resume:'Resume', pause_stats:'View stats', pause_admin:'Admin panel', pause_quit:'Give up',
  go_title:'FALLEN', go_retry:'Repent again', go_menu:'Main menu',
  endless_go:'Endless onward', endless_restart:'Start over',
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
  if(G.state==='gameover') renderGameOver();
  if(G.state==='endless') renderEndless();
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
  curse_title:'Ein Fluch wird angeboten', curse_sub:'Nimm ihn an für mehr Beute — oder lehne ab und spiele normal.', hint_curse:'1 annehmen · 2 ablehnen',
  curse_reward:'×1,35 Gold & XP', curse_accept:'Annehmen', curse_decline:'Ablehnen', curse_decline_d:'Normaler Lauf ohne Fluch und ohne Bonus.',
  meta_refund:'Deckel bei Schaden/Leben: <b>{n}</b> Seelen erstattet',
  save_err_t:'Speichern fehlgeschlagen', save_err_session:'Sitzung abgelaufen — bitte abmelden und neu anmelden. Dein Fortschritt bleibt auf diesem Gerät erhalten und wird dann hochgeladen.',
  save_err_offline:'Server nicht erreichbar — Fortschritt wird auf diesem Gerät gehalten und beim nächsten Speichern erneut gesendet.',
  save_merged_t:'Fortschritt übernommen', save_merged:'Der neuere Stand dieses Geräts wurde hochgeladen.',
  trade_label:'Tausch', s_magnet:'Sammelradius', affinity:'Affinität', mal_heal:'Heilung −30%', mal_hp:'Max-LP −15%',
  shrine_greed_done:'Gegner gestärkt — Gold dieser Welle ×2',
  relic_title:'Reliquie', relic_sub:'Der Boss ist gefallen. Wähle eine Reliquie — sie bleibt für den ganzen Lauf.', relic_label:'Reliquie', relics_label:'Reliquien',
  relic_recipe:'Verschmilzt mit {w} (St. 10) zu {r}', key_label:'Verdeckt', key_hidden:'Unbekannte Ware zum halben Preis',
  src_r_hammer:'Hammer (Reliquie)', src_r_bell:'Totenglocke (Reliquie)', src_r_urn:'Aschenurne (Reliquie)',
  hud_foes:'Gegner: {n}', gate_err:'Falsche Losung', rotate_hint:'Bitte Gerät quer halten',
  hint_shop:'1–{n} kaufen · R neu würfeln · Enter weiter', hint_pick:'1–3 wählen', endless_sub:'Der Gipfel ist erreicht',
  shop_evo:'Verschmelzung', shop_evo_free:'Verschmelzen (gratis)', shop_refine:'Veredeln', shop_max:'✦ MAX · Stufe 10', lvl_short:'St.',
  w_proj:'{n} Projektile', w_single:'Einzelschuss', w_pierce:'durchbohrt', w_chain:'Blitz', w_explosive:'explosiv', w_deploy:'platzierbar',
  evo_done:'ist entstanden!', ab_evo:'Erwachte Verschmelzung', ab_evo_done:'entfesselt!', ab_card:'Fähigkeit', ab_owned:'Verstärkt deine Fähigkeit',
  end_all50:'Du hast alle 50 Stationen überstanden.', end_clvl:'Charakterstufe', end_station:'Erreichte Station', end_class:'Klasse', endless_q:'Wie weit reicht die Gnade?',
  dbg_title:'Schaden pro Quelle (F3)', dbg_dmg:'Schaden', dbg_export:'Verlauf exportieren (JSON)',
  bond_t:'Seelenband', bond_d:'kehrt zurück!', src_link:'Verbundene Kette',
  src_orbit:'Kreisende Klingen', src_nova:'Nova', src_aura:'Pestaura', src_thorns:'Dornen', src_exec:'Hinrichtung', src_burn:'Brand', src_puddle:'Pfützen', src_poison:'Gift', 'src_?':'Unbekannt',
  w_poison:'Gift', w_bounce:'prallt ab', w_spread:'steckt an', w_frostpool:'Frostpfütze', w_hex:'Hexenmal: jeder 5. Treffer ×2,5', w_nail:'jeder 8. Nagel hält fest', w_rail:'durch Deckung, +20% je Durchschlag', w_verdict:'richtet unter 25% LP hin', w_strike:'Blitz von oben, verfehlt nie',
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
  curse_title:'A curse is offered', curse_sub:'Accept it for more loot — or decline and play normally.', hint_curse:'1 accept · 2 decline',
  curse_reward:'×1.35 gold & XP', curse_accept:'Accept', curse_decline:'Decline', curse_decline_d:'A normal run without curse or bonus.',
  meta_refund:'Damage/health cap: <b>{n}</b> souls refunded',
  save_err_t:'Saving failed', save_err_session:'Session expired — please sign out and sign in again. Your progress is kept on this device and uploaded then.',
  save_err_offline:'Server unreachable — progress is kept on this device and resent on the next save.',
  save_merged_t:'Progress restored', save_merged:'The newer progress from this device was uploaded.',
  trade_label:'Trade', s_magnet:'Pickup radius', affinity:'Affinity', mal_heal:'Healing −30%', mal_hp:'Max HP −15%',
  shrine_greed_done:'Enemies empowered — gold this wave ×2',
  relic_title:'Relic', relic_sub:'The boss has fallen. Choose a relic — it stays for the whole run.', relic_label:'Relic', relics_label:'Relics',
  relic_recipe:'Fuses with {w} (Lv 10) into {r}', key_label:'Hidden', key_hidden:'Unknown goods at half price',
  src_r_hammer:'Hammer (relic)', src_r_bell:'Death knell (relic)', src_r_urn:'Ash urn (relic)',
  hud_foes:'Enemies: {n}', gate_err:'Wrong watchword', rotate_hint:'Please turn your device sideways',
  hint_shop:'1–{n} buy · R reroll · Enter continue', hint_pick:'1–3 choose', endless_sub:'The summit is reached',
  shop_evo:'Fusion', shop_evo_free:'Fuse (free)', shop_refine:'Refine', shop_max:'✦ MAX · Level 10', lvl_short:'Lv',
  w_proj:'{n} projectiles', w_single:'Single shot', w_pierce:'piercing', w_chain:'lightning', w_explosive:'explosive', w_deploy:'deployable',
  evo_done:'has been forged!', ab_evo:'Awakened fusion', ab_evo_done:'unleashed!', ab_card:'Ability', ab_owned:'Strengthens your ability',
  end_all50:'You survived all 50 stations.', end_clvl:'Character level', end_station:'Station reached', end_class:'Class', endless_q:'How far does grace reach?',
  dbg_title:'Damage by source (F3)', dbg_dmg:'Damage', dbg_export:'Export history (JSON)',
  bond_t:'Soul bond', bond_d:'returns!', src_link:'Linked chain',
  src_orbit:'Orbiting blades', src_nova:'Nova', src_aura:'Plague aura', src_thorns:'Thorns', src_exec:'Execution', src_burn:'Burn', src_puddle:'Puddles', src_poison:'Poison', 'src_?':'Unknown',
  w_poison:'poison', w_bounce:'bounces', w_spread:'spreads', w_frostpool:'frost pool', w_hex:'hex: every 5th hit ×2.5', w_nail:'every 8th nail pins', w_rail:'through cover, +20% per pierce', w_verdict:'executes below 25% HP', w_strike:'strikes from above, never misses',
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
