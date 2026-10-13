(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const r2=n=>{n=Number(n)||0;const v=Math.round(Number(n+'e2'));return isFinite(v)?v/100:Math.round(n*100)/100};
const money=n=>r2(n).toLocaleString('en-US',{style:'currency',currency:'USD'});
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=p=>p+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const nowIso=()=>new Date().toISOString();
const pct=r=>(+(r*100).toFixed(3))+'%';

const ICON={
  next:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13m-5-5 5 5-5 5"/></svg>',
  print:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/></svg>',
  pickup:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/><path d="m9.5 14 2 2 3.5-3.5"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8.5" y="8.5" width="11" height="11" rx="1.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/></svg>',
  ruler:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 16.5 16.5 3.5l4 4-13 13z"/><path d="m7.5 12.5 2 2M10.5 9.5l2 2M13.5 6.5l2 2"/></svg>',
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3.5V8h4.5M9 13h6M9 16.5h4"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7 4.5 11.5 9 16"/><path d="M4.5 11.5H14a5.5 5.5 0 0 1 0 11h-2"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/></svg>'
};

const STAGES=[
  {id:'new',label:'New order',c:'var(--st-new)'},
  {id:'quoting',label:'Quoting',c:'var(--st-quoting)'},
  {id:'preprod',label:'Pre-production',c:'var(--st-preprod)'},
  {id:'production',label:'Production',c:'var(--st-production)'},
  {id:'complete',label:'Complete',c:'var(--st-complete)'},
  {id:'followup',label:'Follow up',c:'var(--st-followup)'}
];
const STAGE=Object.fromEntries(STAGES.map((s,i)=>[s.id,Object.assign({i},s)]));
const DONE=new Set(['complete','followup']);

const DEFAULT_ITEMS=[
  {name:'B&W copies',unit:'page',price:0.15},
  {name:'Color copies',unit:'page',price:0.65},
  {name:'Banner',unit:'each',price:45},
  {name:'Invitations',unit:'each',price:2.5},
  {name:'Business cards (250)',unit:'box',price:35},
  {name:'Lamination',unit:'sheet',price:3},
  {name:'Binding',unit:'each',price:5}
];

/* ---------- local storage ---------- */
const LS_KEY='pc_state_v2';
function lsGet(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch(e){return f}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}

function normalizeSettings(s){
  s=s||{};
  return {
    storeName:typeof s.storeName==='string'?s.storeName:'The UPS Store',
    taxRate:typeof s.taxRate==='number'&&s.taxRate>=0?s.taxRate:0.07,
    nextNum:Math.max(1,parseInt(s.nextNum,10)||1001),
    storeAddress:typeof s.storeAddress==='string'?s.storeAddress:'',
    storePhone:typeof s.storePhone==='string'?s.storePhone:'',
    storeEmail:typeof s.storeEmail==='string'?s.storeEmail:'',
    quoteDays:Math.max(1,parseInt(s.quoteDays,10)||30),
    invoiceTerms:typeof s.invoiceTerms==='string'?s.invoiceTerms:'Due on receipt',
    footerNote:typeof s.footerNote==='string'?s.footerNote:'Thank you for your business!',
    unclaimedDays:Math.max(1,parseInt(s.unclaimedDays,10)||30),
    locations:Array.isArray(s.locations)?s.locations.filter(x=>typeof x==='string'&&x.trim()):['ABC Folders','Back Shelf','Production Table','Wide Format Roll Box','Foamboard/Yard Sign'],
    papers:Array.isArray(s.papers)?s.papers.filter(x=>typeof x==='string'&&x.trim()):['20# Bond','24# Bond','28# Bond','60# Text','70# Text','80# Text','100# Text','65# Cover','80# Cover','100# Cover','110# Cover','80# Gloss Text','100# Gloss Cover','2prt NCR','3prt NCR','4prt NCR','Label Stock','Vinyl','Coroplast','Foamboard'],
    associates:Array.isArray(s.associates)?s.associates.filter(x=>typeof x==='string'&&x.trim()):[],
    feeTypes:Array.isArray(s.feeTypes)?s.feeTypes.filter(x=>typeof x==='string'&&x.trim()):['Cutting','Folding','Hole Punching','Padding','Rounding Corners','Stapling','Stuffing/Stamping'],
    items:Array.isArray(s.items)?s.items.filter(i=>i&&i.name).map(i=>({id:i.id||uid('it'),name:String(i.name),unit:String(i.unit||'each'),price:r2(i.price)})):[]
  };
}
function defaultSettings(){
  const old=lsGet('pc_items_v1',null);
  const items=(Array.isArray(old)&&old.length)
    ? old.filter(x=>x&&x.name).map(x=>({id:uid('it'),name:String(x.name),unit:'each',price:r2(x.price)}))
    : DEFAULT_ITEMS.map(x=>Object.assign({id:uid('it')},x));
  return normalizeSettings({storeName:'The UPS Store',taxRate:0.07,nextNum:1001,items});
}

const localSaved=lsGet(LS_KEY,null);
let localAll=(localSaved&&Array.isArray(localSaved.orders))?localSaved.orders:[];
const state={
  settings:normalizeSettings(localSaved&&localSaved.settings?localSaved.settings:defaultSettings()),
  orders:[], archived:null, mode:'loading', view:'board', search:'', filter:'all'
};

/* save a generated file (PDF, CSV, backup): through the claude.ai viewer's download prompt when
   this page runs as a published Artifact, otherwise as a normal browser download */
let downloadsNs=null;
try{ if(window.claude&&typeof window.claude.use==='function') window.claude.use('downloads').then(d=>{downloadsNs=d}).catch(()=>{}); }catch(e){}
async function saveFile(name,data,mime){
  if(downloadsNs){
    try{await downloadsNs.save({filename:name,data});return 'saved'}
    catch(e){return e&&e.code==='declined'?'declined':'failed'}
  }
  try{
    const blob=data instanceof Blob?data:new Blob([data],{type:mime||'application/octet-stream'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);return 'saved';
  }catch(e){return 'failed'}
}
/* ---------- storage layer (this browser only) ---------- */
function persistLocal(){
  try{localStorage.setItem(LS_KEY,JSON.stringify({settings:state.settings,orders:localAll}))}
  catch(e){
    const full=e&&(e.name==='QuotaExceededError'||e.code===22||e.code===1014);
    const err=new Error(full?'Storage is full':'Could not save');err.code=full?'quota_exceeded':'unavailable';throw err;
  }
}
function applyLocalOrders(){state.orders=localAll.filter(o=>!o.archived)}

async function saveSettings(s){
  state.settings=normalizeSettings(s);
  renderChrome();
  persistLocal();
}
async function saveOrder(o){
  o.updatedAt=nowIso();
  const i=state.orders.findIndex(x=>x.id===o.id);
  if(DONE.has(o.stage)&&!o.archived){
    if(!o.readyAt){const prev=i>=0?state.orders[i]:null; o.readyAt=(prev&&DONE.has(prev.stage))?(prev.stageAt||prev.updatedAt||nowIso()):nowIso()}
  }else if(!DONE.has(o.stage)&&o.readyAt){ delete o.readyAt; delete o.lastContactAt; delete o.contactCount; }
  if(o.archived){ if(i>=0) state.orders.splice(i,1); }
  else if(i>=0) state.orders[i]=o; else state.orders.push(o);
  renderBoard();
  const j=localAll.findIndex(x=>x.id===o.id); if(j>=0) localAll[j]=o; else localAll.push(o);
  persistLocal();
  renderBackupStatus();
}
async function removeOrder(id){
  state.orders=state.orders.filter(x=>x.id!==id);
  if(state.archived) state.archived=state.archived.filter(x=>x.id!==id);
  renderBoard();
  localAll=localAll.filter(x=>x.id!==id); persistLocal();
}
async function fetchArchived(){
  return localAll.filter(o=>o.archived).sort((a,b)=>String(b.closedAt).localeCompare(String(a.closedAt)));
}

async function connect(){
  state.mode='local';
  $('#syncText').textContent='Orders, prices and customers are saved in this browser on this PC only. Clearing browsing data, switching browsers, or moving this file to a different folder can lose them, so back up regularly. A backup file also moves everything to another PC: open this app there and choose Restore.';
  $('#backupBox').hidden=false; $('#exportBtn').hidden=false;
  try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persist(); }catch(e){}
  renderBackupStatus();
  applyLocalOrders(); renderAll();
}

/* ---------- order helpers ---------- */
const CLOSE_LOCS={'Picked Up By Customer':'picked','Shipped to Customer':'shipped'};
function num0(v){const n=Number(v);return isFinite(n)&&n>0?n:0}
function totals(o){
  const sub=r2((o.lines||[]).reduce((a,l)=>a+(Number(l.qty)||0)*(Number(l.price)||0),0));
  const discPct=Math.min(100,num0(o.discountPct));
  const discPctAmt=r2(sub*discPct/100);
  const discAmt=r2(Math.min(num0(o.discountAmt),Math.max(0,sub-discPctAmt)));
  const discount=r2(discPctAmt+discAmt);
  const f=o.fees||{};
  const addLbl=f.additionalType&&f.additionalType!=='None'?'Additional fee ('+f.additionalType+')':'Additional fee';
  const feeRows=[['Rush fee',r2(num0(f.rush))],['Design fee',r2(num0(f.design))],['Set up fee',r2(num0(f.setup))],[addLbl,r2(num0(f.additional))]].filter(x=>x[1]>0);
  const fees=r2(feeRows.reduce((a,x)=>a+x[1],0));
  const taxable=r2(sub-discount+fees);
  const rate=o.taxExempt?0:(typeof o.taxRate==='number'?o.taxRate:state.settings.taxRate);
  const tax=r2(taxable*rate);
  const postage=r2(num0(o.postage));
  return {sub,discPct,discPctAmt,discAmt,discount,feeRows,fees,taxable,rate,tax,postage,total:r2(taxable+tax+postage),exempt:!!o.taxExempt};
}
function breakdown(t){
  const rows=[['Subtotal',t.sub]];
  if(t.discPctAmt>0) rows.push([`Discount (${+t.discPct.toFixed(2)}%)`,-t.discPctAmt]);
  if(t.discAmt>0) rows.push(['Discount',-t.discAmt]);
  t.feeRows.forEach(r=>rows.push(r));
  rows.push([taxLabel(t),t.tax]);
  if(t.postage>0) rows.push(['Postage (no tax)',t.postage]);
  return rows;
}
function isOpenLoc(l){return !!l&&!CLOSE_LOCS[l]}
function taxLabel(t){return t.exempt?'Tax (exempt)':'Tax ('+pct(t.rate)+')'}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
function localDateStr(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function orderDateOf(o){return dueDateStr(o.orderDate)||(o.createdAt?localDateStr(new Date(o.createdAt)):'')}
function dueDateStr(s){const m=/^(\d{4}-\d{2}-\d{2})/.exec(s||'');return m?m[1]:''}
function parseDue(s){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null}
function fmtDate(d,opts){return d.toLocaleDateString([],opts||{weekday:'short',month:'short',day:'numeric'})}
function dueInfo(o){
  const d=parseDue(o.due); if(!d) return null;
  const today=new Date(); today.setHours(0,0,0,0);
  const days=Math.round((d-today)/864e5);
  let label,tone='';
  if(days===0){label='Due today';tone='today'}
  else if(days===1) label='Due tomorrow';
  else label='Due '+fmtDate(d);
  if(DONE.has(o.stage)) tone='';
  else if(days<0){tone='overdue';label='Overdue ('+fmtDate(d,{month:'short',day:'numeric'})+')'}
  return {label,tone,t:d.getTime()};
}
function itemSummary(o){
  const ls=(o.lines||[]).filter(l=>l.desc);
  if(!ls.length) return 'No items yet';
  return ls.map(l=>l.dims?l.desc:(Number(l.qty)!==1?fmtQty(l.qty)+' × ':'')+l.desc).join(', ');
}
function matchesSearch(o,q){
  if(!q) return true;
  const c=o.customer||{};
  return [o.num,'#'+o.num,c.name,c.company,c.phone,c.email,o.location,(c.phone||'').replace(/\D/g,''),...(o.lines||[]).map(l=>l.desc)].join(' ').toLowerCase().includes(q);
}
function splitName(c){
  if(c&&c.first==null&&c.last==null){const n=String(c.name||'').trim(),i=n.indexOf(' ');c.first=i<0?n:n.slice(0,i);c.last=i<0?'':n.slice(i+1).trim()}
  return c;
}
function fullName(c){return [c.first,c.last].map(x=>String(x||'').trim()).filter(Boolean).join(' ')}
/* first-name field: picking a suggested full name splits it; then fill company/phone/email for a returning customer */
function nameAutofill(known){
  const c=draft.customer, typed=String(c.first||'').trim();
  if(typed.includes(' ')&&!String(c.last||'').trim()){
    const hit=known.find(k=>(k.info.name||'').trim().toLowerCase()===typed.toLowerCase());
    if(hit){const i=typed.indexOf(' ');c.first=typed.slice(0,i);c.last=typed.slice(i+1).trim()}
  }
  const full=fullName(c).toLowerCase(); if(!full) return false;
  const k=known.find(x=>(x.info.name||'').trim().toLowerCase()===full); if(!k) return false;
  let changed=typed!==c.first;
  for(const f of ['company','phone','email']) if(!c[f]&&k.info[f]){c[f]=k.info[f];changed=true}
  return changed;
}
function custKey(c){
  c=c||{};
  const ph=(c.phone||'').replace(/\D/g,'');
  if(ph.length>=7) return 'p'+ph.slice(-10);
  return 'n'+(c.name||'').trim().toLowerCase()+'|'+(c.company||'').trim().toLowerCase();
}
function allKnownOrders(){return [...state.orders,...(state.archived||[])]}
function buildCustomers(){
  const map=new Map();
  for(const o of allKnownOrders()){
    const k=custKey(o.customer);
    let c=map.get(k);
    if(!c){c={key:k,info:{},orders:[],last:''};map.set(k,c)}
    c.orders.push(o);
    const when=o.createdAt||'';
    if(when>=c.last){c.last=when;c.info=Object.assign({name:'',company:'',phone:'',email:''},o.customer||{})}
  }
  for(const c of map.values()){
    // fill gaps from older orders (e.g. email only given once)
    for(const o of c.orders){const oc=o.customer||{};for(const f of ['company','phone','email']) if(!c.info[f]&&oc[f]) c.info[f]=oc[f]}
    c.orders.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  return [...map.values()].sort((a,b)=>(a.info.name||'').localeCompare(b.info.name||'',undefined,{sensitivity:'base'}));
}
function upsertArchived(o){
  if(!state.archived) return;
  const i=state.archived.findIndex(x=>x.id===o.id);
  if(o.archived){ if(i>=0) state.archived[i]=o; else state.archived.unshift(o); }
  else if(i>=0) state.archived.splice(i,1);
}
function matchesFilter(o,f){
  if(f==='today'){const d=dueInfo(o);return !!d&&d.tone==='today'}
  if(f==='overdue'){const d=dueInfo(o);return !!d&&d.tone==='overdue'}
  if(f==='unpaid') return DONE.has(o.stage)&&!o.paid;
  return true;
}

/* ---------- rendering ---------- */
function renderAll(){renderChrome();renderBoard()}
function renderChrome(){
  renderFilters();
  if(state.view==='prices') renderPrices();
  if(state.view==='settings') renderSettings();
  if(drawerOpen) updateDrawerTotals();
}
function readySince(o){const v=o.readyAt||(DONE.has(o.stage)?(o.stageAt||o.updatedAt||o.createdAt):null);return v?new Date(v):null}
function daysReady(o){const d=readySince(o);return d?Math.floor((Date.now()-d.getTime())/864e5):0}
function isUnclaimed(o){return !o.archived&&DONE.has(o.stage)&&daysReady(o)>=state.settings.unclaimedDays}
function boardOrders(){return state.orders.filter(o=>!isUnclaimed(o))}
function renderUnclaimedBadge(){
  const uc=state.orders.filter(isUnclaimed), n=uc.length;
  const badge=$('#ucBadge'); badge.hidden=!n; badge.textContent=n>99?'99+':n;
  const bar=$('#ucBar'); bar.hidden=!n||state.mode==='loading';
  if(n){const due=uc.filter(o=>!o.paid).reduce((a,o)=>a+totals(o).total,0);
    $('#ucBarText').textContent=`${n} job${n===1?' has':'s have'} been ready ${state.settings.unclaimedDays}+ days without pickup${due>0?', '+money(due)+' unpaid':''}.`}
}
function renderFilters(){
  renderUnclaimedBadge();
  const os=boardOrders();
  const n={all:os.length,today:os.filter(o=>matchesFilter(o,'today')).length,overdue:os.filter(o=>matchesFilter(o,'overdue')).length,unpaid:os.filter(o=>matchesFilter(o,'unpaid')).length};
  const defs=[['all','Active'],['today','Due today'],['overdue','Overdue'],['unpaid','Done, not paid']];
  $('#filters').innerHTML=defs.map(([k,l])=>`<button class="pill${k==='overdue'&&n.overdue?' warn':''}" data-filter="${k}" aria-pressed="${state.filter===k}">${l} <span class="n num">${n[k]}</span></button>`).join('');
}

let dragId=null, pendingBoard=false;
function renderBoard(){
  if(dragId){pendingBoard=true;return}
  renderFilters();
  const board=$('#board');
  if(state.mode==='loading'){board.innerHTML='<div class="loading">Loading orders…</div>';return}
  const q=state.search.trim().toLowerCase();
  const list=boardOrders().filter(o=>matchesSearch(o,q)&&matchesFilter(o,state.filter));
  board.innerHTML=STAGES.map(st=>{
    const cards=list.filter(o=>(STAGE[o.stage]?o.stage:'new')===st.id).sort((a,b)=>{
      const da=dueInfo(a),dbb=dueInfo(b);
      const ta=da?da.t:Infinity, tb=dbb?dbb.t:Infinity;
      return ta!==tb?ta-tb:String(a.createdAt).localeCompare(String(b.createdAt));
    });
    const sum=cards.reduce((a,o)=>a+totals(o).total,0);
    const unpaid=cards.filter(o=>!o.paid).reduce((a,o)=>a+amountDue(o),0);
    const empty=(q||state.filter!=='all')?'No matches':(st.id==='new'?'No new orders yet. Start one with New order.':'Drag an order here');
    return `<section class="col" data-stage="${st.id}" style="--c:${st.c}" aria-label="${esc(st.label)}">
      <div class="col-head"><span class="col-dot"></span>
        <div class="col-title"><h2>${esc(st.label)} <span class="col-count num">${cards.length}</span></h2>
          <div class="col-sum num" title="Total of the orders in this column">${cards.length?money(sum):''}${unpaid>0&&DONE.has(st.id)?` <span class="col-unpaid">(${money(unpaid)} unpaid)</span>`:''}</div></div>
      ${st.id==='new'?`<button class="icon-btn" data-new title="New order" aria-label="New order">${ICON.plus}</button>`:''}</div>
      <div class="col-body">${cards.length?cards.map(cardHtml).join(''):`<div class="col-empty">${empty}</div>`}</div>
    </section>`;
  }).join('');
  if(state.view==='unclaimed') renderUnclaimed();
}
function cardHtml(o){
  const st=STAGE[o.stage]||STAGE.new, next=STAGES[st.i+1], d=dueInfo(o), t=totals(o);
  const acts=`<button class="icon-btn" data-print="${o.id}" title="Print label" aria-label="Print label for order ${o.num}">${ICON.print}</button>`+
    (DONE.has(o.stage)?`<button class="icon-btn" data-pickup="${o.id}" title="Mark picked up" aria-label="Mark order ${o.num} picked up">${ICON.pickup}</button>`:'')+
    (next?`<button class="icon-btn" data-advance="${o.id}" title="Move to ${esc(next.label)}" aria-label="Move order ${o.num} to ${esc(next.label)}">${ICON.next}</button>`:'');
  return `<article class="card" draggable="true" tabindex="0" data-id="${o.id}" style="--c:${st.c}">
    <div class="card-top"><span class="card-num num">#${o.num}</span>${o.paid?'<span class="badge badge-paid">Paid</span>':''}${o.invoice?'<span class="badge badge-exempt">Invoice</span>':''}${o.taxExempt?'<span class="badge badge-exempt">Tax exempt</span>':''}<div class="card-acts">${acts}</div></div>
    <div class="card-name">${esc((o.customer&&o.customer.name)||'No name')}</div>
    ${o.customer&&o.customer.company?`<div class="card-co">${esc(o.customer.company)}</div>`:''}
    <div class="card-items">${esc(itemSummary(o))}</div>
    ${isOpenLoc(o.location)?`<div class="card-loc">${ICON.pin}${esc(o.location)}</div>`:''}
    ${waitHtml(o)}
    <div class="card-foot">${d?`<span class="due ${d.tone}">${d.tone?'':ICON.clock}${esc(d.label)}</span>`:'<span class="due">No due date</span>'}<span class="card-total num">${money(t.total)}</span></div>
  </article>`;
}

function waitHtml(o){
  const since=o.stageAt||o.createdAt; if(!since) return '';
  const days=Math.floor((Date.now()-new Date(since).getTime())/864e5);
  if(days<2) return '';
  const st=STAGE[o.stage]||STAGE.new;
  const verb=o.stage==='quoting'?'Waiting on approval':o.stage==='followup'||o.stage==='complete'?'Ready':'In '+st.label;
  return `<div class="card-wait${days>=5?' long':''}">${esc(verb)} for ${days} days</div>`;
}

/* ---------- board interactions ---------- */
const board=$('#board');
board.addEventListener('click',e=>{
  const b=e.target.closest('button');
  if(b){
    if(b.dataset.new!==undefined) return openDrawer(null);
    if(b.dataset.advance) return advance(b.dataset.advance);
    if(b.dataset.print){const o=state.orders.find(x=>x.id===b.dataset.print); if(o) printOrder(o); return}
    if(b.dataset.pickup) return markPickedUp(b.dataset.pickup);
  }
  const c=e.target.closest('.card'); if(c) openDrawer(c.dataset.id);
});
board.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.classList.contains('card')){e.preventDefault();openDrawer(e.target.dataset.id)}
});
board.addEventListener('dragstart',e=>{
  const c=e.target.closest('.card'); if(!c) return;
  dragId=c.dataset.id; e.dataTransfer.effectAllowed='move';
  try{e.dataTransfer.setData('text/plain',dragId)}catch(_){}
  requestAnimationFrame(()=>c.classList.add('dragging'));
});
board.addEventListener('dragover',e=>{
  if(!dragId) return; const col=e.target.closest('.col'); if(!col) return;
  e.preventDefault(); e.dataTransfer.dropEffect='move';
  $$('.col.drop',board).forEach(x=>{if(x!==col)x.classList.remove('drop')}); col.classList.add('drop');
});
board.addEventListener('dragleave',e=>{const col=e.target.closest('.col'); if(col&&!col.contains(e.relatedTarget)) col.classList.remove('drop')});
board.addEventListener('drop',e=>{
  const col=e.target.closest('.col'); if(!col||!dragId) return; e.preventDefault();
  const id=dragId; endDrag(); moveTo(id,col.dataset.stage);
});
board.addEventListener('dragend',endDrag);
function endDrag(){
  dragId=null; $$('.col.drop',board).forEach(x=>x.classList.remove('drop')); $$('.card.dragging',board).forEach(x=>x.classList.remove('dragging'));
  if(pendingBoard){pendingBoard=false;renderBoard()}
}
async function moveTo(id,stage){
  const f=state.orders.find(x=>x.id===id); if(!f||f.stage===stage) return;
  const o=clone(f), prev=o.stage; o.stage=stage; o.stageAt=nowIso();
  try{await saveOrder(o); toast(`#${o.num} moved to ${STAGE[stage].label}`,{label:'Undo',fn:()=>moveTo(id,prev)})}
  catch(e){toast(e&&e.code==='quota_exceeded'?'Storage is full. Back up, then delete old orders to make room.':'Could not move that order. Try again.')}
}
function advance(id){const o=state.orders.find(x=>x.id===id); if(!o) return; const n=STAGES[(STAGE[o.stage]||STAGE.new).i+1]; if(n) moveTo(id,n.id)}
async function markPickedUp(id,fromDraft){
  const f=fromDraft||state.orders.find(x=>x.id===id); if(!f) return false;
  const o=clone(f);
  if(!o.paid&&!o.invoice){
    const t=totals(o);
    const choice=await confirmDlg({title:`#${o.num} isn\u2019t marked paid`,body:`${money(t.total)} is still showing as due. Did they pay at pickup?`,ok:'Paid & picked up',alt:'Picked up, not paid'});
    if(!choice) return false;
    if(choice===true) o.paid=true;
  }
  o.archived=true; o.pickedUp=true; o.closedAt=nowIso(); o.closeMethod='picked'; o.prevLocation=o.location||''; o.location='Picked Up By Customer';
  try{
    await saveOrder(o); upsertArchived(o); if(state.view==='customers') renderCustomers();
    toast(`#${o.num} picked up`,{label:'Undo',fn:()=>putBack(o,f.paid)});
    return true;
  }catch(e){toast('Could not update that order. Try again.');return false}
}
async function putBack(o,paid){
  const u=clone(o); u.archived=false; u.pickedUp=false; u.closedAt=null; if(typeof paid==='boolean') u.paid=paid;
  if(CLOSE_LOCS[u.location]) u.location=u.prevLocation||''; delete u.closeMethod; delete u.prevLocation;
  try{await saveOrder(u); upsertArchived(u); if(state.view==='customers') renderCustomers(); toast(`#${u.num} is back on the board in ${(STAGE[u.stage]||STAGE.new).label}`)}
  catch(e){toast('Could not update that order. Try again.')}
}

