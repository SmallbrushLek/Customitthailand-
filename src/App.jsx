import { useState, useEffect, useRef, useCallback } from "react";
// Firebase loaded via CDN in index.html

const firebaseConfig = {
  apiKey: "AIzaSyCu10712mcFGxAqNbl98CeWfthHrA5Yds4",
  authDomain: "customitthailand-90460.firebaseapp.com",
  projectId: "customitthailand-90460",
  storageBucket: "customitthailand-90460.firebasestorage.app",
  messagingSenderId: "73861855144",
  appId: "1:73861855144:web:115bbcc9fc8fad1c548f9d",
};
// Firebase will be initialized after CDN loads
let db = null;
function getDB() { return db; }
async function initFirebase() {
  if(db) return db;
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    return db;
  } catch(e) { console.error("Firebase init failed, using localStorage only", e); return null; }
}
// Non-blocking firebase ops
async function fsSetSafe(k,v){ try{ await fsSet(k,v); }catch(e){ console.warn("fsSet failed",e); } }

// Firestore sync helpers - use dynamic imports
async function fsSet(docId, data) {
  try {
    const db2 = await initFirebase();
    if(!db2) return;
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await setDoc(doc(db2, "customit", docId), { data: JSON.stringify(data) });
  } catch(e) { console.error("fsSet error", e); }
}
async function fsGet(docId, fallback) {
  try {
    const db2 = await initFirebase();
    if(!db2) return fallback;
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const d = await getDoc(doc(db2, "customit", docId));
    return d.exists() ? JSON.parse(d.data().data) : fallback;
  } catch(e) { return fallback; }
}
async function fsListen(docId, cb) {
  try {
    const db2 = await initFirebase();
    if(!db2) return ()=>{};
    const { doc, onSnapshot } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    return onSnapshot(doc(db2, "customit", docId), (d) => { if(d.exists()) cb(JSON.parse(d.data().data)); });
  } catch(e) { return ()=>{}; }
}

const BOSS_PASSWORD = "198742";
const STATUSES = [
  { key: "queue",      label: "QUEUE",       color: "#C9A96E", dim: "#1e1810" },
  { key: "inprogress", label: "IN PROGRESS", color: "#8BA7C7", dim: "#111820" },
  { key: "review",     label: "REVIEW",      color: "#C7B98B", dim: "#1e1c10" },
  { key: "done",       label: "DONE",        color: "#8BC7A7", dim: "#101e18" },
];
const PRIORITIES = [
  { key: "urgent", label: "URGENT", color: "#C97A7A" },
  { key: "normal", label: "NORMAL", color: "#C9A96E" },
  { key: "low",    label: "LOW",    color: "#555" },
];
const TEAM = ["Otto", "Smallbrush"];
const SHOE_SIZES = ["เล็ก", "กลาง", "ใหญ่", "กำหนดเอง"];
// Days needed per size for 100% completion
const SIZE_DAYS = { "เล็ก": 1, "กลาง": 1, "ใหญ่": 4, "กำหนดเอง": null };
const SHOE_TYPES = [
  "Nike Mercurial Superfly","Nike Mercurial Vapor","Nike Phantom GX","Nike Phantom GT",
  "Nike Tiempo Legend","Nike Premier","Adidas Predator","Adidas X Speedportal",
  "Adidas Copa Mundial","Adidas Copa Pure","Adidas F50","Puma Future","Puma King",
  "Puma Ultra","New Balance Furon","New Balance Tekela","Mizuno Morelia","Mizuno Rebula",
  "Asics DS Light","Under Armour Magnetico","Umbro Speciali","Diadora Brasil","อื่นๆ"
];
const ORDER_TYPES = [
  { key: "normal",    label: "ออเดอร์ปกติ",  icon: "💰", color: "#C9A96E" },
  { key: "free",      label: "งานฟรี",        icon: "🎁", color: "#8BC7A7" },
  { key: "event",     label: "งาน Event",     icon: "🎉", color: "#8BA7C7" },
  { key: "promotion", label: "โปรโมชั่น",     icon: "📢", color: "#C7B98B" },
  { key: "collab",    label: "Collab/Content", icon: "🤝", color: "#A78BC7" },
];

const PRODUCT_CATS = [
  { key: "paint",   label: "สีและอุปกรณ์ทาสี", icon: "🎨", color: "#C9A96E" },
  { key: "cloth",   label: "ถุงเท้า / เสื้อผ้า",  icon: "🧦", color: "#8BA7C7" },
  { key: "lace",    label: "เชือกรองเท้า",         icon: "👟", color: "#8BC7A7" },
  { key: "pack",    label: "Packaging",             icon: "📦", color: "#C7B98B" },
  { key: "other",   label: "อื่นๆ",                icon: "🛒", color: "#A78BC7" },
];

const PLATFORMS = [
  { key: "instagram", label: "IG",        icon: "📸", color: "#C96BA0" },
  { key: "facebook",  label: "Facebook",  icon: "👤", color: "#6B8EC9" },
  { key: "tiktok",    label: "TikTok",    icon: "🎵", color: "#8BC7A7" },
  { key: "line",      label: "LINE",      icon: "💬", color: "#7EC96B" },
  { key: "whatsapp",  label: "WhatsApp",  icon: "📱", color: "#6BC9A0" },
];
const DAY_TYPES = [
  { key: "production", label: "PRODUCTION DAY", short: "PROD", color: "#C9A96E" },
  { key: "content",    label: "CONTENT DAY",    short: "CNT",  color: "#8BA7C7" },
  { key: "design",     label: "DESIGN DAY",     short: "DSN",  color: "#C7B98B" },
  { key: "depend",     label: "DEPEND DAY",     short: "DEP",  color: "#A78BC7" },
];
// KPI: pass = ONE of small/medium/large + footage always required
const KPI_TARGET = {
  production: { small: 1.5, medium: 1, large: 0.25, footage: 2 },
  content:    { posts: 1, footage: 3, photos: 1, reels: 3 },
  design:     { designs: 4 },
};
const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const DA_TH = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const DEFAULT_ALLOC = [
  { key: "reserve",   label: "ทุนหมุนเวียน/สำรอง",  pct: 30, color: "#C9A96E", tip: "ค่าวัตถุดิบ, อุปกรณ์, ฉุกเฉิน" },
  { key: "equipment", label: "ซื้ออุปกรณ์/Stock",    pct: 20, color: "#8BA7C7", tip: "ลงทุนในเครื่องมือและสินค้า" },
  { key: "marketing", label: "การตลาด/โฆษณา",        pct: 15, color: "#C7B98B", tip: "ยิงโฆษณา, ค่า content, คอลแลป" },
  { key: "salary",    label: "เงินเดือนเจ้าของ",     pct: 20, color: "#C97A7A", tip: "จ่ายตัวเองสม่ำเสมอ อย่าเอาทั้งหมด" },
  { key: "growth",    label: "กำไรสะสม/ขยายธุรกิจ", pct: 15, color: "#8BC7A7", tip: "เก็บออม ขยายสาขา หรือ invest" },
];
const DEFAULT_EXP_CATS = ["ค่าเช่า","ค่าพนักงาน","น้ำ-ไฟ","อุปกรณ์","ค่าโฆษณา","อื่นๆ"];

// Muted grain
const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`;

// Generate queue ID: MON-001 format
function genQueueId(created, id) {
  const d = new Date(created||Date.now());
  const mo = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][d.getMonth()];
  return `${mo}-${String(id).padStart(3,"0")}`;
}

const SAMPLE_ORDERS = [
  { id:1, customer:"คุณมิน", ig:"", platform:"instagram", orderType:"normal", model:"Nike Mercurial Superfly", size:"กลาง", deadline:"2026-05-28", priority:"urgent", assignee:"Otto", status:"inprogress", note:"ลาย Floral สีพาสเทล", created:Date.now()-86400000, images:[], designImages:[], price:2500, deposit:1000, depositPaid:true, fullPaid:false, cowork:false, coworkNote:"" },
  { id:2, customer:"คุณบิ๊ก", ig:"@bigcustom", platform:"line", model:"Adidas Predator", size:"เล็ก", deadline:"2026-06-01", priority:"normal", assignee:"Otto", status:"queue", note:"โทนดำ-ทอง", created:Date.now()-43200000, images:[], designImages:[], price:1800, deposit:500, depositPaid:true, fullPaid:false, cowork:true, coworkNote:"Otto: วาด / Smallbrush: พ่น+เก็บงาน" },
  { id:3, customer:"คุณพลอย", ig:"@ploystyle", platform:"instagram", model:"Puma King", size:"ใหญ่", deadline:"2026-06-05", priority:"low", assignee:"Smallbrush", status:"done", note:"ลาย One Piece", created:Date.now()-172800000, images:[], designImages:[], price:3500, deposit:1500, depositPaid:true, fullPaid:true, cowork:false, coworkNote:"" },
];

function loadData(k,fb){ try{ const s=localStorage.getItem(k); return s?JSON.parse(s):fb; }catch{ return fb; } }
function saveData(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} }
function daysLeft(d){ return Math.ceil((new Date(d)-new Date())/86400000); }
function toDataURL(file){ return new Promise(res=>{ const r=new FileReader(); r.onload=e=>res(e.target.result); r.readAsDataURL(file); }); }
async function uploadToCloudinary(file){
  const formData=new FormData();
  formData.append("file",file);
  formData.append("upload_preset","customit_upload");
  formData.append("cloud_name","dfe6ubwzf");
  try{
    const res=await fetch("https://api.cloudinary.com/v1_1/dfe6ubwzf/image/upload",{method:"POST",body:formData});
    const data=await res.json();
    return data.secure_url;
  }catch(e){ console.error("Upload failed",e); return null; }
}
function fmt(n){ return Number(n||0).toLocaleString("th-TH"); }
function todayKey(){ return new Date().toISOString().slice(0,10); }
function monthKey(y,m){ return `${y}-${String(m+1).padStart(2,"0")}`; }
function orderMonth(o){ return o.created?new Date(o.created).toISOString().slice(0,7):""; }
function calUrl(o){ const s=o.deadline.replace(/-/g,""); return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`[CUSTOMIT] ${o.customer} — ${o.model}`)}&dates=${s}/${s}&details=${encodeURIComponent(`ช่าง: ${o.assignee}\nโน้ต: ${o.note}`)}`; }

// KPI pass logic: production = ONE of sizes + footage always; content/design unchanged
function kpiPass(e){
  if(!e) return false;
  const dt=e.dayType;
  if(dt==="production"){
    const t=KPI_TARGET.production, p=e.production||{};
    const sizeOk=(p.small||0)>=t.small||(p.medium||0)>=t.medium||(p.large||0)>=t.large;
    return sizeOk&&(p.footage||0)>=t.footage;
  }
  if(dt==="content"){ const t=KPI_TARGET.content,c=e.content||{}; return (c.posts||0)>=t.posts&&(c.footage||0)>=t.footage&&(c.reels||0)>=t.reels; }
  if(dt==="design"){ return (e.design?.designs||0)>=KPI_TARGET.design.designs; }
  if(dt==="depend"){ return !!e.dependPass; }
  return false;
}

// ── DESIGN TOKENS ────────────────────────────
const C = {
  bg:      "#0e0e0e",
  surface: "#161616",
  border:  "#2a2a2a",
  text:    "#e8e0d0",
  muted:   "#6a6560",
  accent:  "#C9A96E",  // warm gold
  danger:  "#C97A7A",
  ok:      "#8BC7A7",
};

