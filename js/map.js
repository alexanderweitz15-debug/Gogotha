"use strict";
/* GOLGOTHA — Karten: Raumaufbau, Boden, Wände und Hindernisse je Region
   Lange Wände/Reihen sind Ketten überlappender Kreis-Hindernisse in `obstacles` (Kollision, Geschoss-Hooks, Querschläger,
   Platzierungen funktionieren unverändert). Jede Kette gehört zu einer Gruppe (ob.grp) und wird als EIN vorgezeichnetes Bild
   gemalt. Boden + statische Deko liegen je Station in einer Offscreen-Canvas, kopiert wird nur der sichtbare Ausschnitt.
   Zerstörbare Objekte (ob.brk) sind einzelne Kreise ohne Gruppe. Gegner laufen per Flussfeld um Wände (mapSteer). */
const MAP={ri:0,boss:false,groups:[],floor:null,fs:1,world:null,obsRef:null,ver:0,mini:null,miniKey:'',grid:null,flow:null,flowT:-9,live:[],lights:[],tries:0,tpl:''};
const MAP_START_R=190, MAP_EDGE=50, MAP_IN=72;   // Startkreis frei; Randband (Spawns) frei; Innenfläche der Vorlagen

/* ---------- Hilfen ---------- */
const mapTri=x=>2*Math.abs(x-Math.floor(x+0.5));   // Dreieckswelle 0..1
function mapChain(pts,r,sp){ const out=[]; for(let i=0;i<pts.length-1;i++){ const a=pts[i],b=pts[i+1], n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(r*sp)));
  for(let k=i?1:0;k<=n;k++) out.push({x:a[0]+(b[0]-a[0])*k/n,y:a[1]+(b[1]-a[1])*k/n,r}); } return out; }
function mapWalk(pts,step,fn,off){ let t=off||0; for(let i=0;i<pts.length-1;i++){ const a=pts[i],b=pts[i+1], L=Math.hypot(b[0]-a[0],b[1]-a[1]), an=Math.atan2(b[1]-a[1],b[0]-a[0]);
  while(t<=L){ fn(a[0]+Math.cos(an)*t,a[1]+Math.sin(an)*t,an); t+=step; } t-=L; } }
function mapPath(c,pts){ c.beginPath(); c.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]); }
const mapRegionIdx=lvl=>clamp(Math.floor((lvl-1)/10),0,4);

/* ---------- Layout-Kontext: Innenfläche (u,v 0..1), Spiegelung an der Senkrechten ---------- */
function mapCtx(){ const m=MAP_IN, L={x0:ROOM.x+m,y0:ROOM.y+m,w:ROOM.w-2*m,h:ROOM.h-2*m,sx:WORLD.w/2,sy:WORLD.h-160,fx:Math.random()<0.5,groups:[],brk:[]};
  L.p=(u,v)=>[L.x0+(L.fx?1-u:u)*L.w, L.y0+v*L.h];
  L.add=(style,circ,extra)=>{ const g=Object.assign({style,circ},extra); L.groups.push(g); return g; };
  L.chain=(style,pts,r,extra)=>L.add(style,mapChain(pts,r,(extra&&extra.sp)||1.25),Object.assign({pts,r},extra));
  L.wall=(style,uv,r,extra)=>L.chain(style,uv.map(q=>L.p(q[0],q[1])),r,extra);
  L.line=(style,x,y,a,len,r,extra)=>L.chain(style,[[x-Math.cos(a)*len/2,y-Math.sin(a)*len/2],[x+Math.cos(a)*len/2,y+Math.sin(a)*len/2]],r,Object.assign({a,x,y,len},extra));
  L.prop=(style,x,y,r,extra)=>L.add(style,[{x,y,r}],Object.assign({x,y,r},extra));
  /* frei? (Abstand zum Start und zu allen bisherigen Kreisen) */
  L.free=(x,y,r,gap)=>{ if(Math.hypot(x-L.sx,y-L.sy)<MAP_START_R+r+20)return false;
    if(x-r<ROOM.x+MAP_EDGE+4||x+r>ROOM.x+ROOM.w-MAP_EDGE-4||y-r<ROOM.y+MAP_EDGE+4||y+r>ROOM.y+ROOM.h-MAP_EDGE-4)return false;
    for(const g of L.groups)for(const c of g.circ) if(Math.hypot(x-c.x,y-c.y)<r+c.r+gap)return false; return true; };
  L.spot=(r,gap,tries,vMax)=>{ for(let k=0;k<(tries||40);k++){ const p=L.p(rand(0,1),rand(0,vMax||1)); if(L.free(p[0],p[1],r,gap))return p; } return null; };
  return L; }
/* Reihe quer über den Raum (u 0..1) mit Lücken; zig = Zickzack-Ausschlag in px (Grabenknick) */
function mapRow(L,style,v,r,gaps,zig,u0,u1,extra){ u0=u0==null?0:u0; u1=u1==null?1:u1;
  const cut=gaps.map(gp=>[gp[0]-gp[1]/2/L.w,gp[0]+gp[1]/2/L.w]).sort((a,b)=>a[0]-b[0]), parts=[]; let s=u0;
  for(const c of cut){ if(c[0]>s)parts.push([s,Math.min(c[0],u1)]); s=Math.max(s,c[1]); } if(s<u1)parts.push([s,u1]);
  const step=0.06, fr=L.w/260;
  for(const [a,b] of parts){ if((b-a)*L.w<r*2.2)continue; const uv=[]; for(let u=a;u<b;u+=step)uv.push(u); uv.push(b);
    L.chain(style,uv.map(u=>{ const p=L.p(u,v); return [p[0],p[1]+(zig?(mapTri(u*fr)-0.5)*2*zig:0)]; }),r,extra); } }
function mapGaps(L,n,wmin,wmax,avoid){ const out=[]; let g=0;
  while(out.length<n&&g++<60){ const u=rand(0.12,0.88), w=rand(wmin,wmax); if(out.some(o=>Math.abs(o[0]-u)*L.w<(o[1]+w)/2+140))continue; if(avoid&&Math.abs(u-avoid)<0.12)continue; out.push([u,w]); }
  return out; }