$('#filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]'); if(!b) return; state.filter=b.dataset.filter; renderBoard()});
$('#search').addEventListener('input',e=>{state.search=e.target.value; if(state.view==='board') renderBoard(); else if(state.view==='customers') renderCustomers(); else if(state.view==='unclaimed') renderUnclaimed()});
$('#ucBarBtn').addEventListener('click',()=>showView('unclaimed'));
$('#newOrderBtn').addEventListener('click',()=>openDrawer(null));

/* ---------- barcode scanner / order-number lookup ---------- */
async function openByNumber(n){
  let o=state.orders.find(x=>x.num===n);
  if(!o){ await ensureArchived(); o=(state.archived||[]).find(x=>x.num===n); }
  if(o) openDrawer(o.id); else toast(`No order #${n} found.`);
}
let scanBuf='', scanAt=0;
document.addEventListener('keydown',e=>{
  if(drawerOpen||e.ctrlKey||e.metaKey||e.altKey||$('.dlg-scrim.on')) return;
  if(/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||'')) return;
  const now=Date.now();
  if(/^\d$/.test(e.key)){ if(now-scanAt>120) scanBuf=''; scanBuf+=e.key; scanAt=now; return; }
  if(e.key==='Enter'&&scanBuf.length>=2&&now-scanAt<300){ e.preventDefault(); const n=parseInt(scanBuf,10); scanBuf=''; openByNumber(n); }
},true);
$('#search').addEventListener('keydown',e=>{
  if(e.key!=='Enter') return;
  const m=/^#?(\d+)$/.exec(e.target.value.trim()); if(!m) return;
  e.preventDefault(); const n=parseInt(m[1],10);
  e.target.value=''; state.search=''; if(state.view==='board') renderBoard(); else if(state.view==='customers') renderCustomers(); else if(state.view==='unclaimed') renderUnclaimed();
  openByNumber(n);
});

