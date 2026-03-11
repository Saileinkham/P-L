/* ── month state ── */
let curMonth = "2026-01";
let RAW = MONTHS[curMonth].raw;
let DD  = MONTHS[curMonth].dd;
let IC  = MONTHS[curMonth].ic;
let dtMode = 'thb'; // 'thb' or 'pct'

function switchMonth(key){
  if(key === 'all') {
    curMonth = 'all';
    // Aggregate all months: sum numeric fields, recalculate %
    const allKeys = Object.keys(MONTHS).sort();
    const combined = {};
    allKeys.forEach(mk => {
      MONTHS[mk].raw.forEach(b => {
        if(!combined[b.code]) combined[b.code] = {...b, _cnt:0, sales:0, cog:0, gp1:0, col:0, sa:0, op_profit:0, net_profit:0, rent:0, elec:0};
        const c = combined[b.code];
        c._cnt++; c.sales+=b.sales||0; c.cog+=b.cog||0; c.gp1+=b.gp1||0;
        c.col+=b.col||0; c.sa+=b.sa||0; c.op_profit+=b.op_profit||0;
        c.net_profit+=b.net_profit||0; c.rent+=b.rent||0; c.elec+=b.elec||0;
      });
    });
    // Recalculate % from sums
    RAW = Object.values(combined).map(c => {
      const s = c.sales||1;
      return {...c,
        gp_pct: +((c.gp1/s)*100).toFixed(2),
        cog_pct: +((c.cog/s)*100).toFixed(2),
        col_pct: +((c.col/s)*100).toFixed(2),
        sa_pct: +((c.sa/s)*100).toFixed(2),
        op_profit_pct: +((c.op_profit/s)*100).toFixed(2),
        net_pct: +((c.net_profit/s)*100).toFixed(2),
        rent_pct: +((c.rent/s)*100).toFixed(2),
        elec_pct: +((c.elec/s)*100).toFixed(2),
      };
    });
    DD = MONTHS[allKeys[0]]?.dd || {};
    IC = MONTHS[allKeys[0]]?.ic || [];
    ACTIVE = [...RAW];
    rebuildBranchDropdowns();
    renderAll();
    renderIC();
    return;
  }
  if(!MONTHS[key]) return;
  curMonth = key;
  RAW = MONTHS[curMonth].raw;
  DD  = MONTHS[curMonth].dd;
  IC  = MONTHS[curMonth].ic;
  ACTIVE = [...RAW];
  // rebuild branch dropdowns
  rebuildBranchDropdowns();
  renderAll();
  renderIC();
}

function rebuildBranchDropdowns(){
  ['fBranch','cpA','cpB','dtSel'].forEach(id=>{
    const sel = document.getElementById(id);
    if(!sel) return;
    const isCpB = id==='cpB';
    while(sel.options.length) sel.remove(0);
    if(id==='fBranch') sel.appendChild(new Option('ทุกสาขา','all'));
    RAW.forEach((b,i)=>{
      const lbl = `${b.code} — ${b.name}`;
      const val = b.code;
      sel.appendChild(new Option(lbl, val));
    });
    if(isCpB && sel.options.length>1) sel.selectedIndex=1;
  });
  resetFilter();
}

/* ── helpers ── */
const C={b:'#3b82f6',g:'#22c55e',r:'#ef4444',a:'#f59e0b',p:'#a855f7',t:'#06b6d4',o:'#f97316'};
const sum=(a,k)=>a.reduce((s,b)=>s+(+b[k]||0),0);
const avg=(a,k)=>a.length?+(sum(a,k)/a.length).toFixed(1):0;
const fM=v=>`฿${(v/1e6).toFixed(2)}M`;
const fMx=v=>v>=1e6?`฿${(v/1e6).toFixed(1)}M`:v>=1e3?`฿${(v/1e3).toFixed(0)}K`:`฿${Math.round(v)}`;
const cc=(v,lo,hi)=>v>=hi?'cg':v>=lo?'ca':'cr';
const pct=(v,s)=>s?+(v/s*100).toFixed(1):0;
const fi=v=>Number.isInteger(v)?v:'';

Chart.defaults.color='#5a6170'; Chart.defaults.borderColor='#e2e5eb';
Chart.defaults.font.family='Sarabun'; Chart.defaults.font.size=12;
Chart.register(ChartDataLabels);

/* ── manager lookup ── */
const BM={};
Object.entries(MGR).forEach(([m,cs])=>cs.forEach(c=>BM[c]=m));

/* ── filter state ── */
let ACTIVE=[...RAW];
const maxSales=Math.max(...RAW.map(b=>b.sales));

/* ── populate dropdowns (called after login) ── */

// ── Users ──────────────────────────────────────────────────────
const USERS = {
  'admin':  {pass:'Dome0935969199', zone:'all'},
  'aoo':    {pass:'aoo1234',        zone:"P'อ้อ"},
  'jiw':    {pass:'jiw1234',        zone:"P'จิ๋ว"},
  'moo':    {pass:'moo1234',        zone:"P'หมู"},
  'tern':   {pass:'tern1234',       zone:"P'เติ้ล"},
  'sol':    {pass:'sol1234',        zone:"P'ซอล"},
  'golf':   {pass:'golf1234',       zone:"P'กอล์ฟ"},
  'aom':    {pass:'aom1234',        zone:"P'อ้อม"},
  'toey':   {pass:'toey1234',       zone:"P'เตย"},
  'dome':   {pass:'dome1234',       zone:"P'โดม"},
};
let currentUser = null;

function doLogin(){
  const u = document.getElementById('lgUser').value.trim().toLowerCase();
  const p = document.getElementById('lgPass').value;
  const err = document.getElementById('lgErr');
  if(!USERS[u] || USERS[u].pass !== p){
    err.textContent = 'Username หรือ Password ไม่ถูกต้อง';
    return;
  }
  currentUser = {name: u, zone: USERS[u].zone};
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainApp').style.display = '';
  startDashboard();
}

function toggleEye(){
  const inp = document.getElementById('lgPass');
  inp.type = inp.type==='password' ? 'text' : 'password';
}

function doLogout(){
  currentUser = null;
  // Reset filter
  const fMgr = document.getElementById('fMgr');
  if(fMgr){ fMgr.disabled=false; fMgr.value='all'; }
  const fBranch = document.getElementById('fBranch');
  if(fBranch){ fBranch.disabled=false; fBranch.value='all'; }
  // Clear inputs
  document.getElementById('lgUser').value='';
  document.getElementById('lgPass').value='';
  document.getElementById('lgErr').textContent='';
  // Hide dashboard, show login
  document.getElementById('mainApp').style.display='none';
  document.getElementById('loginPage').style.display='flex';
}

function startDashboard(){
  // Show username in nav
  const nameEl = document.getElementById('navUserName');
  if(nameEl) nameEl.textContent = currentUser.name === 'admin' ? '👑 Admin' : '👤 '+currentUser.name;

  // STEP 1: Set ACTIVE based on zone BEFORE anything else
  if(currentUser.zone === 'all'){
    ACTIVE = [...RAW];
  } else {
    const codes = MGR[currentUser.zone] || [];
    ACTIVE = RAW.filter(b => codes.includes(b.code));
  }

  // STEP 2: Populate all dropdowns (uses ACTIVE for branch lists)
  populateDropdowns();

  // STEP 3: Lock/configure global filter bar for non-admin
  if(currentUser.zone !== 'all'){
    const fMgr = document.getElementById('fMgr');
    if(fMgr){ fMgr.value = currentUser.zone; fMgr.disabled = true; }
    const fSum = document.getElementById('fSum');
    if(fSum){ fSum.style.display=''; fSum.textContent=`${currentUser.zone} · ${ACTIVE.length} สาขา`; }
  }

  // STEP 4: Hide tabs for non-admin
  const mgrBtn = document.getElementById('tabBtnMgr');
  if(mgrBtn) mgrBtn.style.display = currentUser.zone==='all' ? '' : 'none';

  // STEP 5: Render everything
  renderAll();
}

function populateDropdowns(){
  const fMonth=document.getElementById('fMonth');
  if(fMonth){
    while(fMonth.options.length) fMonth.remove(0);
    fMonth.appendChild(new Option('📅 รวมทุกเดือน', 'all'));
    Object.keys(MONTHS).sort().forEach(k=>{
      const opt=new Option(MONTHS[k].label, k);
      if(k===curMonth) opt.selected=true;
      fMonth.appendChild(opt);
    });
  }
  const fmSel=document.getElementById('fMgr');
  const fbSel=document.getElementById('fBranch');
  if(fmSel) Object.keys(MGR).forEach(m=>fmSel.appendChild(new Option(m,m)));
  if(fbSel){
    fbSel.appendChild(new Option('ทุกสาขา','all'));
    ACTIVE.forEach(b=>fbSel.appendChild(new Option(`${b.code} — ${b.name}`,b.code)));
  }

  const cpA=document.getElementById('cpA'), cpB=document.getElementById('cpB');
  if(cpA){
    ACTIVE.forEach((b)=>{
      cpA.appendChild(new Option(`${b.code} — ${b.name}`, b.code));
      cpB.appendChild(new Option(`${b.code} — ${b.name}`, b.code));
    });
    if(cpB && cpB.options.length>1) cpB.selectedIndex=1;
  }

  const dtSel=document.getElementById('dtSel');
  if(dtSel) ACTIVE.forEach(b=>dtSel.appendChild(new Option(`${b.code} — ${b.name}`,b.code)));

  const mgZone=document.getElementById('mgZone');
  if(mgZone) Object.keys(MGR).forEach(m=>mgZone.appendChild(new Option(m,m)));

  // MX dropdowns
  const mxZ=document.getElementById('mxZone');
  const mxB=document.getElementById('mxBranch');
  if(mxZ) Object.keys(MGR).forEach(m=>mxZ.appendChild(new Option(m,m)));
  if(mxB){
    const firstRaw=MONTHS[Object.keys(MONTHS)[0]].raw;
    firstRaw.forEach(b=>mxB.appendChild(new Option(`${b.code} — ${b.name}`,b.code)));
  }

  // IC dropdowns
  const icZone=document.getElementById('icZone');
  if(icZone) Object.keys(MGR).forEach(m=>icZone.appendChild(new Option(m,m)));
  updateICBranchLabel();
}

