// Race Ahead · Evolve demo. Data: window.EVOLVE_DEMO (scripts/evolve/demo_export.py).
// Keys: Space plays the lap, ←/→ step rounds. index.html?video hides scrollbars; window.DEMO drives the page frame by frame for the video.
(()=>{
const D=window.EVOLVE_DEMO,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const el=(tag,attrs={},parent)=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(parent)parent.appendChild(e);return e};
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length,fmt=(v,d=1)=>(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(d);
const esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const VIDEO=new URLSearchParams(location.search).has('video');if(VIDEO)document.body.classList.add('video');

/* views */
const views=['race','learn','branches','growth'];let view='race';
function show(v){view=views.includes(v)?v:'race';
  for(const x of views)$(x).hidden=x!==view;document.querySelectorAll('nav a').forEach(a=>a.setAttribute('aria-current',a.dataset.view===view?'page':'false'));
  if(view==='growth')growth();if(view==='learn')curve();if(view==='branches')lineage();}
addEventListener('hashchange',()=>show(location.hash.slice(1)));

/* ---------- RACE ---------- */
const G=D.geometry,L=G.length,laps=D.laps,F=laps.evolved.fields,fi=k=>F.indexOf(k);
const KARTS=[['evolved','--fast','Champion'],['seed','--ghost','Round 0'],['oracle','--oracle','Oracle']];
function normals(){const P=G.centre,n=P.length;return P.map((_,i)=>{const a=P[(i-1+n)%n],b=P[(i+1)%n];let tx=b[0]-a[0],tz=b[1]-a[1];const l=Math.hypot(tx,tz)||1;tx/=l;tz/=l;return[tz,-tx]})}
const N=normals();
function at(s,lat){s=((s%L)+L)%L;const i=Math.min(G.s.length-2,Math.max(0,Math.floor(s/(G.s[1]-G.s[0]))));const u=(s-G.s[i])/((G.s[i+1]-G.s[i])||1);
  const P=G.centre,a=P[i],b=P[i+1],na=N[i],nb=N[i+1];const cx=a[0]+(b[0]-a[0])*u,cz=a[1]+(b[1]-a[1])*u,nx=na[0]+(nb[0]-na[0])*u,nz=na[1]+(nb[1]-na[1])*u;
  return[cx+nx*lat,cz+nz*lat]}
function sample(lap,t){const T=lap.trace;let lo=0,hi=T.length-1;if(t<=T[0][0])return T[0];if(t>=T[hi][0])return T[hi];
  while(hi-lo>1){const m=(lo+hi)>>1;(T[m][0]<=t?lo=m:hi=m)}const a=T[lo],b=T[hi],u=(t-a[0])/((b[0]-a[0])||1);
  return a.map((x,k)=>k===fi('s')&&Math.abs(b[k]-x)>L/2?x:x+(b[k]-x)*u)}
const prog=(lap,t)=>{if(t>=lap.lap_s)return L;let s=((sample(lap,t)[fi('s')]%L)+L)%L;if(t<5&&s>L/2)s=0;return s};
const tEnd=Math.max(...Object.values(laps).map(l=>l.lap_s));
let kart={},secHL;
function sprite(c,k,parent){const g=el('g',{class:'px'},parent),u=3.4*k;   // a tiny pixel kart, nose along +x
  for(const[x,y,w,h,f]of[[-3,-2,6,4,c],[3,-1,1,2,c],[-3,-3,2,1,'#0b0f14'],[1,-3,2,1,'#0b0f14'],[-3,2,2,1,'#0b0f14'],[1,2,2,1,'#0b0f14'],[-1,-1,2,2,'#0b0f14']])
    el('rect',{x:x*u,y:y*u,width:w*u,height:h*u,fill:f},g);return g}
function drawMap(){const svg=$('map');svg.innerHTML='';const P=G.centre;
  const edge=side=>P.map((p,i)=>[p[0]+N[i][0]*side*G.width[i]/2,p[1]+N[i][1]*side*G.width[i]/2]);
  const all=[...edge(1),...edge(-1)],xs=all.map(p=>p[0]),zs=all.map(p=>p[1]);const pad=30,minx=Math.min(...xs)-pad,minz=Math.min(...zs)-pad,w=Math.max(...xs)-minx+pad,h=Math.max(...zs)-minz+pad;
  svg.setAttribute('viewBox',`${minx} ${minz} ${w} ${h}`);const k=Math.max(w,h)/700;
  const poly=pts=>pts.map(p=>p.join(',')).join(' ');
  el('polygon',{points:poly([...edge(1),...edge(-1).reverse()]),fill:css('--panel-2'),'fill-rule':'evenodd'},svg);
  for(const s of[1,-1])el('polygon',{points:poly(edge(s)),fill:'none',stroke:css('--rule'),'stroke-width':1.5*k},svg);
  // start / finish: chequered pixels
  {const[x0,z0]=at(0,-G.width[0]/2),[x1,z1]=at(0,G.width[0]/2),n=8;for(let i=0;i<n;i++)for(let j=0;j<2;j++){const u=i/n,[x,z]=[x0+(x1-x0)*u,z0+(z1-z0)*u];
    el('rect',{x:x+j*1.2,y:z,width:1.2,height:(G.width[0]/n),fill:(i+j)%2?'#fff':'#0b0f14',class:'px'},svg)}}
  secHL=el('polyline',{fill:'none',stroke:css('--fast'),'stroke-opacity':.22,'stroke-width':14*k,'stroke-linecap':'square'},svg);
  for(const sec of G.sections){if(sec.type!=='corner'&&!/^T/.test(sec.id))continue;const[x,z]=at(sec.s_start,0);
    const t=el('text',{x,y:z,fill:css('--chalk-3'),'font-size':12*k,'font-family':css('--f-pixel'),'text-anchor':'middle','dominant-baseline':'middle'},svg);t.textContent=sec.id;}
  const line=(lap,c,w,o,dash)=>{let seg=[],last=null;const flush=cc=>{if(seg.length>1)el('polyline',{points:poly(seg),fill:'none',stroke:cc,'stroke-width':(cc===css('--slow')?3:w)*k,'stroke-opacity':cc===css('--slow')?.95:o,'stroke-linejoin':'round',...(dash?{'stroke-dasharray':`${3*k} ${3*k}`}:{})},svg)};
    for(const r of lap.trace){if(r[fi('speed')]<1)continue;const d=lap===laps.evolved&&r[fi('skidding')]>.5?css('--slow'):c;const p=at(r[fi('s')],r[fi('lateral_m')]);
      if(last!==null&&last!==d){seg.push(p);flush(last);seg=[p]}else seg.push(p);last=d}flush(last)};
  line(laps.oracle,css('--oracle'),1.1,.35,true);line(laps.evolved,css('--fast'),1.6,.55);
  for(const[name,c]of[...KARTS].reverse())kart[name]=sprite(css(c),k,svg);
  const b=$('lapBoard');b.innerHTML=KARTS.map(([n,c,l])=>`<span class="n" style="color:var(${c})">${l}</span><span class="v" id="lt_${n}">—</span>`).join('');}
function secOf(s){return G.sections.find(x=>s>=x.s_start&&s<x.s_end)||G.sections[G.sections.length-1]}
function rail(){const tl=$('timeline');tl.innerHTML='';const se=Object.fromEntries(laps.seed.sections.map(x=>[x.id,x]));
  for(const sec of laps.evolved.sections){const r=document.createElement('div');r.className='trow';r.dataset.id=sec.id;
    const what=Object.values(sec.choice||{}).map(a=>String(a).toLowerCase().replace(/_/g,' ')).join(' · ');
    const d=se[sec.id]&&sec.time_s!=null&&se[sec.id].time_s!=null?sec.time_s-se[sec.id].time_s:null;
    r.innerHTML=`<span class="id">${sec.id}</span><span class="what">${esc(what)}</span><span class="d" style="color:${d==null?'':d<-.05?css('--faster'):d>.05?css('--slower'):css('--chalk-3')}">${d==null?'':fmt(d,2)+' s'}</span>`;tl.appendChild(r);}}
function chips(id){const sec=laps.evolved.sections.find(x=>x.id===id);const c=$('chips');if(c.dataset.id===id)return;c.dataset.id=id;c.innerHTML='';if(!sec)return;
  for(const[q,a]of Object.entries(sec.choice||{})){const def=(sec.advice||{})[q]??D.questions[q]?.default;
    const d=document.createElement('div');d.className='chip'+(a!==def?' own':'');d.innerHTML=`<span class="q">${esc(q.replace(/_/g,' '))}</span><span class="a">${esc(a)}</span>`;c.appendChild(d);}
  const g=G.sections.find(x=>x.id===id);$('sgeo').textContent=g?`${g.type==='corner'||/^T/.test(id)?'corner':'straight'} · ${Math.round(g.s_end-g.s_start)} m`:'';}
let cursors={};
function speedChart(){const svg=$('speed');svg.innerHTML='';const W=1000,H=150;svg.setAttribute('viewBox',`0 0 ${W} ${H}`);const x=s=>s/L*W,y=v=>H-6-(H-14)*v/40;
  for(const v of[10,20,30,40])el('line',{x1:0,x2:W,y1:y(v),y2:y(v),stroke:css('--rule'),'stroke-dasharray':'2 4','vector-effect':'non-scaling-stroke'},svg);
  const line=(lap,c,w,dash)=>{const pts=[];let prev=-1;for(const r of lap.trace){const s=((r[fi('s')]%L)+L)%L;if(pts.length===0&&(r[fi('speed')]<.5||s>L/2))continue;if(s<prev-L/2)break;prev=s;pts.push(`${x(s).toFixed(1)},${y(r[fi('speed')]).toFixed(1)}`)}
    el('polyline',{points:pts.join(' '),fill:'none',stroke:c,'stroke-width':w,'vector-effect':'non-scaling-stroke','stroke-linejoin':'round',...(dash?{'stroke-dasharray':'4 3'}:{})},svg)};
  line(laps.seed,css('--ghost'),1.4);line(laps.oracle,css('--oracle'),1.2,true);line(laps.evolved,css('--fast'),2.2);
  for(const[n,c]of KARTS)cursors[n]=el('rect',{y:0,height:H,width:3,fill:css(c),'fill-opacity':.8,class:'px'},svg);}
let t=0,playing=false,lastFrame=0;
function render(){let lead=0;
  for(const[n]of KARTS){const lap=laps[n],r=sample(lap,Math.min(t,lap.lap_s)),p=at(r[fi('s')],r[fi('lateral_m')]);
    const a=at(r[fi('s')]+2,r[fi('lateral_m')]),ang=Math.atan2(a[1]-p[1],a[0]-p[0])*180/Math.PI;kart[n].setAttribute('transform',`translate(${p[0]},${p[1]}) rotate(${ang})`);
    const g=prog(lap,t);cursors[n].setAttribute('x',g/L*1000-1.5);$('lt_'+n).textContent=t>=lap.lap_s?lap.lap_s.toFixed(2)+' s':Math.max(0,t).toFixed(2);
    $('lt_'+n).style.color=t>=lap.lap_s?css(KARTS.find(k=>k[0]===n)[1]):'';if(n==='evolved')lead=g;}
  $('clock').textContent=Math.max(0,t).toFixed(2);
  const sec=secOf(Math.min(lead,L-.01));$('sid').textContent=sec.id;chips(sec.id);
  document.querySelectorAll('.trow').forEach(r=>{const on=r.dataset.id===sec.id;r.classList.toggle('cur',on);if(on&&(playing||VIDEO)){const tl=$('timeline');tl.scrollTop=Math.max(0,r.offsetTop-tl.offsetTop-tl.clientHeight/2)}});
  const pts=[];for(let s=sec.s_start;s<=sec.s_end;s+=4)pts.push(at(s,0).join(','));secHL.setAttribute('points',pts.join(' '));
  $('scrub').value=Math.round(t/tEnd*1000);}
function loop(ts){if(!playing)return;if(lastFrame)t=Math.min(tEnd,t+(ts-lastFrame)/1000);lastFrame=ts;render();if(t>=tEnd){setPlay(false);return}requestAnimationFrame(loop)}
function setPlay(on){playing=on;$('play').setAttribute('aria-pressed',on);$('play').textContent=on?'Pause':'Play';lastFrame=0;if(on){if(t>=tEnd)t=0;requestAnimationFrame(loop)}}
$('play').onclick=()=>setPlay(!playing);$('scrub').oninput=e=>{t=e.target.value/1000*tEnd;render()};
$('trackName').textContent=`${D.track} · a track none of them trained on`;
$('lapInfo').textContent=`champion ${laps.evolved.lap_s.toFixed(1)} s · round 0 ${laps.seed.lap_s.toFixed(1)} s · oracle ${laps.oracle.lap_s.toFixed(1)} s`;

/* ---------- LEARN ---------- */
const R=D.rounds;let cur=R.findIndex(r=>r.outcome==='adopted');if(cur<0)cur=0;let focus=null,open=new Set();
const OUT={adopted:['adopted','--faster'],branch_merged:['branch merged','--best'],nothing_admitted:['nothing adopted','--chalk-3'],confirm_failed:['confirmation failed','--slower'],no_valid_proposal:['no valid proposal','--chalk-3'],
  branch_opened:['branch opened','--slow'],branch_not_improved:['branch repair · no gain','--slow'],branch_improved:['branch improved','--slow'],branch_merge_rejected:['merge rejected','--chalk-2'],branch_merge_blocked:['merge blocked','--chalk-2']};
const kindColor=r=>r.crash?'--slower':r.outcome==='adopted'?'--faster':r.outcome==='branch_merged'?'--best':r.branch?'--slow':'--chalk-3';
function curve(){const svg=$('curve'),bb=svg.getBoundingClientRect(),W=Math.max(600,bb.width),H=Math.max(140,bb.height);svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.innerHTML='';
  const Lm=64,Rm=24,T=14,B=26,n=R.length,x=i=>Lm+(W-Lm-Rm)*(i+.5)/n;
  const vals=R.map(r=>r.champion_s).concat(R.map(r=>r.new_s||r.champion_s)),hi=Math.ceil(Math.max(...vals)/50)*50,lo=Math.floor(Math.min(...vals)/50)*50-10,y=v=>T+(H-T-B)*(hi-Math.min(hi,v))/(hi-lo);
  for(let v=lo+10;v<=hi;v+=50){el('line',{x1:Lm,x2:W-Rm,y1:y(v),y2:y(v),stroke:css('--rule'),'stroke-dasharray':'2 4'},svg);el('text',{x:Lm-8,y:y(v)+4,'text-anchor':'end',fill:css('--chalk-3'),'font-size':11,'font-family':css('--f-data')},svg).textContent=v}
  // the champion as a step line
  let d='';R.forEach((r,i)=>{const a=r.champion_s,b=r.new_s||a;d+=(i?`H${x(i)-((W-Lm-Rm)/n)/2}V${y(a)}`:`M${x(0)-((W-Lm-Rm)/n)/2},${y(a)}`)+`H${x(i)}V${y(b)}`});d+=`H${W-Rm}`;
  el('path',{d,fill:'none',stroke:css('--fast'),'stroke-width':3,class:'px'},svg);
  const cw=Math.max(6,Math.min(16,(W-Lm-Rm)/n-4));
  R.forEach((r,i)=>{const c=css(kindColor(r)),yy=r.new_s?y(r.new_s):y(r.champion_s);const g=el('g',{style:'cursor:pointer'},svg);g.onclick=()=>select(i);
    if(i===cur)el('rect',{x:x(i)-cw/2-4,y:T-6,width:cw+8,height:H-T-B+10,fill:css('--chalk'),'fill-opacity':.08,stroke:css('--chalk'),'stroke-width':2,class:'px'},g);
    if(r.crash){const s=cw*.55;el('rect',{x:x(i)-s-2,y:yy-s-2,width:2*s+4,height:2*s+4,fill:css('--panel'),class:'px'},g);el('path',{d:`M${x(i)-s},${yy-s}l${2*s},${2*s}m0,${-2*s}l${-2*s},${2*s}`,stroke:c,'stroke-width':4,class:'px'},g);el('rect',{x:x(i)-cw/2,y:T,width:cw,height:H-T-B,fill:'transparent'},g);return}
    else if(r.candidate_s&&!r.new_s){const cy=y(Math.min(hi,r.candidate_s));el('rect',{x:x(i)-cw/4,y:Math.min(cy,yy),width:cw/2,height:Math.abs(cy-yy)||1,fill:c,'fill-opacity':.35,class:'px'},g)}
    el('rect',{x:x(i)-cw/2,y:yy-cw/2,width:cw,height:cw,fill:c,stroke:css('--panel'),'stroke-width':2,class:'px'},g);
    el('rect',{x:x(i)-cw/2,y:T,width:cw,height:H-T-B,fill:'transparent'},g);
    if((i+1)%5===0||i===0)el('text',{x:x(i),y:H-8,'text-anchor':'middle',fill:css('--chalk-3'),'font-size':11,'font-family':css('--f-data')},svg).textContent=i+1;});
  const first=R[0].champion_s,lastR=R.at(-1),end=lastR.new_s??lastR.champion_s;$('curveLbl').textContent=`run ${D.run} · 10 training tracks · ${first.toFixed(1)} → ${end.toFixed(1)} s · round ${R[cur].round} selected`;}
function meas(k,v){const c=v==null?css('--chalk-3'):v>.05?css('--faster'):v<-.05?css('--slower'):css('--chalk-3');return `<div class="m"><span class="k">${k}</span><span class="v" style="color:${c}">${v==null?'—':fmt(v,1)+' s'}</span></div>`}
function learn(){const r=R[cur];const o=OUT[r.outcome]||[r.outcome.replace(/_/g,' ').replace('+',' · '),r.branch?'--slow':'--chalk-3'];
  $('rOut').textContent=`Round ${r.round} · ${o[0]}`;$('rOut').style.color=css(r.crash?'--slower':o[1]);
  $('rTimes').textContent=r.new_s?`${r.champion_s.toFixed(1)} → ${r.new_s.toFixed(1)} s (${fmt(r.new_s-r.champion_s,1)})`:r.crash?`champion ${r.champion_s.toFixed(1)} s · candidate crashed`:r.candidate_s?`champion ${r.champion_s.toFixed(1)} s · ${r.branch?'branch':'candidate'} ${r.candidate_s.toFixed(1)} s`:`champion ${r.champion_s.toFixed(1)} s`;
  $('rHyp').textContent=r.hypothesis||'—';
  const al=[];if(r.crash)al.push(`<div class="alert"><b>crash</b>The candidate harness failed on ${r.crash_tracks} of 10 tracks; the error and traceback go back to the proposer next round.</div>`);
  for(const d of r.dropped.slice(0,2))al.push(`<div class="alert" style="border-color:var(--chalk-3)"><b style="color:var(--chalk-2)">rejected before the track</b>${esc(d.id)}: ${esc(d.reason)}</div>`);
  $('rAlerts').innerHTML=al.join('');
  const box=$('rItems');box.innerHTML='';
  if(r.merge_verdict){const d=document.createElement('div');d.className='item '+(r.merge_verdict.admit?'yes':'no');d.innerHTML=`<span class="nm">branch merge</span><span></span><div class="ver"><b style="color:${r.merge_verdict.admit?css('--faster'):css('--slower')}">${r.merge_verdict.admit?'merged':'rejected'}</b>${esc(r.merge_verdict.reason)}</div>`;box.appendChild(d)}
  const judged=r.items.some(i=>i.verdict);
  if(r.branch&&!judged&&!r.merge_verdict)box.insertAdjacentHTML('beforeend','<p class="hyp" style="color:var(--chalk-2);font-size:13px">Work on the open development branch: the branch is judged as a whole when it asks to merge.</p>');
  for(const it of r.items){const d=document.createElement('div');d.className='item'+(judged?it.admitted?' yes':' no':'')+(focus===it.id?' hl':'');d.dataset.id=it.id;
    d.innerHTML=`<span><span class="nm">${esc(it.id)}</span><span class="part">${esc(it.part.replace('_',' '))}</span></span><span></span>
      ${judged?`<div class="meas">${meas('all changes',it.all_s)}${meas('leave this out',it.loo_s)}${meas('this alone',it.alone_s)}</div>`:''}
      <div class="why">${esc(it.rationale)}</div>${judged?`<div class="ver"><b style="color:${it.admitted?css('--faster'):css('--slower')}">${it.admitted?'admitted':'rejected'}</b>${esc(it.verdict)}</div>`:''}`;
    if(it.diff){const pre=document.createElement('pre');pre.hidden=!open.has(it.id);pre.innerHTML=it.diff.split('\n').filter(l=>!/^(---|\+\+\+|@@)/.test(l)).map(l=>`<span class="${l[0]==='+'?'add':l[0]==='-'?'del':''}">${esc(l)}</span>`).join('\n');d.appendChild(pre);
      d.onclick=()=>{open.has(it.id)?open.delete(it.id):open.add(it.id);pre.hidden=!open.has(it.id)}}
    box.appendChild(d)}
  if(focus){const f=box.querySelector(`[data-id="${CSS.escape(focus)}"]`);if(f)box.scrollTop=Math.max(0,f.offsetTop-box.offsetTop-8)}else box.scrollTop=0;}
function select(i){cur=Math.max(0,Math.min(R.length-1,i));focus=null;open.clear();learn();curve()}
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;
  if(e.code==='Space'&&view==='race'){e.preventDefault();setPlay(!playing)}
  if(view==='learn'&&(e.key==='ArrowRight'||e.key==='ArrowLeft'))select(cur+(e.key==='ArrowRight'?1:-1))});