/* ---------- navigation ---------- */
const TITLES={board:'Production board',unclaimed:'Unclaimed',customers:'Customers',prices:'Price list',settings:'Settings'};
$$('.nav-btn').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
function showView(v){
  state.view=v;
  $$('.nav-btn').forEach(b=>b.dataset.view===v?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'));
  $$('.view').forEach(s=>s.classList.toggle('on',s.id==='view-'+v));
  $('#viewTitle').textContent=TITLES[v];
  $('#searchWrap').style.display=(v==='board'||v==='customers'||v==='unclaimed')?'':'none';
  $('#search').placeholder=v==='customers'?'Search customers, companies, phone':'Search name, company, phone, order #';
  if(v==='customers') loadCustomers();
  if(v==='unclaimed') renderUnclaimed();
  if(v==='prices') renderPrices(true);
  if(v==='settings') renderSettings(true);
  if(v==='board') renderBoard();
}

/* ---------- unclaimed ---------- */
function renderUnclaimed(){
  const el=$('#ucBody'), N=state.settings.unclaimedDays;
  $('#ucTitle').textContent=`Ready ${N}+ days, not picked up`;
  $('#ucSub').textContent=`Jobs move here on their own after ${N} days in Complete or Follow up, and leave the board until they\u2019re picked up.`;
  if(state.mode==='loading'){el.innerHTML='<div class="tbl-empty">Loading…</div>';return}
  const all=state.orders.filter(isUnclaimed).sort((a,b)=>daysReady(b)-daysReady(a));
  if(!all.length){el.innerHTML=`<div class="tbl-empty">Nothing has been waiting ${N}+ days for pickup.</div>`;return}
  const q=state.search.trim().toLowerCase(), rows=all.filter(o=>matchesSearch(o,q));
  const value=all.reduce((a,o)=>a+totals(o).total,0), unpaid=all.filter(o=>!o.paid).reduce((a,o)=>a+totals(o).total,0);
  const dt=x=>fmtDate(new Date(x),{month:'short',day:'numeric'});
  el.innerHTML=`<div class="uc-sum num"><div><b>${all.length}</b>Jobs waiting</div><div><b>${money(value)}</b>Total value</div><div><b style="color:${unpaid>0?'var(--danger)':'inherit'}">${money(unpaid)}</b>Unpaid</div><div><b>${daysReady(all[0])} days</b>Longest wait</div></div>
  ${rows.length?`<div class="tbl-wrap"><table class="tbl" style="min-width:860px"><thead><tr><th>Waiting</th><th>Order</th><th>Location</th><th>Customer</th><th>Items</th><th class="r">Total</th><th>Last contact</th><th></th></tr></thead><tbody>${
    rows.map(o=>{
      const d=daysReady(o), c=o.customer||{}, t=totals(o), rs=readySince(o);
      return `<tr class="click" data-open="${o.id}">
        <td><span class="days${d>=N*2?' old':''}">${d} days</span><div class="hint" style="font-size:12px;margin-top:3px">since ${rs?dt(rs):''}</div></td>
        <td class="num">#${o.num}</td>
        <td>${isOpenLoc(o.location)?`<span class="card-loc" style="margin:0">${ICON.pin}${esc(o.location)}</span>`:'<span class="hint">Not set</span>'}</td>
        <td><div style="font-weight:600">${esc(c.name)}</div>${c.company?`<div class="hint">${esc(c.company)}</div>`:''}${c.phone?`<div class="hint">${esc(c.phone)}</div>`:''}${c.email?`<div class="hint">${esc(c.email)}</div>`:''}</td>
        <td style="max-width:240px">${esc(itemSummary(o))}</td>
        <td class="r num">${money(t.total)}${o.paid?'<div class="hint" style="font-size:12px">Paid</div>':'<div class="err-msg">Unpaid</div>'}</td>
        <td>${o.lastContactAt?`${esc(dt(o.lastContactAt))}${o.contactCount>1?`<div class="hint" style="font-size:12px">${o.contactCount} times</div>`:''}`:'<span class="hint">Not yet</span>'}</td>
        <td><div class="uc-acts"><button class="btn" data-contact="${o.id}">Log contact</button><button class="btn btn-primary" data-pu="${o.id}">${ICON.pickup}Picked up</button></div></td>
      </tr>`;
    }).join('')
  }</tbody></table></div>`:'<div class="tbl-empty">No unclaimed jobs match that search.</div>'}`;
}
$('#ucBody').addEventListener('click',async e=>{
  const b=e.target.closest('button');
  if(b&&b.dataset.contact){
    const f=state.orders.find(x=>x.id===b.dataset.contact); if(!f) return;
    const o=clone(f), prevAt=f.lastContactAt, prevN=f.contactCount;
    o.lastContactAt=nowIso(); o.contactCount=(o.contactCount||0)+1;
    try{await saveOrder(o); toast(`Logged contact for #${o.num}`,{label:'Undo',fn:()=>{const u=clone(o);if(prevAt)u.lastContactAt=prevAt;else delete u.lastContactAt;if(prevN)u.contactCount=prevN;else delete u.contactCount;saveOrder(u)}})}
    catch(_){toast('Could not save that. Try again.')}
    return;
  }
  if(b&&b.dataset.pu){ markPickedUp(b.dataset.pu); return; }
  const tr=e.target.closest('tr[data-open]'); if(tr) openDrawer(tr.dataset.open);
});

/* ---------- customers ---------- */
let selCust=null, archivedLoading=null;
function ensureArchived(){
  if(state.archived) return Promise.resolve(true);
  if(!archivedLoading) archivedLoading=fetchArchived().then(a=>{state.archived=a;archivedLoading=null;return true}).catch(()=>{archivedLoading=null;return false});
  return archivedLoading;
}
async function loadCustomers(){
  if(state.mode==='loading'){ $('#custList').innerHTML='<div class="tbl-empty">Loading…</div>'; setTimeout(()=>{if(state.view==='customers')loadCustomers()},600); return; }
  if(!state.archived){
    $('#custList').innerHTML='<div class="tbl-empty">Loading…</div>';
    if(!await ensureArchived()){ $('#custList').innerHTML='<div class="tbl-empty">Could not load past orders. Reopen Customers to try again.</div>'; return; }
  }
  renderCustomers();
}
function renderCustomers(){
  if(!state.archived) return;
  const custs=buildCustomers(), q=state.search.trim().toLowerCase();
  const list=q?custs.filter(c=>c.orders.some(o=>matchesSearch(o,q))):custs;
  $('#custCount').textContent=custs.length||'';
  if(!custs.length){
    $('#custList').innerHTML='<div class="tbl-empty">No customers yet. They show up here as soon as you create an order.</div>';
    $('#custDetail').innerHTML='<div class="tbl-empty">Customer order history will appear here.</div>'; return;
  }
  if(!list.length){ $('#custList').innerHTML='<div class="tbl-empty">No customers match that search.</div>'; }
  if(!selCust||!list.some(c=>c.key===selCust)) selCust=list.length?list[0].key:selCust;
  if(list.length) $('#custList').innerHTML=list.map(c=>{
    const n=c.orders.length;
    return `<button class="cust-row" data-key="${esc(c.key)}" aria-current="${c.key===selCust}">
      <div class="cr-name">${esc(c.info.name||'No name')}</div>
      ${c.info.company?`<div class="cr-meta">${esc(c.info.company)}</div>`:''}
      <div class="cr-meta">${c.info.phone?esc(c.info.phone)+', ':''}${n} order${n===1?'':'s'}</div>
    </button>`;
  }).join('');
  renderCustDetail(custs.find(c=>c.key===selCust));
}
function renderCustDetail(c){
  const el=$('#custDetail');
  if(!c){el.innerHTML='<div class="tbl-empty">Pick a customer to see their orders.</div>';return}
  const ts=c.orders.map(o=>({o,t:totals(o)}));
  const spent=ts.reduce((a,x)=>a+x.t.total,0);
  const onBoard=c.orders.filter(o=>!o.archived).length;
  const unpaid=ts.filter(x=>!x.o.paid&&(x.o.archived||DONE.has(x.o.stage))).reduce((a,x)=>a+x.t.total,0);
  el.innerHTML=`<div class="cd-head">
      <div><h2>${esc(c.info.name||'No name')}</h2>${c.info.company?`<div class="cd-co">${esc(c.info.company)}</div>`:''}
        <div class="cd-contact">${c.info.phone?`<span>${esc(c.info.phone)}</span>`:''}${c.info.email?`<span>${esc(c.info.email)}</span>`:''}</div></div>
      <div class="cd-acts"><button class="btn btn-primary" data-neworder>${ICON.plus}New order</button></div>
    </div>
    <div class="cd-stats num"><div><b>${c.orders.length}</b>Orders</div><div><b>${money(spent)}</b>Total ordered</div><div><b>${onBoard}</b>On the board</div>${unpaid>0?`<div><b style="color:var(--danger)">${money(unpaid)}</b>Unpaid</div>`:''}</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Date</th><th>Items</th><th class="r">Total</th><th>Status</th><th></th></tr></thead><tbody>${
      ts.map(({o,t})=>{
        const st=STAGE[o.stage]||STAGE.new;
        const status=o.archived
          ?`<span class="status" style="--c:var(--success)">${o.closeMethod==='shipped'?'Shipped':'Picked up'} ${o.closedAt?esc(fmtDate(new Date(o.closedAt),{month:'short',day:'numeric'})):''}</span>`
          :`<span class="status" style="--c:${st.c}">${esc(st.label)}</span>`;
        const acts=o.archived
          ?`<button class="icon-btn" data-reorder="${o.id}" title="Reorder" aria-label="Reorder ${o.num}">${ICON.copy}</button><button class="icon-btn" data-putback="${o.id}" title="Put back on board" aria-label="Put order ${o.num} back on the board">${ICON.back}</button><button class="icon-btn" data-del="${o.id}" title="Delete" aria-label="Delete order ${o.num}">${ICON.trash}</button>`
          :`<button class="icon-btn" data-reorder="${o.id}" title="Reorder" aria-label="Reorder ${o.num}">${ICON.copy}</button>`;
        return `<tr class="click" data-open="${o.id}"><td class="num">#${o.num}</td><td class="num" style="white-space:nowrap">${orderDateOf(o)?esc(fmtDate(parseDue(orderDateOf(o)),{month:'short',day:'numeric',year:'numeric'})):''}</td><td style="max-width:280px">${esc(itemSummary(o))}</td><td class="r num">${money(t.total)}${o.paid?'':'<div class="err-msg">Unpaid</div>'}</td><td>${status}</td><td class="r" style="white-space:nowrap">${acts}</td></tr>`;
      }).join('')
    }</tbody></table></div>`;
  el._cust=c;
}
$('#custList').addEventListener('click',e=>{const b=e.target.closest('.cust-row'); if(!b) return; selCust=b.dataset.key; renderCustomers()});
$('#custDetail').addEventListener('click',async e=>{
  const c=$('#custDetail')._cust; if(!c) return;
  const b=e.target.closest('button');
  if(b&&b.dataset.neworder!==undefined){ const i=c.info; return openDrawer(null,{name:i.name||'',company:i.company||'',phone:i.phone||'',email:i.email||''}); }
  if(b&&b.dataset.reorder){ const o=c.orders.find(x=>x.id===b.dataset.reorder); if(o) reorder(o); return; }
  if(b&&b.dataset.putback){ const o=c.orders.find(x=>x.id===b.dataset.putback); if(o) putBack(o); return; }
  if(b&&b.dataset.del){
    const f=c.orders.find(x=>x.id===b.dataset.del); if(!f) return;
    if(!await confirmDlg({title:`Delete order #${f.num}?`,body:'This removes it from the customer\u2019s record permanently. Export a CSV from Settings first if you need a copy.',ok:'Delete',danger:true})) return;
    try{await removeOrder(f.id); renderCustomers(); toast(`Order #${f.num} deleted`)}catch(_){toast('Could not delete that order. Try again.')}
    return;
  }
  const tr=e.target.closest('tr[data-open]'); if(tr) openDrawer(tr.dataset.open);
});
$('#exportBtn').addEventListener('click',async()=>{
  if(!await ensureArchived()){toast('Could not load past orders for the export.');return}
  const all=[...state.orders,...state.archived].sort((a,b)=>a.num-b.num);
  const cell=v=>{const s=String(v==null?'':v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
  const head=['Order','Order date','Customer','First name','Last name','Company','Phone','Email','Items','Subtotal','Discount','Fees','Tax','Postage','Total','Paid','Invoice order','Tax exempt','Location','Status','Picked up','Due','Notes'];
  const lines=all.map(o=>{const t=totals(o),c=o.customer||{};return [o.num,orderDateOf(o),c.name,splitName(Object.assign({},c)).first,splitName(Object.assign({},c)).last,c.company,c.phone,c.email,itemSummary(o),t.sub.toFixed(2),t.discount.toFixed(2),t.fees.toFixed(2),t.tax.toFixed(2),t.postage.toFixed(2),t.total.toFixed(2),o.paid?'Yes':'No',o.invoice?'Yes':'No',o.taxExempt?'Yes':'No',o.location||'',o.archived?(o.closeMethod==='shipped'?'Shipped':'Picked up'):(STAGE[o.stage]?STAGE[o.stage].label:o.stage),o.archived&&o.closedAt?new Date(o.closedAt).toLocaleDateString():'',dueDateStr(o.due),o.notes||''].map(cell).join(',')});
  const csv=[head.join(','),...lines].join('\r\n');
  const r=await saveFile('print-orders-'+new Date().toISOString().slice(0,10)+'.csv',csv,'text/csv');
  if(r==='saved') toast('Export saved'); else if(r==='failed') toast('The export could not be saved here.');
});

/* ---------- backup & restore (this-PC mode) ---------- */
const LS_BACKUP='pc_last_backup';
function renderBackupStatus(){
  if(state.mode!=='local') return;
  const last=lsGet(LS_BACKUP,null), days=last?Math.floor((Date.now()-new Date(last).getTime())/864e5):null;
  const due=!last||days>=7;
  $('#backupStatus').textContent=last?`Last backup: ${new Date(last).toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})}${days>0?` (${days} day${days===1?'':'s'} ago)`:' (today)'}.`:'No backup made yet on this PC.';
  const hasData=localAll.length>0;
  $('#railSync').innerHTML=due&&hasData
    ?'<button class="nav-btn" id="railBackup" style="width:72px;padding:6px 2px;color:var(--today-text);background:var(--today-bg);font-size:10.5px"><span class="sync-dot local"></span>Back up now</button>'
    :'<span class="sync-dot local"></span><span>This PC only</span>';
  const rb=$('#railBackup'); if(rb) rb.onclick=()=>showView('settings');
}
$('#backupBtn').addEventListener('click',async()=>{
  const payload={app:'print-counter',version:1,exportedAt:nowIso(),settings:state.settings,orders:localAll};
  const r=await saveFile('print-counter-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(payload,null,1),'application/json');
  if(r==='saved'){lsSet(LS_BACKUP,nowIso());renderBackupStatus();toast(`Backup saved with ${localAll.length} order${localAll.length===1?'':'s'}. Keep it somewhere safe, like a flash drive.`)}
  else if(r==='failed') toast('The backup could not be saved.');
});
$('#restoreBtn').addEventListener('click',()=>{$('#restoreFile').value='';$('#restoreFile').click()});
$('#restoreFile').addEventListener('change',async e=>{
  const f=e.target.files&&e.target.files[0]; if(!f) return;
  let data;
  try{data=JSON.parse(await f.text())}catch(_){toast('That file isn’t a Print Counter backup.');return}
  if(!data||data.app!=='print-counter'||!Array.isArray(data.orders)||typeof data.settings!=='object'){toast('That file isn’t a Print Counter backup.');return}
  const when=data.exportedAt?new Date(data.exportedAt).toLocaleString([],{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}):'an unknown date';
  const ok=await confirmDlg({title:'Replace everything on this PC?',body:`The backup from ${when} has ${data.orders.length} order${data.orders.length===1?'':'s'}. Restoring replaces all orders, customers, prices and settings currently on this PC.`,ok:'Restore backup',danger:true});
  if(!ok) return;
  localAll=data.orders.filter(o=>o&&o.id);
  state.settings=normalizeSettings(data.settings);
  try{persistLocal()}catch(err){toast('Storage is full, so the backup could not be fully restored on this PC.')}
  applyLocalOrders(); state.archived=null; lsSet(LS_BACKUP,nowIso());
  await ensureArchived(); renderAll(); renderSettings(true); renderBackupStatus();
  toast(`Restored ${localAll.length} order${localAll.length===1?'':'s'}`);
});

/* ---------- price list ---------- */
function focusedIn(id){const a=document.activeElement;return a&&$(id).contains(a)&&a.tagName!=='BUTTON'}
function renderPrices(force){
  if(!force&&focusedIn('#view-prices')) return;
  const items=state.settings.items;
  $('#pricesBody').innerHTML=items.length?`<table class="tbl"><thead><tr><th style="width:52%">Item</th><th>Unit</th><th class="r">Price</th><th></th></tr></thead><tbody>${
    items.map(it=>`<tr data-id="${esc(it.id)}"><td><input class="inp" data-f="name" value="${esc(it.name)}" aria-label="Item name"></td><td><input class="inp" data-f="unit" value="${esc(it.unit)}" aria-label="Unit"></td><td><input class="inp num" data-f="price" type="number" min="0" step="0.01" value="${it.price.toFixed(2)}" style="text-align:right" aria-label="Price"></td><td class="r"><button class="icon-btn" data-rm="${esc(it.id)}" title="Remove" aria-label="Remove ${esc(it.name)}">${ICON.trash}</button></td></tr>`).join('')
  }</tbody></table>`:'<div class="tbl-empty">Your price list is empty. Add your first item below.</div>';
}
$('#pricesBody').addEventListener('change',e=>{
  const inp=e.target.closest('input[data-f]'); if(!inp) return;
  const id=inp.closest('tr').dataset.id, s=clone(state.settings), it=s.items.find(x=>x.id===id); if(!it) return;
  const f=inp.dataset.f;
  if(f==='price'){const v=parseFloat(inp.value); if(isNaN(v)||v<0){inp.value=it.price.toFixed(2);toast('Enter a price of 0 or more.');return} it.price=r2(v); inp.value=it.price.toFixed(2)}
  else if(f==='name'){const v=inp.value.trim(); if(!v){inp.value=it.name;toast('Item names can\u2019t be blank.');return} it.name=v}
  else it.unit=inp.value.trim()||'each';
  saveSettings(s).then(()=>toast('Price list updated')).catch(()=>toast('Could not save that change. Try again.'));
});
$('#pricesBody').addEventListener('click',e=>{
  const b=e.target.closest('[data-rm]'); if(!b) return;
  const s=clone(state.settings), idx=s.items.findIndex(x=>x.id===b.dataset.rm); if(idx<0) return;
  const [gone]=s.items.splice(idx,1);
  saveSettings(s).then(()=>{renderPrices(true);toast(`Removed ${gone.name}`,{label:'Undo',fn:()=>{const s2=clone(state.settings);s2.items.splice(Math.min(idx,s2.items.length),0,gone);saveSettings(s2).then(()=>renderPrices(true))}})}).catch(()=>toast('Could not remove that item. Try again.'));
});
function addPriceItem(){
  const name=$('#np-name').value.trim(), unit=$('#np-unit').value.trim()||'each', price=parseFloat($('#np-price').value);
  if(!name){$('#np-name').focus();toast('Enter an item name.');return}
  if(isNaN(price)||price<0){$('#np-price').focus();toast('Enter a price of 0 or more.');return}
  const s=clone(state.settings); s.items.push({id:uid('it'),name,unit,price:r2(price)});
  saveSettings(s).then(()=>{$('#np-name').value='';$('#np-unit').value='';$('#np-price').value='';renderPrices(true);$('#np-name').focus();toast(`Added ${name}`)}).catch(()=>toast('Could not add that item. Try again.'));
}
$('#np-add').addEventListener('click',addPriceItem);
['#np-name','#np-unit','#np-price'].forEach(s=>$(s).addEventListener('keydown',e=>{if(e.key==='Enter')addPriceItem()}));

/* ---------- settings ---------- */
const LISTS=[['locations','Locations','Add a location, e.g. Front Counter'],['feeTypes','Additional fee types','Add a fee type, e.g. Laminating'],['papers','Paper types','Add a paper, e.g. 100# Gloss Cover'],['associates','Associates (initials)','Add initials, e.g. ER']];
function renderLists(){
  const box=$('#listsBox'); if(!box) return;
  const keepFocus=document.activeElement&&box.contains(document.activeElement)?document.activeElement.dataset.addInput:null;
  box.innerHTML=LISTS.map(([key,label,ph])=>`<div class="field"><span class="fld-lbl">${label}</span>
    <div class="chips">${(state.settings[key]||[]).map(v=>`<span class="chip">${esc(v)}<button type="button" data-rm-list="${key}" data-v="${esc(v)}" aria-label="Remove ${esc(v)}">${ICON.x}</button></span>`).join('')||'<span class="hint">Nothing here yet.</span>'}</div>
    <div class="addrow"><input class="inp" data-add-input="${key}" placeholder="${ph}" aria-label="${label}"><button class="btn" type="button" data-add="${key}">Add</button></div></div>`).join('');
  if(keepFocus){const i=$(`[data-add-input="${keepFocus}"]`,box);if(i)i.focus()}
}
function listAdd(key){
  const inp=$(`[data-add-input="${key}"]`); const v=inp.value.trim(); if(!v) return;
  const s=clone(state.settings); s[key]=s[key]||[];
  if(s[key].some(x=>x.toLowerCase()===v.toLowerCase())){toast('That\u2019s already on the list.');return}
  s[key].push(v); inp.value=''; saveSettings(s).then(()=>{renderLists();$(`[data-add-input="${key}"]`).focus();toast(`Added ${v}`)});
}
$('#listsBox').addEventListener('click',e=>{
  const add=e.target.closest('[data-add]'); if(add) return listAdd(add.dataset.add);
  const b=e.target.closest('[data-rm-list]'); if(!b) return;
  const key=b.dataset.rmList, v=b.dataset.v, s=clone(state.settings), i=s[key].indexOf(v); if(i<0) return;
  s[key].splice(i,1); saveSettings(s).then(()=>{renderLists();toast(`Removed ${v}`,{label:'Undo',fn:()=>{const s2=clone(state.settings);s2[key].splice(Math.min(i,s2[key].length),0,v);saveSettings(s2).then(renderLists)}})});
});
$('#listsBox').addEventListener('keydown',e=>{const i=e.target.closest('[data-add-input]');if(i&&e.key==='Enter'){e.preventDefault();listAdd(i.dataset.addInput)}});
function renderSettings(force){
  renderLists();
  if(!force&&focusedIn('#view-settings')) return;
  $('#s-store').value=state.settings.storeName;
  $('#s-tax').value=+(state.settings.taxRate*100).toFixed(3);
  $('#s-next').value=state.settings.nextNum;
  $('#s-unclaimed').value=state.settings.unclaimedDays;
  const S=state.settings;
  $('#s-addr').value=S.storeAddress; $('#s-phone').value=S.storePhone; $('#s-email').value=S.storeEmail;
  $('#s-valid').value=S.quoteDays; $('#s-terms').value=S.invoiceTerms; $('#s-footer').value=S.footerNote;
}
[['#s-addr','storeAddress'],['#s-phone','storePhone'],['#s-email','storeEmail'],['#s-terms','invoiceTerms'],['#s-footer','footerNote']].forEach(([sel,key])=>{
  $(sel).addEventListener('change',e=>{const s=clone(state.settings);s[key]=e.target.value.trim();saveSettings(s).then(()=>toast('Saved')).catch(()=>toast('Could not save that change. Try again.'))});
});
$('#s-valid').addEventListener('change',e=>{const v=parseInt(e.target.value,10);if(!v||v<1){toast('Enter a number of days above 0.');renderSettings(true);return}const s=clone(state.settings);s.quoteDays=v;saveSettings(s).then(()=>toast('Quotes now valid for '+v+' days'))});
$('#s-store').addEventListener('change',e=>{const s=clone(state.settings);s.storeName=e.target.value.trim();saveSettings(s).then(()=>toast('Store name saved'))});
$('#s-tax').addEventListener('change',e=>{const v=parseFloat(e.target.value);if(isNaN(v)||v<0||v>25){toast('Enter a tax rate between 0 and 25.');renderSettings(true);return}const s=clone(state.settings);s.taxRate=Math.round(v*1000)/100000;saveSettings(s).then(()=>toast('Tax rate set to '+pct(s.taxRate)))});
$('#s-unclaimed').addEventListener('change',e=>{const v=parseInt(e.target.value,10);if(!v||v<1){toast('Enter a whole number of days above 0.');renderSettings(true);return}const s=clone(state.settings);s.unclaimedDays=v;saveSettings(s).then(()=>{toast('Jobs move to Unclaimed after '+v+' days');renderBoard()})});
$('#s-next').addEventListener('change',e=>{const v=parseInt(e.target.value,10);if(!v||v<1){toast('Enter a whole number above 0.');renderSettings(true);return}const s=clone(state.settings);s.nextNum=v;saveSettings(s).then(()=>toast('Next order will be #'+v))});

/* ---------- drawer ---------- */
let drawerOpen=false, draft=null, draftOrig='', isNew=false;
const drawer=$('#drawer'), scrim=$('#scrim');
function blankLine(){return {itemId:'',desc:'',unit:'',qty:1,price:0}}
function openDrawer(id,prefill,initLines,initNotes){
  curLine=0;
  if(id){const f=state.orders.find(x=>x.id===id)||(state.archived||[]).find(x=>x.id===id); if(!f) return; draft=clone(f); isNew=false}
  else{draft={id:uid('ord'),num:null,customer:Object.assign({name:'',company:'',phone:'',email:''},prefill||{}),lines:[blankLine()],notes:'',due:'',stage:'new',orderDate:localDateStr(new Date()),paid:false,taxExempt:false,invoice:false,taxRate:state.settings.taxRate,archived:false,closedAt:null};isNew=true}
  draft.customer=splitName(Object.assign({name:'',company:'',phone:'',email:''},draft.customer||{}));
  draft.due=dueDateStr(draft.due);
  draft.orderDate=orderDateOf(draft)||localDateStr(new Date());
  draft.lines=(draft.lines&&draft.lines.length)?draft.lines:[blankLine()];
  draftOrig=JSON.stringify(draft);
  if(isNew&&initLines&&initLines.length){draft.lines=initLines; if(initNotes) draft.notes=initNotes}
  renderDrawer();
  drawer.classList.add('on'); scrim.classList.add('on'); drawer.setAttribute('aria-hidden','false'); drawerOpen=true;
  setTimeout(()=>{const f=isNew?(prefill?$('.l-item',drawer):$('#f-name')):$('#d-close'); if(f) f.focus()},60);
}
async function closeDrawer(force){
  if(!force&&JSON.stringify(draft)!==draftOrig){
    if(!await confirmDlg({title:'Discard changes?',body:'Your edits to this order haven\u2019t been saved.',ok:'Discard',danger:true})) return false;
  }
  drawer.classList.remove('on'); scrim.classList.remove('on'); drawer.setAttribute('aria-hidden','true'); drawerOpen=false; draft=null;
}
scrim.addEventListener('click',()=>closeDrawer());
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&drawerOpen&&!$('#dlg').classList.contains('on')&&!$('#sqDlg').classList.contains('on')) return closeDrawer();
  const typing=/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||'');
  if(typing||drawerOpen||e.ctrlKey||e.metaKey||e.altKey||$('.dlg-scrim.on')) return;
  if(e.key==='n'||e.key==='N'){e.preventDefault();openDrawer(null)}
  else if(e.key==='/'&&$('#searchWrap').style.display!=='none'){e.preventDefault();$('#search').focus()}
});

