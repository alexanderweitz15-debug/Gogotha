"use strict";
/* GOLGOTHA — Zusammenfassung am Ende eines Laufs (Game-Over- und Gipfel-Bildschirm)
   Schaden je Quelle aus G.run.dmg (wie das F3-Overlay), Kills je Waffe, Zeit, Gold, und je Spieler Figur, Waffen,
   Gegenstände, Reliquien, Fähigkeiten. Hängt sich an renderGameOver/renderEndless, die applyLang beim Sprachwechsel aufruft. */
Object.assign(I18N.de,{
  sum_dmg:'Schaden je Quelle', sum_time:'Spielzeit', sum_gold:'Gold gesammelt', sum_bosses:'Bosse', sum_total:'Gesamt',
  sum_build:'Figur & Ausrüstung', sum_nodmg:'Kein Schaden verursacht.', sum_more:'+ {n} weitere', sum_diff:'Grad', sum_curse:'Fluch',
});
Object.assign(I18N.en,{
  sum_dmg:'Damage by source', sum_time:'Play time', sum_gold:'Gold gathered', sum_bosses:'Bosses', sum_total:'Total',
  sum_build:'Character & gear', sum_nodmg:'No damage dealt.', sum_more:'+ {n} more', sum_diff:'Diff', sum_curse:'Curse',
});
const Summary=(()=>{
  const MAX_ROWS=10;
  const fmtTime=s=>{ s=Math.max(0,Math.round(s||0)); const h=Math.floor(s/3600), m=Math.floor(s/60)%60, x=s%60; return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0'); };
  const fmtNum=n=>Math.round(n).toLocaleString(LANG==='en'?'en-US':'de-DE');
  const chip=(l,v)=>'<span class="sum-chip">'+l+' <b>'+v+'</b></span>';
  /* Schaden je Quelle als Balken; Waffen-Kills aus G.run.weaponKills, sonst die Kills der Quelle */
  function dmgHtml(run){ const d=run.dmg||{}, wk=run.weaponKills||{};
    const rows=Object.keys(d).map(k=>({k,d:d[k].d||0,n:weaponById(k)&&wk[k]!=null?wk[k]:(d[k].k||0)})).filter(r=>r.d>0||r.n>0).sort((a,b)=>b.d-a.d||b.n-a.n);
    if(!rows.length) return '<div class="sum-empty">'+t('sum_nodmg')+'</div>';
    const tot=rows.reduce((s,r)=>s+r.d,0)||1, top=rows[0].d||1;
    const row=r=>{ const w=weaponById(r.k), col=w?w.color:'var(--gold)', pct=r.d/tot*100;
      return '<div class="sum-row"><span class="sum-n">'+(w?svgIcon(w.ic,w.color,13):'<i class="sum-dot"></i>')+'<span>'+srcName(r.k)+'</span></span>'+
        '<span class="sum-bar"><i style="width:'+Math.max(1.5,r.d/top*100).toFixed(1)+'%;background:'+col+'"></i></span>'+
        '<span class="sum-v"><b>'+pct.toFixed(1)+'%</b> '+fmtNum(r.d)+'</span><span class="sum-k">'+r.n+' ✝</span></div>'; };
    let h=rows.slice(0,MAX_ROWS).map(row).join('');
    if(rows.length>MAX_ROWS){ const rest=rows.slice(MAX_ROWS); h+='<div class="sum-row sum-rest"><span class="sum-n"><span>'+t('sum_more',{n:rest.length})+'</span></span><span></span>'+
      '<span class="sum-v"><b>'+(rest.reduce((s,r)=>s+r.d,0)/tot*100).toFixed(1)+'%</b></span><span class="sum-k">'+rest.reduce((s,r)=>s+r.n,0)+' ✝</span></div>'; }
    return h+'<div class="sum-row sum-tot"><span class="sum-n"><span>Σ '+t('sum_total')+'</span></span><span></span><span class="sum-v"><b>'+fmtNum(tot)+'</b> · '+(tot/Math.max(1,G.time)).toFixed(1)+' DPS</span><span class="sum-k">'+rows.reduce((s,r)=>s+r.n,0)+' ✝</span></div>'; }
  /* Bau eines Spielers: Figur mit Stärken/Schwächen, Waffen (Stufe, Kills), Gegenstände, Reliquien, Fähigkeiten */
  function playerHtml(p,i,run){ const ch=charById(p.charId), wk=run.weaponKills||{};
    const tag=players.length>1?'<span class="sum-ptag">'+t('coop_player')+' '+(i+1)+'</span> ':'';
    const wl=p.weapons.map(id=>{ const w=weaponById(id); if(!w)return ''; const n=wk[id]||0;
      return '<span class="sum-w">'+svgIcon(w.ic,w.color,13)+'<span style="color:'+rarColor(w.rk)+'">'+w.name+'</span> <em>'+t('lvl_short')+((p.wLevel[id]||0)+1)+'</em>'+(n?' <em>'+n+' ✝</em>':'')+'</span>'; }).join('');
    const il=Object.keys(p.itemsOwned||{}).map(id=>{ const it=itemById(id); return it?'<span style="color:'+rarColor(it.rk)+'">'+it.name+(p.itemsOwned[id]>1?' ×'+p.itemsOwned[id]:'')+'</span>':''; }).filter(Boolean);
    const rl=Object.keys(p.relics||{}).map(id=>{ const r=relicById(id); return r?'<span style="color:var(--gold2)">'+r.name+'</span>':''; }).filter(Boolean);
    const al=(p.abilities||[]).map(a=>'<span style="color:'+rarColor(a.rk)+'">'+a.name+(a.level>1?' '+t('lvl_short')+a.level:'')+'</span>');
    const line=(l,arr)=>arr.length?'<div class="sum-line"><span class="sum-l">'+l+'</span> '+arr.join(' · ')+'</div>':'';
    return '<div class="sum-player">'+
      '<div class="sum-who">'+tag+'<b>'+ch.name+'</b> <span class="sum-role">'+(ch.role||'')+'</span> · '+t('hud_level')+' <b>'+p.level+'</b>'+(p.dead?' <span class="sum-dead">'+t('coop_dead')+'</span>':'')+'</div>'+
      (typeof charPerkHtml==='function'?charPerkHtml(p.charId):'')+
      '<div class="sum-weps">'+wl+'</div>'+line(t('items_label'),il)+line(t('relics_label'),rl)+line(t('abilities_label'),al)+'</div>'; }
  function html(){ const run=G.run; if(!run||!players.length) return '';
    const chips=chip(t('sum_time'),fmtTime(G.time))+chip(t('sum_gold'),fmtNum(run.gold||0))+chip(t('hud_kills'),fmtNum(G.kills))+chip(t('sum_bosses'),run.bossKills||0)+
      (G.diff?chip(t('sum_diff'),'<span style="color:'+G.diff.color+'">'+diffName(G.diff)+'</span>'):'')+(G.activeCurse?chip(t('sum_curse'),'<span style="color:#e0405f">'+G.activeCurse.name+'</span>'):'');
    return '<div class="sum-chips">'+chips+'</div>'+
      '<div class="sum-box"><div class="sum-h">'+t('sum_dmg')+'</div>'+dmgHtml(run)+'</div>'+
      '<div class="sum-box"><div class="sum-h">'+t('sum_build')+'</div>'+players.map((p,i)=>playerHtml(p,i,run)).join('')+'</div>'; }
  /* Container hinter die Kurzwerte der Endbildschirme setzen */
  function box(id,after){ let el=$('#'+id); if(!el){ el=document.createElement('div'); el.id=id; el.className='sum'; const a=$('#'+after); a.parentNode.insertBefore(el,a.nextSibling); } return el; }
  function fill(id,after){ try{ box(id,after).innerHTML=html(); }catch(e){ box(id,after).innerHTML=''; } }
  return {html,fill};
})();
(()=>{ const _go=renderGameOver, _end=renderEndless;
  renderGameOver=function(){ const r=_go.apply(this,arguments); Summary.fill('goSummary','goStats'); return r; };
  renderEndless=function(){ const r=_end.apply(this,arguments); Summary.fill('endSummary','endlessStats'); return r; };
})();