/* ---------- LAYOUT-VORLAGEN je Region (je Funktion ein Raumtyp; Zufall + Spiegelung variiert) ---------- */
const MAP_TPL=[
 /* 0 Die Gräben */ {
  trenches(L){ const rows=L.h>780?[0.16,0.44,0.7]:[0.2,0.56];
    rows.forEach((v,i)=>{ const last=i===rows.length-1; mapRow(L,'sandbag',v+rand(-0.03,0.03),17,mapGaps(L,last?1:2,140,175,last?0.5:null).concat(last?[[0.5,420]]:[]),rand(16,30)); });
    for(let i=0;i<rows.length-1;i++){ const v=(rows[i]+rows[i+1])/2, u=rand(0.2,0.8), p=L.p(u,v); L.line('wire',p[0],p[1],rand(-0.35,0.35),rand(150,250),11); }
    const p=L.p(rand(0.05,0.2),rows[0]-0.1); L.line('wire',p[0],p[1],rand(-0.4,0.4),rand(110,170),11); },
  nests(L){ const n=clamp(Math.round(L.w*L.h/170000),3,8); let k=0,g=0;
    while(k<n&&g++<120){ const R=rand(54,72), p=L.spot(R+20,110,1,0.8); if(!p)continue;
      const open=Math.atan2(L.sy-p[1],L.sx-p[0])+rand(-1.2,1.2), arc=[]; for(let a=open+0.95;a<=open+TAU-0.95+1e-6;a+=0.2)arc.push([p[0]+Math.cos(a)*R,p[1]+Math.sin(a)*R]);
      L.chain('sandbag',arc,16); k++; }
    for(let i=0;i<3;i++){ const q=L.spot(90,70,30,0.85); if(q)L.line('wire',q[0],q[1],rand(0,Math.PI),rand(140,230),11); } },
  zigzag(L){ const us=[rand(0.24,0.3),rand(0.7,0.76)];
    for(const u of us){ const gv=rand(0.25,0.5), up=[], dn=[];
      for(let v=0;v<=0.72;v+=0.07){ const q=L.p(u+(mapTri(v*3.2)-0.5)*0.06,v); if(v<gv-0.09)up.push(q); else if(v>gv+0.09)dn.push(q); }
      if(up.length>1)L.chain('sandbag',up,17); if(dn.length>1)L.chain('sandbag',dn,17); }
    const v=rand(0.3,0.42); mapRow(L,'wire',v,11,[[0.5,180]],0,0.34,0.66);
    for(let i=0;i<2;i++){ const q=L.spot(70,60,30,0.7); if(q)L.line('sandbag',q[0],q[1],rand(-0.3,0.3),rand(110,160),16); } },
 },
 /* 1 Die Katakomben */ {
  hall(L){ const nc=clamp(Math.round(L.w/240),3,10), nr=clamp(Math.round(L.h*0.74/210),2,5), hole=Math.random()<0.5;
    for(let i=0;i<nc;i++)for(let j=0;j<nr;j++){ if(Math.random()<0.12)continue; if(hole&&i>0&&i<nc-1&&j===Math.floor(nr/2)&&Math.abs(i-(nc-1)/2)<1)continue;
      const p=L.p((i+0.5)/nc,(j+0.5)/nr*0.74);
      if(Math.random()<0.13) L.line('sarco',p[0],p[1],Math.random()<0.5?0:Math.PI/2,84,15,{sp:1.5}); else L.prop('pillar',p[0],p[1],rand(25,31)); } },
  corridors(L){ const vs=[rand(0.22,0.28),rand(0.5,0.56)];
    vs.forEach((v,i)=>{ const before=L.groups.length; mapRow(L,'stone',v,16,mapGaps(L,2,150,180),0);
      /* Nischen: kurze Stummel quer zur Wand, abwechselnd oben/unten */
      for(const g of L.groups.slice(before)){ const a=g.pts[0], b=g.pts[g.pts.length-1], len=Math.hypot(b[0]-a[0],b[1]-a[1]);
        for(let t=70;t<len-60;t+=rand(130,180)){ const x=a[0]+(b[0]-a[0])*t/len, y=a[1]+(b[1]-a[1])*t/len, sd=(Math.random()<0.5?-1:1)*(i?-1:1); L.chain('stone',[[x,y],[x,y+sd*58]],15); } } });
    for(let k=0;k<3;k++){ const q=L.spot(30,90,30,0.62); if(q)L.prop('pillar',q[0],q[1],rand(20,25)); } },
  crypt(L){ const cw=clamp(L.w*0.36,300,560), ch=clamp(L.h*0.42,230,380), c=L.p(0.5,0.36), x0=c[0]-cw/2,x1=c[0]+cw/2,y0=c[1]-ch/2,y1=c[1]+ch/2, dw=140;
    const doors=[0,1,2,3].filter(()=>Math.random()<0.7); if(doors.length<2)doors.push(2,1);
    const side=(s,a,b)=>{ if(!doors.includes(s)){ L.chain('stone',[a,b],16); return; } const m=[(a[0]+b[0])/2,(a[1]+b[1])/2], L2=Math.hypot(b[0]-a[0],b[1]-a[1]), f=(L2-dw)/2/L2;
      L.chain('stone',[a,[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]],16); L.chain('stone',[[b[0]+(a[0]-b[0])*f,b[1]+(a[1]-b[1])*f],b],16); };
    side(0,[x0,y0],[x1,y0]); side(1,[x1,y0],[x1,y1]); side(2,[x1,y1],[x0,y1]); side(3,[x0,y1],[x0,y0]);
    L.line('sarco',c[0],c[1],Math.random()<0.5?0:Math.PI/2,84,15,{sp:1.5});
    for(const [u,v] of [[0.08,0.1],[0.92,0.1],[0.08,0.62],[0.92,0.62]]){ const p=L.p(u+rand(-0.03,0.03),v+rand(-0.03,0.03)); if(L.free(p[0],p[1],26,60))L.prop('pillar',p[0],p[1],rand(21,26)); }
    for(let k=0;k<2;k++){ const q=L.spot(18,90,30,0.75); if(q)L.prop('bones',q[0],q[1],16); } },
 },
 /* 2 Das Lazarett */ {
  ward(L){ const rows=L.h>760?[0.08,0.36,0.62]:[0.1,0.46], sp=rand(96,112);
    rows.forEach((v,ri)=>{ const n=Math.floor(L.w/sp), off=(L.w-(n-1)*sp)/2;
      for(let i=0;i<n;i++){ if(Math.random()<0.14)continue; const p=[L.x0+off+i*sp,L.p(0,v)[1]+40];
        if(Math.abs(p[0]-L.sx)<130&&ri===rows.length-1)continue; L.line('bed',p[0],p[1],Math.PI/2,74,17,{sp:1.6}); }
      if(Math.random()<0.7){ const p=L.p(rand(0.15,0.85),v); L.line('screen',p[0],p[1]+96,rand(-0.2,0.2),rand(100,150),10); } }); },
  screens(L){ const n=clamp(Math.round(L.w*L.h/200000),4,9);
    for(let k=0;k<n;k++){ const q=L.spot(70,70,30,0.8); if(!q)continue; const a=rand(0,Math.PI), pn=randInt(3,5), pts=[];
      for(let i=0;i<=pn;i++){ const s=(i-pn/2)*40, z=(i%2?1:-1)*9; pts.push([q[0]+Math.cos(a)*s-Math.sin(a)*z,q[1]+Math.sin(a)*s+Math.cos(a)*z]); }
      L.chain('screen',pts,10); }
    for(let k=0;k<3;k++){ const q=L.spot(40,70,30,0.75); if(q)L.line('optable',q[0],q[1],rand(-0.2,0.2)+(Math.random()<0.5?0:Math.PI/2),76,17,{sp:1.6}); }
    for(let k=0;k<4;k++){ const q=L.spot(20,60,30,0.3); if(q)L.prop('cabinet',q[0],q[1],18); } },
  theatre(L){ const c=L.p(0.5,0.34); L.line('optable',c[0],c[1],0,80,18,{sp:1.6});
    for(const [dx,dy] of [[-90,-70],[90,-70],[-90,70],[90,70]])L.prop('lamp',c[0]+dx,c[1]+dy,10);
    L.chain('screen',[[c[0]-170,c[1]-60],[c[0]-180,c[1]],[c[0]-170,c[1]+60]],10); L.chain('screen',[[c[0]+170,c[1]-60],[c[0]+180,c[1]],[c[0]+170,c[1]+60]],10);
    for(const u of [0.06,0.94]){ const n=Math.floor(L.h*0.7/96); for(let i=0;i<n;i++){ if(Math.random()<0.2)continue; const p=L.p(u,0.04+i*96/L.h); L.line('bed',p[0],p[1],0,74,17,{sp:1.6}); } }
    for(let k=0;k<2;k++){ const q=L.spot(20,70,30,0.6); if(q)L.prop('cabinet',q[0],q[1],18); } },
 },
 /* 3 Der Schlachthof */ {
  hooks(L){ const rows=L.h>760?[0.12,0.38,0.62]:[0.14,0.5];
    rows.forEach((v,ri)=>{ const sp=rand(64,74), y=L.p(0,v)[1]+rand(-20,20), n=Math.floor(L.w*0.9/sp), off=(L.w-(n-1)*sp)/2, skip=new Set();
      for(let k=0;k<2;k++){ const s=randInt(1,n-3); skip.add(s); skip.add(s+1); }
      let run=[];
      const flush=()=>{ if(run.length>=2)L.add('hooks',run,{y}); run=[]; };
      for(let i=0;i<n;i++){ const x=L.x0+off+i*sp; if(skip.has(i)||(ri===rows.length-1&&Math.abs(x-L.sx)<150)){ flush(); continue; } run.push({x,y,r:14}); } flush(); });
    for(let k=0;k<2;k++){ const q=L.spot(40,80,30,0.72); if(q)L.line('bench',q[0],q[1],Math.random()<0.5?0:Math.PI/2,rand(120,170),17); } },
  islands(L){ const n=clamp(Math.round(L.w*L.h/260000),3,6); let k=0,g=0;
    while(k<n&&g++<80){ const R=rand(32,38), q=L.spot(R+90,120,1,0.78); if(!q)continue; L.prop('cauldron',q[0],q[1],R); k++;
      const a0=rand(0,TAU), nb=randInt(1,2); for(let b=0;b<nb;b++){ const a=a0+b*Math.PI+rand(-0.4,0.4), d=R+62, x=q[0]+Math.cos(a)*d, y=q[1]+Math.sin(a)*d; L.line('bench',x,y,a+Math.PI/2,rand(100,130),16); } } },
  benches(L){ const rows=L.h>760?[0.12,0.34,0.56]:[0.14,0.5], bl=rand(170,230);
    rows.forEach((v,ri)=>{ const step=bl+rand(120,150), n=Math.ceil(L.w/step)+1, off=(ri%2)*step/2-rand(0,step*0.4);
      for(let i=0;i<n;i++){ const x=L.x0+off+i*step; if(x-bl/2<L.x0||x+bl/2>L.x0+L.w)continue; const y=L.p(0,v)[1]; if(Math.random()<0.15)continue; L.line('bench',x,y,0,bl,17); } });
    for(const u of [0.03,0.97]){ const p=L.p(u,rand(0.3,0.6)); if(L.free(p[0],p[1],36,40))L.prop('cauldron',p[0],p[1],34); } },
 },
 /* 4 Golgotha */ {
  hills(L){ const n=clamp(Math.round(L.w*L.h/200000),3,8); let k=0,g=0;
    while(k<n&&g++<120){ const q=L.spot(90,130,1,0.8); if(!q)continue; const circ=[{x:q[0],y:q[1],r:rand(36,52)}], m=randInt(4,9);
      for(let i=0;i<m;i++){ const b=pick(circ), a=rand(0,TAU), r=rand(20,38), d=(b.r+r)*rand(0.45,0.7); circ.push({x:b.x+Math.cos(a)*d,y:b.y+Math.sin(a)*d,r}); }
      if(circ.every(c=>L.free(c.x,c.y,c.r,40))){ L.add('rock',circ); k++; } } },
  circles(L){ const n=L.w*L.h>900000?2:1; let k=0,g=0;
    while(k<n&&g++<60){ const R=rand(110,150), q=L.spot(R+30,120,1,0.66); if(!q)continue; const cnt=Math.round(TAU*R/56), open=new Set(), o0=randInt(0,cnt-1);
      for(let i=0;i<3;i++){ const s=(o0+Math.floor(i*cnt/3)+randInt(0,1))%cnt; open.add(s); open.add((s+1)%cnt); }
      for(let i=0;i<cnt;i++){ if(open.has(i))continue; const a=i/cnt*TAU; L.prop('cross',q[0]+Math.cos(a)*R,q[1]+Math.sin(a)*R,13); }
      L.add('rock',[{x:q[0],y:q[1],r:26}],{altar:1}); k++; }
    for(let i=0;i<3;i++){ const q=L.spot(50,90,30,0.8); if(q)L.add('rock',[{x:q[0],y:q[1],r:rand(26,36)},{x:q[0]+rand(-30,30),y:q[1]+rand(-24,24),r:rand(18,26)}]); } },
  skull(L){ const c=L.p(0.5,rand(0.3,0.4)), k=clamp(L.w/1300,1,1.6), circ=[{x:c[0],y:c[1],r:56*k}];
    for(let i=0;i<10;i++){ const a=i/10*TAU+rand(-0.3,0.3), r=rand(28,42)*k, d=rand(48,74)*k; circ.push({x:c[0]+Math.cos(a)*d*1.35,y:c[1]+Math.sin(a)*d*0.8,r}); }
    L.add('rock',circ,{crosses:3});
    for(let s=0;s<2+Math.round(L.w*L.h/1500000);s++){ const q=L.spot(40,140,30,0.75); if(!q)continue; const a=rand(0,Math.PI), n=randInt(3,5);
      for(let i=0;i<n;i++){ const x=q[0]+Math.cos(a)*(i-(n-1)/2)*74, y=q[1]+Math.sin(a)*(i-(n-1)/2)*74; if(L.free(x,y,13,40))L.prop('cross',x,y,13); } }
    for(let i=0;i<2+Math.round(L.w*L.h/700000);i++){ const q=L.spot(50,110,30,0.8); if(q)L.add('rock',[{x:q[0],y:q[1],r:rand(26,38)},{x:q[0]+rand(-34,34),y:q[1]+rand(-26,26),r:rand(18,28)}]); } },
 },
];
/* Boss-Arena: offen, nur Randdeko in den Ecken */
const MAP_BOSS_PROP=[['sandbag',16],['pillar',22],['cabinet',18],['cauldron',30],['rock',30]];
function mapBossLayout(L,ri){ const [st,r]=MAP_BOSS_PROP[ri];
  for(const [u,v] of [[0.04,0.04],[0.96,0.04],[0.04,0.6],[0.96,0.6]]){ const p=L.p(u,v);
    if(st==='sandbag'){ const a=(p[0]<L.sx)===(v<0.5)?Math.PI*0.75:Math.PI*0.25; L.line('sandbag',p[0],p[1],a,90,16); }
    else if(st==='rock') L.add('rock',[{x:p[0],y:p[1],r},{x:p[0]+(p[0]<L.sx?18:-18),y:p[1]+16,r:r*0.7}]);
    else L.prop(st,p[0],p[1],r); } }
/* Zerstörbare Objekte je Region (wenige, optional) */
const MAP_BRK_KINDS=[['crate','barrel'],['poorbox','crate'],['barrel','crate'],['barrel','crate'],['poorbox','barrel']];
const MAP_BRK={barrel:{r:14,hp:3},poorbox:{r:13,hp:4},crate:{r:14,hp:3}};
function mapPlaceBreakables(L,ri){ const n=pick([0,1,1,2,2,2,3]);
  for(let k=0;k<n;k++){ const kind=pick(MAP_BRK_KINDS[ri]), r=MAP_BRK[kind].r; let p=null;
    for(let t=0;t<40&&!p;t++){ let x,y; const all=L.groups.flatMap(g=>g.circ);
      if(all.length&&Math.random()<0.65){ const c=pick(all), a=rand(0,TAU), d=c.r+r+8; x=c.x+Math.cos(a)*d; y=c.y+Math.sin(a)*d; } else { const q=L.p(rand(0,1),rand(0,0.85)); x=q[0]; y=q[1]; }
      if(!L.free(x,y,r,4)||Math.hypot(x-L.sx,y-L.sy)<MAP_START_R+60||L.brk.some(b=>Math.hypot(x-b.x,y-b.y)<140))continue; p={x,y}; }
    if(p) L.brk.push({x:p.x,y:p.y,r,type:kind,brk:true,hp:MAP_BRK[kind].hp,maxHp:MAP_BRK[kind].hp,flash:0,seed:rand(0,TAU)}); } }

/* ---------- PRÜFUNG: Raster-Flutung ---------- */
function mapGrid(circ,cs,infl,edge){ const nx=Math.ceil(ROOM.w/cs), ny=Math.ceil(ROOM.h/cs), blk=new Uint8Array(nx*ny);
  if(edge) for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){ const x=ROOM.x+(i+.5)*cs, y=ROOM.y+(j+.5)*cs; if(x<ROOM.x+edge||x>ROOM.x+ROOM.w-edge||y<ROOM.y+edge||y>ROOM.y+ROOM.h-edge)blk[j*nx+i]=2; }
  for(const c of circ){ const R=c.r+infl, i0=Math.max(0,Math.floor((c.x-R-ROOM.x)/cs)), i1=Math.min(nx-1,Math.floor((c.x+R-ROOM.x)/cs)), j0=Math.max(0,Math.floor((c.y-R-ROOM.y)/cs)), j1=Math.min(ny-1,Math.floor((c.y+R-ROOM.y)/cs));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){ const dx=ROOM.x+(i+.5)*cs-c.x, dy=ROOM.y+(j+.5)*cs-c.y; if(dx*dx+dy*dy<R*R)blk[j*nx+i]=1; } }
  return {cs,nx,ny,blk}; }