function renderDrawer(){
  if(orderMode()==='detailed') return renderDetailed();
  drawer.classList.remove('wide');
  const st=STAGE[draft.stage]||STAGE.new;
  let created=draft.createdAt?'Created '+fmtDate(new Date(draft.createdAt),{month:'short',day:'numeric',year:'numeric'}):'Not saved yet';
  if(draft.archived&&draft.closedAt) created+=', picked up '+fmtDate(new Date(draft.closedAt),{month:'short',day:'numeric',year:'numeric'});
  else if(!isNew&&isUnclaimed(draft)) created+=`, waiting ${daysReady(draft)} days for pickup`+(draft.lastContactAt?`, last contacted ${fmtDate(new Date(draft.lastContactAt),{month:'short',day:'numeric'})}`:'');
  const known=buildCustomers().filter(c=>c.info.name);
  drawer.innerHTML=`
  <div class="d-head"><div><h2 id="dTitle">${isNew?'New order':'Order #'+draft.num}</h2><div class="d-sub">${esc(created)}</div></div>
    ${modeSwitch()}
    ${isNew?'':`<button class="btn btn-quiet" id="d-reorder" title="Copy this order into a new one">${ICON.copy}Reorder</button>`}
    <button class="icon-btn" id="d-close" aria-label="Close" style="margin-left:4px">${ICON.x}</button></div>
  <div class="d-body">
    <div class="fs"><h3 class="fs-title">Customer</h3>
      <div class="stack">
        <div class="grid2">
          <div class="field"><label for="f-name">First name</label><input class="inp" id="f-name" value="${esc(draft.customer.first)}" autocomplete="off" list="custSuggest"><span class="err-msg" id="f-name-err" hidden>Enter the customer\u2019s name.</span></div>
          <div class="field"><label for="f-last">Last name</label><input class="inp" id="f-last" value="${esc(draft.customer.last)}" autocomplete="off"></div>
        </div>
        <div class="field"><label for="f-company">Company <span style="font-weight:400;color:var(--text-3)">(optional)</span></label><input class="inp" id="f-company" value="${esc(draft.customer.company)}" autocomplete="off"></div>
        <datalist id="custSuggest">${known.map(c=>`<option value="${esc(c.info.name)}">${esc([c.info.company,c.info.phone].filter(Boolean).join(', '))}</option>`).join('')}</datalist>
        <div class="grid2">
          <div class="field"><label for="f-phone">Phone</label><input class="inp" id="f-phone" type="tel" value="${esc(draft.customer.phone)}" autocomplete="off"></div>
          <div class="field"><label for="f-email">Email</label><input class="inp" id="f-email" type="email" value="${esc(draft.customer.email)}" autocomplete="off"></div>
        </div>
      </div>
    </div>
    <div class="fs"><h3 class="fs-title" id="seg-l">Stage</h3>
      <div class="seg" role="radiogroup" aria-labelledby="seg-l">${STAGES.map(s=>`<button type="button" role="radio" style="--c:${s.c}" data-stage="${s.id}" aria-checked="${s.id===st.id}">${esc(s.label)}</button>`).join('')}</div>
    </div>
    <div class="fs"><div class="grid3">
      <div class="field"><label for="f-odate">Order date</label><input class="inp" id="f-odate" type="date" value="${esc(draft.orderDate||'')}"></div>
      <div class="field"><label for="f-due">Due date</label><input class="inp" id="f-due" type="date" value="${esc(draft.due||'')}"></div>
      <div class="field"><label for="f-loc">Location</label><select class="inp" id="f-loc">${locOptions(draft.location)}</select></div>
    </div>
      <div class="toggles" style="padding-top:14px">
        <label class="switch"><input type="checkbox" id="f-paid" ${draft.paid?'checked':''}><span class="track"><span class="thumb"></span></span>Paid</label>
        <label class="switch"><input type="checkbox" id="f-exempt" ${draft.taxExempt?'checked':''}><span class="track"><span class="thumb"></span></span>Tax exempt</label>
        <label class="switch" title="Billed by invoice instead of paid at pickup"><input type="checkbox" id="f-invoice" ${draft.invoice?'checked':''}><span class="track"><span class="thumb"></span></span>Invoice order</label>
      </div>
    </div>
    <div class="fs"><h3 class="fs-title">Items</h3>
      <div class="lines-head"><span>Item</span><span>Qty</span><span>Unit price</span><span class="r">Total</span><span></span></div>
      <div id="lines"></div>
      <button class="btn btn-quiet add-line" id="addLine">${ICON.plus}Add item</button>
    </div>
    <div class="fs"><h3 class="fs-title">Fees, discounts &amp; postage</h3>
      <div class="grid3">
        <div class="field"><label for="f-rush">Rush fee</label><input class="inp num money" id="f-rush" data-fee="rush" type="number" min="0" step="0.01" placeholder="0.00" value="${feeVal(draft.fees&&draft.fees.rush)}"></div>
        <div class="field"><label for="f-design">Design fee</label><input class="inp num money" id="f-design" data-fee="design" type="number" min="0" step="0.01" placeholder="0.00" value="${feeVal(draft.fees&&draft.fees.design)}"></div>
        <div class="field"><label for="f-setup">Set up fee</label><input class="inp num money" id="f-setup" data-fee="setup" type="number" min="0" step="0.01" placeholder="0.00" value="${feeVal(draft.fees&&draft.fees.setup)}"></div>
      </div>
      <div class="fee-add">
        <div class="field"><label for="f-addtype">Additional fee</label><select class="inp" id="f-addtype">${feeTypeOptions(draft.fees&&draft.fees.additionalType)}</select></div>
        <div class="field"><label for="f-add">Amount</label><input class="inp num money" id="f-add" data-fee="additional" type="number" min="0" step="0.01" placeholder="0.00" value="${feeVal(draft.fees&&draft.fees.additional)}"></div>
      </div>
      <div class="grid3" style="margin-top:12px">
        <div class="field"><label for="f-dpct">Discount (%)</label><input class="inp num" id="f-dpct" type="number" min="0" max="100" step="0.01" placeholder="0" value="${feeVal(draft.discountPct)}"></div>
        <div class="field"><label for="f-damt">Discount ($)</label><input class="inp num money" id="f-damt" type="number" min="0" step="0.01" placeholder="0.00" value="${feeVal(draft.discountAmt)}"></div>
        <div class="field"><label for="f-post">Postage <span style="font-weight:400;color:var(--text-3)">(no tax)</span></label><input class="inp num money" id="f-post" type="number" min="0" step="0.01" placeholder="0.00" value="${feeVal(draft.postage)}"></div>
      </div>
      <p class="hint" style="font-size:12px;margin-top:8px">Discounts come off the item subtotal. Fees are taxed; postage is not.</p>
    </div>
    <div class="fs"><div class="field"><label for="f-notes">Notes</label><textarea class="inp" id="f-notes" placeholder="Paper stock, size, finishing, pickup details">${esc(draft.notes||'')}</textarea><span class="hint" style="font-size:12px">Notes also print on quotes and invoices.</span></div></div>
    <div class="fs"><h3 class="fs-title">Quote &amp; invoice</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" id="d-quote">${ICON.doc}Quote PDF</button>
        <button class="btn" id="d-invoice">${ICON.doc}Invoice PDF</button>
      </div>
      <p class="hint" style="margin-top:8px;font-size:12.5px">${isNew?'Creates the order first, then downloads the PDF.':'Any unsaved changes are saved first.'}${(state.settings.storeAddress||state.settings.storePhone)?'':' Add your store address and phone in Settings so they appear on the PDF.'}</p>
      ${draft.quotedAt||draft.invoicedAt?`<p class="hint" style="font-size:12.5px">${draft.quotedAt?'Quote made '+esc(fmtDate(new Date(draft.quotedAt),{month:'short',day:'numeric'}))+'. ':''}${draft.invoicedAt?'Invoice made '+esc(fmtDate(new Date(draft.invoicedAt),{month:'short',day:'numeric'}))+'.':''}</p>`:''}
    </div>
  </div>
  <div class="d-foot">
    <div class="totals num" id="t-rows"></div>
    <div class="foot-acts">
      ${isNew?'':`<button class="btn btn-danger" id="d-del">${ICON.trash}Delete</button>`}
      ${draft.archived?`<button class="btn" id="d-putback">${ICON.back}Put back on board</button>`:(!isNew&&DONE.has(draft.stage)?`<button class="btn" id="d-pickup">${ICON.pickup}Mark picked up</button>`:'')}
      <button class="btn" id="d-print">${ICON.print}${isNew?'Save & print label':'Print label'}</button>
      <button class="btn btn-primary" id="d-save">${isNew?'Create order':'Save changes'}</button>
    </div>
  </div>`;
  renderLines(); updateDrawerTotals();

  $('#d-close').onclick=()=>closeDrawer();
  $$('[data-mode]',drawer).forEach(b=>b.onclick=()=>setOrderMode(b.dataset.mode));
  if($('#d-reorder')) $('#d-reorder').onclick=async()=>{const src=clone(draft); if(await closeDrawer()!==false) reorder(src)};
  $('#f-name').oninput=e=>{draft.customer.first=e.target.value; e.target.classList.remove('err'); $('#f-name-err').hidden=true};
  $('#f-last').oninput=e=>{draft.customer.last=e.target.value; $('#f-name').classList.remove('err'); $('#f-name-err').hidden=true};
  $('#f-company').oninput=e=>{draft.customer.company=e.target.value};
  const fillSimple=()=>{ if(nameAutofill(known)) for(const f of ['company','phone','email','last']) $('#f-'+f).value=draft.customer[f]||''; if($('#f-name').value!==draft.customer.first) $('#f-name').value=draft.customer.first; };
  $('#f-name').onchange=fillSimple; $('#f-last').onchange=fillSimple;
  $('#f-phone').oninput=e=>{draft.customer.phone=e.target.value};
  $('#f-email').oninput=e=>{draft.customer.email=e.target.value};
  $('#f-due').oninput=e=>{draft.due=e.target.value};
  $('#f-odate').oninput=e=>{draft.orderDate=e.target.value};
  $('#f-loc').onchange=e=>{draft.location=e.target.value};
  $$('[data-fee]',drawer).forEach(inp=>inp.oninput=e=>{draft.fees=draft.fees||{};draft.fees[inp.dataset.fee]=e.target.value===''?0:Number(e.target.value);updateDrawerTotals()});
  $('#f-addtype').onchange=e=>{draft.fees=draft.fees||{};draft.fees.additionalType=e.target.value;updateDrawerTotals()};
  $('#f-dpct').oninput=e=>{draft.discountPct=e.target.value===''?0:Math.min(100,Number(e.target.value));updateDrawerTotals()};
  $('#f-damt').oninput=e=>{draft.discountAmt=e.target.value===''?0:Number(e.target.value);updateDrawerTotals()};
  $('#f-post').oninput=e=>{draft.postage=e.target.value===''?0:Number(e.target.value);updateDrawerTotals()};
  $('#f-notes').oninput=e=>{draft.notes=e.target.value};
  $('#f-paid').onchange=e=>{draft.paid=e.target.checked};
  $('#f-exempt').onchange=e=>{draft.taxExempt=e.target.checked;updateDrawerTotals()};
  $('#f-invoice').onchange=e=>{draft.invoice=e.target.checked};
  $$('.seg button',drawer).forEach(b=>b.onclick=()=>{draft.stage=b.dataset.stage;$$('.seg button',drawer).forEach(x=>x.setAttribute('aria-checked',String(x===b)))});
  $('#addLine').onclick=()=>{draft.lines.push(blankLine());renderLines();const ls=$$('.line select',drawer);ls[ls.length-1].focus()};
  $('#d-save').onclick=()=>saveDraft(false);
  $('#d-print').onclick=()=>saveDraft(true);
  if(!isNew) $('#d-del').onclick=deleteDraft;
  $('#d-quote').onclick=()=>docFromDrawer('quote');
  $('#d-invoice').onclick=()=>docFromDrawer('invoice');
  if($('#d-pickup')) $('#d-pickup').onclick=async()=>{
    if(JSON.stringify(draft)!==draftOrig){toast('Save your changes first, then mark it picked up.');return}
    if(await markPickedUp(draft.id,draft)) closeDrawer(true);
  };
  if($('#d-putback')) $('#d-putback').onclick=async()=>{
    if(JSON.stringify(draft)!==draftOrig){toast('Save your changes first.');return}
    const o=clone(draft); await putBack(o); closeDrawer(true);
  };
}
function renderLines(){
  if(!$('#lines')){ if(drawerOpen&&draft) renderDrawer(); return; }
  const items=state.settings.items;
  $('#lines').innerHTML=draft.lines.map((l,i)=>{
    const has=items.some(it=>it.id===l.itemId);
    return `<div class="line" data-i="${i}">
      <div class="line-item">
        <select class="inp l-item" aria-label="Pick from price list"><option value="">${has||!l.desc?'Pick from price list':'Custom item'}</option>${items.map(it=>`<option value="${esc(it.id)}" ${it.id===l.itemId?'selected':''}>${esc(it.name)} (${money(it.price)}/${esc(it.unit)})</option>`).join('')}</select>
        <input class="inp l-desc" value="${esc(l.desc)}" placeholder="Description" aria-label="Description">
      </div>
      <div><input class="inp num l-qty" type="number" min="0" step="any" value="${esc(l.qty)}" aria-label="Quantity">${l.unit?`<div class="l-unit">${esc(l.unit)}</div>`:''}<button type="button" class="l-calc" title="Work out square footage">${ICON.ruler}Sq ft</button></div>
      <input class="inp num l-price" type="number" min="0" step="0.01" value="${Number(l.price).toFixed(2)}" aria-label="Unit price">
      <div class="l-total num">${money((Number(l.qty)||0)*(Number(l.price)||0))}</div>
      <button class="icon-btn l-rm" aria-label="Remove item" title="Remove item">${ICON.x}</button>
    </div>`;
  }).join('');
}
$('#drawer').addEventListener('change',e=>{
  const row=e.target.closest('.line'); if(!row||!e.target.classList.contains('l-item')) return;
  const l=draft.lines[+row.dataset.i], it=state.settings.items.find(x=>x.id===e.target.value);
  if(it){l.itemId=it.id;l.desc=it.name;l.unit=it.unit;l.price=it.price;delete l.dims}else{l.itemId=''}
  renderLines(); updateDrawerTotals();
  const q=$(`.line[data-i="${row.dataset.i}"] .l-qty`,drawer); if(q){q.focus();q.select()}
});
$('#drawer').addEventListener('input',e=>{
  const row=e.target.closest('.line'); if(!row) return;
  const l=draft.lines[+row.dataset.i];
  if(e.target.classList.contains('l-desc')) l.desc=e.target.value;
  else if(e.target.classList.contains('l-qty')) l.qty=e.target.value===''?'':Number(e.target.value);
  else if(e.target.classList.contains('l-price')) l.price=e.target.value===''?0:Number(e.target.value);
  else return;
  $('.l-total',row).textContent=money((Number(l.qty)||0)*(Number(l.price)||0)); updateDrawerTotals();
});
$('#drawer').addEventListener('click',e=>{
  const cb=e.target.closest('.l-calc');
  if(cb){ const i=+cb.closest('.line').dataset.i; openSqft({lineIndex:i}); return; }
  const b=e.target.closest('.l-rm'); if(!b) return;
  draft.lines.splice(+b.closest('.line').dataset.i,1); if(!draft.lines.length) draft.lines.push(blankLine());
  renderLines(); updateDrawerTotals();
});
function updateDrawerTotals(){
  if(draft&&orderMode()==='detailed') return updateDetailedOut();
  if(!draft||!$('#t-rows')) return;
  const t=totals(draft);
  $('#t-rows').innerHTML=breakdown(t).map(([k,v])=>`<span>${esc(k)}</span><b${v<0?' style="color:var(--success)"':''}>${money(v)}</b>`).join('')+`<span class="grand">Total</span><b class="grand">${money(t.total)}</b>`;
}
function feeVal(v){const n=Number(v);return isFinite(n)&&n>0?String(+n.toFixed(2)):''}
function locOptions(cur){
  const L=state.settings.locations.slice(); if(isOpenLoc(cur)&&!L.includes(cur)) L.push(cur);
  return `<option value="">Not complete</option>${L.map(l=>`<option value="${esc(l)}" ${l===cur?'selected':''}>${esc(l)}</option>`).join('')}<optgroup label="Closes the order">${Object.keys(CLOSE_LOCS).map(l=>`<option value="${esc(l)}" ${l===cur?'selected':''}>${esc(l)}</option>`).join('')}</optgroup>`;
}
function feeTypeOptions(cur){
  const L=state.settings.feeTypes.slice(); if(cur&&cur!=='None'&&!L.includes(cur)) L.push(cur);
  return `<option value="None">None</option>${L.map(l=>`<option value="${esc(l)}" ${l===cur?'selected':''}>${esc(l)}</option>`).join('')}`;
}
let saving=false;
async function saveDraft(andPrint,after){
  if(saving) return;
  const d=clone(draft);
  for(const f of ['first','last','company','phone','email']) d.customer[f]=String(d.customer[f]||'').trim();
  d.customer.name=fullName(d.customer);
  if(!dueDateStr(d.orderDate)) d.orderDate=localDateStr(new Date());
  d.lines=d.lines.filter(l=>String(l.desc).trim()||Number(l.price)>0).map(l=>Object.assign(l,{desc:String(l.desc).trim(),qty:Number(l.qty)||0,price:r2(l.price)}));
  if(!d.customer.name){$('#f-name').classList.add('err');$('#f-name-err').hidden=false;$('#f-name').focus();return}
  if(!d.lines.length){toast('Add at least one item to the order.');return}
  if(d.lines.some(l=>!l.desc)){toast('Give every item a description.');return}
  if(d.lines.some(l=>l.qty<=0)){toast('Quantities need to be more than 0.');return}
  const closing=!d.archived&&CLOSE_LOCS[d.location];
  if(closing){
    if(!d.paid&&!d.invoice){
      const t=totals(d);
      const choice=await confirmDlg({title:`${isNew?'This order':'#'+d.num} isn\u2019t marked paid`,body:`${money(t.total)} is still showing as due. Did they pay?`,ok:closing==='shipped'?'Paid & shipped':'Paid & picked up',alt:closing==='shipped'?'Shipped, not paid':'Picked up, not paid'});
      if(!choice) return;
      if(choice===true) d.paid=true;
    }
    d.archived=true; d.pickedUp=true; d.closedAt=nowIso(); d.closeMethod=closing; d.prevLocation=(JSON.parse(draftOrig).location)||'';
  }
  saving=true; $$('.foot-acts .btn',drawer).forEach(b=>b.disabled=true);
  try{
    const orig=JSON.parse(draftOrig);
    if(isNew){
      const maxNum=Math.max(0,...state.orders.map(o=>o.num||0),...(state.archived||[]).map(o=>o.num||0));
      const n=Math.max(state.settings.nextNum,maxNum+1);
      const s=clone(state.settings); s.nextNum=n+1; await saveSettings(s);
      d.num=n; d.createdAt=nowIso(); d.stageAt=d.createdAt;
    }else if(orig.stage!==d.stage) d.stageAt=nowIso();
    await saveOrder(d); upsertArchived(d); if(state.view==='customers') renderCustomers();
    toast(closing?`#${d.num} ${closing==='shipped'?'shipped':'picked up'}`:(isNew?`Order #${d.num} created`:`Order #${d.num} saved`));
    await closeDrawer(true);
    if(andPrint) printOrder(d);
    if(after) after(d);
  }catch(e){
    toast(e&&e.code==='quota_exceeded'?'Storage is full. Delete old orders from a customer’s record to make room.':'Could not save the order. Try again.');
    $$('.foot-acts .btn',drawer).forEach(b=>b.disabled=false);
  }finally{saving=false}
}
async function deleteDraft(){
  const d=draft;
  if(!await confirmDlg({title:`Delete order #${d.num}?`,body:'This removes it permanently. To keep a record, archive it from Follow up instead.',ok:'Delete',danger:true})) return;
  try{await removeOrder(d.id); await closeDrawer(true); toast(`Order #${d.num} deleted`)}catch(e){toast('Could not delete that order. Try again.')}
}