/* ── filter ── */
function applyFilter(){
  const mgr=document.getElementById('fMgr').value;
  const branchSel=document.getElementById('fBranch');
  const curB=branchSel.value;

  // Base pool: for non-admin, always restricted to their zone
  const basePool = currentUser&&currentUser.zone!=='all'
    ? RAW.filter(b=>(MGR[currentUser.zone]||[]).includes(b.code))
    : RAW;

  // Rebuild branch dropdown from pool filtered by mgr selection
  while(branchSel.options.length>1) branchSel.remove(1);
  const pool = mgr==='all' ? basePool : basePool.filter(b=>BM[b.code]===mgr);
  pool.forEach(b=>branchSel.appendChild(new Option(`${b.code} — ${b.name}`,b.code)));
  if(pool.find(b=>b.code===curB)) branchSel.value=curB; else branchSel.value='all';
  const selB=branchSel.value;

  ACTIVE = pool.filter(b=>{
    if(selB!=='all'&&b.code!==selB) return false;
    return true;
  });
  const el=document.getElementById('fSum');
  if(mgr==='all'&&selB==='all'&&(!currentUser||currentUser.zone==='all')){
    el.style.display='none';
  } else {
    el.style.display='';
    el.textContent = selB!=='all' ? selB : `${mgr!=='all'?mgr:(currentUser?.zone||'ทั้งหมด')} · ${ACTIVE.length} สาขา`;
  }
  renderAll();
  // Update ICX if on that tab
  rebuildICXBranch();
  updateICBranchLabel();
  if(document.getElementById('tab-icx')?.classList.contains('active')) renderICX();
  if(document.getElementById('tab-ic')?.classList.contains('active')) renderIC();
}
function resetFilter(){
  if(currentUser&&currentUser.zone!=='all'){
    // Non-admin: reset branch only, keep zone locked
    const fb=document.getElementById('fBranch');
    fb.value='all';
    const codes=MGR[currentUser.zone]||[];
    ACTIVE=RAW.filter(b=>codes.includes(b.code));
  } else {
    document.getElementById('fMgr').value='all';
    const fb=document.getElementById('fBranch');
    while(fb.options.length>1) fb.remove(1);
    RAW.forEach(b=>fb.appendChild(new Option(`${b.code} — ${b.name}`,b.code)));
    fb.value='all';
    ACTIVE=[...RAW];
    document.getElementById('fSum').style.display='none';
  }
  renderAll();
}
function renderAll(){
  // Rebuild all branch dropdowns from ACTIVE
  ['cpA','cpB','dtSel'].forEach(id=>{
    const sel=document.getElementById(id);
    if(!sel) return;
    const cur=sel.value;
    while(sel.options.length) sel.remove(0);
    if(id==='icBranch') sel.appendChild(new Option('ทุกสาขา (รวม)','all'));
    ACTIVE.forEach((b,i)=>{
      const val=b.code;
      sel.appendChild(new Option(`${b.code} — ${b.name}`,val));
    });
    // try restore previous selection
    const opts=[...sel.options].map(o=>o.value);
    if(opts.includes(cur)) sel.value=cur;
    else if(id==='cpB'&&sel.options.length>1) sel.selectedIndex=1;
  });
  renderKPI();
  renderCharts();
  renderRank();
  renderCmp();
  renderDt();
  renderMgr();
  renderMgZone();
  renderIC();
}

/* ── KPI ── */
function kCard(lbl,val,sub,chip,ct,color){
  return `${lbl}${val}${sub}${ct}</span>`;
}
function insEl(color,txt){return `${txt}</span>`;}

function renderKPI(){
  const a=ACTIVE, s=sum(a,'sales')||1;
  const tS=sum(a,'sales'),tGP=sum(a,'gp1'),tOp=sum(a,'op_profit'),tNet=sum(a,'net_profit');
  const tCOG=sum(a,'cog'),tCOL=sum(a,'col'),tSA=sum(a,'sa');
  const tRent=sum(a,'rent'),tElec=sum(a,'elec'),tWater=sum(a,'water');
  const p=v=>(v/s*100).toFixed(1)+'%';
  document.getElementById('kMain').innerHTML=[
    kCard('Total Revenue',`฿${(tS/1e6).toFixed(2)}M`,tS.toLocaleString('en'),'cb',a.length+' สาขา',C.b),
    kCard('Gross Profit',`฿${(tGP/1e6).toFixed(2)}M`,tGP.toLocaleString('en'),'cg','GP% '+p(tGP),C.g),
    kCard('Operating Profit',`฿${(tOp/1e6).toFixed(2)}M`,tOp.toLocaleString('en'),'cb','Op% '+p(tOp),C.t),
    kCard('Net Profit',`฿${(tNet/1e6).toFixed(2)}M`,tNet.toLocaleString('en'),tNet/s>.2?'cg':tNet/s>.1?'ca':'cr','NP% '+p(tNet),C.p),
    kCard('COG',`฿${(tCOG/1e6).toFixed(2)}M`,tCOG.toLocaleString('en'),'cr','COG% '+p(tCOG),C.r),
    kCard('Labour (COL)',`฿${(tCOL/1e6).toFixed(2)}M`,tCOL.toLocaleString('en'),'ca','COL% '+p(tCOL),C.o),
    kCard('S&A Expenses',`฿${(tSA/1e6).toFixed(2)}M`,tSA.toLocaleString('en'),'ca','S&A% '+p(tSA),C.a),
    kCard('Avg Sales/Branch',`฿${(tS/a.length/1e6).toFixed(2)}M`,a.length+' สาขา','ct','avg/branch',C.t),
  ].join('');
  document.getElementById('kUtil').innerHTML=[
    kCard('ค่าเช่าและค่าส่วนกลาง',`฿${(tRent/1e6).toFixed(2)}M`,tRent.toLocaleString('en'),'ca','Rent% '+p(tRent),C.a),
    kCard('ค่าไฟฟ้า',`฿${(tElec/1e6).toFixed(2)}M`,tElec.toLocaleString('en'),'ca','Elec% '+p(tElec),C.o),
    kCard('ค่าน้ำประปา',`฿${(tWater/1e6).toFixed(2)}M`,tWater.toLocaleString('en'),'cb','Water% '+p(tWater),C.b),
  ].join('');
  const byNet=[...a].sort((x,y)=>y.net_pct-x.net_pct);
  const bySales=[...a].sort((x,y)=>y.sales-x.sales);
  const byRent=[...a].sort((x,y)=>y.rent_pct-x.rent_pct);
  const byElec=[...a].sort((x,y)=>y.elec_pct-x.elec_pct);
  document.getElementById('kInsight').innerHTML=[
    insEl(C.g,`Best Sales: ${bySales[0]?.name} ${fM(bySales[0]?.sales||0)}</strong>`),
    insEl(C.g,`Best Net%: ${byNet[0]?.name} ${byNet[0]?.net_pct}%</strong>`),
    insEl(C.r,`Net Loss: ${a.filter(b=>b.net_profit<0).map(b=>b.name).join(', ')||'ไม่มี'}</strong>`),
    insEl(C.a,`ค่าเช่าสูงสุด: ${byRent[0]?.name} ${byRent[0]?.rent_pct}%</strong>`),
    insEl(C.o,`ค่าไฟสูงสุด: ${byElec[0]?.name} ${byElec[0]?.elec_pct}%</strong>`),
  ].join('');
}

/* ── charts ── */
const CH={};
function dc(id){if(CH[id]){CH[id].destroy();delete CH[id];}}
function nc(id,cfg){dc(id);CH[id]=new Chart(document.getElementById(id),cfg);return CH[id];}