const S={
  inp:{ background:C.surface, color:C.text, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 12px", fontSize:13, width:"100%", boxSizing:"border-box", fontFamily:"'Cormorant Garamond', 'Sarabun', serif", letterSpacing:0.5, outline:"none" },
  lbl:{ fontSize:9, letterSpacing:3, color:C.muted, fontFamily:"'Barlow Condensed', sans-serif", fontWeight:600, display:"block", marginBottom:5, textTransform:"uppercase" },
  card:{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:12 },
  sec:(c)=>({ fontSize:9, letterSpacing:3, color:c||C.accent, fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, marginBottom:10, textTransform:"uppercase" }),
};
function Pill({color,children}){
  return <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,fontSize:9,letterSpacing:2,color,background:color+"18",borderRadius:3,padding:"2px 8px",display:"inline-block",border:`1px solid ${color}30`}}>{children}</span>;
}
function Bar({pct,color}){
  return <div style={{height:2,background:C.border,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,pct)}%`,background:color,borderRadius:2,transition:"width 0.4s"}}/></div>;
}
function Divider(){ return <div style={{height:1,background:C.border,margin:"12px 0"}}/>; }

function ImageUploader({images,onChange,label,accent}){
  const ref=useRef();
  const [uploading,setUploading]=useState(false);
  const drop=useCallback(async(files)=>{
    const imgFiles=[...files].filter(f=>f.type.startsWith("image/"));
    if(imgFiles.length===0)return;
    setUploading(true);
    const urls=await Promise.all(imgFiles.map(uploadToCloudinary));
    const valid=urls.filter(Boolean);
    onChange([...(images||[]),...valid]);
    setUploading(false);
  },[images,onChange]);
  return(
    <div>
      <div style={{...S.lbl,color:accent||C.muted}}>{label}</div>
      <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();drop(e.dataTransfer.files);}} onClick={()=>ref.current.click()}
        style={{border:`1px dashed ${C.border}`,borderRadius:6,padding:8,cursor:"pointer",minHeight:52,display:"flex",flexWrap:"wrap",gap:6,alignItems:"center",background:C.bg}}>
        {uploading&&<span style={{color:C.accent,fontSize:11,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>⏳ กำลังอัปโหลด...</span>}
      {!uploading&&(!images||images.length===0)&&<span style={{color:C.muted,fontSize:11,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>DROP / TAP TO UPLOAD</span>}
        {(images||[]).map((src,i)=>(
          <div key={i} style={{position:"relative"}}>
            <img src={src} alt="" style={{width:52,height:52,objectFit:"cover",borderRadius:4,border:`1px solid ${C.border}`}}/>
            <button onClick={e=>{e.stopPropagation();onChange((images||[]).filter((_,j)=>j!==i));}} style={{position:"absolute",top:-5,right:-5,background:C.danger,border:"none",borderRadius:"50%",width:16,height:16,color:"#fff",fontSize:9,cursor:"pointer"}}>✕</button>
          </div>
        ))}
        {images&&images.length>0&&<span style={{color:C.muted,fontSize:18}}>+</span>}
      </div>
      <input ref={ref} type="file" multiple accept="image/*" style={{display:"none"}} onChange={e=>drop(e.target.files)}/>
    </div>
  );
}

function OrderCard({order,onUpdate,onDelete,isBoss}){
  const [open,setOpen]=useState(false);
  const [lightbox,setLightbox]=useState(null);
  const [showShare,setShowShare]=useState(false);
  const st=STATUSES.find(s=>s.key===order.status);
  const pr=PRIORITIES.find(p=>p.key===order.priority);
  const dl=daysLeft(order.deadline);
  const isOverdue=dl<0,isNear=!isOverdue&&dl<=2;
  const remaining=(order.price||0)-(order.deposit||0);
  const nextSt=()=>{ const i=STATUSES.findIndex(s=>s.key===order.status); if(i<STATUSES.length-1)onUpdate({...order,status:STATUSES[i+1].key}); };
  const prevSt=()=>{ const i=STATUSES.findIndex(s=>s.key===order.status); if(i>0)onUpdate({...order,status:STATUSES[i-1].key}); };
  return(
    <>
      {lightbox&&<div onClick={()=>setLightbox(null)} style={{position:"fixed",inset:0,background:"#000000f0",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}><img src={lightbox} alt="" style={{maxWidth:"90vw",maxHeight:"90vh",borderRadius:6}}/></div>}
      <div style={{background:C.surface,border:`1px solid ${open?st.color+"44":C.border}`,borderLeft:`2px solid ${st.color}`,borderRadius:10,marginBottom:8,overflow:"hidden",transition:"all 0.2s"}}>
        <div onClick={()=>setOpen(o=>!o)} style={{padding:"12px 14px",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start"}}>
          <div style={{width:44,height:44,flexShrink:0,borderRadius:6,background:C.bg,border:`1px solid ${C.border}`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
            {(order.designImages?.[0]||order.images?.[0])
              ?<img src={order.designImages?.[0]||order.images[0]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              :<span style={{fontSize:18,opacity:0.4}}>👟</span>}
            {order.designImages?.[0]&&<div style={{position:"absolute",bottom:1,right:1,background:"#000a",borderRadius:2,padding:"1px 3px",fontSize:6,color:C.accent,fontFamily:"'Barlow Condensed', sans-serif"}}>REF</div>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:600,fontSize:17,color:C.text,letterSpacing:0.5}}>{order.customer}</div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:1,flexWrap:"wrap"}}>
                  {order.queueId&&<span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,color:C.accent,letterSpacing:2,background:C.accent+"15",borderRadius:3,padding:"1px 6px"}}>{order.queueId}</span>}
                  {order.orderType&&order.orderType!=="normal"&&(()=>{ const ot=ORDER_TYPES.find(o=>o.key===order.orderType); return ot?<span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,color:ot.color,letterSpacing:1,background:ot.color+"15",borderRadius:3,padding:"1px 6px"}}>{ot.icon} {ot.label}</span>:null; })()}
                  {order.platform&&(()=>{ const pl=PLATFORMS.find(p=>p.key===order.platform); return pl?<span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,color:pl.color,letterSpacing:1}}>{pl.icon} {pl.label}</span>:null; })()}
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
                <Pill color={st.color}>{st.label}</Pill>
                <div style={{fontSize:10,marginTop:3,color:isOverdue?C.danger:isNear?"#C7B98B":C.muted,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>{isOverdue?`OVERDUE ${Math.abs(dl)}d`:`${dl}d`}</div>
                {(order.progress>0)&&<div style={{marginTop:3,height:3,background:C.border,borderRadius:2,width:60,overflow:"hidden"}}><div style={{height:"100%",width:`${order.progress}%`,background:order.progress>=100?C.ok:C.accent,borderRadius:2}}/></div>}
              </div>
            </div>
            <div style={{marginTop:5,display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:11,color:C.muted,letterSpacing:0.5}}>{order.model}</span>
              {order.size&&<Pill color={C.muted}>{order.size}</Pill>}
              <Pill color={pr.color}>{pr.label}</Pill>
              {order.cowork&&<Pill color="#8BA7C7">CO-WORK</Pill>}
              {isBoss&&remaining>0&&!order.fullPaid&&<Pill color={C.danger}>ค้าง ฿{fmt(remaining)}</Pill>}
              {isBoss&&order.fullPaid&&<Pill color={C.ok}>ชำระครบ</Pill>}
            </div>
          </div>
        </div>
        {open&&(
          <div onClick={e=>e.stopPropagation()} style={{borderTop:`1px solid ${C.border}`,padding:"12px 14px"}}>
            {[...(order.images||[]),(order.designImages||[])].flat().length>0&&(
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                {(order.images||[]).map((src,i)=><div key={"s"+i} style={{position:"relative"}}><img onClick={()=>setLightbox(src)} src={src} alt="" style={{width:60,height:60,objectFit:"cover",borderRadius:4,cursor:"zoom-in",border:`1px solid ${C.border}`}}/><div style={{position:"absolute",bottom:2,left:2,background:"#000b",borderRadius:2,padding:"1px 4px",fontSize:7,color:C.accent,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>SHOE</div></div>)}
                {(order.designImages||[]).map((src,i)=><div key={"d"+i} style={{position:"relative"}}><img onClick={()=>setLightbox(src)} src={src} alt="" style={{width:60,height:60,objectFit:"cover",borderRadius:4,cursor:"zoom-in",border:`1px solid ${C.border}`}}/><div style={{position:"absolute",bottom:2,left:2,background:"#000b",borderRadius:2,padding:"1px 4px",fontSize:7,color:"#8BA7C7",fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>REF</div></div>)}
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <ImageUploader label="รูปรองเท้า" accent={C.accent} images={order.images||[]} onChange={v=>onUpdate({...order,images:v})}/>
              <ImageUploader label="ดีไซน์ reference" accent="#8BA7C7" images={order.designImages||[]} onChange={v=>onUpdate({...order,designImages:v})}/>
            </div>

            {/* Co-work section */}
            <div style={{marginBottom:12}}>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:6}}>
                <input type="checkbox" checked={!!order.cowork} onChange={e=>onUpdate({...order,cowork:e.target.checked})} style={{accentColor:"#8BA7C7",width:14,height:14}}/>
                <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:11,color:"#8BA7C7",letterSpacing:2}}>CO-WORK — ทำร่วมกัน</span>
              </label>
              {order.cowork&&(
                <textarea style={{...S.inp,resize:"vertical",minHeight:52,fontSize:12}} value={order.coworkNote||""} onChange={e=>onUpdate({...order,coworkNote:e.target.value})} placeholder="เช่น Otto: วาด / Smallbrush: พ่น+เก็บงาน"/>
              )}
            </div>

            {isBoss&&(
              <div style={{background:C.bg,border:`1px solid ${C.accent}22`,borderRadius:8,padding:"10px 12px",marginBottom:12}}>
                <div style={S.sec(C.accent)}>Finance</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                  <div><label style={S.lbl}>ราคาเต็ม (฿)</label><input type="number" style={S.inp} value={order.price||""} onChange={e=>onUpdate({...order,price:Number(e.target.value)})} placeholder="0"/></div>
                  <div><label style={S.lbl}>มัดจำ (฿)</label><input type="number" style={S.inp} value={order.deposit||""} onChange={e=>onUpdate({...order,deposit:Number(e.target.value)})} placeholder="0"/></div>
                  <div><label style={S.lbl}>ยอดค้าง</label><div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 12px",fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,color:remaining>0?C.danger:C.ok,fontSize:13}}>฿{fmt(remaining>0?remaining:0)}</div></div>
                </div>
                <div style={{display:"flex",gap:16}}>
                  <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif"}}><input type="checkbox" checked={!!order.depositPaid} onChange={e=>onUpdate({...order,depositPaid:e.target.checked})} style={{accentColor:C.accent}}/>รับมัดจำแล้ว</label>
                  <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif"}}><input type="checkbox" checked={!!order.fullPaid} onChange={e=>onUpdate({...order,fullPaid:e.target.checked})} style={{accentColor:C.ok}}/>ชำระครบแล้ว</label>
                </div>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div><label style={S.lbl}>Assignee</label><select style={S.inp} value={order.assignee} onChange={e=>onUpdate({...order,assignee:e.target.value})}>{TEAM.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={S.lbl}>Priority</label><select style={S.inp} value={order.priority} onChange={e=>onUpdate({...order,priority:e.target.value})}>{PRIORITIES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
            </div>
            <div style={{marginBottom:10}}>
              <label style={S.lbl}>แพลตฟอร์มลูกค้า</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {PLATFORMS.map(pl=>(
                  <button key={pl.key} onClick={()=>onUpdate({...order,platform:pl.key})} style={{padding:"6px 10px",background:order.platform===pl.key?pl.color+"20":"transparent",color:order.platform===pl.key?pl.color:C.muted,border:`1px solid ${order.platform===pl.key?pl.color+"60":C.border}`,borderRadius:6,fontFamily:"'Barlow Condensed', sans-serif",fontSize:10,letterSpacing:1,cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",gap:4}}>
                    <span>{pl.icon}</span><span>{pl.label}</span>
                  </button>
                ))}
                {order.platform&&<button onClick={()=>onUpdate({...order,platform:""})} style={{padding:"6px 8px",background:"transparent",color:C.muted,border:`1px solid ${C.border}`,borderRadius:6,fontSize:9,cursor:"pointer"}}>✕</button>}
              </div>
            </div>
            {order.note&&<div style={{marginBottom:10,padding:"8px 10px",background:C.bg,borderRadius:6,borderLeft:`2px solid ${C.border}`}}><div style={{fontSize:9,letterSpacing:2,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif",marginBottom:2}}>NOTE</div><div style={{fontSize:13,color:C.muted,fontFamily:"'Cormorant Garamond', serif"}}>{order.note}</div></div>}

            {/* Progress bar */}
            <div style={{marginBottom:12,background:C.bg,borderRadius:8,padding:"10px 12px",border:`1px solid ${C.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div>
                  <div style={S.lbl}>ความคืบหน้า</div>
                  {order.estimatedDays&&<div style={{fontSize:9,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif"}}>ประมาณ {order.estimatedDays} วัน · {order.size}</div>}
                </div>
                <div style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:700,fontSize:22,color:order.progress>=100?C.ok:C.accent}}>{Math.round(order.progress||0)}%</div>
              </div>
              {/* Drag slider */}
              <div style={{position:"relative",height:32,display:"flex",alignItems:"center"}}>
                <div style={{position:"absolute",width:"100%",height:8,background:C.border,borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${order.progress||0}%`,background:order.progress>=100?C.ok:C.accent,borderRadius:4,transition:"width 0.2s"}}/>
                </div>
                <input type="range" min="0" max="100" step="5" value={order.progress||0}
                  onChange={e=>onUpdate({...order,progress:Number(e.target.value)})}
                  style={{position:"absolute",width:"100%",opacity:0,cursor:"pointer",height:32}}/>
                <div style={{position:"absolute",left:`calc(${order.progress||0}% - 10px)`,width:20,height:20,background:order.progress>=100?C.ok:C.accent,borderRadius:"50%",border:`2px solid ${C.bg}`,boxShadow:"0 2px 6px #0006",pointerEvents:"none",transition:"left 0.2s"}}/>
              </div>
              {/* KPI reference */}
              {order.estimatedDays&&(
                <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                  {[{label:"1 วัน",pct:Math.round(100/order.estimatedDays)},{label:"แบ่งครึ่ง",pct:50},{label:"เสร็จ",pct:100}].map(({label,pct})=>(
                    <button key={pct} onClick={()=>onUpdate({...order,progress:pct})} style={{fontSize:9,color:C.muted,background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"2px 8px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>{label} ({pct}%)</button>
                  ))}
                </div>
              )}
            </div>
            <Divider/>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {order.status!=="queue"&&<button onClick={prevSt} style={{flex:1,minWidth:60,background:C.bg,color:C.muted,border:`1px solid ${C.border}`,borderRadius:6,padding:"7px",fontSize:11,cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>← BACK</button>}
              {order.status!=="done"&&<button onClick={nextSt} style={{flex:2,minWidth:80,background:"transparent",color:st.color,border:`1px solid ${st.color}`,borderRadius:6,padding:"7px",fontSize:11,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,letterSpacing:2,cursor:"pointer"}}>{order.status==="queue"?"START →":order.status==="inprogress"?"SEND FOR REVIEW →":"MARK DONE ✓"}</button>}
              <a href={calUrl(order)} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",padding:"7px 10px",background:C.bg,color:C.muted,border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,textDecoration:"none",fontFamily:"'Barlow Condensed', sans-serif"}}>📅</a>
              <button onClick={()=>setShowShare(s=>!s)} style={{padding:"7px 10px",background:showShare?C.accent+"20":"transparent",color:C.accent,border:`1px solid ${C.accent}44`,borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>SHARE</button>
              {isBoss&&<button onClick={()=>onDelete(order.id)} style={{padding:"7px 10px",background:"transparent",color:C.danger,border:`1px solid ${C.danger}30`,borderRadius:6,fontSize:11,cursor:"pointer"}}>✕</button>}
            </div>
          {showShare&&(
            <div style={{marginTop:10,background:C.bg,border:`1px solid ${C.accent}33`,borderRadius:8,padding:"12px 14px"}}>
              <div style={S.sec(C.accent)}>Share ให้ลูกค้า</div>
              <div style={{marginBottom:10}}>
                <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,color:C.muted,letterSpacing:2,marginBottom:6}}>LINK — ลูกค้าเปิดดูสถานะได้เลย</div>
                <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:C.muted,fontFamily:"'Cormorant Garamond', serif",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {`${window.location.origin}?order=${order.id}&view=customer`}
                  </span>
                  <button onClick={()=>{ const url=`${window.location.origin}?order=${order.id}&view=customer`; if(navigator.share){navigator.share({title:`ออเดอร์ ${order.customer}`,text:`ติดตามสถานะงาน: ${order.model}`,url})}else{navigator.clipboard.writeText(url).then(()=>alert("คัดลอกลิงก์แล้ว!")); } }} style={{background:C.accent,color:C.bg,border:"none",borderRadius:5,padding:"5px 10px",fontSize:10,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",letterSpacing:1}}>COPY / SHARE</button>
                </div>
              </div>
              <div>
                <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,color:C.muted,letterSpacing:2,marginBottom:6}}>PDF — ใบงานสำหรับส่ง Line / IG</div>
                <button onClick={()=>{
                  const w=window.open("","_blank");
                  const st2=STATUSES.find(s=>s.key===order.status);
                  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>ใบงาน ${order.customer}</title><style>
                    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Barlow+Condensed:wght@400;600;700&display=swap');
                    *{margin:0;padding:0;box-sizing:border-box;}
                    body{background:#fff;font-family:'Cormorant Garamond',serif;color:#1a1a1a;padding:40px;max-width:600px;margin:0 auto;}
                    .brand{font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:6px;color:#888;margin-bottom:4px;}
                    h1{font-size:28px;font-weight:700;letter-spacing:2px;margin-bottom:4px;}
                    .order-id{font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:3px;color:#aaa;margin-bottom:32px;}
                    .divider{height:1px;background:#eee;margin:20px 0;}
                    .row{display:flex;justify-content:space-between;margin-bottom:12px;}
                    .label{font-family:'Barlow Condensed',sans-serif;font-size:9px;letter-spacing:3px;color:#999;text-transform:uppercase;}
                    .value{font-size:16px;color:#1a1a1a;font-weight:600;}
                    .status{display:inline-block;background:#f5f0e8;color:#b8902a;padding:4px 14px;border-radius:4px;font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:3px;font-weight:700;}
                    .note{background:#f9f7f4;border-left:2px solid #e8dcc8;padding:12px 16px;border-radius:4px;font-size:14px;color:#555;line-height:1.6;}
                    .footer{margin-top:40px;text-align:center;font-family:'Barlow Condensed',sans-serif;font-size:9px;letter-spacing:3px;color:#ccc;}
                    .deadline{color:${daysLeft(order.deadline)<0?"#c97a7a":daysLeft(order.deadline)<=2?"#b8a020":"#555"};}
                    @media print{body{padding:20px;}}
                  </style></head><body>
                    <div class="brand">CUSTOMIT THAILAND</div>
                    <h1>${order.customer}</h1>
                    <div class="order-id">ORDER #${order.id} &nbsp;·&nbsp; ${order.ig||""}</div>
                    <div class="row"><div><div class="label">สถานะ</div><div style="margin-top:6px"><span class="status">${st2?.th||st2?.label}</span></div></div><div style="text-align:right"><div class="label">กำหนดส่ง</div><div class="value deadline" style="margin-top:6px">${order.deadline}</div></div></div>
                    <div class="divider"></div>
                    <div class="row"><div><div class="label">รุ่นรองเท้า</div><div class="value" style="margin-top:4px">${order.model}</div></div><div style="text-align:right"><div class="label">ขนาดงาน</div><div class="value" style="margin-top:4px">${order.size||"—"}</div></div></div>
                    ${order.note?`<div class="divider"></div><div class="label" style="margin-bottom:8px">รายละเอียดดีไซน์</div><div class="note">${order.note}</div>`:""}
                    ${order.cowork&&order.coworkNote?`<div class="divider"></div><div class="label" style="margin-bottom:8px">การแบ่งงาน</div><div class="note">${order.coworkNote}</div>`:""}
                    <div class="divider"></div>
                    <div class="footer">CUSTOMIT THAILAND &nbsp;·&nbsp; HANDCRAFTED CUSTOM SHOES</div>
                    <script>window.print();</script>
                  </body></html>`);
                  w.document.close();
                }} style={{width:"100%",background:"transparent",color:C.text,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px",fontSize:11,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,cursor:"pointer",letterSpacing:2}}>EXPORT PDF / PRINT</button>
              </div>
            </div>
          )}
          </div>
        )}
      </div>
    </>
  );
}

