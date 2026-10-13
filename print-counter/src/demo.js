/* Demo build only (dist/Print-Counter-Demo.html): loads sample orders the first time the page opens,
   so the board isn't empty when presenting, and shows a bar to clear them. Runs before the app. */
(function(){
'use strict';
window.PC_DEMO=true;
const KEY='pc_state_v2', CLEARED='pc_demo_cleared';
function get(k){try{return localStorage.getItem(k)}catch(e){return null}}
function set(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}

const now=new Date();
const iso=d=>new Date(now.getTime()-d*864e5).toISOString();
const day=d=>{const t=new Date(now.getTime()-d*864e5);return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0')};
const L=(itemId,desc,unit,qty,price,extra)=>Object.assign({itemId,desc,unit,qty,price},extra||{});
const C=(first,last,company,phone,email)=>({first,last,name:first+' '+last,company,phone,email});
let n=0;
const O=(num,customer,lines,stage,age,extra)=>Object.assign({
  id:'ord-demo'+(++n),num,customer,lines,notes:'',orderDate:day(age),due:'',stage,
  paid:false,invoice:false,taxExempt:false,taxRate:0.07,archived:false,closedAt:null,
  createdAt:iso(age),updatedAt:iso(0),stageAt:iso(Math.min(age,2))
},extra||{});

function seed(){
  const items=[
    {id:'it-bw',name:'B&W copies',unit:'page',price:0.15},{id:'it-color',name:'Color copies',unit:'page',price:0.65},
    {id:'it-banner',name:'Banner',unit:'each',price:45},{id:'it-inv',name:'Invitations',unit:'each',price:2.5},
    {id:'it-bc',name:'Business cards (250)',unit:'box',price:35},{id:'it-lam',name:'Lamination',unit:'sheet',price:3},
    {id:'it-bind',name:'Binding',unit:'each',price:5},{id:'it-vinyl',name:'Vinyl banner',unit:'sq ft',price:8},
    {id:'it-yard',name:'Yard sign 18x24',unit:'each',price:18}
  ];
  const settings={storeName:'Demo Print Shop',taxRate:0.07,nextNum:1010,
    storeAddress:'100 Main St\nSpartanburg, SC 29301',storePhone:'(864) 555-0100',storeEmail:'prints@example.com',
    quoteDays:30,invoiceTerms:'Due on receipt',footerNote:'Thank you for your business!',unclaimedDays:30,
    locations:['ABC Folders','Back Shelf','Production Table','Wide Format Roll Box','Foamboard/Yard Sign'],
    feeTypes:['Cutting','Folding','Hole Punching','Padding','Rounding Corners','Stapling','Stuffing/Stamping'],
    papers:['20# Bond','24# Bond','28# Bond','60# Text','70# Text','80# Text','100# Text','65# Cover','80# Cover','100# Cover','110# Cover','80# Gloss Text','100# Gloss Cover','2prt NCR','3prt NCR','4prt NCR','Label Stock','Vinyl','Coroplast','Foamboard'],
    associates:['ER','JT'],items};
  const orders=[
    O(1001,C('Maria','de la Cruz','Gomez Realty','864-555-0142','maria@example.com'),
      [L('it-banner','Banner','each',2,45),L('it-bc','Business cards (250)','box',3,35)],'production',3,
      {due:day(-2),location:'Production Table',fees:{rush:25,design:0,setup:0,additional:10,additionalType:'Cutting'},
       discountPct:10,discountAmt:5,postage:12.5,notes:'Match logo color to PMS 3135. Rush for open house Saturday.'}),
    O(1002,C('Alan','Pierce','Harbor Dental','864-555-0199','office@example.com'),
      [L('it-bc','Patient forms, 2-part carbonless','box',1,26,{spec:{artwork:'Artwork on File',setOf:true,setQty:100,size:'8.5x5.5',color:'1/0',paper:'2prt NCR',fin:{cutting:true,chipboard:true},bookletType:'Padding',numbering:true,numStart:'1001',numEnd:'1100'}}),
       L('it-banner','Banner','each',2,20)],'new',0,{deposit:10,associate:'ER',due:day(-5)}),
    O(1003,C('Westside','Baptist','Youth Ministry','864-555-0150',''),
      [L('it-vinyl','Vinyl banner (3 × 6 ft, 2 pcs)','sq ft',36,8,{dims:{w:3,h:6,u:'ft',copies:2,round:false}})],
      'quoting',4,{invoice:true,taxExempt:true,due:day(-9),notes:'Waiting on final wording from the pastor.'}),
    O(1004,C('Tom','Reyes','','864-555-0122',''),[L('','Poster 24 × 36','each',3,22)],'complete',5,
      {paid:true,readyAt:iso(3),stageAt:iso(3),location:'Wide Format Roll Box'}),
    O(1005,C('Dana','Whitfield','Whitfield Law','864-555-0111','dana@example.com'),
      [L('it-color','Color copies','page',400,0.65),L('it-bind','Binding','each',8,5)],'followup',44,
      {readyAt:iso(41),stageAt:iso(41),location:'ABC Folders',lastContactAt:iso(10),contactCount:1}),
    O(1006,C('Maria','de la Cruz','Gomez Realty','(864) 555-0142','maria@example.com'),
      [L('it-bc','Business cards (250)','box',1,35)],'complete',20,
      {paid:true,archived:true,pickedUp:true,closedAt:iso(15),closeMethod:'picked',location:'Picked Up By Customer',prevLocation:'Back Shelf',readyAt:iso(17)}),
    O(1007,C('Priya','Shah','','864-555-0168','priya@example.com'),
      [L('it-inv','Wedding invitations 5x7','each',120,2.5,{spec:{artwork:'Designed Artwork',size:'5x7',color:'4/0',paper:'100# Cover'}})],
      'preprod',2,{due:day(-6),fees:{rush:0,design:35,setup:0,additional:0,additionalType:'None'},notes:'Proof emailed. Approve before printing.'}),
    O(1008,C('Coach','Miller','Dorman High Athletics','864-555-0133',''),
      [L('it-yard','Yard sign 18x24','each',25,18)],'followup',8,
      {invoice:true,readyAt:iso(6),stageAt:iso(6),location:'Foamboard/Yard Sign'}),
    O(1009,C('Jordan','Lee','','864-555-0187',''),[L('it-bw','B&W copies','page',250,0.15)],'new',0,
      {due:day(0),paid:true})
  ];
  return {settings,orders};
}

if(!get(KEY)&&!get(CLEARED)){ set(KEY,JSON.stringify(seed())); set('pc_last_backup',JSON.stringify(iso(0))); }

function bar(){
  if(get(CLEARED)) return;
  const v=document.getElementById('view-board'); if(!v) return;
  const b=document.createElement('div'); b.className='demo-bar';
  const t=document.createElement('span'); t.textContent='Demo: these are sample orders. Changes stay in this browser only.';
  const btn=document.createElement('button'); btn.className='btn'; btn.type='button'; btn.textContent='Clear sample orders';
  btn.onclick=()=>{try{localStorage.removeItem(KEY)}catch(e){} set(CLEARED,'1'); location.reload()};
  b.append(t,btn); v.insertBefore(b,v.firstChild);
}
bar();
})();
