"use strict";
/* GOLGOTHA — Einstellungen: Lautstärke, Bildschirmwackeln, Blitz-Effekte, Tastenbelegung */
const SETTINGS={master:1,music:0.6,sfx:1,mute:false,shake:true,lowFlash:false,keys:KEYBIND,
  get shakeMul(){ return this.shake?1:0; }};
const SETTINGS_KEY='golgotha_settings', KEYBIND_DEFAULT=Object.assign({},KEYBIND);
(function(){ try{ const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)); if(!s||typeof s!=='object')return;
  for(const k of ['master','music','sfx','mute','shake','lowFlash']) if(typeof s[k]===typeof SETTINGS[k]) SETTINGS[k]=s[k];
  if(s.keys) for(const k in KEYBIND) if(typeof s.keys[k]==='string'&&s.keys[k]) KEYBIND[k]=s.keys[k];
}catch(e){} })();
function saveSettings(){ try{ localStorage.setItem(SETTINGS_KEY,JSON.stringify({master:SETTINGS.master,music:SETTINGS.music,sfx:SETTINGS.sfx,mute:SETTINGS.mute,
  shake:SETTINGS.shake,lowFlash:SETTINGS.lowFlash,keys:KEYBIND})); }catch(e){} }
/* Regler sind linear, das Ohr nicht: quadratisch abbilden */
function applyVolume(){ Audio2.volume({master:SETTINGS.master*SETTINGS.master,music:SETTINGS.music*SETTINGS.music,sfx:SETTINGS.sfx*SETTINGS.sfx,mute:SETTINGS.mute}); }
applyVolume();

Object.assign(I18N.de,{
  set_title:'Einstellungen', set_btn:'Einstellungen', set_back:'Zurück', set_sound:'Klang', set_view:'Darstellung', set_keys:'Tastenbelegung',
  set_master:'Gesamt', set_music:'Musik', set_sfx:'Effekte', set_mute:'Stumm', set_shake:'Bildschirmwackeln', set_flash:'Blitz-Effekte reduzieren',
  set_on:'An', set_off:'Aus', set_p1:'Spieler 1', set_p2:'Spieler 2', set_up:'Hoch', set_down:'Runter', set_left:'Links', set_right:'Rechts',
  set_dash:'Ausweichen', set_pause:'Pause', set_press:'Taste …', set_reset:'Standard', set_keyhint:'Feld wählen, dann Taste drücken · Esc bricht ab · Esc pausiert immer',
  set_pads:'Gamepad', set_nopad:'Kein Gamepad verbunden — eine Taste am Pad drücken.', set_padhelp:'Stick/Steuerkreuz bewegen · A ausweichen / wählen · B zurück · Start Pause',
  key_space:'Leertaste',
});
Object.assign(I18N.en,{
  set_title:'Settings', set_btn:'Settings', set_back:'Back', set_sound:'Sound', set_view:'Display', set_keys:'Key bindings',
  set_master:'Master', set_music:'Music', set_sfx:'Effects', set_mute:'Mute', set_shake:'Screen shake', set_flash:'Reduce flashing',
  set_on:'On', set_off:'Off', set_p1:'Player 1', set_p2:'Player 2', set_up:'Up', set_down:'Down', set_left:'Left', set_right:'Right',
  set_dash:'Dodge', set_pause:'Pause', set_press:'Press …', set_reset:'Defaults', set_keyhint:'Pick a field, then press a key · Esc cancels · Esc always pauses',
  set_pads:'Gamepad', set_nopad:'No gamepad connected — press a button on the pad.', set_padhelp:'Stick/D-pad move · A dodge / select · B back · Start pause',
  key_space:'Space',
});

