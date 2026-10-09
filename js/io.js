"use strict";
/* GOLGOTHA — Speicher (Server/lokal), Tastatur, Touch, Audio (Teil von game.js, Reihenfolge siehe index.html) */
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
  /* Speicherfehler werden gemeldet statt verschluckt; _unsynced markiert lokal gecachte, nicht hochgeladene Stände */
  let onSaveError=null, lastErrAt=0;
  function saveFailed(reason){ if(current){ current._unsynced=true; cache(); }
    if(reason==='Nicht angemeldet'){ online=false; token=null; }
    const now=Date.now(); if(onSaveError && now-lastErrAt>20000){ lastErrAt=now; onSaveError(reason); } }
  function cache(){ if(!current)return; const k=current.name.toLowerCase(); const prev=local.users[k]||{}; const m=Object.assign({},current); if(prev.pass)m.pass=prev.pass; local.users[k]=m; saveLocal(); }
  function persist(){ if(!current)return;
    if(!(API&&online&&token)){ if(API&&current._server){ current._unsynced=true; } cache(); if(API&&current._server) saveFailed('offline'); return; }
    current._unsynced=true; cache();
    api('/save',{token,data:dataOf(current)}).then(res=>{ if(res&&res.ok){ current&&(current._unsynced=false); cache(); } else saveFailed(res&&res.error); }).catch(()=>saveFailed('offline')); }
  /* Login: lokal nicht hochgeladener Stand mit mindestens so vielen Läufen wie auf dem Server gewinnt und wird hochgeladen */
  function adoptServer(res){ const k=res.profile.name.toLowerCase(), loc=local.users[k];
    if(loc && loc._unsynced && ((loc.stats&&loc.stats.runs)||0)>=((res.profile.stats&&res.profile.stats.runs)||0)){
      current=fill(Object.assign({},loc,{name:res.profile.name})); token=res.token; online=true; current._server=true; persist(); return 'merged'; }
    current=fill(res.profile); current._server=true; token=res.token; online=true; cache(); return null; }
  async function api(path,body){ const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); return r.json(); }
  return {
    async register(u,p){ u=(u||'').trim(); if(u.length<2)return 'Name zu kurz (min. 2)'; if(!p)return 'Losungswort fehlt';
      if(API){ try{ const res=await api('/register',{user:u,pass:p}); if(res.error)return res.error; current=fill(res.profile); current._server=true; token=res.token; online=true; cache(); return null; }catch(e){} }
      if(local.users[u.toLowerCase()])return 'Pilger existiert bereits';
      current=fill(Object.assign(blankProfile(u),{pass:hash(p)})); local.users[u.toLowerCase()]=current; saveLocal(); online=false; return null; },
    async login(u,p){ u=(u||'').trim();
      if(API){ try{ const res=await api('/login',{user:u,pass:p}); if(res.error)return res.error; this.merged=adoptServer(res)==='merged'; return null; }catch(e){} }
      const rec=local.users[u.toLowerCase()]; if(!rec)return 'Unbekannter Pilger'; if(rec.pass!==hash(p))return 'Falsches Losungswort'; current=fill(rec); online=false; return null; },
    logout(){ if(API&&token) api('/logout',{token}).catch(()=>{}); current=null;token=null;online=false; },
    set onSaveError(fn){ onSaveError=fn; },
    get unsynced(){ return !!(current&&current._unsynced); },
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
/* Tastenbelegung als Indirektion (settings.js lädt die gespeicherte Belegung hinein); Standard = ursprüngliche Tasten */
const KEYBIND={up1:'KeyW',down1:'KeyS',left1:'KeyA',right1:'KeyD',up2:'ArrowUp',down2:'ArrowDown',left2:'ArrowLeft',right2:'ArrowRight',dash1:'Space',dash2:'ShiftRight',pause:'KeyP'};
/* Bewegungsrichtung eines Spielers: p1=Belegung 1, p2=Belegung 2, solo=beide; Touch-Stick bzw. Gamepad (gamepad.js) übersteuern */
function moveInput(p){ const solo=p.ctrl==='solo', p2=p.ctrl==='p2', k=a=>keys[KEYBIND[a]];
  const R=(!p2&&k('right1'))||((p2||solo)&&k('right2')), L=(!p2&&k('left1'))||((p2||solo)&&k('left2'));
  const D=(!p2&&k('down1'))||((p2||solo)&&k('down2')), U=(!p2&&k('up1'))||((p2||solo)&&k('up2'));
  let dx=(R?1:0)-(L?1:0), dy=(D?1:0)-(U?1:0);
  if(TouchJoy.id!==null && !p2){ dx=TouchJoy.dx; dy=TouchJoy.dy; }
  else if(!dx&&!dy&&typeof Pads!=='undefined'){ const a=Pads.axis(p2?1:0); if(a){ dx=a.x; dy=a.y; } }
  return {x:dx,y:dy}; }
addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
    if(document.activeElement && document.activeElement.tagName==='INPUT') {} else e.preventDefault();
  }
  if(document.activeElement && document.activeElement.tagName==='INPUT') return;
  keys[e.code]=true; initAudio();
  const deck={shop:'#shopCards',upgrade:'#upgradeCards',ability:'#abilityCards',curse:'#curseCards',relic:'#relicCards'}[G.state];
  if(deck && !e.repeat && performance.now()-(G.menuAt||0)>250){   // Sperre: kein versehentliches Wählen beim Öffnen
    const n=['Digit1','Digit2','Digit3','Digit4'].indexOf(e.code)>=0?+e.code.slice(5)-1:['Numpad1','Numpad2','Numpad3','Numpad4'].indexOf(e.code);
    if(n>=0){ const c=document.querySelectorAll(deck+' .rcard')[n]; if(c&&!c.classList.contains('locked'))c.click(); return; }
    if(G.state==='shop'&&e.code==='KeyR'){ $('#shopReroll').click(); return; }
    if(G.state==='shop'&&e.code==='Enter'){ $('#shopSkip').click(); return; }
  }
  if(e.code===KEYBIND.pause){ if(G.state==='playing')togglePause(true); else if(G.state==='paused')togglePause(false); }
  if(e.code===KEYBIND.dash1) tryDash(players[0]);
  if((e.code===KEYBIND.dash2||e.code==='Enter'||e.code==='Numpad0') && G.coop && players[1]) tryDash(players[1]);   // P2 Ausweichen
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
/* Busse: Effekte und Musik (music.js) laufen getrennt in einen Gesamtregler; Lautstärken setzt settings.js */
const Audio2=(()=>{let ctx=null,bus=null;const vol={master:1,sfx:1,music:1,mute:false};
  const ac=()=>{if(!ctx)try{ctx=new (window.AudioContext||window.webkitAudioContext)();
    bus={master:ctx.createGain(),sfx:ctx.createGain(),music:ctx.createGain()}; bus.sfx.connect(bus.master); bus.music.connect(bus.master); bus.master.connect(ctx.destination); setVol();}catch(e){}
    if(ctx&&ctx.state==='suspended')ctx.resume().catch(()=>{}); return ctx;};
  function setVol(){ if(!bus)return; const n=ctx.currentTime; bus.master.gain.setTargetAtTime(vol.mute?0:vol.master,n,0.03); bus.sfx.gain.setTargetAtTime(vol.sfx,n,0.03); bus.music.gain.setTargetAtTime(vol.music,n,0.03); }
  function s(f,d,t='square',g=0.03){if(vol.mute||!vol.sfx||!vol.master)return;const c=ac();if(!c)return;const o=c.createOscillator(),gn=c.createGain();o.type=t;o.frequency.value=f;o.connect(gn);gn.connect(bus?bus.sfx:c.destination);const n=c.currentTime;gn.gain.setValueAtTime(g,n);gn.gain.exponentialRampToValueAtTime(0.0001,n+d);o.start(n);o.stop(n+d);}
  return{init:ac,ctx:()=>ctx,musicOut:()=>bus&&bus.music,volume(v){Object.assign(vol,v);setVol();},get muted(){return vol.mute||!vol.master;},shoot:()=>s(150+Math.random()*40,0.05,'square',0.010),hit:()=>s(90,0.04,'sawtooth',0.018),
    hurt:()=>s(70,0.18,'sawtooth',0.05),kill:()=>s(120,0.08,'triangle',0.028),dash:()=>s(280,0.12,'sine',0.03),
    boss:()=>s(50,0.5,'sawtooth',0.05),buy:()=>[0,7].forEach((x,i)=>setTimeout(()=>s(520*Math.pow(2,x/12),0.1,'triangle',0.04),i*60)),
    lvl:()=>[0,4,7].forEach((x,i)=>setTimeout(()=>s(440*Math.pow(2,x/12),0.14,'triangle',0.04),i*70)),
    ability:()=>[0,5,9,12].forEach((x,i)=>setTimeout(()=>s(392*Math.pow(2,x/12),0.18,'sine',0.04),i*80)),
    win:()=>[0,4,7,12].forEach((x,i)=>setTimeout(()=>s(330*Math.pow(2,x/12),0.2,'triangle',0.04),i*90)),
    coin:()=>s(880,0.04,'triangle',0.013)};})();
function initAudio(){Audio2.init();}