function mapFlood(gr,src){ const {nx,ny,blk,cs}=gr, d=new Int32Array(nx*ny).fill(-1), q=new Int32Array(nx*ny); let h=0,t=0;
  for(const s of src){ const i=clamp(Math.floor((s[0]-ROOM.x)/cs),0,nx-1), j=clamp(Math.floor((s[1]-ROOM.y)/cs),0,ny-1), k=j*nx+i; if(d[k]<0){ d[k]=0; q[t++]=k; } }
  while(h<t){ const k=q[h++], i=k%nx, nd=d[k]+1;
    if(i>0&&!blk[k-1]&&d[k-1]<0){d[k-1]=nd;q[t++]=k-1;} if(i<nx-1&&!blk[k+1]&&d[k+1]<0){d[k+1]=nd;q[t++]=k+1;}
    if(k>=nx&&!blk[k-nx]&&d[k-nx]<0){d[k-nx]=nd;q[t++]=k-nx;} if(k<nx*(ny-1)&&!blk[k+nx]&&d[k+nx]<0){d[k+nx]=nd;q[t++]=k+nx;} }
  return d; }
/* ok, wenn: Start frei, Rand (Spawnband) frei, jede begehbare Zelle vom Start erreichbar (Spielergröße), Spawnband auch für große Gegner, genug Freifläche */
function mapCheck(circ,sx,sy){
  for(const c of circ){ if(Math.hypot(c.x-sx,c.y-sy)<MAP_START_R+c.r)return 'start';
    if(c.x-c.r<ROOM.x+MAP_EDGE||c.x+c.r>ROOM.x+ROOM.w-MAP_EDGE||c.y-c.r<ROOM.y+MAP_EDGE||c.y+c.r>ROOM.y+ROOM.h-MAP_EDGE)return 'edge'; }
  const g1=mapGrid(circ,16,14,14), d1=mapFlood(g1,[[sx,sy]]); let free=0,reach=0;
  for(let k=0;k<d1.length;k++) if(!g1.blk[k]){ free++; if(d1[k]>=0)reach++; }
  if(reach<free)return 'closed';
  if(free<g1.blk.length*0.62)return 'dense';
  const g2=mapGrid(circ,16,22,22), d2=mapFlood(g2,[[sx,sy]]), nx=g2.nx, ny=g2.ny;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){ if(i>3&&i<nx-4&&j>3&&j<ny-4)continue; const k=j*nx+i; if(!g2.blk[k]&&d2[k]<0)return 'spawn'; }
  return ''; }

/* ---------- AUFBAU: wählt Vorlage, prüft, übernimmt (sonst Rückfall auf buildObstacles) ---------- */
function buildMap(lvl,region){
  const ri=mapRegionIdx(lvl), boss=lvl%5===0; MAP.ri=ri; MAP.boss=boss; MAP.groups=[]; MAP.flow=null; MAP.flowT=-9; MAP.tpl='';
  obstacles=[]; let L=null;
  if(!Admin.noObs){ const tpl=MAP_TPL[ri], names=Object.keys(tpl);
    for(let tr=0;tr<16&&!L;tr++){ const c=mapCtx(), nm=boss?'arena':pick(names);
      try{ if(boss) mapBossLayout(c,ri); else { tpl[nm](c); if(c.groups.length<3)continue; mapPlaceBreakables(c,ri); } }catch(e){ MAP.err=e.message; continue; }
      const circ=c.groups.flatMap(g=>g.circ).concat(c.brk);
      const why=mapCheck(circ,c.sx,c.sy); MAP.tries=tr+1; if(!why){ L=c; MAP.tpl=nm; } } }
  if(L){ for(const g of L.groups){ g.id=MAP.groups.length; g.obs=g.circ.map(c=>({x:c.x,y:c.y,r:c.r,type:g.style,grp:g.id,seed:rand(0,TAU)})); obstacles.push(...g.obs); MAP.groups.push(g); }
    for(const b of L.brk){ b.id=uid++; obstacles.push(b); } }
  else if(!Admin.noObs){ buildObstacles(); MAP.tpl='scatter'; }
  MAP.obsRef=obstacles; MAP.ver++;
  mapRebuildGrid();
  try{ for(const g of MAP.groups) mapBake(g); mapPaintFloor(region); }catch(e){ MAP.floor=null; console.error(e); }
}
function mapRebuildGrid(){ MAP.grid=mapGrid(obstacles,24,14,0); MAP.flowT=-9; MAP.ver++; }

/* ---------- GROBRASTER für Kollisionsabfragen (collideObstacles/bulletHitsObstacle): nur Hindernisse in der Nähe ----------
   Zelle 64 px; jedes Hindernis liegt in allen Zellen, die sein Kreis + 48 px berührt. Stimmt das Raster nicht mehr
   (anderes Array, andere Länge) wird es neu gebaut; größere Abfragen bekommen die volle Liste. */
const MAP_BIN=64, MAP_BQ=48, MAP_NONE=[];
function mapNear(x,y,r){ if(obstacles.length<24||r>MAP_BQ) return obstacles;
  let B=MAP.bins; if(!B||B.ref!==obstacles||B.n!==obstacles.length) B=mapBuildBins();
  const i=Math.floor(x/MAP_BIN), j=Math.floor(y/MAP_BIN); if(i<0||j<0||i>=B.nx||j>=B.ny) return MAP_NONE;
  return B.cells[j*B.nx+i]; }
function mapBuildBins(){ const nx=Math.ceil(WORLD.w/MAP_BIN)+1, ny=Math.ceil(WORLD.h/MAP_BIN)+1, cells=[]; for(let k=0;k<nx*ny;k++)cells.push([]);
  for(const ob of obstacles){ const R=ob.r+MAP_BQ, i0=Math.max(0,Math.floor((ob.x-R)/MAP_BIN)), i1=Math.min(nx-1,Math.floor((ob.x+R)/MAP_BIN)), j0=Math.max(0,Math.floor((ob.y-R)/MAP_BIN)), j1=Math.min(ny-1,Math.floor((ob.y+R)/MAP_BIN));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++)cells[j*nx+i].push(ob); }
  return MAP.bins={ref:obstacles,n:obstacles.length,nx,ny,cells}; }

/* ---------- WEGFINDUNG: Gegner ohne Sichtlinie folgen dem Flussfeld zum nächsten Spieler ---------- */
function mapLos(ax,ay,bx,by){ const gr=MAP.grid, dx=bx-ax, dy=by-ay, L=Math.hypot(dx,dy), n=Math.ceil(L/12);
  for(let k=1;k<n;k++){ const s=k*12; if(s<14||L-s<14)continue; const i=Math.floor((ax+dx*k/n-ROOM.x)/gr.cs), j=Math.floor((ay+dy*k/n-ROOM.y)/gr.cs);
    if(i>=0&&j>=0&&i<gr.nx&&j<gr.ny&&gr.blk[j*gr.nx+i]===1)return false; } return true; }
function mapSteer(e,p){ const a=Math.atan2(p.y-e.y,p.x-e.x), gr=MAP.grid;
  if(e.fly||e.isBoss||!gr||MAP.obsRef!==obstacles||!obstacles.length) return a;
  if(e._mLosT==null||G.time>=e._mLosT||e._mLosT-G.time>1){ e._mLos=dist2(e.x,e.y,p.x,p.y)<60*60||mapLos(e.x,e.y,p.x,p.y); e._mLosT=G.time+rand(0.18,0.3); }
  if(e._mLos) return a;
  if(!MAP.flow||Math.abs(G.time-MAP.flowT)>0.3){ MAP.flow=mapFlood(gr,players.filter(q=>!q.dead).map(q=>[q.x,q.y])); MAP.flowT=G.time; }
  const f=MAP.flow, nx=gr.nx, ny=gr.ny, cs=gr.cs, blk=gr.blk;
  const best=k=>{ const i=k%nx, j=(k-i)/nx; let b=-1, bd=f[k]>=0&&!blk[k]?f[k]:1e9;
    for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){ if(!di&&!dj)continue; const ni=i+di, nj=j+dj; if(ni<0||nj<0||ni>=nx||nj>=ny)continue; const nk=nj*nx+ni;
      if(blk[nk]||f[nk]<0)continue; if(di&&dj&&(blk[j*nx+ni]||blk[nj*nx+i]))continue; if(f[nk]<bd){bd=f[nk];b=nk;} } return b; };
  const k0=clamp(Math.floor((e.y-ROOM.y)/cs),0,ny-1)*nx+clamp(Math.floor((e.x-ROOM.x)/cs),0,nx-1);
  let k1=best(k0); if(k1<0) return a; const k2=best(k1); if(k2>=0&&!blk[k0]) k1=k2;
  const i=k1%nx, j=(k1-i)/nx; return Math.atan2(ROOM.y+(j+.5)*cs-e.y, ROOM.x+(i+.5)*cs-e.x); }

/* ---------- ZERSTÖRBARES: nur Spielerschüsse; Schaden an Gegnern läuft über die Messung (src 'barrel') ---------- */
function hitBreakable(ob,b){ if(ob.hp<=0||b.hitIds.has(ob))return; b.hitIds.add(ob); ob.hp--; ob.flash=0.12; ob.hitAt=G.uiTime;
  for(let i=0;i<4;i++)spawnParticle(ob.x,ob.y,ob.type==='barrel'?C.sick:'#8a6a40',1.4,70);
  if(ob.hp<=0) breakBreakable(ob,b.owner); }
function breakBreakable(ob,owner){ const i=obstacles.indexOf(ob); if(i>=0)obstacles.splice(i,1); mapRebuildGrid();
  G.shake=Math.max(G.shake,ob.type==='barrel'?5:2); Audio2.kill();
  if(ob.type==='barrel'){ const dmg=12+G.level*2.4;
    for(let k=0;k<22;k++)spawnParticle(ob.x,ob.y,pick([C.sick,'#6a8a2a','#3a4a1a']),rand(2,4),rand(80,220));
    novaRings.push({x:ob.x,y:ob.y,r:10,max:95,t:0.35,color:C.sick});
    for(const e of enemies.slice()) if(dist2(ob.x,ob.y,e.x,e.y)<(95+e.r)*(95+e.r)) damageEnemy(e,dmg,Math.atan2(e.y-ob.y,e.x-ob.x),60,false,'barrel',owner);
    spawnPuddle(ob.x,ob.y,4+G.level*0.6,{hostile:false,effect:'toxin',big:true,rMul:1.5,life:4.5,src:'barrel',owner}); }
  else if(ob.type==='poorbox'){ for(let k=0;k<14;k++)spawnParticle(ob.x,ob.y,pick([C.gold2,'#6a4a2a']),rand(1.5,3),rand(60,170));
    const n=randInt(4,7), v=Math.max(1,Math.round((1+G.level*0.12)*(G.rewardMul||1))); for(let k=0;k<n;k++)spawnPickup(ob.x+rand(-14,14),ob.y+rand(-14,14),'coin',v); }
  else { for(let k=0;k<16;k++)spawnParticle(ob.x,ob.y,pick(['#6a4a2a','#4a3220','#8a6a40']),rand(1.5,3),rand(60,170));
    if(Math.random()<0.3) spawnPickup(ob.x,ob.y,'health',randInt(8,14)); else for(let k=0;k<2;k++)spawnPickup(ob.x,ob.y,'coin',Math.max(1,Math.round((G.rewardMul||1)*randInt(1,2)))); } }

/* =========================================================================
   ZEICHNEN: Gruppen als vorgezeichnete Bilder (Licht von oben links, Schatten nach unten rechts)
   ========================================================================= */
