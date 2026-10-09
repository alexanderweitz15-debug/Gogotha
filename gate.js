"use strict";
/* GOLGOTHA — Pforte (Seitenpasswort)
   Das Passwort prüft der Server (/api/gate) und setzt dafür ein HttpOnly-Cookie. Ohne dieses Cookie liefert er weder
   den Spielcode (sprites.js, js/*.js) noch die API aus. Deshalb lädt erst diese Datei das Spiel nach.
   Als Datei geöffnet (file://) gibt es keinen Server und keine Pforte: Der Code liegt dann ohnehin lokal vor. */
(function(){
  const GAME=['sprites.js?v=4','js/core.js?v=11','js/data.js?v=11','js/io.js?v=11','js/player.js?v=11','js/enemies.js?v=11',
    'js/combat.js?v=11','js/flow.js?v=11','js/render.js?v=11','js/main.js?v=11'];
  const TXT={de:{subtitle:'Kreuzzug der Verdammten',gate_sub:'Diese Pforte ist verschlossen. Nenne die Losung, um einzutreten.',gate_ph:'Zugangswort',gate_btn:'Eintreten',err:'Falsche Losung',net:'Server nicht erreichbar'},
    en:{subtitle:'Crusade of the Damned',gate_sub:'This gate is locked. Speak the watchword to enter.',gate_ph:'Watchword',gate_btn:'Enter',err:'Wrong watchword',net:'Server unreachable'}};
  const $=s=>document.querySelector(s);
  let lang=(()=>{ try{ return localStorage.getItem('golgotha_lang')||'de'; }catch(e){ return 'de'; } })(), loading=false;
  const tx=k=>(TXT[lang]||TXT.de)[k];
  function texts(){ const g=$('#siteGate'); if(!g)return;
    g.querySelectorAll('[data-i18n]').forEach(el=>{ const v=tx(el.getAttribute('data-i18n')); if(v)el.textContent=v; });
    $('#siteGatePass').placeholder=tx('gate_ph'); const lb=$('#langBtn'); if(lb)lb.textContent=lang==='de'?'EN':'DE'; }
  /* Spielcode der Reihe nach laden; main.js öffnet am Ende die Anmeldung */
  function loadGame(){ if(loading)return; loading=true; window.GOLGOTHA_GATE_PASSED=true;
    for(const src of GAME){ const s=document.createElement('script'); s.src=src; s.async=false; document.body.appendChild(s); } }
  /* Statisch gehostet (kein server.py, /api fehlt): keine Pforte möglich, der Code ist dort ohnehin öffentlich → Spiel laden */
  async function ask(body){ const r=await fetch('/api/gate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'same-origin'});
    if(!(r.headers.get('Content-Type')||'').includes('application/json')) return {ok:true,noServer:true};
    return r.json(); }
  async function tryPass(){ const err=$('#siteGateErr');
    try{ const res=await ask({pass:$('#siteGatePass').value}); if(res&&res.ok){ err.textContent=''; loadGame(); } else err.textContent=(res&&res.error&&res.error!=='Falsche Losung')?res.error:tx('err'); }
    catch(e){ err.textContent=tx('net'); } }
  texts();
  $('#siteGateBtn').onclick=tryPass;
  $('#siteGatePass').addEventListener('keydown',e=>{ if(e.code==='Enter')tryPass(); });
  $('#langBtn').onclick=()=>{ lang=lang==='de'?'en':'de'; try{localStorage.setItem('golgotha_lang',lang);}catch(e){} texts(); };   // main.js übernimmt den Knopf danach
  if(location.protocol==='file:'){ loadGame(); return; }
  ask({}).then(res=>{ if(res&&res.ok)loadGame(); }).catch(()=>{});
})();
