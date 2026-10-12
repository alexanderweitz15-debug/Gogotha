"use strict";
/* =========================================================================
   GOLGOTHA — Schuld, Ablass und der Inquisitor (Ablasshändler, Schritt 2)
   Schuld (G.run.guilt) entsteht durch Pakte (+20), Schreine (+10) und den Blutpreis (+15).
   Sie gibt Macht und zieht Ärger an:
   - Sündenlohn: +0,25 % Schaden je Punkt (bis 100 Punkte, also bis +25 %), gelesen in bonusMul (player.js)
   - mehr Eliten: +0,2 Prozentpunkte je Punkt (bis +20 %), gelesen in spawnWave (flow.js)
   - ab 40 Schuld jagt dich ein Inquisitor: er erscheint auf einer normalen Station, dann wieder nach 3 Stationen
     (ab 80 Schuld nach 2). Wer ihn tötet, verliert 25 Schuld und bekommt ein Kopfgeld; ist die Welle vorher besiegt, entkommt er.
   Abbauen lässt sich Schuld beim Ablasshändler: Ablass gegen Silber (−20) oder ein Opfer am Altar (−4 je Stufe).
   ========================================================================= */
const GUILT_HUNT=40, GUILT_FULL=100;
const guiltOf=()=>(G.run&&G.run.guilt)||0;
const guiltBonus=()=>1+Math.min(guiltOf(),GUILT_FULL)*0.0025;
const guiltElite=()=>Math.min(guiltOf(),GUILT_FULL)*0.002;
function guiltAdd(n,why){ if(!G.run||!n)return; const old=guiltOf();
  G.run.guilt=Math.max(0,old+n); G.run.guiltMax=Math.max(G.run.guiltMax||0,G.run.guilt);
  if(n>0) showToast(t('guilt_up',{n}),why||t('guilt_up_d'));
  if(old<GUILT_HUNT&&G.run.guilt>=GUILT_HUNT) showToast(t('guilt_hunt_t'),t('guilt_hunt_d'));
  updateGuiltTag(); }
/* HUD: Schuld neben dem Silber; erst sichtbar, sobald im Lauf Schuld entstanden ist */
function updateGuiltTag(){ const el=$('#guiltTag'); if(!el)return; const g=Math.round(guiltOf()), box=el.parentNode;
  box.style.display=(G.run&&G.run.guiltMax)?'':'none'; el.textContent=g; box.classList.toggle('hunted',g>=GUILT_HUNT);
  box.title=t('guilt_tip',{d:Math.round((guiltBonus()-1)*100),e:Math.round(guiltElite()*100),h:GUILT_HUNT}); }

/* ---------- DER INQUISITOR (Jäger) ---------- */
/* hält Abstand, schießt Bannbolzen im Fächer, legt alle 6–8 s ein Kreuz aus Feuer auf dich */
function aiHunter(e,dt,p,ang,d,sp){
  if(e.castT>0){ e.castT-=dt; return; }
  keepRange(e,dt,ang,d,sp,270,0.6); e.fireCd-=dt; e.crossCd-=dt;
  if(e.crossCd<=0&&firing()&&d<620){ e.crossCd=rand(6,8)/fireDiv(); e.castT=0.6; const L=230;
    for(const a of [0,Math.PI/2]) addHazard({kind:'line',x1:p.x-Math.cos(a)*L,y1:p.y-Math.sin(a)*L,x2:p.x+Math.cos(a)*L,y2:p.y+Math.sin(a)*L,w:26,delay:1.1,dmg:e.bdmg*1.4,color:'#e0b25a'});
    return; }
  if(e.fireCd<=0&&firing()&&d<540&&e._mLos!==false){ e.fireCd=rand(1.6,2.1)/fireDiv(); for(const k of [-0.18,0,0.18]) bshoot(e,ang+k,330,e.bdmg,6,'#e0b25a'); } }
function hunterDown(e){ if(!G.run)return; const bounty=Math.round(G.level*6);
  G.coins+=bounty; G.run.gold+=bounty; $('#coinTag').textContent=G.coins; G.run.huntKills=(G.run.huntKills||0)+1;
  guiltAdd(-25); showToast(t('hunter_down'),'+'+bounty+' '+t('hud_gold')+' · −25 '+t('guilt_label')); }
