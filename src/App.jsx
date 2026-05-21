import { useState, useEffect, useRef, useCallback } from "react";

const BOSS_PASSWORD = "198742";
const STATUSES = [
  { key: "queue",      label: "QUEUE",       color: "#FF6B00", dim: "#2a1400" },
  { key: "inprogress", label: "IN PROGRESS", color: "#00C2FF", dim: "#002433" },
  { key: "review",     label: "REVIEW",      color: "#FFD600", dim: "#2a2500" },
  { key: "done",       label: "DONE",        color: "#00FF94", dim: "#003320" },
];
const PRIORITIES = [
  { key: "urgent", label: "URGENT", color: "#FF3B3B" },
  { key: "normal", label: "NORMAL", color: "#FF6B00" },
  { key: "low",    label: "LOW",    color: "#444" },
];
const TEAM = ["Otto", "Smallbrush"];
const SHOE_SIZES = ["เล็ก", "กลาง", "ใหญ่"];
const SHOE_TYPES = ["Nike Air Force 1", "Vans Old Skool", "Converse Chuck 70", "New Balance 574", "Jordan 1", "Adidas Stan Smith", "อื่นๆ"];
const DAY_TYPES = [
  { key: "production", label: "PRODUCTION DAY", short: "PROD", color: "#FF6B00" },
  { key: "content",    label: "CONTENT DAY",    short: "CNT",  color: "#00C2FF" },
  { key: "design",     label: "DESIGN DAY",     short: "DSN",  color: "#FFD600" },
];
const KPI_TARGET = {
  production: { small: 1.5, medium: 1, large: 0.25, footage: 2 },
  content:    { posts: 1, footage: 3, photos: 1, reels: 3 },
  design:     { designs: 4 },
};
const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const DA_TH = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const DEFAULT_ALLOC = [
  { key: "reserve",   label: "ทุนหมุนเวียน/สำรอง",  pct: 30, color: "#FF6B00", tip: "ค่าวัตถุดิบ, อุปกรณ์, ฉุกเฉิน" },
  { key: "equipment", label: "ซื้ออุปกรณ์/Stock",    pct: 20, color: "#00C2FF", tip: "ลงทุนในเครื่องมือและสินค้า" },
  { key: "marketing", label: "การตลาด/โฆษณา",        pct: 15, color: "#FFD600", tip: "ยิงโฆษณา, ค่า content, คอลแลป" },
  { key: "salary",    label: "เงินเดือนเจ้าของ",     pct: 20, color: "#FF3B3B", tip: "จ่ายตัวเองสม่ำเสมอ อย่าเอาทั้งหมด" },
  { key: "growth",    label: "กำไรสะสม/ขยายธุรกิจ", pct: 15, color: "#00FF94", tip: "เก็บออม ขยายสาขา หรือ invest" },
];
const DEFAULT_EXP_CATS = ["ค่าเช่า","ค่าพนักงาน","น้ำ-ไฟ","อุปกรณ์","ค่าโฆษณา","อื่นๆ/ฟุ่มเฟือย"];
const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`;

const SAMPLE_ORDERS = [
  { id:1, customer:"คุณมิน", ig:"@minsneaker", model:"Nike Air Force 1", size:"กลาง", deadline:"2026-05-28", priority:"urgent", assignee:"ช่างอ้วน", status:"inprogress", note:"ลาย Floral สีพาสเทล", created:Date.now()-86400000, images:[], designImages:[], price:2500, deposit:1000, depositPaid:true, fullPaid:false },
  { id:2, customer:"คุณบิ๊ก", ig:"@bigcustom", model:"Vans Old Skool", size:"เล็ก", deadline:"2026-06-01", priority:"normal", assignee:"ช่างเอก", status:"queue", note:"โทนดำ-ทอง", created:Date.now()-43200000, images:[], designImages:[], price:1800, deposit:500, depositPaid:true, fullPaid:false },
  { id:3, customer:"คุณพลอย", ig:"@ploystyle", model:"Converse Chuck 70", size:"ใหญ่", deadline:"2026-06-05", priority:"low", assignee:"ช่างนุ้ย", status:"done", note:"ลาย One Piece", created:Date.now()-172800000, images:[], designImages:[], price:3500, deposit:1500, depositPaid:true, fullPaid:true },
];

function loadData(k,fb){ try{ const s=localStorage.getItem(k); return s?JSON.parse(s):fb; }catch{ return fb; } }
function saveData(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} }
function daysLeft(d){ return Math.ceil((new Date(d)-new Date())/86400000); }
function toDataURL(file){ return new Promise(res=>{ const r=new FileReader(); r.onload=e=>res(e.target.result); r.readAsDataURL(file); }); }
function fmt(n){ return Number(n||0).toLocaleString("th-TH"); }
function todayKey(){ return new Date().toISOString().slice(0,10); }
function monthKey(y,m){ return `${y}-${String(m+1).padStart(2,"0")}`; }
function orderMonth(o){ return o.created?new Date(o.created).toISOString().slice(0,7):""; }
function calUrl(o){ const s=o.deadline.replace(/-/g,""); return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`[CUSTOMIT] ${o.customer} — ${o.model}`)}&dates=${s}/${s}&details=${encodeURIComponent(`ช่าง: ${o.assignee}\nโน้ต: ${o.note}`)}`; }
function kpiPass(e){
  if(!e) return false;
  const dt=e.dayType;
  if(dt==="production"){ const t=KPI_TARGET.production,p=e.production||{}; return (p.small>=t.small||p.medium>=t.medium||p.large>=t.large)&&p.footage>=t.footage; }
  if(dt==="content"){ const t=KPI_TARGET.content,c=e.content||{}; return c.posts>=t.posts&&c.footage>=t.footage&&c.reels>=t.reels; }
  if(dt==="design"){ return (e.design?.designs||0)>=KPI_TARGET.design.designs; }
  return false;
}