/* Lesbarer Tastenname aus e.code */
function keyLabel(code){ if(!code)return '—';
  const sp={Space:t('key_space'),ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',ShiftLeft:'Shift L',ShiftRight:'Shift R',ControlLeft:'Strg L',ControlRight:'Strg R',
    AltLeft:'Alt',AltRight:'Alt Gr',Enter:'Enter',Backspace:'⌫',Tab:'Tab',CapsLock:'Caps'};
  if(sp[code])return sp[code];
  return code.replace(/^Key/,'').replace(/^Digit/,'').replace(/^Numpad/,'Num '); }

/* ---------- Overlay (per JS eingefügt, damit index.html unberührt bleibt) ---------- */
const Settings=(()=>{
  let back='menu', capture=null;
  const ROWS=[['up','set_up'],['down','set_down'],['left','set_left'],['right','set_right'],['dash','set_dash']];
  function build(){
    const ov=document.createElement('div'); ov.className='overlay'; ov.id='settings';
    const vol=(k,lbl)=>'<div class="set-row"><label for="set_'+k+'" data-i18n="'+lbl+'"></label><input type="range" id="set_'+k+'" min="0" max="100" step="5"><span class="set-v" id="set_'+k+'V"></span></div>';
    const tog=(k,lbl)=>'<div class="set-row"><span data-i18n="'+lbl+'"></span><button class="set-tog" id="set_'+k+'" data-k="'+k+'"></button></div>';
    ov.innerHTML='<div class="scrim"></div><div class="sect-title" data-i18n="set_title"></div>'+
      '<div class="set-wrap">'+
        '<div class="set-col"><div class="set-sec"><h3 data-i18n="set_sound"></h3>'+vol('master','set_master')+vol('music','set_music')+vol('sfx','set_sfx')+tog('mute','set_mute')+'</div>'+
          '<div class="set-sec"><h3 data-i18n="set_view"></h3>'+tog('shake','set_shake')+tog('lowFlash','set_flash')+'</div>'+
          '<div class="set-sec"><h3 data-i18n="set_pads"></h3><div class="set-pad" id="setPads"></div></div></div>'+
        '<div class="set-col"><div class="set-sec"><h3 data-i18n="set_keys"></h3><div class="set-keys" id="setKeys"></div>'+
          '<div class="set-hint" data-i18n="set_keyhint"></div><button class="amini" id="setReset" data-i18n="set_reset"></button></div></div>'+
      '</div><div class="menu-btns set-btns"><button class="mbtn" id="setBack" data-i18n="set_back"></button></div>';
    $('#stage').appendChild(ov);
    for(const k of ['master','music','sfx']){ const inp=$('#set_'+k);
      inp.oninput=()=>{ SETTINGS[k]=inp.value/100; applyVolume(); refresh(); };
      inp.onchange=()=>{ saveSettings(); if(k==='sfx'&&!SETTINGS.mute)Audio2.coin(); }; }
    ov.querySelectorAll('.set-tog').forEach(b=>b.onclick=()=>{ const k=b.dataset.k; SETTINGS[k]=!SETTINGS[k]; if(k==='mute')applyVolume(); saveSettings(); refresh(); });
    $('#setReset').onclick=()=>{ Object.assign(KEYBIND,KEYBIND_DEFAULT); capture=null; saveSettings(); refresh(); };
    $('#setBack').onclick=close;
    // Menüknöpfe: in die vorhandenen Container einfügen (vor „Abmelden“ bzw. „Aufgeben“)
    const add=(wrapSel,beforeSel,id)=>{ const wrap=$(wrapSel); if(!wrap)return; const b=document.createElement('button'); b.className='mbtn ghost'; b.id=id; b.setAttribute('data-i18n','set_btn'); b.textContent=t('set_btn');
      b.onclick=()=>open(); const ref=$(beforeSel); if(ref&&ref.parentNode===wrap)wrap.insertBefore(b,ref); else wrap.appendChild(b); };
    add('#menu .menu-btns','#btnLogout','btnSettings'); add('#pause .menu-btns','#quitBtn','pauseSettings');
    $('#langBtn').addEventListener('click',()=>{ if(isOpen())refresh(); });
  }
  function keyBtn(act){ const cap=capture===act; return '<button class="set-key'+(cap?' cap':'')+'" data-act="'+act+'">'+(cap?t('set_press'):keyLabel(KEYBIND[act]))+'</button>'; }
  function refresh(){
    for(const k of ['master','music','sfx']){ $('#set_'+k).value=Math.round(SETTINGS[k]*100); $('#set_'+k+'V').textContent=Math.round(SETTINGS[k]*100); }
    document.querySelectorAll('#settings .set-tog').forEach(b=>{ const on=!!SETTINGS[b.dataset.k]; b.classList.toggle('on',on); b.textContent=on?t('set_on'):t('set_off'); b.setAttribute('aria-pressed',on); });
    let h='<div class="sk-h"></div><div class="sk-h">'+t('set_p1')+'</div><div class="sk-h">'+t('set_p2')+'</div>';
    for(const [a,l] of ROWS) h+='<div class="sk-l">'+t(l)+'</div>'+keyBtn(a+'1')+keyBtn(a+'2');
    h+='<div class="sk-l">'+t('set_pause')+'</div>'+keyBtn('pause')+'<div></div>';
    const ks=$('#setKeys'), foc=document.querySelector('#setKeys .pad-focus'), focAct=foc&&foc.dataset.act;
    ks.innerHTML=h; ks.querySelectorAll('.set-key').forEach(b=>b.onclick=()=>{ capture=capture===b.dataset.act?null:b.dataset.act; refresh(); });
    if(focAct&&typeof Pads!=='undefined'){ const nb=ks.querySelector('[data-act="'+focAct+'"]'); if(nb)Pads.focus(nb); }
    padInfo(); applyLang2();
  }
  function applyLang2(){ document.querySelectorAll('#settings [data-i18n]').forEach(el=>{ el.textContent=t(el.getAttribute('data-i18n')); }); }
  function padInfo(){ const el=$('#setPads'); if(!el)return; const names=typeof Pads!=='undefined'?Pads.names():[];
    el.innerHTML=(names.length?names.map((n,i)=>'<div><b>P'+(i+1)+'</b> '+String(n).replace(/[<>&"']/g,'').slice(0,46)+'</div>').join(''):'<div>'+t('set_nopad')+'</div>')+'<div class="set-hint">'+t('set_padhelp')+'</div>'; }
  function isOpen(){ const o=$('#settings'); return !!(o&&o.classList.contains('show')); }
  function open(){ back=(G.state==='paused')?'pause':'menu'; capture=null; if(back==='pause')$('#pause').classList.remove('show'); else hideAllOverlays();
    refresh(); show('settings'); }
  function close(){ capture=null; $('#settings').classList.remove('show'); saveSettings();
    if(back==='pause'&&G.state==='paused') show('pause'); else if(G.state==='menu') show('menu'); }
  /* Tastenerfassung und Esc: vor dem Spiel-Handler (Capture-Phase), solange das Overlay offen ist */
  addEventListener('keydown',e=>{ if(!isOpen())return;
    if(document.activeElement&&document.activeElement.tagName==='INPUT'&&document.activeElement.type!=='range'){ return; }
    e.stopImmediatePropagation();
    if(capture){ e.preventDefault(); if(e.code!=='Escape'&&!/^F\d+$/.test(e.code)){
        const old=KEYBIND[capture]; for(const k in KEYBIND) if(k!==capture&&KEYBIND[k]===e.code) KEYBIND[k]=old;   // Doppelbelegung: tauschen
        KEYBIND[capture]=e.code; saveSettings(); }
      capture=null; refresh(); return; }
    if(e.code==='Escape'){ e.preventDefault(); close(); }
  },true);
  build(); refresh();
  return {open,close,isOpen,refresh:()=>{ if(isOpen())refresh(); }};
})();