addEventListener('resize',()=>{if(view==='learn')curve();if(view==='branches')lineage()});

/* ---------- BRANCHES ---------- */
let bSel=D.branches.findIndex(b=>b.end==='merged');
function lineage(){const svg=$('lineage'),bb=svg.getBoundingClientRect(),W=Math.max(700,bb.width),H=Math.max(360,bb.height);svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.innerHTML='';
  const n=R.length,Lm=40,Rm=30,x=r=>Lm+(W-Lm-Rm)*(r-.5)/n,lanes=3,gap=Math.min(110,(H-150)/(lanes+.5)),mainY=Math.max(70,(H-40-gap*lanes)/2),laneY=k=>mainY+gap*(k+1);
  for(let r=5;r<=n;r+=5){el('line',{x1:x(r),x2:x(r),y1:mainY-30,y2:H-30,stroke:css('--rule'),'stroke-dasharray':'2 6'},svg);el('text',{x:x(r),y:H-10,'text-anchor':'middle',fill:css('--chalk-3'),'font-size':11,'font-family':css('--f-data')},svg).textContent=r}
  el('text',{x:Lm,y:H-10,fill:css('--chalk-3'),'font-size':10,'font-family':css('--f-pixel')},svg).textContent='ROUND';
  el('line',{x1:x(.5),x2:x(n+.5),y1:mainY,y2:mainY,stroke:css('--fast'),'stroke-width':6,class:'px'},svg);
  el('text',{x:x(.5),y:mainY-18,fill:css('--fast'),'font-size':11,'font-family':css('--f-pixel')},svg).textContent='CHAMPION';
  R.forEach(r=>{if(!r.new_s)return;const c=css(r.outcome==='branch_merged'?'--best':'--faster');el('rect',{x:x(r.round)-7,y:mainY-7,width:14,height:14,fill:c,stroke:css('--panel'),'stroke-width':2,class:'px'},svg);
    el('text',{x:x(r.round),y:mainY-14,'text-anchor':'middle',fill:css('--chalk-2'),'font-size':11,'font-family':css('--f-data')},svg).textContent=Math.round(r.new_s)});
  const busy=Array(lanes).fill(-1);
  D.branches.forEach((b,i)=>{const first=b.opened,last=b.rounds.at(-1)[0];let k=busy.findIndex(e=>e<first-0.5);if(k<0)k=i%lanes;busy[k]=last+1;const yy=laneY(k);
    const endC=css(b.end==='merged'?'--best':b.end==='dropped'?'--slower':b.end==='rejected'?'--chalk-3':'--slow'),sel=i===bSel;
    const g=el('g',{style:'cursor:pointer',opacity:bSel<0||sel?1:.55},svg);g.onclick=()=>{bSel=i;lineage()};
    el('path',{d:`M${x(first)},${mainY}V${yy}H${x(last)}`+(b.end==='merged'?`V${mainY}`:''),fill:'none',stroke:endC,'stroke-width':sel?5:3,class:'px'},g);
    for(const[r,cand,crash]of b.rounds){if(crash){const s=7;el('path',{d:`M${x(r)-s},${yy-s}l${2*s},${2*s}m0,${-2*s}l${-2*s},${2*s}`,stroke:css('--slower'),'stroke-width':4,class:'px'},g)}
      else el('rect',{x:x(r)-6,y:yy-6,width:12,height:12,fill:css('--panel'),stroke:endC,'stroke-width':3,class:'px'},g)}
    if(b.end==='dropped'||b.end==='rejected'){el('text',{x:x(last)+12,y:yy+5,fill:endC,'font-size':11,'font-family':css('--f-pixel')},g).textContent=b.end.toUpperCase()}
    el('rect',{x:x(first)-10,y:yy-16,width:x(last)-x(first)+20,height:32,fill:'transparent'},g);});
  const b=D.branches[bSel];$('linLbl').textContent=`run ${D.run} · ${D.branches.length} development branches · ${D.branches.filter(b=>b.end==='merged').length} merged`;
  if(b){const rows=b.rounds.map(([r,c,crash,o])=>`<div class="row"><span>round ${r} · ${esc((OUT[o.split('+')[0]]||[o.replace(/_/g,' ')])[0])}</span><span class="num" style="color:${crash?css('--slower'):''}">${crash?'crashed':c!=null?c.toFixed(1)+' s':'—'}</span></div>`).join('');
    $('bInfo').innerHTML=`<div class="bigline"><span class="out" style="color:${css(b.end==='merged'?'--best':b.end==='open'?'--slow':'--slower')}">${b.end}</span><span class="t">opened in round ${b.opened}</span></div>
      <p class="hyp" style="font-size:13.5px">${esc((R.find(r=>r.round===b.opened)||{}).hypothesis||'')}</p><div>${rows}</div>`;}}