const S={
  inp:{ background:"#0d0d0d", color:"#f5f5f5", border:"1px solid #222", borderRadius:8, padding:"8px 12px", fontSize:13, width:"100%", boxSizing:"border-box", fontFamily:"'Barlow Condensed', sans-serif", letterSpacing:1, outline:"none" },
  lbl:{ fontSize:9, letterSpacing:3, color:"#444", fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, display:"block", marginBottom:5 },
  card:{ background:"#0d0d0d", border:"1px solid #181818", borderRadius:12, padding:14, marginBottom:12 },
  sec:(c)=>({ fontSize:10, letterSpacing:3, color:c, fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, marginBottom:10 }),
};
function Pill({color,children}){ return <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:9,letterSpacing:2,color,background:color+"20",borderRadius:4,padding:"2px 7px",display:"inline-block"}}>{children}</span>; }
function Bar({pct,color}){ return <div style={{height:4,background:"#1a1a1a",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,pct)}%`,background:color,borderRadius:2,transition:"width 0.4s"}}/></div>; }

function ImageUploader({images,onChange,label,accent}){
  const ref=useRef();
  const drop=useCallback(async(files)=>{ const news=await Promise.all([...files].filter(f=>f.type.startsWith("image/")).map(toDataURL)); onChange([...(images||[]),...news]); },[images,onChange]);
  return(
    <div>
      <div style={{...S.lbl,color:accent}}>{label}</div>
      <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();drop(e.dataTransfer.files);}} onClick={()=>ref.current.click()}
        style={{border:`1px dashed ${accent}44`,borderRadius:8,padding:8,cursor:"pointer",minHeight:52,display:"flex",flexWrap:"wrap",gap:6,alignItems:"center",background:"#080808"}}>
        {(!images||images.length===0)&&<span style={{color:"#2a2a2a",fontSize:11,fontFamily:"'Barlow Condensed', sans-serif"}}>DROP / TAP</span>}
        {(images||[]).map((src,i)=>(
          <div key={i} style={{position:"relative"}}>
            <img src={src} alt="" style={{width:52,height:52,objectFit:"cover",borderRadius:6,border:`1px solid ${accent}33`}}/>
            <button onClick={e=>{e.stopPropagation();onChange((images||[]).filter((_,j)=>j!==i));}} style={{position:"absolute",top:-5,right:-5,background:"#FF3B3B",border:"none",borderRadius:"50%",width:16,height:16,color:"#fff",fontSize:9,cursor:"pointer"}}>✕</button>
          </div>
        ))}
        {images&&images.length>0&&<span style={{color:"#333",fontSize:18}}>+</span>}
      </div>
      <input ref={ref} type="file" multiple accept="image/*" style={{display:"none"}} onChange={e=>drop(e.target.files)}/>
    </div>
  );
}

function OrderCard({order,onUpdate,onDelete,isBoss}){
  const [open,setOpen]=useState(false);
  const [lightbox,setLightbox]=useState(null);
  const st=STATUSES.find(s=>s.key===order.status);
  const pr=PRIORITIES.find(p=>p.key===order.priority);
  const dl=daysLeft(order.deadline);
  const isOverdue=dl<0,isNear=!isOverdue&&dl<=2;
  const remaining=(order.price||0)-(order.deposit||0);
  const nextSt=()=>{ const i=STATUSES.findIndex(s=>s.key===order.status); if(i<STATUSES.length-1)onUpdate({...order,status:STATUSES[i+1].key}); };
  const prevSt=()=>{ const i=STATUSES.findIndex(s=>s.key===order.status); if(i>0)onUpdate({...order,status:STATUSES[i-1].key}); };
  return(
    <>
      {lightbox&&<div onClick={()=>setLightbox(null)} style={{position:"fixed",inset:0,background:"#000000ee",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}><img src={lightbox} alt="" style={{maxWidth:"90vw",maxHeight:"90vh",borderRadius:8}}/></div>}
      <div style={{background:"#0d0d0d",border:`1px solid ${open?st.color+"55":"#181818"}`,borderLeft:`3px solid ${st.color}`,borderRadius:12,marginBottom:8,overflow:"hidden",transition:"all 0.2s"}}>
        <div onClick={()=>setOpen(o=>!o)} style={{padding:"12px 14px",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start"}}>
          <div style={{width:46,height:46,flexShrink:0,borderRadius:8,background:"#111",border:"1px solid #1e1e1e",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {order.images?.[0]?<img src={order.images[0]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:20}}>👟</span>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:16,color:"#f0f0f0"}}>{order.customer}</div>
                {order.ig&&<div style={{fontSize:10,color:"#333"}}>{order.ig}</div>}
              </div>
              <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
                <Pill color={st.color}>{st.label}</Pill>
                <div style={{fontSize:10,marginTop:3,color:isOverdue?"#FF3B3B":isNear?"#FFD600":"#333",fontWeight:700}}>{isOverdue?`⚠ เกิน ${Math.abs(dl)}d`:`${dl}d`}</div>
              </div>
            </div>
            <div style={{marginTop:5,display:"flex",gap:5,flexWrap:"wrap"}}>
              <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:11,color:"#444"}}>{order.model}</span>
              {order.size&&<Pill color="#555">{order.size}</Pill>}
              <Pill color={pr.color}>{pr.label}</Pill>
              {isBoss&&remaining>0&&!order.fullPaid&&<Pill color="#FF3B3B">ค้าง ฿{fmt(remaining)}</Pill>}
              {isBoss&&order.fullPaid&&<Pill color="#00FF94">ชำระครบ</Pill>}
            </div>
          </div>
        </div>
        {open&&(
          <div onClick={e=>e.stopPropagation()} style={{borderTop:"1px solid #181818",padding:"12px 14px"}}>
            {[...(order.images||[]),(order.designImages||[])].flat().length>0&&(
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                {(order.images||[]).map((src,i)=><div key={"s"+i} style={{position:"relative"}}><img onClick={()=>setLightbox(src)} src={src} alt="" style={{width:62,height:62,objectFit:"cover",borderRadius:6,cursor:"zoom-in",border:"1px solid #1e1e1e"}}/><div style={{position:"absolute",bottom:2,left:2,background:"#000b",borderRadius:2,padding:"1px 4px",fontSize:7,color:"#FF6B00",fontFamily:"'Barlow Condensed', sans-serif"}}>SHOE</div></div>)}
                {(order.designImages||[]).map((src,i)=><div key={"d"+i} style={{position:"relative"}}><img onClick={()=>setLightbox(src)} src={src} alt="" style={{width:62,height:62,objectFit:"cover",borderRadius:6,cursor:"zoom-in",border:"1px solid #1e1e1e"}}/><div style={{position:"absolute",bottom:2,left:2,background:"#000b",borderRadius:2,padding:"1px 4px",fontSize:7,color:"#00C2FF",fontFamily:"'Barlow Condensed', sans-serif"}}>DESIGN</div></div>)}
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <ImageUploader label="📸 รูปรองเท้า" accent="#FF6B00" images={order.images||[]} onChange={v=>onUpdate({...order,images:v})}/>
              <ImageUploader label="🎨 ดีไซน์ ref" accent="#00C2FF" images={order.designImages||[]} onChange={v=>onUpdate({...order,designImages:v})}/>
            </div>
            {isBoss&&(
              <div style={{background:"#080808",border:"1px solid #FF6B0022",borderRadius:8,padding:"10px 12px",marginBottom:12}}>
                <div style={S.sec("#FF6B00")}>💰 FINANCE</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                  <div><label style={S.lbl}>ราคาเต็ม (฿)</label><input type="number" style={S.inp} value={order.price||""} onChange={e=>onUpdate({...order,price:Number(e.target.value)})} placeholder="0"/></div>
                  <div><label style={S.lbl}>มัดจำ (฿)</label><input type="number" style={S.inp} value={order.deposit||""} onChange={e=>onUpdate({...order,deposit:Number(e.target.value)})} placeholder="0"/></div>
                  <div><label style={S.lbl}>ยอดค้าง</label><div style={{background:"#0d0d0d",border:"1px solid #222",borderRadius:8,padding:"8px 12px",fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,color:remaining>0?"#FF3B3B":"#00FF94",fontSize:13}}>฿{fmt(remaining>0?remaining:0)}</div></div>
                </div>
                <div style={{display:"flex",gap:14}}>
                  <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#666",fontFamily:"'Barlow Condensed', sans-serif"}}><input type="checkbox" checked={!!order.depositPaid} onChange={e=>onUpdate({...order,depositPaid:e.target.checked})} style={{accentColor:"#FF6B00"}}/>รับมัดจำแล้ว</label>
                  <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#666",fontFamily:"'Barlow Condensed', sans-serif"}}><input type="checkbox" checked={!!order.fullPaid} onChange={e=>onUpdate({...order,fullPaid:e.target.checked})} style={{accentColor:"#00FF94"}}/>ชำระครบแล้ว</label>
                </div>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div><label style={S.lbl}>ASSIGNEE</label><select style={S.inp} value={order.assignee} onChange={e=>onUpdate({...order,assignee:e.target.value})}>{TEAM.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={S.lbl}>PRIORITY</label><select style={S.inp} value={order.priority} onChange={e=>onUpdate({...order,priority:e.target.value})}>{PRIORITIES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
            </div>
            {order.note&&<div style={{marginBottom:10,padding:"8px 10px",background:"#080808",borderRadius:6,borderLeft:"2px solid #1e1e1e"}}><div style={{fontSize:9,letterSpacing:2,color:"#2a2a2a",fontFamily:"'Barlow Condensed', sans-serif",marginBottom:2}}>NOTE</div><div style={{fontSize:12,color:"#666"}}>{order.note}</div></div>}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {order.status!=="queue"&&<button onClick={prevSt} style={{flex:1,minWidth:60,background:"#111",color:"#555",border:"1px solid #1e1e1e",borderRadius:6,padding:"7px",fontSize:11,cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>← BACK</button>}
              {order.status!=="done"&&<button onClick={nextSt} style={{flex:2,minWidth:80,background:st.color,color:"#000",border:"none",borderRadius:6,padding:"7px",fontSize:11,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:900,letterSpacing:2,cursor:"pointer"}}>{order.status==="queue"?"START →":order.status==="inprogress"?"REVIEW →":"DONE ✓"}</button>}
              <a href={calUrl(order)} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",padding:"7px 10px",background:"#111",color:"#555",border:"1px solid #1e1e1e",borderRadius:6,fontSize:11,textDecoration:"none",fontFamily:"'Barlow Condensed', sans-serif"}}>📅</a>
              {isBoss&&<button onClick={()=>onDelete(order.id)} style={{padding:"7px 10px",background:"#1a0808",color:"#FF3B3B",border:"1px solid #FF3B3B33",borderRadius:6,fontSize:11,cursor:"pointer"}}>✕</button>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function AddModal({onClose,onAdd,nextId,isBoss}){
  const blank={customer:"",ig:"",model:SHOE_TYPES[0],size:"กลาง",deadline:"",priority:"normal",assignee:TEAM[0],note:"",images:[],designImages:[],price:"",deposit:"",depositPaid:false,fullPaid:false};
  const [form,setForm]=useState(blank);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const ok=form.customer&&form.deadline;
  return(
    <div style={{position:"fixed",inset:0,background:"#000000d8",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#0d0d0d",border:"1px solid #222",borderTop:"3px solid #FF6B00",borderRadius:"16px 16px 0 0",padding:20,width:"100%",maxWidth:480,maxHeight:"94vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:900,fontSize:20,letterSpacing:4,color:"#FF6B00"}}>NEW ORDER</div><div style={{fontSize:9,color:"#333",letterSpacing:3,fontFamily:"'Barlow Condensed', sans-serif"}}>CUSTOMIT THAILAND</div></div>
          <button onClick={onClose} style={{background:"none",border:"1px solid #222",borderRadius:6,color:"#444",fontSize:14,cursor:"pointer",width:30,height:30}}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={S.lbl}>CUSTOMER *</label><input style={S.inp} value={form.customer} onChange={e=>set("customer",e.target.value)} placeholder="ชื่อลูกค้า"/></div>
            <div><label style={S.lbl}>INSTAGRAM</label><input style={S.inp} value={form.ig} onChange={e=>set("ig",e.target.value)} placeholder="@username"/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
            <div><label style={S.lbl}>SHOE MODEL</label><select style={S.inp} value={form.model} onChange={e=>set("model",e.target.value)}>{SHOE_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={S.lbl}>ขนาด</label><select style={S.inp} value={form.size} onChange={e=>set("size",e.target.value)}>{SHOE_SIZES.map(t=><option key={t}>{t}</option>)}</select></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <div><label style={S.lbl}>DEADLINE *</label><input type="date" style={S.inp} value={form.deadline} onChange={e=>set("deadline",e.target.value)}/></div>
            <div><label style={S.lbl}>PRIORITY</label><select style={S.inp} value={form.priority} onChange={e=>set("priority",e.target.value)}>{PRIORITIES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
            <div><label style={S.lbl}>ASSIGNEE</label><select style={S.inp} value={form.assignee} onChange={e=>set("assignee",e.target.value)}>{TEAM.map(t=><option key={t}>{t}</option>)}</select></div>
          </div>
          <div><label style={S.lbl}>DESIGN NOTE</label><textarea style={{...S.inp,resize:"vertical",minHeight:60}} value={form.note} onChange={e=>set("note",e.target.value)} placeholder="ลาย, สี, สไตล์..."/></div>
          {isBoss&&<div style={{background:"#080808",border:"1px solid #FF6B0022",borderRadius:8,padding:"10px 12px"}}>
            <div style={S.sec("#FF6B00")}>💰 FINANCE</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><label style={S.lbl}>ราคาเต็ม (฿)</label><input type="number" style={S.inp} value={form.price} onChange={e=>set("price",e.target.value)} placeholder="0"/></div>
              <div><label style={S.lbl}>มัดจำ (฿)</label><input type="number" style={S.inp} value={form.deposit} onChange={e=>set("deposit",e.target.value)} placeholder="0"/></div>
            </div>
          </div>}
          <ImageUploader label="📸 รูปรองเท้า" accent="#FF6B00" images={form.images} onChange={v=>set("images",v)}/>
          <ImageUploader label="🎨 ดีไซน์ reference" accent="#00C2FF" images={form.designImages} onChange={v=>set("designImages",v)}/>
        </div>
        <button onClick={()=>{ if(ok){ onAdd({...form,id:nextId,price:Number(form.price)||0,deposit:Number(form.deposit)||0,status:"queue",created:Date.now()}); onClose(); } }}
          style={{marginTop:16,width:"100%",background:ok?"#FF6B00":"#1a1a1a",color:ok?"#000":"#333",border:"none",borderRadius:8,padding:12,fontSize:13,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:900,letterSpacing:3,cursor:ok?"pointer":"default",transition:"all 0.2s"}}>
          + ADD TO QUEUE
        </button>
      </div>
    </div>
  );
}

/* ── CALENDAR ─────────────────────────────── */
function CalView({orders,workPlans}){
  const now=new Date();
  const [month,setMonth]=useState(now.getMonth());
  const [year,setYear]=useState(now.getFullYear());
  const [calTab,setCalTab]=useState("week");

  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const cells=Array(firstDay).fill(null).concat(Array.from({length:daysInMonth},(_,i)=>i+1));
  while(cells.length%7!==0)cells.push(null);
  const weeks=[]; for(let i=0;i<cells.length;i+=7)weeks.push(cells.slice(i,i+7));
  const byDay={};
  orders.forEach(o=>{ const d=new Date(o.deadline); if(d.getMonth()===month&&d.getFullYear()===year){ const k=d.getDate(); if(!byDay[k])byDay[k]=[]; byDay[k].push(o); } });

  // Week containing today
  const todayD=new Date();
  const ws=new Date(todayD); ws.setDate(todayD.getDate()-((todayD.getDay()+6)%7));
  const weekDays=Array.from({length:7},(_,i)=>{ const d=new Date(ws); d.setDate(ws.getDate()+i); return d; });

  const DA=["SUN","MON","TUE","WED","THU","FRI","SAT"];

  return(
    <div>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {[{k:"week",label:"📋 แผนสัปดาห์"},{k:"month",label:"📅 รายเดือน"}].map(t=>(
          <button key={t.k} onClick={()=>setCalTab(t.k)} style={{flex:1,padding:"8px",background:calTab===t.k?"#FF6B00":"#0d0d0d",color:calTab===t.k?"#000":"#444",border:`1px solid ${calTab===t.k?"#FF6B00":"#1e1e1e"}`,borderRadius:8,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:11,letterSpacing:2,cursor:"pointer"}}>{t.label}</button>
        ))}
      </div>

      {/* WEEK VIEW — default, team sees this */}
      {calTab==="week"&&(
        <div>
          <div style={{fontSize:10,color:"#333",fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:2,textAlign:"center",marginBottom:10}}>
            สัปดาห์ {weekDays[0].getDate()} – {weekDays[6].getDate()} {MONTHS_TH[weekDays[0].getMonth()]} {weekDays[0].getFullYear()}
          </div>
          {weekDays.map((wd)=>{
            const dk=wd.toISOString().slice(0,10);
            const dayPlan=workPlans?.[dk]||{};
            const isToday=dk===todayKey();
            const dayOrders=orders.filter(o=>o.deadline===dk);
            return(
              <div key={dk} style={{background:isToday?"#1c1000":"#0d0d0d",border:`1px solid ${isToday?"#FF6B0055":"#181818"}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div>
                    <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:15,color:isToday?"#FF6B00":"#f0f0f0"}}>{DA_TH[wd.getDay()]} {wd.getDate()} {MONTHS_TH[wd.getMonth()]}</span>
                    {isToday&&<span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:8,color:"#FF6B00",letterSpacing:2,marginLeft:6}}>TODAY</span>}
                  </div>
                  {dayOrders.length>0&&<span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,color:"#444"}}>📦 {dayOrders.length} deadline</span>}
                </div>
                {Object.keys(dayPlan).length===0
                  ?<div style={{fontSize:10,color:"#2a2a2a",fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>— ยังไม่มีแผน</div>
                  :TEAM.filter(m=>dayPlan[m]).map(m=>{
                    const dtObj=DAY_TYPES.find(d=>d.key===dayPlan[m]);
                    return(
                      <div key={m} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                        <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:11,color:"#888",minWidth:68}}>{m}</span>
                        <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:10,color:dtObj?.color,background:dtObj?.color+"18",border:`1px solid ${dtObj?.color}44`,borderRadius:4,padding:"2px 8px",letterSpacing:1}}>{dtObj?.label}</span>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      )}

      {/* MONTH VIEW */}
      {calTab==="month"&&(
        <>
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <button onClick={()=>{ if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }} style={{background:"#111",border:"1px solid #1e1e1e",color:"#555",borderRadius:6,padding:"4px 12px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>‹</button>
              <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:14,letterSpacing:3,color:"#f0f0f0"}}>{MONTHS_TH[month]} {year}</span>
              <button onClick={()=>{ if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }} style={{background:"#111",border:"1px solid #1e1e1e",color:"#555",borderRadius:6,padding:"4px 12px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>›</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>{DA.map(d=><div key={d} style={{textAlign:"center",fontSize:7,color:"#2a2a2a",fontFamily:"'Barlow Condensed', sans-serif"}}>{d}</div>)}</div>
            {weeks.map((wk,wi)=>(
              <div key={wi} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
                {wk.map((day,di)=>{
                  const ords=(day?byDay[day]:null)||[];
                  const isToday=day===now.getDate()&&month===now.getMonth()&&year===now.getFullYear();
                  const dk=day?`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`:null;
                  const planTypes=dk?[...new Set(Object.values(workPlans?.[dk]||{}))]:[];
                  return(
                    <div key={di} style={{minHeight:42,background:day?(isToday?"#1c1000":"#111"):"transparent",borderRadius:5,padding:"3px",border:isToday?"1px solid #FF6B0055":"1px solid transparent"}}>
                      {day&&<div style={{fontSize:8,color:isToday?"#FF6B00":"#333",fontFamily:"'Barlow Condensed', sans-serif",fontWeight:isToday?800:400}}>{day}</div>}
                      {ords.map((o,i)=>{ const st=STATUSES.find(s=>s.key===o.status); return <div key={"o"+i} style={{fontSize:6,background:st.color,color:"#000",borderRadius:2,padding:"1px 2px",marginTop:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800}}>{o.customer}</div>; })}
                      {planTypes.map((pt,i)=>{ const dt=DAY_TYPES.find(d=>d.key===pt); return dt?<div key={"p"+i} style={{fontSize:5,background:dt.color+"22",color:dt.color,borderRadius:2,padding:"1px 2px",marginTop:1,border:`1px solid ${dt.color}44`,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,letterSpacing:0.5}}>{dt.short}</div>:null; })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
            {DAY_TYPES.map(d=><div key={d.key} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:2,background:d.color+"33",border:`1px solid ${d.color}`}}/><span style={{fontSize:9,color:"#444",fontFamily:"'Barlow Condensed', sans-serif"}}>{d.label}</span></div>)}
          </div>
          {orders.filter(o=>o.status!=="done").sort((a,b)=>new Date(a.deadline)-new Date(b.deadline)).slice(0,5).map(o=>{
            const st=STATUSES.find(s=>s.key===o.status); const dl=daysLeft(o.deadline);
            return <div key={o.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#0d0d0d",borderRadius:8,marginBottom:6,borderLeft:`3px solid ${st.color}`}}>
              <div><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:13,color:"#f0f0f0"}}>{o.customer}</span><span style={{fontSize:10,color:"#333",marginLeft:8,fontFamily:"'Barlow Condensed', sans-serif"}}>{o.model}</span></div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <a href={calUrl(o)} target="_blank" rel="noreferrer" style={{fontSize:8,color:"#444",textDecoration:"none",fontFamily:"'Barlow Condensed', sans-serif",background:"#111",border:"1px solid #1e1e1e",borderRadius:3,padding:"2px 7px"}}>+G.CAL</a>
                <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:10,color:dl<0?"#FF3B3B":dl<=2?"#FFD600":"#333",fontWeight:700}}>{dl<0?"OVERDUE":`${dl}d`}</span>
              </div>
            </div>;
          })}
        </>
      )}
    </div>
  );
}

/* ── WORK PLANNER (Smallbrush only) ──────── */
function WorkPlanner({workPlans,setWorkPlans}){
  const now=new Date();
  // Show 2 weeks starting from Monday this week
  const ws=new Date(now); ws.setDate(now.getDate()-((now.getDay()+6)%7));
  const days=Array.from({length:14},(_,i)=>{ const d=new Date(ws); d.setDate(ws.getDate()+i); return d; });

  const set=(dk,member,dayType)=>{
    setWorkPlans(p=>{
      const cur=p[dk]||{};
      const updated=dayType?{...cur,[member]:dayType}:{...cur};
      if(!dayType) delete updated[member];
      return {...p,[dk]:updated};
    });
  };

  const applyAll=(dk,dayType)=>{ TEAM.forEach(m=>set(dk,m,dayType)); };

  return(
    <div>
      <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:10,color:"#444",letterSpacing:2,marginBottom:12}}>กำหนดว่าวันไหนช่างคนไหนทำหมวดอะไร — พนักงานจะเห็นแผนนี้ใน Calendar</div>
      {days.map(wd=>{
        const dk=wd.toISOString().slice(0,10);
        const dayPlan=workPlans[dk]||{};
        const isToday=dk===todayKey();
        const isPast=wd<new Date(new Date().setHours(0,0,0,0));
        const dow=["อา","จ","อ","พ","พฤ","ศ","ส"][wd.getDay()];
        return(
          <div key={dk} style={{background:isToday?"#1c1000":isPast?"#090909":"#0d0d0d",border:`1px solid ${isToday?"#FF6B0044":"#181818"}`,borderRadius:10,padding:"10px 12px",marginBottom:8,opacity:isPast?0.6:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:13,color:isToday?"#FF6B00":"#f0f0f0"}}>
                {dow} {wd.getDate()} {MONTHS_TH[wd.getMonth()]}
                {isToday&&<span style={{fontSize:8,color:"#FF6B00",letterSpacing:2,marginLeft:6}}>TODAY</span>}
              </div>
              {/* Quick assign all */}
              <div style={{display:"flex",gap:4}}>
                {DAY_TYPES.map(dt=>(
                  <button key={dt.key} onClick={()=>applyAll(dk,dt.key)} style={{fontSize:7,letterSpacing:1,background:dt.color+"18",color:dt.color,border:`1px solid ${dt.color}44`,borderRadius:4,padding:"2px 6px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700}}>{dt.short}</button>
                ))}
                <button onClick={()=>applyAll(dk,null)} style={{fontSize:7,background:"#1a1a1a",color:"#444",border:"1px solid #2a2a2a",borderRadius:4,padding:"2px 6px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>CLR</button>
              </div>
            </div>
            {TEAM.map(m=>{
              const cur=dayPlan[m];
              return(
                <div key={m} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                  <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:11,color:"#666",minWidth:68,flexShrink:0}}>{m}</span>
                  <div style={{display:"flex",gap:4,flex:1}}>
                    {DAY_TYPES.map(dt=>(
                      <button key={dt.key} onClick={()=>set(dk,m,cur===dt.key?null:dt.key)}
                        style={{flex:1,padding:"5px 2px",background:cur===dt.key?dt.color:"#111",color:cur===dt.key?"#000":"#333",border:`1px solid ${cur===dt.key?dt.color:"#1e1e1e"}`,borderRadius:6,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:8,letterSpacing:1,cursor:"pointer",transition:"all 0.15s"}}>
                        {dt.short}
                      </button>
                    ))}
                    {cur&&<button onClick={()=>set(dk,m,null)} style={{padding:"5px 6px",background:"#1a0808",color:"#444",border:"1px solid #2a1a1a",borderRadius:6,fontSize:9,cursor:"pointer"}}>✕</button>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ── KPI TRACKER ──────────────────────────── */
function KpiTracker({isBoss,workPlans}){
  const [logs,setLogs]=useState(()=>loadData("cit-kpi-logs",{}));
  const [selDate,setSelDate]=useState(todayKey());
  const [selMember,setSelMember]=useState(TEAM[0]);
  useEffect(()=>{ saveData("cit-kpi-logs",logs); },[logs]);

  // Assigned day type from work plan
  const assignedDayType=workPlans?.[selDate]?.[selMember]||null;

  const key=`${selDate}__${selMember}`;
  const entry=logs[key]||{ dayType:assignedDayType||"production", production:{}, content:{}, design:{}, note:"", bossComment:"" };
  const setEntry=u=>setLogs(l=>({...l,[key]:u}));
  const setField=(sec,fld,val)=>setEntry({...entry,[sec]:{...(entry[sec]||{}),[fld]:Number(val)||0}});

  // Effective day type: use assigned if set, else entry
  const dt=assignedDayType||entry.dayType;
  const passed=kpiPass({...entry,dayType:dt});

  const teamSummary=isBoss?TEAM.map(m=>{
    const e=logs[`${selDate}__${m}`];
    const assigned=workPlans?.[selDate]?.[m]||null;
    if(!e&&!assigned) return{m,logged:false,assigned:null};
    const eff=assigned||e?.dayType;
    return{m,logged:!!e,ok:e?kpiPass({...e,dayType:eff}):false,dayType:eff,assigned};
  }):[];

  const numRow=(sec,fld,label,target,unit)=>(
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
        <label style={S.lbl}>{label}</label>
        <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:10,color:(entry[sec]?.[fld]||0)>=target?"#00FF94":"#FF3B3B",fontWeight:700}}>{entry[sec]?.[fld]||0}{unit} / {target}{unit}</span>
      </div>
      <input type="number" min="0" step="0.25" style={S.inp} value={entry[sec]?.[fld]||""} onChange={e=>setField(sec,fld,e.target.value)} placeholder="0"/>
      <div style={{marginTop:4}}><Bar pct={((entry[sec]?.[fld]||0)/target)*100} color={(entry[sec]?.[fld]||0)>=target?"#00FF94":"#FF3B3B"}/></div>
    </div>
  );

  const dtObj=DAY_TYPES.find(d=>d.key===dt);

  return(
    <div>
      {/* Boss team overview */}
      {isBoss&&(
        <div style={S.card}>
          <div style={S.sec("#FF6B00")}>TEAM STATUS — {selDate}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {teamSummary.map(({m,logged,ok,dayType,assigned})=>{
              const dtc=DAY_TYPES.find(d=>d.key===dayType);
              return(
                <div key={m} onClick={()=>setSelMember(m)} style={{flex:1,minWidth:70,background:selMember===m?"#111":"#080808",border:`1px solid ${selMember===m?"#FF6B00":"#1a1a1a"}`,borderRadius:8,padding:"8px 6px",cursor:"pointer",textAlign:"center"}}>
                  <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:11,color:"#f0f0f0",marginBottom:3}}>{m.replace("ช่าง","")}</div>
                  {dtc&&<div style={{fontSize:8,color:dtc.color,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1,marginBottom:2}}>{dtc.short}</div>}
                  {assigned&&!logged&&<div style={{fontSize:9,color:"#555",fontFamily:"'Barlow Condensed', sans-serif"}}>รอกรอก</div>}
                  {logged?<div style={{fontSize:14}}>{ok?"✅":"❌"}</div>:<div style={{fontSize:9,color:"#2a2a2a",fontFamily:"'Barlow Condensed', sans-serif"}}>{assigned?"—":"NO PLAN"}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Date + member picker */}
      <div style={{display:"grid",gridTemplateColumns:isBoss?"1fr 1fr":"1fr",gap:10,marginBottom:12}}>
        <div><label style={S.lbl}>วันที่</label><input type="date" style={S.inp} value={selDate} onChange={e=>setSelDate(e.target.value)}/></div>
        {isBoss&&<div><label style={S.lbl}>ช่าง</label><select style={S.inp} value={selMember} onChange={e=>setSelMember(e.target.value)}>{TEAM.map(t=><option key={t}>{t}</option>)}</select></div>}
      </div>

      {/* Assigned day type badge */}
      {assignedDayType?(
        <div style={{background:dtObj?.color+"18",border:`1px solid ${dtObj?.color}44`,borderRadius:8,padding:"8px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:13,color:dtObj?.color,letterSpacing:2}}>{dtObj?.label}</span>
          <span style={{fontSize:10,color:"#555",fontFamily:"'Barlow Condensed', sans-serif"}}>— กำหนดโดย Smallbrush</span>
        </div>
      ):(
        <div style={{background:"#111",border:"1px solid #2a2a2a",borderRadius:8,padding:"8px 12px",marginBottom:12}}>
          <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:10,color:"#444",letterSpacing:1}}>⚠ ยังไม่มีแผนงานสำหรับวันนี้ — กรอกได้แต่ควรรอหัวหน้ากำหนด</span>
        </div>
      )}

      {/* KPI inputs */}
      <div style={S.card}>
        <div style={S.sec(dtObj?.color||"#888")}>{dtObj?.label||"—"}</div>
        {dt==="production"&&<>{numRow("production","small","งานขนาดเล็ก",1.5," ชิ้น")}{numRow("production","medium","งานขนาดกลาง",1," ชิ้น")}{numRow("production","large","งานขนาดใหญ่",0.25," ชิ้น")}{numRow("production","footage","Raw Footage",2," คลิป")}</>}
        {dt==="content"&&<>{numRow("content","posts","โพสต์",1," โพสต์")}{numRow("content","footage","Raw Footage",3," คลิป")}{numRow("content","photos","ภาพชิ้นงาน",1," ชุด")}{numRow("content","reels","Reels/วิดีโอ",3," ชิ้น")}</>}
        {dt==="design"&&<>{numRow("design","designs","แบบที่ออกแบบ",4," แบบ")}</>}
        <div style={{textAlign:"center",padding:"10px",background:passed?"#003320":"#1a0808",border:`1px solid ${passed?"#00FF9444":"#FF3B3B44"}`,borderRadius:8,marginTop:6}}>
          <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:900,fontSize:16,color:passed?"#00FF94":"#FF3B3B",letterSpacing:3}}>{passed?"✓ KPI PASSED":"✗ KPI MISSED"}</div>
        </div>
      </div>
      <div style={{marginBottom:10}}><label style={S.lbl}>บันทึก / ปัญหา</label><textarea style={{...S.inp,resize:"vertical",minHeight:68}} value={entry.note||""} onChange={e=>setEntry({...entry,note:e.target.value})} placeholder="บันทึกข้อคิดเห็น ปัญหา หรือเหตุผล..."/></div>
      {isBoss&&<div><label style={{...S.lbl,color:"#FF6B00"}}>💬 SMALLBRUSH COMMENT</label><textarea style={{...S.inp,resize:"vertical",minHeight:52,borderColor:"#FF6B0033"}} value={entry.bossComment||""} onChange={e=>setEntry({...entry,bossComment:e.target.value})} placeholder="ความคิดเห็นหัวหน้า..."/></div>}
    </div>
  );
}

/* ── FINANCE ──────────────────────────────── */
function FinanceView({orders}){
  const now=new Date();
  const [selYear,setSelYear]=useState(now.getFullYear());
  const [selMonth,setSelMonth]=useState(now.getMonth());
  const [activeTab,setActiveTab]=useState("overview");
  const mk=monthKey(selYear,selMonth);
  const [expenses,setExpenses]=useState(()=>loadData("cit-expenses",{}));
  useEffect(()=>{ saveData("cit-expenses",expenses); },[expenses]);
  const monthExpenses=expenses[mk]||[];
  const setMonthExp=arr=>setExpenses(e=>({...e,[mk]:arr}));
  const [products,setProducts]=useState(()=>loadData("cit-products",[]));
  const [sales,setSales]=useState(()=>loadData("cit-sales",{}));
  useEffect(()=>{ saveData("cit-products",products); },[products]);
  useEffect(()=>{ saveData("cit-sales",sales); },[sales]);
  const monthSales=sales[mk]||{};
  const [alloc,setAlloc]=useState(()=>loadData("cit-alloc",DEFAULT_ALLOC));
  useEffect(()=>{ saveData("cit-alloc",alloc); },[alloc]);
  const orderRevenue=orders.filter(o=>orderMonth(o)===mk).reduce((s,o)=>s+(o.price||0),0);
  const productRevenue=products.reduce((s,p)=>s+(p.price||0)*(monthSales[p.id]||0),0);
  const totalRevenue=orderRevenue+productRevenue;
  const totalExpense=monthExpenses.reduce((s,e)=>s+(e.amount||0),0);
  const netProfit=totalRevenue-totalExpense;
  const [newExp,setNewExp]=useState({cat:DEFAULT_EXP_CATS[0],label:"",amount:""});
  const addExp=()=>{ if(!newExp.amount)return; setMonthExp([...monthExpenses,{id:Date.now(),cat:newExp.cat,label:newExp.label||newExp.cat,amount:Number(newExp.amount)}]); setNewExp({cat:DEFAULT_EXP_CATS[0],label:"",amount:""}); };
  const [newProd,setNewProd]=useState({name:"",price:""});
  const addProd=()=>{ if(!newProd.name||!newProd.price)return; setProducts(p=>[...p,{id:Date.now(),name:newProd.name,price:Number(newProd.price)}]); setNewProd({name:"",price:""}); };
  const totalAllocPct=alloc.reduce((s,a)=>s+a.pct,0);
  const navMonth=d=>{ let m=selMonth+d,y=selYear; if(m<0){m=11;y--;}if(m>11){m=0;y++;}setSelMonth(m);setSelYear(y); };
  const allMonthKeys=[...new Set([...Object.keys(expenses),...Object.keys(sales),...orders.map(o=>orderMonth(o)).filter(Boolean)])].sort().slice(-6);
  const FTABS=[{key:"overview",label:"OVERVIEW"},{key:"expenses",label:"รายจ่าย"},{key:"products",label:"สินค้า"},{key:"alloc",label:"สัดส่วน"},{key:"compare",label:"เปรียบเทียบ"}];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <button onClick={()=>navMonth(-1)} style={{background:"#111",border:"1px solid #1e1e1e",color:"#555",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>‹</button>
        <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:15,letterSpacing:3,color:"#f0f0f0"}}>{MONTHS_TH[selMonth]} {selYear}</div>
        <button onClick={()=>navMonth(1)} style={{background:"#111",border:"1px solid #1e1e1e",color:"#555",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>›</button>
      </div>
      <div style={{display:"flex",gap:0,borderBottom:"1px solid #181818",marginBottom:14,overflowX:"auto"}}>
        {FTABS.map(t=><button key={t.key} onClick={()=>setActiveTab(t.key)} style={{padding:"7px 12px",background:"none",border:"none",borderBottom:`2px solid ${activeTab===t.key?"#FF6B00":"transparent"}`,color:activeTab===t.key?"#FF6B00":"#333",fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:10,letterSpacing:2,cursor:"pointer",whiteSpace:"nowrap",marginBottom:-1}}>{t.label}</button>)}
      </div>
      {activeTab==="overview"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[{label:"รายรับ (ออเดอร์)",val:orderRevenue,color:"#FF6B00"},{label:"รายรับ (สินค้า)",val:productRevenue,color:"#00C2FF"},{label:"รายจ่ายรวม",val:totalExpense,color:"#FF3B3B"},{label:"กำไรสุทธิ",val:netProfit,color:netProfit>=0?"#00FF94":"#FF3B3B"}].map(({label,val,color})=>(
              <div key={label} style={{background:"#0d0d0d",border:`1px solid ${color}22`,borderTop:`2px solid ${color}`,borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
                <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:900,fontSize:20,color,letterSpacing:1}}>฿{fmt(val)}</div>
                <div style={{fontSize:9,letterSpacing:2,color:"#333",fontFamily:"'Barlow Condensed', sans-serif",marginTop:2}}>{label}</div>
              </div>
            ))}
          </div>
          <div style={S.card}>
            <div style={S.sec("#FFD600")}>รายจ่ายแยกหมวด</div>
            {DEFAULT_EXP_CATS.map(cat=>{ const total=monthExpenses.filter(e=>e.cat===cat).reduce((s,e)=>s+(e.amount||0),0); const pct=totalExpense>0?Math.round((total/totalExpense)*100):0; return total>0?(<div key={cat} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:11,color:"#888"}}>{cat}</span><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:11,color:"#f0f0f0"}}>฿{fmt(total)} <span style={{color:"#444"}}>({pct}%)</span></span></div><Bar pct={pct} color="#FFD600"/></div>):null; })}
            {totalExpense===0&&<div style={{color:"#2a2a2a",fontSize:12,fontFamily:"'Barlow Condensed', sans-serif"}}>ยังไม่มีรายจ่ายเดือนนี้</div>}
          </div>
        </div>
      )}
      {activeTab==="expenses"&&(
        <div>
          <div style={S.card}>
            <div style={S.sec("#FF3B3B")}>เพิ่มรายจ่าย</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div><label style={S.lbl}>หมวด</label><select style={S.inp} value={newExp.cat} onChange={e=>setNewExp(n=>({...n,cat:e.target.value}))}>{DEFAULT_EXP_CATS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label style={S.lbl}>รายละเอียด</label><input style={S.inp} value={newExp.label} onChange={e=>setNewExp(n=>({...n,label:e.target.value}))} placeholder="เช่น ค่าสี Angelus"/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
              <div><label style={S.lbl}>จำนวนเงิน (฿)</label><input type="number" style={S.inp} value={newExp.amount} onChange={e=>setNewExp(n=>({...n,amount:e.target.value}))} placeholder="0"/></div>
              <div style={{display:"flex",alignItems:"flex-end"}}><button onClick={addExp} style={{background:"#FF3B3B",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontSize:12,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>+ เพิ่ม</button></div>
            </div>
          </div>
          <div style={S.card}>
            <div style={S.sec("#FF3B3B")}>รายจ่ายเดือนนี้ — ฿{fmt(totalExpense)}</div>
            {monthExpenses.length===0&&<div style={{color:"#2a2a2a",fontSize:12,fontFamily:"'Barlow Condensed', sans-serif"}}>ยังไม่มีรายจ่าย</div>}
            {monthExpenses.map(e=>(<div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #111"}}><div><div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:12,color:"#f0f0f0"}}>{e.label}</div><div style={{fontSize:9,color:"#444",fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>{e.cat}</div></div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,color:"#FF3B3B"}}>฿{fmt(e.amount)}</span><button onClick={()=>setMonthExp(monthExpenses.filter(x=>x.id!==e.id))} style={{background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:12}}>✕</button></div></div>))}
          </div>
        </div>
      )}
      {activeTab==="products"&&(
        <div>
          <div style={S.card}>
            <div style={S.sec("#00C2FF")}>จัดการสินค้า</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,marginBottom:8}}>
              <div><label style={S.lbl}>ชื่อสินค้า</label><input style={S.inp} value={newProd.name} onChange={e=>setNewProd(n=>({...n,name:e.target.value}))} placeholder="เช่น ถุงเท้า"/></div>
              <div><label style={S.lbl}>ราคา (฿)</label><input type="number" style={S.inp} value={newProd.price} onChange={e=>setNewProd(n=>({...n,price:e.target.value}))} placeholder="0"/></div>
              <div style={{display:"flex",alignItems:"flex-end"}}><button onClick={addProd} style={{background:"#00C2FF",color:"#000",border:"none",borderRadius:8,padding:"8px 12px",fontSize:12,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,cursor:"pointer"}}>+ เพิ่ม</button></div>
            </div>
          </div>
          <div style={S.card}>
            <div style={S.sec("#00C2FF")}>ยอดขายสินค้า — {MONTHS_TH[selMonth]} {selYear}</div>
            {products.length===0&&<div style={{color:"#2a2a2a",fontSize:12,fontFamily:"'Barlow Condensed', sans-serif"}}>ยังไม่มีสินค้า</div>}
            {products.map(p=>{ const qty=monthSales[p.id]||0; return(<div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #111"}}><div><div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:13,color:"#f0f0f0",fontWeight:700}}>{p.name}</div><div style={{fontSize:10,color:"#444",fontFamily:"'Barlow Condensed', sans-serif"}}>฿{fmt(p.price)} / ชิ้น</div></div><div style={{display:"flex",alignItems:"center",gap:6}}><button onClick={()=>setSales(s=>({...s,[mk]:{...monthSales,[p.id]:Math.max(0,qty-1)}}))} style={{background:"#111",border:"1px solid #222",color:"#888",borderRadius:6,width:28,height:28,cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700}}>−</button><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:16,color:"#f0f0f0",minWidth:24,textAlign:"center"}}>{qty}</span><button onClick={()=>setSales(s=>({...s,[mk]:{...monthSales,[p.id]:qty+1}}))} style={{background:"#FF6B00",border:"none",color:"#000",borderRadius:6,width:28,height:28,cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700}}>+</button><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:12,color:"#00C2FF",minWidth:60,textAlign:"right"}}>฿{fmt(p.price*qty)}</span><button onClick={()=>setProducts(pp=>pp.filter(x=>x.id!==p.id))} style={{background:"none",border:"none",color:"#333",cursor:"pointer"}}>✕</button></div></div>); })}
            {products.length>0&&<div style={{marginTop:10,textAlign:"right",fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,color:"#00C2FF"}}>รวม ฿{fmt(productRevenue)}</div>}
          </div>
        </div>
      )}
      {activeTab==="alloc"&&(
        <div>
          <div style={S.card}>
            <div style={S.sec("#00FF94")}>💡 สัดส่วนแบ่งกำไร</div>
            <div style={{background:"#080808",borderRadius:8,padding:"10px 12px",marginBottom:14,border:"1px solid #1a1a1a"}}>
              <div style={{fontSize:11,color:"#666",lineHeight:1.7,fontFamily:"'Barlow Condensed', sans-serif"}}><div style={{color:"#FF6B00",fontWeight:700,marginBottom:4,letterSpacing:1}}>หลักการสำหรับธุรกิจ Custom:</div>แบ่งกำไรล่วงหน้าก่อนเอาออก เพื่อให้ธุรกิจเติบโตและมีทุนหมุนเวียน ตัวเลข % ด้านล่างปรับได้ตามสถานการณ์จริง</div>
            </div>
            {alloc.map((a,i)=>(
              <div key={a.key} style={{marginBottom:12,background:"#080808",borderRadius:8,padding:"10px 12px",borderLeft:`3px solid ${a.color}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div><div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:12,color:a.color}}>{a.label}</div><div style={{fontSize:10,color:"#444",marginTop:1}}>{a.tip}</div></div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><input type="number" min="0" max="100" style={{...S.inp,width:52,textAlign:"center",color:a.color,fontWeight:800}} value={a.pct} onChange={e=>setAlloc(al=>al.map((x,j)=>j===i?{...x,pct:Number(e.target.value)}:x))}/><span style={{fontFamily:"'Barlow Condensed', sans-serif",color:"#444",fontSize:12}}>%</span></div>
                </div>
                <Bar pct={a.pct} color={a.color}/>
                {netProfit>0&&<div style={{marginTop:4,fontFamily:"'Barlow Condensed', sans-serif",fontSize:11,color:a.color,fontWeight:700}}>= ฿{fmt(Math.round(netProfit*a.pct/100))}</div>}
              </div>
            ))}
            <div style={{padding:"8px 12px",background:"#080808",borderRadius:8,border:`1px solid ${totalAllocPct===100?"#00FF9444":"#FF3B3B44"}`,textAlign:"center"}}>
              <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,color:totalAllocPct===100?"#00FF94":"#FF3B3B"}}>รวม {totalAllocPct}% {totalAllocPct===100?"✓":`(ยังขาด ${100-totalAllocPct}%)`}</span>
            </div>
            <div style={{marginTop:8,textAlign:"center"}}><button onClick={()=>setAlloc(DEFAULT_ALLOC)} style={{background:"none",border:"1px solid #222",borderRadius:6,color:"#444",fontSize:10,padding:"5px 14px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>RESET เป็นค่าแนะนำ</button></div>
          </div>
        </div>
      )}
      {activeTab==="compare"&&(
        <div>
          <div style={S.card}>
            <div style={S.sec("#FFD600")}>เปรียบเทียบ 6 เดือนล่าสุด</div>
            {allMonthKeys.length===0&&<div style={{color:"#2a2a2a",fontSize:12,fontFamily:"'Barlow Condensed', sans-serif"}}>ยังไม่มีข้อมูลเพียงพอ</div>}
            {allMonthKeys.map(mk2=>{ const [yy,mm]=mk2.split("-").map(Number); const mo=mm-1; const rev=orders.filter(o=>orderMonth(o)===mk2).reduce((s,o)=>s+(o.price||0),0); const prodRev=products.reduce((s,p)=>s+(p.price||0)*((sales[mk2]||{})[p.id]||0),0); const exp=(expenses[mk2]||[]).reduce((s,e)=>s+(e.amount||0),0); const net=rev+prodRev-exp; const isCur=mk2===mk;
              return(<div key={mk2} style={{marginBottom:10,background:isCur?"#111":"#080808",borderRadius:8,padding:"10px 12px",border:`1px solid ${isCur?"#FF6B0033":"#1a1a1a"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:13,color:isCur?"#FF6B00":"#f0f0f0"}}>{MONTHS_TH[mo]} {yy}{isCur?" ◀":""}</span><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:13,color:net>=0?"#00FF94":"#FF3B3B"}}>฿{fmt(net)}</span></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,fontSize:10,fontFamily:"'Barlow Condensed', sans-serif"}}><div style={{color:"#FF6B00"}}>รับ ฿{fmt(rev+prodRev)}</div><div style={{color:"#FF3B3B"}}>จ่าย ฿{fmt(exp)}</div><div style={{color:net>=0?"#00FF94":"#FF3B3B",fontWeight:700}}>กำไร ฿{fmt(net)}</div></div>
              </div>);
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MONTHLY SUMMARY ──────────────────────── */
function MonthlySummary({orders,kpiLogs,workPlans}){
  const now=new Date();
  const [selYear,setSelYear]=useState(now.getFullYear());
  const [selMonth,setSelMonth]=useState(now.getMonth());
  const mk=monthKey(selYear,selMonth);
  const navMonth=d=>{ let m=selMonth+d,y=selYear; if(m<0){m=11;y--;}if(m>11){m=0;y++;}setSelMonth(m);setSelYear(y); };
  const monthOrders=orders.filter(o=>orderMonth(o)===mk);
  const totalRev=monthOrders.reduce((s,o)=>s+(o.price||0),0);
  const doneOrders=monthOrders.filter(o=>o.status==="done").length;
  const fullyPaid=monthOrders.filter(o=>o.fullPaid).length;
  const daysInMonth=new Date(selYear,selMonth+1,0).getDate();
  let totalDays=0,passDays=0;
  for(let d=1;d<=daysInMonth;d++){
    const dk=`${mk}-${String(d).padStart(2,"0")}`;
    TEAM.forEach(m=>{ const e=kpiLogs[`${dk}__${m}`]; if(!e)return; totalDays++; if(kpiPass({...e,dayType:workPlans?.[dk]?.[m]||e.dayType}))passDays++; });
  }
  const kpiRate=totalDays>0?Math.round((passDays/totalDays)*100):null;
  const memberStats=TEAM.map(m=>{ let pass=0,total=0; for(let d=1;d<=daysInMonth;d++){ const dk=`${mk}-${String(d).padStart(2,"0")}`; const e=kpiLogs[`${dk}__${m}`]; if(!e)continue; total++; if(kpiPass({...e,dayType:workPlans?.[dk]?.[m]||e.dayType}))pass++; } return{m,pass,total,rate:total>0?Math.round((pass/total)*100):null}; });
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <button onClick={()=>navMonth(-1)} style={{background:"#111",border:"1px solid #1e1e1e",color:"#555",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>‹</button>
        <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:15,letterSpacing:3,color:"#f0f0f0"}}>{MONTHS_TH[selMonth]} {selYear}</div>
        <button onClick={()=>navMonth(1)} style={{background:"#111",border:"1px solid #1e1e1e",color:"#555",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>›</button>
      </div>
      <div style={S.card}>
        <div style={S.sec("#FF6B00")}>💰 สรุปรายได้</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[{label:"ออเดอร์",val:`${monthOrders.length} งาน`,color:"#FF6B00"},{label:"มูลค่ารวม",val:`฿${fmt(totalRev)}`,color:"#FF6B00"},{label:"เสร็จแล้ว",val:`${doneOrders} งาน`,color:"#00FF94"},{label:"ชำระครบ",val:`${fullyPaid} งาน`,color:"#00FF94"}].map(({label,val,color})=>(
            <div key={label} style={{background:"#080808",borderRadius:8,padding:"8px 10px",textAlign:"center",border:`1px solid ${color}22`}}>
              <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:17,color}}>{val}</div>
              <div style={{fontSize:9,color:"#333",fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1,marginTop:2}}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={S.card}>
        <div style={S.sec("#00C2FF")}>📊 KPI คุณภาพการทำงาน</div>
        <div style={{textAlign:"center",padding:"12px",background:"#080808",borderRadius:8,marginBottom:12,border:`1px solid ${kpiRate===null?"#222":kpiRate>=70?"#00FF9444":kpiRate>=50?"#FFD60044":"#FF3B3B44"}`}}>
          <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:900,fontSize:36,color:kpiRate===null?"#333":kpiRate>=70?"#00FF94":kpiRate>=50?"#FFD600":"#FF3B3B"}}>{kpiRate===null?"—":`${kpiRate}%`}</div>
          <div style={{fontSize:10,color:"#444",fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:2}}>KPI PASS RATE ({passDays}/{totalDays} วัน)</div>
        </div>
        {memberStats.map(({m,pass,total,rate})=>(
          <div key={m} style={{marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:12,color:"#888"}}>{m}</span><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:12,color:rate===null?"#2a2a2a":rate>=80?"#00FF94":rate>=50?"#FFD600":"#FF3B3B"}}>{rate===null?"ไม่มีข้อมูล":`${pass}/${total} วัน (${rate}%)`}</span></div>
            {rate!==null&&<Bar pct={rate} color={rate>=80?"#00FF94":rate>=50?"#FFD600":"#FF3B3B"}/>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── BOSS DASHBOARD ───────────────────────── */
function BossDashboard({orders,kpiLogs,workPlans}){
  const totalRevenue=orders.reduce((s,o)=>s+(o.price||0),0);
  const totalDeposit=orders.filter(o=>o.depositPaid).reduce((s,o)=>s+(o.deposit||0),0);
  const totalRemaining=orders.filter(o=>!o.fullPaid).reduce((s,o)=>s+Math.max(0,(o.price||0)-(o.deposit||0)),0);
  const totalPaid=orders.filter(o=>o.fullPaid).reduce((s,o)=>s+(o.price||0),0);
  const last7=Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return d.toISOString().slice(0,10); });
  const memberStats=TEAM.map(m=>{ let pass=0,total=0; last7.forEach(dk=>{ const e=kpiLogs[`${dk}__${m}`]; if(!e)return; total++; if(kpiPass({...e,dayType:workPlans?.[dk]?.[m]||e.dayType}))pass++; }); return{m,pass,total,rate:total>0?Math.round((pass/total)*100):null}; });
  return(
    <div>
      <div style={S.sec("#FF6B00")}>💰 ALL-TIME REVENUE</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        {[{label:"รายรับรวม",val:`฿${fmt(totalRevenue)}`,color:"#FF6B00"},{label:"รับแล้ว",val:`฿${fmt(totalDeposit)}`,color:"#00C2FF"},{label:"ยอดค้าง",val:`฿${fmt(totalRemaining)}`,color:"#FF3B3B"},{label:"ชำระครบ",val:`฿${fmt(totalPaid)}`,color:"#00FF94"}].map(({label,val,color})=>(
          <div key={label} style={{background:"#0d0d0d",border:`1px solid ${color}22`,borderTop:`2px solid ${color}`,borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
            <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:900,fontSize:19,color}}>{val}</div>
            <div style={{fontSize:9,color:"#333",fontFamily:"'Barlow Condensed', sans-serif",marginTop:2,letterSpacing:1}}>{label}</div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.sec("#FFD600")}>📊 KPI RATE — 7 วันล่าสุด</div>
        {memberStats.map(({m,pass,total,rate})=>(
          <div key={m} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:12,color:"#888"}}>{m}</span><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:12,color:rate===null?"#2a2a2a":rate>=80?"#00FF94":rate>=50?"#FFD600":"#FF3B3B"}}>{rate===null?"ไม่มีข้อมูล":`${pass}/${total} วัน (${rate}%)`}</span></div>
            {rate!==null&&<Bar pct={rate} color={rate>=80?"#00FF94":rate>=50?"#FFD600":"#FF3B3B"}/>}
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.sec("#FF3B3B")}>⚠ ยังค้างชำระ</div>
        {orders.filter(o=>!o.fullPaid&&(o.price||0)>(o.deposit||0)).length===0
          ?<div style={{color:"#2a2a2a",fontSize:12,fontFamily:"'Barlow Condensed', sans-serif"}}>ไม่มีออเดอร์ค้างชำระ ✓</div>
          :orders.filter(o=>!o.fullPaid&&(o.price||0)>(o.deposit||0)).map(o=>(
            <div key={o.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #111"}}>
              <div><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:12,color:"#f0f0f0"}}>{o.customer}</span><span style={{fontSize:10,color:"#333",marginLeft:6}}>{o.ig}</span></div>
              <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:13,color:"#FF3B3B"}}>฿{fmt((o.price||0)-(o.deposit||0))}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ── LOGIN ────────────────────────────────── */
function LoginScreen({onBoss,onTeam}){
  const [pw,setPw]=useState(""), [err,setErr]=useState(false);
  const tryBoss=()=>{ if(pw.trim()===BOSS_PASSWORD)onBoss(); else{ setErr(true); setTimeout(()=>setErr(false),1200); } };
  return(
    <div style={{minHeight:"100vh",background:"#080808",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,backgroundImage:GRAIN}}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800;900&family=Sarabun:wght@400;600&display=swap" rel="stylesheet"/>
      <div style={{width:"100%",maxWidth:340}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:900,fontSize:30,letterSpacing:6,color:"#FF6B00"}}>CUSTOMIT</div>
          <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:11,letterSpacing:6,color:"#333"}}>THAILAND</div>
          <div style={{width:40,height:2,background:"#FF6B00",margin:"12px auto"}}/>
        </div>
        <div style={{background:"#0d0d0d",border:"1px solid #FF6B0033",borderRadius:12,padding:20,marginBottom:12}}>
          <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:12,letterSpacing:3,color:"#FF6B00",marginBottom:12}}>🖌 SMALLBRUSH ACCESS</div>
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryBoss()} placeholder="รหัสผ่าน Smallbrush" style={{...S.inp,marginBottom:10,border:`1px solid ${err?"#FF3B3B":"#222"}`,transition:"border-color 0.2s"}} autoComplete="off"/>
          {err&&<div style={{fontSize:10,color:"#FF3B3B",fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:2,marginBottom:8,textAlign:"center"}}>รหัสผิด ลองใหม่</div>}
          <button onClick={tryBoss} style={{width:"100%",background:"#FF6B00",color:"#000",border:"none",borderRadius:8,padding:11,fontSize:13,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:900,letterSpacing:3,cursor:"pointer"}}>ENTER AS SMALLBRUSH</button>
        </div>
        <div style={{background:"#0d0d0d",border:"1px solid #181818",borderRadius:12,padding:20}}>
          <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:12,letterSpacing:3,color:"#555",marginBottom:12}}>🔧 TEAM ACCESS</div>
          <button onClick={onTeam} style={{width:"100%",background:"#111",color:"#888",border:"1px solid #1e1e1e",borderRadius:8,padding:11,fontSize:13,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,letterSpacing:3,cursor:"pointer"}}>ENTER AS TEAM</button>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN APP ─────────────────────────────── */
export default function App(){
  const [role,setRole]=useState(null);
  const [orders,setOrders]=useState(()=>loadData("cit-orders-v3",SAMPLE_ORDERS));
  const [kpiLogs,setKpiLogs]=useState(()=>loadData("cit-kpi-logs",{}));
  const [workPlans,setWorkPlans]=useState(()=>loadData("cit-work-plans",{}));
  const [showAdd,setShowAdd]=useState(false);
  const [tab,setTab]=useState("orders");
  const [filterStatus,setFilterStatus]=useState("all");
  const [search,setSearch]=useState("");

  useEffect(()=>{ saveData("cit-orders-v3",orders); },[orders]);
  useEffect(()=>{ saveData("cit-kpi-logs",kpiLogs); },[kpiLogs]);
  useEffect(()=>{ saveData("cit-work-plans",workPlans); },[workPlans]);

  if(!role) return <LoginScreen onBoss={()=>setRole("boss")} onTeam={()=>setRole("team")}/>;

  const isBoss=role==="boss";
  const add=o=>setOrders(arr=>[o,...arr]);
  const upd=o=>setOrders(arr=>arr.map(x=>x.id===o.id?o:x));
  const del=id=>setOrders(arr=>arr.filter(x=>x.id!==id));
  const nextId=Math.max(0,...orders.map(o=>o.id))+1;

  const filtered=orders
    .filter(o=>filterStatus==="all"||o.status===filterStatus)
    .filter(o=>!search||o.customer.includes(search)||o.model.toLowerCase().includes(search.toLowerCase())||(o.ig||"").includes(search))
    .sort((a,b)=>{ const p={urgent:0,normal:1,low:2}; return p[a.priority]!==p[b.priority]?p[a.priority]-p[b.priority]:new Date(a.deadline)-new Date(b.deadline); });

  const counts=Object.fromEntries(STATUSES.map(s=>[s.key,orders.filter(o=>o.status===s.key).length]));

  const TABS=[
    {key:"orders",label:"ORDERS"},
    {key:"calendar",label:"CALENDAR"},
    {key:"kpi",label:"KPI"},
    ...(isBoss?[
      {key:"planner",label:"PLANNER"},
      {key:"finance",label:"FINANCE"},
      {key:"monthly",label:"MONTHLY"},
      {key:"dashboard",label:"DASHBOARD"},
    ]:[]),
  ];

  return(
    <div style={{minHeight:"100vh",background:"#080808",color:"#f5f5f5",backgroundImage:GRAIN}}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800;900&family=Sarabun:wght@400;600&display=swap" rel="stylesheet"/>
      <div style={{background:"#0d0d0d",borderBottom:"1px solid #181818",padding:"0 14px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"baseline",gap:6}}>
          <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:900,fontSize:18,letterSpacing:4,color:"#FF6B00"}}>CUSTOMIT</span>
          <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,letterSpacing:3,color:"#2a2a2a"}}>TH</span>
          {isBoss&&<span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:8,letterSpacing:2,color:"#FF6B00",background:"#FF6B0020",borderRadius:3,padding:"1px 6px",marginLeft:4}}>SMALLBRUSH</span>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {isBoss&&<button onClick={()=>setShowAdd(true)} style={{background:"#FF6B00",color:"#000",border:"none",borderRadius:7,padding:"6px 14px",fontSize:11,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:900,letterSpacing:2,cursor:"pointer"}}>+ NEW</button>}
          <button onClick={()=>setRole(null)} style={{background:"none",border:"1px solid #1e1e1e",borderRadius:6,color:"#333",fontSize:10,padding:"5px 10px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>EXIT</button>
        </div>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid #181818",overflowX:"auto"}}>
        {[{key:"all",label:"ALL",color:"#f5f5f5",count:orders.length},...STATUSES.map(s=>({...s,count:counts[s.key]||0}))].map(s=>(
          <button key={s.key} onClick={()=>setFilterStatus(s.key)} style={{flex:1,minWidth:52,padding:"8px 4px",background:"transparent",border:"none",borderBottom:`2px solid ${filterStatus===s.key?s.color:"transparent"}`,cursor:"pointer"}}>
            <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:900,fontSize:16,color:filterStatus===s.key?s.color:"#2a2a2a"}}>{s.count}</div>
            <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:7,letterSpacing:1,color:filterStatus===s.key?s.color:"#1e1e1e"}}>{s.label}</div>
          </button>
        ))}
      </div>
      <div style={{display:"flex",borderBottom:"1px solid #181818",padding:"0 14px",overflowX:"auto"}}>
        {TABS.map(t=><button key={t.key} onClick={()=>setTab(t.key)} style={{padding:"9px 12px 9px 0",background:"none",border:"none",borderBottom:`2px solid ${tab===t.key?"#FF6B00":"transparent"}`,color:tab===t.key?"#FF6B00":"#2a2a2a",fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,fontSize:10,letterSpacing:2,cursor:"pointer",marginBottom:-1,whiteSpace:"nowrap"}}>{t.label}</button>)}
      </div>
      <div style={{padding:"12px 14px 80px"}}>
        {tab==="orders"&&(
          <>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  SEARCH..." style={{...S.inp,marginBottom:10}}/>
            {filtered.length===0?<div style={{textAlign:"center",color:"#1e1e1e",padding:60,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:4,fontSize:13}}>NO ORDERS</div>
              :filtered.map(o=><OrderCard key={o.id} order={o} onUpdate={upd} onDelete={del} isBoss={isBoss}/>)}
          </>
        )}
        {tab==="calendar"&&<CalView orders={orders} workPlans={workPlans}/>}
        {tab==="kpi"&&<KpiTracker isBoss={isBoss} workPlans={workPlans}/>}
        {tab==="planner"&&isBoss&&<WorkPlanner workPlans={workPlans} setWorkPlans={setWorkPlans}/>}
        {tab==="finance"&&isBoss&&<FinanceView orders={orders}/>}
        {tab==="monthly"&&isBoss&&<MonthlySummary orders={orders} kpiLogs={kpiLogs} workPlans={workPlans}/>}
        {tab==="dashboard"&&isBoss&&<BossDashboard orders={orders} kpiLogs={kpiLogs} workPlans={workPlans}/>}
      </div>
      {showAdd&&<AddModal onClose={()=>setShowAdd(false)} onAdd={add} nextId={nextId} isBoss={isBoss}/>}
    </div>
  );
}
