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
function mapCtx(){ const m=MAP_IN, L={x0:ROOM.x+m,y0:ROOM.y+m,w:ROOM.w-2*m,h:ROOM.h-2*m,sx:WORLD.w/2,sy:WORLD.h-160,fx:Math.random()<0.5,groups:[],brk:[],decals:[]};
  /* Bodenfeld ohne Kollision (Teppich, Felsplatte, Trichtergrund): {x,y,R[,R0]} oder {x0,y0,x1,y1}; tiles = Namen aus PX_TILE[…].sprites */
  L.decal=(d)=>{ L.decals.push(d); return d; };
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

/* Ring/Bogen als Ketten um c mit Radius R; gaps = [[Winkel, freie Öffnung px]]. Punkte zu nah am Startkreis bleiben offen. */
function mapArc(L,style,c,R,r,gaps,extra){ const gs=gaps.map(([a,w])=>[a,(w/2+r)/R]), st=Math.min(0.2,r*1.1/R); let run=[];
  const flush=()=>{ if(run.length>1)L.chain(style,run,r,extra); run=[]; }, a0=gs.length?gs[0][0]+gs[0][1]:0;
  for(let a=a0;a<=a0+TAU+1e-6;a+=st){ const x=c[0]+Math.cos(a)*R, y=c[1]+Math.sin(a)*R;
    if(gs.some(([g,h])=>Math.abs(angDiff(a,g))<h)||Math.hypot(x-L.sx,y-L.sy)<MAP_START_R+r+30){ flush(); continue; } run.push([x,y]); } flush(); }

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
  /* Granattrichter: Erdwall-Ring mit Sandsack-Krone, 3 Lücken (eine zum Start), Schlammgrund mit Hülsen; Draht und Sandsäcke außen */
  crater(L){ const R=clamp(Math.min(L.w*0.28,L.h*0.3),150,240), c=L.p(rand(0.42,0.58),0.36); c[1]=Math.max(c[1],L.y0+R+10);
    mapArc(L,'berm',c,R,22,[[Math.PI/2+rand(-0.25,0.25),220],[-Math.PI/6+rand(-0.4,0.4),130],[Math.PI*7/6+rand(-0.4,0.4),130]]);
    L.decal({x:c[0],y:c[1],R:R-26,tiles:['floor3','floor1','floor1'],p:0.85}); L.decal({x:c[0],y:c[1],R:R-30,tiles:['deco0','deco1'],p:0.14,over:true});
    for(let i=0;i<3;i++){ const q=L.spot(90,70,30,0.85); if(q)L.line('wire',q[0],q[1],rand(0,Math.PI),rand(130,200),11); }
    for(let i=0;i<2;i++){ const q=L.spot(70,60,30,0.75); if(q)L.line('sandbag',q[0],q[1],rand(-0.3,0.3),rand(100,140),16); } },
  /* Grabenkreuzung mit Unterstand: Graben quer und längs (offene Kreuzung), Holzunterstand mit Tür nach oben am Rand */
  dugout(L){ const v=rand(0.3,0.38), u=rand(0.36,0.44);
    mapRow(L,'sandbag',v,17,[[u,170],[rand(0.72,0.86),150]],rand(8,14));
    const up=[],dn=[]; for(let w=0;w<=0.62;w+=0.06){ const p=L.p(u+(mapTri(w*3)-0.5)*0.03,w); if(w<v-0.14)up.push(p); else if(w>v+0.14)dn.push(p); }
    if(up.length>1)L.chain('sandbag',up,17); if(dn.length>1)L.chain('sandbag',dn,17);
    const b=L.p(rand(0.08,0.14),rand(0.56,0.64)), hw=80, hh=56;
    L.chain('timber',[[b[0]-hw,b[1]-hh],[b[0]-hw,b[1]+hh],[b[0]+hw,b[1]+hh],[b[0]+hw,b[1]-hh]],15);
    for(let i=0;i<2;i++){ const q=L.spot(90,70,30,0.8); if(q)L.line('wire',q[0],q[1],rand(0,Math.PI),rand(130,190),11); } },
 },
 /* 1 Die Katakomben */ {
  hall(L){ const nc=clamp(Math.round(L.w/240),3,10), nr=clamp(Math.round(L.h*0.74/210),2,5), hole=Math.random()<0.5;
    for(let i=0;i<nc;i++)for(let j=0;j<nr;j++){ if(Math.random()<0.12)continue; if(hole&&i>0&&i<nc-1&&j===Math.floor(nr/2)&&Math.abs(i-(nc-1)/2)<1)continue;
      const p=L.p((i+0.5)/nc,(j+0.5)/nr*0.74);
      if(Math.random()<0.13) L.line('sarco',p[0],p[1],Math.random()<0.5?0:Math.PI/2,84,15,{sp:1}); else L.prop('pillar',p[0],p[1],24); } },
  corridors(L){ const vs=[rand(0.22,0.28),rand(0.5,0.56)];
    vs.forEach((v,i)=>{ const before=L.groups.length; mapRow(L,'stone',v,16,mapGaps(L,2,150,180),0);
      /* Nischen: kurze Stummel quer zur Wand, abwechselnd oben/unten */
      for(const g of L.groups.slice(before)){ const a=g.pts[0], b=g.pts[g.pts.length-1], len=Math.hypot(b[0]-a[0],b[1]-a[1]);
        for(let t=70;t<len-60;t+=rand(130,180)){ const x=a[0]+(b[0]-a[0])*t/len, y=a[1]+(b[1]-a[1])*t/len, sd=(Math.random()<0.5?-1:1)*(i?-1:1); if(Math.hypot(x-L.sx,y+sd*58-L.sy)<MAP_START_R+40)continue; L.chain('stone',[[x,y],[x,y+sd*58]],15); } } });
    for(let k=0;k<3;k++){ const q=L.spot(30,90,30,0.62); if(q)L.prop('pillar',q[0],q[1],24); } },
  crypt(L){ const cw=clamp(L.w*0.36,300,560), ch=clamp(L.h*0.42,230,380), c=L.p(0.5,0.36), x0=c[0]-cw/2,x1=c[0]+cw/2,y0=c[1]-ch/2,y1=c[1]+ch/2, dw=140;
    const doors=[0,1,2,3].filter(()=>Math.random()<0.7); if(doors.length<2)doors.push(2,1);
    const side=(s,a,b)=>{ if(!doors.includes(s)){ L.chain('stone',[a,b],16); return; } const m=[(a[0]+b[0])/2,(a[1]+b[1])/2], L2=Math.hypot(b[0]-a[0],b[1]-a[1]), f=(L2-dw)/2/L2;
      L.chain('stone',[a,[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]],16); L.chain('stone',[[b[0]+(a[0]-b[0])*f,b[1]+(a[1]-b[1])*f],b],16); };
    side(0,[x0,y0],[x1,y0]); side(1,[x1,y0],[x1,y1]); side(2,[x1,y1],[x0,y1]); side(3,[x0,y1],[x0,y0]);
    L.line('sarco',c[0],c[1],Math.random()<0.5?0:Math.PI/2,84,15,{sp:1});
    for(const [u,v] of [[0.08,0.1],[0.92,0.1],[0.08,0.62],[0.92,0.62]]){ const p=L.p(u+rand(-0.03,0.03),v+rand(-0.03,0.03)); if(L.free(p[0],p[1],26,60))L.prop('pillar',p[0],p[1],24); }
    for(let k=0;k<2;k++){ const q=L.spot(18,90,30,0.75); if(q)L.prop('bones',q[0],q[1],16); } },
  /* Ossuarium: zwei Schädelwände mit Knochennischen (Buchten), Knochenhaufen in den Nischen, Pfeiler im Gang */
  ossuary(L){ const vs=[0.16,0.52];
    vs.forEach((v,i)=>{ const y=L.p(0,v)[1], dir=i?-1:1, gap=rand(0.35,0.65);
      for(const [a,b] of [[0.02,gap-0.12],[gap+0.12,0.98]]){ if((b-a)*L.w<200)continue; const pa=[L.x0+a*L.w,y], pb=[L.x0+b*L.w,y]; L.chain('ossuary',[pa,pb],16);
        const n=Math.max(1,Math.floor((pb[0]-pa[0])/150)); for(let k=1;k<n;k++){ const x=pa[0]+(pb[0]-pa[0])*k/n; L.chain('ossuary',[[x,y],[x,y+dir*64]],15); }
        for(let k=0;k<n;k++){ if(Math.random()<0.45)continue; const x=pa[0]+(pb[0]-pa[0])*(k+0.5)/n; if(L.free(x,y+dir*30,16,-20))L.prop('bones',x,y+dir*30,16); } } });
    for(let k=0;k<2;k++){ const q=L.spot(30,100,30,0.62); if(q)L.prop('pillar',q[0],q[1],24); } },
  /* Kapelle: Altar oben in der Mitte mit Kerzen und Kreuz, Teppich als Mittelgang, Bankreihen links und rechts, Pfeiler außen */
  chapel(L){ const cx0=L.x0+L.w/2, top=L.y0+16, aisle=90, bl=clamp(L.w*0.22,150,260);
    L.line('altar',cx0,top,0,110,18,{sp:1});
    L.decal({x0:cx0-16,x1:cx0+16,y0:top+30,y1:L.y0+L.h*0.8,tiles:['carpet']});
    const nr=clamp(Math.floor(L.h*0.5/86),3,6);
    for(let j=0;j<nr;j++){ const y=top+110+j*86; for(const s of [-1,1]){ const x=cx0+s*(aisle+bl/2); if(Math.hypot(Math.max(0,Math.abs(x-L.sx)-bl/2),y-L.sy)<MAP_START_R+40)continue; L.line('pew',x,y,0,bl,13,{sp:1}); } }
    for(const s of [-1,1]) for(const v of [0.12,0.5]){ const x=cx0+s*(aisle+bl+100), y=L.p(0,v)[1]; if(L.free(x,y,24,30))L.prop('pillar',x,y,24); } },
 },
 /* 2 Das Lazarett */ {
  ward(L){ const rows=L.h>760?[0.08,0.36,0.62]:[0.1,0.46], sp=rand(96,112);
    rows.forEach((v,ri)=>{ const n=Math.floor(L.w/sp), off=(L.w-(n-1)*sp)/2;
      for(let i=0;i<n;i++){ if(Math.random()<0.14)continue; const p=[L.x0+off+i*sp,L.p(0,v)[1]+40];
        if(Math.hypot(p[0]-L.sx,p[1]+37-L.sy)<MAP_START_R+40)continue; L.line('bed',p[0],p[1],Math.PI/2,74,17,{sp:1}); }
      if(Math.random()<0.7){ const p=L.p(rand(0.15,0.85),v); L.line('screen',p[0],p[1]+96,rand(-0.2,0.2),rand(100,150),10); } }); },
  screens(L){ const n=clamp(Math.round(L.w*L.h/200000),4,9);
    for(let k=0;k<n;k++){ const q=L.spot(104,50,30,0.8); if(!q)continue; const a=rand(0,Math.PI), pn=randInt(3,5), pts=[];
      for(let i=0;i<=pn;i++){ const s=(i-pn/2)*40, z=(i%2?1:-1)*9; pts.push([q[0]+Math.cos(a)*s-Math.sin(a)*z,q[1]+Math.sin(a)*s+Math.cos(a)*z]); }
      L.chain('screen',pts,10); }
    for(let k=0;k<3;k++){ const q=L.spot(60,70,30,0.75); if(q)L.line('optable',q[0],q[1],(Math.random()<0.5?0:Math.PI/2),76,17,{sp:1}); }
    for(let k=0;k<4;k++){ const q=L.spot(20,60,30,0.3); if(q)L.prop('cabinet',q[0],q[1],18); } },
  theatre(L){ const c=L.p(0.5,0.34); L.line('optable',c[0],c[1],0,80,18,{sp:1});
    for(const [dx,dy] of [[-90,-70],[90,-70],[-90,70],[90,70]])L.prop('lamp',c[0]+dx,c[1]+dy,10);
    L.chain('screen',[[c[0]-170,c[1]-60],[c[0]-180,c[1]],[c[0]-170,c[1]+60]],10); L.chain('screen',[[c[0]+170,c[1]-60],[c[0]+180,c[1]],[c[0]+170,c[1]+60]],10);
    for(const u of [0.06,0.94]){ const n=Math.floor(L.h*0.7/96); for(let i=0;i<n;i++){ if(Math.random()<0.2)continue; const p=L.p(u,0.04+i*96/L.h); L.line('bed',p[0],p[1],0,74,17,{sp:1}); } }
    for(let k=0;k<2;k++){ const q=L.spot(20,70,30,0.6); if(q)L.prop('cabinet',q[0],q[1],18); } },
  /* Leichenkammer: Bahrenreihen mit Abfluss am Fußende, Kühlschränke an der Stirnwand */
  morgue(L){ const cols=clamp(Math.floor(L.w/230),3,7), rows=L.h>760?4:3, sx=L.w/cols;
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){ const x=L.x0+(i+0.5)*sx, y=L.y0+L.h*(0.14+j*0.17); if(Math.random()<0.15)continue;
      if(Math.hypot(x-L.sx,y-L.sy)<MAP_START_R+90)continue; L.line('slab',x,y,0,74,16,{sp:1}); L.decal({x:x+60,y:y,R:20,tiles:['deco0'],over:true}); }
    const n=Math.floor(L.w*0.6/70); for(let i=0;i<n;i++){ if(Math.random()<0.2)continue; const p=L.p(0.2+i*70/L.w,0); if(L.free(p[0],p[1],18,4))L.prop('cabinet',p[0],p[1],18); } },
 },
 /* 3 Der Schlachthof */ {
  hooks(L){ const rows=L.h>760?[0.12,0.38,0.62]:[0.14,0.5];
    rows.forEach((v,ri)=>{ const sp=rand(64,74), y=L.p(0,v)[1]+rand(-20,20), n=Math.floor(L.w*0.9/sp), off=(L.w-(n-1)*sp)/2, skip=new Set();
      for(let k=0;k<2;k++){ const s=randInt(1,n-3); skip.add(s); skip.add(s+1); }
      let run=[];
      const flush=()=>{ if(run.length>=2)L.add('hooks',run,{y}); run=[]; };
      for(let i=0;i<n;i++){ const x=L.x0+off+i*sp; if(skip.has(i)||(ri===rows.length-1&&Math.abs(x-L.sx)<150)){ flush(); continue; } run.push({x,y,r:14}); } flush(); });
    for(let k=0;k<2;k++){ const q=L.spot(104,60,30,0.72); if(q)L.line('bench',q[0],q[1],Math.random()<0.5?0:Math.PI/2,rand(120,170),17); } },
  islands(L){ const n=clamp(Math.round(L.w*L.h/260000),3,6); let k=0,g=0;
    while(k<n&&g++<80){ const R=34, q=L.spot(R+90,120,1,0.78); if(!q)continue; L.prop('cauldron',q[0],q[1],R); k++;
      const a0=rand(0,TAU), nb=randInt(1,2); for(let b=0;b<nb;b++){ const a=Math.round(a0/(Math.PI/2))*Math.PI/2+b*Math.PI, d=R+62, x=q[0]+Math.cos(a)*d, y=q[1]+Math.sin(a)*d; L.line('bench',x,y,a+Math.PI/2,rand(100,130),16); } } },
  benches(L){ const rows=L.h>760?[0.12,0.34,0.56]:[0.14,0.5], bl=rand(170,230);
    rows.forEach((v,ri)=>{ const step=bl+rand(120,150), n=Math.ceil(L.w/step)+1, off=(ri%2)*step/2-rand(0,step*0.4);
      for(let i=0;i<n;i++){ const x=L.x0+off+i*step; if(x-bl/2<L.x0||x+bl/2>L.x0+L.w)continue; const y=L.p(0,v)[1]; if(Math.random()<0.15)continue; L.line('bench',x,y,0,bl,17); } });
    for(const u of [0.03,0.97]){ const p=L.p(u,rand(0.3,0.6)); if(L.free(p[0],p[1],36,40))L.prop('cauldron',p[0],p[1],34); } },
  /* Kühlhaus: geflieste Trennwände mit Durchgängen, dazwischen dichte Hakenreihen (jede 6. Lücke breit) */
  coldstore(L){ const walls=[0.24,0.58]; walls.forEach(v=>mapRow(L,'tilewall',v,16,mapGaps(L,2,150,170),0));
    for(const v of [walls[0]/2,(walls[0]+walls[1])/2]){ const y=L.p(0,v)[1], sp=56, n=Math.floor(L.w*0.92/sp), off=(L.w-(n-1)*sp)/2, o=randInt(0,5); let run=[];
      const flush=()=>{ if(run.length>=2)L.add('hooks',run,{y}); run=[]; };
      for(let i=0;i<n;i++){ const x=L.x0+off+i*sp; if((i+o)%6===5){ flush(); continue; } run.push({x,y,r:14}); } flush(); }
    const q=L.spot(98,80,30,0.85); if(q)L.line('bench',q[0],q[1],0,rand(120,160),17); },
 },
 /* 4 Golgotha */ {
  hills(L){ const n=clamp(Math.round(L.w*L.h/200000),3,8); let k=0,g=0;
    while(k<n&&g++<120){ const q=L.spot(90,130,1,0.8); if(!q)continue; const circ=[{x:q[0],y:q[1],r:rand(36,52)}], m=randInt(4,9);
      for(let i=0;i<m;i++){ const b=pick(circ), a=rand(0,TAU), r=rand(20,38), d=(b.r+r)*rand(0.45,0.7); circ.push({x:b.x+Math.cos(a)*d,y:b.y+Math.sin(a)*d,r}); }
      if(circ.every(c=>L.free(c.x,c.y,c.r,40))){ L.add('rock',circ); k++; } } },
  circles(L){ const n=L.w*L.h>900000?2:1; let k=0,g=0;
    while(k<n&&g++<60){ const R=rand(110,150), q=L.spot(R+30,120,1,0.66); if(!q)continue; const cnt=Math.round(TAU*R/90), open=new Set(), o0=randInt(0,cnt-1);
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
  /* Pilgerpfad: gewundener Plattenweg vom Start nach oben, gesäumt von Kreuzen; zwei Steinkreise abseits */
  pilgrim(L){ const pts=[]; let u=rand(0.38,0.62); for(let v=0.9;v>=0.0;v-=0.12){ pts.push(L.p(u,v)); u=clamp(u+rand(-0.14,0.14),0.25,0.75); }
    for(let i=0;i<pts.length-1;i++){ const a=pts[i], b=pts[i+1]; for(let t=0;t<1;t+=0.25) L.decal({x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,R:30,tiles:['plate']}); }
    mapWalk(pts,100,(x,y,a)=>{ for(const s of [-1,1]){ const px=x-Math.sin(a)*s*64, py=y+Math.cos(a)*s*64; if(L.free(px,py,13,40))L.prop('cross',px,py,13); } },50);
    let k=0,g=0; while(k<2&&g++<40){ const R=rand(60,80), q=L.spot(R+24,60,1,0.8); if(!q)continue; const n=Math.round(TAU*R/28), o=randInt(0,n-1), circ=[];
      for(let i=0;i<n;i++){ if((i-o+n)%n<4)continue; const a=i/n*TAU; circ.push({x:q[0]+Math.cos(a)*R,y:q[1]+Math.sin(a)*R,r:rand(14,17)}); }
      if(circ.every(c=>L.free(c.x,c.y,c.r,40))){ L.add("rock",circ); k++; } }
    for(let i=0;i<2;i++){ const q=L.spot(50,90,30,0.8); if(q)L.add('rock',[{x:q[0],y:q[1],r:rand(26,34)},{x:q[0]+rand(-28,28),y:q[1]+rand(-22,22),r:rand(18,24)}]); } },
  /* Schädelfeld: verstreute Schädelhaufen, einzelne Kreuze, flache Felsen, Knochen am Boden */
  skullfield(L){ const n=clamp(Math.round(L.w*L.h/90000),6,16); for(let k=0;k<n;k++){ const q=L.spot(16,70,30,0.82); if(q)L.prop('skulls',q[0],q[1],15); }
    for(let k=0;k<3;k++){ const q=L.spot(13,90,30,0.8); if(q)L.prop('cross',q[0],q[1],13); }
    for(let i=0;i<2;i++){ const q=L.spot(50,100,30,0.8); if(q)L.add('rock',[{x:q[0],y:q[1],r:rand(28,36)},{x:q[0]+rand(-30,30),y:q[1]+rand(-24,24),r:rand(18,26)}]); }
    L.decal({x0:L.x0,x1:L.x0+L.w,y0:L.y0,y1:L.y0+L.h,tiles:['deco1','deco2'],p:0.03,over:true}); },
 },
];
/* Boss-Arenen: eigene Form je Region um eine freie Mitte. Oben (Bossplatz ROOM.y+120…140) und zum Start bleibt der Ring offen,
   damit der Boss sichtbar und beschießbar bleibt; der Schlund (Raummitte, r 44) hat ringsum ≥ 250 px Platz. */
function mapBossLayout(L,ri){ const c=[L.x0+L.w/2,L.y0+L.h*0.46], R=Math.min(L.w*0.38,L.h*0.4), UP=-Math.PI/2, DN=Math.PI/2;
  const near=(a,g,w)=>Math.abs(angDiff(a,g))<w;
  const ring=(style,r,n,open)=>{ for(let i=0;i<n;i++){ const a=i/n*TAU+Math.PI/n; if(open(a))continue; const x=c[0]+Math.cos(a)*R, y=c[1]+Math.sin(a)*R; if(L.free(x,y,r,24))L.prop(style,x,y,r); } };
  if(ri===0){ /* Granattrichter: Erdwall-Ring mit 4 Lücken, Schlammgrund */
    mapArc(L,'berm',c,R,22,[[UP,200],[DN,230],[0,150],[Math.PI,150]]);
    L.decal({x:c[0],y:c[1],R:R-30,tiles:['floor3','floor1','floor1'],p:0.8}); L.decal({x:c[0],y:c[1],R:R-30,tiles:['deco0','deco1'],p:0.1,over:true}); }
  else if(ri===1){ /* Pfeilerring; Altar am oberen Rand, der Boss steht davor; Teppich vom Start zum Altar */
    ring('pillar',24,Math.max(10,Math.round(TAU*R/120)),a=>near(a,UP,0.3)||near(a,DN,0.3));
    L.line('altar',c[0],L.y0+2,0,120,18,{sp:1}); L.decal({x0:c[0]-16,x1:c[0]+16,y0:L.y0+40,y1:L.y0+L.h,tiles:['carpet']}); }
  else if(ri===2){ /* Operationstheater: Halbrund aus Schränken über der Mitte, oben offen; Lampen an den Enden */
    for(let a=Math.PI;a<=TAU+1e-6;a+=88/R){ if(near(a,UP,0.42))continue; const x=c[0]+Math.cos(a)*R, y=c[1]+Math.sin(a)*R; if(L.free(x,y,18,20))L.prop('cabinet',x,y,18); }
    for(const s of [-1,1]){ const x=c[0]+s*R, y=c[1]+70; if(L.free(x,y,10,30))L.prop('lamp',x,y,10); } }
  else if(ri===3){ /* Grube: Rinnenrand-Ring mit 4 Durchlässen, Blut im Inneren; Hakenschienen in den oberen Ecken */
    mapArc(L,'curb',c,R,14,[[UP,170],[DN,220],[0,140],[Math.PI,140]]); L.decal({x:c[0],y:c[1],R:R-24,tiles:['deco1'],p:0.12,over:true});
    for(const u of [0.06,0.94]){ const p=L.p(u,0.02), run=[-1,0,1].map(k=>({x:p[0]+k*56,y:p[1],r:14})); if(run.every(o=>L.free(o.x,o.y,14,10)))L.add('hooks',run,{y:p[1]}); } }
  else { /* Gipfel: Kreuzring um eine Felsplatte */
    ring('cross',13,Math.max(12,Math.round(TAU*R/90)),a=>near(a,UP,0.28)||near(a,DN,0.28)); L.decal({x:c[0],y:c[1],R:R-40,tiles:['plate']}); } }
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
  const ri=mapRegionIdx(lvl), boss=lvl%5===0; MAP.ri=ri; MAP.boss=boss; MAP.groups=[]; MAP.decals=[]; MAP.flow=null; MAP.flowT=-9; MAP.tpl='';
  obstacles=[]; let L=null;
  if(!Admin.noObs){ const tpl=MAP_TPL[ri], names=Object.keys(tpl);
    for(let tr=0;tr<16&&!L;tr++){ const c=mapCtx(), nm=boss?'arena':pick(names);
      try{ if(boss) mapBossLayout(c,ri); else { tpl[nm](c); if(c.groups.length<3)continue; mapPlaceBreakables(c,ri); } }catch(e){ MAP.err=e.message; continue; }
      const circ=c.groups.flatMap(g=>g.circ).concat(c.brk);
      const why=mapCheck(circ,c.sx,c.sy); MAP.tries=tr+1; if(!why){ L=c; MAP.tpl=nm; } } }
  if(L){ for(const g of L.groups){ g.id=MAP.groups.length; g.obs=g.circ.map(c=>({x:c.x,y:c.y,r:c.r,type:g.style,grp:g.id,seed:rand(0,TAU)})); obstacles.push(...g.obs); MAP.groups.push(g); }
    for(const b of L.brk){ b.id=uid++; obstacles.push(b); } MAP.decals=L.decals; }
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
   ZEICHNEN: Gruppen als Pixelbilder aus PX_TILE (js/px-tiles.js), je Gruppe einmal vorgezeichnet.
   Alle Bildpunkte liegen auf dem 2-px-Raster der Welt (PX_S): Teile einer Gruppe, andere Gruppen und der Boden teilen ein Raster.
   Arten je Stil (MAP_STYLE):
     Muster (def.tex)  in die Kreiskette eingepasst: Maske (Kreis − 2 px), Lichtkante oben/links, Schattenkante rechts,
                       Vorderseite nach unten (≤ 2 Bildpunkte), Umriss, 1 Bildpunkt Schlagschatten → beliebige Winkel und Formen
     Reihe (def.mid)   waagrecht oder senkrecht (90° = verlustfrei gespiegelt) auf Länge len+2r gestreckt
     Figur             je Kreis eine Figur, Anker = Kreismitte (Figuren sind auf r+2 Bildpunkte gezeichnet)
   Die Optik ragt höchstens 4 px über die Kreise; Kollision bleibt die Kreiskette.
   ========================================================================= */
const mapEven=v=>Math.round(v/PX_S)*PX_S;
const mapPxReg=()=>PX_TILE[PX_TILE_REG[MAP.ri]]||PX_TILE.graeben;
function mapPxDef(style){ const R=mapPxReg(); if(R.wall[style])return R.wall[style];
  for(const k of PX_TILE_REG){ const w=PX_TILE[k].wall[style]; if(w)return w; } return null; }
const MAP_RGB={};
function mapRGB(ch){ let v=MAP_RGB[ch]; if(!v){ const n=parseInt((PX_PAL[ch]||'#ff00ff').slice(1),16); v=MAP_RGB[ch]=[n>>16,(n>>8)&255,n&255]; } return v; }
/* blockiger Schlagschatten unter Figuren (Ellipse in 2-px-Zeilen, leicht nach unten versetzt) */
function mapPxShadow(c,x,y,rx,ry){ c.fillStyle='rgba(0,0,0,.36)'; x=mapEven(x); y=mapEven(y);
  for(let dy=-ry;dy<ry;dy+=PX_S){ const k=1-((dy+1)/ry)**2; if(k<=0)continue; const w=mapEven(rx*Math.sqrt(k)); if(w>0)c.fillRect(x-w+PX_S,y+dy+PX_S*2,w*2,PX_S); } }
/* Muster in die Kreise einpassen (siehe oben). circ: Kreise der Gruppe */
function mapPxWall(c,g,def,circ){ const S=PX_S, nw=g.bw/S, nh=g.bh/S, ox=g.bx/S, oy=g.by/S, tx=def.tex, rows=def.frames.idle[0], fh=tx.face.length, cr=tx.crest;
  const top=new Uint8Array(nw*nh), inner=cr?new Uint8Array(nw*nh):null;
  const fill=(m,o,R)=>{ if(R<=0)return; const i0=Math.max(0,Math.floor((o.x-R-g.bx)/S)), i1=Math.min(nw-1,Math.floor((o.x+R-g.bx)/S)), j0=Math.max(0,Math.floor((o.y-R-g.by)/S)), j1=Math.min(nh-1,Math.floor((o.y+R-g.by)/S));
    for(let j=j0;j<=j1;j++){ const dy=g.by+(j+.5)*S-o.y; for(let i=i0;i<=i1;i++){ const dx=g.bx+(i+.5)*S-o.x; if(dx*dx+dy*dy<R*R)m[j*nw+i]=1; } } };
  for(const o of circ){ fill(top,o,o.r-2); if(inner)fill(inner,o,o.r*0.45); }
  const tex=(r,i,j)=>r[(((oy+j)%16)+16)%16][(((ox+i)%16)+16)%16];
  for(let k=0;k<top.length;k++) if(top[k]&&tex(rows,k%nw,(k/nw)|0)==='.')top[k]=0;   // Löcher im Muster (Draht)
  const at=(i,j)=>i>=0&&j>=0&&i<nw&&j<nh&&top[j*nw+i]===1;
  const img=c.createImageData(nw,nh), d=img.data, sol=new Uint8Array(nw*nh);
  const put=(k,ch,a)=>{ const v=mapRGB(ch); d[k*4]=v[0]; d[k*4+1]=v[1]; d[k*4+2]=v[2]; d[k*4+3]=a==null?255:a; };
  for(let j=0;j<nh;j++)for(let i=0;i<nw;i++){ const k=j*nw+i;
    if(top[k]){ let ch=inner&&inner[k]?tex(cr,i,j):tex(rows,i,j);
      if(tx.lit&&(!at(i,j-1)||!at(i-1,j)))ch=tx.lit; else if(tx.shade&&!at(i+1,j))ch=tx.shade;
      put(k,ch); sol[k]=1; continue; }
    for(let f=1;f<=fh;f++) if(at(i,j-f)){ put(k,tx.face[f-1]); sol[k]=1; break; } }
  const on=(i,j,v)=>i>=0&&j>=0&&i<nw&&j<nh&&(v?sol[j*nw+i]>0:sol[j*nw+i]===1);   // v: auch Umriss zählt
  for(let j=0;j<nh;j++)for(let i=0;i<nw;i++){ const k=j*nw+i; if(!sol[k]&&(on(i-1,j)||on(i+1,j)||on(i,j-1)||on(i,j+1))){ put(k,'0'); sol[k]=2; } }
  for(let j=0;j<nh;j++)for(let i=0;i<nw;i++){ const k=j*nw+i; if(!sol[k]&&on(i-1,j-1,1)){ d[k*4+3]=92; } }   // Schlagschatten (schwarz, durchscheinend)
  const lo=document.createElement('canvas'); lo.width=nw; lo.height=nh; lo.getContext('2d').putImageData(img,0,0);
  c.imageSmoothingEnabled=false; c.drawImage(lo,g.bx,g.by,g.bw,g.bh); }
/* Reihe: mittlere Spalten wiederholen, für senkrecht spiegeln an der Diagonale (Licht bleibt oben links) */
function mapPxStretch(def,len,vert){ const m=def._st||(def._st={}), key=len+(vert?'v':'h'); if(m[key])return m[key];
  const [m0,m1]=def.mid, rows=def.frames.idle[0], n=Math.max(0,len-(def.w-(m1-m0+1)));
  let out=rows.map(r=>{ const mid=r.slice(m0,m1+1); let s=''; while(s.length<n)s+=mid; return r.slice(0,m0)+s.slice(0,n)+r.slice(m1+1); });
  if(vert){ const t=[]; for(let x=0;x<out[0].length;x++){ let s=''; for(let y=0;y<out.length;y++)s+=out[y][x]; t.push(s); } out=t; }
  return m[key]={w:out[0].length,h:out.length,ax:out[0].length>>1,ay:out.length>>1,halo:false,outline:def.outline,frames:{idle:[out]}}; }
/* Figur in die Kollisionsform einpassen: Bildpunkte, deren Mitte mehr als 1 px außerhalb der Kapsel (Halblänge hl entlang x
   bzw. y, Radius r) liegt, entfallen. Der Umriss (1 Bildpunkt = 2 px) kommt danach dazu → Optik ≤ 4 px über dem Kreis.
   Ergibt abgerundete Ecken bei Kästen (Schrank, Bett, Bank). */
function mapPxFit(def,r,hl,vert){ const m=def._fit||(def._fit={}), key=r+'|'+hl+'|'+(vert?1:0); if(m[key])return m[key];
  const rows=def.frames.idle[0].map((row,y)=>row.split('').map((ch,x)=>{ if(ch==='.')return ch;
    let dx=(x-def.ax)*PX_S+1, dy=(y-def.ay)*PX_S+1; if(vert){ dy=Math.max(0,Math.abs(dy)-hl); } else dx=Math.max(0,Math.abs(dx)-hl);
    return Math.hypot(dx,dy)-r>1?'.':ch; }).join(''));
  return m[key]=Object.assign({},def,{frames:{idle:[rows]},_fit:null,_st:null}); }
function mapPxLine(c,g,def){ const vert=Math.abs(Math.cos(g.a||0))<0.5, n=Math.max(def.w,Math.round((g.len+2*g.r)/PX_S)-2), sd=mapPxFit(mapPxStretch(def,n,vert),g.r,g.len/2,vert);
  mapPxShadow(c,g.x,g.y,sd.w*PX_S/2,sd.h*PX_S/2); pxDraw(c,sd,'idle',0,mapEven(g.x),mapEven(g.y)); return sd; }
function mapPxProps(c,g,def){ for(const o of g.obs){ mapPxShadow(c,o.x,o.y,o.r*0.9,o.r*0.75); pxDraw(c,mapPxFit(def,Math.round(o.r),0,false),'idle',0,mapEven(o.x),mapEven(o.y)); } }
const mapTex=(c,g,d)=>mapPxWall(c,g,d,g.obs), mapRowS=(c,g,d)=>{ mapPxLine(c,g,d); }, mapProp=(c,g,d)=>mapPxProps(c,g,d);
const MAP_STYLE={
  sandbag:mapTex, berm:mapTex, timber:mapTex, stone:mapTex, ossuary:mapTex, screen:mapTex, curb:mapTex, tilewall:mapTex,
  bed:mapRowS, optable:mapRowS, slab:mapRowS, bench:mapRowS, sarco:mapRowS, pew:mapRowS,
  pillar:mapProp, cabinet:mapProp, lamp:mapProp, cauldron:mapProp, bones:mapProp, cross:mapProp, skulls:mapProp,
  /* Stacheldraht: Drahtmuster + Holzpflöcke entlang der Kette */
  wire(c,g,d){ mapPxWall(c,g,d,g.obs); const st=mapPxDef('stake'); if(g.pts&&st) mapWalk(g.pts,46,(x,y)=>pxDraw(c,st,'idle',0,mapEven(x),mapEven(y)),10); },
  /* Fleischerhaken: Schiene (2 Bildpunkte) über den Hälften, dann je Kreis ein Stück Fleisch */
  hooks(c,g,d){ const cs=g.obs, a=cs[0], b=cs[cs.length-1], y=mapEven(a.y)-18;
    c.fillStyle=PX_PAL['0']; c.fillRect(mapEven(a.x)-24,y-2,mapEven(b.x)-mapEven(a.x)+48,6);
    c.fillStyle=PX_PAL.S; c.fillRect(mapEven(a.x)-22,y,mapEven(b.x)-mapEven(a.x)+44,2); c.fillStyle=PX_PAL.s; c.fillRect(mapEven(a.x)-22,y+2,mapEven(b.x)-mapEven(a.x)+44,2);
    for(const o of cs) pxDraw(c,mapPxFit(d,Math.round(o.r)+2,0,false),'idle',0,mapEven(o.x),mapEven(o.y)); },
  /* Altar: Reihe + goldenes Kreuz in der Mitte + Kerzen an den Enden (Flammen live: g.flames) */
  altar(c,g,d){ const sd=mapPxLine(c,g,d), x=mapEven(g.x), y=mapEven(g.y), hw=(sd.w>>1)*PX_S;
    pxDraw(c,mapPxDef('altarcross'),'idle',0,x,y-4); const cd=mapPxDef('candles'); g.flames=[];
    for(const sx of [-1,1]){ const cx0=x+sx*(hw-10), cy0=y-6; pxDraw(c,cd,'idle',0,cx0,cy0); for(const t of PX_CANDLE_TIPS)g.flames.push([cx0+(t[0]-cd.ax)*PX_S,cy0+(t[1]-cd.ay)*PX_S-2]); } },
  /* Fels: Muster; Steinkreis-Mitte mit Kerzen (altar) oder Kreuzhügel (crosses) */
  rock(c,g,d){ mapPxWall(c,g,d,g.obs); const o=g.obs[0];
    if(g.altar){ const cd=mapPxDef('candles'), x=mapEven(o.x), y=mapEven(o.y); pxDraw(c,cd,'idle',0,x,y); g.flames=PX_CANDLE_TIPS.map(t=>[x+(t[0]-cd.ax)*PX_S,y+(t[1]-cd.ay)*PX_S-2]); }
    if(g.crosses){ const cv=mapPxDef('calvary'), cr=mapPxDef('cross'), x=mapEven(o.x), y=mapEven(o.y), dx=mapEven(Math.min(o.r*0.62,40));
      pxDraw(c,cr,'idle',0,x-dx,y+6); pxDraw(c,cr,'idle',0,x+dx,y+6); pxDraw(c,cv,'idle',0,x,y); } },
};
/* Gruppe einmal in eine eigene Canvas zeichnen; Ursprung und Größe auf dem 2-px-Raster */
function mapBake(g){ let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; for(const o of g.obs){ x0=Math.min(x0,o.x-o.r); y0=Math.min(y0,o.y-o.r); x1=Math.max(x1,o.x+o.r); y1=Math.max(y1,o.y+o.r); }
  const pad=g.style==='hooks'?30:14;
  g.bx=Math.floor((x0-pad)/PX_S)*PX_S; g.by=Math.floor((y0-pad)/PX_S)*PX_S; g.bw=Math.ceil((x1+pad-g.bx)/PX_S)*PX_S; g.bh=Math.ceil((y1+pad-g.by)/PX_S)*PX_S;
  const cv=document.createElement('canvas'); cv.width=g.bw; cv.height=g.bh; const c=cv.getContext('2d'); c.translate(-g.bx,-g.by); c.imageSmoothingEnabled=false;
  const d=mapPxDef(g.style), f=MAP_STYLE[g.style];
  if(f&&d) f(c,g,d); else if(d) (d.tex?mapTex:d.mid?mapRowS:mapProp)(c,g,d); else mapPxWall(c,g,mapPxDef('stone'),g.obs);
  g.img=cv; }
/* Ersatz für die Zeile in renderGame: Gruppenbilder (nur sichtbare), dann übrige Hindernisse */
function drawMapObstacles(){ const own=MAP.obsRef===obstacles, x0=cam.x-80, x1=cam.x+W+80, y0=cam.y-80, y1=cam.y+H+80, m=cx.getTransform(), al=m.a===1&&m.d===1;
  const fx=al?m.e-Math.round(m.e):0, fy=al?m.f-Math.round(m.f):0;   // auf ganze Bildschirmpixel ausrichten (kein Resampling)
  if(own) for(const g of MAP.groups){ if(!g.img||g.bx>x1||g.by>y1||g.bx+g.bw<x0||g.by+g.bh<y0)continue; const ix0=Math.max(g.bx,Math.floor(cam.x-30)), iy0=Math.max(g.by,Math.floor(cam.y-30)), iw=Math.min(g.bx+g.bw,Math.ceil(cam.x+W+30))-ix0, ih=Math.min(g.by+g.bh,Math.ceil(cam.y+H+30))-iy0;
    if(iw>0&&ih>0) cx.drawImage(g.img,ix0-g.bx,iy0-g.by,iw,ih,ix0-fx,iy0-fy,iw,ih); if(g.style==='cauldron')mapCauldronLive(g); if(g.flames)for(const f of g.flames)mapFlame(f[0],f[1]); }
  for(const ob of obstacles){ if(own&&ob.grp!=null)continue; if(ob.x<x0||ob.x>x1||ob.y<y0||ob.y>y1)continue; if(ob.brk)drawBreakable(ob); else drawObstacle(ob); } }
/* Kerzenflamme (live, flackert): 2×3 bis 2×4 Spielpixel auf dem Raster, schwacher Schein */
function mapFlame(x,y){ const t=G.uiTime, fl=0.5+Math.sin(t*8+x)*0.3+Math.sin(t*19+y)*0.1;
  cx.fillStyle='rgba(255,170,80,'+(0.07*fl)+')'; cx.beginPath(); cx.arc(x,y,9,0,TAU); cx.fill();
  cx.fillStyle=PX_PAL.k; cx.fillRect(x-1,y-2-(fl>0.55?2:0),2,4+(fl>0.55?2:0)); cx.fillStyle=PX_PAL.y; cx.fillRect(x-1,y,2,2); }
function mapCauldronLive(g){ const t=G.uiTime, f=0.5+Math.sin(t*9+g.x)*0.25+Math.sin(t*23+g.y)*0.15;
  cx.save(); cx.globalAlpha=0.16+f*0.12; cx.fillStyle='#e07a2f'; cx.beginPath(); cx.ellipse(g.x,g.y+g.r*0.85,g.r*1.05,g.r*0.3,0,0,TAU); cx.fill();
  cx.globalAlpha=0.7; const k=Math.floor(t*3+g.x)%4; cx.fillStyle=PX_PAL.b; cx.fillRect(mapEven(g.x+[-10,8,-2,12][k]),mapEven(g.y-6+[0,6,10,-4][k]),2,2); cx.restore(); }
/* Zerstörbares: Pixelfigur (idle, ab halbem Schaden dmg), Treffer = weiße Silhouette + Wackeln */
function drawBreakable(ob){ const P=PX_TILE.props[ob.type]||PX_TILE.props.crate, hit=G.uiTime-(ob.hitAt||-9)<0.12, wob=hit?(Math.sin(G.uiTime*70)>0?PX_S:-PX_S):0, dmg=1-ob.hp/ob.maxHp;
  cx.fillStyle='rgba(0,0,0,.36)'; const x=mapEven(ob.x), y=mapEven(ob.y), r=mapEven(ob.r);
  cx.fillRect(x-r+4,y+r-4,2*r-4,4); cx.fillRect(x-r+8,y+r,2*r-12,2);
  if(ob.type==='barrel'){ const p=0.5+Math.sin(G.uiTime*3+ob.seed)*0.5; cx.fillStyle='rgba(155,191,58,'+(0.05+p*0.06)+')'; cx.beginPath(); cx.arc(ob.x,ob.y,ob.r*2,0,TAU); cx.fill(); }
  pxDraw(cx,P,dmg>=0.5&&P.frames.dmg?'dmg':'idle',0,x+wob,y,{white:hit});
  if(ob.type==='poorbox'){ const p=0.5+Math.sin(G.uiTime*4+ob.seed)*0.5; if(p>0.7){ cx.fillStyle=PX_PAL.y; cx.fillRect(x+2,y-10,2,2); } } }

/* =========================================================================
   BODEN + RAND je Region: Kacheln aus PX_TILE, einmal pro Station in MAP.floor gebacken
   Raster: 32 Spielpixel je Kachel ab ROOM.x/ROOM.y. Eigener Zufall (der Spielzufall bleibt unberührt).
   Reihenfolge: Saum (edge) → Bodenkacheln (Wege/Rinnen/Flächen aus Vorlagen) → Auflagen → Abdunklung (dim) → Bodenfiguren (Kerzen) → Lichter → Innenkante
   ========================================================================= */
const MAP_TS=16*PX_S;
function mapRng(seed){ let a=seed|0; return ()=>{ a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function mapSoft(c,x,y,r,col,a){ const g=c.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,col); g.addColorStop(1,'rgba(0,0,0,0)'); c.globalAlpha=a; c.fillStyle=g; c.fillRect(x-r,y-r,r*2,r*2); c.globalAlpha=1; }
function mapLight(x,y,r,col,a,live){ MAP.lights.push({x,y,r,col,a}); if(live)MAP.live.push({k:live,x:mapEven(x),y:mapEven(y)}); }
/* gedrehte Kachel (90°, an der Diagonale gespiegelt), zwischengespeichert */
function mapPxT(def){ if(def._t)return def._t; const r=def.frames.idle[0], t=[]; for(let x=0;x<def.w;x++){ let s=''; for(let y=0;y<def.h;y++)s+=r[y][x]; t.push(s); }
  return def._t=Object.assign({},def,{w:def.h,h:def.w,frames:{idle:[t]},_t:null}); }
/* Wege aus Kacheln (Laufrost, Rinne): Zufallslauf über Zellen, waagrechte Stücke def, senkrechte gedreht */
function mapTileWalk(F,def,len){ let i=Math.floor(F.rnd()*F.nx), j=Math.floor(F.rnd()*F.ny), h=F.rnd()<0.6;
  for(let s=0;s<len;s++){ if(i<0||j<0||i>=F.nx||j>=F.ny)break; F.cell[j*F.nx+i]=h?def:mapPxT(def);
    if(F.rnd()<0.18&&s>2){ h=!h; } if(h)i+=1; else j+=1; } }
/* Bodenfelder aus Vorlagen (MAP.decals): Kreis oder Rechteck aus Kacheln; p = Anteil der Zellen, over = als Auflage */
function mapDecals(F){ for(const d of MAP.decals||[]){ const tiles=d.tiles.map(t=>typeof t==='string'?F.R.sprites[t]:t).filter(Boolean); if(!tiles.length)continue;
  for(let j=0;j<F.ny;j++)for(let i=0;i<F.nx;i++){ const x=ROOM.x+(i+.5)*MAP_TS, y=ROOM.y+(j+.5)*MAP_TS;
    const inn=d.R!=null?Math.hypot(x-d.x,y-d.y)<d.R&&(d.R0==null||Math.hypot(x-d.x,y-d.y)>=d.R0):x>=d.x0&&x<d.x1&&y>=d.y0&&y<d.y1; if(!inn||(d.p!=null&&F.rnd()>d.p))continue;
    let t=tiles[Math.floor(F.rnd()*tiles.length)]; if(d.vert)t=mapPxT(t); if(d.over)F.over.push([i,j,t]); else F.cell[j*F.nx+i]=t; } } }
const MAP_FLOOR=[
  /* Gräben: Laufroste, Hülsen, Helme, Knochen; Laternen */
  F=>{ const A=ROOM.w*ROOM.h; for(let k=0;k<1+Math.round(A/1400000);k++) mapTileWalk(F,F.R.duck,8+Math.floor(F.rnd()*12));
    F.deco(0.035,[0,0,1,2]); for(let i=0;i<2+A/600000;i++){ const p=F.spot(80); mapLight(p[0],p[1],120,'rgba(255,190,110,1)',0.09,'lantern'); } },
  /* Katakomben: Grabplatten (deckend), Schädel/Knochen, Kerzengruppen */
  F=>{ const A=ROOM.w*ROOM.h; F.cells(0.035,F.R.deco[0]); F.deco(0.04,[1,2]);
    for(let i=0;i<A/90000;i++){ const p=F.spot(30); F.figs.push([F.R.wall.candles,p[0],p[1],1]); mapLight(p[0],p[1]-6,90,'rgba(255,170,90,1)',0.13); } },
  /* Lazarett: Schachbrett, Abflüsse, Blut, Verbände, Schleifspuren; kaltes Licht */
  F=>{ const A=ROOM.w*ROOM.h; F.deco(0.025,[1,1,2,3]); for(let i=0;i<2+A/500000;i++){ const p=F.spot(60); F.over.push([Math.floor((p[0]-ROOM.x)/MAP_TS),Math.floor((p[1]-ROOM.y)/MAP_TS),F.R.deco[0]]); }
    for(let i=0;i<2+A/450000;i++){ const p=F.spot(100); mapLight(p[0],p[1],170,'rgba(170,205,190,1)',0.06); } },
  /* Schlachthof: rote Fliesen, Blutrinne quer durch den Raum, Gitterroste, Blutlachen */
  F=>{ const A=ROOM.w*ROOM.h; for(let k=0;k<1+(A>1.6e6?1:0);k++){ const hz=F.rnd()<0.6, n=hz?F.nx:F.ny, at=Math.floor((hz?F.ny:F.nx)*(0.25+F.rnd()*0.5));
      for(let s=0;s<n;s++){ const i=hz?s:at, j=hz?at:s; F.cell[j*F.nx+i]=hz?F.R.gutter:mapPxT(F.R.gutter); } }
    F.cells(0.012,F.R.deco[0]); F.deco(0.03,[1]); for(let i=0;i<1+A/600000;i++){ const p=F.spot(100); mapLight(p[0],p[1],150,'rgba(255,170,110,1)',0.07); } },
  /* Golgotha: Fels, Asche, Glutrisse (Glut flackert live), Knochen, Nägel */
  F=>{ F.deco(0.03,[0,0,1,2,3]); },
];
/* Innenkante: Schattenstreifen + schmale goldene Linie (Raumgrenze bleibt deutlich) */
function mapRoomEdge(c){ const R=ROOM, d=28;
  for(const [x,y,w,h,gx0,gy0,gx1,gy1] of [[R.x,R.y,R.w,d,0,R.y,0,R.y+d],[R.x,R.y+R.h-d,R.w,d,0,R.y+R.h,0,R.y+R.h-d],[R.x,R.y,d,R.h,R.x,0,R.x+d,0],[R.x+R.w-d,R.y,d,R.h,R.x+R.w,0,R.x+R.w-d,0]]){
    const g=c.createLinearGradient(gx0,gy0,gx1,gy1); g.addColorStop(0,'rgba(0,0,0,.5)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(x,y,w,h); }
  c.fillStyle='rgba(0,0,0,.7)'; c.fillRect(R.x-4,R.y-4,R.w+8,2); c.fillRect(R.x-4,R.y+R.h+2,R.w+8,2); c.fillRect(R.x-4,R.y-4,2,R.h+8); c.fillRect(R.x+R.w+2,R.y-4,2,R.h+8);
  c.fillStyle='rgba(184,137,59,.55)'; c.fillRect(R.x-2,R.y-2,R.w+4,2); c.fillRect(R.x-2,R.y+R.h,R.w+4,2); c.fillRect(R.x-2,R.y,2,R.h); c.fillRect(R.x+R.w,R.y,2,R.h); }
/* Maßstab s=1: Kacheln werden 1:1 gebacken und ganzzahlig kopiert (kein Verschmieren). Größte Welt: 2500×1600 × „Weite Welt“ 1,45
   = 3625×2320 ≈ 8,4 Mpx ≈ 34 MB (vorher bei s≈0,79 ≈ 21 MB). Nur oberhalb von 16 Mpx (heute nicht erreichbar) halbiert. */
function mapPaintFloor(region){ const s=WORLD.w*WORLD.h>16e6?0.5:1;
  const cv=MAP.floor||(MAP.floor=document.createElement('canvas')); cv.width=Math.ceil(WORLD.w*s); cv.height=Math.ceil(WORLD.h*s);
  const c=cv.getContext('2d'); c.setTransform(s,0,0,s,0,0); c.imageSmoothingEnabled=false; MAP.fs=s; MAP.live=[]; MAP.lights=[];
  c.fillStyle='#050507'; c.fillRect(0,0,WORLD.w,WORLD.h);
  const R=mapPxReg(), rnd=mapRng(Math.random()*4294967296), nx=Math.ceil(ROOM.w/MAP_TS), ny=Math.ceil(ROOM.h/MAP_TS), A=ROOM.w*ROOM.h;
  const F={R,rnd,nx,ny,cell:new Array(nx*ny),over:[],figs:[],region,
    spot:m=>[mapEven(ROOM.x+m+rnd()*(ROOM.w-2*m)),mapEven(ROOM.y+m+rnd()*(ROOM.h-2*m))],
    cells:(p,def)=>{ for(let k=0;k<nx*ny;k++) if(rnd()<p)F.cell[k]=def; },
    deco:(p,idx)=>{ for(let j=0;j<ny;j++)for(let i=0;i<nx;i++) if(rnd()<p)F.over.push([i,j,R.deco[idx[Math.floor(rnd()*idx.length)]]]); }};
  const fw=R.fw||R.floor.map(()=>1), fs=fw.reduce((a,b)=>a+b,0);
  for(let k=0;k<nx*ny;k++){ let q=rnd()*fs, t=0; while(t<fw.length-1&&q>=fw[t]){ q-=fw[t]; t++; } F.cell[k]=R.floor[t]; }
  MAP_FLOOR[MAP.ri](F); mapDecals(F);
  /* Saum: Muster der Region über die ganze Welt, der Raum wird darüber gelegt */
  for(let y=ROOM.y-MAP_TS*2;y<WORLD.h;y+=MAP_TS)for(let x=ROOM.x-MAP_TS*2;x<WORLD.w;x+=MAP_TS) pxDraw(c,R.edge,'idle',0,x,y);
  c.fillStyle='rgba(0,0,0,.38)'; c.fillRect(0,0,WORLD.w,WORLD.h);
  c.save(); c.beginPath(); c.rect(ROOM.x,ROOM.y,ROOM.w,ROOM.h); c.clip();
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++) pxDraw(c,F.cell[j*nx+i],'idle',0,ROOM.x+i*MAP_TS,ROOM.y+j*MAP_TS);
  for(const [i,j,d] of F.over){ pxDraw(c,d,'idle',0,ROOM.x+i*MAP_TS,ROOM.y+j*MAP_TS); if(d.ember)MAP.live.push({k:'ember',x:ROOM.x+i*MAP_TS+d.ember[0]*PX_S+1,y:ROOM.y+j*MAP_TS+d.ember[1]*PX_S+1}); }
  c.fillStyle='rgba(0,0,0,'+(R.dim||0.5)+')'; c.fillRect(ROOM.x,ROOM.y,ROOM.w,ROOM.h); c.restore();
  for(const [d,x,y,cand] of F.figs){ pxDraw(c,d,'idle',0,x,y); if(cand)for(const t of PX_CANDLE_TIPS)MAP.live.push({k:'candle',x:x+(t[0]-d.ax)*PX_S,y:y+(t[1]-d.ay)*PX_S-2}); }
  for(const g of MAP.groups){ if(g.style==='cauldron')mapLight(g.x,g.y,g.r*3,'rgba(240,120,50,1)',0.16); else if(g.style==='lamp')mapLight(g.x,g.y,120,'rgba(185,215,200,1)',0.11);
    if(g.flames&&g.flames.length)mapLight(g.flames[0][0]/2+g.flames[g.flames.length-1][0]/2,g.flames[0][1],110,'rgba(255,170,90,1)',0.14); }
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
    if(d.k==='candle') mapFlame(d.x,d.y);
    else if(d.k==='lantern'){ cx.fillStyle='rgba(255,180,90,'+(0.08*fl)+')'; cx.beginPath(); cx.arc(d.x,d.y,22,0,TAU); cx.fill();
      cx.fillStyle=PX_PAL['0']; cx.fillRect(d.x-6,d.y-8,12,16); cx.fillStyle=PX_PAL.w; cx.fillRect(d.x-4,d.y-6,8,12); cx.fillStyle=fl>0.5?PX_PAL.k:PX_PAL.G; cx.fillRect(d.x-2,d.y-4,4,6); cx.fillStyle=PX_PAL.s; cx.fillRect(d.x-2,d.y-10,4,2); }
    else if(d.k==='ember'){ cx.fillStyle='rgba(240,110,40,'+(0.12+fl*0.12)+')'; cx.fillRect(d.x-3,d.y-3,6,6); cx.fillStyle=fl>0.55?PX_PAL.k:PX_PAL.O; cx.fillRect(d.x-1,d.y-1,2,2); } } }
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