const MAP_SH='rgba(0,0,0,.42)';
function mapShadowPath(c,pts,w,ox,oy){ c.save(); c.translate(ox,oy); c.strokeStyle=MAP_SH; c.lineCap='round'; c.lineJoin='round'; c.lineWidth=w; mapPath(c,pts); c.stroke(); c.restore(); }
function mapCircles(c,circ,ox,oy,grow){ c.beginPath(); for(const o of circ){ c.moveTo(o.x+ox+o.r+grow,o.y+oy); c.arc(o.x+ox,o.y+oy,o.r+grow,0,TAU); } }
/* gedrehtes Rechteck (Mitte x,y; halbe Länge/Breite) */
function mapRect(c,x,y,a,hl,hw,fill,stroke,lw){ c.save(); c.translate(x,y); c.rotate(a); c.fillStyle=fill; c.fillRect(-hl,-hw,hl*2,hw*2); if(stroke){ c.strokeStyle=stroke; c.lineWidth=lw||1.5; c.strokeRect(-hl,-hw,hl*2,hw*2); } c.restore(); }
function mapStain(c,x,y,r,col,a){ c.save(); c.globalAlpha=a; c.fillStyle=col; for(let i=0;i<5;i++){ c.beginPath(); c.arc(x+rand(-r,r)*0.6,y+rand(-r,r)*0.6,r*rand(0.3,0.7),0,TAU); c.fill(); } c.restore(); }
function mapCross(c,x,y,h,body){ const w=h*0.13;
  c.fillStyle=MAP_SH; c.beginPath(); c.ellipse(x+5,y+4,h*0.32,h*0.12,0,0,TAU); c.fill();
  c.fillStyle='#211a17'; c.beginPath(); c.ellipse(x,y+2,h*0.26,h*0.1,0,0,TAU); c.fill();
  c.fillStyle='#3a2c1e'; c.fillRect(x-w/2,y-h,w,h+3); c.fillRect(x-h*0.3,y-h*0.76,h*0.6,w*0.85);
  c.strokeStyle='#120d08'; c.lineWidth=1.3; c.strokeRect(x-w/2,y-h,w,h+3); c.strokeRect(x-h*0.3,y-h*0.76,h*0.6,w*0.85);
  c.fillStyle='rgba(255,220,170,.08)'; c.fillRect(x-w/2,y-h,1.5,h);
  if(body){ c.fillStyle='#2c1f1c'; c.beginPath(); c.ellipse(x,y-h*0.58,w*0.62,h*0.2,0,0,TAU); c.fill(); c.fillRect(x-h*0.27,y-h*0.73,h*0.54,w*0.4);
    c.beginPath(); c.arc(x,y-h*0.83,w*0.45,0,TAU); c.fill(); } }