function renderCharts(){
  const a=ACTIVE;
  const tS=sum(a,'sales'),tCOG=sum(a,'cog'),tGP=sum(a,'gp1'),tCOL=sum(a,'col'),tSA=sum(a,'sa'),tOp=sum(a,'op_profit'),tNet=sum(a,'net_profit');

  /* waterfall */
  nc('cWF',{type:'bar',data:{
    labels:['Revenue','COG','Gross Profit','COL','S&A','Op Profit','Net Profit'],
    datasets:[{data:[tS/1e6,-tCOG/1e6,tGP/1e6,-tCOL/1e6,-tSA/1e6,tOp/1e6,tNet/1e6].map(v=>+v.toFixed(1)),
      backgroundColor:[C.b,C.r,C.g,C.o,C.a,C.t,C.p],borderRadius:5}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},
        datalabels:{color:'#fff',font:{weight:'700',size:10},formatter:v=>`฿${Math.abs(v)}M`,anchor:'center',align:'center'},
        tooltip:{callbacks:{label:c=>`฿${c.raw}M`}}},
      scales:{x:{grid:{display:false}},y:{ticks:{callback:v=>`฿${v}M`}}}}});

  /* donut */
  const s=tS||1,np=tNet/s*100,cogp=tCOG/s*100,colp=tCOL/s*100,sap=tSA/s*100,oth=Math.max(0,100-np-cogp-colp-sap);
  nc('cDnt',{type:'doughnut',data:{
    labels:[`Net ${np.toFixed(1)}%`,`COG ${cogp.toFixed(1)}%`,`COL ${colp.toFixed(1)}%`,`S&A ${sap.toFixed(1)}%`,`อื่นๆ ${oth.toFixed(1)}%`],
    datasets:[{data:[np,cogp,colp,sap,oth].map(v=>+v.toFixed(1)),backgroundColor:[C.p,C.r,C.o,C.a,C.t],borderWidth:2,borderColor:'#fff'}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'60%',
      plugins:{datalabels:{display:false},legend:{position:'right',labels:{padding:12,font:{size:11},boxWidth:12}},
        tooltip:{callbacks:{label:c=>`${c.label}: ${c.raw}%`}}}}});

  /* top sales */
  const ts10=[...a].sort((x,y)=>y.sales-x.sales).slice(0,10);
  nc('cTS',{type:'bar',data:{labels:ts10.map(b=>b.name),datasets:[{data:ts10.map(b=>+(b.sales/1e6).toFixed(2)),backgroundColor:C.b,borderRadius:4}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:55}},
      plugins:{legend:{display:false},
        datalabels:{color:'#2563eb',font:{weight:'700',size:9},formatter:v=>`฿${v}M`,anchor:'end',align:'right',offset:3},
        tooltip:{callbacks:{label:c=>`฿${c.raw}M`}}},
      scales:{x:{ticks:{callback:v=>fi(v)?`฿${v}M`:''}},y:{grid:{display:false}}}}});

  /* top net */
  const tn10=[...a].filter(b=>b.net_pct>0).sort((x,y)=>y.net_pct-x.net_pct).slice(0,10);
  nc('cTN',{type:'bar',data:{labels:tn10.map(b=>b.name),datasets:[{data:tn10.map(b=>b.net_pct),backgroundColor:C.g,borderRadius:4}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:45}},
      plugins:{legend:{display:false},
        datalabels:{color:'#16a34a',font:{weight:'700',size:9},formatter:v=>`${v}%`,anchor:'end',align:'right',offset:3},
        tooltip:{callbacks:{label:c=>`${c.raw}%`}}},
      scales:{x:{ticks:{callback:v=>fi(v)?`${v}%`:''}},y:{grid:{display:false}}}}});

  /* GP branch */
  const gpS=[...a].sort((x,y)=>y.gp_pct-x.gp_pct), gpAvg=avg(a,'gp_pct');
  nc('cGP',{type:'bar',data:{labels:gpS.map(b=>b.name),datasets:[
    {label:'GP%',data:gpS.map(b=>b.gp_pct),backgroundColor:gpS.map(b=>b.gp_pct>=65?C.g:b.gp_pct>=62?C.b:C.r),borderRadius:3},
    {label:`Avg ${gpAvg}%`,data:gpS.map(()=>gpAvg),type:'line',borderColor:C.a,borderDash:[4,3],borderWidth:2,pointRadius:0,fill:false,datalabels:{display:false}}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:16}},
      plugins:{legend:{labels:{font:{size:11}}},
        datalabels:{display:ctx=>ctx.datasetIndex===0,color:ctx=>{const v=ctx.dataset.data[ctx.dataIndex];return v>=65?'#16a34a':v>=62?'#2563eb':'#dc2626';},font:{weight:'700',size:8},formatter:v=>`${v}%`,anchor:'end',align:'top',offset:1},
        tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw}%`}}},
      scales:{x:{grid:{display:false},ticks:{font:{size:9},maxRotation:45}},y:{min:45,max:73,ticks:{callback:v=>`${v}%`}}}}});

  /* utility stacked */
  const us=[...a].sort((x,y)=>y.sales-x.sales);
  nc('cUt',{type:'bar',data:{labels:us.map(b=>b.name),datasets:[
    {label:'ค่าเช่า%',data:us.map(b=>b.rent_pct),backgroundColor:C.a},
    {label:'ค่าไฟ%',data:us.map(b=>b.elec_pct),backgroundColor:C.o},
    {label:'ค่าน้ำ%',data:us.map(b=>b.water_pct),backgroundColor:C.b}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{font:{size:11}}},datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>=2,color:'#fff',font:{weight:'700',size:9},formatter:v=>`${v}%`,anchor:'center',align:'center'},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw}%`}}},
      scales:{x:{stacked:true,grid:{display:false},ticks:{font:{size:9},maxRotation:45}},y:{stacked:true,ticks:{callback:v=>`${v}%`}}}}});

  /* cost stacked */
  nc('cSt',{type:'bar',data:{labels:us.map(b=>b.name),datasets:[
    {label:'COG%',data:us.map(b=>b.cog_pct),backgroundColor:C.r},
    {label:'COL%',data:us.map(b=>b.col_pct),backgroundColor:C.o},
    {label:'S&A%',data:us.map(b=>b.sa_pct),backgroundColor:C.a},
    {label:'Net%',data:us.map(b=>Math.max(0,b.net_pct)),backgroundColor:C.g}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{font:{size:11}}},datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>=2,color:'#fff',font:{weight:'700',size:9},formatter:v=>`${v}%`,anchor:'center',align:'center'},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw}%`}}},
      scales:{x:{stacked:true,grid:{display:false},ticks:{font:{size:9},maxRotation:45}},y:{stacked:true,ticks:{callback:v=>`${v}%`}}}}});

  /* net dist */
  const bk={'<0%':0,'0–10%':0,'10–20%':0,'20–30%':0,'>30%':0};
  a.forEach(b=>{if(b.net_pct<0)bk['<0%']++;else if(b.net_pct<10)bk['0–10%']++;else if(b.net_pct<20)bk['10–20%']++;else if(b.net_pct<30)bk['20–30%']++;else bk['>30%']++;});
  nc('cND',{type:'bar',data:{labels:Object.keys(bk),datasets:[{data:Object.values(bk),backgroundColor:[C.r,C.o,C.a,C.b,C.g],borderRadius:7}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:22}},
      plugins:{legend:{display:false},datalabels:{color:'#374151',font:{weight:'700',size:12},formatter:v=>`${v} สาขา`,anchor:'end',align:'top',offset:2},
        tooltip:{callbacks:{label:c=>`${c.raw} สาขา`}}},
      scales:{x:{grid:{display:false}},y:{ticks:{stepSize:1},max:Math.max(...Object.values(bk))+4}}}});

  /* top/bot */
  const s5=[...a].sort((x,y)=>y.net_pct-x.net_pct), t5=s5.slice(0,5), b5=[...s5].slice(-5).reverse();
  nc('cTB',{type:'bar',data:{labels:[...t5.map(b=>b.name),...b5.map(b=>b.name)],
    datasets:[{data:[...t5.map(b=>b.net_pct),...b5.map(b=>b.net_pct)],backgroundColor:[...t5.map(()=>C.g),...b5.map(b=>b.net_pct<0?C.r:C.o)],borderRadius:4}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:45}},
      plugins:{legend:{display:false},datalabels:{color:ctx=>{const v=ctx.dataset.data[ctx.dataIndex];return v>=20?'#16a34a':v>=0?'#d97706':'#dc2626';},font:{weight:'700',size:9},formatter:v=>`${v}%`,anchor:'end',align:'right',offset:3},
        tooltip:{callbacks:{label:c=>`NP%: ${c.raw}%`}}},
      scales:{x:{ticks:{callback:v=>fi(v)?`${v}%`:''}},y:{grid:{display:false}}}}});
}

/* ── ranking table ── */
let rkCol='sales', rkDir='desc';
function rkSort(col){if(rkCol===col)rkDir=rkDir==='desc'?'asc':'desc';else{rkCol=col;rkDir='desc';}document.getElementById('sCol').value=rkCol;document.getElementById('sDir').value=rkDir;renderRank();}
function renderRank(){
  const col=document.getElementById('sCol').value, dir=document.getElementById('sDir').value;
  const flt=document.getElementById('sFlt').value, q=document.getElementById('sQ').value.toLowerCase();
  rkCol=col; rkDir=dir;
  let d=[...ACTIVE];
  if(flt==='profit') d=d.filter(b=>b.net_profit>0);
  if(flt==='loss')   d=d.filter(b=>b.net_profit<=0);
  if(q) d=d.filter(b=>b.name.toLowerCase().includes(q)||b.code.toLowerCase().includes(q));
  d.sort((a,b)=>dir==='desc'?b[col]-a[col]:a[col]-b[col]);
  const rkShowBaht = document.getElementById('rkValBtn')?.getAttribute('data-active')==='true';

  // Add computed pct fields for sorting
  d.forEach(b=>{
    const s = b.sales||1;
    b.fb_pct    = b.fb_cog!=null   ? +(b.fb_cog/s*100).toFixed(2)   : 0;
    b.pkg_pct   = b.pkg!=null      ? +(b.pkg/s*100).toFixed(2)       : 0;
    b.nf_pct    = b.nonfood!=null  ? +(b.nonfood/s*100).toFixed(2)   : 0;
    b.water_pct = b.water!=null    ? +(b.water/s*100).toFixed(2)     : 0;
    b.elec_pct  = b.elec!=null     ? +(b.elec/s*100).toFixed(2)      : 0;
    b.rent_pct  = b.rent!=null     ? +(b.rent/s*100).toFixed(2)      : 0;
  });
  // Re-sort with computed fields
  d.sort((a,b2)=>rkDir==='desc'?b2[rkCol]-a[rkCol]:a[rkCol]-b2[rkCol]);

  // Update sort indicators in thead
  ['sales','cog_pct','fb_pct','pkg_pct','nf_pct','col_pct','net_pct','water_pct','elec_pct','rent_pct'].forEach(col=>{
    const th = document.getElementById('rth-'+col);
    if(!th) return;
    const base = th.dataset.label || th.textContent.replace(/[▲▼]/g,'').trim();
    th.dataset.label = base;
    th.textContent = '';
    th.appendChild(document.createTextNode(base + (rkCol===col ? (rkDir==='desc'?' ▼':' ▲') : '')));
  });

  document.getElementById('rkBody').innerHTML=d.map((b,i)=>{
    const bw=Math.round(b.sales/maxSales*100), rk=i===0?'r1':i===1?'r2':i===2?'r3':'rnn';
    const s = b.sales||1;
    // computed values
    // pct fields already computed above

    const fmt = (pct, val, lo, hi, goodLow=true) => {
      const n = parseFloat(pct);
      const chip = isNaN(n)?'ct': goodLow?(n<=lo?'cg':n<=hi?'ca':'cr'):(n>=lo?'cg':n>=hi*0.7?'ca':'cr');
      const colors = {cg:'#15803d',ca:'#b45309',cr:'#dc2626',ct:'#6b7280'};
      if(rkShowBaht){
        const display = val==null ? '—' : val>=1e6 ? '฿'+(val/1e6).toFixed(2)+'M' : '฿'+(val/1e3).toFixed(0)+'K';
        return `${display}</td>`;
      }
      return `${pct==='—'?'—':pct+'%'}</span></td>`;
    };

    return `
      ${i+1}</td>
      ${b.name}${b.code}</td>
      ${BM[b.code]||'—'}</span></td>
      ${fMx(b.sales)}0?C.g:C.r}"></td>
      ${fmt(b.cog_pct+'',      b.cog,       35, 39)}
      ${fmt(b.fb_pct+'',       b.fb_cog,    30, 35)}
      ${fmt(b.pkg_pct+'',      b.pkg,        1,  2)}
      ${fmt(b.nf_pct+'',       b.nonfood,    1,  2)}
      ${fmt(b.col_pct+'',      b.col,       16, 21)}
      ${fmt(b.net_pct<0?'-':b.net_pct+'', b.net_profit, 15, 25, false)}
      ${fmt(b.water_pct+'',    b.water,      1,  2)}
      ${fmt(b.elec_pct+'',     b.elec,       3,  6)}
      ${fmt(b.rent_pct+'',     b.rent,       8, 15)}
      </td>
    </tr>`;
  }).join('');
}

function toggleRkVal(){
  const btn = document.getElementById('rkValBtn');
  const now = btn.getAttribute('data-active')==='true';
  btn.setAttribute('data-active', now?'false':'true');
  btn.textContent = now ? '฿' : '%';
  renderRank();
}

/* ── compare ── */
let cRd=null, cBr=null;
function renderCmp(){
  const codeA=document.getElementById('cpA').value, codeB=document.getElementById('cpB').value;
  const a=ACTIVE.find(b=>b.code===codeA)||ACTIVE[0], b=ACTIVE.find(b=>b.code===codeB)||ACTIVE[Math.min(1,ACTIVE.length-1)];
  if(!a||!b) return;
  const tpl=(list)=>`รายการ${a.name}${b.name}${list.map(m=>`${m.n}${m.va}${m.vb}`).join('')}`;
  document.getElementById('cpL').innerHTML=tpl([
    {n:'ยอดขาย',va:fM(a.sales),vb:fM(b.sales)},{n:'Gross Profit',va:fM(a.gp1),vb:fM(b.gp1)},{n:'GP%',va:`${a.gp_pct}%`,vb:`${b.gp_pct}%`},
    {n:'Op Profit',va:fM(a.op_profit),vb:fM(b.op_profit)},{n:'Op%',va:`${a.op_profit_pct}%`,vb:`${b.op_profit_pct}%`},
    {n:'ค่าเช่า',va:fMx(a.rent),vb:fMx(b.rent)},{n:'ค่าเช่า%',va:`${a.rent_pct}%`,vb:`${b.rent_pct}%`}]);
  document.getElementById('cpR').innerHTML=tpl([
    {n:'Net Profit',va:fM(a.net_profit),vb:fM(b.net_profit)},{n:'Net%',va:`${a.net_pct}%`,vb:`${b.net_pct}%`},
    {n:'COG%',va:`${a.cog_pct}%`,vb:`${b.cog_pct}%`},{n:'COL%',va:`${a.col_pct}%`,vb:`${b.col_pct}%`},
    {n:'S&A%',va:`${a.sa_pct}%`,vb:`${b.sa_pct}%`},{n:'ค่าไฟ',va:fMx(a.elec),vb:fMx(b.elec)},{n:'ค่าไฟ%',va:`${a.elec_pct}%`,vb:`${b.elec_pct}%`}]);
  if(cRd)cRd.destroy();
  cRd=new Chart(document.getElementById('cRd'),{type:'radar',data:{labels:['GP%','Op%','NP%','ยอดขาย','แรงงาน'],datasets:[
    {label:a.name,data:[a.gp_pct,a.op_profit_pct,a.net_pct,a.sales/RAW[0].sales*100,100-a.col_pct*3],borderColor:C.b,backgroundColor:C.b+'22',borderWidth:2,pointRadius:4},
    {label:b.name,data:[b.gp_pct,b.op_profit_pct,b.net_pct,b.sales/RAW[0].sales*100,100-b.col_pct*3],borderColor:C.t,backgroundColor:C.t+'22',borderWidth:2,pointRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:11}}},datalabels:{display:false}},scales:{r:{ticks:{display:false},pointLabels:{font:{size:10}}}}}});
  if(cBr)cBr.destroy();
  cBr=new Chart(document.getElementById('cBr'),{type:'bar',data:{labels:['COG%','COL%','S&A%','GP%','Net%','ค่าเช่า%','ค่าไฟ%'],datasets:[
    {label:a.name,data:[a.cog_pct,a.col_pct,a.sa_pct,a.gp_pct,a.net_pct,a.rent_pct,a.elec_pct],backgroundColor:C.b,borderRadius:4},
    {label:b.name,data:[b.cog_pct,b.col_pct,b.sa_pct,b.gp_pct,b.net_pct,b.rent_pct,b.elec_pct],backgroundColor:C.t,borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},
      plugins:{legend:{labels:{font:{size:11}}},datalabels:{color:'#374151',font:{weight:'700',size:8},formatter:v=>`${v}%`,anchor:'end',align:'top',offset:1},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw}%`}}},
      scales:{x:{grid:{display:false}},y:{ticks:{callback:v=>`${v}%`}}}}});
}