/* ---------- label printing ---------- */
function labelHtml(o,maxLines){
  const t=totals(o), c=o.customer||{}, s=state.settings, due=parseDue(o.due);
  const all=(o.lines||[]).filter(l=>l.desc), shown=all.slice(0,maxLines), more=all.length-shown.length;
  const qty=l=>fmtQty(l.qty)+(l.unit&&/sq/i.test(l.unit)?' sf':'');
  return `<div class="lbl">
    <div class="lb-top">
      <div class="lb-head"><span class="lb-store">${esc(s.storeName)}</span><span class="lb-date">Ordered ${esc(fmtDate(parseDue(orderDateOf(o))||new Date(),{month:'short',day:'numeric',year:'numeric'}))}</span></div>
      <div class="lb-idrow"><span class="lb-num">#${o.num}</span><span style="display:flex;gap:4pt;flex-wrap:wrap;justify-content:flex-end">${o.invoice?'<span class="lb-status">INVOICE</span>':`<span class="lb-status${o.paid?'':' due'}">${o.paid?'PAID':'NOT PAID'}</span>`}</span></div>
      <div class="lb-name">${esc(c.name)}</div>
      ${[c.company,c.phone].filter(Boolean).length?`<div class="lb-meta">${esc([c.company,c.phone].filter(Boolean).join(', '))}</div>`:''}
      ${due||isOpenLoc(o.location)?`<div class="lb-meta">${due?'Due '+esc(fmtDate(due,{weekday:'short',month:'short',day:'numeric'})):''}${due&&isOpenLoc(o.location)?' &nbsp;|&nbsp; ':''}${isOpenLoc(o.location)?'Location: '+esc(o.location):''}</div>`:''}
      <div class="lb-rule"></div>
      <table class="lb-items"><thead><tr><th class="q">Qty</th><th>Item</th><th class="e">Each</th><th class="a">Amount</th></tr></thead><tbody>
        ${shown.map(l=>`<tr><td class="q">${esc(qty(l))}</td><td>${esc(l.desc)}${specSummary(l)?`<div class="lb-spec">${esc(specSummary(l))}</div>`:''}</td><td class="e">${esc(money(l.price))}</td><td class="a">${esc(money((Number(l.qty)||0)*(Number(l.price)||0)))}</td></tr>`).join('')}
      </tbody></table>
      ${more>0?`<div class="lb-more">+ ${more} more item${more===1?'':'s'}. Open order #${o.num} for the full list.</div>`:''}
      <div class="lb-tot">
        ${breakdown(t).map(([k,v])=>`<div><span>${esc(k)}</span><span>${esc(money(v))}</span></div>`).join('')}
        <div class="g"><span>TOTAL</span><span>${esc(money(t.total))}</span></div>
        ${!o.paid&&num0(o.deposit)>0?`<div><span>Deposit paid</span><span>-${esc(money(num0(o.deposit)))}</span></div><div style="font-weight:900"><span>AMOUNT DUE</span><span>${esc(money(amountDue(o,t)))}</span></div>`:''}
      </div>
      ${o.notes?`<div class="lb-notes">Note: ${esc(o.notes)}</div>`:''}
    </div>
  </div>
  <div class="lbl">
    <div class="lb-stub">
      <div class="lb-head"><span class="lb-keep">STORE COPY</span><span class="lb-date">Ordered ${esc(fmtDate(parseDue(orderDateOf(o))||new Date(),{month:'short',day:'numeric',year:'numeric'}))}</span></div>
      <div class="lb-snum">#${o.num}</div>
      <div class="lb-sname">${esc(c.name)}</div>
      ${c.company?`<div class="lb-smeta">${esc(c.company)}</div>`:''}
      ${c.phone?`<div class="lb-smeta">${esc(c.phone)}</div>`:''}
      <div class="lb-rule" style="margin:8pt 0 6pt"></div>
      <div class="lb-idrow"><span style="font-size:15pt;font-weight:900">Total ${esc(money(t.total))}</span>${o.invoice?'<span class="lb-status">INVOICE</span>':''}</div>
      <div class="lb-sitems">${esc(itemSummary(o))}</div>
      ${due?`<div class="lb-smeta" style="font-size:10pt">Due ${esc(fmtDate(due,{weekday:'short',month:'short',day:'numeric'}))}</div>`:''}
      ${isOpenLoc(o.location)?`<div class="lb-smeta" style="font-size:12pt;font-weight:800;margin-top:4pt">Location: ${esc(o.location)}</div>`:''}
      <div class="lb-write">
        <span>Picked up <i style="width:0.55in"></i>/<i style="width:0.55in"></i>/<i style="width:0.8in"></i></span>
        <span>By <i style="width:2.2in"></i></span>
      </div>
    </div>
  </div>`;
}
function printOrder(o){
  const area=$('#printArea');
  const all=(o.lines||[]).filter(l=>l.desc).length;
  let maxLines=Math.max(all,1), fitted=false;
  while(!fitted){
    area.innerHTML=labelHtml(o,maxLines);
    const top=$('.lb-top',area);
    for(const sc of [1.3,1.2,1.1,1,0.93,0.86,0.8,0.75]){
      top.style.setProperty('--ls',sc);
      if(top.scrollHeight<=top.clientHeight+1){fitted=true;break}
    }
    if(!fitted){ if(maxLines<=1) fitted=true; else maxLines--; }
  }
  if(window.PC_DEMO) return showLabelPreview(o);
  setTimeout(()=>{try{window.print()}catch(e){toast('Printing is blocked here. Open this page in its own tab and try again.')}},60);
}
/* demo build only: the published demo can't open the print dialog, so show the two labels on screen */
function showLabelPreview(o){
  let dlg=$('#lblDlg');
  if(!dlg){
    dlg=document.createElement('div'); dlg.className='dlg-scrim'; dlg.id='lblDlg';
    dlg.innerHTML='<div class="dlg lbl-pv" role="dialog" aria-modal="true" aria-labelledby="lblPvTitle"><h3 id="lblPvTitle"></h3><p>On the store PC, Print label sends these two separate 4\u00d76 labels to the label printer.</p><div class="lbl-pv-row" id="lblPvRow"></div><div class="dlg-acts"><button class="btn btn-primary" id="lblPvClose">Close</button></div></div>';
    document.body.appendChild(dlg);
    const close=()=>dlg.classList.remove('on');
    $('#lblPvClose').onclick=close;
    dlg.addEventListener('click',e=>{if(e.target===dlg)close()});
    dlg.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}});
  }
  $('#lblPvTitle').textContent=`Labels for order #${o.num}`;
  const caps=['Label 1: goes on the bag','Label 2: store copy'];
  $('#lblPvRow').innerHTML='';
  $$('#printArea .lbl').forEach((l,i)=>{
    const fig=document.createElement('figure'); fig.className='lbl-pv-fig';
    const box=document.createElement('div'); box.className='lbl-pv-box'; box.appendChild(l.cloneNode(true));
    const cap=document.createElement('figcaption'); cap.textContent=caps[i]||'';
    fig.append(box,cap); $('#lblPvRow').appendChild(fig);
  });
  dlg.classList.add('on'); setTimeout(()=>$('#lblPvClose').focus(),30);
}

