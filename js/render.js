"use strict";
/* GOLGOTHA — Zeichnen: Welt, Figuren, Gegner, Effekte, Minimap; HUD (Teil von game.js, Reihenfolge siehe index.html) */
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
  for(const pu of puddles){cx.save();cx.globalAlpha=clamp(pu.life,0,1)*0.5;cx.fillStyle=pu.effect==='fire'?'rgba(224,138,47,1)':pu.effect==='chill'?C.chill:C.sick;cx.beginPath();cx.arc(pu.x,pu.y,pu.r,0,TAU);cx.fill();
    if(pu.effect==='fire'){cx.globalAlpha=clamp(pu.life,0,1)*0.3;cx.fillStyle='#ffd27a';cx.beginPath();cx.arc(pu.x,pu.y,pu.r*0.6,0,TAU);cx.fill();}cx.restore();}
  for(const n of novaRings){cx.save();cx.globalAlpha=clamp(n.t/0.45,0,1)*0.6;cx.strokeStyle=n.color;cx.lineWidth=3;cx.beginPath();cx.arc(n.x,n.y,n.r,0,TAU);cx.stroke();cx.restore();}
  for(const ob of obstacles) drawObstacle(ob);
  drawShrine(); drawHazards();
  for(const pk of pickups){const yy=pk.y+Math.sin(pk.bob)*2;
    if(pk.type==='coin'){cx.fillStyle=C.gold2;cx.beginPath();cx.arc(pk.x,yy,4,0,TAU);cx.fill();cx.fillStyle='rgba(255,255,255,.4)';cx.beginPath();cx.arc(pk.x-1,yy-1,1.5,0,TAU);cx.fill();}
    else if(pk.type==='xp'){cx.save();cx.translate(pk.x,yy);cx.rotate(Math.PI/4);cx.shadowColor=C.xp;cx.shadowBlur=6;cx.fillStyle=C.xp;cx.fillRect(-3,-3,6,6);cx.restore();}
    else{cx.fillStyle=C.blood2;cx.fillRect(pk.x-1,yy-4,2,8);cx.fillRect(pk.x-4,yy-1,8,2);}
  }
  drawDeployables();
  for(const e of enemies) drawEnemy(e);
  // eigene Geschosse: Form je Waffe (sprites.js), vorgezeichnet und gedreht
  for(const b of bullets){ if(b.x<cam.x-60||b.x>cam.x+W+60||b.y<cam.y-60||b.y>cam.y+H+60)continue; drawProjectile(cx,b,G.uiTime); }
  for(const bo of bolts){cx.save();cx.globalAlpha=clamp(bo.t/0.12,0,1);cx.strokeStyle=bo.color||'#cfe0ff';cx.lineWidth=2;cx.shadowColor=bo.color||'#9bbcff';cx.shadowBlur=10;cx.beginPath();cx.moveTo(bo.x1,bo.y1);const mx=(bo.x1+bo.x2)/2+rand(-10,10),my=(bo.y1+bo.y2)/2+rand(-10,10);cx.lineTo(mx,my);cx.lineTo(bo.x2,bo.y2);cx.stroke();cx.restore();}
  for(const bm of beams){cx.save();cx.globalAlpha=clamp(bm.t/0.09,0,1);cx.lineCap='round';cx.shadowColor=bm.color;cx.shadowBlur=14;cx.strokeStyle=bm.color;cx.lineWidth=bm.width||6;cx.beginPath();cx.moveTo(bm.x1,bm.y1);cx.lineTo(bm.x2,bm.y2);cx.stroke();cx.strokeStyle='#fff';cx.lineWidth=(bm.width||6)*0.35;cx.stroke();cx.restore();}
  drawLinkChain();
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
  const sh=G.shrine; if(sh&&!sh.used){ const sx=sh.x-cam.x, sy=sh.y-cam.y; if(sx<0||sx>W||sy<0||sy>H){ const x0=24,x1=W-24,y0=100,y1=H-70,ox=(x0+x1)/2,oy=(y0+y1)/2,a=Math.atan2(sy-oy,sx-ox),tx=Math.cos(a),ty=Math.sin(a),k=Math.min((x1-ox)/Math.max(Math.abs(tx),1e-6),(y1-oy)/Math.max(Math.abs(ty),1e-6));
    cx.save(); cx.translate(ox+tx*k,oy+ty*k); cx.fillStyle=SHRINES[sh.kind].color; cx.globalAlpha=0.8; cx.beginPath(); cx.arc(0,0,7,0,TAU); cx.fill(); cx.rotate(a); cx.beginPath(); cx.moveTo(16,0); cx.lineTo(8,-5); cx.lineTo(8,5); cx.closePath(); cx.fill(); cx.restore(); } }
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
  if(G.shrine&&!G.shrine.used){ m.fillStyle=SHRINES[G.shrine.kind].color; m.fillRect(offx+G.shrine.x*sc-2.5,offy+G.shrine.y*sc-2.5,5,5); }
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
    } else if(d.kind==='rat'){
      cx.rotate(d.ang||0); cx.strokeStyle='#5a4a3a';cx.lineWidth=1.5;cx.beginPath();cx.moveTo(-d.r,0);cx.quadraticCurveTo(-d.r*2,Math.sin(G.uiTime*14+d.phase)*4,-d.r*2.6,0);cx.stroke();
      cx.fillStyle=d.color;cx.beginPath();cx.ellipse(0,0,d.r*1.2,d.r*0.75,0,0,TAU);cx.fill();
      cx.fillStyle=C.sick;cx.beginPath();cx.arc(d.r*0.9,-d.r*0.25,1.4,0,TAU);cx.fill();
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
/* Koop-Gabe „Verbundene Kette“: Glieder zwischen den Spielern, rot glühend, solange sie in Reichweite sind */
function drawLinkChain(){ const a=players.find(p=>p.linkDps>0&&!p.dead); if(!a)return; const b=players.find(q=>q!==a&&!q.dead); if(!b)return;
  const d=Math.hypot(b.x-a.x,b.y-a.y), on=d<LINK_MAX, n=Math.max(2,Math.floor(d/13));
  cx.save(); cx.globalAlpha=on?0.95:0.25; if(on){ cx.shadowColor=C.blood2; cx.shadowBlur=8; }
  cx.strokeStyle=on?'#b8a890':'#6a6258'; cx.lineWidth=2;
  for(let i=0;i<=n;i++){ const t=i/n, x=a.x+(b.x-a.x)*t, y=a.y+(b.y-a.y)*t+Math.sin(t*Math.PI)*(on?6:16);
    cx.beginPath(); cx.ellipse(x,y,4.5,2.6,Math.atan2(b.y-a.y,b.x-a.x)+(i%2?Math.PI/2:0),0,TAU); cx.stroke(); }
  cx.restore(); }
function drawPlayer(){
  const p=player;
  // aura
  if(p.auraDps>0){cx.save();cx.globalAlpha=0.12+Math.sin(G.uiTime*3)*0.03;cx.fillStyle=C.sick;cx.beginPath();cx.arc(p.x,p.y,p.auraR,0,TAU);cx.fill();cx.restore();}
  const moving=p.moving;   // je Spieler (früher: irgendeine Bewegungstaste beider Spieler)
  if(p.dashTime>0){ for(let k=3;k>=1;k--){ cx.globalAlpha=0.12*(4-k); drawHero(cx,p.charId||G.charId,p.x-p.dashDir.x*k*14,p.y-p.dashDir.y*k*14,p.r*1.3,G.uiTime,true,p.aim); } cx.globalAlpha=1; }   // Nachbilder beim Ausweichen
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
  if(e.isBoss){ drawBoss(e,col); }
  else if(ENEMY_ART[e.type]){   // vorgezeichnete Figur (sprites.js), schaut zum nächsten Spieler
    const tg=nearestPlayer(e.x,e.y)||player, face=tg&&tg.x<e.x?-1:1, nf=ENEMY_FRAMES[e.type]||1;
    const spr=enemySprite(e.type,Math.round(e.r),e.color,nf>1?Math.floor(G.uiTime*8+e.wob)%nf:0,e.hitFlash>0);
    if(e.type==='exploder'){ const pulse=0.5+Math.sin(G.uiTime*10+e.wob)*0.5; cx.globalAlpha=0.25+pulse*0.35; cx.fillStyle=C.candle; cx.beginPath(); cx.arc(face*e.r*0.35,e.r*0.15,e.r*(0.7+pulse*0.25),0,TAU); cx.fill(); cx.globalAlpha=1; }
    if(e.type==='summoner'){ cx.save(); cx.translate(0,-e.r*1.45); cx.rotate(G.uiTime*1.4); cx.strokeStyle='rgba(208,168,255,.7)'; cx.lineWidth=1.5; cx.beginPath(); for(let k=0;k<=3;k++){const a=k/3*TAU; cx.lineTo(Math.cos(a)*e.r*0.5,Math.sin(a)*e.r*0.5);} cx.stroke(); cx.beginPath(); cx.arc(0,0,e.r*0.55,0,TAU); cx.stroke(); cx.restore(); }
    if(e.type==='healer'){ cx.save(); cx.globalAlpha=0.3+Math.sin(G.uiTime*4+e.wob)*0.2; cx.strokeStyle='#bfeacf'; cx.lineWidth=2; cx.beginPath(); cx.arc(0,0,e.r*1.35,0,TAU); cx.stroke(); cx.restore(); }
    cx.save(); cx.scale(face,1); cx.drawImage(spr,-spr._pad,-spr._pad); cx.restore();
    if(e.type==='exploder'&&Math.random()<0.5) spawnParticle(e.x+face*e.r*0.5,e.y-e.r*0.75,'#ffd27a',1.2,30);
  }
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
  if(BOSS_ART[k]){ BOSS_ART[k](cx,e,col,t); return; }   // Bosse 6–10 (sprites.js)
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
  if(Math.cos(aim)<0){ g.scale(-1,1); aim=Math.PI-aim; }   // Figur schaut in Schussrichtung
  if(moving){ const st=Math.sin(t*12)*s*0.2;   // Schritte unter dem Saum
    g.fillStyle='#0c0a08'; g.beginPath(); g.ellipse(-s*0.26+st,s*1.02,s*0.17,s*0.09,0,0,TAU); g.ellipse(s*0.26-st,s*1.02,s*0.17,s*0.09,0,0,TAU); g.fill(); }
  const W2=v=>Math.max(1,v);
  if(HERO_ART[id]){ HERO_ART[id](g,s,t,sw,aim); }   // eigene Figur (sprites.js)
  else if(sk==='penitent'){
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
  autoCollapse('weaponDock',p.weapons.length,5);
  const cb=$('#clsBar'); if(cb) cb.innerHTML=Object.keys(p.clsSt||{}).filter(c=>p.clsSt[c]>0).map(c=>clsChip(c,clsName(c)+' '+ROMAN[p.clsSt[c]])).join(''); }
/* pro Frame: Abklingzeiten (Ausweichen, Waffen ab 0,3 s) und verbleibende Gegner */
function updateHudLive(){ const p=players[0]; if(!p)return;
  const dr=Admin.dash?1:clamp(1-p.dashCd/DASH_CD,0,1); $('#dashFill').style.width=dr*100+'%'; $('#dashBtn').style.setProperty('--cd',dr);
  document.querySelectorAll('#weaponbar .wcd').forEach((el,i)=>{ const mx=(p.wCdMax&&p.wCdMax[i])||0; el.style.width=(mx>0.3?clamp(1-p.wCd[i]/mx,0,1)*100:100)+'%'; });
  const n=enemies.length; if(n!==G._foeN){ G._foeN=n; $('#foeLabel').innerHTML=t('hud_foes',{n:'<b>'+n+'</b>'}); } }
function updateItemPills(){ if(!player)return;const wrap=$('#itemPills');wrap.innerHTML='';
  player.items.forEach(it=>{const el=document.createElement('div');el.className='ipill'+(it.ability?' ab':'')+(it.relic?' rl':'');el.innerHTML=svgIcon(it.ic,it.color,14);wrap.appendChild(el);});
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