/* ── detail ── */
function dtZoneChange(){
  const z=document.getElementById('dtZone').value;
  const sel=document.getElementById('dtSel');
  const cur=sel.value;
  while(sel.options.length) sel.remove(0);
  const pool=z==='all'?RAW:RAW.filter(b=>MGR[z]?.includes(b.code));
  pool.forEach(b=>sel.appendChild(new Option(`${b.code} — ${b.name}`,b.code)));
  if(pool.find(b=>b.code===cur)) sel.value=cur;
  renderDt();
}

const SCOL={sales:'#22c55e',cog:'#ef4444',other_cog:'#f97316',col:'#a855f7',sa:'#f59e0b',net:'#3b82f6'};
const SLBL={sales:'📦 Sales & Revenue',cog:'🔴 COG (Food Cost)',other_cog:'🟠 Other COG',col:'🟣 Labour (COL)',sa:'🟡 S&A Expenses',net:'🔵 Net Profit'};
function setDtMode(m){
  dtMode = m;
  document.getElementById('dtToggleTHB').style.background = m==='thb'?'var(--blue)':'#fff';
  document.getElementById('dtToggleTHB').style.color = m==='thb'?'#fff':'var(--t2)';
  document.getElementById('dtTogglePCT').style.background = m==='pct'?'var(--blue)':'#fff';
  document.getElementById('dtTogglePCT').style.color = m==='pct'?'#fff':'var(--t2)';
  renderDt();
}

function populateDtMonth(){
  const sel = document.getElementById('dtMonth');
  if(!sel) return;
  // clear except first option (all)
  while(sel.options.length > 1) sel.remove(1);
  Object.keys(MONTHS).sort().forEach(k=>{
    sel.appendChild(new Option(MONTHS[k].label, k));
  });
}

function renderDt(){
  const code = document.getElementById('dtSel').value;
  const ALL_MONTHS = [
    ['2026-01','ม.ค.'],['2026-02','ก.พ.'],['2026-03','มี.ค.'],['2026-04','เม.ย.'],
    ['2026-05','พ.ค.'],['2026-06','มิ.ย.'],['2026-07','ก.ค.'],['2026-08','ส.ค.'],
    ['2026-09','ก.ย.'],['2026-10','ต.ค.'],['2026-11','พ.ย.'],['2026-12','ธ.ค.']
  ];

  // Get dd and branch data per month (null if no data)
  const ddByMonth = {}, branchByMonth = {};
  ALL_MONTHS.forEach(([mk]) => {
    const mdata = MONTHS[mk];
    ddByMonth[mk] = mdata ? mdata.dd?.[code] : null;
    branchByMonth[mk] = mdata ? mdata.raw.find(x=>x.code===code) : null;
  });

  // Find reference month for row structure
  const refMonth = ALL_MONTHS.find(([mk]) => ddByMonth[mk]);
  if(!refMonth) return;
  const d = ddByMonth[refMonth[0]];

  // Badges - aggregate all available months
  const availMonths = ALL_MONTHS.filter(([mk]) => branchByMonth[mk]);
  const totalSales = availMonths.reduce((s,[mk]) => s + (branchByMonth[mk]?.sales||0), 0);
  const avgGP   = availMonths.reduce((s,[mk]) => s + (branchByMonth[mk]?.gp_pct||0), 0) / availMonths.length;
  const avgCOL  = availMonths.reduce((s,[mk]) => s + (branchByMonth[mk]?.col_pct||0), 0) / availMonths.length;
  const avgSA   = availMonths.reduce((s,[mk]) => s + (branchByMonth[mk]?.sa_pct||0), 0) / availMonths.length;
  const avgRent = availMonths.reduce((s,[mk]) => s + (branchByMonth[mk]?.rent_pct||0), 0) / availMonths.length;
  const avgElec = availMonths.reduce((s,[mk]) => s + (branchByMonth[mk]?.elec_pct||0), 0) / availMonths.length;
  const avgNet  = availMonths.reduce((s,[mk]) => s + (branchByMonth[mk]?.net_pct||0), 0) / availMonths.length;

  document.getElementById('dtBadges').innerHTML=[
    `Sales ${fM(totalSales)}</span>`,
    `GP% ${avgGP.toFixed(2)}%</span>`,
    `COL% ${avgCOL.toFixed(2)}%</span>`,
    `S&A% ${avgSA.toFixed(2)}%</span>`,
    `ค่าเช่า% ${avgRent.toFixed(2)}%</span>`,
    `ค่าไฟ% ${avgElec.toFixed(2)}%</span>`,
    `=20?'#f0fdf4':'#fef2f2'};color:${avgNet>=20?'#16a34a':'#dc2626'}">Net% ${avgNet.toFixed(2)}%</span>`,
    `เขต: ${BM[code]||'—'}</span>`,
    `${availMonths.length} เดือน</span>`,
  ].join('');

  // Build table header - 12 months + avg
  const thStyle = 'text-align:right;font-size:.7rem;padding:6px 7px;white-space:nowrap';
  const avgLabel = dtMode==='thb' ? 'รวม' : 'เฉลี่ย';
  let headHtml = `
    รายการ</th>
    ${ALL_MONTHS.map(([mk,ml]) => `${ml}</th>`).join('')}
    ${avgLabel}</th>
  </tr>`;
  document.getElementById('dtHead').innerHTML = headHtml;

  // Build rows
  let tableHtml = '', curS = '';
  d.rows.forEach(r => {
    // Section header
    if(r.section !== curS){
      curS = r.section;
      const col = SCOL[r.section]||'#64748b', lbl = SLBL[r.section]||r.section;
      tableHtml += `${lbl}</td></tr>`;
    }

    const col = SCOL[r.section]||'#64748b';
    const indent = r.type==='sub'||r.type==='adj' ? 'padding-left:22px' : 'padding-left:10px';
    const rs = r.type==='result' ? 'background:#f8fafc;font-weight:700;border-top:1px solid #cbd5e1'
             : r.type==='header' ? 'background:#f1f5f9;font-weight:700' : '';

    tableHtml += `${r.label}</td>`;

    // Each month column
    let sumVal = 0, sumPct = 0, cntPct = 0;
    ALL_MONTHS.forEach(([mk]) => {
      const mdd = ddByMonth[mk];
      if(!mdd) {
        tableHtml += `—</td>`;
        return;
      }
      const mrow = mdd.rows.find(x => x.label === r.label);
      if(!mrow) {
        tableHtml += `—</td>`;
        return;
      }
      sumVal += mrow.val || 0;
      if(mrow.pct !== 0) { sumPct += mrow.pct || 0; cntPct++; }

      const dispVal = dtMode==='thb' ? mrow.val : mrow.pct;
      const isNeg = dispVal < 0;
      const fv = dtMode==='thb'
        ? (mrow.val===0 ? '—' : (mrow.val<0?'-':'')+'฿'+Math.abs(mrow.val).toLocaleString('en'))
        : (mrow.pct===0 ? '—' : (mrow.pct>0?'+':'')+mrow.pct+'%');
      tableHtml += `${fv}</td>`;
    });

    // Avg/sum column
    let avgDisp, isNegA;
    if(dtMode==='thb') {
      isNegA = sumVal < 0;
      avgDisp = sumVal===0 ? '—' : (sumVal<0?'-':'')+'฿'+Math.abs(sumVal).toLocaleString('en');
    } else {
      const avg = cntPct>0 ? sumPct/cntPct : 0;
      isNegA = avg < 0;
      avgDisp = avg===0 ? '—' : (avg>0?'+':'')+avg.toFixed(2)+'%';
    }
    tableHtml += `${avgDisp}</td>`;
    tableHtml += '</tr>';
  });

  document.getElementById('dtBody').innerHTML = tableHtml;
}

/* ── managers ── */
function mgrStats(codes){
  const brs=RAW.filter(b=>codes.includes(b.code));
  if(!brs.length) return null;
  const s=sum(brs,'sales')||1;
  return {n:brs.length,sales:s,net:sum(brs,'net_profit'),op:sum(brs,'op_profit'),
    gp_pct:+(sum(brs,'gp1')/s*100).toFixed(1), op_profit_pct:+(sum(brs,'op_profit')/s*100).toFixed(1),
    net_pct:+(sum(brs,'net_profit')/s*100).toFixed(1), cog_pct:+(sum(brs,'cog')/s*100).toFixed(1),
    col_pct:+(sum(brs,'col')/s*100).toFixed(1), sa_pct:+(sum(brs,'sa')/s*100).toFixed(1),
    rent_pct:+(sum(brs,'rent')/s*100).toFixed(1), elec_pct:+(sum(brs,'elec')/s*100).toFixed(1)};
}
function renderMgr(){
  const sk=document.getElementById('mgSort').value, sd=document.getElementById('mgDir').value;
  const list=Object.entries(MGR).map(([name,codes])=>({name,codes,...mgrStats(codes)}));
  list.sort((a,b)=>sd==='desc'?b[sk]-a[sk]:a[sk]-b[sk]);
  document.getElementById('mgCards').innerHTML=list.map((m,i)=>{
    const rc=['#d97706','#64748b','#b45309'][i]||'#9aa0ad';
    const rb=['#fef3c7','#f1f5f9','#fef2f2'][i]||'#f8f9fb';
    return `=20?C.g:m.net_pct>=10?C.a:C.r}">
      #${i+1}</span>${m.name}${m.n} สาขา</span>
      Sales: </span>${fM(m.sales)}</strong>&nbsp;&nbsp;Net: </span>=20?C.g:C.r}">${m.net_pct}%</strong>
      
        GP ${m.gp_pct}%</span>
        Op ${m.op_profit_pct}%</span>
        เช่า ${m.rent_pct}%</span>
        ไฟ ${m.elec_pct}%</span>
      
    `;
  }).join('');
  document.getElementById('mgBody').innerHTML=list.map((m,i)=>`
    ${i+1}</td>
    ${m.name}</strong></td>
    ${m.codes.join(', ')}</td>
    ${fM(m.sales)}</td>
    ${m.gp_pct}%</span></td>
    ${m.op_profit_pct}%</span></td>
    ${m.net_pct}%</span></td>
    ${m.cog_pct}%</span></td>
    ${m.col_pct}%</span></td>
    ${m.sa_pct}%</span></td>
    ${m.rent_pct}%</span></td>
    ${m.elec_pct}%</span></td>
  </tr>`).join('');
}
function mgSortBy(col){const el=document.getElementById('mgSort'),de=document.getElementById('mgDir');if(el.value===col)de.value=de.value==='desc'?'asc':'desc';else{el.value=col;de.value='desc';}renderMgr();}

function renderMgZone(){
  const z=document.getElementById('mgZone').value, sk=document.getElementById('mgZoneSort').value;
  const brs=[...RAW.filter(b=>MGR[z]?.includes(b.code))].sort((a,b)=>b[sk]-a[sk]);
  document.getElementById('mgZoneTable').innerHTML=`
    #</th>สาขา</th>Sales</th>GP%</th>Op%</th>Net%</th>COG%</th>COL%</th>S&A%</th>ค่าเช่า%</th>ค่าไฟ%</th>
  </tr></thead>${brs.map((b,i)=>`
    ${i+1}</td>
    ${b.name}${b.code}</td>
    ${fMx(b.sales)}</td>
    ${b.gp_pct}%</span></td>
    ${b.op_profit_pct}%</span></td>
    ${b.net_pct}%</span></td>
    ${b.cog_pct}%</span></td>
    ${b.col_pct}%</span></td>
    ${b.sa_pct}%</span></td>
    ${b.rent_pct}%</span></td>
    ${b.elec_pct}%</span></td>
  </tr>`).join('')}</tbody></table>`;
}


