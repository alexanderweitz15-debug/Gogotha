"use strict";
/* GOLGOTHA — Hauptschleife und Verdrahtung der Menüs (Teil von game.js, Reihenfolge siehe index.html) */
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
      updateShrine(dt); updateHazards(dt); checkCleared(dt);
      if(G.boss)$('#bossFill').style.width=clamp(G.boss.hp/G.boss.maxHp*100,0,100)+'%';
      updateHudLive();
    }
    renderGame();
  } else if(G.state==='collect'){
    G.collectT+=dt;
    vacuumPickups(dt); updateParticles(dt); updateFloaters(dt);
    renderGame();
    if(pickups.length===0 || G.collectT>1.5) openPostWave();
  } else if(G.state==='paused'||G.state==='stats'||G.state==='shop'||G.state==='upgrade'||G.state==='ability'||G.state==='endless'||G.state==='curse'||G.state==='relic'){
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

/* ---------- SITE GATE ----------
   Das Zugangswort prüft der Server (gate.js); diese Datei wird erst danach geladen, also geht es direkt zur Anmeldung. */
function passSiteGate(){ hideAllOverlays(); show('login'); setTimeout(()=>$('#loginUser').focus(),50); }

/* ---------- LOGIN ---------- */
function refreshProfile(){
  const u=DB.current; if(!u){$('#profileBox').textContent='';return;}
  const s=u.stats;
  $('#profileBox').innerHTML=t('prof_line',{name:String(u.name).replace(/[<>&"']/g,ch=>'&#'+ch.charCodeAt(0)+';'),runs:s.runs,best:s.bestLevel,kills:s.kills});
}
$('#loginBtn').onclick=async ()=>{ initAudio(); $('#loginErr').textContent='…'; const err=await DB.login($('#loginUser').value,$('#loginPass').value);
  if(err){$('#loginErr').textContent=err;return;} $('#loginErr').textContent=''; $('#loginPass').value=''; if(DB.current.meta&&DB.current.meta.lang)LANG=DB.current.meta.lang; normalizeMeta(); applyLang(); refreshProfile(); hideAllOverlays(); G.state='menu'; show('menu');
  if(DB.merged) showToast(t('save_merged_t'),t('save_merged')); };
DB.onSaveError=reason=>showToast(t('save_err_t'), reason==='Nicht angemeldet'?t('save_err_session'):t('save_err_offline'));
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
    const mx=metaMax(u.id), lvl=metaLevel(u.id), maxed=lvl>=mx, cost=metaCost(lvl), can=!maxed&&cur>=cost;
    const el=document.createElement('div'); el.className='rcard'+(can?'':' locked'); el.style.borderColor='var(--gold)';
    el.innerHTML='<div class="ic">'+svgIcon(u.ic,C.gold2,32)+'</div>'+
      '<div class="rn">'+metaName(u.id)+'</div>'+
      '<div class="mlvl">'+t('meta_lvl',{lvl:lvl,max:mx})+' · +'+(lvl*5)+'%</div>'+
      '<div class="mbar"><div class="mfill" style="width:'+(lvl/mx*100)+'%"></div></div>'+
      (maxed?'<div class="owned">'+t('meta_max')+'</div>':'<div class="price'+(can?'':' cant')+'">'+t('meta_buy',{cost:cost})+'</div>');
    if(can) el.onclick=()=>buyMeta(u.id);
    wrap.appendChild(el);
  });
}
function buyMeta(id){ if(!DB.current)return; const lvl=metaLevel(id); if(lvl>=metaMax(id))return;
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

/* Stärken (grün) und Schwächen (rot) der Figur, wie in Brotato direkt auf der Karte */
function charPerkHtml(id){ const pr=CHAR_PROFILE[id]; if(!pr)return ''; const L=LANG==='en'?1:0;
  return '<div class="char-perks">'+(pr.aff?'<div class="char-aff">'+clsChip(pr.aff,t('affinity')+': '+clsName(pr.aff))+'</div>':'')+
    (pr.pros||[]).map(x=>'<div class="char-pro">+ '+x[L]+'</div>').join('')+(pr.cons||[]).map(x=>'<div class="char-mal">− '+x[L]+'</div>').join('')+'</div>'; }
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
      '<div class="char-weapon">'+svgIcon(w.ic,w.color,16)+' '+(unlocked?w.name:'???')+'</div>'+
      (unlocked?charPerkHtml(c.id):'');
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
$('#aRelicGive').onclick=()=>{ if(player) giveRelic(player,$('#aRelicSel').value); };
$('#aItemGive').onclick=()=>{const def=upDefById($('#aItemSel').value);if(def)giveUpgradeDef(def,'rare');};
$('#aClear').onclick=()=>{if(G.state==='playing')enemies.length=0;};
$('#aNext').onclick=()=>{if(G.state==='playing'||G.state==='paused'){G.boss=null;G.bossMode=false;$('#bossBarWrap').classList.remove('show');if(G.state==='paused')togglePause(false);nextLevel();}};
$('#aBoss').onclick=()=>{if(G.state==='playing'){enemies.length=0;spawnBoss(Math.max(5,G.level));}};
(function(){const ws=$('#aWeaponSel');WEAPONS.forEach(w=>{const o=document.createElement('option');o.value=w.id;o.textContent=w.name+' ('+rarName(w.rk)+')';ws.appendChild(o);});
  const rs=$('#aRelicSel'); RELICS.forEach(r=>{const o=document.createElement('option');o.value=r.id;o.textContent=r.name;rs.appendChild(o);});
  const is=$('#aItemSel');UPGRADE_DEFS.forEach(it=>{const o=document.createElement('option');o.value=it.id;o.textContent=it.name;is.appendChild(o);});})();

[['cGod','change'],['cOne','change'],['cDash','change'],['cNoFire','change'],['cNoSpawn','change'],['cNoObs','change'],['cDmg','input'],['cLuck','input'],
 ['aHeal','click'],['aHP','click'],['aMoney','click'],['aXP','click'],['aCure','click'],['aWeaponGive','click'],['aAllWeapons','click'],['aItemGive','click'],['aRelicGive','click'],
 ['aClear','click'],['aNext','click'],['aBoss','click']].forEach(([id,ev])=>$('#'+id).addEventListener(ev,markCheated));

$('#langBtn').onclick=toggleLang;
applyLang();
passSiteGate();

requestAnimationFrame(loop);