function AddModal({onClose,onAdd,nextId,isBoss}){
  const blank={customer:"",ig:"",model:SHOE_TYPES[0],customModel:"",size:"กลาง",estimatedDays:"",deadline:"",priority:"normal",assignee:TEAM[0],note:"",images:[],designImages:[],price:"",deposit:"",depositPaid:false,fullPaid:false,cowork:false,coworkNote:"",platform:"",orderType:"normal",progress:0};
  const [form,setForm]=useState(blank);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const ok=!!(form.customer&&form.deadline);
  return(
    <div style={{position:"fixed",inset:0,background:"#000000d0",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderTop:`2px solid ${C.accent}`,borderRadius:"12px 12px 0 0",padding:20,width:"100%",maxWidth:480,maxHeight:"94vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:700,fontSize:22,color:C.text,letterSpacing:1}}>New Order</div><div style={{fontSize:9,color:C.muted,letterSpacing:3,fontFamily:"'Barlow Condensed', sans-serif"}}>CUSTOMIT THAILAND</div></div>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,color:C.muted,fontSize:14,cursor:"pointer",width:30,height:30}}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div><label style={S.lbl}>Customer *</label><input style={S.inp} value={form.customer} onChange={e=>set("customer",e.target.value)} placeholder="ชื่อลูกค้า"/></div>
          <div>
            <label style={S.lbl}>แพลตฟอร์มลูกค้า</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {PLATFORMS.map(pl=>(
                <button key={pl.key} onClick={()=>set("platform",form.platform===pl.key?"":pl.key)} style={{padding:"6px 10px",background:form.platform===pl.key?pl.color+"20":"transparent",color:form.platform===pl.key?pl.color:C.muted,border:`1px solid ${form.platform===pl.key?pl.color+"60":C.border}`,borderRadius:6,fontFamily:"'Barlow Condensed', sans-serif",fontSize:10,letterSpacing:1,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                  <span>{pl.icon}</span><span>{pl.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
            <div>
              <label style={S.lbl}>Shoe Model</label>
              <select style={S.inp} value={form.model} onChange={e=>set("model",e.target.value)}>{SHOE_TYPES.map(t=><option key={t}>{t}</option>)}</select>
              {form.model==="อื่นๆ"&&<input style={{...S.inp,marginTop:6}} value={form.customModel||""} onChange={e=>set("customModel",e.target.value)} placeholder="พิมพ์รุ่นรองเท้า..."/>}
            </div>
            <div><label style={S.lbl}>ขนาด</label><select style={S.inp} value={form.size} onChange={e=>set("size",e.target.value)}>{SHOE_SIZES.map(t=><option key={t}>{t}</option>)}</select></div>
          </div>
          {form.size==="กำหนดเอง"&&(
            <div><label style={S.lbl}>จำนวนวันที่ใช้ทำ (วัน)</label><input type="number" min="1" style={S.inp} value={form.estimatedDays} onChange={e=>set("estimatedDays",e.target.value)} placeholder="เช่น 7 วัน"/></div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <div><label style={S.lbl}>Deadline *</label><input type="date" style={S.inp} value={form.deadline} onChange={e=>set("deadline",e.target.value)}/></div>
            <div><label style={S.lbl}>Priority</label><select style={S.inp} value={form.priority} onChange={e=>set("priority",e.target.value)}>{PRIORITIES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
            <div><label style={S.lbl}>Assignee</label><select style={S.inp} value={form.assignee} onChange={e=>set("assignee",e.target.value)}>{TEAM.map(t=><option key={t}>{t}</option>)}</select></div>
          </div>
          <div><label style={S.lbl}>Design Note</label><textarea style={{...S.inp,resize:"vertical",minHeight:60}} value={form.note} onChange={e=>set("note",e.target.value)} placeholder="ลาย, สี, สไตล์..."/></div>
          <div>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:6}}>
              <input type="checkbox" checked={form.cowork} onChange={e=>set("cowork",e.target.checked)} style={{accentColor:"#8BA7C7",width:14,height:14}}/>
              <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:11,color:"#8BA7C7",letterSpacing:2}}>CO-WORK — ทำร่วมกัน</span>
            </label>
            {form.cowork&&<textarea style={{...S.inp,resize:"vertical",minHeight:48,fontSize:12}} value={form.coworkNote} onChange={e=>set("coworkNote",e.target.value)} placeholder="Otto: วาด / Smallbrush: พ่น+เก็บงาน"/>}
          </div>
          <div>
            <label style={S.lbl}>ประเภทงาน</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {ORDER_TYPES.map(ot=>(
                <button key={ot.key} onClick={()=>set("orderType",ot.key)} style={{padding:"6px 10px",background:form.orderType===ot.key?ot.color+"22":"transparent",color:form.orderType===ot.key?ot.color:C.muted,border:`1px solid ${form.orderType===ot.key?ot.color+"55":C.border}`,borderRadius:6,fontFamily:"'Barlow Condensed', sans-serif",fontSize:10,letterSpacing:1,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                  <span>{ot.icon}</span><span>{ot.label}</span>
                </button>
              ))}
            </div>
          </div>
          {isBoss&&form.orderType==="normal"&&<div style={{background:C.bg,border:`1px solid ${C.accent}22`,borderRadius:8,padding:"10px 12px"}}>
            <div style={S.sec(C.accent)}>Finance</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><label style={S.lbl}>ราคาเต็ม (฿)</label><input type="number" style={S.inp} value={form.price} onChange={e=>set("price",e.target.value)} placeholder="0"/></div>
              <div><label style={S.lbl}>มัดจำ (฿)</label><input type="number" style={S.inp} value={form.deposit} onChange={e=>set("deposit",e.target.value)} placeholder="0"/></div>
            </div>
          </div>}
          {isBoss&&form.orderType!=="normal"&&<div style={{background:C.bg,border:`1px solid ${C.ok}22`,borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:10,color:C.ok,letterSpacing:2}}>{ORDER_TYPES.find(o=>o.key===form.orderType)?.icon} {ORDER_TYPES.find(o=>o.key===form.orderType)?.label} — ไม่คิดค่าใช้จ่าย</div>
          </div>}
          <ImageUploader label="รูปรองเท้า" accent={C.accent} images={form.images} onChange={v=>set("images",v)}/>
          <ImageUploader label="ดีไซน์ Reference" accent="#8BA7C7" images={form.designImages} onChange={v=>set("designImages",v)}/>
        </div>
        <button onClick={()=>{ if(ok){ const finalModel=form.model==="อื่นๆ"&&form.customModel?form.customModel:form.model; const created=Date.now(); const estDays=form.size==="กำหนดเอง"?Number(form.estimatedDays)||1:SIZE_DAYS[form.size]||1; onAdd({...form,model:finalModel,id:nextId,queueId:genQueueId(created,nextId),price:Number(form.price)||0,deposit:Number(form.deposit)||0,status:"queue",created,estimatedDays:estDays,progress:0}); onClose(); } }}
          style={{marginTop:16,width:"100%",background:ok?C.accent:"#1a1a1a",color:ok?C.bg:"#333",border:"none",borderRadius:8,padding:12,fontSize:13,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,letterSpacing:3,cursor:ok?"pointer":"default",transition:"all 0.2s"}}>
          ADD TO QUEUE
        </button>
      </div>
    </div>
  );
}

function CalView({orders,workPlans,workSchedules}){
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
  const todayD=new Date();
  const ws=new Date(todayD); ws.setDate(todayD.getDate()-((todayD.getDay()+6)%7));
  const weekDays=Array.from({length:7},(_,i)=>{ const d=new Date(ws); d.setDate(ws.getDate()+i); return d; });
  const DA=["SUN","MON","TUE","WED","THU","FRI","SAT"];
  return(
    <div>
      <div style={{display:"flex",gap:6,marginBottom:14,background:C.bg,borderRadius:8,padding:4}}>
        {[{k:"week",label:"Weekly Plan"},{k:"month",label:"Monthly"}].map(t=>(
          <button key={t.k} onClick={()=>setCalTab(t.k)} style={{flex:1,padding:"7px",background:calTab===t.k?C.surface:"transparent",color:calTab===t.k?C.text:C.muted,border:calTab===t.k?`1px solid ${C.border}`:"1px solid transparent",borderRadius:6,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,fontSize:11,letterSpacing:1,cursor:"pointer"}}>{t.label}</button>
        ))}
      </div>
      {calTab==="week"&&(
        <div>
          <div style={{fontSize:9,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:2,textAlign:"center",marginBottom:12}}>
            {weekDays[0].getDate()} – {weekDays[6].getDate()} {MONTHS_TH[weekDays[0].getMonth()]} {weekDays[0].getFullYear()}
          </div>
          {weekDays.map((wd)=>{
            const dk=wd.toISOString().slice(0,10);
            const dayPlan=workPlans?.[dk]||{};
            const isToday=dk===todayKey();
            const dayOrders=orders.filter(o=>o.deadline===dk);
            return(
              <div key={dk} style={{background:isToday?C.surface:C.bg,border:`1px solid ${isToday?C.accent+"44":C.border}`,borderRadius:8,padding:"10px 12px",marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:Object.keys(dayPlan).length>0?8:0}}>
                  <div>
                    <span style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:600,fontSize:15,color:isToday?C.accent:C.text}}>{DA_TH[wd.getDay()]} {wd.getDate()} {MONTHS_TH[wd.getMonth()]}</span>
                    {isToday&&<span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:8,color:C.accent,letterSpacing:2,marginLeft:8}}>TODAY</span>}
                  </div>
                  {dayOrders.length>0&&<span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,color:C.muted}}>📦 {dayOrders.length}</span>}
                </div>
                {/* Multi-day schedules */}
                {(workSchedules||[]).filter(s=>{ const dates=[]; for(let i=0;i<s.days;i++){const d=new Date(s.startDate);d.setDate(d.getDate()+i);dates.push(d.toISOString().slice(0,10));}return dates.includes(dk); }).map((s,i)=>{
                  const order=orders.find(o=>String(o.id)===String(s.orderId));
                  const st2=order?STATUSES.find(st=>st.key===order.status):null;
                  const isStart=dk===s.startDate;
                  const endDate=new Date(s.startDate); endDate.setDate(endDate.getDate()+s.days-1);
                  const isEnd=dk===endDate.toISOString().slice(0,10);
                  return(
                    <div key={"ws"+i} style={{background:st2?.color+"25"||C.accent+"25",border:`1px solid ${st2?.color||C.accent}55`,borderLeft:isStart?`3px solid ${st2?.color||C.accent}`:"none",borderRight:isEnd?`1px solid ${st2?.color||C.accent}55`:"none",borderRadius:isStart?"4px 0 0 4px":isEnd?"0 4px 4px 0":"0",padding:"4px 8px",marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontFamily:"'Cormorant Garamond', serif",fontSize:12,color:st2?.color||C.accent,fontWeight:600}}>{isStart?"▶ ":""}{order?.customer||"?"}</span>
                      <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,color:C.muted}}>{s.assignee}</span>
                      {isStart&&<span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:8,color:C.muted,marginLeft:"auto"}}>{s.days}วัน</span>}
                    </div>
                  );
                })}
                {Object.keys(dayPlan).length===0
                  ?null
                  :TEAM.filter(m=>dayPlan[m]).map(m=>{
                    const dtObj=DAY_TYPES.find(d=>d.key===dayPlan[m]);
                    return(
                      <div key={m} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:11,color:C.muted,minWidth:80}}>{m}</span>
                        <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,fontSize:9,color:dtObj?.color,background:dtObj?.color+"15",border:`1px solid ${dtObj?.color}30`,borderRadius:3,padding:"2px 8px",letterSpacing:1}}>{dtObj?.label}</span>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      )}
      {calTab==="month"&&(
        <>
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <button onClick={()=>{ if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,padding:"4px 12px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>‹</button>
              <span style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:600,fontSize:16,color:C.text}}>{MONTHS_TH[month]} {year}</span>
              <button onClick={()=>{ if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,padding:"4px 12px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>›</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>{DA.map(d=><div key={d} style={{textAlign:"center",fontSize:7,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:0.5}}>{d}</div>)}</div>
            {weeks.map((wk,wi)=>(
              <div key={wi} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
                {wk.map((day,di)=>{
                  const ords=(day?byDay[day]:null)||[];
                  const isToday=day===now.getDate()&&month===now.getMonth()&&year===now.getFullYear();
                  const dk=day?`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`:null;
                  const planTypes=dk?[...new Set(Object.values(workPlans?.[dk]||{}))]:[];
                  return(
                    <div key={di} style={{minHeight:40,background:day?(isToday?C.surface:C.bg):"transparent",borderRadius:4,padding:"3px",border:isToday?`1px solid ${C.accent}44`:`1px solid transparent`}}>
                      {day&&<div style={{fontSize:8,color:isToday?C.accent:C.muted,fontFamily:"'Barlow Condensed', sans-serif"}}>{day}</div>}
                      {ords.map((o,i)=>{ const st=STATUSES.find(s=>s.key===o.status); return <div key={"o"+i} style={{fontSize:6,background:st.color+"22",color:st.color,border:`1px solid ${st.color}33`,borderRadius:2,padding:"1px 2px",marginTop:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",fontFamily:"'Barlow Condensed', sans-serif"}}>{o.customer}</div>; })}
                      {planTypes.map((pt,i)=>{ const dt=DAY_TYPES.find(d=>d.key===pt); return dt?<div key={"p"+i} style={{fontSize:5,background:dt.color+"15",color:dt.color,borderRadius:2,padding:"1px 2px",marginTop:1,border:`1px solid ${dt.color}25`,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:0.5}}>{dt.short}</div>:null; })}
                      {(workSchedules||[]).filter(s=>{ const dates=[]; for(let i=0;i<s.days;i++){const d=new Date(s.startDate);d.setDate(d.getDate()+i);dates.push(d.toISOString().slice(0,10));} return dk&&dates.includes(dk); }).map((s,i)=>{
                        const order=orders.find(o=>String(o.id)===String(s.orderId));
                        const st2=order?STATUSES.find(st=>st.key===order.status):null;
                        const isStart=dk===s.startDate;
                        const endDate=new Date(s.startDate); endDate.setDate(endDate.getDate()+s.days-1);
                        const isEnd=dk===endDate.toISOString().slice(0,10);
                        return <div key={"ws"+i} style={{fontSize:5,background:st2?.color||C.accent,color:"#000",borderRadius:isStart?"3px 0 0 3px":isEnd?"0 3px 3px 0":"0",padding:"2px 2px",marginTop:1,overflow:"hidden",whiteSpace:"nowrap",fontFamily:"'Barlow Condensed', sans-serif",fontWeight:800,opacity:0.85}}>{isStart?(order?.customer||"?"):""}</div>;
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {orders.filter(o=>o.status!=="done").sort((a,b)=>new Date(a.deadline)-new Date(b.deadline)).slice(0,5).map(o=>{
            const st=STATUSES.find(s=>s.key===o.status); const dl=daysLeft(o.deadline);
            return <div key={o.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:C.surface,borderRadius:8,marginBottom:5,borderLeft:`2px solid ${st.color}`}}>
              <div><span style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:600,fontSize:14,color:C.text}}>{o.customer}</span><span style={{fontSize:10,color:C.muted,marginLeft:8,fontFamily:"'Barlow Condensed', sans-serif"}}>{o.model}</span></div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <a href={calUrl(o)} target="_blank" rel="noreferrer" style={{fontSize:8,color:C.muted,textDecoration:"none",fontFamily:"'Barlow Condensed', sans-serif",background:C.bg,border:`1px solid ${C.border}`,borderRadius:3,padding:"2px 6px"}}>+CAL</a>
                <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:10,color:dl<0?C.danger:dl<=2?"#C7B98B":C.muted}}>{dl<0?"OVERDUE":`${dl}d`}</span>
              </div>
            </div>;
          })}
        </>
      )}
    </div>
  );
}

function WorkPlanner({workPlans,setWorkPlans,workSchedules,setWorkSchedules,orders}){
  const [showAddSchedule,setShowAddSchedule]=useState(false);
  const [newSched,setNewSched]=useState({orderId:"",startDate:todayKey(),days:1,assignee:TEAM[0]});

  const addSchedule=()=>{
    if(!newSched.orderId||!newSched.startDate) return;
    setWorkSchedules(s=>[...s,{id:Date.now(),...newSched,days:Number(newSched.days)||1}]);
    setShowAddSchedule(false);
    setNewSched({orderId:"",startDate:todayKey(),days:1,assignee:TEAM[0]});
  };
  const delSchedule=id=>setWorkSchedules(s=>s.filter(x=>x.id!==id));

  // Get dates covered by a schedule
  function schedDates(s){
    const dates=[];
    for(let i=0;i<s.days;i++){
      const d=new Date(s.startDate); d.setDate(d.getDate()+i);
      dates.push(d.toISOString().slice(0,10));
    }
    return dates;
  }

  const now=new Date();
  const ws=new Date(now); ws.setDate(now.getDate()-((now.getDay()+6)%7));
  const days=Array.from({length:14},(_,i)=>{ const d=new Date(ws); d.setDate(ws.getDate()+i); return d; });
  const set=(dk,member,dayType)=>{
    setWorkPlans(p=>{ const cur=p[dk]||{}; const updated=dayType?{...cur,[member]:dayType}:{...cur}; if(!dayType)delete updated[member]; return {...p,[dk]:updated}; });
  };
  const applyAll=(dk,dayType)=>{ TEAM.forEach(m=>set(dk,m,dayType)); };
  return(
    <div>
      <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,color:C.muted,letterSpacing:2,marginBottom:14}}>กำหนดแผนงานรายวัน — พนักงานเห็นใน Calendar</div>
      {days.map(wd=>{
        const dk=wd.toISOString().slice(0,10);
        const dayPlan=workPlans[dk]||{};
        const isToday=dk===todayKey();
        const isPast=wd<new Date(new Date().setHours(0,0,0,0));
        const dow=["อา","จ","อ","พ","พฤ","ศ","ส"][wd.getDay()];
        return(
          <div key={dk} style={{background:isToday?C.surface:C.bg,border:`1px solid ${isToday?C.accent+"44":C.border}`,borderRadius:8,padding:"10px 12px",marginBottom:6,opacity:isPast?0.5:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:600,fontSize:14,color:isToday?C.accent:C.text}}>
                {dow} {wd.getDate()} {MONTHS_TH[wd.getMonth()]}
                {isToday&&<span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:8,color:C.accent,letterSpacing:2,marginLeft:8}}>TODAY</span>}
              </span>
              <div style={{display:"flex",gap:4}}>
                {DAY_TYPES.map(dt=>(<button key={dt.key} onClick={()=>applyAll(dk,dt.key)} style={{fontSize:7,letterSpacing:1,background:dt.color+"15",color:dt.color,border:`1px solid ${dt.color}30`,borderRadius:3,padding:"2px 6px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>{dt.short}</button>))}
                <button onClick={()=>applyAll(dk,null)} style={{fontSize:7,background:C.surface,color:C.muted,border:`1px solid ${C.border}`,borderRadius:3,padding:"2px 6px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>CLR</button>
              </div>
            </div>
            {TEAM.map(m=>{
              const cur=dayPlan[m];
              return(
                <div key={m} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                  <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:11,color:C.muted,minWidth:80}}>{m}</span>
                  <div style={{display:"flex",gap:4,flex:1}}>
                    {DAY_TYPES.map(dt=>(<button key={dt.key} onClick={()=>set(dk,m,cur===dt.key?null:dt.key)} style={{flex:1,padding:"5px 2px",background:cur===dt.key?dt.color+"25":"transparent",color:cur===dt.key?dt.color:C.muted,border:`1px solid ${cur===dt.key?dt.color+"60":C.border}`,borderRadius:5,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,fontSize:9,letterSpacing:1,cursor:"pointer",transition:"all 0.15s"}}>{dt.short}</button>))}
                    {cur&&<button onClick={()=>set(dk,m,null)} style={{padding:"5px 7px",background:"transparent",color:C.muted,border:`1px solid ${C.border}`,borderRadius:5,fontSize:9,cursor:"pointer"}}>✕</button>}
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

function KpiTracker({isBoss,workPlans,orders}){
  const [logs,setLogs]=useState(()=>loadData("cit-kpi-logs",{}));
  const [selDate,setSelDate]=useState(todayKey());
  const [selMember,setSelMember]=useState(TEAM[0]);
  useEffect(()=>{ saveData("cit-kpi-logs",logs); },[logs]);
  const assignedDayType=workPlans?.[selDate]?.[selMember]||null;
  const key=`${selDate}__${selMember}`;
  const entry=logs[key]||{ dayType:assignedDayType||"production", production:{}, content:{}, design:{}, note:"", bossComment:"" };
  const setEntry=u=>{
    const next={...logs,[key]:u};
    setLogs(next);
    saveData("cit-kpi-logs",next);
    fsSet("cit-kpi-logs",next);
  };
  const setField=(sec,fld,val)=>setEntry({...entry,[sec]:{...(entry[sec]||{}),[fld]:Number(val)||0}});
  const dt=assignedDayType||entry.dayType;
  const passed=kpiPass({...entry,dayType:dt});
  const teamSummary=isBoss?TEAM.map(m=>{ const e=logs[`${selDate}__${m}`]; const assigned=workPlans?.[selDate]?.[m]||null; if(!e&&!assigned)return{m,logged:false,assigned:null}; const eff=assigned||e?.dayType; const linkedOrders=(e?.linkedOrders||[]).map(id=>orders?.find(o=>String(o.id)===String(id))).filter(Boolean); return{m,logged:!!e,ok:e?kpiPass({...e,dayType:eff}):false,dayType:eff,assigned,linkedOrders}; }):[];
  const dtObj=DAY_TYPES.find(d=>d.key===dt);

  // Production KPI: show which SIZE threshold applies + footage always
  const prodSizeOk=(entry.production?.small||0)>=KPI_TARGET.production.small||(entry.production?.medium||0)>=KPI_TARGET.production.medium||(entry.production?.large||0)>=KPI_TARGET.production.large;
  const footageOk=(entry.production?.footage||0)>=KPI_TARGET.production.footage;

  const numRow=(sec,fld,label,target,unit,alwaysRequired)=>(
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <div>
          <label style={S.lbl}>{label}</label>
          {alwaysRequired&&<span style={{fontSize:8,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>ทำทุกวัน</span>}
        </div>
        <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:10,color:(entry[sec]?.[fld]||0)>=target?C.ok:C.danger}}>{entry[sec]?.[fld]||0}{unit} / {target}{unit}</span>
      </div>
      <input type="number" min="0" step="0.25" style={S.inp} value={entry[sec]?.[fld]||""} onChange={e=>setField(sec,fld,e.target.value)} placeholder="0"/>
      <div style={{marginTop:4}}><Bar pct={((entry[sec]?.[fld]||0)/target)*100} color={(entry[sec]?.[fld]||0)>=target?C.ok:C.danger}/></div>
    </div>
  );

  return(
    <div>
      {isBoss&&(
        <div style={S.card}>
          <div style={S.sec()}>Team — {selDate}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {teamSummary.map(({m,logged,ok,dayType,assigned})=>{
              const dtc=DAY_TYPES.find(d=>d.key===dayType);
              return(
                <div key={m} onClick={()=>setSelMember(m)} style={{flex:1,minWidth:80,background:selMember===m?C.surface:C.bg,border:`1px solid ${selMember===m?C.accent:C.border}`,borderRadius:8,padding:"8px 6px",cursor:"pointer",textAlign:"center"}}>
                  <div style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:600,fontSize:13,color:C.text,marginBottom:3}}>{m}</div>
                  {dtc&&<div style={{fontSize:8,color:dtc.color,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1,marginBottom:3}}>{dtc.short}</div>}
                  {logged?<div style={{fontSize:13}}>{ok?"✓":"✗"}<span style={{fontSize:9,color:ok?C.ok:C.danger,fontFamily:"'Barlow Condensed', sans-serif",marginLeft:2}}>{ok?"PASS":"MISS"}</span></div>:<div style={{fontSize:9,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif"}}>{assigned?"—":"NO PLAN"}</div>}
                  {logged&&teamSummary.find(x=>x.m===m)?.linkedOrders?.length>0&&<div style={{fontSize:7,color:C.accent,fontFamily:"'Barlow Condensed', sans-serif",marginTop:2,letterSpacing:0.5}}>{teamSummary.find(x=>x.m===m).linkedOrders.map(o=>o.customer).join(", ")}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:isBoss?"1fr 1fr":"1fr",gap:10,marginBottom:12}}>
        <div><label style={S.lbl}>วันที่</label><input type="date" style={S.inp} value={selDate} onChange={e=>setSelDate(e.target.value)}/></div>
        {isBoss&&<div><label style={S.lbl}>ช่าง</label><select style={S.inp} value={selMember} onChange={e=>setSelMember(e.target.value)}>{TEAM.map(t=><option key={t}>{t}</option>)}</select></div>}
      </div>
      {assignedDayType?(
        <div style={{background:dtObj?.color+"12",border:`1px solid ${dtObj?.color}30`,borderRadius:8,padding:"8px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:12,color:dtObj?.color,letterSpacing:2}}>{dtObj?.label}</span>
          <span style={{fontSize:10,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif"}}>— กำหนดโดย Smallbrush</span>
        </div>
      ):(
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",marginBottom:12}}>
          <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:10,color:C.muted}}>ยังไม่มีแผนงานสำหรับวันนี้</span>
        </div>
      )}
      <div style={S.card}>
        <div style={S.sec(dtObj?.color)}>{dtObj?.label}</div>

        {dt==="production"&&(
          <>
            {/* Order linking for Production Day */}
            <div style={{background:C.bg,border:`1px solid ${C.accent}33`,borderRadius:8,padding:"10px 12px",marginBottom:12}}>
              <div style={S.sec(C.accent)}>ออเดอร์ที่ทำวันนี้</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {orders.filter(o=>o.status!=="done").map(o=>{
                  const linked=(entry.linkedOrders||[]).includes(String(o.id));
                  const st2=STATUSES.find(s=>s.key===o.status);
                  return(
                    <button key={o.id} onClick={()=>{
                      const cur=entry.linkedOrders||[];
                      const next=linked?cur.filter(x=>x!==String(o.id)):[...cur,String(o.id)];
                      setEntry({...entry,linkedOrders:next});
                    }} style={{padding:"5px 10px",background:linked?st2?.color+"25":"transparent",color:linked?st2?.color:C.muted,border:`1px solid ${linked?st2?.color+"55":C.border}`,borderRadius:6,fontFamily:"'Barlow Condensed', sans-serif",fontSize:10,letterSpacing:0.5,cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",gap:4}}>
                      {linked&&<span>✓</span>}
                      <span>{o.customer}</span>
                      <span style={{fontSize:8,opacity:0.7}}>{o.model?.split(" ").slice(0,2).join(" ")}</span>
                    </button>
                  );
                })}
                {orders.filter(o=>o.status!=="done").length===0&&<span style={{fontSize:11,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif"}}>ไม่มีออเดอร์ที่กำลังทำ</span>}
              </div>
            </div>
            <div style={{background:C.bg,borderRadius:6,padding:"8px 10px",marginBottom:12,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:9,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1,marginBottom:2}}>ต้องทำอย่างใดอย่างหนึ่ง</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                {[{fld:"small",label:"เล็ก",target:1.5},{fld:"medium",label:"กลาง",target:1},{fld:"large",label:"ใหญ่",target:0.25}].map(({fld,label,target})=>{
                  const val=entry.production?.[fld]||0;
                  const ok2=val>=target;
                  return(
                    <div key={fld} style={{background:ok2?C.ok+"15":C.surface,border:`1px solid ${ok2?C.ok+"44":C.border}`,borderRadius:6,padding:"8px"}}>
                      <div style={{fontSize:9,color:ok2?C.ok:C.muted,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1,marginBottom:4}}>{label} (≥{target})</div>
                      <input type="number" min="0" step="0.25" style={{...S.inp,padding:"6px 8px",fontSize:13,fontWeight:700,color:ok2?C.ok:C.text,background:"transparent",border:`1px solid ${C.border}`}} value={val||""} onChange={e=>setField("production",fld,e.target.value)} placeholder="0"/>
                    </div>
                  );
                })}
              </div>
              {prodSizeOk&&<div style={{marginTop:6,fontSize:9,color:C.ok,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>✓ ผ่านเป้าขนาดงาน</div>}
            </div>
            <div style={{background:footageOk?C.ok+"12":C.surface,border:`1px solid ${footageOk?C.ok+"44":C.border}`,borderRadius:6,padding:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div><label style={S.lbl}>Raw Footage</label><div style={{fontSize:8,color:C.accent,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>ต้องถ่ายทุกวัน Production</div></div>
                <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:10,color:footageOk?C.ok:C.danger}}>{entry.production?.footage||0} / 2 คลิป</span>
              </div>
              <input type="number" min="0" style={S.inp} value={entry.production?.footage||""} onChange={e=>setField("production","footage",e.target.value)} placeholder="0"/>
              <div style={{marginTop:4}}><Bar pct={((entry.production?.footage||0)/2)*100} color={footageOk?C.ok:C.danger}/></div>
            </div>
          </>
        )}

        {dt==="content"&&<>{numRow("content","posts","โพสต์",1," โพสต์")}{numRow("content","footage","Raw Footage",3," คลิป")}{numRow("content","photos","ภาพชิ้นงาน",1," ชุด")}{numRow("content","reels","Reels/วิดีโอ",3," ชิ้น")}</>}
        {dt==="design"&&<>{numRow("design","designs","แบบที่ออกแบบ",4," แบบ")}</>}

        {dt==="depend"&&(
          <div>
            <div style={{marginBottom:12}}>
              <label style={S.lbl}>งานที่มอบหมายวันนี้</label>
              <textarea style={{...S.inp,resize:"vertical",minHeight:100}} value={entry.dependTasks||""} onChange={e=>setEntry({...entry,dependTasks:e.target.value})} placeholder={"เช่น\n- ถ่ายรูปชิ้นงาน 3 คู่\n- เตรียม packaging\n- ส่งงานลูกค้า 2 ออเดอร์"}/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={S.lbl}>ผลการทำงาน</label>
              <textarea style={{...S.inp,resize:"vertical",minHeight:72}} value={entry.dependResult||""} onChange={e=>setEntry({...entry,dependResult:e.target.value})} placeholder="บันทึกสิ่งที่ทำเสร็จจริง..."/>
            </div>
            {isBoss&&(
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setEntry({...entry,dependPass:true})} style={{flex:1,padding:"10px",background:entry.dependPass===true?C.ok+"20":"transparent",color:entry.dependPass===true?C.ok:C.muted,border:`1px solid ${entry.dependPass===true?C.ok+"60":C.border}`,borderRadius:6,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:12,letterSpacing:2,cursor:"pointer"}}>✓ PASS</button>
                <button onClick={()=>setEntry({...entry,dependPass:false})} style={{flex:1,padding:"10px",background:entry.dependPass===false?C.danger+"20":"transparent",color:entry.dependPass===false?C.danger:C.muted,border:`1px solid ${entry.dependPass===false?C.danger+"60":C.border}`,borderRadius:6,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:12,letterSpacing:2,cursor:"pointer"}}>✗ MISS</button>
              </div>
            )}
            {!isBoss&&<div style={{background:C.bg,borderRadius:6,padding:"8px 12px",border:`1px solid ${C.border}`,fontSize:11,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif"}}>Smallbrush จะเป็นผู้ประเมินผลวันนี้</div>}
          </div>
        )}

        <Divider/>
        <div style={{textAlign:"center",padding:"10px",background:passed?C.ok+"12":C.danger+"12",border:`1px solid ${passed?C.ok+"44":C.danger+"44"}`,borderRadius:8}}>
          <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:14,color:passed?C.ok:C.danger,letterSpacing:3}}>{passed?"✓  KPI PASSED":"✗  KPI MISSED"}</div>
        </div>
      </div>
      <div style={{marginBottom:10}}><label style={S.lbl}>บันทึก / ปัญหา</label><textarea style={{...S.inp,resize:"vertical",minHeight:68}} value={entry.note||""} onChange={e=>setEntry({...entry,note:e.target.value})} placeholder="บันทึกข้อคิดเห็น ปัญหา หรือเหตุผล..."/></div>
      {isBoss&&<div><label style={{...S.lbl,color:C.accent}}>Smallbrush Comment</label><textarea style={{...S.inp,resize:"vertical",minHeight:52,borderColor:C.accent+"33"}} value={entry.bossComment||""} onChange={e=>setEntry({...entry,bossComment:e.target.value})} placeholder="ความคิดเห็นหัวหน้า..."/></div>}
    </div>
  );
}

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
  const [newProd,setNewProd]=useState({name:"",price:"",stock:"",cat:"paint"});
  const addProd=()=>{ if(!newProd.name||!newProd.price)return; setProducts(p=>[...p,{id:Date.now(),name:newProd.name,price:Number(newProd.price),stock:Number(newProd.stock)||0,cat:newProd.cat||"other"}]); setNewProd({name:"",price:"",stock:"",cat:newProd.cat||"paint"}); };
  const totalAllocPct=alloc.reduce((s,a)=>s+a.pct,0);
  const navMonth=d=>{ let m=selMonth+d,y=selYear; if(m<0){m=11;y--;}if(m>11){m=0;y++;}setSelMonth(m);setSelYear(y); };
  const allMonthKeys=[...new Set([...Object.keys(expenses),...Object.keys(sales),...orders.map(o=>orderMonth(o)).filter(Boolean)])].sort().slice(-6);
  const FTABS=[{key:"overview",label:"Overview"},{key:"expenses",label:"รายจ่าย"},{key:"products",label:"สินค้า"},{key:"alloc",label:"สัดส่วน"},{key:"compare",label:"เปรียบเทียบ"}];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <button onClick={()=>navMonth(-1)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,padding:"5px 12px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>‹</button>
        <div style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:600,fontSize:17,color:C.text}}>{MONTHS_TH[selMonth]} {selYear}</div>
        <button onClick={()=>navMonth(1)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,padding:"5px 12px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>›</button>
      </div>
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.border}`,marginBottom:14,overflowX:"auto"}}>
        {FTABS.map(t=><button key={t.key} onClick={()=>setActiveTab(t.key)} style={{padding:"7px 12px",background:"none",border:"none",borderBottom:`2px solid ${activeTab===t.key?C.accent:"transparent"}`,color:activeTab===t.key?C.accent:C.muted,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,fontSize:10,letterSpacing:2,cursor:"pointer",whiteSpace:"nowrap",marginBottom:-1}}>{t.label}</button>)}
      </div>
      {activeTab==="overview"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[{label:"รายรับ (ออเดอร์)",val:orderRevenue,color:C.accent},{label:"รายรับ (สินค้า)",val:productRevenue,color:"#8BA7C7"},{label:"รายจ่ายรวม",val:totalExpense,color:C.danger},{label:"กำไรสุทธิ",val:netProfit,color:netProfit>=0?C.ok:C.danger}].map(({label,val,color})=>(
              <div key={label} style={{background:C.surface,border:`1px solid ${C.border}`,borderTop:`2px solid ${color}`,borderRadius:8,padding:"12px 14px",textAlign:"center"}}>
                <div style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:700,fontSize:20,color}}>{val>=0?"":"−"}฿{fmt(Math.abs(val))}</div>
                <div style={{fontSize:9,letterSpacing:2,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif",marginTop:2}}>{label}</div>
              </div>
            ))}
          </div>
          <div style={S.card}>
            <div style={S.sec()}>รายจ่ายแยกหมวด</div>
            {DEFAULT_EXP_CATS.map(cat=>{ const total=monthExpenses.filter(e=>e.cat===cat).reduce((s,e)=>s+(e.amount||0),0); const pct=totalExpense>0?Math.round((total/totalExpense)*100):0; return total>0?(<div key={cat} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:11,color:C.muted}}>{cat}</span><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,fontSize:11,color:C.text}}>฿{fmt(total)} <span style={{color:C.muted}}>({pct}%)</span></span></div><Bar pct={pct} color={C.accent}/></div>):null; })}
            {totalExpense===0&&<div style={{color:C.muted,fontSize:12,fontFamily:"'Barlow Condensed', sans-serif"}}>ยังไม่มีรายจ่ายเดือนนี้</div>}
          </div>
        </div>
      )}
      {activeTab==="expenses"&&(
        <div>
          <div style={S.card}>
            <div style={S.sec(C.danger)}>เพิ่มรายจ่าย</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div><label style={S.lbl}>หมวด</label><select style={S.inp} value={newExp.cat} onChange={e=>setNewExp(n=>({...n,cat:e.target.value}))}>{DEFAULT_EXP_CATS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label style={S.lbl}>รายละเอียด</label><input style={S.inp} value={newExp.label} onChange={e=>setNewExp(n=>({...n,label:e.target.value}))} placeholder="เช่น ค่าสี Angelus"/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
              <div><label style={S.lbl}>จำนวนเงิน (฿)</label><input type="number" style={S.inp} value={newExp.amount} onChange={e=>setNewExp(n=>({...n,amount:e.target.value}))} placeholder="0"/></div>
              <div style={{display:"flex",alignItems:"flex-end"}}><button onClick={addExp} style={{background:C.danger,color:"#fff",border:"none",borderRadius:6,padding:"8px 14px",fontSize:12,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",letterSpacing:1}}>ADD</button></div>
            </div>
          </div>
          <div style={S.card}>
            <div style={S.sec(C.danger)}>รายจ่ายเดือนนี้ — ฿{fmt(totalExpense)}</div>
            {monthExpenses.length===0&&<div style={{color:C.muted,fontSize:12,fontFamily:"'Barlow Condensed', sans-serif"}}>ยังไม่มีรายจ่าย</div>}
            {monthExpenses.map(e=>(<div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{fontFamily:"'Cormorant Garamond', serif",fontSize:14,color:C.text}}>{e.label}</div><div style={{fontSize:9,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>{e.cat}</div></div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,color:C.danger}}>฿{fmt(e.amount)}</span><button onClick={()=>setMonthExp(monthExpenses.filter(x=>x.id!==e.id))} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12}}>✕</button></div></div>))}
          </div>
        </div>
      )}
      {activeTab==="products"&&(
        <div>
          {/* ADD PRODUCT FORM */}
          <div style={S.card}>
            <div style={S.sec("#8BA7C7")}>เพิ่มสินค้า</div>
            <div style={{marginBottom:10}}>
              <label style={S.lbl}>หมวดสินค้า</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {PRODUCT_CATS.map(cat=>(
                  <button key={cat.key} onClick={()=>setNewProd(n=>({...n,cat:cat.key}))} style={{padding:"6px 10px",background:newProd.cat===cat.key?cat.color+"22":"transparent",color:newProd.cat===cat.key?cat.color:C.muted,border:`1px solid ${newProd.cat===cat.key?cat.color+"55":C.border}`,borderRadius:6,fontFamily:"'Barlow Condensed', sans-serif",fontSize:10,letterSpacing:1,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                    <span>{cat.icon}</span><span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:8,marginBottom:8}}>
              <div><label style={S.lbl}>ชื่อสินค้า</label><input style={S.inp} value={newProd.name} onChange={e=>setNewProd(n=>({...n,name:e.target.value}))} placeholder="เช่น ถุงเท้า Adidas"/></div>
              <div><label style={S.lbl}>ราคา (฿)</label><input type="number" style={S.inp} value={newProd.price} onChange={e=>setNewProd(n=>({...n,price:e.target.value}))} placeholder="0"/></div>
              <div><label style={S.lbl}>Stock</label><input type="number" style={S.inp} value={newProd.stock} onChange={e=>setNewProd(n=>({...n,stock:e.target.value}))} placeholder="0"/></div>
            </div>
            <button onClick={addProd} style={{width:"100%",background:"#8BA7C7",color:C.bg,border:"none",borderRadius:6,padding:"9px",fontSize:11,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,cursor:"pointer",letterSpacing:2}}>+ ADD PRODUCT</button>
          </div>

          {/* PRODUCTS BY CATEGORY */}
          {PRODUCT_CATS.map(cat=>{
            const catProds=products.filter(p=>p.cat===cat.key||(cat.key==="other"&&!PRODUCT_CATS.slice(0,-1).find(c=>c.key===p.cat)));
            if(catProds.length===0)return null;
            const catRevenue=catProds.reduce((s,p)=>s+(p.price||0)*(monthSales[p.id]||0),0);
            const catStock=catProds.reduce((s,p)=>s+(p.stock||0),0);
            const catSold=catProds.reduce((s,p)=>s+(monthSales[p.id]||0),0);
            return(
              <div key={cat.key} style={{background:C.surface,border:`1px solid ${cat.color}33`,borderLeft:`3px solid ${cat.color}`,borderRadius:10,padding:14,marginBottom:12}}>
                {/* Category header */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:18}}>{cat.icon}</span>
                    <div>
                      <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:12,color:cat.color,letterSpacing:2}}>{cat.label}</div>
                      <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,color:C.muted,letterSpacing:1}}>{catProds.length} รายการ · Stock {catStock} · ขาย {catSold}</div>
                    </div>
                  </div>
                  {catRevenue>0&&<div style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:700,fontSize:16,color:cat.color}}>฿{fmt(catRevenue)}</div>}
                </div>

                {/* Product rows */}
                {catProds.map(p=>{
                  const qty=monthSales[p.id]||0;
                  const stockLeft=Math.max(0,(p.stock||0)-qty);
                  const stockPct=p.stock>0?Math.round((stockLeft/p.stock)*100):null;
                  const stockColor=stockLeft===0?C.danger:stockLeft<=3?"#C7B98B":C.ok;
                  return(
                    <div key={p.id} style={{background:C.bg,borderRadius:8,padding:"10px 12px",marginBottom:8,border:`1px solid ${C.border}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <div>
                          <div style={{fontFamily:"'Cormorant Garamond', serif",fontSize:15,color:C.text,fontWeight:600}}>{p.name}</div>
                          <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:10,color:C.muted,marginTop:1}}>฿{fmt(p.price)} / ชิ้น</div>
                        </div>
                        <button onClick={()=>setProducts(pp=>pp.filter(x=>x.id!==p.id))} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12,padding:"2px 4px"}}>✕</button>
                      </div>

                      {/* Stock bar */}
                      {p.stock>0&&(
                        <div style={{marginBottom:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,color:C.muted,letterSpacing:1}}>STOCK</span>
                            <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,color:stockColor,fontWeight:700,letterSpacing:1}}>
                              {stockLeft === 0 ? "SOLD OUT" : `เหลือ ${stockLeft}/${p.stock}`}
                            </span>
                          </div>
                          <div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${stockPct}%`,background:stockColor,borderRadius:2,transition:"width 0.4s"}}/>
                          </div>
                        </div>
                      )}

                      {/* Sale counter + stock update */}
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,color:C.muted,letterSpacing:1}}>ขายเดือนนี้</span>
                          <button onClick={()=>setSales(s=>({...s,[mk]:{...monthSales,[p.id]:Math.max(0,qty-1)}}))} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,width:26,height:26,cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>−</button>
                          <span style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:700,fontSize:18,color:C.text,minWidth:20,textAlign:"center"}}>{qty}</span>
                          <button onClick={()=>setSales(s=>({...s,[mk]:{...monthSales,[p.id]:qty+1}}))} style={{background:cat.color,border:"none",color:C.bg,borderRadius:5,width:26,height:26,cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700}}>+</button>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,color:C.muted,letterSpacing:1}}>Stock</span>
                          <button onClick={()=>setProducts(pp=>pp.map(x=>x.id===p.id?{...x,stock:Math.max(0,(x.stock||0)-1)}:x))} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,width:26,height:26,cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>−</button>
                          <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:13,color:stockColor,minWidth:20,textAlign:"center"}}>{p.stock||0}</span>
                          <button onClick={()=>setProducts(pp=>pp.map(x=>x.id===p.id?{...x,stock:(x.stock||0)+1}:x))} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,width:26,height:26,cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>+</button>
                        </div>
                        <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,fontSize:12,color:cat.color}}>฿{fmt(p.price*qty)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {products.length===0&&<div style={{textAlign:"center",color:C.muted,padding:40,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:3,fontSize:11}}>ยังไม่มีสินค้า</div>}
          {products.length>0&&<div style={{textAlign:"right",fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,color:"#8BA7C7",fontSize:13,padding:"4px 0"}}>รวมยอดขาย ฿{fmt(productRevenue)}</div>}
        </div>
      )}
      {activeTab==="alloc"&&(
        <div>
          <div style={S.card}>
            <div style={S.sec(C.ok)}>การแบ่งสัดส่วนกำไร</div>
            <div style={{background:C.bg,borderRadius:6,padding:"10px 12px",marginBottom:14,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.7,fontFamily:"'Cormorant Garamond', serif"}}>แบ่งกำไรล่วงหน้าก่อนนำออก เพื่อให้ธุรกิจเติบโตและมีทุนหมุนเวียน ปรับ % ตามสถานการณ์จริงได้ครับ</div>
            </div>
            {alloc.map((a,i)=>(
              <div key={a.key} style={{marginBottom:12,background:C.bg,borderRadius:8,padding:"10px 12px",borderLeft:`2px solid ${a.color}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div><div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,fontSize:12,color:a.color,letterSpacing:1}}>{a.label}</div><div style={{fontSize:10,color:C.muted,marginTop:1,fontFamily:"'Cormorant Garamond', serif"}}>{a.tip}</div></div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><input type="number" min="0" max="100" style={{...S.inp,width:50,textAlign:"center",color:a.color,fontWeight:700}} value={a.pct} onChange={e=>setAlloc(al=>al.map((x,j)=>j===i?{...x,pct:Number(e.target.value)}:x))}/><span style={{color:C.muted,fontSize:12}}>%</span></div>
                </div>
                <Bar pct={a.pct} color={a.color}/>
                {netProfit>0&&<div style={{marginTop:4,fontFamily:"'Barlow Condensed', sans-serif",fontSize:11,color:a.color}}>฿{fmt(Math.round(netProfit*a.pct/100))}</div>}
              </div>
            ))}
            <div style={{padding:"8px 12px",background:C.bg,borderRadius:8,border:`1px solid ${totalAllocPct===100?C.ok+"44":C.danger+"44"}`,textAlign:"center"}}>
              <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,color:totalAllocPct===100?C.ok:C.danger}}>รวม {totalAllocPct}% {totalAllocPct===100?"✓":`(ขาด ${100-totalAllocPct}%)`}</span>
            </div>
            <div style={{marginTop:8,textAlign:"center"}}><button onClick={()=>setAlloc(DEFAULT_ALLOC)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:5,color:C.muted,fontSize:10,padding:"5px 14px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>Reset เป็นค่าแนะนำ</button></div>
          </div>
        </div>
      )}
      {activeTab==="compare"&&(
        <div>
          <div style={S.card}>
            <div style={S.sec()}>เปรียบเทียบ 6 เดือน</div>
            {allMonthKeys.length===0&&<div style={{color:C.muted,fontSize:12,fontFamily:"'Barlow Condensed', sans-serif"}}>ยังไม่มีข้อมูลเพียงพอ</div>}
            {allMonthKeys.map(mk2=>{ const [yy,mm]=mk2.split("-").map(Number); const mo=mm-1; const rev=orders.filter(o=>orderMonth(o)===mk2).reduce((s,o)=>s+(o.price||0),0); const prodRev=products.reduce((s,p)=>s+(p.price||0)*((sales[mk2]||{})[p.id]||0),0); const exp=(expenses[mk2]||[]).reduce((s,e)=>s+(e.amount||0),0); const net=rev+prodRev-exp; const isCur=mk2===mk;
              return(<div key={mk2} style={{marginBottom:8,background:isCur?C.surface:C.bg,borderRadius:8,padding:"10px 12px",border:`1px solid ${isCur?C.accent+"44":C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:600,fontSize:14,color:isCur?C.accent:C.text}}>{MONTHS_TH[mo]} {yy}{isCur?" ◀":""}</span><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,fontSize:13,color:net>=0?C.ok:C.danger}}>฿{fmt(net)}</span></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,fontSize:10,fontFamily:"'Barlow Condensed', sans-serif"}}><div style={{color:C.accent}}>รับ ฿{fmt(rev+prodRev)}</div><div style={{color:C.danger}}>จ่าย ฿{fmt(exp)}</div><div style={{color:net>=0?C.ok:C.danger}}>กำไร ฿{fmt(net)}</div></div>
              </div>);
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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
  for(let d=1;d<=daysInMonth;d++){ const dk=`${mk}-${String(d).padStart(2,"0")}`; TEAM.forEach(m=>{ const e=kpiLogs[`${dk}__${m}`]; if(!e)return; totalDays++; if(kpiPass({...e,dayType:workPlans?.[dk]?.[m]||e.dayType}))passDays++; }); }
  const kpiRate=totalDays>0?Math.round((passDays/totalDays)*100):null;
  const memberStats=TEAM.map(m=>{ let pass=0,total=0; for(let d=1;d<=daysInMonth;d++){ const dk=`${mk}-${String(d).padStart(2,"0")}`; const e=kpiLogs[`${dk}__${m}`]; if(!e)continue; total++; if(kpiPass({...e,dayType:workPlans?.[dk]?.[m]||e.dayType}))pass++; } return{m,pass,total,rate:total>0?Math.round((pass/total)*100):null}; });
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <button onClick={()=>navMonth(-1)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,padding:"5px 12px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>‹</button>
        <div style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:600,fontSize:17,color:C.text}}>{MONTHS_TH[selMonth]} {selYear}</div>
        <button onClick={()=>navMonth(1)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,padding:"5px 12px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif"}}>›</button>
      </div>
      <div style={S.card}>
        <div style={S.sec()}>รายได้เดือน</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[{label:"ออเดอร์",val:`${monthOrders.length} งาน`,color:C.accent},{label:"มูลค่ารวม",val:`฿${fmt(totalRev)}`,color:C.accent},{label:"เสร็จแล้ว",val:`${doneOrders} งาน`,color:C.ok},{label:"ชำระครบ",val:`${fullyPaid} งาน`,color:C.ok}].map(({label,val,color})=>(
            <div key={label} style={{background:C.bg,borderRadius:6,padding:"8px 10px",textAlign:"center",border:`1px solid ${C.border}`}}>
              <div style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:700,fontSize:18,color}}>{val}</div>
              <div style={{fontSize:9,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1,marginTop:2}}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={S.card}>
        <div style={S.sec("#8BA7C7")}>KPI คุณภาพ</div>
        <div style={{textAlign:"center",padding:"12px",background:C.bg,borderRadius:8,marginBottom:12,border:`1px solid ${C.border}`}}>
          <div style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:700,fontSize:38,color:kpiRate===null?C.muted:kpiRate>=70?C.ok:kpiRate>=50?"#C7B98B":C.danger}}>{kpiRate===null?"—":`${kpiRate}%`}</div>
          <div style={{fontSize:9,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:2}}>KPI PASS RATE ({passDays}/{totalDays} วัน)</div>
        </div>
        {memberStats.map(({m,pass,total,rate})=>(
          <div key={m} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:12,color:C.muted}}>{m}</span><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,fontSize:12,color:rate===null?C.muted:rate>=80?C.ok:rate>=50?"#C7B98B":C.danger}}>{rate===null?"ไม่มีข้อมูล":`${pass}/${total} วัน (${rate}%)`}</span></div>
            {rate!==null&&<Bar pct={rate} color={rate>=80?C.ok:rate>=50?"#C7B98B":C.danger}/>}
          </div>
        ))}
      </div>
    </div>
  );
}

function BossDashboard({orders,kpiLogs,workPlans}){
  const totalRevenue=orders.reduce((s,o)=>s+(o.price||0),0);
  const totalDeposit=orders.filter(o=>o.depositPaid).reduce((s,o)=>s+(o.deposit||0),0);
  const totalRemaining=orders.filter(o=>!o.fullPaid).reduce((s,o)=>s+Math.max(0,(o.price||0)-(o.deposit||0)),0);
  const totalPaid=orders.filter(o=>o.fullPaid).reduce((s,o)=>s+(o.price||0),0);
  const last7=Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return d.toISOString().slice(0,10); });
  const memberStats=TEAM.map(m=>{ let pass=0,total=0; last7.forEach(dk=>{ const e=kpiLogs[`${dk}__${m}`]; if(!e)return; total++; if(kpiPass({...e,dayType:workPlans?.[dk]?.[m]||e.dayType}))pass++; }); return{m,pass,total,rate:total>0?Math.round((pass/total)*100):null}; });
  return(
    <div>
      <div style={S.sec()}>All-time Revenue</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        {[{label:"รายรับรวม",val:`฿${fmt(totalRevenue)}`,color:C.accent},{label:"รับแล้ว",val:`฿${fmt(totalDeposit)}`,color:"#8BA7C7"},{label:"ยอดค้าง",val:`฿${fmt(totalRemaining)}`,color:C.danger},{label:"ชำระครบ",val:`฿${fmt(totalPaid)}`,color:C.ok}].map(({label,val,color})=>(
          <div key={label} style={{background:C.surface,border:`1px solid ${C.border}`,borderTop:`2px solid ${color}`,borderRadius:8,padding:"12px 14px",textAlign:"center"}}>
            <div style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:700,fontSize:19,color}}>{val}</div>
            <div style={{fontSize:9,color:C.muted,fontFamily:"'Barlow Condensed', sans-serif",marginTop:2,letterSpacing:1}}>{label}</div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.sec()}>KPI 7 วันล่าสุด</div>
        {memberStats.map(({m,pass,total,rate})=>(
          <div key={m} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:12,color:C.muted}}>{m}</span><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,fontSize:12,color:rate===null?C.muted:rate>=80?C.ok:rate>=50?"#C7B98B":C.danger}}>{rate===null?"ไม่มีข้อมูล":`${pass}/${total} วัน (${rate}%)`}</span></div>
            {rate!==null&&<Bar pct={rate} color={rate>=80?C.ok:rate>=50?"#C7B98B":C.danger}/>}
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.sec()}>แหล่งที่มาลูกค้า</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {PLATFORMS.map(pl=>{
            const count=orders.filter(o=>o.platform===pl.key).length;
            if(!count)return null;
            const pct=Math.round((count/orders.length)*100);
            return(
              <div key={pl.key} style={{flex:1,minWidth:72,background:C.bg,border:`1px solid ${pl.color}33`,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                <div style={{fontSize:18,marginBottom:2}}>{pl.icon}</div>
                <div style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:700,fontSize:18,color:pl.color}}>{count}</div>
                <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:8,color:C.muted,letterSpacing:1}}>{pl.label}</div>
                <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,color:pl.color,marginTop:2}}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={S.card}>
        <div style={S.sec(C.danger)}>ยังค้างชำระ</div>
        {orders.filter(o=>!o.fullPaid&&(o.price||0)>(o.deposit||0)).length===0
          ?<div style={{color:C.muted,fontSize:12,fontFamily:"'Barlow Condensed', sans-serif"}}>ไม่มีออเดอร์ค้างชำระ ✓</div>
          :orders.filter(o=>!o.fullPaid&&(o.price||0)>(o.deposit||0)).map(o=>(
            <div key={o.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
              <div><span style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:600,fontSize:14,color:C.text}}>{o.customer}</span><span style={{fontSize:10,color:C.muted,marginLeft:6}}>{o.ig}</span></div>
              <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,fontSize:13,color:C.danger}}>฿{fmt((o.price||0)-(o.deposit||0))}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function LoginScreen({onBoss,onTeam}){
  const [pw,setPw]=useState(""), [err,setErr]=useState(false);
  const tryBoss=()=>{ if(pw.trim()===BOSS_PASSWORD)onBoss(); else{ setErr(true); setTimeout(()=>setErr(false),1200); } };
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,backgroundImage:GRAIN}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Barlow+Condensed:wght@400;600;700;800&family=Sarabun:wght@400;600&display=swap" rel="stylesheet"/>
      <div style={{width:"100%",maxWidth:320}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:700,fontSize:28,letterSpacing:8,color:C.text}}>CUSTOMIT</div>
          <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:9,letterSpacing:6,color:C.muted,marginTop:2}}>THAILAND</div>
          <div style={{width:32,height:1,background:C.accent,margin:"14px auto"}}/>
        </div>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderTop:`1px solid ${C.accent}`,borderRadius:10,padding:20,marginBottom:10}}>
          <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,fontSize:10,letterSpacing:3,color:C.accent,marginBottom:14}}>SMALLBRUSH ACCESS</div>
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryBoss()} placeholder="รหัสผ่าน" style={{...S.inp,marginBottom:10,border:`1px solid ${err?C.danger:C.border}`,transition:"border-color 0.2s"}} autoComplete="off"/>
          {err&&<div style={{fontSize:10,color:C.danger,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:2,marginBottom:8,textAlign:"center"}}>รหัสผิด</div>}
          <button onClick={tryBoss} style={{width:"100%",background:C.accent,color:C.bg,border:"none",borderRadius:6,padding:11,fontSize:12,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,letterSpacing:3,cursor:"pointer"}}>ENTER</button>
        </div>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:20}}>
          <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,fontSize:10,letterSpacing:3,color:C.muted,marginBottom:14}}>TEAM ACCESS</div>
          <button onClick={onTeam} style={{width:"100%",background:"transparent",color:C.muted,border:`1px solid ${C.border}`,borderRadius:6,padding:11,fontSize:12,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,letterSpacing:3,cursor:"pointer"}}>ENTER AS TEAM</button>
        </div>
      </div>
    </div>
  );
}

export default function App(){
  const [role,setRole]=useState(null);
  const [orders,setOrders]=useState(()=>loadData("cit-orders-v3",SAMPLE_ORDERS));
  const [kpiLogs,setKpiLogs]=useState(()=>loadData("cit-kpi-logs",{}));
  const [workPlans,setWorkPlans]=useState(()=>loadData("cit-work-plans",{}));
  const [workSchedules,setWorkSchedules]=useState(()=>loadData("cit-work-schedules",[]));
  const [showAdd,setShowAdd]=useState(false);
  const [tab,setTab]=useState("orders");
  const [filterStatus,setFilterStatus]=useState("all");
  const [search,setSearch]=useState("");
  // Track if we're currently writing to Firebase (to avoid echo)
  const writing = useRef(false);

  // On mount: listen to Firebase as single source of truth
  useEffect(()=>{
    const u1=fsListen("cit-orders-v3",(d)=>{ if(!writing.current){ setOrders(d); localStorage.setItem("cit-orders-v3",JSON.stringify(d)); } });
    const u2=fsListen("cit-kpi-logs",(d)=>{ if(!writing.current){ setKpiLogs(d); localStorage.setItem("cit-kpi-logs",JSON.stringify(d)); } });
    const u3=fsListen("cit-work-plans",(d)=>{ if(!writing.current){ setWorkPlans(d); localStorage.setItem("cit-work-plans",JSON.stringify(d)); } });
    const u4=fsListen("cit-work-schedules",(d)=>{ if(!writing.current&&Array.isArray(d)){ setWorkSchedules(d); localStorage.setItem("cit-work-schedules",JSON.stringify(d)); } });
    return ()=>{ u1(); u2(); u3(); u4(); };
  },[]);
  if(!role) return <LoginScreen onBoss={()=>setRole("boss")} onTeam={()=>setRole("team")}/>;
  const isBoss=role==="boss";
  const add=o=>{ const next=[o,...orders]; writing.current=true; fsSet("cit-orders-v3",next).then(()=>{ writing.current=false; }); setOrders(next); localStorage.setItem("cit-orders-v3",JSON.stringify(next)); };
  const upd=o=>{ const next=orders.map(x=>x.id===o.id?o:x); writing.current=true; fsSet("cit-orders-v3",next).then(()=>{ writing.current=false; }); setOrders(next); localStorage.setItem("cit-orders-v3",JSON.stringify(next)); };
  const del=id=>{ const next=orders.filter(x=>x.id!==id); writing.current=true; fsSet("cit-orders-v3",next).then(()=>{ writing.current=false; }); setOrders(next); localStorage.setItem("cit-orders-v3",JSON.stringify(next)); };
  const nextId=Math.max(0,...orders.map(o=>o.id))+1;
  const filtered=orders.filter(o=>filterStatus==="all"||o.status===filterStatus).filter(o=>!search||o.customer.includes(search)||o.model.toLowerCase().includes(search.toLowerCase())||(o.ig||"").includes(search)).sort((a,b)=>{ const p={urgent:0,normal:1,low:2}; return p[a.priority]!==p[b.priority]?p[a.priority]-p[b.priority]:new Date(a.deadline)-new Date(b.deadline); });
  const counts=Object.fromEntries(STATUSES.map(s=>[s.key,orders.filter(o=>o.status===s.key).length]));
  const TABS=[{key:"orders",label:"Orders"},{key:"calendar",label:"Calendar"},{key:"kpi",label:"KPI"},...(isBoss?[{key:"planner",label:"Planner"},{key:"finance",label:"Finance"},{key:"monthly",label:"Monthly"},{key:"dashboard",label:"Dashboard"}]:[])];
  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,backgroundImage:GRAIN}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Barlow+Condensed:wght@400;600;700;800&family=Sarabun:wght@400;600&display=swap" rel="stylesheet"/>
      {/* TOPBAR */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8}}>
          <span style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:700,fontSize:18,letterSpacing:4,color:C.text}}>CUSTOMIT</span>
          <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:8,letterSpacing:3,color:C.muted}}>TH</span>
          {isBoss&&<span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:8,letterSpacing:2,color:C.accent,background:C.accent+"15",borderRadius:3,padding:"1px 6px",border:`1px solid ${C.accent}30`}}>SMALLBRUSH</span>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {isBoss&&<button onClick={()=>setShowAdd(true)} style={{background:C.accent,color:C.bg,border:"none",borderRadius:6,padding:"6px 14px",fontSize:11,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,letterSpacing:2,cursor:"pointer"}}>+ NEW</button>}
          <button onClick={()=>setRole(null)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:5,color:C.muted,fontSize:10,padding:"5px 10px",cursor:"pointer",fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:1}}>EXIT</button>
        </div>
      </div>
      {/* STATUS FILTER */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,overflowX:"auto"}}>
        {[{key:"all",label:"ALL",color:C.text,count:orders.length},...STATUSES.map(s=>({...s,count:counts[s.key]||0}))].map(s=>(
          <button key={s.key} onClick={()=>setFilterStatus(s.key)} style={{flex:1,minWidth:50,padding:"8px 4px",background:"transparent",border:"none",borderBottom:`2px solid ${filterStatus===s.key?s.color:"transparent"}`,cursor:"pointer",transition:"all 0.15s"}}>
            <div style={{fontFamily:"'Cormorant Garamond', serif",fontWeight:700,fontSize:17,color:filterStatus===s.key?s.color:C.muted}}>{s.count}</div>
            <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:7,letterSpacing:1,color:filterStatus===s.key?s.color:C.muted,opacity:filterStatus===s.key?1:0.5}}>{s.label}</div>
          </button>
        ))}
      </div>
      {/* TABS */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,padding:"0 16px",overflowX:"auto",background:C.surface}}>
        {TABS.map(t=><button key={t.key} onClick={()=>setTab(t.key)} style={{padding:"9px 14px 9px 0",background:"none",border:"none",borderBottom:`2px solid ${tab===t.key?C.accent:"transparent"}`,color:tab===t.key?C.accent:C.muted,fontFamily:"'Barlow Condensed', sans-serif",fontWeight:600,fontSize:10,letterSpacing:2,cursor:"pointer",marginBottom:-1,whiteSpace:"nowrap"}}>{t.label}</button>)}
      </div>
      {/* CONTENT */}
      <div style={{padding:"14px 16px 80px"}}>
        {tab==="orders"&&(
          <>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search orders..." style={{...S.inp,marginBottom:14}}/>
            {STATUSES.map(st=>{
              const group=filtered.filter(o=>o.status===st.key);
              if(group.length===0)return null;
              return(
                <div key={st.key} style={{marginBottom:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:st.color,flexShrink:0}}/>
                    <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontWeight:700,fontSize:10,letterSpacing:3,color:st.color}}>{st.label}</span>
                    <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:10,color:C.muted}}>({group.length})</span>
                    <div style={{flex:1,height:1,background:st.color+"22"}}/>
                  </div>
                  {group.map(o=><OrderCard key={o.id} order={o} onUpdate={upd} onDelete={del} isBoss={isBoss}/>)}
                </div>
              );
            })}
            {filtered.length===0&&<div style={{textAlign:"center",color:C.muted,padding:60,fontFamily:"'Barlow Condensed', sans-serif",letterSpacing:4,fontSize:12}}>NO ORDERS</div>}
          </>
        )}
        {tab==="calendar"&&<CalView orders={orders} workPlans={workPlans} workSchedules={workSchedules}/>}
        {tab==="kpi"&&<KpiTracker isBoss={isBoss} workPlans={workPlans} orders={orders}/>}
        {tab==="planner"&&isBoss&&<WorkPlanner workPlans={workPlans} setWorkPlans={setWorkPlans} workSchedules={workSchedules} setWorkSchedules={setWorkSchedules} orders={orders}/>}
        {tab==="finance"&&isBoss&&<FinanceView orders={orders}/>}
        {tab==="monthly"&&isBoss&&<MonthlySummary orders={orders} kpiLogs={kpiLogs} workPlans={workPlans}/>}
        {tab==="dashboard"&&isBoss&&<BossDashboard orders={orders} kpiLogs={kpiLogs} workPlans={workPlans}/>}
      </div>
      {showAdd&&<AddModal onClose={()=>setShowAdd(false)} onAdd={add} nextId={nextId} isBoss={isBoss}/>}
    </div>
  );
}
