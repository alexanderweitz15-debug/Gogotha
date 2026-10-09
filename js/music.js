"use strict";
/* GOLGOTHA — Musik und Klangsteuerung (prozedural über WebAudio)
   Dauerhafte Schicht aus wenigen Oszillatoren (Bass, Orgel, Chor; zwei LFOs) + per Scheduler mit Vorlauf geplante
   kurze Ereignisse (Herzschlag-Puls, Glocken, beim Boss Schläge). Stil je Region, Boss und Menü; Wechsel gleiten.
   Startet erst, wenn Audio2 nach einer Nutzergeste einen laufenden AudioContext hat. */
const Music=(()=>{
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  /* root: MIDI-Grundton · scale: Tonleiter · prog: Akkordstufen (je 2 Takte) · bpm · cut: Filter der Orgel · bell: Glocken je Schlag
     choir/organ/bass: Pegel der Schichten · det: Verstimmung des Chors (Cent) · pulse: 0 aus, 1 Herzschlag, 2 Boss-Trommel */
  const STY=[
    {root:38,scale:[0,2,3,5,7,8,10],prog:[0,5,3,4],bpm:52,cut:820, bell:0.08,choir:0.55,organ:0.9,bass:1,det:5,pulse:1},   // Gräben: d-Moll, Marsch im Schlamm
    {root:37,scale:[0,1,3,5,7,8,10],prog:[0,1,0,6],bpm:44,cut:600, bell:0.05,choir:0.9, organ:0.7,bass:0.8,det:3,pulse:1}, // Katakomben: phrygisch, hallend
    {root:40,scale:[0,2,3,5,7,8,11],prog:[0,3,4,0],bpm:50,cut:740, bell:0.16,choir:0.6, organ:0.8,bass:0.9,det:11,pulse:1},// Lazarett: harmonisch Moll, schief
    {root:36,scale:[0,1,3,5,6,8,10],prog:[0,4,1,0],bpm:60,cut:980, bell:0.03,choir:0.45,organ:1,  bass:1.2,det:6,pulse:1},  // Schlachthof: lokrisch, treibend
    {root:33,scale:[0,2,3,5,7,8,10],prog:[0,5,6,4],bpm:50,cut:900, bell:0.2, choir:1.1, organ:0.85,bass:1,det:4,pulse:1},   // Golgotha: Chor
  ];
  const MENU={root:38,scale:[0,2,3,5,7,8,10],prog:[0,5,3,0],bpm:38,cut:520,bell:0.1,choir:0.75,organ:0.7,bass:0.7,det:4,pulse:0};
  const RUN_STATES=['playing','paused','stats','shop','upgrade','ability','relic','curse','collect','endless'];
  let c=null, n=null, mode='', sty=MENU, beat=0, nextT=0, chordIx=0, noise=null, timer=null, duck=1;

  function want(){ const st=G.state;
    if(!player||!RUN_STATES.includes(st)) return 'menu';
    const r=clamp(Math.floor((G.level-1)/10),0,4); return G.bossMode?'boss'+r:'r'+r; }
  function styleFor(m){ if(m==='menu')return MENU; const r=+m.slice(-1), s=STY[r];
    if(m.startsWith('boss')) return Object.assign({},s,{bpm:Math.round(s.bpm*1.5),cut:s.cut*1.7,choir:s.choir*1.2,organ:s.organ*1.15,bass:s.bass*1.3,bell:0,pulse:2,boss:true});
    return s; }

  function osc(type,f,dest){ const o=c.createOscillator(); o.type=type; o.frequency.value=f; o.connect(dest); o.start(); return o; }
  function gain(v,dest){ const g=c.createGain(); g.gain.value=v; if(dest)g.connect(dest); return g; }
  function build(){
    const out=Audio2.musicOut(); if(!out)return false;
    n={}; n.out=gain(0,out);                                   // Einblenden über setLevels
    // Raum: Rückkopplungs-Echo statt Faltungshall (billig)
    n.dly=c.createDelay(1.5); n.dly.delayTime.value=0.43; n.fb=gain(0.38); n.dlp=c.createBiquadFilter(); n.dlp.type='lowpass'; n.dlp.frequency.value=1600;
    n.send=gain(1,n.dly); n.dly.connect(n.dlp); n.dlp.connect(n.fb); n.fb.connect(n.dly); n.dlp.connect(gain(0.32,n.out));
    n.padF=c.createBiquadFilter(); n.padF.type='lowpass'; n.padF.Q.value=0.7; n.padF.frequency.value=sty.cut; n.padF.connect(n.out); n.padF.connect(gain(0.25,n.send));
    n.bassG=gain(0,n.out); n.orgG=gain(0,n.padF);
    n.bass=osc('triangle',110,n.bassG); n.o1=osc('sawtooth',220,n.orgG); n.o2=osc('sawtooth',330,n.orgG);
    // Chor: zwei verstimmte Sägezähne durch einen Formant-Bandpass („ah“), atmet über einen langsamen LFO
    n.chF=c.createBiquadFilter(); n.chF.type='bandpass'; n.chF.frequency.value=760; n.chF.Q.value=1.6;
    n.chG=gain(0,n.out); n.chF.connect(n.chG); n.chG.connect(n.send);
    n.c1=osc('sawtooth',440,n.chF); n.c2=osc('sawtooth',660,n.chF);
    n.lfoBG=gain(0,n.chG.gain); n.lfoB=osc('sine',0.11,n.lfoBG);
    n.lfoVG=gain(7); n.lfoVG.connect(n.c1.detune); n.lfoVG.connect(n.c2.detune); n.lfoV=osc('sine',4.6,n.lfoVG);
    if(!noise){ noise=c.createBuffer(1,Math.floor(c.sampleRate*0.4),c.sampleRate); const d=noise.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; }
    nextT=c.currentTime+0.15; beat=0; chordIx=0; mode=''; return true; }
  function teardown(){ if(!n)return; const t0=c.currentTime; n.out.gain.setTargetAtTime(0,t0,0.15); const old=n; n=null;
    setTimeout(()=>{ for(const k of ['bass','o1','o2','c1','c2','lfoB','lfoV']) try{old[k].stop();}catch(e){} try{old.out.disconnect();}catch(e){} },900); }

  /* Akkord aus Tonleiterstufe; beim Boss reibt die Orgel eine kleine Sekunde, der Chor einen Tritonus */
  function deg(d){ const s=sty.scale; return s[((d%7)+7)%7]+12*Math.floor(d/7); }
  function setChord(t0,tc){ const d=sty.prog[chordIx%sty.prog.length], R=sty.root, n0=deg(d), n1=deg(d+2), n2=deg(d+4);
    const F=(o,m)=>o.frequency.setTargetAtTime(mtof(m),t0,tc);
    F(n.bass,R+n0); F(n.o1,R+12+n1); F(n.o2,R+12+(sty.boss?n0+1:n2)); F(n.c1,R+24+n0); F(n.c2,R+24+(sty.boss?n0+6:n2));
    n.c1.detune.setTargetAtTime(-sty.det,t0,0.5); n.c2.detune.setTargetAtTime(sty.det,t0,0.5); }
  function setLevels(tc){ const t0=c.currentTime, k=duck;
    n.out.gain.setTargetAtTime(k,t0,tc);
    n.bassG.gain.setTargetAtTime(0.055*sty.bass,t0,tc); n.orgG.gain.setTargetAtTime(0.011*sty.organ,t0,tc);
    n.chG.gain.setTargetAtTime(0.022*sty.choir,t0,tc); n.lfoBG.gain.setTargetAtTime(0.012*sty.choir,t0,tc);
    n.padF.frequency.setTargetAtTime(sty.cut,t0,tc); n.chF.frequency.setTargetAtTime(sty.boss?980:760,t0,tc); }

  /* kurze Ereignisse */
  function thump(t0,f,g,len){ const o=c.createOscillator(), a=c.createGain(); o.type='sine';
    o.frequency.setValueAtTime(f*1.9,t0); o.frequency.exponentialRampToValueAtTime(f,t0+0.09);
    a.gain.setValueAtTime(0.0001,t0); a.gain.exponentialRampToValueAtTime(g,t0+0.012); a.gain.exponentialRampToValueAtTime(0.0001,t0+len);
    o.connect(a); a.connect(n.out); o.start(t0); o.stop(t0+len+0.02); }
  function hit(t0,g){ const s=c.createBufferSource(), f=c.createBiquadFilter(), a=c.createGain(); s.buffer=noise; f.type='bandpass'; f.frequency.value=420; f.Q.value=0.9;
    a.gain.setValueAtTime(g,t0); a.gain.exponentialRampToValueAtTime(0.0001,t0+0.32); s.connect(f); f.connect(a); a.connect(n.out); a.connect(n.send); s.start(t0); s.stop(t0+0.34); }
  function bell(t0,m){ const f=mtof(m), a=c.createGain();
    a.gain.setValueAtTime(0.0001,t0); a.gain.exponentialRampToValueAtTime(0.014,t0+0.01); a.gain.exponentialRampToValueAtTime(0.0001,t0+3.2);
    a.connect(n.out); a.connect(n.send);
    for(const [r,v] of [[1,1],[2.76,0.35]]){ const o=c.createOscillator(), g=c.createGain(); o.type='sine'; o.frequency.value=f*r; g.gain.value=v; o.connect(g); g.connect(a); o.start(t0); o.stop(t0+3.3); } }
  function scheduleBeat(t0){ const b=beat%4;
    if(beat>0&&beat%8===0){ chordIx++; setChord(t0,sty.boss?0.04:0.12); }
    if(sty.pulse===1){ if(b===0||b===2){ thump(t0,52,0.11,0.45); thump(t0+0.2,50,0.06,0.4); } }       // Herzschlag
    else if(sty.pulse===2){ thump(t0,48,0.13,0.35); if(b===0||b===2)hit(t0,0.035); if(b===3)thump(t0+30/sty.bpm,48,0.08,0.3); }
    if(sty.bell&&Math.random()<sty.bell){ const sc=sty.scale; bell(t0+(Math.random()<0.5?0:30/sty.bpm),sty.root+24+sc[Math.floor(Math.random()*sc.length)]+(Math.random()<0.3?12:0)); }
  }

  function tick(){
    c=Audio2.ctx(); if(!c||c.state!=='running')return;
    const silent=Audio2.muted||SETTINGS.music<=0;
    if(silent){ if(n)teardown(); return; }
    if(!n&&!build())return;
    const m=want(), dk=G.state==='paused'||G.state==='stats'?0.5:1;
    if(m!==mode){ const first=!mode; mode=m; duck=dk; sty=styleFor(m); setChord(c.currentTime,first?0.01:1.2); setLevels(first?3:1.6); }
    else if(dk!==duck){ duck=dk; setLevels(0.4); }
    if(nextT<c.currentTime) nextT=c.currentTime+0.05;            // nach Hänger (verstecktes Tab) nicht nachholen
    while(nextT<c.currentTime+0.35){ scheduleBeat(nextT); nextT+=60/sty.bpm; beat++; }
  }
  timer=setInterval(tick,100);
  return {get mode(){return mode;}, get active(){return !!n;}, tick};
})();