const MAP_STYLE={
  sandbag(c,g){ const r=g.r, P=g.pts; mapShadowPath(c,P,r*2+4,6,9);
    c.lineCap='round'; c.lineJoin='round'; c.save(); c.translate(0,5); c.strokeStyle='#221e15'; c.lineWidth=r*2+2; mapPath(c,P); c.stroke(); c.restore();
    c.strokeStyle='#363022'; c.lineWidth=r*2; mapPath(c,P); c.stroke();
    const bag=(x,y,a,len,wd,col)=>{ c.save(); c.translate(x,y); c.rotate(a); c.fillStyle=col; c.beginPath(); c.ellipse(0,0,len/2,wd/2,0,0,TAU); c.fill();
      c.strokeStyle='rgba(18,15,9,.9)'; c.lineWidth=1.2; c.stroke(); c.strokeStyle='rgba(255,240,200,.08)'; c.beginPath(); c.ellipse(-1,-1,len/2-3,Math.max(1,wd/2-3),0,Math.PI*1.05,Math.PI*1.65); c.stroke(); c.restore(); };
    const cols=['#58503a','#4f4832','#5e563d','#4a4430'];
    for(const ln of [-1,1]) mapWalk(P,22,(x,y,a)=>bag(x-Math.sin(a)*ln*r*0.45,y+Math.cos(a)*ln*r*0.45,a,25,r*0.95,pick(cols)),ln>0?11:2);
    mapWalk(P,24,(x,y,a)=>bag(x,y-3,a,23,r*0.8,pick(['#665e44','#5f573e'])),8); },
  wire(c,g){ const P=g.pts, r=g.r;
    mapShadowPath(c,P,r*1.3,4,7);
    mapWalk(P,46,(x,y,a)=>{ c.strokeStyle='#2c2217'; c.lineWidth=3.5; for(const s of [-1,1]){ const b=a+s*0.95; c.beginPath(); c.moveTo(x+Math.cos(b)*r*1.15,y+Math.sin(b)*r*1.15); c.lineTo(x-Math.cos(b)*r*1.15,y-Math.sin(b)*r*1.15); c.stroke(); } },6);
    c.strokeStyle='rgba(120,116,106,.7)'; c.lineWidth=1;
    mapWalk(P,6,(x,y,a)=>{ c.save(); c.translate(x,y); c.rotate(a+rand(-0.15,0.15)); c.beginPath(); c.ellipse(0,0,4,r*0.85,0,0,TAU); c.stroke(); c.restore(); });
    c.fillStyle='rgba(165,155,140,.75)'; mapWalk(P,7,(x,y,a)=>{ const s=rand(-1,1)*r*0.8; c.fillRect(x-Math.sin(a)*s-1,y+Math.cos(a)*s-1,2,2); }); },
  stone(c,g){ const r=g.r, P=g.pts; mapShadowPath(c,P,r*2+6,6,10);
    c.lineCap='round'; c.lineJoin='round'; c.save(); c.translate(0,7); c.strokeStyle='#17151c'; c.lineWidth=r*2+2; mapPath(c,P); c.stroke(); c.restore();
    c.strokeStyle='#302d37'; c.lineWidth=r*2; mapPath(c,P); c.stroke(); c.strokeStyle='#3a3642'; c.lineWidth=r*2-7; mapPath(c,P); c.stroke();
    c.strokeStyle='rgba(9,8,12,.8)'; c.lineWidth=1.4; mapPath(c,P); c.stroke(); let n=0;
    mapWalk(P,19,(x,y,a)=>{ const h=(n++%2)?1:-1; c.beginPath(); c.moveTo(x,y); c.lineTo(x-Math.sin(a)*h*(r-1),y+Math.cos(a)*h*(r-1)); c.stroke(); },9);
    c.fillStyle='rgba(70,90,60,.12)'; mapWalk(P,9,(x,y)=>{ if(Math.random()<0.4){ c.beginPath(); c.arc(x+rand(-r,r)*0.7,y+rand(-r,r)*0.7,rand(2,5),0,TAU); c.fill(); } }); },
  pillar(c,g){ const {x,y,r}=g; c.fillStyle=MAP_SH; c.beginPath(); c.ellipse(x+7,y+10,r*1.2,r*1.05,0,0,TAU); c.fill();
    const oct=(cx0,cy0,R)=>{ c.beginPath(); for(let i=0;i<8;i++){ const a=i/8*TAU+Math.PI/8; c.lineTo(cx0+Math.cos(a)*R,cy0+Math.sin(a)*R); } c.closePath(); };
    c.fillStyle='#1c1922'; oct(x,y+5,r*1.18); c.fill(); c.fillStyle='#2b2832'; oct(x,y,r*1.18); c.fill(); c.strokeStyle='#110f15'; c.lineWidth=1.5; c.stroke();
    const gr=c.createRadialGradient(x-r*0.35,y-r*0.4,r*0.1,x,y,r); gr.addColorStop(0,'#575260'); gr.addColorStop(1,'#29262f'); c.fillStyle=gr; c.beginPath(); c.arc(x,y,r*0.95,0,TAU); c.fill();
    c.strokeStyle='rgba(0,0,0,.35)'; c.lineWidth=1; for(let i=0;i<14;i++){ const a=i/14*TAU; c.beginPath(); c.moveTo(x+Math.cos(a)*r*0.6,y+Math.sin(a)*r*0.6); c.lineTo(x+Math.cos(a)*r*0.92,y+Math.sin(a)*r*0.92); c.stroke(); }
    c.strokeStyle='#131118'; c.lineWidth=2; c.beginPath(); c.arc(x,y,r*0.95,0,TAU); c.stroke(); c.strokeStyle='rgba(255,255,255,.07)'; c.beginPath(); c.arc(x,y,r*0.55,0,TAU); c.stroke(); },
  sarco(c,g){ const {x,y,a,len,r}=g, hl=len/2+r*0.8, hw=r+2;
    mapRect(c,x+6,y+9,a,hl,hw,MAP_SH); mapRect(c,x,y+5,a,hl,hw,'#1b1820'); mapRect(c,x,y,a,hl,hw,'#2e2a35','#110f15',1.5); mapRect(c,x,y,a,hl-4,hw-4,'#3a3642');
    c.save(); c.translate(x,y); c.rotate(a); c.fillStyle='#4a4553'; c.fillRect(-hl+10,-1.5,hl*2-20,3); c.fillRect(-hl*0.45,-hw+7,3,hw*2-14);
    c.fillStyle='rgba(0,0,0,.3)'; c.fillRect(hl*0.2,-hw+6,hl*0.5,1); c.fillRect(hl*0.2,hw-8,hl*0.4,1); c.restore(); },
  bones(c,g){ const {x,y,r}=g; c.fillStyle=MAP_SH; c.beginPath(); c.ellipse(x+4,y+6,r*1.1,r*0.8,0,0,TAU); c.fill();
    c.fillStyle='#1e1a17'; c.beginPath(); c.ellipse(x,y+2,r,r*0.75,0,0,TAU); c.fill(); c.lineCap='round';
    for(let i=0;i<9;i++){ const a=rand(0,TAU), d=rand(0,r*0.7), bx=x+Math.cos(a)*d, by=y+Math.sin(a)*d*0.7, b=rand(0,TAU), l=rand(5,9);
      c.strokeStyle=pick(['#6a6356','#5e584c','#746c5e']); c.lineWidth=2.5; c.beginPath(); c.moveTo(bx-Math.cos(b)*l,by-Math.sin(b)*l); c.lineTo(bx+Math.cos(b)*l,by+Math.sin(b)*l); c.stroke(); }
    for(let i=0;i<2;i++){ const sx=x+rand(-r,r)*0.4, sy=y+rand(-r,r)*0.3; c.fillStyle='#7a7264'; c.beginPath(); c.arc(sx,sy,5,0,TAU); c.fill(); c.fillStyle='#141210'; c.fillRect(sx-3,sy-1,2,2); c.fillRect(sx+1,sy-1,2,2); } },
  bed(c,g){ const {x,y,a,len,r}=g, hl=len/2+r*0.75, hw=r+1, ca=Math.cos(a), sa=Math.sin(a);
    mapRect(c,x+6,y+9,a,hl,hw,MAP_SH); mapRect(c,x,y+4,a,hl,hw,'#141618'); mapRect(c,x,y,a,hl,hw,'#262a2c','#0f1112',1.6);
    mapRect(c,x,y,a,hl-3,hw-3,'#57544c'); mapRect(c,x+ca*6,y+sa*6,a,hl-9,hw-3,'#615d53');
    mapRect(c,x-ca*(hl-9),y-sa*(hl-9),a,5,hw-6,'#6e6a60','rgba(0,0,0,.35)',1);
    c.save(); c.translate(x,y); c.rotate(a); c.strokeStyle='rgba(0,0,0,.22)'; c.lineWidth=1; for(let i=0;i<3;i++){ c.beginPath(); c.moveTo(-hl*0.3+i*hl*0.35,-hw+4); c.lineTo(-hl*0.2+i*hl*0.35,hw-4); c.stroke(); }
    if(Math.random()<0.5){ c.fillStyle='rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(hl*0.1,0,hl*0.55,hw*0.45,0,0,TAU); c.fill(); }
    c.restore(); if(Math.random()<0.6) mapStain(c,x+ca*rand(-10,20),y+sa*rand(-10,20),rand(5,10),'#4a1310',0.75); },
  screen(c,g){ const P=g.pts; mapShadowPath(c,P,10,5,8); c.lineCap='butt'; c.lineJoin='miter';
    c.save(); c.translate(0,6); c.strokeStyle='#15120e'; c.lineWidth=8; mapPath(c,P); c.stroke(); c.restore();
    for(let i=0;i<P.length-1;i++){ const a=P[i], b=P[i+1]; mapRect(c,(a[0]+b[0])/2,(a[1]+b[1])/2,Math.atan2(b[1]-a[1],b[0]-a[0]),Math.hypot(b[0]-a[0],b[1]-a[1])/2,4.5,i%2?'#5f584a':'#4a4438','#1c1813',1.4); }
    c.fillStyle='#17130f'; for(const p of P){ c.beginPath(); c.arc(p[0],p[1],3,0,TAU); c.fill(); }
    if(Math.random()<0.6){ const p=pick(P); mapStain(c,p[0],p[1],4,'#4a1310',0.6); } },
  cabinet(c,g){ const {x,y}=g; mapRect(c,x+6,y+9,0,21,14,MAP_SH); mapRect(c,x,y+6,0,21,14,'#151a17'); mapRect(c,x,y,0,21,14,'#2c3430','#0d100e',1.5);
    mapRect(c,x-10,y,0,8,10,'#1b2524'); mapRect(c,x+10,y,0,8,10,'#1b2524'); c.fillStyle='rgba(180,220,210,.12)'; c.fillRect(x-17,y-9,3,8); c.fillRect(x+3,y-9,3,8);
    for(let i=0;i<4;i++){ c.fillStyle=pick(['#3a5a4a','#5a4a2a','#4a2a2a']); c.fillRect(x-14+i*8,y+2,3,5); } },
  optable(c,g){ const {x,y,a,len,r}=g, hl=len/2+r*0.7, hw=r;
    mapRect(c,x+6,y+9,a,hl,hw,MAP_SH); mapRect(c,x,y+5,a,hl,hw,'#1a1d20'); mapRect(c,x,y,a,hl,hw,'#3a4044','#121416',1.6); mapRect(c,x,y,a,hl-4,hw-4,'#474e53');
    c.save(); c.translate(x,y); c.rotate(a); c.fillStyle='#1c1e20'; for(const s of [-0.45,0.15])c.fillRect(hl*s*2,-hw+2,5,hw*2-4); c.fillStyle='#0c0d0e'; c.beginPath(); c.arc(hl-9,0,2.5,0,TAU); c.fill(); c.restore();
    mapStain(c,x,y,rand(7,11),'#4e0f0d',0.8); },
  lamp(c,g){ const {x,y,r}=g; c.fillStyle=MAP_SH; c.beginPath(); c.arc(x+5,y+7,r,0,TAU); c.fill(); c.strokeStyle='#1a1a1a'; c.lineWidth=2.5;
    for(let i=0;i<3;i++){ const a=i/3*TAU+0.5; c.beginPath(); c.moveTo(x,y); c.lineTo(x+Math.cos(a)*r*1.1,y+Math.sin(a)*r*1.1); c.stroke(); }
    c.fillStyle='#4a4c48'; c.beginPath(); c.arc(x,y,r*0.62,0,TAU); c.fill(); c.fillStyle='#b8c4b8'; c.beginPath(); c.arc(x,y,r*0.32,0,TAU); c.fill(); },
  bench(c,g){ const {x,y,a,len,r}=g, hl=len/2+r*0.7, hw=r+1, ca=Math.cos(a), sa=Math.sin(a);
    mapRect(c,x+6,y+10,a,hl,hw,MAP_SH); mapRect(c,x,y+6,a,hl,hw,'#1e130b'); mapRect(c,x,y,a,hl,hw,'#432b1c','#140c07',1.6);
    c.save(); c.translate(x,y); c.rotate(a); for(let i=-hl+9;i<hl;i+=9){ c.fillStyle=Math.random()<0.5?'rgba(0,0,0,.12)':'rgba(255,210,170,.03)'; c.fillRect(i,-hw+2,8,hw*2-4); }
    c.strokeStyle='rgba(0,0,0,.35)'; c.lineWidth=1; c.beginPath(); c.moveTo(-hl+3,0); c.lineTo(hl-3,0); c.stroke();
    c.fillStyle='#6a7076'; c.fillRect(hl*0.35,-hw+4,16,9); c.fillStyle='#24160c'; c.fillRect(hl*0.35-10,-hw+7,10,3); c.restore();
    for(let i=0;i<3;i++) mapStain(c,x+ca*rand(-hl,hl)*0.7,y+sa*rand(-hl,hl)*0.7,rand(4,8),'#560d0b',0.7);
    if(Math.random()<0.6){ c.fillStyle='#702622'; c.beginPath(); c.ellipse(x-ca*hl*0.3,y-sa*hl*0.3,9,6,a,0,TAU); c.fill(); c.fillStyle='rgba(220,180,160,.25)'; c.fillRect(x-ca*hl*0.3-3,y-sa*hl*0.3-2,6,2); } },
  hooks(c,g){ const cs=g.obs, a=cs[0], b=cs[cs.length-1], y=g.y;
    for(const o of cs){ c.fillStyle=MAP_SH; c.beginPath(); c.ellipse(o.x+6,o.y+10,o.r*0.9,o.r*1.25,0,0,TAU); c.fill(); }
    for(const o of cs){ const sw=rand(-0.15,0.15); c.save(); c.translate(o.x,o.y+4); c.rotate(sw);
      c.fillStyle='#5e1f1a'; c.beginPath(); c.ellipse(0,0,o.r*0.78,o.r*1.25,0,0,TAU); c.fill(); c.strokeStyle='#2a0a08'; c.lineWidth=1.5; c.stroke();
      c.fillStyle='#8e4e42'; c.beginPath(); c.ellipse(-o.r*0.2,-o.r*0.1,o.r*0.32,o.r*0.95,0,0,TAU); c.fill();
      c.strokeStyle='rgba(40,8,6,.7)'; c.lineWidth=1.3; for(let i=-2;i<=2;i++){ c.beginPath(); c.moveTo(-o.r*0.6,i*o.r*0.32); c.quadraticCurveTo(0,i*o.r*0.32+3,o.r*0.6,i*o.r*0.32); c.stroke(); }
      c.restore(); c.strokeStyle='#777b80'; c.lineWidth=1.6; c.beginPath(); c.moveTo(o.x,y-o.r*1.2); c.lineTo(o.x,y-o.r*0.9); c.arc(o.x+2.5,y-o.r*0.9,2.5,Math.PI,0,true); c.stroke(); }
    c.fillStyle='rgba(0,0,0,.35)'; c.fillRect(a.x-30,y-a.r*1.2+5,b.x-a.x+60,3);
    c.fillStyle='#1b1b1f'; c.fillRect(a.x-30,y-a.r*1.2-2,b.x-a.x+60,4); c.fillStyle='#3c3c43'; c.fillRect(a.x-30,y-a.r*1.2-2,b.x-a.x+60,1);
    c.fillStyle='#121215'; c.fillRect(a.x-34,y-a.r*1.2-5,8,10); c.fillRect(b.x+26,y-a.r*1.2-5,8,10); },
  cauldron(c,g){ const {x,y,r}=g; c.fillStyle=MAP_SH; c.beginPath(); c.ellipse(x+7,y+10,r*1.15,r*1.05,0,0,TAU); c.fill();
    for(let i=0;i<5;i++){ const a=i/5*TAU+rand(-0.3,0.3); mapRect(c,x+Math.cos(a)*r*0.95,y+Math.sin(a)*r*0.95,a,r*0.45,3.5,'#24160d'); c.fillStyle='rgba(230,110,40,.55)'; c.beginPath(); c.arc(x+Math.cos(a)*r*1.35,y+Math.sin(a)*r*1.35,2.2,0,TAU); c.fill(); }
    c.fillStyle='#111012'; c.beginPath(); c.arc(x,y+6,r,0,TAU); c.fill();
    const gr=c.createRadialGradient(x-r*0.4,y-r*0.4,r*0.2,x,y,r); gr.addColorStop(0,'#3a3537'); gr.addColorStop(1,'#141214'); c.fillStyle=gr; c.beginPath(); c.arc(x,y,r,0,TAU); c.fill();
    c.strokeStyle='#454042'; c.lineWidth=4; c.beginPath(); c.arc(x,y,r-3,0,TAU); c.stroke();
    c.fillStyle='#380a09'; c.beginPath(); c.arc(x,y,r*0.74,0,TAU); c.fill(); c.fillStyle='rgba(120,30,20,.45)'; c.beginPath(); c.ellipse(x-r*0.2,y-r*0.25,r*0.35,r*0.18,-0.4,0,TAU); c.fill();
    c.strokeStyle='#5a1712'; c.lineWidth=1.2; for(let i=0;i<4;i++){ c.beginPath(); c.arc(x+rand(-r,r)*0.45,y+rand(-r,r)*0.45,rand(2,5),0,TAU); c.stroke(); }
    c.strokeStyle='#2a2628'; c.lineWidth=3; for(const s of [-1,1]){ c.beginPath(); c.arc(x+s*r*1.02,y,5,s>0?-Math.PI/2:Math.PI/2,s>0?Math.PI/2:Math.PI*1.5); c.stroke(); } },
  rock(c,g){ const cs=g.obs; for(const o of cs){ const n=randInt(7,9), a0=rand(0,TAU); o.poly=[]; for(let i=0;i<n;i++)o.poly.push([a0+i/n*TAU+rand(-0.2,0.2),rand(0.92,1.12)]); }
    const path=(ox,oy,grow)=>{ c.beginPath(); for(const o of cs){ o.poly.forEach(([a,k],i)=>{ const x=o.x+ox+Math.cos(a)*(o.r*k+grow), y=o.y+oy+Math.sin(a)*(o.r*k+grow); i?c.lineTo(x,y):c.moveTo(x,y); }); c.closePath(); } };
    c.fillStyle=MAP_SH; path(7,10,1); c.fill();
    c.fillStyle='#0c090c'; path(0,8,1.5); c.fill(); c.fillStyle='#19141a'; path(0,7,0); c.fill();
    c.fillStyle='#0c090c'; path(0,0,1.5); c.fill(); c.fillStyle='#2a2329'; path(0,0,0); c.fill();
    for(const o of cs){ const p=o.poly, n=p.length; for(let i=0;i<n;i++){ const [a1,k1]=p[i], [a2,k2]=p[(i+1)%n], lit=Math.cos((a1+a2)/2+2.4);   // Facetten: oben links heller
      c.fillStyle=lit>0?'rgba(150,130,140,'+(lit*0.12).toFixed(3)+')':'rgba(0,0,0,'+(-lit*0.22).toFixed(3)+')'; c.beginPath(); c.moveTo(o.x+Math.cos(a1)*o.r*0.25,o.y+Math.sin(a1)*o.r*0.25);
      c.lineTo(o.x+Math.cos(a1)*o.r*k1,o.y+Math.sin(a1)*o.r*k1); c.lineTo(o.x+Math.cos(a2)*o.r*k2,o.y+Math.sin(a2)*o.r*k2); c.closePath(); c.fill(); } }
    c.strokeStyle='rgba(8,6,8,.7)'; c.lineWidth=1.3; for(const o of cs){ if(Math.random()<0.6){ let px=o.x+rand(-o.r,o.r)*0.5, py=o.y+rand(-o.r,o.r)*0.5; c.beginPath(); c.moveTo(px,py); for(let i=0;i<3;i++){ px+=rand(-9,9); py+=rand(-9,9); c.lineTo(px,py); } c.stroke(); } }
    c.fillStyle='rgba(150,140,140,.18)'; for(const o of cs)for(let i=0;i<o.r/3;i++){ const a=rand(0,TAU), d=rand(0,o.r*0.85); c.fillRect(o.x+Math.cos(a)*d,o.y+Math.sin(a)*d,1.5,1.5); }
    if(g.altar){ const o=cs[0]; mapRect(c,o.x,o.y,0,o.r*0.75,o.r*0.45,'#3a3236','#120e10',1.4); mapStain(c,o.x,o.y,6,'#5a0e0c',0.8); c.fillStyle='#d8cdb8'; c.fillRect(o.x-o.r*0.6,o.y-o.r*0.4,2,5); c.fillRect(o.x+o.r*0.55,o.y-o.r*0.4,2,5); }
    if(g.crosses){ const o=cs[0]; for(let i=0;i<g.crosses;i++){ const dx=(i-(g.crosses-1)/2)*o.r*0.7; mapCross(c,o.x+dx,o.y+Math.abs(dx)*0.25,i===1?62:48,true); } } },
  cross(c,g){ mapCross(c,g.x,g.y+g.r*0.3,rand(40,52),Math.random()<0.3); },
};
/* Gruppe einmal in eine eigene kleine Canvas zeichnen */
function mapBake(g){ let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; for(const o of g.obs){ x0=Math.min(x0,o.x-o.r); y0=Math.min(y0,o.y-o.r); x1=Math.max(x1,o.x+o.r); y1=Math.max(y1,o.y+o.r); }
  const pad=g.style==='hooks'?44:g.style==='bench'||g.style==='bed'||g.style==='optable'||g.style==='sarco'?30:22, top=g.style==='cross'?60:g.crosses?78:0;
  g.bx=Math.floor(x0-pad); g.by=Math.floor(y0-pad-top); g.bw=Math.ceil(x1-x0+pad*2); g.bh=Math.ceil(y1-y0+pad*2+top);
  const cv=document.createElement('canvas'); cv.width=g.bw; cv.height=g.bh; const c=cv.getContext('2d'); c.translate(-g.bx,-g.by);
  (MAP_STYLE[g.style]||MAP_STYLE.rock)(c,g); g.img=cv; }
/* Ersatz für die Zeile in renderGame: Gruppenbilder (nur sichtbare), dann übrige Hindernisse */
function drawMapObstacles(){ const own=MAP.obsRef===obstacles, x0=cam.x-80, x1=cam.x+W+80, y0=cam.y-80, y1=cam.y+H+80, m=cx.getTransform(), al=m.a===1&&m.d===1;
  const fx=al?m.e-Math.round(m.e):0, fy=al?m.f-Math.round(m.f):0;   // auf ganze Bildschirmpixel ausrichten (kein Resampling)
  if(own) for(const g of MAP.groups){ if(!g.img||g.bx>x1||g.by>y1||g.bx+g.bw<x0||g.by+g.bh<y0)continue; const ix0=Math.max(g.bx,Math.floor(cam.x-30)), iy0=Math.max(g.by,Math.floor(cam.y-30)), iw=Math.min(g.bx+g.bw,Math.ceil(cam.x+W+30))-ix0, ih=Math.min(g.by+g.bh,Math.ceil(cam.y+H+30))-iy0;
    if(iw>0&&ih>0) cx.drawImage(g.img,ix0-g.bx,iy0-g.by,iw,ih,ix0-fx,iy0-fy,iw,ih); if(g.style==='cauldron')mapCauldronLive(g); }
  for(const ob of obstacles){ if(own&&ob.grp!=null)continue; if(ob.x<x0||ob.x>x1||ob.y<y0||ob.y>y1)continue; if(ob.brk)drawBreakable(ob); else drawObstacle(ob); } }
function mapCauldronLive(g){ const t=G.uiTime, f=0.5+Math.sin(t*9+g.x)*0.25+Math.sin(t*23+g.y)*0.15;
  cx.save(); cx.globalAlpha=0.16+f*0.12; cx.fillStyle='#e07a2f'; cx.beginPath(); cx.ellipse(g.x,g.y+g.r*0.85,g.r*1.05,g.r*0.35,0,0,TAU); cx.fill();
  cx.globalAlpha=0.5; cx.strokeStyle='#7a2018'; cx.lineWidth=1.2; const k=(t*1.3+g.x*0.01)%1; cx.beginPath(); cx.arc(g.x+Math.sin(g.y+Math.floor(t*1.3))*g.r*0.3,g.y+Math.cos(g.x+Math.floor(t*1.3))*g.r*0.3,1+k*5,0,TAU); cx.stroke(); cx.restore(); }
function drawBreakable(ob){ const x=ob.x, y=ob.y, r=ob.r, hit=G.uiTime-(ob.hitAt||-9)<0.12, wob=hit?Math.sin(G.uiTime*70)*1.6:0, dmg=1-ob.hp/ob.maxHp;
  cx.save(); cx.translate(x+wob,y); cx.fillStyle=MAP_SH; cx.beginPath(); cx.ellipse(5,8,r*1.05,r*0.85,0,0,TAU); cx.fill();
  if(ob.type==='barrel'){ cx.fillStyle='#211d10'; cx.beginPath(); cx.arc(0,5,r,0,TAU); cx.fill(); cx.fillStyle='#43391f'; cx.beginPath(); cx.arc(0,0,r,0,TAU); cx.fill();
    cx.strokeStyle='rgba(0,0,0,.4)'; cx.lineWidth=1; for(let i=0;i<8;i++){ const a=i/8*TAU+ob.seed; cx.beginPath(); cx.moveTo(Math.cos(a)*r*0.3,Math.sin(a)*r*0.3); cx.lineTo(Math.cos(a)*r,Math.sin(a)*r); cx.stroke(); }
    cx.strokeStyle='#17140c'; cx.lineWidth=2.5; cx.beginPath(); cx.arc(0,0,r-1.5,0,TAU); cx.stroke(); cx.beginPath(); cx.arc(0,0,r*0.55,0,TAU); cx.stroke();
    const p=0.5+Math.sin(G.uiTime*3+ob.seed)*0.5; cx.fillStyle='rgba(140,190,50,'+(0.45+p*0.25)+')'; cx.beginPath(); cx.ellipse(-1,-1,r*0.45,r*0.35,ob.seed,0,TAU); cx.fill();
    cx.fillStyle='rgba(155,191,58,'+(0.06+p*0.06)+')'; cx.beginPath(); cx.arc(0,0,r*2,0,TAU); cx.fill(); }
  else if(ob.type==='poorbox'){ cx.fillStyle='#1e130b'; cx.fillRect(-r,-r*0.8+5,r*2,r*1.6); cx.fillStyle='#4e331c'; cx.fillRect(-r,-r*0.8,r*2,r*1.6); cx.strokeStyle='#120b06'; cx.lineWidth=1.5; cx.strokeRect(-r,-r*0.8,r*2,r*1.6);
    cx.fillStyle='#2a2a30'; cx.fillRect(-r,-r*0.8,3,r*1.6); cx.fillRect(r-3,-r*0.8,3,r*1.6); cx.fillStyle='#0a0705'; cx.fillRect(-r*0.45,-2,r*0.9,3);
    cx.fillStyle='#8a6a3a'; cx.fillRect(-1,-r*0.7,2,7); cx.fillRect(-3.5,-r*0.55,7,2);
    const p=0.5+Math.sin(G.uiTime*4+ob.seed)*0.5; cx.fillStyle='rgba(224,178,90,'+(0.25+p*0.45)+')'; cx.beginPath(); cx.arc(r*0.35,-r*0.4,1.8,0,TAU); cx.fill(); }
  else { cx.fillStyle='#1c130a'; cx.fillRect(-r,-r+5,r*2,r*2); cx.fillStyle='#4a3420'; cx.fillRect(-r,-r,r*2,r*2); cx.strokeStyle='#160e07'; cx.lineWidth=1.6; cx.strokeRect(-r,-r,r*2,r*2);
    cx.strokeStyle='rgba(0,0,0,.35)'; cx.lineWidth=1; for(let i=1;i<4;i++){ cx.beginPath(); cx.moveTo(-r,-r+i*r/2); cx.lineTo(r,-r+i*r/2); cx.stroke(); }
    cx.strokeStyle='#2e1f12'; cx.lineWidth=3; cx.beginPath(); cx.moveTo(-r+2,-r+2); cx.lineTo(r-2,r-2); cx.moveTo(r-2,-r+2); cx.lineTo(-r+2,r-2); cx.stroke(); }
  if(dmg>0){ cx.strokeStyle='rgba(0,0,0,.75)'; cx.lineWidth=1.3; for(let i=0;i<Math.ceil(dmg*4);i++){ const a=ob.seed+i*2.1; cx.beginPath(); cx.moveTo(Math.cos(a)*r*0.15,Math.sin(a)*r*0.15); cx.lineTo(Math.cos(a+0.3)*r*0.55,Math.sin(a+0.3)*r*0.55); cx.lineTo(Math.cos(a)*r*0.95,Math.sin(a)*r*0.95); cx.stroke(); } }
  if(hit){ cx.globalAlpha=0.45; cx.fillStyle='#fff'; cx.beginPath(); cx.arc(0,0,r,0,TAU); cx.fill(); }
  cx.restore(); }

/* =========================================================================
   BODEN + RAND je Region (einmal pro Station vorgezeichnet)
   ========================================================================= */
function mapNoise(c,n,cols,r0,r1,a0,a1){ for(let i=0;i<n;i++) mapSoft(c,rand(ROOM.x,ROOM.x+ROOM.w),rand(ROOM.y,ROOM.y+ROOM.h),rand(r0,r1)*1.4,pick(cols),rand(a0,a1)); }
function mapSpeck(c,n,cols,s0,s1,a){ c.globalAlpha=a; for(let i=0;i<n;i++){ c.fillStyle=pick(cols); const s=rand(s0,s1); c.fillRect(rand(ROOM.x,ROOM.x+ROOM.w),rand(ROOM.y,ROOM.y+ROOM.h),s,s); } c.globalAlpha=1; }
function mapSoft(c,x,y,r,col,a){ const g=c.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,col); g.addColorStop(1,'rgba(0,0,0,0)'); c.globalAlpha=a; c.fillStyle=g; c.fillRect(x-r,y-r,r*2,r*2); c.globalAlpha=1; }
const mapRP=(m)=>[rand(ROOM.x+(m||0),ROOM.x+ROOM.w-(m||0)),rand(ROOM.y+(m||0),ROOM.y+ROOM.h-(m||0))];
function mapTiles(c,sz,grout,fn){ c.fillStyle=grout; c.fillRect(ROOM.x,ROOM.y,ROOM.w,ROOM.h); for(let y=ROOM.y;y<ROOM.y+ROOM.h;y+=sz)for(let x=ROOM.x;x<ROOM.x+ROOM.w;x+=sz){ c.fillStyle=fn(x,y); c.fillRect(x+1,y+1,Math.min(sz,ROOM.x+ROOM.w-x)-2,Math.min(sz,ROOM.y+ROOM.h-y)-2); } }
function mapBones(c,n){ c.lineCap='round'; for(let i=0;i<n;i++){ const [x,y]=mapRP(10), a=rand(0,TAU), l=rand(4,9); c.strokeStyle=pick(['rgba(110,100,86,.55)','rgba(90,82,70,.5)']); c.lineWidth=2.2; c.beginPath(); c.moveTo(x-Math.cos(a)*l,y-Math.sin(a)*l); c.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l); c.stroke();
  if(Math.random()<0.25){ c.fillStyle='rgba(118,110,96,.6)'; c.beginPath(); c.arc(x+8,y+3,4.5,0,TAU); c.fill(); c.fillStyle='rgba(10,8,8,.8)'; c.fillRect(x+5.5,y+2,2,2); c.fillRect(x+8.5,y+2,2,2); } } }