/* ---------- detailed order form ---------- */
const LS_MODE='pc_order_mode';
function orderMode(){return lsGet(LS_MODE,'simple')==='detailed'?'detailed':'simple'}
function setOrderMode(m){lsSet(LS_MODE,m);renderDrawer()}
function modeSwitch(){const m=orderMode();return `<div class="mode-sw" role="group" aria-label="Order view"><button type="button" data-mode="simple" aria-pressed="${m==='simple'}">Simple</button><button type="button" data-mode="detailed" aria-pressed="${m==='detailed'}">Detailed</button></div>`}
let curLine=0;
const COLORS=['1/0','1/1','4/0','4/1','4/4'];
const SIZES=['8.5x11','8.5x14','11x17','5.5x8.5','8.5x5.5','4x6','5x7','4.25x5.5','3.5x2','12x18','18x24','24x36'];
const BOOKLET=['Coil Binding','Comb Binding','Saddle Stitch','Tape Binding','Wire-O','Perfect Bound','Padding'];
const FIN_STD=[['cutting','Cutting'],['folding','Folding'],['perforating','Perforating'],['holePunch','Hole Punch'],['stapling','Stapling'],['scoring','Scoring'],['laminating','Laminating'],['roundCorners','Round Corners']];
const FIN_WIDE=[['mounting','Mounting'],['grommets','Grommets'],['hStakes','H Stakes']];
const FIN_BOOK=[['clearFront','Clear Front'],['blackBack','Black Back'],['blueBack','Blue Back'],['chipboard','Chipboard']];
const ARTWORK=['Artwork on File','Modified Artwork on File','Designed Artwork','Customer Provided'];
function getPath(o,p){return p.split('.').reduce((a,k)=>a==null?undefined:a[k],o)}
function setPath(o,p,v){const ks=p.split('.');let a=o;for(let i=0;i<ks.length-1;i++){if(!a[ks[i]]||typeof a[ks[i]]!=='object')a[ks[i]]={};a=a[ks[i]]}a[ks[ks.length-1]]=v}
function readInput(el){if(el.type==='checkbox')return el.checked;if(el.type==='number')return el.value===''?0:Number(el.value);return el.value}
function amountDue(o,t){t=t||totals(o);return o.paid?0:Math.max(0,r2(t.total-num0(o.deposit)))}
function specSummary(l){
  const s=l.spec||{}, f=s.fin||{}, out=[];
  if(s.other) out.push(s.other);
  if(s.size) out.push(s.size);
  if(s.color) out.push(s.color);
  if(s.paper) out.push(s.paper);
  if(s.bleed) out.push('bleed');
  if(s.setOf&&num0(s.setQty)) out.push('sets of '+s.setQty);
  [...FIN_STD,...FIN_WIDE].forEach(([k,n])=>{if(f[k])out.push(n)});
  const bk=FIN_BOOK.filter(([k])=>f[k]).map(x=>x[1]);
  if(s.bookletType||bk.length) out.push([s.bookletType,...bk].filter(Boolean).join(' / '));
  if(s.bookletOther) out.push(s.bookletOther);
  if(s.numbering) out.push('numbered'+(s.numStart||s.numEnd?` ${s.numStart||'?'}-${s.numEnd||'?'}`:''));
  if(s.otherFinishing) out.push(s.otherFinishing);
  return out.join(', ');
}
function dText(iso){return iso?fmtDate(new Date(iso),{month:'2-digit',day:'2-digit',year:'2-digit'}):''}
function renderDetailed(){
  if(curLine>=draft.lines.length) curLine=draft.lines.length-1; if(curLine<0) curLine=0;
  const l=draft.lines[curLine], n=draft.lines.length, g=p=>getPath(draft,p), gl=p=>getPath(l,p);
  const V=v=>esc(v==null?'':v), M=v=>feeVal(v);
  const ik=(k,type='text',extra='')=>`<input class="inp" id="x-${k.replace(/\./g,'-')}" data-k="${k}" type="${type}" value="${type==='number'?M(g(k)):V(g(k))}" ${extra}>`;
  const il=(k,type='text',extra='')=>`<input class="inp" id="y-${k.replace(/\./g,'-')}" data-l="${k}" type="${type}" value="${type==='number'&&k!=='qty'?M(gl(k)):V(gl(k))}" ${extra}>`;
  const ck=(attr,k,label,val,extra='')=>`<label class="ck"><input type="checkbox" ${attr}="${k}" ${val?'checked':''} ${extra}>${label}</label>`;
  const row=(label,html,forId)=>`<div class="dr"><label ${forId?`for="${forId}"`:''}>${label}</label><div class="dv">${html}</div></div>`;
  const out=(key,cls='')=>`<div class="out ${cls}" data-out="${key}"></div>`;
  const known=buildCustomers().filter(c=>c.info.name);
  const assoc=[...new Set([...(state.settings.associates||[]),...allKnownOrders().map(o=>o.associate).filter(Boolean)])];
  const rs=readySince(draft);
  const items=state.settings.items, hasItem=items.some(it=>it.id===l.itemId);
  const created=draft.createdAt?'Created '+fmtDate(new Date(draft.createdAt),{month:'short',day:'numeric',year:'numeric'}):'Not saved yet';
  drawer.classList.add('wide');
  drawer.innerHTML=`
  <div class="d-head"><div><h2 id="dTitle">${isNew?'New order':'Order #'+draft.num}</h2><div class="d-sub">${esc(created)}</div></div>
    ${modeSwitch()}
    <button class="icon-btn" id="d-close" aria-label="Close" style="margin-left:4px">${ICON.x}</button></div>
  <div class="d-body dt">
    <div class="dt-col">
      <section class="dsec"><h3>Customer information</h3><div class="dsec-b">
        ${row('Business',ik('customer.company','text','autocomplete="off"'),'x-customer-company')}
        ${row('First name *',`<input class="inp" id="f-name" data-k="customer.first" value="${V(g('customer.first'))}" autocomplete="off" list="custSuggest"><span class="err-msg" id="f-name-err" hidden>Enter the customer\u2019s name.</span>`,'f-name')}
        ${row('Last name',`<input class="inp" id="f-last" data-k="customer.last" value="${V(g('customer.last'))}" autocomplete="off">`,'f-last')}
        ${row('Number',ik('customer.phone','tel','autocomplete="off"'),'x-customer-phone')}
        ${row('Email',ik('customer.email','email','autocomplete="off"'),'x-customer-email')}
        <datalist id="custSuggest">${known.map(c=>`<option value="${esc(c.info.name)}">${esc([c.info.company,c.info.phone].filter(Boolean).join(', '))}</option>`).join('')}</datalist>
      </div></section>
      <section class="dsec"><h3>Order information<span class="dsec-meta">Order ID: ${draft.num?'#'+draft.num:'New'}</span></h3><div class="dsec-b">
        ${row('Order date',ik('orderDate','date'),'x-orderDate')}
        ${row('Due',ik('due','date'),'x-due')}
        ${row('Associate',ik('associate','text','list="assocList" autocomplete="off" style="max-width:120px"'),'x-associate')}
        <datalist id="assocList">${assoc.map(a=>`<option value="${esc(a)}">`).join('')}</datalist>
        <div class="dr"><span></span><div class="dv ck-row">${ck('data-k','ship.on','Ship to customer',g('ship.on'),'data-rerender')}${ck('data-k','invoice','Invoice order',g('invoice'))}</div></div>
        ${g('ship.on')?row('Ship to',`<textarea class="inp" id="x-ship-address" data-k="ship.address" rows="2" placeholder="Street, city, state, ZIP">${V(g('ship.address'))}</textarea>`,'x-ship-address')+row('Tracking #',ik('ship.tracking'),'x-ship-tracking'):''}
        ${row('Order status',`<select class="inp" id="x-stage" data-k="stage">${STAGES.map(s=>`<option value="${s.id}" ${s.id===draft.stage?'selected':''}>${esc(s.label)}</option>`).join('')}</select>`,'x-stage')}
        ${row('Location',`<select class="inp" id="x-location" data-k="location" title="Where the order is located in the store">${locOptions(draft.location)}</select>`,'x-location')}
        <div class="dgrid2">
          ${row('Completed',`<div class="out ro">${rs&&DONE.has(draft.stage)?esc(dText(rs)):'—'}</div>`)}
          ${row('Picked up',`<div class="out ro">${draft.archived&&draft.closedAt?esc(dText(draft.closedAt))+(draft.closeMethod==='shipped'?' (shipped)':''):'—'}</div>`)}
        </div>
      </div></section>
      <section class="dsec"><h3>Send out</h3><div class="dsec-b">
        ${row('Vendor',ik('sendOut.vendor'),'x-sendOut-vendor')}
        <div class="dgrid2">
          ${row('Our cost',ik('sendOut.cost','number','min="0" step="0.01" placeholder="0.00"'),'x-sendOut-cost')}
          ${row('Shipping',ik('sendOut.shipping','number','min="0" step="0.01" placeholder="0.00"'),'x-sendOut-shipping')}
        </div>
        ${row('Sent out on',ik('sendOut.sentOn','date'),'x-sendOut-sentOn')}
        ${row('Notes',ik('sendOut.notes'),'x-sendOut-notes')}
      </div></section>
      <section class="dsec"><h3>Notes<span class="dsec-meta">${ck('data-k','followedUp','Followed up',g('followedUp'))}</span></h3><div class="dsec-b">
        <textarea class="inp" id="f-notes" data-k="notes" rows="4" placeholder="Anything the next person should know">${V(g('notes'))}</textarea>
      </div></section>
    </div>

    <div class="dt-col">
      <section class="dsec"><h3>Product details
        <span class="item-nav"><button type="button" data-nav="prev" ${curLine===0?'disabled':''} aria-label="Previous item">‹</button><span>Item ${curLine+1} of ${n}</span><button type="button" data-nav="next" ${curLine>=n-1?'disabled':''} aria-label="Next item">›</button><button type="button" data-nav="add">+ Add item</button>${n>1?'<button type="button" data-nav="remove">Remove</button>':''}</span></h3>
        <div class="dsec-b">
        ${row('Product *',`<select class="inp" id="x-product" data-act="product"><option value="">${hasItem||!l.desc?'Pick from price list':'Custom item'}</option>${items.map(it=>`<option value="${esc(it.id)}" ${it.id===l.itemId?'selected':''}>${esc(it.name)} (${money(it.price)}/${esc(it.unit)})</option>`).join('')}</select>`,'x-product')}
        ${row('Other',il('spec.other','text','placeholder="Product not on the list"'),'y-spec-other')}
        ${row('Description *',`<textarea class="inp" id="y-desc" data-l="desc" rows="2">${V(l.desc)}</textarea>`,'y-desc')}
        <div class="dr"><span class="dlab">Artwork</span><div class="dv radios">${ARTWORK.map((a,i)=>`<label class="ck"><input type="radio" name="art" data-l="spec.artwork" value="${esc(a)}" ${gl('spec.artwork')===a?'checked':''}>${esc(a)}</label>`).join('')}</div></div>
        <div class="dr"><span class="dlab">Promotion</span><div class="dv" style="display:flex;gap:8px;align-items:center">${ck('data-k','promo.on','',g('promo.on'),'aria-label="Promotion"')}<input class="inp" data-k="promo.text" value="${V(g('promo.text'))}" placeholder="Promo name or code" aria-label="Promotion details"></div></div>
      </div></section>
      <section class="dsec"><h3>Production details</h3><div class="dsec-b">
        <div class="dgrid2">
          ${row('Qty *',il('qty','number','min="0" step="any"'),'y-qty')}
          <div class="dr"><span class="dlab">Set of</span><div class="dv" style="display:flex;gap:8px;align-items:center">${ck('data-l','spec.setOf','',gl('spec.setOf'),'aria-label="Sold in sets"')}${il('spec.setQty','number','min="0" step="1" placeholder="100" aria-label="Pieces per set"')}</div></div>
          ${row('Finished size',il('spec.size','text','list="sizeList"'),'y-spec-size')}
          <div class="dr"><span></span><div class="dv">${ck('data-l','spec.bleed','Bleed',gl('spec.bleed'))}</div></div>
          ${row('Color',il('spec.color','text','list="colorList" placeholder="4/0"'),'y-spec-color')}
          ${row('Paper',il('spec.paper','text','list="paperList"'),'y-spec-paper')}
        </div>
        <datalist id="sizeList">${SIZES.map(x=>`<option value="${x}">`).join('')}</datalist>
        <datalist id="colorList">${COLORS.map(x=>`<option value="${x}">`).join('')}</datalist>
        <datalist id="paperList">${(state.settings.papers||[]).map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
        ${l.dims?`<div class="hint" style="font-size:12.5px">Square footage: ${esc(fmtSq(l.dims.w))} × ${esc(fmtSq(l.dims.h))} ${esc(l.dims.u)}${l.dims.copies>1?', '+l.dims.copies+' pieces':''} = ${esc(fmtSq(l.qty))} sq ft</div>`:''}
      </div></section>
      <section class="dsec"><h3>Finishing</h3><div class="dsec-b">
        <div class="fin-grid">
          <div class="fin-col"><h4>Standard</h4>${FIN_STD.map(([k,nm])=>ck('data-l','spec.fin.'+k,nm,gl('spec.fin.'+k))).join('')}</div>
          <div class="fin-col"><h4>Wide format</h4>${FIN_WIDE.map(([k,nm])=>ck('data-l','spec.fin.'+k,nm,gl('spec.fin.'+k))).join('')}</div>
          <div class="fin-col"><h4>Booklets / pads</h4>
            <select class="inp" data-l="spec.bookletType" aria-label="Binding"><option value="">None</option>${BOOKLET.map(b=>`<option ${gl('spec.bookletType')===b?'selected':''}>${b}</option>`).join('')}</select>
            ${FIN_BOOK.map(([k,nm])=>ck('data-l','spec.fin.'+k,nm,gl('spec.fin.'+k))).join('')}
            <input class="inp" data-l="spec.bookletOther" value="${V(gl('spec.bookletOther'))}" placeholder="Other" aria-label="Other booklet option">
          </div>
          <div class="fin-col"><h4>Numbering</h4>${ck('data-l','spec.numbering','Numbering',gl('spec.numbering'))}
            <label class="dmini">Start at<input class="inp" data-l="spec.numStart" value="${V(gl('spec.numStart'))}" inputmode="numeric"></label>
            <label class="dmini">End at<input class="inp" data-l="spec.numEnd" value="${V(gl('spec.numEnd'))}" inputmode="numeric"></label>
          </div>
        </div>
        ${row('Other finishing',il('spec.otherFinishing'),'y-spec-otherFinishing')}
      </div></section>
      <section class="dsec"><h3>Price calculators</h3><div class="dsec-b"><div class="btn-grid three">
        <button type="button" class="btn" data-calc="sqft">${ICON.ruler}Sq ft calc</button>
        <button type="button" class="btn" data-calc="margin">Margin calc</button>
        <button type="button" class="btn" data-calc="lookup">Price lookup</button>
      </div></div></section>
    </div>

    <div class="dt-col">
      <section class="dsec"><h3>Pricing details</h3><div class="dsec-b">
        <div class="dr"><label for="y-price">Price per piece</label><div class="dv dpair">${il('price','number','min="0" step="0.01" placeholder="0.00"')}${out('line')}</div></div>
        ${n>1?row('All items',out('sub')):''}
        ${row('Discount $',ik('discountAmt','number','min="0" step="0.01" placeholder="0.00"'),'x-discountAmt')}
        ${row('Discount %',ik('discountPct','number','min="0" max="100" step="0.01" placeholder="0"'),'x-discountPct')}
        ${row('Discounted total',out('discounted','soft'))}
        <div class="drule"></div>
        ${row('Rush fee',ik('fees.rush','number','min="0" step="0.01" placeholder="0.00"'),'x-fees-rush')}
        ${row('Design fee',ik('fees.design','number','min="0" step="0.01" placeholder="0.00"'),'x-fees-design')}
        ${row('Set up fee',ik('fees.setup','number','min="0" step="0.01" placeholder="0.00"'),'x-fees-setup')}
        ${row('Additional fee',ik('fees.additional','number','min="0" step="0.01" placeholder="0.00"'),'x-fees-additional')}
        ${row('',`<select class="inp" data-k="fees.additionalType" aria-label="Additional fee type">${feeTypeOptions(g('fees.additionalType'))}</select>`)}
        <div class="drule"></div>
        ${row('Total',out('taxable','soft'))}
        <div class="dr"><span class="dv">${ck('data-k','taxExempt','Non taxed',g('taxExempt'))}</span><div class="dv dpair"><span class="dlab" data-out="taxLbl" style="text-align:right"></span>${out('tax')}</div></div>
        ${row('Postage <span class="dlab">(no tax)</span>',ik('postage','number','min="0" step="0.01" placeholder="0.00"'),'x-postage')}
        ${row('Order total',out('total','soft'))}
        <div class="dr"><span class="dv">${ck('data-k','paid','Paid in full',g('paid'))}</span><div class="dv dpair"><span class="dlab" style="text-align:right">Deposit</span>${ik('deposit','number','min="0" step="0.01" placeholder="0.00" aria-label="Deposit"')}</div></div>
        ${row('Amount due',out('due','due'))}
        <div class="dr"><span></span><div class="dv">${ck('data-k','chargeCopyAcct','Charge copy acct',g('chargeCopyAcct'))}</div></div>
      </div></section>
      <section class="dsec"><h3>Order summary</h3><div class="dsec-b"><div class="btn-grid">
        <button type="button" class="btn" data-doc="quote">${ICON.doc}Quote</button>
        <button type="button" class="btn" data-doc="quote-nt">Quote no tax</button>
        <button type="button" class="btn" data-doc="invoice">${ICON.doc}Invoice</button>
        <button type="button" class="btn" data-doc="invoice-nt">Invoice no tax</button>
        <button type="button" class="btn" id="d-print">${ICON.print}Order label</button>
        <button type="button" class="btn" data-act="shipinfo">Shipping info</button>
      </div></div></section>
      <section class="dsec"><h3>Close order</h3><div class="dsec-b"><div class="btn-grid">
        <button type="button" class="btn" data-act="duplicate" ${isNew?'disabled':''}>${ICON.copy}Duplicate</button>
        <button type="button" class="btn" data-act="reset">Reset order</button>
        <button type="button" class="btn" data-act="neworder">${ICON.plus}New order</button>
        <button type="button" class="btn" data-act="close">Close</button>
        ${draft.archived?`<button type="button" class="btn wide" id="d-putback">${ICON.back}Put back on board</button>`:(!isNew&&DONE.has(draft.stage)?`<button type="button" class="btn wide" id="d-pickup">${ICON.pickup}Mark picked up</button>`:'')}
        <button type="button" class="btn btn-primary wide" id="d-save">Save and close</button>
        ${isNew?'':`<button type="button" class="btn btn-danger wide" id="d-del">${ICON.trash}Delete order</button>`}
      </div></div></section>
    </div>
  </div>`;
  bindDetailed(known);
  updateDetailedOut();
}
function updateDetailedOut(){
  if(!draft) return;
  const t=totals(draft), l=draft.lines[curLine]||{};
  const set=(k,v)=>{const el=$(`[data-out="${k}"]`,drawer); if(el) el.textContent=v};
  set('line',money((Number(l.qty)||0)*(Number(l.price)||0)));
  set('sub',money(t.sub)); set('discounted',money(t.sub-t.discount)); set('taxable',money(t.taxable));
  set('taxLbl',t.exempt?'Tax (none)':'Tax '+pct(t.rate)); set('tax',money(t.tax));
  set('total',money(t.total)); set('due',money(amountDue(draft,t)));
}
function bindDetailed(known){
  const onEdit=(el,target,path)=>{
    const ev=(el.type==='checkbox'||el.type==='radio'||el.tagName==='SELECT')?'change':'input';
    el.addEventListener(ev,()=>{
      if(el.type==='radio'&&!el.checked) return;
      let v=readInput(el);
      if(path==='discountPct') v=Math.min(100,Number(v)||0);
      setPath(target(),path,v);
      if(el.id==='f-name'||el.id==='f-last'){$('#f-name').classList.remove('err');$('#f-name-err').hidden=true}
      if(el.hasAttribute('data-rerender')) renderDrawer(); else updateDetailedOut();
    });
  };
  $$('[data-k]',drawer).forEach(el=>onEdit(el,()=>draft,el.dataset.k));
  $$('[data-l]',drawer).forEach(el=>onEdit(el,()=>draft.lines[curLine],el.dataset.l));
  const fillDet=()=>{ if(nameAutofill(known)) renderDrawer(); };
  $('#f-name').addEventListener('change',fillDet); $('#f-last').addEventListener('change',fillDet);
  $('#x-product').addEventListener('change',e=>{
    const l=draft.lines[curLine], it=state.settings.items.find(x=>x.id===e.target.value);
    if(it){l.itemId=it.id;l.desc=it.name;l.unit=it.unit;l.price=it.price;delete l.dims}else l.itemId='';
    renderDrawer();
  });
  $$('[data-nav]',drawer).forEach(b=>b.addEventListener('click',()=>{
    const a=b.dataset.nav;
    if(a==='prev') curLine--; else if(a==='next') curLine++;
    else if(a==='add'){draft.lines.push(blankLine());curLine=draft.lines.length-1}
    else if(a==='remove'){draft.lines.splice(curLine,1);if(!draft.lines.length)draft.lines.push(blankLine());curLine=Math.min(curLine,draft.lines.length-1)}
    renderDrawer();
  }));
  $$('[data-mode]',drawer).forEach(b=>b.addEventListener('click',()=>setOrderMode(b.dataset.mode)));
  $$('[data-calc]',drawer).forEach(b=>b.addEventListener('click',()=>{
    const c=b.dataset.calc;
    if(c==='sqft') openSqft({lineIndex:curLine});
    else if(c==='margin') openMargin();
    else openLookup();
  }));
  $$('[data-doc]',drawer).forEach(b=>b.addEventListener('click',()=>{const [k,nt]=b.dataset.doc.split('-');docFromDrawer(k,{noTax:!!nt})}));
  $$('[data-act]',drawer).forEach(b=>{ if(b.id==='x-product') return; b.addEventListener('click',async()=>{
    const a=b.dataset.act;
    if(a==='shipinfo'){ setPath(draft,'ship.on',true); renderDrawer(); const t=$('#x-ship-address'); if(t) t.focus(); }
    else if(a==='duplicate'){ const src=clone(draft); if(await closeDrawer()!==false) reorder(src); }
    else if(a==='reset'){ if(JSON.stringify(draft)===draftOrig){toast('Nothing to reset.');return} if(await confirmDlg({title:'Reset this order?',body:'Undo every change since it was last saved.',ok:'Reset',danger:true})){draft=JSON.parse(draftOrig);curLine=0;renderDrawer()} }
    else if(a==='neworder'){ if(await closeDrawer()!==false) openDrawer(null); }
    else if(a==='close'){ closeDrawer(); }
  })});
  $('#d-close').onclick=()=>closeDrawer();
  $('#d-save').onclick=()=>saveDraft(false);
  $('#d-print').onclick=()=>saveDraft(true);
  if($('#d-del')) $('#d-del').onclick=deleteDraft;
  if($('#d-pickup')) $('#d-pickup').onclick=async()=>{
    if(JSON.stringify(draft)!==draftOrig){toast('Save your changes first, then mark it picked up.');return}
    if(await markPickedUp(draft.id,draft)) closeDrawer(true);
  };
  if($('#d-putback')) $('#d-putback').onclick=async()=>{
    if(JSON.stringify(draft)!==draftOrig){toast('Save your changes first.');return}
    const o=clone(draft); await putBack(o); closeDrawer(true);
  };
}