/* ── item cost ── */


let icPieChart=null, icBarChart=null, icSortCol='cost', icSortDir='desc';
function icSort(col){
  if(icSortCol===col) icSortDir=icSortDir==='desc'?'asc':'desc';
  else{icSortCol=col; icSortDir=(col==='desc'||col==='cat')?'asc':'desc';}
  renderICTable();
}

function toggleStationDD(e){
  if(e) e.stopPropagation();
  const dd = document.getElementById('icStationDD');
  const isOpen = dd.style.display!=='none';
  dd.style.display = isOpen ? 'none' : '';
  if(!isOpen){
    setTimeout(()=>{ document.addEventListener('click', closeStDDOnce); }, 10);
  }
}
function closeStDDOnce(e){
  const wrap = document.getElementById('icStationWrap');
  if(!wrap.contains(e.target)){
    document.getElementById('icStationDD').style.display='none';
    document.removeEventListener('click', closeStDDOnce);
  }
}
function stAllChange(cb){
  const checked = cb.checked;
  document.querySelectorAll('#icStationList input[type=checkbox]').forEach(c=>{ c.checked=checked; });
  updateStationActive();
}
function stItemChange(){
  const all = [...document.querySelectorAll('#icStationList input[type=checkbox]')];
  document.getElementById('icStAll').checked = all.every(c=>c.checked);
  updateStationActive();
}
function updateStationActive(){
  const all = [...document.querySelectorAll('#icStationList input[type=checkbox]')];
  const selected = all.filter(c=>c.checked).map(c=>c.value);
  const container = document.getElementById('icStationChips');
  if(selected.length===0||selected.length===all.length){
    container.dataset.active='all';
    document.getElementById('icStationLabel').textContent='ทั้งหมด';
  } else {
    container.dataset.active=selected.join('|');
    document.getElementById('icStationLabel').textContent=`${selected.length} station`;
  }
  renderICTable();
}
function buildStationDD(stations){
  const list = document.getElementById('icStationList');
  if(!list) return;
  const cur = document.getElementById('icStationChips')?.dataset.active||'all';
  const activeSet = cur==='all' ? new Set(stations) : new Set(cur.split('|'));
  list.innerHTML = stations.map(s=>`
    
      
      ${s}
    </label>`).join('');
  document.getElementById('icStAll').checked = activeSet.size===stations.length;
  const lbl = document.getElementById('icStationLabel');
  if(lbl) lbl.textContent = cur==='all'?'ทั้งหมด':`${activeSet.size} station`;
}
function setStation(val,btn){
  const container=document.getElementById('icStationChips');
  if(val==='all'){
    // Clear all → select "ทั้งหมด"
    container.dataset.active='all';
    container.querySelectorAll('.stchip').forEach(b=>b.setAttribute('data-active','false'));
    btn.setAttribute('data-active','true');
  } else {
    // Toggle this station
    const active = new Set(container.dataset.active==='all'?[]:container.dataset.active.split('|').filter(Boolean));
    if(active.has(val)) active.delete(val); else active.add(val);
    if(active.size===0){
      container.dataset.active='all';
    } else {
      container.dataset.active=[...active].join('|');
    }
    // Update chip styles
    container.querySelectorAll('.stchip').forEach(b=>{
      const v=b.dataset.stval;
      if(v==='all') b.setAttribute('data-active', container.dataset.active==='all'?'true':'false');
      else b.setAttribute('data-active', active.has(v)?'true':'false');
    });
  }
  renderICTable();
}

function getICBranch(){
  // Returns 'all' if multiple branches active, or single branch code
  if(!ACTIVE || ACTIVE.length === 0) return 'all';
  if(ACTIVE.length === 1) return ACTIVE[0].code;
  return 'all';
}

function updateICBranchLabel(){
  const el = document.getElementById('icBranchName');
  if(!el) return;
  if(!ACTIVE || ACTIVE.length === 0){ el.textContent = 'ทุกสาขา'; return; }
  if(ACTIVE.length === 1){
    el.textContent = `${ACTIVE[0].code} — ${ACTIVE[0].name}`;
  } else {
    const zone = document.getElementById('fMgr')?.value;
    if(zone && zone !== 'all') el.textContent = `${zone} · ${ACTIVE.length} สาขา`;
    else el.textContent = `ทุกสาขา (${ACTIVE.length} สาขา)`;
  }
}

function renderIC(){
  const code=getICBranch();

  // Build aggregated IC data when 'all' selected
  let d, s;
  if(code==='all'){
    // Aggregate all ACTIVE branches
    const allItems={};
    let totalSales=0;
    ACTIVE.forEach(b=>{
      const bd=IC[b.code];
      if(!bd) return;
      totalSales+=bd.sales||0;
      bd.items.forEach(it=>{
        const k=it[0];
        if(!allItems[k]) allItems[k]=[...it];
        else{
          allItems[k][3]=(allItems[k][3]||0)+(it[3]||0); // cost
          allItems[k][4]=(allItems[k][4]||0)+(it[4]||0); // qty
        }
      });
    });
    const items=Object.values(allItems).sort((a,b2)=>b2[3]-a[3]);
    const summary={};
    items.forEach(it=>{
      if(!summary[it[2]]) summary[it[2]]={amt:0,pct:0};
      summary[it[2]].amt+=it[3]||0;
    });
    Object.keys(summary).forEach(cat=>{
      summary[cat].pct=totalSales>0?+(summary[cat].amt/totalSales*100).toFixed(2):0;
    });
    d={sales:totalSales,items,summary};
    s=totalSales||1;
  } else {
    d=IC[code];
    if(!d) return;
    s=d.sales||1;
  }

  const sm=d.summary;

  // KPI badges
  const cats=[['F&B','#22c55e','#f0fdf4'],['Packaging','#3b82f6','#eff4ff'],['Non-food','#f59e0b','#fffbeb'],['Other','#9aa0ad','#f1f5f9']];
  document.getElementById('icKPI').innerHTML=cats.map(([cat,color,bg])=>{
    const v=sm[cat]||{amt:0,pct:0};
    return `
      ${cat}
      ฿${(v.amt/1e3).toFixed(0)}K
      ฿${v.amt.toLocaleString('en')}
      ${v.pct}% of Sales</span>
    `;
  }).join('');

  // Donut
  const catOrder=['F&B','Packaging','Non-food','Other'];
  const catColors=['#22c55e','#3b82f6','#f59e0b','#9aa0ad'];
  if(icPieChart) icPieChart.destroy();
  icPieChart=new Chart(document.getElementById('icPie'),{
    type:'doughnut',
    data:{
      labels:catOrder.map(c=>`${c} ${(sm[c]?.pct||0)}%`),
      datasets:[{data:catOrder.map(c=>sm[c]?.amt||0),backgroundColor:catColors,borderWidth:2,borderColor:'#fff'}]
    },
    options:{responsive:true,maintainAspectRatio:false,cutout:'58%',
      plugins:{datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>0,
        color:'#fff',font:{weight:'700',size:11},
        formatter:(v,ctx)=>{const tot=ctx.dataset.data.reduce((a,b)=>a+b,0); return tot?`${(v/tot*100).toFixed(1)}%`:'';}},
        legend:{position:'right',labels:{padding:12,font:{size:11},boxWidth:12}},
        tooltip:{callbacks:{label:c=>`฿${c.raw.toLocaleString('en')} (${(c.raw/s*100).toFixed(2)}% of Sales)`}}}}
  });

  // Top 10 bar
  const top10=[...d.items].slice(0,10);
  document.getElementById('icTop10Sub').textContent=`Top 10 รายการ · ${d.items.length} รายการทั้งหมด`;
  if(icBarChart) icBarChart.destroy();
  const bColors={'F&B':'#22c55e','Packaging':'#3b82f6','Non-food':'#f59e0b','Other':'#9aa0ad'};
  icBarChart=new Chart(document.getElementById('icBar'),{
    type:'bar',
    data:{
      labels:top10.map(it=>it[1].substring(0,28)),
      datasets:[{
        data:top10.map(it=>it[3]),
        backgroundColor:top10.map(it=>bColors[it[2]]||'#9aa0ad'),
        borderRadius:4
      }]
    },
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:65}},
      plugins:{legend:{display:false},
        datalabels:{color:ctx=>bColors[top10[ctx.dataIndex]?.[2]]||'#374151',font:{weight:'700',size:9},
          formatter:v=>`฿${(v/1e3).toFixed(0)}K`,anchor:'end',align:'right',offset:3},
        tooltip:{callbacks:{label:c=>`฿${c.raw.toLocaleString('en')} (${(c.raw/s*100).toFixed(2)}% Sales)`}}},
      scales:{x:{ticks:{callback:v=>v>=1e3?`฿${(v/1e3).toFixed(0)}K`:''}},y:{ticks:{font:{size:9}},grid:{display:false}}}}
  });

  // Populate station list (preserve user's selection)
  const stations=[...new Set(d.items.map(it=>it[6]).filter(Boolean))].sort();
  buildStationDD(stations);
  renderICTable();
}