Object.assign(ETYPES,{
  hunter:{r:15,hp:150,speed:74,dmg:0,color:'#c8bca4',xp:12,bdmg:10,name:'Großinquisitor',ai:aiHunter,
    init:e=>{ e.hunter=true; e.elite=true; e.crossCd=3; e.fireCd=1.2; },onDeath:hunterDown},
});
/* Stationsbeginn (buildLevel): fällige Jagd auf einer normalen Station */
function guiltStation(lvl){ if(!G.run)return; updateGuiltTag(); const g=guiltOf();
  if(lvl%5===0||g<GUILT_HUNT||lvl<(G.run.huntNext||0))return;
  G.run.huntNext=lvl+(g>=80?2:3); G.run.hunts=(G.run.hunts||0)+1;
  spawnEnemy('hunter',WORLD.w/2,ROOM.y+20,lvl,{hpMult:1+g/100});
  showToast(t('hunter_t'),t('hunter_d')); }
/* Welle besiegt, der Jäger lebt noch: er entkommt (die Station endet nicht an ihm) */
function huntEscape(){ for(let i=enemies.length-1;i>=0;i--){ const e=enemies[i]; if(!e.hunter)continue;
    for(let k=0;k<20;k++) spawnParticle(e.x,e.y,'#e0b25a',rand(1.5,3),rand(60,180)); enemies.splice(i,1); showToast(t('hunter_t'),t('hunter_flee')); } }

/* Pixel-Figur: der Inquisitor der Spielerfiguren im weißen Habit statt Purpur (hebt sich vom dunklen Boden ab); goldener Elite-Ring */
PX_ENEMY.hunter=Object.assign({},PX_HERO.inquisitor,{pal:{R:'#c8bca4',r:'#6e6660',b:'#ece2cc'}});

Object.assign(I18N.de,{ guilt_label:'Schuld', guilt_up:'+{n} Schuld', guilt_up_d:'Die Macht hat ihren Preis.',
  guilt_hunt_t:'Die Inquisition ist dir auf der Spur', guilt_hunt_d:'Ab jetzt jagt dich ein Inquisitor, bis deine Schuld unter 40 fällt.',
  guilt_tip:'Schuld: +{d}% Schaden, +{e}% Eliten. Ab {h} jagt dich ein Inquisitor. Ablass oder Opfer beim Händler senken sie.',
  hunter_t:'Großinquisitor', hunter_d:'Er jagt dich. Töte ihn, bevor die Welle fällt: −25 Schuld und Kopfgeld.', hunter_flee:'Er entkommt — und kommt wieder.',
  hunter_down:'Der Inquisitor ist gefallen', cdx_e_hunter:'Erscheint ab 40 Schuld. Hält Abstand, schießt Bannbolzen und legt ein Feuerkreuz unter dich; entkommt, wenn die Welle fällt.',
  merch_k_ablass:'Ablass', merch_n_ablass:'Ablassbrief', merch_d_ablass:'−20 Schuld. Jeder weitere Brief in diesem Besuch kostet mehr.', merch_guilt:'Deine Schuld: {n}',
  sum_guilt:'Schuld (höchste)', sum_hunts:'Inquisitoren (getötet)', altar_guilt:'−{n} Schuld' });
Object.assign(I18N.en,{ guilt_label:'Guilt', guilt_up:'+{n} guilt', guilt_up_d:'Power has its price.',
  guilt_hunt_t:'The Inquisition is on your trail', guilt_hunt_d:'An inquisitor hunts you until your guilt falls below 40.',
  guilt_tip:'Guilt: +{d}% damage, +{e}% elites. From {h} an inquisitor hunts you. Indulgences or sacrifices at the merchant lower it.',
  hunter_t:'Grand Inquisitor', hunter_d:'He hunts you. Kill him before the wave falls: −25 guilt and a bounty.', hunter_flee:'He escapes — and will return.',
  hunter_down:'The inquisitor has fallen', cdx_e_hunter:'Appears from 40 guilt. Keeps his distance, fires banishing bolts and lays a cross of fire under you; escapes when the wave falls.',
  merch_k_ablass:'Indulgence', merch_n_ablass:'Letter of indulgence', merch_d_ablass:'−20 guilt. Each further letter this visit costs more.', merch_guilt:'Your guilt: {n}',
  sum_guilt:'Guilt (peak)', sum_hunts:'Inquisitors (killed)', altar_guilt:'−{n} guilt' });