/* ---------- GROWTH ---------- */
let grown=false;
function growth(){if(grown)return;grown=true;const res=D.results,runs=res.runs,o=res.oracle_test_s;
  const near=runs.filter(r=>r.test_s<230),starts=runs.map(r=>r.start_test_s),gaps=near.map(r=>r.gap_closed);
  $('stats').innerHTML=[[`${Math.min(...starts).toFixed(0)}–${Math.max(...starts).toFixed(0)} s`,`three crude starting harnesses, 4 unseen tracks (oracle ${o.toFixed(0)} s)`,''],
    [`${Math.min(...near.map(r=>r.test_s)).toFixed(0)}–${Math.max(...near.map(r=>r.test_s)).toFixed(0)} s`,`after 40 rounds, ${near.length} of ${runs.length} runs`,'c'],
    [`${Math.floor(Math.min(...gaps)*100)}–${Math.floor(Math.max(...gaps)*100)} %`,'of the gap to the oracle closed by those runs',''],['0','demonstrations · unfinished laps','']]
    .map(([v,k,c])=>`<div class="stat"><div class="v ${c}">${v}</div><div class="k">${k}</div></div>`).join('');
  {const svg=$('gRounds'),W=640,H=360,Lm=52,Rm=20,T=20,B=34,x=k=>Lm+(W-Lm-Rm)*k/40,lo=440,hi=1140,y=v=>T+(H-T-B)*(hi-v)/(hi-lo);
   for(const tk of[500,700,900,1100]){el('line',{x1:Lm,x2:W-Rm,y1:y(tk),y2:y(tk),stroke:css('--rule'),'stroke-dasharray':'2 4'},svg);el('text',{x:Lm-8,y:y(tk)+4,'text-anchor':'end',fill:css('--chalk-3'),'font-size':12,'font-family':css('--f-data')},svg).textContent=tk}
   for(const tk of[0,10,20,30,40])el('text',{x:x(tk),y:H-12,'text-anchor':'middle',fill:css('--chalk-3'),'font-size':12,'font-family':css('--f-data')},svg).textContent=tk;
   el('line',{x1:Lm,x2:W-Rm,y1:y(res.oracle_train_s),y2:y(res.oracle_train_s),stroke:css('--oracle'),'stroke-dasharray':'6 4'},svg);
   el('text',{x:W-Rm,y:y(res.oracle_train_s)+16,'text-anchor':'end',fill:css('--oracle'),'font-size':11,'font-family':css('--f-pixel')},svg).textContent=`ORACLE ${res.oracle_train_s.toFixed(0)} S`;
   const cs={'crude 1':css('--fast'),'crude 2':css('--slow'),'crude 3':css('--best')};
   for(const r of runs){const d=r.curve.map((v,k)=>(k?`H${x(k)}V${y(v)}`:`M${x(0)},${y(v)}`)).join('');el('path',{d,fill:'none',stroke:cs[r.start],'stroke-width':2,'stroke-opacity':.85,class:'px'},svg)}
   Object.entries(cs).forEach(([k,c],i)=>el('text',{x:x(26),y:T+16+i*16,fill:c,'font-size':11,'font-family':css('--f-pixel')},svg).textContent=k.toUpperCase());}
  {const svg=$('gGap'),W=440,H=360,Lm=78,Rm=46,T=14,rowH=(H-T-24)/runs.length,x=v=>Lm+(W-Lm-Rm)*v;
   for(const tk of[0,.5,1]){el('line',{x1:x(tk),x2:x(tk),y1:T,y2:H-22,stroke:tk?css('--rule'):css('--chalk-2'),'stroke-dasharray':tk?'2 4':''},svg);el('text',{x:x(tk),y:H-6,'text-anchor':'middle',fill:css('--chalk-3'),'font-size':11,'font-family':css('--f-data')},svg).textContent=Math.round(tk*100)+'%'}
   runs.forEach((r,i)=>{const cy=T+i*rowH+rowH/2,c=r.test_s<230?css('--fast'):css('--ghost');
     el('text',{x:0,y:cy+4,fill:css('--chalk-2'),'font-size':11,'font-family':css('--f-pixel')},svg).textContent=`${r.start.replace('crude ','C')} ${r.seed}`;
     el('rect',{x:x(0),y:cy-rowH*.32,width:x(r.gap_closed)-x(0),height:rowH*.64,fill:c,class:'px'},svg);
     el('text',{x:x(r.gap_closed)+6,y:cy+4,fill:c,'font-size':12,'font-family':css('--f-data')},svg).textContent=Math.floor(r.gap_closed*100)+'%'});}
}

/* video hooks: the video page drives the real UI deterministically */
window.DEMO={show,setRaceTime(v){t=v;render()},select,focusItem(id){focus=id;learn()},openDiff(id,on=true){on?open.add(id):open.delete(id);learn()},
  selectBranch(i){bSel=i;lineage()},roundIndex:r=>R.findIndex(x=>x.round===r),scroll(id,y){const e=$(id)||document.querySelector(id);if(e)e.scrollTop=y}};
drawMap();rail();speedChart();render();learn();show(location.hash.slice(1));
window.DEMO.ready=true;
})();
