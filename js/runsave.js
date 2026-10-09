"use strict";
/* GOLGOTHA — Lauf fortsetzen: Speicherstand zu Beginn jeder Station
   Geschrieben nach dem Aufbau einer Station (Laufstart bzw. nach dem Fluch-Angebot, nextLevel), gelöscht in finishRun
   (Tod, Aufgeben, Gipfel) und beim Start eines neuen Laufs. Gegner, Geschosse und Pfützen werden nicht gespeichert:
   Laden baut dieselbe Station mit einer neuen Welle auf. Zwischen zwei Stationen gibt es keinen Stand (kein Savescumming).
   Die Haken hängen sich um die bestehenden Funktionen, damit flow.js/data.js unverändert bleiben. */
Object.assign(I18N.de,{
  rs_continue:'Lauf fortsetzen ({where} · {who})', rs_bad_t:'Lauf fortsetzen', rs_bad:'Der gespeicherte Lauf ist veraltet oder beschädigt und wurde verworfen.',
});
Object.assign(I18N.en,{
  rs_continue:'Continue run ({where} · {who})', rs_bad_t:'Continue run', rs_bad:'The saved run is outdated or damaged and was discarded.',
});
const RunSave=(()=>{
  const VER=1, MAX_AGE=30*864e5;
  /* Spielversion = ?v= von data.js (wird bei jeder Datenänderung hochgezählt) */
  const GAME=(()=>{ const s=document.querySelector('script[src*="js/data.js"]'), m=s&&/[?&]v=([^&#]+)/.exec(s.getAttribute('src')); return m?m[1]:'0'; })();
  /* G-Felder des Laufs; andere Module können eigene Felder anhängen (RunSave.gKeys.push('x')) */
  const gKeys=['level','coins','kills','time','charId','pendingChar2','coop','endless','activeMods','modMul','modEnemySpeed','modMapScale',
    'noSave','pendingDiff','customDiff','curseSpawn','curseFire','curseHp','silence','rewardMul','run','runCommitted'];
  const key=()=>DB.current?'golgotha_run_v1:'+String(DB.current.name).toLowerCase():null;
  /* in JSON-taugliche Form: ohne Funktionen, DOM, Querverweise auf Spieler/Gegner; Sets/Maps/Unendlich markiert */
  function enc(v,seen){
    if(typeof v==='function'||v===undefined) return undefined;
    if(typeof v==='number') return isFinite(v)?v:{$num:String(v)};
    if(v===null||typeof v!=='object') return v;
    if(seen.has(v)||players.includes(v)||enemies.includes(v)) return undefined;
    seen.add(v);
    let out;
    if(v instanceof Set) out={$set:[...v].map(x=>enc(x,seen))};
    else if(v instanceof Map) out={$map:[...v].map(([k,x])=>[enc(k,seen),enc(x,seen)])};
    else if(Array.isArray(v)) out=v.map(x=>{ const e=enc(x,seen); return e===undefined?null:e; });
    else { const pr=Object.getPrototypeOf(v); if(pr!==Object.prototype&&pr!==null){ seen.delete(v); return undefined; }
      out={}; for(const k in v){ const e=enc(v[k],seen); if(e!==undefined) out[k]=e; } }
    seen.delete(v); return out; }
  function dec(v){
    if(v===null||typeof v!=='object') return v;
    if(Array.isArray(v)) return v.map(dec);
    if('$num' in v) return Number(v.$num);
    if('$set' in v) return new Set(v.$set.map(dec));
    if('$map' in v) return new Map(v.$map.map(([k,x])=>[dec(k),dec(x)]));
    const o={}; for(const k in v) o[k]=dec(v[k]); return o; }
  function save(){ const k=key(); if(!k||!G.run||!players.length)return;
    try{ const g={}; for(const f of gKeys) if(G[f]!==undefined) g[f]=enc(G[f],new Set());
      const d=G.diff||diffById('medium');
      const s={ver:VER,game:GAME,at:Date.now(),user:String(DB.current.name).toLowerCase(),g,
        diff:{id:d.id,v:d.custom?{enemyCount:d.enemyCount,enemyHp:d.enemyHp,enemyDmg:d.enemyDmg,fireRate:d.fireRate,reward:d.reward,curseChance:d.curseChance}:null},
        curse:G.activeCurse?G.activeCurse.id:null,
        players:players.map(p=>{ const o={}; for(const f in p){ const e=enc(p[f],new Set([p])); if(e!==undefined)o[f]=e; } return o; })};
      localStorage.setItem(k,JSON.stringify(s)); }catch(e){} }
  function clear(){ const k=key(); if(!k)return; try{ localStorage.removeItem(k); }catch(e){} }
  /* passt der Stand noch zu Konto, Version und Spieldaten? */
  function valid(s){ if(!s||s.ver!==VER||s.game!==GAME||!(Date.now()-s.at<MAX_AGE)||s.user!==String(DB.current.name).toLowerCase())return false;
    if(!s.g||!s.g.run||!(s.g.level>=1)||!Array.isArray(s.players)||!s.players.length||!s.diff||!DIFFICULTIES.some(d=>d.id===s.diff.id))return false;
    if(s.curse&&!curseById(s.curse))return false;
    return s.players.every(p=>CHARS.some(c=>c.id===p.charId)&&Array.isArray(p.weapons)&&p.weapons.length&&p.weapons.every(id=>weaponById(id))&&
      Array.isArray(p.wCd)&&p.wCd.length===p.weapons.length&&Object.keys(p.itemsOwned||{}).every(id=>itemById(id))&&Object.keys(p.relics||{}).every(id=>relicById(id))&&
      (p.abilities||[]).every(a=>a&&abById(a.id))&&Object.keys(p.taken||{}).every(id=>upDefById(id))); }
  /* gültigen Stand lesen, ungültigen löschen */
  function peek(){ const k=key(); if(!k)return null; let s=null;
    try{ const raw=localStorage.getItem(k); if(!raw)return null; s=JSON.parse(raw); }catch(e){ s=null; }
    if(valid(s))return s; clear(); return null; }
  function resume(){ const s=peek(); if(!s){ refreshBtn(); showToast(t('rs_bad_t'),t('rs_bad')); return false; }
    initAudio(); if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
    const g=dec(s.g); for(const f in g) G[f]=g[f];
    if(s.diff.v){ const cd=diffById('custom'); Object.assign(cd,s.diff.v); G.diff=cd; } else G.diff=diffById(s.diff.id);
    G.activeCurse=s.curse?curseById(s.curse):null; G.pendingChar=G.charId; G.coopPick=0;
    G.run.cheated=!!G.run.cheated||adminActive();   // in dieser Sitzung aktive Admin-Werte machen den Lauf ebenfalls ungewertet
    players=s.players.map(d=>{ const p=makePlayer(d.charId,d.ctrl); for(const f in d) p[f]=dec(d[f]); recalcClasses(p); return p; });
    player=players[0];
    /* wie startRun, nur ohne neue Werte */
    postQueue=[]; charPreviews=[];
    enemies=[];bullets=[];ebullets=[];pickups=[];particles=[];puddles=[];floaters=[];bolts=[];obstacles=[];novaRings=[];deployables=[];beams=[];
    G.boss=null; G.bossMode=false; G.hurtFlash=0; $('#bossBarWrap').classList.remove('show');
    $('#diffTag').textContent=diffName(G.diff);
    hideAllOverlays(); $('#hud').classList.add('show'); G.state='playing';
    setDock('weaponDock',false); setDock('itemDock',false);
    updateWeaponBar(); updateItemPills(); updateHP(); updateXPBar(); updateStatusBar();
    $('#coinTag').textContent=G.coins; $('#killTag').textContent=G.kills;
    buildLevel(G.level); updateCamera(true); showBanner(); last=performance.now();
    save(); return true; }
  /* Menüknopf (per JS eingefügt, damit index.html unberührt bleibt) */
  function refreshBtn(){ const box=$('#menu .menu-btns'); if(!box)return; let b=$('#btnResume');
    const s=DB.current?peek():null;
    if(!s){ if(b)b.remove(); return; }
    if(!b){ b=document.createElement('button'); b.className='mbtn'; b.id='btnResume'; b.onclick=()=>resume(); box.insertBefore(b,box.firstChild); }
    const lvl=s.g.level, where=lvl>50?t('hud_endless')+' '+(lvl-50):t('hud_station')+' '+lvl;
    b.textContent=t('rs_continue',{where,who:s.players.map(p=>charById(p.charId).name).join(' & ')}); }
  new MutationObserver(()=>{ if($('#menu').classList.contains('show'))refreshBtn(); }).observe($('#menu'),{attributes:true,attributeFilter:['class']});
  return {save,clear,peek,resume,refreshBtn,gKeys};
})();
/* Haken: neuer Lauf löscht den alten Stand; Stationsbeginn speichert; finishRun (Tod/Aufgeben/Gipfel) löscht */
(()=>{ const _startRun=startRun, _close=closeCurseOffer, _next=nextLevel, _finish=finishRun, _lang=applyLang;
  startRun=function(){ RunSave.clear(); const r=_startRun.apply(this,arguments); if(G.state==='playing')RunSave.save(); return r; };
  closeCurseOffer=function(){ const r=_close.apply(this,arguments); RunSave.save(); return r; };
  nextLevel=function(){ const r=_next.apply(this,arguments); RunSave.save(); return r; };
  finishRun=function(){ RunSave.clear(); return _finish.apply(this,arguments); };
  applyLang=function(){ const r=_lang.apply(this,arguments); if($('#menu').classList.contains('show'))RunSave.refreshBtn(); return r; };
})();