function renderICTable(){
  const code = getICBranch();

  // Build d for 'all' case
  let d_ic;
  if(code==='all'){
    const allItems={};
    let totalSales=0;
    ACTIVE.forEach(b=>{
      const bd=IC[b.code];
      if(!bd) return;
      totalSales+=bd.sales||0;
      bd.items.forEach(it=>{
        const k=it[0];
        if(!allItems[k]) allItems[k]=[...it];
        else{ allItems[k][3]=(allItems[k][3]||0)+(it[3]||0); allItems[k][4]=(allItems[k][4]||0)+(it[4]||0); }
      });
    });
    d_ic={sales:totalSales,items:Object.values(allItems).sort((a,b2)=>b2[3]-a[3])};
  } else {
    d_ic=IC[code];
  }
  if(!d_ic) return;

  const cat  = document.getElementById('icCat').value;
  const q    = document.getElementById('icQ').value.toLowerCase();
  const stChips = document.getElementById('icStationChips');
  const st   = stChips ? stChips.dataset.active||'all' : 'all';
  const bColors = {'F&B':'cg','Packaging':'cb','Non-food':'ca','Other':'ct'};
  const fmtQty  = v => !v&&v!==0?'—':v>=1000?`${(v/1000).toFixed(1)}K`:v%1===0?v.toLocaleString('en'):`${v.toFixed(2)}`;

  // ── Toggle chips ──────────────────────────────────────────────
  const toggleWrap = document.getElementById('icMonthToggle');
  if(!toggleWrap._built){
    toggleWrap._built = true;
    toggleWrap.innerHTML = '';
    [['all','📊 รวม'],['monthly','📅 รายเดือน']].forEach(([key,label])=>{
      const chip = document.createElement('button');
      chip.className = 'stchip';
      chip.textContent = label;
      chip.dataset.mkey = key;
      chip.setAttribute('data-active', key==='all'?'true':'false');
      chip.onclick = () => setICMonth(key);
      toggleWrap.appendChild(chip);
    });
    toggleWrap.dataset.active  = 'all';
    toggleWrap.dataset.showPct = 'false';
  }

  const viewMode = toggleWrap.dataset.active || 'all';
  const showPct  = toggleWrap.dataset.showPct === 'true';

  // % toggle button
  let pctBtn = document.getElementById('icPctToggle');
  if(viewMode === 'monthly'){
    if(!pctBtn){
      pctBtn = document.createElement('button');
      pctBtn.id = 'icPctToggle';
      pctBtn.className = 'stchip';
      pctBtn.style.marginLeft = '8px';
      pctBtn.onclick = ()=>{
        const w = document.getElementById('icMonthToggle');
        w.dataset.showPct = w.dataset.showPct==='true'?'false':'true';
        pctBtn.setAttribute('data-active', w.dataset.showPct);
        renderICTable();
      };
      toggleWrap.appendChild(pctBtn);
    }
    pctBtn.textContent = showPct ? '% ซ่อน' : '% of Sales';
    pctBtn.setAttribute('data-active', showPct?'true':'false');
    pctBtn.style.display = '';
  } else if(pctBtn){
    pctBtn.style.display = 'none';
  }

  // ── 12 months config ─────────────────────────────────────────
  const allTwelve = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06',
                     '2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'];
  const monthLabels = {
    '2026-01':'ม.ค.','2026-02':'ก.พ.','2026-03':'มี.ค.','2026-04':'เม.ย.',
    '2026-05':'พ.ค.','2026-06':'มิ.ย.','2026-07':'ก.ค.','2026-08':'ส.ค.',
    '2026-09':'ก.ย.','2026-10':'ต.ค.','2026-11':'พ.ย.','2026-12':'ธ.ค.'
  };

  // Per-month lookup (support 'all' = aggregate ACTIVE branches)
  const monthData = {};
  allTwelve.forEach(mk=>{
    const mICObj = MONTHS[mk] ? MONTHS[mk].ic : null;
    const map = {};
    let mSales = 0;
    if(mICObj){
      const branches = code==='all' ? ACTIVE.map(b=>b.code) : [code];
      branches.forEach(bc=>{
        const branchIC = mICObj[bc];
        if(!branchIC) return;
        mSales += branchIC.sales||0;
        if(branchIC.items) branchIC.items.forEach(it=>{
          if(!map[it[0]]) map[it[0]] = {qty:0, cost:0};
          map[it[0]].qty  += it[4]||0;
          map[it[0]].cost += it[3]||0;
        });
      });
    }
    monthData[mk] = {map, sales:mSales, hasData: mSales>0};
  });

  // ── Items ─────────────────────────────────────────────────────
  const d = d_ic;
  const s = d?.sales||1;
  let items = d ? [...d.items] : [];
  if(cat!=='all') items = items.filter(it=>it[2]===cat);
  const stSet = st==='all' ? null : new Set(st.split('|').filter(Boolean));
  if(stSet) items = items.filter(it=>stSet.has(it[6]));
  if(q) items = items.filter(it=>
    it[0].toLowerCase().includes(q)||
    it[1].toLowerCase().includes(q)||
    (it[6]&&it[6].toLowerCase().includes(q)));
  items.sort((a,b)=>{
    let va,vb;
    if(icSortCol==='cost'||icSortCol==='pct'){va=a[3];vb=b[3];}
    else if(icSortCol==='qty'){va=a[4]||0;vb=b[4]||0;}
    else if(icSortCol==='uc'){va=a[5]||0;vb=b[5]||0;}
    else if(icSortCol==='cat'){va=a[2];vb=b[2];}
    else if(icSortCol==='station'){va=a[6]||'';vb=b[6]||'';}
    else{va=a[1];vb=b[1];}
    if(typeof va==='string') return icSortDir==='asc'?va.localeCompare(vb):vb.localeCompare(va);
    return icSortDir==='asc'?va-vb:vb-va;
  });
  document.getElementById('icCount').textContent = `${items.length} รายการ`;
  const maxCost = items.length ? items[0][3] : 1;

  // ── Rebuild thead completely each time ────────────────────────
  const thead = document.querySelector('#icThead tr');
  // clear all existing th's and rebuild
  thead.innerHTML = '';
  
  const addTh = (html, style='') => {
    const th = document.createElement('th');
    if(style) th.style.cssText = style;
    th.innerHTML = html;
    thead.appendChild(th);
    return th;
  };

  // Fixed cols always present
  addTh('#', 'width:32px');
  addTh('รายการ', 'cursor:pointer', );
  thead.lastElementChild.onclick = ()=>icSort('desc');
  addTh('Category', 'cursor:pointer');
  thead.lastElementChild.onclick = ()=>icSort('cat');
  addTh('Station', 'cursor:pointer');
  thead.lastElementChild.onclick = ()=>icSort('station');

  // icValue toggle: 'cost' or 'qty'
  const icValueMode = (document.getElementById('icValQty')?.getAttribute('data-active')==='true') ? 'qty' : 'cost';
  // Show/hide value toggle
  const valWrap = document.getElementById('icValueToggleWrap');
  if(valWrap) valWrap.style.display = viewMode==='all' ? '' : 'none';

  if(viewMode === 'all'){
    // Normal mode: ราคา/หน่วย, ต้นทุน(฿) OR QTY, % of Sales, Bar
    addTh('ราคา/หน่วย', 'text-align:right;cursor:pointer');
    thead.lastElementChild.onclick = ()=>icSort('uc');
    if(icValueMode==='qty'){
      addTh('จำนวน (QTY)', 'text-align:right;cursor:pointer;color:#7c3aed');
      thead.lastElementChild.onclick = ()=>icSort('qty');
    } else {
      addTh('ต้นทุน (฿)', 'text-align:right;cursor:pointer');
      thead.lastElementChild.onclick = ()=>icSort('cost');
    }
    addTh('% of Sales', 'text-align:right;cursor:pointer');
    thead.lastElementChild.onclick = ()=>icSort('pct');
    addTh('Bar');
  } else {
    // Monthly mode: 12 month cols + bar
    allTwelve.forEach(mk=>{
      const hasData = monthData[mk].hasData;
      const label   = monthLabels[mk];
      const subLabel= showPct ? '%' : 'qty';
      addTh(
        `${label}${subLabel}`,
        `text-align:right;font-size:.68rem;white-space:nowrap;width:68px;color:${hasData?'#7c3aed':'#cbd5e1'}`
      );
    });
    addTh('Bar');
  }

  // ── Rows ─────────────────────────────────────────────────────
  document.getElementById('icBody').innerHTML = items.map((it,i)=>{
    const pct     = (it[3]/s*100).toFixed(2);
    const bw      = Math.round(it[3]/maxCost*100);
    const barColor= {'F&B':'#22c55e','Packaging':'#3b82f6','Non-food':'#f59e0b','Other':'#9aa0ad'}[it[2]]||'#9aa0ad';

    let dataCols = '';
    if(viewMode === 'all'){
      const midVal = icValueMode==='qty'
        ? `${it[4]?fmtQty(it[4]):'—'}</td>`
        : `฿${it[3].toLocaleString('en')}</td>`;
      dataCols = `
        ${it[5]?'฿'+it[5].toLocaleString('en'):'—'}</td>
        ${midVal}
        ${pct}%</td>`;
    } else {
      dataCols = allTwelve.map(mk=>{
        const md    = monthData[mk];
        const entry = md.map[it[0]];
        let val;
        if(!md.hasData){
          val = `·</span>`;
        } else if(!entry){
          val = `—</span>`;
        } else if(showPct){
          val = `${(entry.cost/md.sales*100).toFixed(1)}%</span>`;
        } else {
          val = `${fmtQty(entry.qty)}</span>`;
        }
        return `${val}</td>`;
      }).join('');
    }

    return `
      ${i+1}</td>
      ${it[1]}${it[0]}</td>
      ${it[2]}</span></td>
      ${it[6]||'—'}</td>
      ${dataCols}
      </td>
    </tr>`;
  }).join('');
}

function setICValue(mode){
  document.getElementById('icValCost').setAttribute('data-active', mode==='cost'?'true':'false');
  document.getElementById('icValQty').setAttribute('data-active',  mode==='qty'?'true':'false');
  renderICTable();
}

function setICMonth(mk){
  const wrap = document.getElementById('icMonthToggle');
  wrap.dataset.active = mk;
  wrap.querySelectorAll('.stchip[data-mkey]').forEach(btn=>{
    btn.setAttribute('data-active', btn.dataset.mkey===mk?'true':'false');
  });
  renderICTable();
}

/* ── monthly compare ── */
/* mxZone/mxBranch populated by populateDropdowns() after login */

function mxZoneChange(){
  const z=document.getElementById('mxZone').value;
  const sel=document.getElementById('mxBranch');
  const cur=sel.value;
  const firstRaw=MONTHS[Object.keys(MONTHS)[0]].raw;
  while(sel.options.length) sel.remove(0);
  const pool=z==='all'?firstRaw:firstRaw.filter(b=>MGR[z]?.includes(b.code));
  pool.forEach(b=>sel.appendChild(new Option(`${b.code} — ${b.name}`,b.code)));
  if(pool.find(b=>b.code===cur)) sel.value=cur;
  renderMXBranch();
}

function renderMX(){
  const mode=document.getElementById('mxMode').value;
  document.getElementById('mxBranchPanel').style.display=mode==='branch'?'':'none';
  document.getElementById('mxKPIPanel').style.display=mode==='kpi'?'':'none';
  if(mode==='branch') renderMXBranch();
  else renderMXKPI();
}

let mxBrCh=null, mxBrAllCh=null, mxKpiSalesCh=null, mxKpiNetCh=null;