/* margin calculator */
function openMargin(){
  const dl=$('#mcDlg'), l=draft&&draft.lines[curLine];
  const cost=num0(getPath(draft||{},'sendOut.cost'));
  const q=Math.max(1,Number(l&&l.qty)||1);
  $('#mc-cost').value=cost?String(+(cost/q).toFixed(4)):''; $('#mc-m').value=$('#mc-m').value||'50';
  dl.classList.add('on'); mcUpdate(); setTimeout(()=>$('#mc-cost').focus(),30);
}
function mcCompute(){const c=parseFloat($('#mc-cost').value), m=parseFloat($('#mc-m').value);if(!(c>=0)||!(m>=0&&m<100))return null;const price=r2(c/(1-m/100));return {c,m,price,profit:r2(price-c),markup:c>0?r2((price-c)/c*100):0}}
function mcUpdate(){const r=mcCompute();$('#mcApply').disabled=!r;$('#mc-price').textContent=r?money(r.price):'$0.00';$('#mc-detail').textContent=r?`${money(r.profit)} profit per piece, ${r.markup}% markup`:'Enter a cost and a margin under 100%'}
['#mc-cost','#mc-m'].forEach(s=>$(s).addEventListener('input',mcUpdate));
$('#mcCancel').addEventListener('click',()=>$('#mcDlg').classList.remove('on'));
$('#mcDlg').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();$('#mcDlg').classList.remove('on')}});
$('#mcApply').addEventListener('click',()=>{const r=mcCompute();if(!r||!draft)return;draft.lines[curLine].price=r.price;$('#mcDlg').classList.remove('on');renderDrawer();toast('Price per piece set to '+money(r.price))});

/* price lookup */
function openLookup(){$('#pl-q').value='';plRender();$('#plDlg').classList.add('on');setTimeout(()=>$('#pl-q').focus(),30)}
function plRender(){
  const q=$('#pl-q').value.trim().toLowerCase(), items=state.settings.items.filter(it=>!q||it.name.toLowerCase().includes(q));
  $('#pl-list').innerHTML=items.length?items.map(it=>`<button type="button" class="pl-row" data-id="${esc(it.id)}"><span>${esc(it.name)}</span><b class="num">${money(it.price)} / ${esc(it.unit)}</b></button>`).join(''):'<div class="tbl-empty">No matching items. Add them in Price list.</div>';
}
$('#pl-q').addEventListener('input',plRender);
$('#pl-q').addEventListener('keydown',e=>{if(e.key==='Enter'){const f=$('#pl-list .pl-row');if(f)f.click()}});
$('#plCancel').addEventListener('click',()=>$('#plDlg').classList.remove('on'));
$('#plDlg').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();$('#plDlg').classList.remove('on')}});
$('#pl-list').addEventListener('click',e=>{
  const b=e.target.closest('.pl-row'); if(!b||!draft) return;
  const it=state.settings.items.find(x=>x.id===b.dataset.id); if(!it) return;
  const l=draft.lines[curLine]; l.itemId=it.id;l.desc=it.name;l.unit=it.unit;l.price=it.price;delete l.dims;
  $('#plDlg').classList.remove('on'); renderDrawer();
});

/* ---------- reorder ---------- */
function reorder(o){
  const lines=(o.lines||[]).map(l=>{const n={itemId:l.itemId||'',desc:l.desc,unit:l.unit||'',qty:l.qty,price:l.price};if(l.dims)n.dims=clone(l.dims);return n});
  openDrawer(null,clone(o.customer||{}),lines,o.notes||'');
  draft.taxExempt=!!o.taxExempt; draft.invoice=!!o.invoice;
  if(o.fees) draft.fees=clone(o.fees); if(o.discountPct) draft.discountPct=o.discountPct; if(o.discountAmt) draft.discountAmt=o.discountAmt;
  renderDrawer();
  toast(`Copied order #${o.num}. Check prices and the due date, then create it.`);
}

/* ---------- square footage calculator ---------- */
const SQ_PRESETS=[[11,17,'in'],[18,24,'in'],[24,36,'in'],[2,4,'ft'],[3,6,'ft'],[4,8,'ft']];
let sqCtx=null, sqUnit='in';
const sqDlg=$('#sqDlg');
$('#sqPresets').innerHTML=SQ_PRESETS.map(([w,h,u])=>`<button type="button" data-w="${w}" data-h="${h}" data-u="${u}">${w} × ${h} ${u}</button>`).join('');
function setSqUnit(u){sqUnit=u;$$('.unit-seg button',sqDlg).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.u===u)))}
function fmtSq(n){return (+(+n).toFixed(2)).toLocaleString('en-US')}
function openSqft(ctx){
  sqCtx=ctx; let w='',h='',u='in',c=1,round=false,rate='';
  if(ctx.lineIndex!=null){
    const l=draft.lines[ctx.lineIndex], isSq=/sq/i.test(l.unit||'');
    if(l.dims){w=l.dims.w;h=l.dims.h;u=l.dims.u||'in';c=l.dims.copies||1;round=!!l.dims.round}
    else c=isSq?1:(Math.max(1,parseInt(l.qty,10)||1));
    if(isSq&&Number(l.price)>0) rate=l.price;
  }
  if(rate===''){const it=state.settings.items.find(i=>/sq/i.test(i.unit));if(it)rate=it.price}
  $('#sq-w').value=w;$('#sq-h').value=h;$('#sq-c').value=c;$('#sq-round').checked=round;$('#sq-r').value=rate===''?'':Number(rate).toFixed(2);
  setSqUnit(u);
  $('#sqApply').textContent=ctx.lineIndex!=null?'Use on this item':'Start an order with this';
  sqDlg.classList.add('on'); sqUpdate(); setTimeout(()=>$('#sq-w').focus(),30);
}
function closeSqft(){sqDlg.classList.remove('on');sqCtx=null}
function sqCompute(){
  const w=parseFloat($('#sq-w').value), h=parseFloat($('#sq-h').value), c=Math.max(1,parseInt($('#sq-c').value,10)||1), round=$('#sq-round').checked, rate=parseFloat($('#sq-r').value);
  if(!(w>0&&h>0)) return null;
  let each=sqUnit==='in'?w*h/144:w*h; each=round?Math.ceil(each-1e-9):r2(each);
  return {w,h,u:sqUnit,copies:c,round,each,total:r2(each*c),rate:isNaN(rate)||rate<0?null:r2(rate)};
}
function sqUpdate(){
  const r=sqCompute();
  $('#sqApply').disabled=!r;
  if(!r){$('#sq-total').textContent='0 sq ft';$('#sq-each').textContent='Enter a width and height';$('#sq-price').innerHTML='';return}
  $('#sq-total').textContent=fmtSq(r.total)+' sq ft';
  $('#sq-each').textContent=r.copies>1?`${fmtSq(r.each)} sq ft each, ${r.copies} pieces`:`${fmtSq(r.w)} × ${fmtSq(r.h)} ${r.u}`;
  $('#sq-price').innerHTML=r.rate!=null?`<b>${money(r.total*r.rate)}</b><span class="sq-small">at ${money(r.rate)}/sq ft, before tax</span>`:'';
}
['#sq-w','#sq-h','#sq-c','#sq-r'].forEach(sel=>$(sel).addEventListener('input',sqUpdate));
$('#sq-round').addEventListener('change',sqUpdate);
$$('.unit-seg button',sqDlg).forEach(b=>b.addEventListener('click',()=>{setSqUnit(b.dataset.u);sqUpdate()}));
$('#sqPresets').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('#sq-w').value=b.dataset.w;$('#sq-h').value=b.dataset.h;setSqUnit(b.dataset.u);sqUpdate()});
$('#sqCancel').addEventListener('click',closeSqft);
sqDlg.addEventListener('click',e=>{if(e.target===sqDlg)closeSqft()});
sqDlg.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();closeSqft()}else if(e.key==='Enter'&&e.target.tagName==='INPUT'&&e.target.type!=='checkbox'){e.preventDefault();$('#sqApply').click()}});
$('#sqftBtn').addEventListener('click',()=>openSqft({}));
$('#sqApply').addEventListener('click',()=>{
  const r=sqCompute(); if(!r) return;
  const tag=`${fmtSq(r.w)} × ${fmtSq(r.h)} ${r.u}${r.copies>1?', '+r.copies+' pcs':''}`;
  const dims={w:r.w,h:r.h,u:r.u,copies:r.copies,round:r.round};
  const sqItem=state.settings.items.find(x=>/sq/i.test(x.unit));
  const ctx=sqCtx; closeSqft();
  if(ctx&&ctx.lineIndex!=null&&draft){
    const l=draft.lines[ctx.lineIndex];
    let base=String(l.desc||'').replace(/\s*\([\d.,]+ × [\d.,]+ (in|ft)(, \d+ pcs)?\)$/,'');
    if(!base){base=sqItem?sqItem.name:'Large format print'; if(sqItem) l.itemId=sqItem.id}
    l.desc=`${base} (${tag})`; l.qty=r.total; l.unit='sq ft'; l.dims=dims;
    if(r.rate!=null) l.price=r.rate;
    renderLines(); updateDrawerTotals();
    if(r.rate==null) toast('Square footage added. Set a price per sq ft on that item.');
  }else{
    const line={itemId:sqItem?sqItem.id:'',desc:`${sqItem?sqItem.name:'Large format print'} (${tag})`,unit:'sq ft',qty:r.total,price:r.rate!=null?r.rate:0,dims};
    openDrawer(null,null,[line]);
  }
});