/* Saum um den Raum (40 px Weltrand) füllen; danach Elemente entlang der vier Seiten */
function mapMargin(c,col){ const R=ROOM; c.fillStyle=col; c.fillRect(0,0,WORLD.w,R.y); c.fillRect(0,R.y+R.h,WORLD.w,WORLD.h-R.y-R.h); c.fillRect(0,0,R.x,WORLD.h); c.fillRect(R.x+R.w,0,WORLD.w-R.x-R.w,WORLD.h); }
function mapRim(c,step,fn){ const R=ROOM, o=-20; const P=[[R.x+o,R.y+o],[R.x+R.w-o,R.y+o],[R.x+R.w-o,R.y+R.h-o],[R.x+o,R.y+R.h-o],[R.x+o,R.y+o]]; mapWalk(P,step,fn,step/2); }
function mapLight(x,y,r,col,a,live){ MAP.lights.push({x,y,r,col,a}); if(live)MAP.live.push({k:live,x,y}); }
const MAP_FLOOR=[
  /* Gräben: Matsch, Fahrspuren, Granattrichter, Wasserlachen, Laufplanken; Rand: Erdwall mit Sandsäcken */
  function(c){ const R=ROOM, A=R.w*R.h;
    c.fillStyle='#181a12'; c.fillRect(R.x,R.y,R.w,R.h);
    mapNoise(c,A/6500,['#1f2117','#12140d','#22241a','#16180f'],25,95,0.35,0.7); mapSpeck(c,A/300,['#2a2b1e','#0b0c08','#25261a'],1,3,0.6);
    c.lineCap='round'; for(let i=0;i<4+A/180000;i++){ let [x,y]=mapRP(), a=rand(0,TAU); c.strokeStyle='rgba(6,7,4,.4)'; c.lineWidth=rand(3,6); c.beginPath(); c.moveTo(x,y); for(let k=0;k<8;k++){ a+=rand(-0.3,0.3); x+=Math.cos(a)*40; y+=Math.sin(a)*40; c.lineTo(x,y); } c.stroke(); }
    for(let i=0;i<2+A/300000;i++){ const [x,y]=mapRP(60), r=rand(40,75); mapSoft(c,x,y,r,'#080906',0.55);
      for(let k=0;k<14;k++){ const a=k/14*TAU+rand(-0.2,0.2); mapSoft(c,x+Math.cos(a)*r*0.85,y+Math.sin(a)*r*0.85,rand(8,16),'#2c2e20',0.35); } mapStain(c,x,y+r*0.1,r*0.28,'#0a0d0e',0.6); }
    for(let i=0;i<3+A/300000;i++){ const [x,y]=mapRP(40), w=rand(30,70); c.fillStyle='#0b1012'; for(let k=0;k<4;k++){ c.beginPath(); c.ellipse(x+rand(-w,w)*0.5,y+rand(-w,w)*0.25,w*rand(0.4,0.7),w*rand(0.2,0.35),0,0,TAU); c.fill(); }
      c.strokeStyle='rgba(140,160,170,.09)'; c.lineWidth=1.5; c.beginPath(); c.ellipse(x,y-2,w*0.5,w*0.18,0,Math.PI*1.1,Math.PI*1.9); c.stroke(); }
    for(let i=0;i<1+A/1500000;i++){ let [x,y]=mapRP(60), a=rand(0,TAU); const P=[[x,y]]; for(let k=0;k<4;k++){ a+=rand(-0.6,0.6); x=clamp(x+Math.cos(a)*rand(120,220),R.x+30,R.x+R.w-30); y=clamp(y+Math.sin(a)*rand(120,220),R.y+30,R.y+R.h-30); P.push([x,y]); }
      mapShadowPath(c,P,36,3,5); mapWalk(P,13,(px,py,an)=>{ mapRect(c,px,py,an+Math.PI/2,17,5,pick(['#3a2f20','#32291b','#2c2418']),'rgba(0,0,0,.55)',1); }); }
    mapBones(c,A/90000);
    for(let i=0;i<A/150000;i++){ const [x,y]=mapRP(20); c.fillStyle='#2a2619'; c.beginPath(); c.arc(x,y,6,0,TAU); c.fill(); c.strokeStyle='#3e3a27'; c.lineWidth=1.5; c.stroke(); }
    mapMargin(c,'#14150f');
    mapRim(c,22,(x,y,a)=>{ for(const s of [-1,1]){ mapRect(c,x-Math.sin(a)*s*8,y+Math.cos(a)*s*8,a,11.5,6.5,pick(['#4f4832','#585038','#463f2b']),'rgba(14,12,8,.9)',1.1); } });
    for(let i=0;i<2+A/600000;i++){ const [x,y]=mapRP(80); mapLight(x,y,120,'rgba(255,190,110,1)',0.09,'lantern'); } },
  /* Katakomben: Steinplatten mit Fugen, Grabplatten, Staub, Knochen, Kerzen; Rand: Ossuarium mit Schädelnischen */
  function(c){ const R=ROOM, A=R.w*R.h;
    c.save(); c.beginPath(); c.rect(R.x,R.y,R.w,R.h); c.clip(); c.fillStyle='#0d0c11'; c.fillRect(R.x,R.y,R.w,R.h);
    for(let y=R.y;y<R.y+R.h;){ const rh=rand(58,86); for(let x=R.x-rand(0,90);x<R.x+R.w;){ const sw=rand(70,150);
        c.fillStyle='hsl(258,7%,'+rand(8.6,10.8).toFixed(1)+'%)'; c.fillRect(x+1,y+1,sw-2,rh-2); c.fillStyle='rgba(255,255,255,.02)'; c.fillRect(x+1,y+1,sw-2,1.5);
        if(Math.random()<0.12){ c.strokeStyle='rgba(0,0,0,.55)'; c.lineWidth=1; c.beginPath(); let px=x+rand(5,sw-5), py=y+2; c.moveTo(px,py); while(py<y+rh-3){ px+=rand(-6,6); py+=rand(5,12); c.lineTo(px,Math.min(py,y+rh-3)); } c.stroke(); }
        if(Math.random()<0.035&&sw>80){ c.strokeStyle='rgba(0,0,0,.4)'; c.lineWidth=1.5; c.strokeRect(x+7,y+6,sw-14,rh-12); c.fillStyle='rgba(0,0,0,.35)'; c.fillRect(x+sw/2-1.5,y+10,3,rh-20); c.fillRect(x+sw/2-8,y+16,16,3); }
        x+=sw; } y+=rh; }
    c.restore();
    mapNoise(c,A/12000,['#000000','#2c2832'],20,70,0.06,0.16); mapSpeck(c,A/500,['#3a3540','#050407'],1,2.5,0.5); mapBones(c,A/45000);
    for(let i=0;i<A/90000;i++){ const [x,y]=mapRP(30), n=randInt(1,3); for(let k=0;k<n;k++){ const px=x+k*7-n*3, py=y+(k%2)*5; c.fillStyle='#6a6050'; c.fillRect(px-2,py-7,4,8); c.fillStyle='rgba(0,0,0,.4)'; c.fillRect(px-3,py+1,6,2); MAP.live.push({k:'candle',x:px,y:py-8}); }
      mapLight(x,y-6,90,'rgba(255,170,90,1)',0.13); }
    mapMargin(c,'#14121a');
    c.fillStyle='#0a090d'; for(let y=0;y<WORLD.h;y+=16){ c.fillRect(0,y,WORLD.w,1.5); }
    mapRim(c,30,(x,y)=>{ c.fillStyle='#0a090d'; c.fillRect(x-1,y-8,2,16); });
    mapRim(c,110,(x,y)=>{ c.fillStyle='#060508'; c.fillRect(x-17,y-12,34,24); for(let k=0;k<3;k++){ const sx=x-10+k*10, sy=y+(k%2?-3:3); c.fillStyle='#5e574a'; c.beginPath(); c.arc(sx,sy,4.5,0,TAU); c.fill(); c.fillStyle='#0b0a08'; c.fillRect(sx-2.5,sy-1,2,2); c.fillRect(sx+0.5,sy-1,2,2); } }); },
  /* Lazarett: Fliesen mit Fugen, Blutflecken und Schleifspuren, Abflüsse, Verbandsreste, kaltes Licht; Rand: gekachelte Wand */
  function(c){ const R=ROOM, A=R.w*R.h;
    mapTiles(c,34,'#0b0a09',()=>'hsl(35,7%,'+rand(10,12.3).toFixed(1)+'%)');
    mapNoise(c,A/9000,['#000000','#2a2620'],30,110,0.06,0.18);
    c.lineCap='round'; for(let i=0;i<2+A/400000;i++){ let [x,y]=mapRP(40), a=rand(0,TAU); c.strokeStyle='rgba(58,16,14,.3)'; c.lineWidth=rand(12,20); c.beginPath(); c.moveTo(x,y); for(let k=0;k<5;k++){ a+=rand(-0.4,0.4); x+=Math.cos(a)*50; y+=Math.sin(a)*50; c.lineTo(x,y); } c.stroke(); }
    for(let i=0;i<A/80000;i++){ const [x,y]=mapRP(20); mapStain(c,x,y,rand(8,22),pick(['#330f0d','#2a0c0a']),rand(0.45,0.7)); for(let k=0;k<5;k++){ c.fillStyle='rgba(60,16,14,.6)'; c.beginPath(); c.arc(x+rand(-40,40),y+rand(-40,40),rand(1,2.5),0,TAU); c.fill(); } }
    for(let i=0;i<2+A/500000;i++){ const [x,y]=mapRP(60); c.fillStyle='#070707'; c.beginPath(); c.arc(x,y,10,0,TAU); c.fill(); c.strokeStyle='#2a2a28'; c.lineWidth=1.5; c.stroke(); c.fillStyle='#1e1e1c'; for(let k=-2;k<=2;k++)c.fillRect(x-7,y+k*3.5-0.7,14,1.4); mapStain(c,x,y,8,'#300c0a',0.5); }
    for(let i=0;i<A/70000;i++){ const [x,y]=mapRP(10); mapRect(c,x,y,rand(0,Math.PI),rand(5,12),1.6,'rgba(110,104,92,.45)'); }
    for(let i=0;i<2+A/450000;i++){ const [x,y]=mapRP(100); mapLight(x,y,rand(150,210),'rgba(170,205,190,1)',0.06); }
    mapMargin(c,'#161a18');
    c.fillStyle='#0a0c0b'; for(let y=0;y<WORLD.h;y+=13)c.fillRect(0,y,WORLD.w,1); for(let x=0;x<WORLD.w;x+=13)c.fillRect(x,0,1,WORLD.h);
    c.strokeStyle='#1f2f26'; c.lineWidth=6; c.strokeRect(R.x-12,R.y-12,R.w+24,R.h+24); },
  /* Schlachthof: blutige Kacheln, Blutlachen und Schmierspuren, Rinnen mit Abfluss, Sägespäne; Rand: Ziegel mit Haken */
  function(c){ const R=ROOM, A=R.w*R.h;
    mapTiles(c,44,'#110907',()=>'hsl(12,24%,'+rand(8.8,10.6).toFixed(1)+'%)');
    mapNoise(c,A/10000,['#000000','#2a1a14'],30,100,0.08,0.2);
    for(let i=0;i<1+A/1200000;i++){ const hz=Math.random()<0.5, p=hz?rand(R.y+120,R.y+R.h-200):rand(R.x+120,R.x+R.w-120);
      c.fillStyle='#070302'; if(hz)c.fillRect(R.x,p-6,R.w,12); else c.fillRect(p-6,R.y,12,R.h); c.fillStyle='rgba(56,9,7,.7)'; if(hz)c.fillRect(R.x,p-2,R.w,4); else c.fillRect(p-2,R.y,4,R.h);
      c.fillStyle='#1c1210'; for(let k=0;k<(hz?R.w:R.h);k+=90){ if(hz)c.fillRect(R.x+k,p-6,3,12); else c.fillRect(p-6,R.y+k,12,3); } }
    c.lineCap='round'; for(let i=0;i<3+A/300000;i++){ let [x,y]=mapRP(40), a=rand(0,TAU); c.strokeStyle='rgba(48,9,7,.24)'; c.lineWidth=rand(10,22); c.beginPath(); c.moveTo(x,y); for(let k=0;k<5;k++){ a+=rand(-0.5,0.5); x+=Math.cos(a)*45; y+=Math.sin(a)*45; c.lineTo(x,y); } c.stroke(); }
    for(let i=0;i<A/60000;i++){ const [x,y]=mapRP(20); mapStain(c,x,y,rand(10,32),pick(['#330a08','#2a0806','#3a0d0a']),rand(0.45,0.7)); for(let k=0;k<8;k++){ c.fillStyle='rgba(58,11,9,.5)'; c.beginPath(); c.arc(x+rand(-50,50),y+rand(-50,50),rand(1,3),0,TAU); c.fill(); } }
    for(let i=0;i<A/220000;i++){ const [x,y]=mapRP(40); c.globalAlpha=0.3; c.fillStyle='#5a4628'; for(let k=0;k<60;k++)c.fillRect(x+rand(-34,34),y+rand(-22,22),1.6,1.6); c.globalAlpha=1; }
    for(let i=0;i<2+A/500000;i++){ const [x,y]=mapRP(60); c.fillStyle='#060202'; c.beginPath(); c.arc(x,y,9,0,TAU); c.fill(); c.strokeStyle='#2a1a16'; c.lineWidth=1.5; c.stroke(); mapStain(c,x,y,9,'#4a0a08',0.7); }
    for(let i=0;i<1+A/600000;i++){ const [x,y]=mapRP(100); mapLight(x,y,150,'rgba(255,170,110,1)',0.07); }
    mapMargin(c,'#1d0f0b');
    c.fillStyle='#0c0504'; for(let y=0,r=0;y<WORLD.h;y+=12,r++){ c.fillRect(0,y,WORLD.w,1.5); for(let x=(r%2)*14;x<WORLD.w;x+=28){ if(y<R.y-2||y>R.y+R.h||x<R.x-2||x>R.x+R.w)c.fillRect(x,y,1.5,12); } }
    mapRim(c,64,(x,y)=>{ c.strokeStyle='#5a5e62'; c.lineWidth=1.6; c.beginPath(); c.moveTo(x,y-7); c.lineTo(x,y+2); c.arc(x+3,y+2,3,Math.PI,0,true); c.stroke(); }); },
  /* Golgotha: Fels und Asche, glühende Risse, Knochen, verblasste Kreuze; Rand: zackige Felsen */
  function(c,reg){ const R=ROOM, A=R.w*R.h;
    c.fillStyle='#130f13'; c.fillRect(R.x,R.y,R.w,R.h);
    mapNoise(c,A/8000,['#1a1419','#0c0a0c','#1d171b','#161216'],40,120,0.4,0.7); mapSpeck(c,A/260,['#2a2228','#060406','#241e22'],1,3,0.6);
    for(let i=0;i<A/140000;i++){ const [x,y]=mapRP(); mapSoft(c,x,y,rand(80,200),'#4a4448',rand(0.1,0.18)); }
    c.lineCap='round'; c.lineJoin='round';
    for(let i=0;i<A/40000;i++){ let [x,y]=mapRP(20), a=rand(0,TAU); const P=[[x,y]]; for(let k=0;k<randInt(4,9);k++){ a+=rand(-0.8,0.8); x+=Math.cos(a)*rand(12,26); y+=Math.sin(a)*rand(12,26); P.push([x,y]); }
      if(Math.random()<0.35){ c.strokeStyle='rgba(220,90,30,.14)'; c.lineWidth=7; mapPath(c,P); c.stroke(); c.strokeStyle='rgba(240,120,40,.35)'; c.lineWidth=1.6; mapPath(c,P); c.stroke(); if(Math.random()<0.5)MAP.live.push({k:'ember',x:P[1][0],y:P[1][1]}); }
      else { c.strokeStyle='rgba(4,3,4,.85)'; c.lineWidth=rand(1.5,2.5); mapPath(c,P); c.stroke(); } }
    mapBones(c,A/40000);
    for(let i=0;i<Math.round(A/240000*6);i++){ const [x,y]=mapRP(40), s=rand(.6,1.3); c.save(); c.globalAlpha=rand(.05,.12); c.fillStyle=(reg&&reg.tint)||'#2a1c24'; c.translate(x,y); c.scale(s,s); c.fillRect(-4,-26,8,52); c.fillRect(-16,-14,32,8); c.restore(); }
    mapMargin(c,'#100c10');
    mapRim(c,26,(x,y)=>{ const r=rand(10,19); c.fillStyle='#070507'; c.beginPath(); for(let k=0;k<6;k++){ const a=k/6*TAU+rand(-0.3,0.3), d=r*rand(0.7,1.1); c.lineTo(x+Math.cos(a)*d+2,y+Math.sin(a)*d+3); } c.fill();
      c.fillStyle=pick(['#211a20','#1c161b','#262025']); c.beginPath(); for(let k=0;k<6;k++){ const a=k/6*TAU+rand(-0.3,0.3), d=r*rand(0.7,1.1); c.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d); } c.fill(); }); },
];
/* Innenkante: Schattenstreifen + schmale goldene Linie (Raumgrenze bleibt deutlich) */
function mapRoomEdge(c){ const R=ROOM, d=28;
  for(const [x,y,w,h,gx0,gy0,gx1,gy1] of [[R.x,R.y,R.w,d,0,R.y,0,R.y+d],[R.x,R.y+R.h-d,R.w,d,0,R.y+R.h,0,R.y+R.h-d],[R.x,R.y,d,R.h,R.x,0,R.x+d,0],[R.x+R.w-d,R.y,d,R.h,R.x+R.w,0,R.x+R.w-d,0]]){
    const g=c.createLinearGradient(gx0,gy0,gx1,gy1); g.addColorStop(0,'rgba(0,0,0,.5)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(x,y,w,h); }
  c.strokeStyle='rgba(0,0,0,.7)'; c.lineWidth=2; c.strokeRect(R.x-4,R.y-4,R.w+8,R.h+8); c.strokeStyle='rgba(184,137,59,.55)'; c.lineWidth=2; c.strokeRect(R.x-1,R.y-1,R.w+2,R.h+2); }
function mapPaintFloor(region){ const s=Math.min(1,Math.sqrt(5.2e6/(WORLD.w*WORLD.h)));
  const cv=MAP.floor||(MAP.floor=document.createElement('canvas')); cv.width=Math.ceil(WORLD.w*s); cv.height=Math.ceil(WORLD.h*s);
  const c=cv.getContext('2d'); c.setTransform(s,0,0,s,0,0); MAP.fs=s; MAP.live=[]; MAP.lights=[];
  c.fillStyle='#050507'; c.fillRect(0,0,WORLD.w,WORLD.h);
  MAP_FLOOR[MAP.ri](c,region);
  for(const g of MAP.groups){ if(g.style==='cauldron')mapLight(g.x,g.y,g.r*3,'rgba(240,120,50,1)',0.16); else if(g.style==='lamp')mapLight(g.x,g.y,120,'rgba(185,215,200,1)',0.11); }
  for(const l of MAP.lights) mapSoft(c,l.x,l.y,l.r,l.col,l.a);
  mapRoomEdge(c); MAP.world=WORLD; }
/* Ersatz für Boden/Raster/Deko/Rahmen in renderGame: sichtbaren Ausschnitt kopieren, dann flackernde Lichter */
function drawMapFloor(reg){ const f=MAP.floor;
  if(!f||MAP.world!==WORLD){ cx.fillStyle=reg.floor; cx.fillRect(ROOM.x,ROOM.y,ROOM.w,ROOM.h); cx.strokeStyle=C.gold; cx.lineWidth=3; cx.strokeRect(ROOM.x-2,ROOM.y-2,ROOM.w+4,ROOM.h+4); return; }
  const s=MAP.fs, m=cx.getTransform(), x0=Math.max(0,Math.floor(cam.x-24)), y0=Math.max(0,Math.floor(cam.y-24)), x1=Math.min(WORLD.w,Math.ceil(cam.x+W+24)), y1=Math.min(WORLD.h,Math.ceil(cam.y+H+24));
  if(m.a===1&&m.d===1&&!m.b&&!m.c){ /* schneller Weg: ganzzahlig im Bildschirmraum kopieren (kein Resampling) */
    const sx=Math.round(-m.e), sy=Math.round(-m.f), a0=Math.max(0,sx), b0=Math.max(0,sy), a1=Math.min(WORLD.w,sx+W), b1=Math.min(WORLD.h,sy+H);
    cx.save(); cx.setTransform(1,0,0,1,0,0); if(a1>a0&&b1>b0) cx.drawImage(f,a0*s,b0*s,(a1-a0)*s,(b1-b0)*s,a0-sx,b0-sy,a1-a0,b1-b0); cx.restore(); }
  else if(x1>x0&&y1>y0) cx.drawImage(f,x0*s,y0*s,(x1-x0)*s,(y1-y0)*s,x0,y0,x1-x0,y1-y0);
  const t=G.uiTime;
  for(const d of MAP.live){ if(d.x<x0||d.x>x1||d.y<y0||d.y>y1)continue; const fl=0.5+Math.sin(t*8+d.x)*0.3+Math.sin(t*19+d.y)*0.1;
    if(d.k==='candle'){ cx.fillStyle='rgba(255,170,80,'+(0.07*fl)+')'; cx.beginPath(); cx.arc(d.x,d.y,9,0,TAU); cx.fill(); cx.fillStyle='rgba(255,200,120,.85)'; cx.fillRect(d.x-1,d.y-2-fl,2,2.5+fl); }
    else if(d.k==='lantern'){ cx.fillStyle='rgba(255,180,90,'+(0.08*fl)+')'; cx.beginPath(); cx.arc(d.x,d.y,22,0,TAU); cx.fill(); cx.fillStyle='#2a2418'; cx.fillRect(d.x-4,d.y-5,8,10); cx.fillStyle='rgba(255,200,120,'+(0.6+fl*0.3)+')'; cx.fillRect(d.x-2,d.y-3,4,6); }
    else if(d.k==='ember'){ cx.fillStyle='rgba(240,110,40,'+(0.25+fl*0.3)+')'; cx.beginPath(); cx.arc(d.x,d.y,1.6+fl,0,TAU); cx.fill(); } } }
/* Minimap: Hindernisse als Kreise (vorgezeichnet), Zerstörbares farbig */
function drawMapMinimap(m,sc,ox,oy){
  if(MAP.obsRef!==obstacles){ m.fillStyle='#3a342c'; for(const ob of obstacles)m.fillRect(ox+ob.x*sc-1.5,oy+ob.y*sc-1.5,3,3); return; }
  const MW=m.canvas.width, MH=m.canvas.height, key=sc+'|'+ox+'|'+oy+'|'+MAP.ver+'|'+MW;
  if(MAP.miniKey!==key){ const mc=MAP.mini||(MAP.mini=document.createElement('canvas')); mc.width=MW; mc.height=MH; const c=mc.getContext('2d'); c.clearRect(0,0,MW,MH);
    c.fillStyle='#6a5e4c'; c.beginPath(); for(const ob of obstacles){ if(ob.brk)continue; const r=Math.max(0.9,ob.r*sc); c.moveTo(ox+ob.x*sc+r,oy+ob.y*sc); c.arc(ox+ob.x*sc,oy+ob.y*sc,r,0,TAU); } c.fill(); MAP.miniKey=key; }
  m.drawImage(MAP.mini,0,0);
  for(const ob of obstacles){ if(!ob.brk)continue; m.fillStyle=ob.type==='barrel'?C.sick:ob.type==='poorbox'?C.gold2:'#8a6a40'; m.fillRect(ox+ob.x*sc-1.5,oy+ob.y*sc-1.5,3,3); } }

/* ---------- Übersetzungen ---------- */
Object.assign(I18N.de,{src_barrel:'Pestfass',map_barrel:'Pestfass',map_poorbox:'Opferstock',map_crate:'Holzkiste'});
Object.assign(I18N.en,{src_barrel:'Plague barrel',map_barrel:'Plague barrel',map_poorbox:'Poor box',map_crate:'Wooden crate'});