function renderMXBranch(){
  const code=document.getElementById('mxBranch').value;
  const metric=document.getElementById('mxMetric').value;
  const months=Object.keys(MONTHS).sort();
  if(!months.length) return;

  const labels=months.map(k=>MONTHS[k].label);
  const metricLabels={sales:'ยอดขาย',gp_pct:'GP%',net_pct:'Net%',op_profit_pct:'Op%',
    cog_pct:'COG%',col_pct:'COL%',sa_pct:'S&A%',rent_pct:'ค่าเช่า%',elec_pct:'ค่าไฟ%'};
  const isPct=metric!=='sales';

  // Get branch data per month
  const getData=m=>MONTHS[m].raw.find(b=>b.code===code);
  const values=months.map(m=>{const b=getData(m); return b?+(b[metric]).toFixed(isPct?1:0):null;});
  const branchName=getData(months[0])?.name||code;

  document.getElementById('mxBrTitle').textContent=`${branchName} — ${metricLabels[metric]} รายเดือน`;
  document.getElementById('mxBrSub').textContent=months.length+' เดือน';

  if(mxBrCh) mxBrCh.destroy();
  mxBrCh=new Chart(document.getElementById('mxBrChart'),{
    type:'bar',
    data:{labels,datasets:[{
      label:metricLabels[metric],
      data:values,
      backgroundColor:months.map((_,i)=>i===months.indexOf(curMonth)?C.b:C.b+'88'),
      borderRadius:6
    }]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:20}},
      plugins:{legend:{display:false},
        datalabels:{color:'#374151',font:{weight:'700',size:10},
          formatter:v=>v===null?'':isPct?`${v}%`:`฿${(v/1e6).toFixed(2)}M`,anchor:'end',align:'top',offset:2},
        tooltip:{callbacks:{label:c=>isPct?`${c.raw}%`:`฿${(c.raw/1e6).toFixed(2)}M`}}},
      scales:{x:{grid:{display:false}},y:{ticks:{callback:v=>isPct?`${v}%`:`฿${(v/1e6).toFixed(1)}M`}}}}
  });

  // All metrics radar/bar
  const allMetrics=['gp_pct','net_pct','cog_pct','col_pct','sa_pct','rent_pct'];
  const allLabels=['GP%','Net%','COG%','COL%','S&A%','ค่าเช่า%'];
  const colors=[C.b,C.g,C.t,C.p,C.o,C.a,C.r];
  const datasets=months.map((m,i)=>{
    const b=MONTHS[m].raw.find(x=>x.code===code);
    return {label:MONTHS[m].label,
      data:allMetrics.map(k=>b?+b[k].toFixed(1):null),
      backgroundColor:colors[i]+'33',borderColor:colors[i],borderWidth:2,pointRadius:3};
  });

  document.getElementById('mxBrAllSub').textContent=branchName+' · '+months.length+' เดือน';
  if(mxBrAllCh) mxBrAllCh.destroy();
  mxBrAllCh=new Chart(document.getElementById('mxBrAllChart'),{
    type:'radar',data:{labels:allLabels,datasets},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{font:{size:10}}},datalabels:{display:false}},
      scales:{r:{ticks:{display:false,backdropColor:'transparent'},pointLabels:{font:{size:10}}}}}
  });

  // Table
  const metrics=['sales','gp_pct','op_profit_pct','net_pct','cog_pct','col_pct','sa_pct','rent_pct','elec_pct'];
  const mLabels=['Sales','GP%','Op%','Net%','COG%','COL%','S&A%','ค่าเช่า%','ค่าไฟ%'];
  document.getElementById('mxTHead').innerHTML='Metric</th>'+months.map(m=>`${MONTHS[m].label}</th>`).join('');
  document.getElementById('mxTBody').innerHTML=metrics.map((mk,ri)=>{
    const isPctRow=mk!=='sales';
    const vals=months.map(m=>{const b=MONTHS[m].raw.find(x=>x.code===code); return b?b[mk]:null;});
    const cells=vals.map((v,ci)=>{
      if(v===null) return '—</td>';
      const disp=isPctRow?`${v.toFixed(1)}%`:`฿${(v/1e6).toFixed(2)}M`;
      // color change vs prev month
      const prev=ci>0?vals[ci-1]:null;
      let color='';
      if(prev!==null&&v!==null){
        const delta=v-prev;
        const good=mk==='sales'||mk==='gp_pct'||mk==='net_pct'||mk==='op_profit_pct';
        color=delta===0?'':((good&&delta>0)||(!good&&delta<0))?'color:#16a34a':'color:#dc2626';
        const arrow=delta>0?'▲':'▼';
        const chg=isPctRow?`${Math.abs(delta).toFixed(1)}%`:`฿${(Math.abs(delta)/1e6).toFixed(2)}M`;
        return `${disp} ${arrow}${chg}</span></td>`;
      }
      return `${disp}</td>`;
    }).join('');
    return `${mLabels[ri]}</td>${cells}</tr>`;
  }).join('');
}

function renderMXKPI(){
  const months=Object.keys(MONTHS).sort();
  const labels=months.map(k=>MONTHS[k].label);
  const totalSales=months.map(m=>+(MONTHS[m].raw.reduce((s,b)=>s+b.sales,0)/1e6).toFixed(2));
  const avgNet=months.map(m=>{
    const r=MONTHS[m].raw; const s=r.reduce((a,b)=>a+b.sales,0)||1;
    return +(r.reduce((a,b)=>a+b.net_profit,0)/s*100).toFixed(1);
  });

  if(mxKpiSalesCh) mxKpiSalesCh.destroy();
  mxKpiSalesCh=new Chart(document.getElementById('mxKpiSales'),{
    type:'bar',data:{labels,datasets:[{label:'Sales (฿M)',data:totalSales,backgroundColor:C.b+'cc',borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:20}},
      plugins:{legend:{display:false},datalabels:{color:'#2563eb',font:{weight:'700',size:11},formatter:v=>`฿${v}M`,anchor:'end',align:'top',offset:2}},
      scales:{x:{grid:{display:false}},y:{ticks:{callback:v=>`฿${v}M`}}}}
  });
  if(mxKpiNetCh) mxKpiNetCh.destroy();
  mxKpiNetCh=new Chart(document.getElementById('mxKpiNet'),{
    type:'line',data:{labels,datasets:[{label:'Net% เฉลี่ย',data:avgNet,borderColor:C.p,backgroundColor:C.p+'22',borderWidth:2.5,pointRadius:5,fill:true,tension:.3}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:20}},
      plugins:{legend:{display:false},datalabels:{color:C.p,font:{weight:'700',size:11},formatter:v=>`${v}%`,anchor:'top',align:'top',offset:4}},
      scales:{x:{grid:{display:false}},y:{ticks:{callback:v=>`${v}%`}}}}
  });

  // KPI comparison cards per month
  document.getElementById('mxKpiCards').innerHTML=months.map(m=>{
    const r=MONTHS[m].raw, s=r.reduce((a,b)=>a+b.sales,0)||1;
    const net=r.reduce((a,b)=>a+b.net_profit,0)/s*100;
    const gp=r.reduce((a,b)=>a+b.gp1,0)/s*100;
    return `
      ${MONTHS[m].label}
      ฿${(s/1e6).toFixed(1)}M
      ${r.length} สาขา
      =20?'cg':net>=10?'ca':'cr'}">Net ${net.toFixed(1)}%</span>
      GP ${gp.toFixed(1)}%</span>
    `;
  }).join('');
}

/* ── tabs ── */
function showTab(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nbtn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  btn.classList.add('active');
  if(id==='icx') initICX();
}


/* ═══════════════════════════════════════════════
   ITEM COMPARE (ICX) — cross-branch item table
   ═══════════════════════════════════════════════ */
let icxMode = 'thb';
let icxViewMode = 'branch'; // 'branch' or 'month'
let icxInited = false;

function rebuildICXBranch(){
  const brSel = document.getElementById('icxBranch');
  if(!brSel) return;
  const curVal = brSel.value;
  while(brSel.options.length) brSel.remove(0);
  ACTIVE.forEach(b => brSel.appendChild(new Option(`${b.code} — ${b.name}`, b.code)));
  // Restore previous selection if still valid
  if(curVal && [...brSel.options].some(o=>o.value===curVal)) brSel.value = curVal;
}

function buildTiers(monthKey){
  // Build tiers from selected month's raw data
  // Tier = group branches where max-min sales <= 500,000
  const mdata = MONTHS[monthKey];
  if(!mdata) return [];
  
  // Sort branches by sales descending
  const sorted = [...(mdata.raw||[])].sort((a,b) => b.sales - a.sales);
  
  const tiers = [];
  let tierStart = 0;
  let i = 0;
  while(i < sorted.length){
    const startSales = sorted[i].sales;
    const tier = [sorted[i]];
    i++;
    while(i < sorted.length && (startSales - sorted[i].sales) <= 500000){
      tier.push(sorted[i]);
      i++;
    }
    tiers.push(tier);
  }
  return tiers;
}

function populateICXTier(monthKey){
  const sel = document.getElementById('icxTier');
  if(!sel) return;
  const curVal = sel.value;
  while(sel.options.length > 1) sel.remove(1);
  
  const tiers = buildTiers(monthKey);
  tiers.forEach((tier, idx) => {
    const minS = Math.min(...tier.map(b=>b.sales));
    const maxS = Math.max(...tier.map(b=>b.sales));
    const label = `Tier ${idx+1} — ${tier.length} สาขา (฿${(minS/1e6).toFixed(1)}M–${(maxS/1e6).toFixed(1)}M)`;
    sel.appendChild(new Option(label, idx));
  });
  
  // Restore selection if valid
  if(curVal !== 'all' && [...sel.options].some(o=>o.value===curVal)) sel.value = curVal;
}

function setICXViewMode(mode){
  icxViewMode = mode;
  // Toggle buttons
  document.getElementById('icxModeBranch').style.cssText = mode==='branch'
    ? 'padding:5px 14px;border:none;background:var(--blue);color:#fff;font-family:inherit;font-size:.78rem;font-weight:700;cursor:pointer'
    : 'padding:5px 14px;border:none;background:#fff;color:var(--t2);font-family:inherit;font-size:.78rem;font-weight:600;cursor:pointer';
  document.getElementById('icxModeMonth').style.cssText = mode==='month'
    ? 'padding:5px 14px;border:none;background:var(--blue);color:#fff;font-family:inherit;font-size:.78rem;font-weight:700;cursor:pointer'
    : 'padding:5px 14px;border:none;background:#fff;color:var(--t2);font-family:inherit;font-size:.78rem;font-weight:600;cursor:pointer';
  // Show/hide controls
  const monthSel = document.getElementById('icxMonth');
  const branchSel = document.getElementById('icxBranch');
  const stationBtn = document.getElementById('icxStationBtn');
  if(mode==='branch'){
    if(monthSel) monthSel.style.display='';
    if(branchSel) branchSel.style.display='none';
    if(stationBtn) stationBtn.style.display='';
  } else {
    if(monthSel) monthSel.style.display='none';
    if(branchSel) branchSel.style.display='';
    if(stationBtn) stationBtn.style.display='';
  }
  renderICX();
}

function toggleICXStationDD(){
  const dd = document.getElementById('icxStationDD');
  dd.style.display = dd.style.display==='none' ? 'block' : 'none';
}

function toggleAllStations(checked){
  document.querySelectorAll('.icxStChk').forEach(c => c.checked = checked);
  updateStationLabel();
  renderICX();
}

function onStationChange(){
  const all = document.querySelectorAll('.icxStChk');
  const checked = document.querySelectorAll('.icxStChk:checked');
  document.getElementById('icxChkAll').checked = all.length === checked.length;
  document.getElementById('icxChkAll').indeterminate = checked.length > 0 && checked.length < all.length;
  updateStationLabel();
  renderICX();
}

function updateStationLabel(){
  const checked = [...document.querySelectorAll('.icxStChk:checked')].map(c=>c.value);
  const all = document.querySelectorAll('.icxStChk').length;
  const lbl = document.getElementById('icxStationLabel');
  if(!lbl) return;
  if(checked.length === 0) lbl.textContent = 'ไม่ได้เลือก';
  else if(checked.length === all) lbl.textContent = 'ทุก Station';
  else if(checked.length === 1) lbl.textContent = checked[0];
  else lbl.textContent = `${checked.length} Station`;
}

// Close dropdown when clicking outside
document.addEventListener('click', e => {
  const dd = document.getElementById('icxStationDD');
  const btn = document.getElementById('icxStationBtn');
  if(dd && !dd.contains(e.target) && e.target !== btn && !btn?.contains(e.target)){
    dd.style.display = 'none';
  }
});

function setICXMode(m){
  icxMode = m;
  ['thb','pct','qty'].forEach(mode => {
    const btn = document.getElementById('icx'+mode.toUpperCase());
    if(btn) btn.style.cssText = mode===m
      ? 'padding:5px 14px;border:none;background:var(--blue);color:#fff;font-family:inherit;font-size:.78rem;font-weight:700;cursor:pointer'
      : 'padding:5px 14px;border:none;background:#fff;color:var(--t2);font-family:inherit;font-size:.78rem;font-weight:600;cursor:pointer';
  });
  renderICX();
}