/* ---------- quote & invoice PDFs ---------- */
function docFromDrawer(kind,opts){
  if(isNew||JSON.stringify(draft)!==draftOrig) return saveDraft(false,o=>makePdf(o,kind,opts));
  makePdf(clone(draft),kind,opts);
}
function fmtQty(q){const n=Number(q)||0;return Number.isInteger(n)?String(n):String(+n.toFixed(3))}
function safeFile(s){return String(s||'').replace(/[\\/:*?"<>|]+/g,'').replace(/\s+/g,' ').trim().slice(0,60)}
/* Libron is embedded for the PDFs (see build); fall back to Helvetica if it is missing */
function pdfFont(doc){
  const f=window.PC_PDF_FONTS;
  if(!f||!f.regular||!f.bold) return 'helvetica';
  try{
    doc.addFileToVFS('Libron-Regular.ttf',f.regular); doc.addFont('Libron-Regular.ttf','Libron','normal');
    doc.addFileToVFS('Libron-Bold.ttf',f.bold); doc.addFont('Libron-Bold.ttf','Libron','bold');
    return 'Libron';
  }catch(e){return 'helvetica'}
}
async function makePdf(o,kind,opts){
  const orig=o;
  if(opts&&opts.noTax){o=clone(o);o.taxExempt=true}
  const J=window.jspdf;
  if(!J||!J.jsPDF){toast('The PDF tool didn\u2019t load. Reload Print Counter and try again.');return}
  const doc=new J.jsPDF({unit:'pt',format:'letter'});
  if(typeof doc.autoTable!=='function'){toast('The PDF tool didn\u2019t fully load. Reload the page and try again.');return}
  const F=pdfFont(doc);
  const S=state.settings, c=o.customer||{}, t=totals(o), isQ=kind==='quote';
  const W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight(), M=50, CW=W-2*M;
  const TEAL=[0,156,189], INK=[21,32,36], GRAY=[92,106,112], RULE=[221,228,231], ZEBRA=[244,248,249];
  const today=new Date();
  const d=(x,o2)=>x.toLocaleDateString('en-US',o2||{month:'short',day:'numeric',year:'numeric'});
  const need=(h)=>{if(y+h>H-70){doc.addPage();y=M}};

  /* header: store (left) */
  doc.setFont(F,'bold');doc.setFontSize(18);doc.setTextColor(...TEAL);
  const nameL=doc.splitTextToSize(S.storeName||'',CW*0.56);
  doc.text(nameL,M,M+12);
  let yL=M+12+(nameL.length-1)*21+17;
  doc.setFont(F,'normal');doc.setFontSize(9.5);doc.setTextColor(...GRAY);
  [...(S.storeAddress||'').split('\n').map(x=>x.trim()).filter(Boolean),S.storePhone,S.storeEmail].filter(Boolean).forEach(line=>{
    const ls=doc.splitTextToSize(line,CW*0.56);doc.text(ls,M,yL);yL+=ls.length*13;
  });

  /* header: document title + meta (right) */
  doc.setFont(F,'bold');doc.setFontSize(24);doc.setTextColor(...INK);
  doc.text(isQ?'QUOTE':'INVOICE',W-M,M+14,{align:'right'});
  const valid=new Date(today);valid.setDate(valid.getDate()+S.quoteDays);
  const meta=isQ
    ?[['Quote #','Q-'+o.num],['Date',d(today)],['Order date',d(parseDue(orderDateOf(o))||today)],['Valid until',d(valid)]]
    :[['Invoice #',String(o.num)],['Date',d(today)],['Order date',d(parseDue(orderDateOf(o))||today)],['Terms',o.paid?'Paid':(S.invoiceTerms||'Due on receipt')]];
  if(o.due&&!o.archived) meta.push(['Needed by',d(parseDue(o.due))]);
  let yR=M+40;doc.setFontSize(9.5);
  meta.forEach(([k,v])=>{
    doc.setFont(F,'normal');doc.setTextColor(...GRAY);doc.text(k,W-M-150,yR);
    doc.setFont(F,'bold');doc.setTextColor(...INK);doc.text(doc.splitTextToSize(v,140)[0],W-M,yR,{align:'right'});
    yR+=15;
  });
  let y=Math.max(yL,yR)+8;
  doc.setDrawColor(...TEAL);doc.setLineWidth(1.5);doc.line(M,y,W-M,y);y+=26;

  /* bill to / prepared for */
  const yTop=y;
  doc.setFont(F,'bold');doc.setFontSize(9);doc.setTextColor(...GRAY);
  doc.text(isQ?'Prepared for':'Bill to',M,y);y+=16;
  doc.setFontSize(12.5);doc.setTextColor(...INK);
  const cn=doc.splitTextToSize(c.name||'',CW*0.55);doc.text(cn,M,y);y+=cn.length*15;
  doc.setFont(F,'normal');doc.setFontSize(10);
  [c.company,c.phone,c.email].filter(Boolean).forEach(line=>{const ls=doc.splitTextToSize(line,CW*0.55);doc.text(ls,M,y);y+=ls.length*13.5});
  if(o.ship&&o.ship.on&&o.ship.address){
    y+=6;doc.setFont(F,'bold');doc.setFontSize(9);doc.setTextColor(...GRAY);doc.text('Ship to',M,y);y+=13;
    doc.setFont(F,'normal');doc.setFontSize(10);doc.setTextColor(...INK);
    String(o.ship.address).split('\n').map(x=>x.trim()).filter(Boolean).forEach(line=>{const ls=doc.splitTextToSize(line,CW*0.55);doc.text(ls,M,y);y+=ls.length*13.5});
  }

  /* status box (invoice) */
  if(!isQ){
    const bw=170,bh=54,bx=W-M-bw,by=yTop-8;
    if(o.paid){
      doc.setDrawColor(16,124,16);doc.setFillColor(232,245,232);doc.setLineWidth(1.2);doc.roundedRect(bx,by,bw,bh,5,5,'FD');
      doc.setFont(F,'bold');doc.setFontSize(18);doc.setTextColor(16,124,16);doc.text('PAID',bx+bw/2,by+33,{align:'center'});
    }else{
      doc.setFillColor(...TEAL);doc.roundedRect(bx,by,bw,bh,5,5,'F');
      doc.setFont(F,'normal');doc.setFontSize(9);doc.setTextColor(255,255,255);doc.text('Balance due',bx+14,by+19);
      doc.setFont(F,'bold');doc.setFontSize(17);doc.text(money(amountDue(o,t)),bx+14,by+40);
    }
    y=Math.max(y,by+bh+6);
  }
  y+=16;

  /* line items */
  const lines=(o.lines||[]).filter(l=>l.desc);
  doc.autoTable({
    startY:y, margin:{left:M,right:M,top:M,bottom:70}, tableWidth:CW,
    head:[['Description','Qty','Unit price','Amount']],
    body:lines.map(l=>[l.desc+(specSummary(l)?'\n'+specSummary(l):''),fmtQty(l.qty)+(l.unit&&l.unit!=='each'?' '+l.unit:''),money(l.price),money((Number(l.qty)||0)*(Number(l.price)||0))]),
    theme:'plain',
    styles:{font:F,fontSize:10,textColor:INK,cellPadding:{top:9,bottom:9,left:10,right:10},overflow:'linebreak',valign:'top',lineColor:RULE,lineWidth:{bottom:0.75}},
    headStyles:{fillColor:TEAL,textColor:[255,255,255],fontStyle:'bold',lineWidth:0},
    alternateRowStyles:{fillColor:ZEBRA},
    columnStyles:{0:{cellWidth:'auto'},1:{cellWidth:68,halign:'right'},2:{cellWidth:80,halign:'right'},3:{cellWidth:86,halign:'right',fontStyle:'bold'}},
    didParseCell:h=>{if(h.section==='head'&&h.column.index>0)h.cell.styles.halign='right'}
  });
  y=doc.lastAutoTable.finalY+18;

  /* totals */
  const rows=breakdown(t).map(([k,v])=>[k,money(v)]);
  need(rows.length*18+60);
  const lx=W-M-230, rx=W-M-10;
  doc.setFontSize(10);
  rows.forEach(([k,v])=>{doc.setFont(F,'normal');doc.setTextColor(...GRAY);doc.text(k,lx,y);doc.setTextColor(...INK);doc.text(v,rx,y,{align:'right'});y+=18});
  doc.setDrawColor(...RULE);doc.setLineWidth(0.75);doc.line(lx,y-8,W-M,y-8);y+=8;
  doc.setFont(F,'bold');doc.setFontSize(13);doc.setTextColor(...INK);
  doc.text(isQ?'Quote total':'Total',lx,y);doc.text(money(t.total),rx,y,{align:'right'});y+=20;
  if(!isQ){
    doc.setFontSize(10);doc.setFont(F,'normal');doc.setTextColor(...GRAY);
    doc.text(o.paid?'Amount paid':'Deposit paid',lx,y);doc.setTextColor(...INK);doc.text(money(o.paid?t.total:num0(o.deposit)),rx,y,{align:'right'});y+=18;
    doc.setFont(F,'bold');doc.text('Balance due',lx,y);doc.text(money(amountDue(o,t)),rx,y,{align:'right'});y+=18;
  }
  y+=14;

  /* notes and terms */
  const para=(title,text)=>{
    if(!text) return;
    doc.setFontSize(10);const ls=doc.splitTextToSize(text,CW);
    need(30+Math.min(ls.length,4)*13);
    doc.setFont(F,'bold');doc.setFontSize(9);doc.setTextColor(...GRAY);doc.text(title,M,y);y+=15;
    doc.setFont(F,'normal');doc.setFontSize(10);doc.setTextColor(...INK);
    ls.forEach(line=>{need(13);doc.text(line,M,y);y+=13.5});
    y+=12;
  };
  para('Notes',o.notes);
  if(isQ) para('Terms',`This quote is valid until ${d(valid)}. Prices include ${t.exempt?'no sales tax (tax exempt)':'sales tax at '+pct(t.rate)}${t.postage>0?'; postage is not taxed':''}. Work begins once the quote is approved.`);
  else if(!o.paid) para('Payment',`${S.invoiceTerms||'Due on receipt'}. Please reference invoice #${o.num} with your payment.`);

  /* footer on every page */
  const pages=doc.getNumberOfPages();
  for(let i=1;i<=pages;i++){
    doc.setPage(i);
    doc.setDrawColor(...RULE);doc.setLineWidth(0.75);doc.line(M,H-50,W-M,H-50);
    doc.setFont(F,'normal');doc.setFontSize(9);doc.setTextColor(...GRAY);
    if(S.footerNote) doc.text(doc.splitTextToSize(S.footerNote,CW-80)[0],M,H-34);
    doc.text(`Page ${i} of ${pages}`,W-M,H-34,{align:'right'});
  }

  const fname=`${isQ?'Quote Q-':'Invoice '}${o.num} ${safeFile(c.company||c.name)}.pdf`.replace(/\s+\.pdf$/,'.pdf');
  const blob=doc.output('blob');
  const res=await saveFile(fname,blob,'application/pdf');
  if(res==='failed') toast('The PDF couldn\u2019t be saved here.');
  if(res!=='saved') return;
  toast(`${isQ?'Quote':'Invoice'} #${o.num} saved as PDF`);
  /* remember when it was made */
  const field=isQ?'quotedAt':'invoicedAt', when=nowIso();
  const cur=state.orders.find(x=>x.id===o.id)||(state.archived||[]).find(x=>x.id===o.id);
  if(cur){
    const u=clone(cur);u[field]=when;
    try{await saveOrder(u);upsertArchived(u)}catch(e){}
    if(drawerOpen&&draft&&draft.id===o.id){const orig=JSON.parse(draftOrig);orig[field]=when;draftOrig=JSON.stringify(orig);draft[field]=when}
  }
}

/* ---------- dialog & toasts ---------- */
function confirmDlg({title,body,ok='OK',danger=false,alt=null}){
  return new Promise(res=>{
    const dlg=$('#dlg'), okB=$('#dlgOk'), cB=$('#dlgCancel'), aB=$('#dlgAlt'), prev=document.activeElement;
    $('#dlgTitle').textContent=title; $('#dlgBody').textContent=body; okB.textContent=ok;
    okB.className='btn '+(danger?'btn-danger':'btn-primary');
    aB.hidden=!alt; aB.textContent=alt||'';
    dlg.classList.add('on'); (alt?okB:cB).focus();
    const done=v=>{dlg.classList.remove('on');okB.onclick=cB.onclick=aB.onclick=null;document.removeEventListener('keydown',key,true);if(prev&&prev.focus)prev.focus();res(v)};
    const key=e=>{if(e.key==='Escape'){e.stopPropagation();done(false)}};
    okB.onclick=()=>done(true); cB.onclick=()=>done(false); aB.onclick=()=>done('alt');
    document.addEventListener('keydown',key,true);
  });
}
function toast(msg,action){
  const box=$('#toasts'), t=document.createElement('div'); t.className='toast';
  const span=document.createElement('span'); span.textContent=msg; t.appendChild(span);
  if(action){const b=document.createElement('button');b.textContent=action.label;b.onclick=()=>{t.remove();action.fn()};t.appendChild(b)}
  box.appendChild(t); while(box.children.length>3) box.firstChild.remove();
  setTimeout(()=>t.remove(),action?6000:3200);
}

/* refresh due-date badges every minute */
setInterval(()=>{if(state.view==='board'&&!drawerOpen)renderBoard()},60000);

/* ---------- appearance (per computer) ---------- */
const LS_APP='pc_appearance';
const darkMQ=window.matchMedia?matchMedia('(prefers-color-scheme: dark)'):null;
function getApp(){return Object.assign({theme:'system',look:'fluent'},lsGet(LS_APP,{})||{})}
function isDark(a){a=a||getApp();return a.theme==='dark'||(a.theme==='system'&&!!(darkMQ&&darkMQ.matches))}
function applyApp(){
  const a=getApp(), r=document.documentElement;
  if(a.theme==='light'||a.theme==='dark') r.setAttribute('data-theme',a.theme); else r.removeAttribute('data-theme');
  if(a.look&&a.look!=='fluent') r.setAttribute('data-look',a.look); else r.removeAttribute('data-look');
  if(a.look==='counter'||a.look==='ticket') r.setAttribute('data-nav','top'); else r.removeAttribute('data-nav');
  r.setAttribute('data-mode',isDark(a)?'dark':'light');
  $$('#themeChoice button').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.themeOpt===a.theme)));
  $$('#lookChoice .look').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.lookOpt===a.look)));
  const dark=isDark(a), tb=$('#themeBtn');
  tb.classList.toggle('to-dark',!dark);
  $('#themeBtnLbl').textContent=dark?'Light mode':'Dark mode';
  tb.title=dark?'Switch to light mode':'Switch to dark mode';
}
function setApp(p){lsSet(LS_APP,Object.assign(getApp(),p));applyApp()}
$('#themeBtn').addEventListener('click',()=>setApp({theme:isDark()?'light':'dark'}));
$('#themeChoice').addEventListener('click',e=>{const b=e.target.closest('[data-theme-opt]');if(b)setApp({theme:b.dataset.themeOpt})});
$('#lookChoice').addEventListener('click',e=>{const b=e.target.closest('[data-look-opt]');if(b)setApp({look:b.dataset.lookOpt})});
if(darkMQ){try{darkMQ.addEventListener('change',applyApp)}catch(e){darkMQ.addListener&&darkMQ.addListener(applyApp)}}
applyApp();

renderFilters();
connect().then(()=>ensureArchived());
})();
