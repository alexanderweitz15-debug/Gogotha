"use strict";
/* GOLGOTHA — Gamepad-Steuerung (Spiel und Menüs, Koop mit zwei Pads)
   Standard-Belegung (Gamepad-API „standard“): Stick/Steuerkreuz bewegen, A ausweichen/wählen, B zurück/weiter,
   X im Shop neu würfeln, Start Pause. Pad 1 steuert Spieler 1, Pad 2 Spieler 2. Bewegung liest moveInput (io.js) über Pads.axis. */
Object.assign(I18N.de,{ pad_title:'Gamepad', pad_on:'Pad {n} verbunden', pad_off:'Pad {n} getrennt' });
Object.assign(I18N.en,{ pad_title:'Gamepad', pad_on:'Pad {n} connected', pad_off:'Pad {n} disconnected' });
const Pads=(()=>{
  const DZ=0.3, A=0, B=1, X=2, START=9, UP=12, DOWN=13, LEFT=14, RIGHT=15;
  const BACK={shop:'#shopSkip',how:'#howBack',charselect:'#charBack',modifiers:'#modBack',profile:'#profileClose',meta:'#metaBack',achievements:'#achBack',
    stats:'#statsClose',pause:'#resumeBtn',settings:'#setBack',gameover:'#goMenu',adminGate:'#adminGateCancel'};
  const CAND='.rcard:not(.locked),.char-card:not(.locked),.diff-card,.mod-chip,button,input[type=range]';
  let slots=[], prev=[], known={}, focusEl=null, focusIx=0, lastOv=null, navDir='', navT=0, lastT=performance.now();
  function list(){ try{ return navigator.getGamepads?Array.from(navigator.getGamepads()).filter(g=>g&&g.connected!==false):[]; }catch(e){ return []; } }
  const pressed=(g,i)=>!!(g.buttons[i]&&g.buttons[i].pressed);
  function stick(g){ let x=g.axes[0]||0, y=g.axes[1]||0; if(Math.hypot(x,y)<DZ){ x=0; y=0; }
    if(pressed(g,RIGHT))x=1; if(pressed(g,LEFT))x=-1; if(pressed(g,DOWN))y=1; if(pressed(g,UP))y=-1; return {x,y}; }
  /* Bewegungsrichtung für Spieler-Slot (0/1), null ohne Eingabe */
  function axis(s){ const g=slots[s]; if(!g)return null; const a=stick(g); return (a.x||a.y)?a:null; }

  /* ---------- Menüs: sichtbarer Fokus, räumliche Navigation ---------- */
  function topOverlay(){ if($('#admin.open'))return null; const ov=document.querySelectorAll('.overlay.show'); return ov.length?ov[ov.length-1]:null; }
  function cands(ov){ return Array.from(ov.querySelectorAll(CAND)).filter(el=>!el.disabled&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'); }
  function setFocus(el){ if(focusEl&&focusEl!==el)focusEl.classList.remove('pad-focus'); focusEl=el; if(!el)return;
    el.classList.add('pad-focus'); try{ el.scrollIntoView({block:'nearest',inline:'nearest'}); }catch(e){} }
  const DEF={modifiers:'#modStart',settings:'#set_master'};
  function defFocus(ov,cs){ const d=DEF[ov.id]&&ov.querySelector(DEF[ov.id]);
    return (d&&cs.includes(d)&&d)||cs.find(el=>el.matches('.rcard,.char-card'))||cs.find(el=>el.matches('.mbtn'))||cs[0]; }
  function ensureFocus(ov){ const cs=cands(ov); if(!cs.length){ setFocus(null); return cs; }
    if(ov!==lastOv){ lastOv=ov; setFocus(defFocus(ov,cs)); }
    else if(!focusEl||!cs.includes(focusEl)) setFocus(cs[Math.min(focusIx,cs.length-1)]);   // Karten neu gezeichnet: gleiche Position
    focusIx=cs.indexOf(focusEl); return cs; }
  function move(ov,dir){ const cs=ensureFocus(ov); if(!focusEl)return;
    if(focusEl.matches('input[type=range]')&&(dir==='left'||dir==='right')){ const st=+focusEl.step||1;
      focusEl.value=clamp(+focusEl.value+(dir==='right'?st:-st),+focusEl.min,+focusEl.max); focusEl.dispatchEvent(new Event('input')); focusEl.dispatchEvent(new Event('change')); return; }
    const [vx,vy]={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[dir], r=focusEl.getBoundingClientRect(), x0=r.left+r.width/2, y0=r.top+r.height/2;
    let best=null, bs=1e9;
    for(const el of cs){ if(el===focusEl)continue; const q=el.getBoundingClientRect(), dx=q.left+q.width/2-x0, dy=q.top+q.height/2-y0;
      const along=dx*vx+dy*vy; if(along<=4)continue; const sc=along+Math.abs(dx*vy-dy*vx)*2.5; if(sc<bs){ bs=sc; best=el; } }
    if(best){ setFocus(best); focusIx=cs.indexOf(best); } }
  function goBack(ov){ const sel=BACK[ov.id]; const b=(sel&&ov.querySelector(sel))||ov.querySelector('button[id$="Back"],button[id$="Close"],button[id$="Skip"]'); if(b&&b.getClientRects().length)b.click(); }
  const locked=()=>performance.now()-(G.menuAt||0)<250;   // wie bei der Tastatur: kein versehentliches Wählen beim Öffnen

  function poll(dt){
    const now=list(), idx=now.map(g=>g.index); slots=now.slice(0,2);
    for(const g of now) if(!(g.index in known)){ known[g.index]=g.id; showToast(t('pad_title'),t('pad_on',{n:idx.indexOf(g.index)+1})); Settings.refresh(); }
    for(const k in known) if(!idx.includes(+k)){ delete known[k]; showToast(t('pad_title'),t('pad_off',{n:+k+1})); Settings.refresh();
      if(G.state==='playing')togglePause(true); }   // Pad weg mitten im Lauf → anhalten
    if(!slots.length){ if(focusEl)setFocus(null); lastOv=null; return; }
    const ov=G.state==='playing'?null:topOverlay();
    let dir='';
    slots.forEach((g,s)=>{ const was=prev[s]||[], is=g.buttons.map(b=>b.pressed), edge=i=>is[i]&&!was[i]; prev[s]=is;
      if(is.some(Boolean)) initAudio();
      if(G.state==='playing'){
        if(edge(A)){ const p=G.coop?players[s]:players[0]; if(p)tryDash(p); }
        if(edge(START)) togglePause(true);
        return; }
      if(edge(START)){ if(Settings.isOpen())Settings.close(); else if(G.state==='paused'){ togglePause(false); return; } else if(G.state==='stats'){ closeStats(); return; } }
      if(!ov)return;
      if(!dir){ const a=stick(g); if(Math.abs(a.x)>0.5||Math.abs(a.y)>0.5) dir=Math.abs(a.x)>Math.abs(a.y)?(a.x>0?'right':'left'):(a.y>0?'down':'up'); }
      if(edge(A)&&!locked()){ ensureFocus(ov); if(focusEl&&!focusEl.matches('input[type=range]'))focusEl.click(); }
      else if(edge(B)&&!locked()) goBack(ov);
      else if(edge(X)&&G.state==='shop'){ const r=$('#shopReroll'); if(r)r.click(); }
    });
    if(!ov||G.state==='playing'){ if(focusEl)setFocus(null); lastOv=null; navDir=''; return; }
    ensureFocus(ov);
    if(dir&&dir!==navDir){ navDir=dir; navT=0.38; move(ov,dir); }                // erster Schritt sofort, dann Wiederholung
    else if(dir){ navT-=dt; if(navT<=0){ navT=0.14; move(ov,dir); } }
    else navDir='';
  }
  function frame(now){ const dt=Math.min(0.1,(now-lastT)/1000); lastT=now;
    try{ poll(dt); }catch(e){ console.error(e); }
    requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  return {axis, names:()=>slots.map(g=>g.id), focus:el=>setFocus(el), get count(){ return slots.length; }};
})();