function initICX(){
  // Populate month dropdown
  const mSel = document.getElementById('icxMonth');
  if(mSel){
    while(mSel.options.length) mSel.remove(0);
    Object.keys(MONTHS).sort().forEach(k => {
      mSel.appendChild(new Option(MONTHS[k].label, k));
    });
  }
  // Populate station checkbox list
  const stList = document.getElementById('icxStationList');
  if(stList && stList.children.length === 0){
    const stations = new Set();
    Object.values(MONTHS).forEach(mdata => {
      const icObj = mdata.ic || {};
      Object.values(icObj).forEach(branchIC => {
        (branchIC.items||[]).forEach(it => { if(it[6]) stations.add(it[6]); });
      });
    });
    [...stations].sort().forEach(s => {
      const lbl = document.createElement('label');
      lbl.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 14px;cursor:pointer;font-size:.8rem;white-space:nowrap';
      lbl.innerHTML = ` ${s}`;
      stList.appendChild(lbl);
    });
  }
  // Populate branch dropdown for monthly mode - always rebuild to match ACTIVE
  rebuildICXBranch();
  // Populate tier dropdown
  const icxMonthEl = document.getElementById('icxMonth');
  populateICXTier(icxMonthEl?.value || Object.keys(MONTHS).sort()[0]);
  renderICX();
}

function renderICX(){
  if(icxViewMode === 'month') { renderICXMonth(); return; }

  const selMonth = document.getElementById('icxMonth')?.value || Object.keys(MONTHS).sort()[0];
  const checkedStations = [...document.querySelectorAll('.icxStChk:checked')].map(c=>c.value);
  const selStation = checkedStations.length === 0 ? 'none' : checkedStations;
  const mdata = MONTHS[selMonth];
  if(!mdata) return;

  // Get branches: use ACTIVE (respects top filter bar zone/branch selection)
  const zoneOrder = Object.keys(MGR);
  const activeCodes = new Set(ACTIVE.map(b=>b.code));
  
  // Filter by tier if selected
  const selTier = document.getElementById('icxTier')?.value;
  let tierCodes = null;
  if(selTier && selTier !== 'all'){
    const tiers = buildTiers(selMonth);
    const tierIdx = parseInt(selTier);
    if(tiers[tierIdx]) tierCodes = new Set(tiers[tierIdx].map(b=>b.code));
  }
  
  const branches = (mdata.raw||[])
    .filter(b => activeCodes.has(b.code) && (!tierCodes || tierCodes.has(b.code)))
    .sort((a,b) => b.sales - a.sales); // Sort by sales desc within tier

  // Get IC data per branch for selected month
  const icData = mdata.ic || {};

  // Collect all items across branches filtered by station
  const itemMap = {}; // code -> {name, station, byBranch: {code: {amt,pct,qty}}}
  branches.forEach(br => {
    const bic = icData[br.code];
    if(!bic) return;
    const brSales = br.sales || 1;
    (bic.items||[]).forEach(it => {
      const [code, name, cat, amt, qty, avg, station] = it;
      if(selStation !== 'all' && Array.isArray(selStation) && !selStation.includes(station)) return;
      if(!itemMap[code]) itemMap[code] = {name, station, cat, byBranch:{}};
      itemMap[code].byBranch[br.code] = {amt: amt||0, qty: qty||0, pct: +((amt/brSales)*100).toFixed(2)};
    });
  });

  const items = Object.entries(itemMap).sort((a,b) => {
    if(a[1].station !== b[1].station) return (a[1].station||'').localeCompare(b[1].station||'');
    const totalA = Object.values(a[1].byBranch).reduce((s,v)=>s+v.amt,0);
    const totalB = Object.values(b[1].byBranch).reduce((s,v)=>s+v.amt,0);
    return totalB - totalA;
  });

  document.getElementById('icxCount').textContent = `${items.length} รายการ`;

  // Build header
  const thStyle = 'text-align:center;padding:4px 8px;font-size:.65rem;white-space:nowrap;min-width:60px;max-width:80px';
  let headHtml = '';
  headHtml += 'รายการ</th>';
  headHtml += 'Station</th>';
  branches.forEach(br => {
    headHtml += `
      ${br.code}
      ${(br.name||'').substring(0,10)}
    </th>`;
  });
  headHtml += `เฉลี่ย</th>`;
  headHtml += '</tr>';
  document.getElementById('icxHead').innerHTML = headHtml;

  // Build rows
  const align = icxMode==='thb' ? 'right' : 'center';
  let bodyHtml = '', curStation = '';
  items.forEach(([code, item]) => {
    if(item.station !== curStation){
      curStation = item.station;
      bodyHtml += `${curStation||'ไม่ระบุ'}</td></tr>`;
    }
    const vals = branches.map(br => item.byBranch[br.code]?.amt||0).filter(v=>v>0);
    const maxVal = vals.length ? Math.max(...vals) : 1;
    const maxQty = Math.max(...branches.map(b=>item.byBranch[b.code]?.qty||0).filter(v=>v>0),1);

    // Avg
    const avail = branches.filter(br => item.byBranch[br.code]?.amt > 0);
    let avgFv = '—';
    if(avail.length > 0){
      if(icxMode==='thb'){ const v=avail.reduce((s,br)=>s+(item.byBranch[br.code]?.amt||0),0)/avail.length; avgFv='฿'+Math.round(v).toLocaleString('en'); }
      else if(icxMode==='pct'){ const v=avail.reduce((s,br)=>s+(item.byBranch[br.code]?.pct||0),0)/avail.length; avgFv=v.toFixed(2)+'%'; }
      else { const v=avail.reduce((s,br)=>s+(item.byBranch[br.code]?.qty||0),0)/avail.length; avgFv=v.toFixed(1); }
    }

    bodyHtml += `${item.name.substring(0,40)}</td>`;
    bodyHtml += `${item.station||'—'}</td>`;
    branches.forEach(br => {
      const bdata = item.byBranch[br.code];
      if(!bdata || bdata.amt === 0){ bodyHtml += `—</td>`; return; }
      const heatBase = icxMode==='qty' ? (bdata.qty||0) : bdata.amt;
      const heatMax  = icxMode==='qty' ? maxQty : maxVal;
      const heat = Math.round((heatBase/heatMax)*80);
      const bgColor = `rgba(37,99,235,${(heat/100).toFixed(2)})`;
      const textColor = heat > 50 ? '#fff' : 'inherit';
      let fv;
      if(icxMode==='thb')      fv = '฿'+bdata.amt.toLocaleString('en',{maximumFractionDigits:0});
      else if(icxMode==='pct') fv = bdata.pct+'%';
      else                     fv = (bdata.qty||0).toLocaleString('en',{maximumFractionDigits:0});
      bodyHtml += `${fv}</td>`;
    });
    bodyHtml += `${avgFv}</td>`;
    bodyHtml += '</tr>';
  });
  document.getElementById('icxBody').innerHTML = bodyHtml;
}

/* ── ICX Monthly Mode ── */
function renderICXMonth(){
  const ALL_MONTHS = [
    ['2026-01','ม.ค.'],['2026-02','ก.พ.'],['2026-03','มี.ค.'],['2026-04','เม.ย.'],
    ['2026-05','พ.ค.'],['2026-06','มิ.ย.'],['2026-07','ก.ค.'],['2026-08','ส.ค.'],
    ['2026-09','ก.ย.'],['2026-10','ต.ค.'],['2026-11','พ.ย.'],['2026-12','ธ.ค.']
  ];
  const code = document.getElementById('icxBranch')?.value;
  if(!code) return;

  const checkedStations = [...document.querySelectorAll('.icxStChk:checked')].map(c=>c.value);
  const selStation = checkedStations.length === 0 ? 'none' : checkedStations;

  // Collect all items across all months for this branch
  const itemMap = {};
  ALL_MONTHS.forEach(([mk]) => {
    const mdata = MONTHS[mk];
    if(!mdata) return;
    const bic = mdata.ic?.[code];
    if(!bic) return;
    const brSales = (mdata.raw||[]).find(b=>b.code===code)?.sales || 1;
    (bic.items||[]).forEach(it => {
      const [icode, name, cat, amt, qty, avg, station] = it;
      if(selStation !== 'all' && Array.isArray(selStation) && !selStation.includes(station)) return;
      if(!itemMap[icode]) itemMap[icode] = {name, station, cat, byMonth:{}};
      itemMap[icode].byMonth[mk] = {amt: amt||0, qty: qty||0, pct: +((amt/brSales)*100).toFixed(2)};
    });
  });

  const items = Object.entries(itemMap).sort((a,b) => {
    if(a[1].station !== b[1].station) return (a[1].station||'').localeCompare(b[1].station||'');
    const totalA = Object.values(a[1].byMonth).reduce((s,v)=>s+v.amt,0);
    const totalB = Object.values(b[1].byMonth).reduce((s,v)=>s+v.amt,0);
    return totalB - totalA;
  });

  document.getElementById('icxCount').textContent = `${items.length} รายการ`;

  // Header
  const thS = 'text-align:center;padding:4px 8px;font-size:.65rem;white-space:nowrap;min-width:58px';
  const brName = ACTIVE.find(b=>b.code===code)?.name || code;
  let headHtml = `
    รายการ (${code} ${brName})</th>
    Station</th>`;
  ALL_MONTHS.forEach(([mk,ml]) => {
    headHtml += `${ml}</th>`;
  });
  headHtml += `${icxMode==='thb'?'รวม':'เฉลี่ย'}</th></tr>`;
  document.getElementById('icxHead').innerHTML = headHtml;

  // Body
  const align = icxMode==='thb' ? 'right' : 'center';
  let bodyHtml = '', curStation = '';
  items.forEach(([icode, item]) => {
    if(item.station !== curStation){
      curStation = item.station;
      bodyHtml += `${curStation||'ไม่ระบุ'}</td></tr>`;
    }

    // Max for heatmap
    const monthVals = ALL_MONTHS.map(([mk])=>item.byMonth[mk]?.amt||0).filter(v=>v>0);
    const maxVal = monthVals.length ? Math.max(...monthVals) : 1;
    const maxQty = Math.max(...ALL_MONTHS.map(([mk])=>item.byMonth[mk]?.qty||0).filter(v=>v>0),1);

    // Avg/sum
    const availM = ALL_MONTHS.filter(([mk])=>item.byMonth[mk]?.amt>0);
    let sumAmt=0, sumPct=0, sumQty=0;
    availM.forEach(([mk])=>{ sumAmt+=item.byMonth[mk].amt||0; sumPct+=item.byMonth[mk].pct||0; sumQty+=item.byMonth[mk].qty||0; });
    let totalFv='—';
    if(availM.length>0){
      if(icxMode==='thb') totalFv='฿'+Math.round(sumAmt).toLocaleString('en');
      else if(icxMode==='pct') totalFv=(sumPct/availM.length).toFixed(2)+'%';
      else totalFv=(sumQty/availM.length).toFixed(1);
    }

    bodyHtml += `${item.name.substring(0,40)}</td>`;
    bodyHtml += `${item.station||'—'}</td>`;
    ALL_MONTHS.forEach(([mk]) => {
      const d = item.byMonth[mk];
      if(!d || d.amt===0){ bodyHtml += `—</td>`; return; }
      const heatBase = icxMode==='qty' ? d.qty : d.amt;
      const heatMax  = icxMode==='qty' ? maxQty : maxVal;
      const heat = Math.round((heatBase/heatMax)*80);
      const bg = `rgba(37,99,235,${(heat/100).toFixed(2)})`;
      const tc = heat>50?'#fff':'inherit';
      let fv;
      if(icxMode==='thb')      fv='฿'+d.amt.toLocaleString('en',{maximumFractionDigits:0});
      else if(icxMode==='pct') fv=d.pct+'%';
      else                     fv=(d.qty||0).toLocaleString('en',{maximumFractionDigits:0});
      bodyHtml += `${fv}</td>`;
    });
    bodyHtml += `${totalFv}</td></tr>`;
  });
  document.getElementById('icxBody').innerHTML = bodyHtml;
}

/* ── INIT deferred to after login ── */
function initDashboard(){} // stub — rendering done in startLoad








document.addEventListener('DOMContentLoaded', function(){
  // Just show login — dashboard inits after login via startDashboard()
});