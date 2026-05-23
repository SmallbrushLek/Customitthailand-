import { useState, useEffect, useRef } from "react";

// ── CONSTANTS ─────────────────────────────────────────
const BOSS_PW = "198742";
const TEAM = ["Otto", "Smallbrush"];
const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const DAY_TH = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const STATUSES = [
  {key:"queue",      label:"QUEUE",       color:"#f59e0b"},
  {key:"inprogress", label:"IN PROGRESS", color:"#7c3aed"},
  {key:"review",     label:"REVIEW",      color:"#06b6d4"},
  {key:"done",       label:"DONE",        color:"#00ff88"},
];
const PRIORITIES = [
  {key:"urgent", label:"URGENT", color:"#C97A7A"},
  {key:"normal", label:"NORMAL", color:"#C9A96E"},
  {key:"low",    label:"LOW",    color:"#555"},
];
const DAY_TYPES = [
  {key:"production", label:"PRODUCTION", short:"PROD", color:"#C9A96E"},
  {key:"content",    label:"CONTENT",    short:"CNT",  color:"#8BA7C7"},
  {key:"design",     label:"DESIGN",     short:"DSN",  color:"#C7B98B"},
  {key:"depend",     label:"DEPEND",     short:"DEP",  color:"#A78BC7"},
];
const ORDER_TYPES = [
  {key:"normal",    label:"ปกติ",          icon:"💰", color:"#C9A96E"},
  {key:"free",      label:"งานฟรี",        icon:"🎁", color:"#8BC7A7"},
  {key:"event",     label:"Event",         icon:"🎉", color:"#8BA7C7"},
  {key:"promotion", label:"โปรโมชั่น",     icon:"📢", color:"#C7B98B"},
  {key:"collab",    label:"Collab",        icon:"🤝", color:"#A78BC7"},
];
const PLATFORMS = [
  {key:"instagram", label:"IG",        icon:"📸", color:"#C96BA0"},
  {key:"facebook",  label:"Facebook",  icon:"👤", color:"#6B8EC9"},
  {key:"tiktok",    label:"TikTok",    icon:"🎵", color:"#8BC7A7"},
  {key:"line",      label:"LINE",      icon:"💬", color:"#7EC96B"},
  {key:"whatsapp",  label:"WhatsApp",  icon:"📱", color:"#6BC9A0"},
];
const EVENT_TYPES = [
  {key:"booth",    label:"ออกบูธ",           icon:"🏪", color:"#C9A96E"},
  {key:"workshop", label:"Workshop",          icon:"🎨", color:"#8BA7C7"},
  {key:"customer", label:"ลูกค้านัดเข้าร้าน",icon:"🤝", color:"#8BC7A7"},
  {key:"meeting",  label:"ประชุม",            icon:"💬", color:"#C7B98B"},
  {key:"other",    label:"อื่นๆ",            icon:"📌", color:"#A78BC7"},
];
const SHOE_TYPES = [
  "Nike Mercurial Superfly","Nike Mercurial Vapor","Nike Phantom GX","Nike Phantom GT",
  "Nike Tiempo Legend","Adidas Predator","Adidas X Speedportal","Adidas Copa Mundial",
  "Adidas Copa Pure","Puma Future","Puma King","Puma Ultra",
  "New Balance Furon","New Balance Tekela","Mizuno Morelia","อื่นๆ"
];
const SHOE_SIZES = ["เล็ก","กลาง","ใหญ่","กำหนดเอง"];
const KPI = {
  production:{small:1.5, medium:1, large:0.25, footage:2},
  content:{posts:1, footage:3, reels:3},
  design:{designs:4},
};

// ── FIREBASE REST API ──────────────────────────────────
const FB = "https://firestore.googleapis.com/v1/projects/customitthailand-90460/databases/(default)/documents/customit";

async function fsSet(id, data) {
  try {
    await fetch(`${FB}/${id}`, {
      method:"PATCH",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({fields:{data:{stringValue:JSON.stringify(data)}}})
    });
  } catch(e) {}
}

async function fsGet(id, fallback) {
  try {
    const r = await fetch(`${FB}/${id}`);
    if (!r.ok) return fallback;
    const d = await r.json();
    return d.fields?.data?.stringValue ? JSON.parse(d.fields.data.stringValue) : fallback;
  } catch(e) { return fallback; }
}

// ── HELPERS ───────────────────────────────────────────
function load(k,fb){ try{ const s=localStorage.getItem(k); return s?JSON.parse(s):fb; }catch{ return fb; } }
function save(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} }
function todayKey(){ return new Date().toISOString().slice(0,10); }
function daysLeft(d){ return Math.ceil((new Date(d)-new Date())/86400000); }
function fmt(n){ return Number(n||0).toLocaleString("th-TH"); }
function genQID(created,id){
  const mo=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][new Date(created).getMonth()];
  return `${mo}-${String(id).padStart(3,"0")}`;
}
function kpiPass(e){
  if(!e) return false;
  const dt=e.dayType;
  if(dt==="production"){
    const p=e.production||{};
    const sizeOk=(p.small||0)>=KPI.production.small||(p.medium||0)>=KPI.production.medium||(p.large||0)>=KPI.production.large;
    return sizeOk&&(p.footage||0)>=KPI.production.footage;
  }
  if(dt==="content"){ const c=e.content||{}; return (c.posts||0)>=KPI.content.posts&&(c.footage||0)>=KPI.content.footage&&(c.reels||0)>=KPI.content.reels; }
  if(dt==="design"){ return (e.design?.designs||0)>=KPI.design.designs; }
  if(dt==="depend"){ return !!e.dependPass; }
  return false;
}
// Count how many days an order has been worked on (tickets used)
function ticketsUsed(orderId, kpiLogs) {
  return Object.keys(kpiLogs||{}).filter(key=>{
    const e=kpiLogs[key];
    return (e?.linkedOrders||[]).includes(String(orderId));
  }).length;
}
// Get total tickets for an order based on size/estimatedDays
function totalTickets(order) {
  if(order.estimatedDays) return Number(order.estimatedDays);
  if(order.size==="เล็ก") return 1;
  if(order.size==="กลาง") return 2;
  if(order.size==="ใหญ่") return 4;
  return 1;
}

async function uploadToCloudinary(file){
  const fd=new FormData();
  fd.append("file",file);
  fd.append("upload_preset","customit_upload");
  try{
    const r=await fetch("https://api.cloudinary.com/v1_1/dfe6ubwzf/image/upload",{method:"POST",body:fd});
    const d=await r.json();
    return d.secure_url||null;
  }catch(e){ return null; }
}

// ── DESIGN ────────────────────────────────────────────
const C={
  bg:"#111318", surface:"#1a1d24", border:"#252830",
  text:"#f0eee8", muted:"#555a66",
  accent:"#7c3aed", accent2:"#f59e0b", danger:"#ef4444", ok:"#00ff88",
};
const S={
  inp:{background:"#0e1014",color:C.text,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,width:"100%",boxSizing:"border-box",fontFamily:"'DM Mono',monospace",outline:"none"},
  lbl:{fontSize:9,letterSpacing:2,color:C.muted,fontFamily:"'DM Mono',monospace",fontWeight:500,display:"block",marginBottom:5,textTransform:"uppercase"},
  card:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:12},
};
const FONTS = `https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&family=Sarabun:wght@400;600&display=swap`;

function Pill({color,children}){
  return <span style={{fontFamily:"'DM Mono',monospace",fontWeight:500,fontSize:8,letterSpacing:1,color,background:color+"18",borderRadius:4,padding:"2px 8px",border:`1px solid ${color}35`}}>{children}</span>;
}
function MiniBar({pct,color}){
  return <div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,pct||0)}%`,background:color||C.accent,borderRadius:2,transition:"width 0.3s"}}/></div>;
}
function MiniProgress({progress}){
  const color=progress>=100?C.ok:progress>=50?C.accent:"#8BA7C7";
  return(
    <div style={{display:"flex",alignItems:"center",gap:5}}>
      <div style={{flex:1,height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.min(100,progress||0)}%`,background:color,borderRadius:2}}/>
      </div>
      <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color,fontWeight:600,minWidth:28}}>{Math.round(progress||0)}%</span>
    </div>
  );
}

// ── IMAGE UPLOADER ────────────────────────────────────
function ImageUploader({images,onChange,label}){
  const ref=useRef();
  const [loading,setLoading]=useState(false);
  const upload=async(files)=>{
    setLoading(true);
    const urls=await Promise.all([...files].filter(f=>f.type.startsWith("image/")).map(uploadToCloudinary));
    onChange([...(images||[]),...urls.filter(Boolean)]);
    setLoading(false);
  };
  return(
    <div>
      <label style={S.lbl}>{label}</label>
      <div onClick={()=>ref.current.click()} style={{border:`1px dashed ${C.border}`,borderRadius:6,padding:8,cursor:"pointer",minHeight:48,display:"flex",flexWrap:"wrap",gap:6,alignItems:"center",background:C.bg}}>
        {loading&&<span style={{color:C.accent,fontSize:11,fontFamily:"'DM Mono',monospace"}}>⏳ กำลังอัปโหลด...</span>}
        {!loading&&(!images||images.length===0)&&<span style={{color:C.muted,fontSize:11,fontFamily:"'DM Mono',monospace"}}>TAP TO UPLOAD</span>}
        {(images||[]).map((src,i)=>(
          <div key={i} style={{position:"relative"}}>
            <img src={src} alt="" style={{width:52,height:52,objectFit:"cover",borderRadius:4}}/>
            <button onClick={e=>{e.stopPropagation();onChange((images||[]).filter((_,j)=>j!==i));}} style={{position:"absolute",top:-4,right:-4,background:C.danger,border:"none",borderRadius:"50%",width:14,height:14,color:"#fff",fontSize:8,cursor:"pointer",lineHeight:1}}>✕</button>
          </div>
        ))}
      </div>
      <input ref={ref} type="file" multiple accept="image/*" style={{display:"none"}} onChange={e=>upload(e.target.files)}/>
    </div>
  );
}

// ── ORDER CARD ────────────────────────────────────────
function OrderCard({order,onUpdate,onDelete,isBoss,kpiLogs}){
  const [open,setOpen]=useState(false);
  const st=STATUSES.find(s=>s.key===order.status)||STATUSES[0];
  const pr=PRIORITIES.find(p=>p.key===order.priority)||PRIORITIES[1];
  const dl=daysLeft(order.deadline);
  const ot=ORDER_TYPES.find(o=>o.key===order.orderType);
  const pl=PLATFORMS.find(p=>p.key===order.platform);
  const thumb=order.designImages?.[0]||order.images?.[0];
  const nextSt=()=>{ const i=STATUSES.findIndex(s=>s.key===order.status); if(i<STATUSES.length-1)onUpdate({...order,status:STATUSES[i+1].key}); };
  const prevSt=()=>{ const i=STATUSES.findIndex(s=>s.key===order.status); if(i>0)onUpdate({...order,status:STATUSES[i-1].key}); };
  return(
    <div style={{background:C.surface,border:`1px solid ${open?st.color+"44":C.border}`,borderLeft:`2px solid ${st.color}`,borderRadius:10,marginBottom:8,overflow:"hidden"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{padding:"12px 14px",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start"}}>
        <div style={{width:44,height:44,flexShrink:0,borderRadius:6,background:C.bg,border:`1px solid ${C.border}`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {thumb?<img src={thumb} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:18,opacity:0.3}}>👟</span>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:16,color:C.text}}>{order.customer}</div>
              <div style={{display:"flex",gap:5,alignItems:"center",marginTop:3,flexWrap:"wrap"}}>
                {order.queueId&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:C.accent,background:C.accent+"15",borderRadius:3,padding:"1px 6px"}}>{order.queueId}</span>}
                {pl&&<span style={{fontSize:9,color:pl.color,fontFamily:"'DM Mono',monospace"}}>{pl.icon} {pl.label}</span>}
                {ot&&ot.key!=="normal"&&<span style={{fontSize:9,color:ot.color,fontFamily:"'DM Mono',monospace"}}>{ot.icon} {ot.label}</span>}
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
              <Pill color={st.color}>{st.label}</Pill>
              <div style={{fontSize:10,marginTop:3,color:dl<0?C.danger:dl<=2?"#C7B98B":C.muted,fontFamily:"'DM Mono',monospace"}}>{dl<0?`OVERDUE ${Math.abs(dl)}d`:`${dl}d`}</div>
            </div>
          </div>
          <div style={{marginTop:5,display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.muted}}>{order.model}</span>
            {order.size&&<Pill color={C.muted}>{order.size}</Pill>}
            <Pill color={pr.color}>{pr.label}</Pill>
            {order.cowork&&<Pill color="#8BA7C7">CO-WORK</Pill>}
            {isBoss&&!order.fullPaid&&(order.price||0)>(order.deposit||0)&&<Pill color={C.danger}>ค้าง ฿{fmt((order.price||0)-(order.deposit||0))}</Pill>}
          </div>
          <div style={{marginTop:6}}><MiniProgress progress={order.status==="done"?100:(order.progress||0)}/></div>
          {(()=>{
            const total=totalTickets(order);
            const used=ticketsUsed(order.id, kpiLogs||{});
            const remaining=Math.max(0,total-used);
            if(total<=1&&!order.estimatedDays) return null;
            return <div style={{display:"flex",gap:3,marginTop:5,alignItems:"center"}}>
              {Array.from({length:total}).map((_,i)=><div key={i} style={{width:10,height:10,borderRadius:2,background:i<(total-remaining)?C.border:C.accent+"60",border:`1px solid ${i<(total-remaining)?C.border:C.accent}`}}/>)}
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:C.muted,marginLeft:3}}>{remaining}d left</span>
            </div>;
          })()}
        </div>
      </div>
      {open&&(
        <div onClick={e=>e.stopPropagation()} style={{borderTop:`1px solid ${C.border}`,padding:"12px 14px"}}>
          {/* Images */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            <ImageUploader label="รูปรองเท้า" images={order.images||[]} onChange={v=>onUpdate({...order,images:v})}/>
            <ImageUploader label="Design Ref" images={order.designImages||[]} onChange={v=>onUpdate({...order,designImages:v})}/>
          </div>
          {/* Platform */}
          <div style={{marginBottom:10}}>
            <label style={S.lbl}>แพลตฟอร์ม</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {PLATFORMS.map(p=><button key={p.key} onClick={()=>onUpdate({...order,platform:order.platform===p.key?"":p.key})} style={{padding:"4px 8px",background:order.platform===p.key?p.color+"20":"transparent",color:order.platform===p.key?p.color:C.muted,border:`1px solid ${order.platform===p.key?p.color+"55":C.border}`,borderRadius:5,fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer"}}>{p.icon} {p.label}</button>)}
            </div>
          </div>
          {/* Order type */}
          <div style={{marginBottom:10}}>
            <label style={S.lbl}>ประเภทงาน</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {ORDER_TYPES.map(o=><button key={o.key} onClick={()=>onUpdate({...order,orderType:o.key})} style={{padding:"4px 8px",background:order.orderType===o.key?o.color+"20":"transparent",color:order.orderType===o.key?o.color:C.muted,border:`1px solid ${order.orderType===o.key?o.color+"55":C.border}`,borderRadius:5,fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer"}}>{o.icon} {o.label}</button>)}
            </div>
          </div>
          {/* Co-work */}
          <div style={{marginBottom:10}}>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:6}}>
              <input type="checkbox" checked={!!order.cowork} onChange={e=>onUpdate({...order,cowork:e.target.checked})} style={{accentColor:"#8BA7C7"}}/>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#8BA7C7"}}>CO-WORK</span>
            </label>
            {order.cowork&&<textarea style={{...S.inp,minHeight:44,resize:"vertical"}} value={order.coworkNote||""} onChange={e=>onUpdate({...order,coworkNote:e.target.value})} placeholder="Otto: วาด / Smallbrush: พ่น"/>}
          </div>
          {/* Assignee + Priority */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <div><label style={S.lbl}>Assignee</label><select style={S.inp} value={order.assignee||TEAM[0]} onChange={e=>onUpdate({...order,assignee:e.target.value})}>{TEAM.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={S.lbl}>Priority</label><select style={S.inp} value={order.priority||"normal"} onChange={e=>onUpdate({...order,priority:e.target.value})}>{PRIORITIES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
          </div>
          {/* Finance */}
          {isBoss&&(order.orderType==="normal"||!order.orderType)&&(
            <div style={{background:C.bg,border:`1px solid ${C.accent}22`,borderRadius:8,padding:"10px 12px",marginBottom:10}}>
              <div style={{fontSize:10,letterSpacing:1,color:C.accent,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:8}}>FINANCE</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                <div><label style={S.lbl}>ราคาเต็ม</label><input type="number" style={S.inp} value={order.price||""} onChange={e=>onUpdate({...order,price:Number(e.target.value)})}/></div>
                <div><label style={S.lbl}>มัดจำ</label><input type="number" style={S.inp} value={order.deposit||""} onChange={e=>onUpdate({...order,deposit:Number(e.target.value)})}/></div>
                <div><label style={S.lbl}>ค้าง</label><div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 12px",color:C.danger,fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:13}}>฿{fmt(Math.max(0,(order.price||0)-(order.deposit||0)))}</div></div>
              </div>
              <div style={{display:"flex",gap:12}}>
                <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.muted,fontFamily:"'DM Mono',monospace",cursor:"pointer"}}><input type="checkbox" checked={!!order.depositPaid} onChange={e=>onUpdate({...order,depositPaid:e.target.checked})} style={{accentColor:C.accent}}/>รับมัดจำ</label>
                <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.muted,fontFamily:"'DM Mono',monospace",cursor:"pointer"}}><input type="checkbox" checked={!!order.fullPaid} onChange={e=>onUpdate({...order,fullPaid:e.target.checked})} style={{accentColor:C.ok}}/>ชำระครบ</label>
              </div>
            </div>
          )}
          {/* Progress slider */}
          <div style={{background:C.bg,borderRadius:8,padding:"10px 12px",border:`1px solid ${C.border}`,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <label style={S.lbl}>ความคืบหน้า</label>
              <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:20,color:order.progress>=100?C.ok:C.accent}}>{Math.round(order.progress||0)}%</span>
            </div>
            <div style={{position:"relative",height:28,display:"flex",alignItems:"center"}}>
              <div style={{position:"absolute",width:"100%",height:6,background:C.border,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${order.progress||0}%`,background:order.progress>=100?C.ok:C.accent,borderRadius:3}}/>
              </div>
              <input type="range" min="0" max="100" step="5" value={order.progress||0} onChange={e=>onUpdate({...order,progress:Number(e.target.value)})} style={{position:"absolute",width:"100%",opacity:0,cursor:"pointer",height:28}}/>
              <div style={{position:"absolute",left:`calc(${order.progress||0}% - 9px)`,width:18,height:18,background:order.progress>=100?C.ok:C.accent,borderRadius:"50%",border:`2px solid ${C.bg}`,pointerEvents:"none"}}/>
            </div>
            <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>
              {[0,25,50,75,100].map(p=><button key={p} onClick={()=>onUpdate({...order,progress:p})} style={{fontSize:9,color:Math.round(order.progress||0)===p?C.accent:C.muted,background:"transparent",border:`1px solid ${Math.round(order.progress||0)===p?C.accent:C.border}`,borderRadius:4,padding:"2px 8px",cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>{p}%</button>)}
            </div>
          </div>
          {/* Tickets */}
          {(()=>{
            const total=totalTickets(order);
            const used=ticketsUsed(order.id, {});
            const remaining=Math.max(0,total-used);
            return(
              <div style={{marginBottom:10,background:C.bg,borderRadius:8,padding:"10px 12px",border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <label style={S.lbl}>Work Tickets</label>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:remaining===0?C.ok:C.accent}}>{remaining}/{total} เหลือ</span>
                </div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {Array.from({length:total}).map((_,i)=>{
                    const isUsed=i<(total-remaining);
                    return <div key={i} style={{width:28,height:28,borderRadius:5,background:isUsed?"#1a1d24":C.accent+"30",border:`1px solid ${isUsed?C.border:C.accent}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:isUsed?C.muted:C.accent}}>{isUsed?"✓":"○"}</div>;
                  })}
                </div>
              </div>
            );
          })()}
          {/* Note */}
          {order.note&&<div style={{marginBottom:10,padding:"8px 10px",background:C.bg,borderRadius:6,borderLeft:`2px solid ${C.border}`}}><div style={{fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace",marginBottom:2}}>NOTE</div><div style={{fontSize:13,color:C.muted}}>{order.note}</div></div>}
          {/* Actions */}
          <div style={{height:1,background:C.border,margin:"10px 0"}}/>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {order.status!=="queue"&&<button onClick={prevSt} style={{flex:1,background:C.bg,color:C.muted,border:`1px solid ${C.border}`,borderRadius:6,padding:"7px",fontSize:11,cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>← BACK</button>}
            {order.status!=="done"&&<button onClick={nextSt} style={{flex:2,background:"transparent",color:st.color,border:`1px solid ${st.color}`,borderRadius:6,padding:"7px",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:700,cursor:"pointer"}}>{order.status==="queue"?"START →":order.status==="inprogress"?"SEND REVIEW →":"MARK DONE ✓"}</button>}
            {isBoss&&<button onClick={()=>onDelete(order.id)} style={{padding:"7px 10px",background:"transparent",color:C.danger,border:`1px solid ${C.danger}30`,borderRadius:6,fontSize:11,cursor:"pointer"}}>✕</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ADD MODAL ─────────────────────────────────────────
function AddModal({onClose,onAdd,nextId,isBoss}){
  const [form,setForm]=useState({customer:"",model:SHOE_TYPES[0],customModel:"",size:"กลาง",estimatedDays:"",tickets:"",deadline:"",priority:"normal",assignee:TEAM[0],note:"",images:[],designImages:[],price:"",deposit:"",depositPaid:false,fullPaid:false,cowork:false,coworkNote:"",platform:"",orderType:"normal",progress:0});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const ok=form.customer&&form.deadline;
  return(
    <div style={{position:"fixed",inset:0,background:"#000000d0",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderTop:`2px solid ${C.accent}`,borderRadius:"12px 12px 0 0",padding:20,width:"100%",maxWidth:480,maxHeight:"94vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:20,color:C.text}}>New Order</div>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,color:C.muted,fontSize:14,cursor:"pointer",width:30,height:30}}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div><label style={S.lbl}>ชื่อลูกค้า *</label><input style={S.inp} value={form.customer} onChange={e=>set("customer",e.target.value)} placeholder="ชื่อลูกค้า"/></div>
          <div>
            <label style={S.lbl}>แพลตฟอร์ม</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {PLATFORMS.map(p=><button key={p.key} onClick={()=>set("platform",form.platform===p.key?"":p.key)} style={{padding:"5px 8px",background:form.platform===p.key?p.color+"20":"transparent",color:form.platform===p.key?p.color:C.muted,border:`1px solid ${form.platform===p.key?p.color+"55":C.border}`,borderRadius:5,fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer"}}>{p.icon} {p.label}</button>)}
            </div>
          </div>
          <div>
            <label style={S.lbl}>ประเภทงาน</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {ORDER_TYPES.map(o=><button key={o.key} onClick={()=>set("orderType",o.key)} style={{padding:"5px 8px",background:form.orderType===o.key?o.color+"20":"transparent",color:form.orderType===o.key?o.color:C.muted,border:`1px solid ${form.orderType===o.key?o.color+"55":C.border}`,borderRadius:5,fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer"}}>{o.icon} {o.label}</button>)}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8}}>
            <div>
              <label style={S.lbl}>Shoe Model</label>
              <select style={S.inp} value={form.model} onChange={e=>set("model",e.target.value)}>{SHOE_TYPES.map(t=><option key={t}>{t}</option>)}</select>
              {form.model==="อื่นๆ"&&<input style={{...S.inp,marginTop:6}} value={form.customModel} onChange={e=>set("customModel",e.target.value)} placeholder="พิมพ์รุ่นรองเท้า"/>}
            </div>
            <div>
              <label style={S.lbl}>ขนาด</label>
              <select style={S.inp} value={form.size} onChange={e=>set("size",e.target.value)}>{SHOE_SIZES.map(t=><option key={t}>{t}</option>)}</select>
              {form.size==="กำหนดเอง"&&<input type="number" style={{...S.inp,marginTop:6}} value={form.estimatedDays} onChange={e=>set("estimatedDays",e.target.value)} placeholder="จำนวนวัน"/>}
            </div>
          </div>
          {/* Tickets selector */}
          <div>
            <label style={S.lbl}>จำนวน Tickets (วันที่ใช้ทำ)</label>
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              {[1,2,3,4,5,7,10,14].map(n=>(
                <button key={n} onClick={()=>set("tickets",form.tickets===n?"":n)} style={{width:36,height:36,background:form.tickets===n?C.accent+"30":"transparent",color:form.tickets===n?C.accent:C.muted,border:`1px solid ${form.tickets===n?C.accent:C.border}`,borderRadius:6,fontFamily:"'DM Mono',monospace",fontSize:12,cursor:"pointer",fontWeight:600}}>{n}</button>
              ))}
              <input type="number" min="1" style={{...S.inp,width:60,padding:"6px 8px",textAlign:"center"}} value={typeof form.tickets==="number"&&![1,2,3,4,5,7,10,14].includes(form.tickets)?form.tickets:""} onChange={e=>set("tickets",Number(e.target.value))} placeholder="?"/>
            </div>
            {form.tickets&&<div style={{marginTop:6,display:"flex",gap:3,flexWrap:"wrap"}}>{Array.from({length:form.tickets}).map((_,i)=><div key={i} style={{width:12,height:12,borderRadius:2,background:C.accent+"40",border:`1px solid ${C.accent}`}}/>)}</div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <div><label style={S.lbl}>Deadline *</label><input type="date" style={S.inp} value={form.deadline} onChange={e=>set("deadline",e.target.value)}/></div>
            <div><label style={S.lbl}>Priority</label><select style={S.inp} value={form.priority} onChange={e=>set("priority",e.target.value)}>{PRIORITIES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
            <div><label style={S.lbl}>Assignee</label><select style={S.inp} value={form.assignee} onChange={e=>set("assignee",e.target.value)}>{TEAM.map(t=><option key={t}>{t}</option>)}</select></div>
          </div>
          <div><label style={S.lbl}>Design Note</label><textarea style={{...S.inp,minHeight:60,resize:"vertical"}} value={form.note} onChange={e=>set("note",e.target.value)} placeholder="ลาย, สี, สไตล์..."/></div>
          <div>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:6}}>
              <input type="checkbox" checked={form.cowork} onChange={e=>set("cowork",e.target.checked)} style={{accentColor:"#8BA7C7"}}/>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#8BA7C7"}}>CO-WORK</span>
            </label>
            {form.cowork&&<textarea style={{...S.inp,minHeight:44,resize:"vertical"}} value={form.coworkNote} onChange={e=>set("coworkNote",e.target.value)} placeholder="Otto: วาด / Smallbrush: พ่น"/>}
          </div>
          {isBoss&&form.orderType==="normal"&&(
            <div style={{background:C.bg,border:`1px solid ${C.accent}22`,borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontSize:10,letterSpacing:1,color:C.accent,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:8}}>FINANCE</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><label style={S.lbl}>ราคาเต็ม (฿)</label><input type="number" style={S.inp} value={form.price} onChange={e=>set("price",e.target.value)}/></div>
                <div><label style={S.lbl}>มัดจำ (฿)</label><input type="number" style={S.inp} value={form.deposit} onChange={e=>set("deposit",e.target.value)}/></div>
              </div>
            </div>
          )}
          <ImageUploader label="รูปรองเท้า" images={form.images} onChange={v=>set("images",v)}/>
          <ImageUploader label="Design Reference" images={form.designImages} onChange={v=>set("designImages",v)}/>
        </div>
        <button onClick={()=>{ if(!ok)return; const created=Date.now(); const model=form.model==="อื่นๆ"&&form.customModel?form.customModel:form.model; onAdd({...form,model,id:nextId,queueId:genQID(created,nextId),price:Number(form.price)||0,deposit:Number(form.deposit)||0,status:"queue",created,progress:0}); onClose(); }} style={{marginTop:16,width:"100%",background:ok?C.accent:"#1a1a1a",color:ok?C.bg:"#444",border:"none",borderRadius:8,padding:12,fontSize:13,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:2,cursor:ok?"pointer":"default"}}>ADD TO QUEUE</button>
      </div>
    </div>
  );
}

// ── CALENDAR VIEW ─────────────────────────────────────
function CalView({orders,workPlans,workSchedules,shopEvents,kpiLogs,isBoss}){
  const now=new Date();
  const [tab,setTab]=useState("week");
  const [month,setMonth]=useState(now.getMonth());
  const [year,setYear]=useState(now.getFullYear());
  const ws=new Date(now); ws.setDate(now.getDate()-now.getDay());
  const weekDays=Array.from({length:7},(_,i)=>{ const d=new Date(ws); d.setDate(ws.getDate()+i); return d; });
  const firstDay=new Date(year,month,1).getDay();
  const dim=new Date(year,month+1,0).getDate();
  const cells=Array(firstDay).fill(null).concat(Array.from({length:dim},(_,i)=>i+1));
  while(cells.length%7!==0)cells.push(null);
  const weeks=[]; for(let i=0;i<cells.length;i+=7)weeks.push(cells.slice(i,i+7));
  const navM=d=>{ let m=month+d,y=year; if(m<0){m=11;y--;}if(m>11){m=0;y++;}setMonth(m);setYear(y); };
  const upcoming=orders.filter(o=>o.status!=="done").sort((a,b)=>new Date(a.deadline)-new Date(b.deadline)).slice(0,6);
  return(
    <div>
      <div style={{display:"flex",gap:6,marginBottom:12,background:C.bg,borderRadius:8,padding:4}}>
        {[{k:"week",l:"Weekly"},{k:"month",l:"Monthly"}].map(t=><button key={t.k} onClick={()=>setTab(t.k)} style={{flex:1,padding:"7px",background:tab===t.k?C.surface:"transparent",color:tab===t.k?C.text:C.muted,border:tab===t.k?`1px solid ${C.border}`:"1px solid transparent",borderRadius:6,fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:11,cursor:"pointer"}}>{t.l}</button>)}
      </div>
      {tab==="week"&&weekDays.map(wd=>{
        const dk=wd.toISOString().slice(0,10);
        const dayPlan=workPlans?.[dk]||{};
        const isToday=dk===todayKey();
        const dayOrders=orders.filter(o=>o.deadline===dk);
        const dayEvents=(shopEvents||[]).filter(e=>dk>=e.date&&dk<=(e.endDate||e.date));
        return(
          <div key={dk} style={{background:isToday?C.surface:C.bg,border:`1px solid ${isToday?C.accent+"44":C.border}`,borderRadius:8,padding:"10px 12px",marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:Object.keys(dayPlan).length>0||dayEvents.length>0?8:0}}>
              <span style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,color:isToday?C.accent:C.text}}>{DAY_TH[wd.getDay()]} {wd.getDate()} {MONTHS_TH[wd.getMonth()]}{isToday&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:C.accent,letterSpacing:2,marginLeft:8}}>TODAY</span>}</span>
              {dayOrders.length>0&&<span style={{fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace"}}>📦 {dayOrders.length}</span>}
            </div>
            {dayEvents.map((e,i)=>{ const et=EVENT_TYPES.find(t=>t.key===e.type); return <div key={i} style={{background:et?.color+"20",border:`1px solid ${et?.color}44`,borderLeft:`3px solid ${et?.color}`,borderRadius:5,padding:"4px 8px",marginBottom:4,fontSize:11,color:et?.color,fontFamily:"'DM Mono',monospace"}}>{et?.icon} {e.title||et?.label}</div>; })}
            {TEAM.filter(m=>dayPlan[m]).map(m=>{
              const dt=DAY_TYPES.find(d=>d.key===dayPlan[m]);
              const entry=kpiLogs?.[`${dk}__${m}`];
              const passed=entry?kpiPass({...entry,dayType:dayPlan[m]}):null;
              return(
                <div key={m} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.muted,minWidth:80}}>{m}</span>
                  <span style={{fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:9,color:dt?.color,background:dt?.color+"15",border:`1px solid ${dt?.color}30`,borderRadius:3,padding:"2px 8px"}}>{dt?.label}</span>
                  {passed===true&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:C.ok,fontWeight:700}}>✓ PASS</span>}
                  {passed===false&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:C.danger,fontWeight:700}}>✗ MISS</span>}
                  {passed===null&&entry===undefined&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:C.muted}}>—</span>}
                </div>
              );
            })}
          </div>
        );
      })}
      {tab==="month"&&(
        <>
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <button onClick={()=>navM(-1)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,padding:"4px 10px",cursor:"pointer"}}>‹</button>
              <span style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:15,color:C.text}}>{MONTHS_TH[month]} {year}</span>
              <button onClick={()=>navM(1)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,padding:"4px 10px",cursor:"pointer"}}>›</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>{["อา","จ","อ","พ","พฤ","ศ","ส"].map(d=><div key={d} style={{textAlign:"center",fontSize:8,color:C.muted,fontFamily:"'DM Mono',monospace"}}>{d}</div>)}</div>
            {weeks.map((wk,wi)=>(
              <div key={wi} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
                {wk.map((day,di)=>{
                  const dk=day?`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`:null;
                  const isToday=dk===todayKey();
                  const ords=orders.filter(o=>o.deadline===dk);
                  const types=[...new Set(Object.values(workPlans?.[dk]||{}))];
                  const hasEvent=(shopEvents||[]).some(e=>dk&&dk>=e.date&&dk<=(e.endDate||e.date));
                  return(
                    <div key={di} style={{minHeight:38,background:day?(isToday?C.surface:C.bg):"transparent",borderRadius:4,padding:"2px",border:isToday?`1px solid ${C.accent}44`:"1px solid transparent"}}>
                      {day&&<div style={{fontSize:8,color:isToday?C.accent:C.muted,fontFamily:"'Syne',sans-serif",fontWeight:isToday?700:400}}>{day}</div>}
                      {ords.map((o,i)=>{ const st=STATUSES.find(s=>s.key===o.status); return <div key={i} style={{fontSize:5,background:st.color+"22",color:st.color,borderRadius:2,padding:"1px 2px",marginTop:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",fontFamily:"'DM Mono',monospace"}}>{o.customer}</div>; })}
                      {types.map((t,i)=>{ const dt=DAY_TYPES.find(d=>d.key===t); return dt?<div key={i} style={{fontSize:5,background:dt.color+"15",color:dt.color,borderRadius:2,padding:"1px 2px",marginTop:1,fontFamily:"'DM Mono',monospace"}}>{dt.short}</div>:null; })}
                      {hasEvent&&<div style={{fontSize:6}}>📌</div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {(()=>{
            // Sort ALL non-done orders by deadline
            const sorted=orders
              .filter(o=>o.deadline)
              .sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
            if(sorted.length===0) return <div style={{color:C.muted,fontSize:11,fontFamily:"'DM Mono',monospace",textAlign:"center",padding:20}}>ไม่มีออเดอร์</div>;
            let lastMonth="";
            return sorted.map(o=>{
              const st=STATUSES.find(s=>s.key===o.status);
              const dl=daysLeft(o.deadline);
              const oMonth=o.deadline?.slice(0,7);
              const [oY,oM]=oMonth.split("-").map(Number);
              const monthLabel=`${MONTHS_TH[oM-1]} ${oY}`;
              const showDivider=oMonth!==lastMonth;
              lastMonth=oMonth;
              return(
                <div key={o.id}>
                  {showDivider&&(
                    <div style={{display:"flex",alignItems:"center",gap:8,margin:"12px 0 8px"}}>
                      <div style={{flex:1,height:1,background:C.border}}/>
                      <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:C.accent,letterSpacing:2,background:C.bg,padding:"0 8px"}}>{monthLabel}</span>
                      <div style={{flex:1,height:1,background:C.border}}/>
                    </div>
                  )}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:C.surface,borderRadius:8,marginBottom:5,borderLeft:`2px solid ${st.color}`}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:C.text}}>{o.customer}</span>
                        <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:st.color,background:st.color+"18",borderRadius:3,padding:"1px 6px"}}>{st.label}</span>
                      </div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.muted,marginBottom:4}}>{o.model}</div>
                      <MiniProgress progress={o.status==="done"?100:(o.progress||0)}/>
                    </div>
                    <div style={{flexShrink:0,marginLeft:10,textAlign:"right"}}>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:dl<0?C.danger:dl<=2?"#f59e0b":C.muted}}>{dl<0?"OVERDUE":`${dl}d`}</div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:C.muted,marginTop:2}}>{o.deadline?.slice(5)}</div>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </>
      )}
    </div>
  );
}

// ── PLANNER ───────────────────────────────────────────
function WorkPlanner({workPlans,setWorkPlans,workSchedules,setWorkSchedules,shopEvents,setShopEvents,orders}){
  const now=new Date();
  const [pm,setPm]=useState(now.getMonth());
  const [py,setPy]=useState(now.getFullYear());
  const [selDay,setSelDay]=useState(null);
  const [showAddEv,setShowAddEv]=useState(false);
  const [newEv,setNewEv]=useState({type:"booth",title:"",date:todayKey(),endDate:"",note:""});
  const [showAddSch,setShowAddSch]=useState(false);
  const [newSch,setNewSch]=useState({orderId:"",startDate:todayKey(),days:1,assignee:TEAM[0]});
  const navM=d=>{ let m=pm+d,y=py; if(m<0){m=11;y--;}if(m>11){m=0;y++;}setPm(m);setPy(y); };
  const set=(dk,member,dayType)=>{ setWorkPlans(p=>{ const cur=p[dk]||{}; const next={...cur}; if(dayType)next[member]=dayType; else delete next[member]; const updated={...p,[dk]:next}; save("cit-work-plans",updated); fsSet("cit-work-plans",updated); return updated; }); };
  const applyAll=(dk,dayType)=>TEAM.forEach(m=>set(dk,m,dayType));
  const addEv=()=>{ if(!newEv.date)return; const next=[...(shopEvents||[]),{id:Date.now(),...newEv}]; setShopEvents(next); save("cit-shop-events",next); fsSet("cit-shop-events",next); setShowAddEv(false); setNewEv({type:"booth",title:"",date:todayKey(),endDate:"",note:""}); };
  const delEv=id=>{ const next=(shopEvents||[]).filter(e=>e.id!==id); setShopEvents(next); save("cit-shop-events",next); fsSet("cit-shop-events",next); };
  const addSch=()=>{ if(!newSch.orderId)return; const next=[...(workSchedules||[]),{id:Date.now(),...newSch,days:Number(newSch.days)||1}]; setWorkSchedules(next); save("cit-work-schedules",next); fsSet("cit-work-schedules",next); setShowAddSch(false); };
  const delSch=id=>{ const next=(workSchedules||[]).filter(s=>s.id!==id); setWorkSchedules(next); save("cit-work-schedules",next); fsSet("cit-work-schedules",next); };
  const firstDay=new Date(py,pm,1).getDay();
  const dim=new Date(py,pm+1,0).getDate();
  const cells=Array(firstDay).fill(null).concat(Array.from({length:dim},(_,i)=>i+1));
  while(cells.length%7!==0)cells.push(null);
  const weeks=[]; for(let i=0;i<cells.length;i+=7)weeks.push(cells.slice(i,i+7));
  return(
    <div>
      {/* Month nav */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <button onClick={()=>navM(-1)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,padding:"5px 12px",cursor:"pointer"}}>‹</button>
        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:15,color:C.text}}>{MONTHS_TH[pm]} {py}</span>
        <button onClick={()=>navM(1)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,padding:"5px 12px",cursor:"pointer"}}>›</button>
      </div>
      {/* Calendar grid */}
      <div style={S.card}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>{["อา","จ","อ","พ","พฤ","ศ","ส"].map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace"}}>{d}</div>)}</div>
        {weeks.map((wk,wi)=>(
          <div key={wi} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
            {wk.map((day,di)=>{
              const dk=day?`${py}-${String(pm+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`:null;
              const dp=dk?workPlans[dk]||{}:{};
              const isToday=dk===todayKey();
              const isSel=dk===selDay;
              const types=[...new Set(Object.values(dp))];
              const mainDt=types.length>0?DAY_TYPES.find(d=>d.key===types[0]):null;
              const hasEv=(shopEvents||[]).some(e=>dk&&dk>=e.date&&dk<=(e.endDate||e.date));
              return(
                <div key={di} onClick={()=>dk&&setSelDay(isSel?null:dk)} style={{minHeight:44,background:day?(isSel?C.surface:isToday?"#1c1000":C.bg):"transparent",borderRadius:5,padding:"3px",border:isSel?`1px solid ${C.accent}`:isToday?`1px solid ${C.accent}44`:"1px solid transparent",cursor:day?"pointer":"default"}}>
                  {day&&<div style={{fontSize:9,color:isSel?C.accent:isToday?C.accent:C.muted,fontFamily:"'Syne',sans-serif",fontWeight:isSel||isToday?700:400,marginBottom:2}}>{day}</div>}
                  {mainDt&&<div style={{height:3,background:mainDt.color,borderRadius:1,marginBottom:2}}/>}
                  {types.length>0&&<div style={{display:"flex",gap:1}}>{types.map(t=>{ const dt2=DAY_TYPES.find(d=>d.key===t); return dt2?<div key={t} style={{width:5,height:5,borderRadius:"50%",background:dt2.color}}/>:null; })}</div>}
                  {hasEv&&<div style={{fontSize:6}}>📌</div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* Day detail panel */}
      {selDay&&(()=>{
        const dp=workPlans[selDay]||{};
        const d=new Date(selDay+"T00:00:00");
        const dayEvs=(shopEvents||[]).filter(e=>selDay>=e.date&&selDay<=(e.endDate||e.date));
        return(
          <div style={{...S.card,border:`1px solid ${C.accent}44`,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:selDay===todayKey()?C.accent:C.text}}>{DAY_TH[d.getDay()]} {d.getDate()} {MONTHS_TH[d.getMonth()]} {d.getFullYear()}</span>
              <div style={{display:"flex",gap:4}}>
                {DAY_TYPES.map(dt=><button key={dt.key} onClick={()=>applyAll(selDay,dt.key)} style={{fontSize:9,background:dt.color+"15",color:dt.color,border:`1px solid ${dt.color}30`,borderRadius:4,padding:"3px 7px",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontWeight:600}}>{dt.short}</button>)}
                <button onClick={()=>applyAll(selDay,null)} style={{fontSize:9,background:C.surface,color:C.muted,border:`1px solid ${C.border}`,borderRadius:4,padding:"3px 7px",cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>CLR</button>
              </div>
            </div>
            {TEAM.map(m=>{ const cur=dp[m]; 
              // Get assigned orders for this member on this day
              const planKey=`${selDay}__${m}`;
              const dayLog={}; // Will be read from kpiLogs if passed
              const assignedOrders=(orders||[]).filter(o=>o.status!=="done");
              return(
              <div key={m} style={{marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:C.muted,minWidth:90}}>{m}</span>
                  <div style={{display:"flex",gap:4,flex:1}}>
                    {DAY_TYPES.map(dt=><button key={dt.key} onClick={()=>set(selDay,m,cur===dt.key?null:dt.key)} style={{flex:1,padding:"6px 2px",background:cur===dt.key?dt.color+"25":"transparent",color:cur===dt.key?dt.color:C.muted,border:`1px solid ${cur===dt.key?dt.color+"60":C.border}`,borderRadius:6,fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:10,cursor:"pointer"}}>{dt.short}</button>)}
                    {cur&&<button onClick={()=>set(selDay,m,null)} style={{padding:"6px 8px",background:"transparent",color:C.muted,border:`1px solid ${C.border}`,borderRadius:6,fontSize:10,cursor:"pointer"}}>✕</button>}
                  </div>
                </div>
                {/* Order assignment for PROD/DEPEND days */}
                {(cur==="production"||cur==="depend")&&(
                  <div style={{marginLeft:90,marginTop:4}}>
                    <div style={{fontSize:8,color:C.muted,fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:4}}>ออเดอร์ที่ทำวันนี้</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {assignedOrders.map(o=>{
                        const assignKey=`planAssign_${selDay}_${m}`;
                        const assigned=((workPlans[selDay]||{})[`${m}_orders`]||[]).includes(String(o.id));
                        const st2=STATUSES.find(s=>s.key===o.status);
                        return(
                          <button key={o.id} onClick={()=>{
                            const cur2=((workPlans[selDay]||{})[`${m}_orders`]||[]);
                            const next=assigned?cur2.filter(x=>x!==String(o.id)):[...cur2,String(o.id)];
                            setWorkPlans(p=>{ const updated={...p,[selDay]:{...(p[selDay]||{}),[`${m}_orders`]:next}}; save("cit-work-plans",updated); fsSet("cit-work-plans",updated); return updated; });
                          }} style={{padding:"3px 8px",background:assigned?st2?.color+"25":"transparent",color:assigned?st2?.color:C.muted,border:`1px solid ${assigned?st2?.color+"55":C.border}`,borderRadius:5,fontFamily:"'DM Mono',monospace",fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>
                            {assigned&&<span style={{fontSize:8}}>✓</span>}
                            <span>{o.customer}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ); })}
            {dayEvs.length>0&&<div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`}}>{dayEvs.map(e=>{ const et=EVENT_TYPES.find(t=>t.key===e.type); return <div key={e.id} style={{fontSize:11,color:et?.color,fontFamily:"'DM Mono',monospace",marginBottom:2}}>{et?.icon} {e.title||et?.label}</div>; })}</div>}
          </div>
        );
      })()}
      {/* Shop Events */}
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:10,letterSpacing:1,color:C.accent,fontFamily:"'DM Mono',monospace",fontWeight:600}}>📅 กิจกรรมพิเศษ</span>
          <button onClick={()=>setShowAddEv(s=>!s)} style={{background:C.accent,color:C.bg,border:"none",borderRadius:6,padding:"5px 10px",fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:600,cursor:"pointer"}}>+ เพิ่ม</button>
        </div>
        {showAddEv&&(
          <div style={{...S.card,border:`1px solid ${C.accent}33`,marginBottom:8}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
              {EVENT_TYPES.map(et=><button key={et.key} onClick={()=>setNewEv(n=>({...n,type:et.key}))} style={{padding:"4px 8px",background:newEv.type===et.key?et.color+"20":"transparent",color:newEv.type===et.key?et.color:C.muted,border:`1px solid ${newEv.type===et.key?et.color+"55":C.border}`,borderRadius:5,fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer"}}>{et.icon} {et.label}</button>)}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div><label style={S.lbl}>ชื่อกิจกรรม</label><input style={S.inp} value={newEv.title} onChange={e=>setNewEv(n=>({...n,title:e.target.value}))} placeholder="เช่น บูธ Central World"/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><label style={S.lbl}>วันเริ่ม</label><input type="date" style={S.inp} value={newEv.date} onChange={e=>setNewEv(n=>({...n,date:e.target.value}))}/></div>
                <div><label style={S.lbl}>วันสิ้นสุด</label><input type="date" style={S.inp} value={newEv.endDate} onChange={e=>setNewEv(n=>({...n,endDate:e.target.value}))}/></div>
              </div>
              <div><label style={S.lbl}>โน้ต</label><input style={S.inp} value={newEv.note} onChange={e=>setNewEv(n=>({...n,note:e.target.value}))}/></div>
              <button onClick={addEv} style={{background:C.accent,color:C.bg,border:"none",borderRadius:6,padding:"8px",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,cursor:"pointer"}}>+ บันทึก</button>
            </div>
          </div>
        )}
        {(shopEvents||[]).filter(e=>{ const d=new Date(e.date); return d.getMonth()===pm&&d.getFullYear()===py; }).map(e=>{ const et=EVENT_TYPES.find(t=>t.key===e.type); return(
          <div key={e.id} style={{background:C.bg,border:`1px solid ${et?.color||C.accent}44`,borderLeft:`3px solid ${et?.color||C.accent}`,borderRadius:8,padding:"8px 12px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,color:C.text}}>{et?.icon} {e.title||et?.label}</div><div style={{fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace"}}>{e.date}{e.endDate&&` → ${e.endDate}`}</div></div>
            <button onClick={()=>delEv(e.id)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}>✕</button>
          </div>
        ); })}
      </div>
      {/* Multi-day schedules */}
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:10,letterSpacing:1,color:"#8BA7C7",fontFamily:"'DM Mono',monospace",fontWeight:600}}>📋 แผนงานหลายวัน</span>
          <button onClick={()=>setShowAddSch(s=>!s)} style={{background:"#8BA7C7",color:C.bg,border:"none",borderRadius:6,padding:"5px 10px",fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:600,cursor:"pointer"}}>+ เพิ่ม</button>
        </div>
        {showAddSch&&(
          <div style={{...S.card,border:"1px solid #8BA7C733",marginBottom:8}}>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div><label style={S.lbl}>ออเดอร์</label><select style={S.inp} value={newSch.orderId} onChange={e=>setNewSch(n=>({...n,orderId:e.target.value}))}><option value="">-- เลือกออเดอร์ --</option>{orders.filter(o=>o.status!=="done").map(o=><option key={o.id} value={o.id}>{o.customer} — {o.model}</option>)}</select></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                <div><label style={S.lbl}>วันเริ่ม</label><input type="date" style={S.inp} value={newSch.startDate} onChange={e=>setNewSch(n=>({...n,startDate:e.target.value}))}/></div>
                <div><label style={S.lbl}>จำนวนวัน</label><input type="number" min="1" style={S.inp} value={newSch.days} onChange={e=>setNewSch(n=>({...n,days:e.target.value}))}/></div>
                <div><label style={S.lbl}>ช่าง</label><select style={S.inp} value={newSch.assignee} onChange={e=>setNewSch(n=>({...n,assignee:e.target.value}))}>{TEAM.map(t=><option key={t}>{t}</option>)}</select></div>
              </div>
              <button onClick={addSch} style={{background:"#8BA7C7",color:C.bg,border:"none",borderRadius:6,padding:"8px",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,cursor:"pointer"}}>+ บันทึก</button>
            </div>
          </div>
        )}
        {(workSchedules||[]).map(s=>{ const o=orders.find(x=>String(x.id)===String(s.orderId)); const st=o?STATUSES.find(x=>x.key===o.status):null; const end=new Date(s.startDate); end.setDate(end.getDate()+s.days-1); return(
          <div key={s.id} style={{background:C.bg,border:`1px solid ${st?.color||C.border}44`,borderLeft:`3px solid ${st?.color||"#8BA7C7"}`,borderRadius:8,padding:"8px 12px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,color:C.text}}>{o?.customer||"?"}</div><div style={{fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace"}}>{s.assignee} · {s.startDate} → {end.toISOString().slice(0,10)} ({s.days}วัน)</div></div>
            <button onClick={()=>delSch(s.id)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}>✕</button>
          </div>
        ); })}
      </div>
    </div>
  );
}

// ── KPI TRACKER ───────────────────────────────────────
function KpiTracker({isBoss,workPlans,orders,setOrders}){
  const [logs,setLogs]=useState(()=>load("cit-kpi-logs",{}));
  const [selDate,setSelDate]=useState(todayKey());
  const [selMember,setSelMember]=useState(TEAM[0]);
  const setEntry=u=>{ 
    const next={...logs,[`${selDate}__${selMember}`]:u}; 
    setLogs(next); 
    save("cit-kpi-logs",next); 
    fsSet("cit-kpi-logs",next); 
  };
  const setField=(sec,fld,val)=>setEntry({...entry,[sec]:{...(entry[sec]||{}),[fld]:Number(val)||0}});
  const assignedDT=workPlans?.[selDate]?.[selMember]||null;
  const entry=logs[`${selDate}__${selMember}`]||{dayType:assignedDT||"production",production:{},content:{},design:{},note:"",bossComment:"",linkedOrders:[],dependTasks:"",dependResult:""};
  const dt=assignedDT||entry.dayType;
  const passed=kpiPass({...entry,dayType:dt});
  const dtObj=DAY_TYPES.find(d=>d.key===dt);
  const teamSum=isBoss?TEAM.map(m=>{ 
    const e=logs[`${selDate}__${m}`]; 
    const asgn=workPlans?.[selDate]?.[m]||null; 
    // Get linked orders from both KPI log and Planner assignment
    const kpiLinked=(e?.linkedOrders||[]).map(id=>orders?.find(o=>String(o.id)===String(id))).filter(Boolean);
    const planLinked=((workPlans?.[selDate]||{})[`${m}_orders`]||[]).map(id=>orders?.find(o=>String(o.id)===String(id))).filter(Boolean);
    // Merge and deduplicate
    const allLinked=[...kpiLinked,...planLinked.filter(o=>!kpiLinked.find(k=>k.id===o.id))];
    return{m,logged:!!e,ok:e?kpiPass({...e,dayType:asgn||e.dayType}):false,dayType:asgn||e?.dayType,linked:allLinked}; 
  }):[];
  const prodSizeOk=(entry.production?.small||0)>=KPI.production.small||(entry.production?.medium||0)>=KPI.production.medium||(entry.production?.large||0)>=KPI.production.large;
  const footageOk=(entry.production?.footage||0)>=KPI.production.footage;
  const updateOrderProgress=(orderId,progress)=>{ const next=orders.map(o=>String(o.id)===String(orderId)?{...o,progress}:o); setOrders(next); save("cit-orders-v3",next); fsSet("cit-orders-v3",next); };
  return(
    <div>
      {isBoss&&(
        <div style={S.card}>
          <div style={{fontSize:10,letterSpacing:1,color:C.accent,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:10}}>TEAM — {selDate}</div>
          <div style={{display:"flex",gap:6}}>
            {teamSum.map(({m,logged,ok,dayType,linked})=>{ const dtc=DAY_TYPES.find(d=>d.key===dayType); return(
              <div key={m} onClick={()=>setSelMember(m)} style={{flex:1,background:selMember===m?C.surface:C.bg,border:`1px solid ${selMember===m?C.accent:C.border}`,borderRadius:8,padding:"8px 6px",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,color:C.text,marginBottom:2}}>{m}</div>
                {dtc&&<div style={{fontSize:8,color:dtc.color,fontFamily:"'DM Mono',monospace",marginBottom:2}}>{dtc.short}</div>}
                {logged?<div style={{fontSize:11,color:ok?C.ok:C.danger}}>{ok?"✓ PASS":"✗ MISS"}</div>:<div style={{fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace"}}>ยังไม่กรอก</div>}
                {linked?.length>0&&(
                  <div style={{marginTop:4,width:"100%"}}>
                    {linked.map(o=>{ const st2=STATUSES.find(s=>s.key===o.status); return(
                      <div key={o.id} style={{marginTop:3}}>
                        <div style={{fontSize:7,color:C.muted,fontFamily:"'DM Mono',monospace",marginBottom:1,textAlign:"left"}}>{o.customer}</div>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <div style={{flex:1,height:2,background:C.border,borderRadius:1}}><div style={{height:"100%",width:`${o.progress||0}%`,background:st2?.color||C.accent,borderRadius:1}}/></div>
                          <span style={{fontSize:7,color:st2?.color,fontFamily:"'DM Mono',monospace",minWidth:20}}>{Math.round(o.progress||0)}%</span>
                        </div>
                      </div>
                    ); })}
                  </div>
                )}
              </div>
            ); })}
          </div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:isBoss?"1fr 1fr":"1fr",gap:8,marginBottom:12}}>
        <div><label style={S.lbl}>วันที่</label><input type="date" style={S.inp} value={selDate} onChange={e=>setSelDate(e.target.value)}/></div>
        {isBoss&&<div><label style={S.lbl}>ช่าง</label><select style={S.inp} value={selMember} onChange={e=>setSelMember(e.target.value)}>{TEAM.map(t=><option key={t}>{t}</option>)}</select></div>}
      </div>
      {assignedDT&&<div style={{background:dtObj?.color+"12",border:`1px solid ${dtObj?.color}30`,borderRadius:8,padding:"8px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:12,color:dtObj?.color}}>{dtObj?.label}</span><span style={{fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace"}}>— กำหนดโดย Smallbrush</span></div>}
      <div style={S.card}>
        <div style={{fontSize:10,letterSpacing:1,color:dtObj?.color,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:12}}>{dtObj?.label||"DAY"}</div>
        {/* Linked orders with progress */}
        {(dt==="production"||dt==="depend")&&(
          <div style={{background:C.bg,border:`1px solid ${C.accent}33`,borderRadius:8,padding:"10px 12px",marginBottom:12}}>
            <div style={{fontSize:10,color:C.accent,fontFamily:"'DM Mono',monospace",fontWeight:600,marginBottom:8}}>ออเดอร์ที่ทำวันนี้</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {orders.filter(o=>o.status!=="done").map(o=>{
                const linked=(entry.linkedOrders||[]).includes(String(o.id));
                const st2=STATUSES.find(s=>s.key===o.status);
                return(
                  <div key={o.id}>
                    <button onClick={()=>{ const cur=entry.linkedOrders||[]; const next=linked?cur.filter(x=>x!==String(o.id)):[...cur,String(o.id)]; setEntry({...entry,linkedOrders:next}); }} style={{padding:"5px 10px",background:linked?st2?.color+"25":"transparent",color:linked?st2?.color:C.muted,border:`1px solid ${linked?st2?.color+"55":C.border}`,borderRadius:6,fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",gap:4,width:"100%"}}>
                      {linked&&<span>✓</span>}<span style={{fontWeight:600}}>{o.customer}</span><span style={{fontSize:9,opacity:0.6,marginLeft:2}}>{o.model?.split(" ").slice(0,2).join(" ")}</span>
                    </button>
                    {linked&&(
                      <div style={{padding:"8px 10px",background:C.surface,borderRadius:"0 0 6px 6px",border:`1px solid ${st2?.color}33`,borderTop:"none"}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace"}}>Progress</span>
                          <span style={{fontSize:10,color:st2?.color,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{Math.round(o.progress||0)}%</span>
                        </div>
                        <div style={{position:"relative",height:26,display:"flex",alignItems:"center"}}>
                          <div style={{position:"absolute",width:"100%",height:5,background:C.border,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${o.progress||0}%`,background:st2?.color,borderRadius:2}}/></div>
                          <input type="range" min="0" max="100" step="5" value={o.progress||0} onChange={e=>updateOrderProgress(o.id,Number(e.target.value))} style={{position:"absolute",width:"100%",opacity:0,cursor:"pointer",height:26}}/>
                          <div style={{position:"absolute",left:`calc(${o.progress||0}% - 8px)`,width:16,height:16,background:st2?.color,borderRadius:"50%",border:`2px solid ${C.bg}`,pointerEvents:"none"}}/>
                        </div>
                        <div style={{display:"flex",gap:4,marginTop:4}}>{[0,25,50,75,100].map(p=><button key={p} onClick={()=>updateOrderProgress(o.id,p)} style={{fontSize:9,color:Math.round(o.progress||0)===p?st2?.color:C.muted,background:"transparent",border:`1px solid ${Math.round(o.progress||0)===p?st2?.color:C.border}`,borderRadius:4,padding:"2px 6px",cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>{p}%</button>)}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Production KPI */}
        {dt==="production"&&(
          <>
            <div style={{background:C.bg,borderRadius:6,padding:"8px 10px",marginBottom:12,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace",marginBottom:6}}>ต้องทำอย่างใดอย่างหนึ่ง</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                {[{fld:"small",label:"เล็ก",target:1.5},{fld:"medium",label:"กลาง",target:1},{fld:"large",label:"ใหญ่",target:0.25}].map(({fld,label,target})=>{
                  const val=entry.production?.[fld]||0;
                  const ok2=val>=target;
                  return(
                    <div key={fld} style={{background:ok2?C.ok+"15":C.surface,border:`1px solid ${ok2?C.ok+"44":C.border}`,borderRadius:6,padding:"8px"}}>
                      <div style={{fontSize:9,color:ok2?C.ok:C.muted,fontFamily:"'DM Mono',monospace",marginBottom:4}}>{label} (≥{target})</div>
                      <input type="number" min="0" step="0.25" style={{...S.inp,padding:"6px 8px",fontSize:13,fontWeight:700,color:ok2?C.ok:C.text,background:"transparent",border:`1px solid ${C.border}`}} value={val||""} onChange={e=>setField("production",fld,e.target.value)} placeholder="0"/>
                    </div>
                  );
                })}
              </div>
              {prodSizeOk&&<div style={{marginTop:6,fontSize:9,color:C.ok,fontFamily:"'DM Mono',monospace"}}>✓ ผ่านเป้าขนาดงาน</div>}
            </div>
            <div style={{background:footageOk?C.ok+"12":C.surface,border:`1px solid ${footageOk?C.ok+"44":C.border}`,borderRadius:6,padding:"10px",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div><label style={S.lbl}>Raw Footage</label><div style={{fontSize:8,color:C.accent,fontFamily:"'DM Mono',monospace"}}>ต้องถ่ายทุกวัน</div></div>
                <span style={{fontSize:10,color:footageOk?C.ok:C.danger,fontFamily:"'DM Mono',monospace"}}>{entry.production?.footage||0}/2 คลิป</span>
              </div>
              <input type="number" min="0" style={S.inp} value={entry.production?.footage||""} onChange={e=>setField("production","footage",e.target.value)} placeholder="0"/>
              <div style={{marginTop:4}}><MiniBar pct={((entry.production?.footage||0)/2)*100} color={footageOk?C.ok:C.danger}/></div>
            </div>
          </>
        )}
        {dt==="content"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[{fld:"posts",label:"โพสต์",target:1,unit:"โพสต์"},{fld:"footage",label:"Raw Footage",target:3,unit:"คลิป"},{fld:"reels",label:"Reels",target:3,unit:"ชิ้น"}].map(({fld,label,target,unit})=>(
              <div key={fld}><label style={S.lbl}>{label}</label>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace"}}>{label}</span><span style={{fontSize:10,color:(entry.content?.[fld]||0)>=target?C.ok:C.danger,fontFamily:"'DM Mono',monospace"}}>{entry.content?.[fld]||0}/{target} {unit}</span></div>
                <input type="number" min="0" style={S.inp} value={entry.content?.[fld]||""} onChange={e=>setField("content",fld,e.target.value)} placeholder="0"/>
                <div style={{marginTop:4}}><MiniBar pct={((entry.content?.[fld]||0)/target)*100} color={(entry.content?.[fld]||0)>=target?C.ok:C.danger}/></div>
              </div>
            ))}
          </div>
        )}
        {dt==="design"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><label style={S.lbl}>แบบที่ออกแบบ</label><span style={{fontSize:10,color:(entry.design?.designs||0)>=4?C.ok:C.danger,fontFamily:"'DM Mono',monospace"}}>{entry.design?.designs||0}/4 แบบ</span></div>
            <input type="number" min="0" style={S.inp} value={entry.design?.designs||""} onChange={e=>setField("design","designs",e.target.value)} placeholder="0"/>
            <div style={{marginTop:4}}><MiniBar pct={((entry.design?.designs||0)/4)*100} color={(entry.design?.designs||0)>=4?C.ok:C.danger}/></div>
          </div>
        )}
        {dt==="depend"&&(
          <div>
            <div style={{marginBottom:10}}><label style={S.lbl}>งานที่มอบหมายวันนี้</label><textarea style={{...S.inp,minHeight:80,resize:"vertical"}} value={entry.dependTasks||""} onChange={e=>setEntry({...entry,dependTasks:e.target.value})} placeholder={"- ถ่ายรูปชิ้นงาน\n- ส่งงานลูกค้า"}/></div>
            <div style={{marginBottom:10}}><label style={S.lbl}>ผลการทำงาน</label><textarea style={{...S.inp,minHeight:60,resize:"vertical"}} value={entry.dependResult||""} onChange={e=>setEntry({...entry,dependResult:e.target.value})} placeholder="บันทึกสิ่งที่ทำเสร็จ..."/></div>
            {isBoss&&<div style={{display:"flex",gap:8}}><button onClick={()=>setEntry({...entry,dependPass:true})} style={{flex:1,padding:"10px",background:entry.dependPass===true?C.ok+"20":"transparent",color:entry.dependPass===true?C.ok:C.muted,border:`1px solid ${entry.dependPass===true?C.ok+"60":C.border}`,borderRadius:6,fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:12,cursor:"pointer"}}>✓ PASS</button><button onClick={()=>setEntry({...entry,dependPass:false})} style={{flex:1,padding:"10px",background:entry.dependPass===false?C.danger+"20":"transparent",color:entry.dependPass===false?C.danger:C.muted,border:`1px solid ${entry.dependPass===false?C.danger+"60":C.border}`,borderRadius:6,fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:12,cursor:"pointer"}}>✗ MISS</button></div>}
            {!isBoss&&<div style={{background:C.bg,borderRadius:6,padding:"8px 12px",border:`1px solid ${C.border}`,fontSize:11,color:C.muted,fontFamily:"'DM Mono',monospace"}}>Smallbrush จะประเมินผล</div>}
          </div>
        )}
        <div style={{height:1,background:C.border,margin:"12px 0"}}/>
        <div style={{textAlign:"center",padding:"10px",background:passed?C.ok+"12":C.danger+"12",border:`1px solid ${passed?C.ok+"44":C.danger+"44"}`,borderRadius:8}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:14,color:passed?C.ok:C.danger,letterSpacing:2}}>{passed?"✓  KPI PASSED":"✗  KPI MISSED"}</div>
        </div>
      </div>
      <div style={{marginBottom:10}}><label style={S.lbl}>บันทึก / ปัญหา</label><textarea style={{...S.inp,minHeight:68,resize:"vertical"}} value={entry.note||""} onChange={e=>setEntry({...entry,note:e.target.value})} placeholder="บันทึกข้อคิดเห็น..."/></div>
      {isBoss&&<div><label style={{...S.lbl,color:C.accent}}>Smallbrush Comment</label><textarea style={{...S.inp,minHeight:52,resize:"vertical",borderColor:C.accent+"33"}} value={entry.bossComment||""} onChange={e=>setEntry({...entry,bossComment:e.target.value})} placeholder="ความคิดเห็นหัวหน้า..."/></div>}
    </div>
  );
}

// ── FINANCE VIEW ──────────────────────────────────────
function FinanceView({orders}){
  const now=new Date();
  const [sm,setSm]=useState(now.getMonth());
  const [sy,setSy]=useState(now.getFullYear());
  const [tab,setTab]=useState("overview");
  const mk=`${sy}-${String(sm+1).padStart(2,"0")}`;
  const [exp,setExp]=useState(()=>load("cit-expenses",{}));
  const [prods,setProds]=useState(()=>load("cit-products",[]));
  const [sales,setSales]=useState(()=>load("cit-sales",{}));
  const [newExp,setNewExp]=useState({cat:"อุปกรณ์",label:"",amount:""});
  const [newProd,setNewProd]=useState({name:"",price:"",stock:"",cat:"paint"});
  const navM=d=>{ let m=sm+d,y=sy; if(m<0){m=11;y--;}if(m>11){m=0;y++;}setSm(m);setSy(y); };
  const mExp=exp[mk]||[];
  const mSales=sales[mk]||{};
  const saveExp=arr=>{ setExp(e=>{ const n={...e,[mk]:arr}; save("cit-expenses",n); return n; }); };
  const saveSales=s=>{ setSales(x=>{ const n={...x,[mk]:s}; save("cit-sales",n); return n; }); };
  const ordRev=orders.filter(o=>o.created&&new Date(o.created).toISOString().slice(0,7)===mk).reduce((s,o)=>s+(o.price||0),0);
  const prodRev=prods.reduce((s,p)=>s+(p.price||0)*(mSales[p.id]||0),0);
  const totalRev=ordRev+prodRev;
  const totalExp=mExp.reduce((s,e)=>s+(e.amount||0),0);
  const net=totalRev-totalExp;
  const CATS=["ค่าเช่า","อุปกรณ์","ค่าโฆษณา","เงินเดือน","อื่นๆ"];
  const PROD_CATS=[{key:"paint",label:"สีและอุปกรณ์",color:"#C9A96E"},{key:"cloth",label:"ถุงเท้า",color:"#8BA7C7"},{key:"lace",label:"เชือก",color:"#8BC7A7"},{key:"pack",label:"Packaging",color:"#C7B98B"},{key:"other",label:"อื่นๆ",color:"#A78BC7"}];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <button onClick={()=>navM(-1)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,padding:"5px 12px",cursor:"pointer"}}>‹</button>
        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:16,color:C.text}}>{MONTHS_TH[sm]} {sy}</span>
        <button onClick={()=>navM(1)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,padding:"5px 12px",cursor:"pointer"}}>›</button>
      </div>
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.border}`,marginBottom:12,overflowX:"auto"}}>
        {["overview","expenses","products"].map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:"7px 14px 7px 0",background:"none",border:"none",borderBottom:`2px solid ${tab===t?C.accent:"transparent"}`,color:tab===t?C.accent:C.muted,fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:10,letterSpacing:1,cursor:"pointer",whiteSpace:"nowrap",marginBottom:-1}}>{t.toUpperCase()}</button>)}
      </div>
      {tab==="overview"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[{l:"รายรับ",v:totalRev,c:C.accent},{l:"รายจ่าย",v:totalExp,c:C.danger},{l:"กำไร",v:net,c:net>=0?C.ok:C.danger}].map(({l,v,c})=><div key={l} style={{background:C.surface,border:`1px solid ${C.border}`,borderTop:`2px solid ${c}`,borderRadius:8,padding:"12px",textAlign:"center"}}><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:c}}>฿{fmt(Math.abs(v))}</div><div style={{fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace",marginTop:2}}>{l}</div></div>)}
          </div>
        </div>
      )}
      {tab==="expenses"&&(
        <div>
          <div style={S.card}>
            <div style={{fontSize:10,color:C.danger,fontFamily:"'DM Mono',monospace",fontWeight:600,letterSpacing:1,marginBottom:8}}>เพิ่มรายจ่าย</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div><label style={S.lbl}>หมวด</label><select style={S.inp} value={newExp.cat} onChange={e=>setNewExp(n=>({...n,cat:e.target.value}))}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label style={S.lbl}>รายละเอียด</label><input style={S.inp} value={newExp.label} onChange={e=>setNewExp(n=>({...n,label:e.target.value}))}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
              <div><label style={S.lbl}>จำนวน (฿)</label><input type="number" style={S.inp} value={newExp.amount} onChange={e=>setNewExp(n=>({...n,amount:e.target.value}))}/></div>
              <div style={{display:"flex",alignItems:"flex-end"}}><button onClick={()=>{ if(!newExp.amount)return; saveExp([...mExp,{id:Date.now(),cat:newExp.cat,label:newExp.label||newExp.cat,amount:Number(newExp.amount)}]); setNewExp({cat:"อุปกรณ์",label:"",amount:""}); }} style={{background:C.danger,color:"#fff",border:"none",borderRadius:6,padding:"8px 14px",fontSize:12,fontFamily:"'DM Mono',monospace",cursor:"pointer"}}>ADD</button></div>
            </div>
          </div>
          <div style={S.card}>
            <div style={{fontSize:10,color:C.danger,fontFamily:"'DM Mono',monospace",fontWeight:600,letterSpacing:1,marginBottom:8}}>รายจ่าย — ฿{fmt(totalExp)}</div>
            {mExp.map(e=><div key={e.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{fontFamily:"'Syne',sans-serif",fontSize:13,color:C.text}}>{e.label}</div><div style={{fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace"}}>{e.cat}</div></div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.danger}}>฿{fmt(e.amount)}</span><button onClick={()=>saveExp(mExp.filter(x=>x.id!==e.id))} style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}>✕</button></div></div>)}
          </div>
        </div>
      )}
      {tab==="products"&&(
        <div>
          <div style={S.card}>
            <div style={{fontSize:10,color:"#8BA7C7",fontFamily:"'DM Mono',monospace",fontWeight:600,letterSpacing:1,marginBottom:8}}>เพิ่มสินค้า</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
              {PROD_CATS.map(c=><button key={c.key} onClick={()=>setNewProd(n=>({...n,cat:c.key}))} style={{padding:"4px 8px",background:newProd.cat===c.key?c.color+"20":"transparent",color:newProd.cat===c.key?c.color:C.muted,border:`1px solid ${newProd.cat===c.key?c.color+"55":C.border}`,borderRadius:5,fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer"}}>{c.label}</button>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:8}}>
              <div><label style={S.lbl}>ชื่อสินค้า</label><input style={S.inp} value={newProd.name} onChange={e=>setNewProd(n=>({...n,name:e.target.value}))}/></div>
              <div><label style={S.lbl}>ราคา</label><input type="number" style={S.inp} value={newProd.price} onChange={e=>setNewProd(n=>({...n,price:e.target.value}))}/></div>
              <div><label style={S.lbl}>Stock</label><input type="number" style={S.inp} value={newProd.stock} onChange={e=>setNewProd(n=>({...n,stock:e.target.value}))}/></div>
              <div style={{display:"flex",alignItems:"flex-end"}}><button onClick={()=>{ if(!newProd.name||!newProd.price)return; const n=[...prods,{id:Date.now(),name:newProd.name,price:Number(newProd.price),stock:Number(newProd.stock)||0,cat:newProd.cat}]; setProds(n); save("cit-products",n); setNewProd({name:"",price:"",stock:"",cat:newProd.cat}); }} style={{background:"#8BA7C7",color:C.bg,border:"none",borderRadius:6,padding:"8px 12px",fontSize:12,fontFamily:"'DM Mono',monospace",cursor:"pointer"}}>ADD</button></div>
            </div>
          </div>
          {PROD_CATS.map(cat=>{ const cp=prods.filter(p=>p.cat===cat.key); if(!cp.length)return null; return(
            <div key={cat.key} style={{background:C.surface,border:`1px solid ${cat.color}33`,borderLeft:`3px solid ${cat.color}`,borderRadius:10,padding:14,marginBottom:12}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:11,color:cat.color,letterSpacing:1,marginBottom:10}}>{cat.label}</div>
              {cp.map(p=>{ const qty=mSales[p.id]||0; const left=Math.max(0,(p.stock||0)-qty); const lc=left===0?C.danger:left<=3?"#C7B98B":C.ok; return(
                <div key={p.id} style={{background:C.bg,borderRadius:8,padding:"10px 12px",marginBottom:8,border:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}><div><div style={{fontFamily:"'Syne',sans-serif",fontSize:14,color:C.text,fontWeight:600}}>{p.name}</div><div style={{fontSize:10,color:C.muted,fontFamily:"'DM Mono',monospace"}}>฿{fmt(p.price)}/ชิ้น {p.stock>0&&`· เหลือ ${left}/${p.stock}`}</div></div><button onClick={()=>{ const n=prods.filter(x=>x.id!==p.id); setProds(n); save("cit-products",n); }} style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}>✕</button></div>
                  {p.stock>0&&<div style={{marginBottom:8}}><div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${(left/p.stock)*100}%`,background:lc,borderRadius:2}}/></div></div>}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace"}}>ขาย</span>
                      <button onClick={()=>saveSales({...mSales,[p.id]:Math.max(0,qty-1)})} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:4,width:24,height:24,cursor:"pointer"}}>−</button>
                      <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:C.text,minWidth:20,textAlign:"center"}}>{qty}</span>
                      <button onClick={()=>saveSales({...mSales,[p.id]:qty+1})} style={{background:cat.color,border:"none",color:C.bg,borderRadius:4,width:24,height:24,cursor:"pointer",fontWeight:700}}>+</button>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:9,color:C.muted}}>Stock</span>
                      <button onClick={()=>{ const n=prods.map(x=>x.id===p.id?{...x,stock:Math.max(0,(x.stock||0)-1)}:x); setProds(n); save("cit-products",n); }} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:4,width:22,height:22,cursor:"pointer",fontSize:10}}>−</button>
                      <span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:12,color:lc,minWidth:18,textAlign:"center"}}>{p.stock||0}</span>
                      <button onClick={()=>{ const n=prods.map(x=>x.id===p.id?{...x,stock:(x.stock||0)+1}:x); setProds(n); save("cit-products",n); }} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:4,width:22,height:22,cursor:"pointer",fontSize:10}}>+</button>
                    </div>
                    <span style={{fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:12,color:cat.color}}>฿{fmt(p.price*qty)}</span>
                  </div>
                </div>
              ); })}
            </div>
          ); })}
        </div>
      )}
    </div>
  );
}

// ── STATS VIEW ────────────────────────────────────────
function StatsView({orders,kpiLogs,workPlans}){
  const now=new Date();
  const [selMember,setSelMember]=useState(TEAM[0]);
  const [selMonth,setSelMonth]=useState(now.getMonth());
  const [selYear,setSelYear]=useState(now.getFullYear());
  const navM=d=>{ let m=selMonth+d,y=selYear; if(m<0){m=11;y--;}if(m>11){m=0;y++;}setSelMonth(m);setSelYear(y); };
  const mk=`${selYear}-${String(selMonth+1).padStart(2,"0")}`;
  const daysInMonth=new Date(selYear,selMonth+1,0).getDate();

  // Calculate stats for selected member in selected month
  const dayStats=[];
  for(let d=1;d<=daysInMonth;d++){
    const dk=`${mk}-${String(d).padStart(2,"0")}`;
    const entry=kpiLogs[`${dk}__${selMember}`];
    const assignedDT=workPlans?.[dk]?.[selMember]||null;
    if(!entry&&!assignedDT) continue;
    const dt=assignedDT||entry?.dayType;
    const passed=entry?kpiPass({...entry,dayType:dt}):null;
    const linked=(entry?.linkedOrders||[]).map(id=>orders.find(o=>String(o.id)===String(id))).filter(Boolean);
    dayStats.push({dk,dt,passed,entry,linked,d});
  }

  const totalDays=dayStats.filter(d=>d.entry).length;
  const passDays=dayStats.filter(d=>d.passed===true).length;
  const failDays=dayStats.filter(d=>d.passed===false).length;
  const passRate=totalDays>0?Math.round((passDays/totalDays)*100):null;

  // Weekly breakdown
  const weeks=[];
  for(let w=0;w<5;w++){
    const wDays=dayStats.filter(d=>Math.ceil(d.d/7)===w+1);
    if(wDays.length===0) continue;
    const wPass=wDays.filter(d=>d.passed===true).length;
    const wTotal=wDays.filter(d=>d.entry).length;
    weeks.push({w:w+1,pass:wPass,total:wTotal,rate:wTotal>0?Math.round((wPass/wTotal)*100):null});
  }

  // Orders participated in
  const participatedOrders=[...new Set(dayStats.flatMap(d=>d.linked.map(o=>o.id)))].map(id=>orders.find(o=>o.id===id)).filter(Boolean);

  // Production stats
  const prodDays=dayStats.filter(d=>d.dt==="production"&&d.entry);
  const avgSmall=prodDays.length>0?(prodDays.reduce((s,d)=>s+(d.entry?.production?.small||0),0)/prodDays.length).toFixed(2):0;
  const avgMedium=prodDays.length>0?(prodDays.reduce((s,d)=>s+(d.entry?.production?.medium||0),0)/prodDays.length).toFixed(2):0;
  const avgLarge=prodDays.length>0?(prodDays.reduce((s,d)=>s+(d.entry?.production?.large||0),0)/prodDays.length).toFixed(2):0;
  const avgFootage=prodDays.length>0?(prodDays.reduce((s,d)=>s+(d.entry?.production?.footage||0),0)/prodDays.length).toFixed(1):0;

  return(
    <div>
      {/* Member selector */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {TEAM.map(m=><button key={m} onClick={()=>setSelMember(m)} style={{flex:1,padding:"10px",background:selMember===m?C.accent+"25":"transparent",color:selMember===m?C.accent:C.muted,border:`1px solid ${selMember===m?C.accent:C.border}`,borderRadius:8,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>{m}</button>)}
      </div>
      {/* Month nav */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <button onClick={()=>navM(-1)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,padding:"5px 12px",cursor:"pointer"}}>‹</button>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:14,color:C.text}}>{MONTHS_TH[selMonth]} {selYear}</span>
        <button onClick={()=>navM(1)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,padding:"5px 12px",cursor:"pointer"}}>›</button>
      </div>
      {/* KPI Summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
        {[
          {l:"PASS RATE",v:passRate===null?"—":`${passRate}%`,c:passRate===null?C.muted:passRate>=80?C.ok:passRate>=50?"#f59e0b":C.danger},
          {l:"PASSED",v:passDays,c:C.ok},
          {l:"MISSED",v:failDays,c:C.danger},
        ].map(({l,v,c})=>(
          <div key={l} style={{background:C.surface,border:`1px solid ${C.border}`,borderTop:`2px solid ${c}`,borderRadius:8,padding:"12px",textAlign:"center"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:c}}>{v}</div>
            <div style={{fontSize:8,color:C.muted,fontFamily:"'DM Mono',monospace",letterSpacing:1,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
      {/* Pass rate bar */}
      {passRate!==null&&<div style={{...S.card,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.muted}}>KPI Pass Rate</span>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:passRate>=80?C.ok:passRate>=50?"#f59e0b":C.danger,fontWeight:700}}>{passRate}%</span>
        </div>
        <div style={{height:6,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${passRate}%`,background:passRate>=80?C.ok:passRate>=50?"#f59e0b":C.danger,borderRadius:3}}/></div>
      </div>}
      {/* Weekly breakdown */}
      {weeks.length>0&&<div style={S.card}>
        <div style={{fontSize:9,color:C.accent,fontFamily:"'DM Mono',monospace",letterSpacing:2,marginBottom:10}}>WEEKLY BREAKDOWN</div>
        {weeks.map(({w,pass,total,rate})=>(
          <div key={w} style={{marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.muted}}>Week {w}</span>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:rate===null?C.muted:rate>=80?C.ok:rate>=50?"#f59e0b":C.danger}}>{total===0?"ไม่มีข้อมูล":`${pass}/${total} (${rate}%)`}</span>
            </div>
            {rate!==null&&<div style={{height:3,background:C.border,borderRadius:2}}><div style={{height:"100%",width:`${rate}%`,background:rate>=80?C.ok:rate>=50?"#f59e0b":C.danger,borderRadius:2}}/></div>}
          </div>
        ))}
      </div>}
      {/* Production averages */}
      {prodDays.length>0&&<div style={S.card}>
        <div style={{fontSize:9,color:C.accent,fontFamily:"'DM Mono',monospace",letterSpacing:2,marginBottom:10}}>PRODUCTION AVERAGE / วัน</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[{l:"งานเล็ก",v:avgSmall,t:1.5},{l:"งานกลาง",v:avgMedium,t:1},{l:"งานใหญ่",v:avgLarge,t:0.25},{l:"Footage",v:avgFootage,t:2}].map(({l,v,t})=>(
            <div key={l} style={{background:C.bg,borderRadius:6,padding:"8px 10px"}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:C.muted,letterSpacing:1,marginBottom:3}}>{l}</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:Number(v)>=t?C.ok:C.muted}}>{v}</div>
              <div style={{fontSize:7,color:C.muted,fontFamily:"'DM Mono',monospace"}}>เป้า {t}</div>
            </div>
          ))}
        </div>
      </div>}
      {/* Participated orders */}
      {participatedOrders.length>0&&<div style={S.card}>
        <div style={{fontSize:9,color:C.accent,fontFamily:"'DM Mono',monospace",letterSpacing:2,marginBottom:10}}>ออเดอร์ที่มีส่วนร่วม</div>
        {participatedOrders.map(o=>{ const st=STATUSES.find(s=>s.key===o.status); return(
          <div key={o.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,color:C.text}}>{o.customer}</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:C.muted,marginTop:1}}>{o.model}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:st?.color,background:st?.color+"18",borderRadius:3,padding:"2px 6px",marginBottom:3}}>{st?.label}</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:C.muted}}>{Math.round(o.progress||0)}%</div>
            </div>
          </div>
        ); })}
      </div>}
      {/* Day by day log */}
      {dayStats.length>0&&<div style={S.card}>
        <div style={{fontSize:9,color:C.accent,fontFamily:"'DM Mono',monospace",letterSpacing:2,marginBottom:10}}>DAILY LOG</div>
        {dayStats.map(({dk,dt,passed,d,linked})=>{
          const dtObj=DAY_TYPES.find(x=>x.key===dt);
          return(
            <div key={dk} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.muted,minWidth:36}}>{String(d).padStart(2,"0")}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:linked.length>0?3:0}}>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:dtObj?.color,background:dtObj?.color+"15",borderRadius:3,padding:"1px 6px"}}>{dtObj?.short}</span>
                  {passed===true&&<span style={{fontSize:9,color:C.ok,fontFamily:"'DM Mono',monospace"}}>✓</span>}
                  {passed===false&&<span style={{fontSize:9,color:C.danger,fontFamily:"'DM Mono',monospace"}}>✗</span>}
                  {passed===null&&<span style={{fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace"}}>—</span>}
                </div>
                {linked.length>0&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:C.muted}}>{linked.map(o=>o.customer).join(", ")}</div>}
              </div>
            </div>
          );
        })}
      </div>}
      {dayStats.length===0&&<div style={{textAlign:"center",color:C.muted,padding:40,fontFamily:"'DM Mono',monospace",fontSize:11}}>ไม่มีข้อมูลเดือนนี้</div>}
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────
function Dashboard({orders,kpiLogs,workPlans}){
  const totalRev=orders.reduce((s,o)=>s+(o.price||0),0);
  const totalOwed=orders.filter(o=>!o.fullPaid).reduce((s,o)=>s+Math.max(0,(o.price||0)-(o.deposit||0)),0);
  const last7=Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return d.toISOString().slice(0,10); });
  const mStats=TEAM.map(m=>{ let pass=0,total=0; last7.forEach(dk=>{ const e=kpiLogs[`${dk}__${m}`]; if(!e)return; total++; if(kpiPass({...e,dayType:workPlans?.[dk]?.[m]||e.dayType}))pass++; }); return{m,pass,total,rate:total>0?Math.round((pass/total)*100):null}; });
  const platStats=PLATFORMS.map(p=>({...p,count:orders.filter(o=>o.platform===p.key).length})).filter(p=>p.count>0);
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        {[{l:"รายรับรวม",v:`฿${fmt(totalRev)}`,c:C.accent},{l:"ยอดค้างรับ",v:`฿${fmt(totalOwed)}`,c:C.danger},{l:"ออเดอร์ทั้งหมด",v:orders.length,c:"#8BA7C7"},{l:"IN PROGRESS",v:orders.filter(o=>o.status==="inprogress").length,c:C.ok}].map(({l,v,c})=><div key={l} style={{background:C.surface,border:`1px solid ${C.border}`,borderTop:`2px solid ${c}`,borderRadius:8,padding:"12px",textAlign:"center"}}><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:c}}>{v}</div><div style={{fontSize:9,color:C.muted,fontFamily:"'DM Mono',monospace",marginTop:2}}>{l}</div></div>)}
      </div>
      <div style={S.card}>
        <div style={{fontSize:10,color:C.accent,fontFamily:"'DM Mono',monospace",fontWeight:600,letterSpacing:1,marginBottom:10}}>KPI 7 วันล่าสุด</div>
        {mStats.map(({m,pass,total,rate})=><div key={m} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:C.muted}}>{m}</span><span style={{fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:12,color:rate===null?C.muted:rate>=80?C.ok:rate>=50?"#C7B98B":C.danger}}>{rate===null?"ไม่มีข้อมูล":`${pass}/${total} (${rate}%)`}</span></div>{rate!==null&&<MiniBar pct={rate} color={rate>=80?C.ok:rate>=50?"#C7B98B":C.danger}/>}</div>)}
      </div>
      {platStats.length>0&&<div style={S.card}>
        <div style={{fontSize:10,color:C.accent,fontFamily:"'DM Mono',monospace",fontWeight:600,letterSpacing:1,marginBottom:10}}>แหล่งที่มาลูกค้า</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {platStats.map(p=><div key={p.key} style={{flex:1,minWidth:60,background:C.bg,border:`1px solid ${p.color}33`,borderRadius:8,padding:"8px",textAlign:"center"}}><div style={{fontSize:16}}>{p.icon}</div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:p.color}}>{p.count}</div><div style={{fontSize:8,color:C.muted,fontFamily:"'DM Mono',monospace"}}>{p.label}</div></div>)}
        </div>
      </div>}
      <div style={S.card}>
        <div style={{fontSize:10,color:C.danger,fontFamily:"'DM Mono',monospace",fontWeight:600,letterSpacing:1,marginBottom:8}}>ยังค้างชำระ</div>
        {orders.filter(o=>!o.fullPaid&&(o.price||0)>(o.deposit||0)).length===0?<div style={{color:C.muted,fontSize:12,fontFamily:"'DM Mono',monospace"}}>ไม่มีค้างชำระ ✓</div>:orders.filter(o=>!o.fullPaid&&(o.price||0)>(o.deposit||0)).map(o=><div key={o.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,color:C.text}}>{o.customer}</span><span style={{fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.danger}}>฿{fmt((o.price||0)-(o.deposit||0))}</span></div>)}
      </div>
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────
function Login({onBoss,onTeam}){
  const [pw,setPw]=useState(""); const [err,setErr]=useState(false);
  const tryBoss=()=>{ if(pw.trim()===BOSS_PW)onBoss(); else{ setErr(true); setTimeout(()=>setErr(false),1200); } };
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <link href={FONTS} rel="stylesheet"/>
      <div style={{width:"100%",maxWidth:320}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:32,letterSpacing:6,color:C.text,letterSpacing:-1}}>CUSTOMIT</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:4,color:C.muted,marginTop:4}}>TH // WORKSHOP OS</div>
          <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center",marginTop:8}}><div style={{width:6,height:6,borderRadius:"50%",background:C.ok}}/><span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:C.ok,letterSpacing:2}}>ONLINE</span></div>
        </div>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderTop:`2px solid ${C.accent}`,borderRadius:12,padding:20,marginBottom:10}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:10,letterSpacing:3,color:C.accent,marginBottom:14}}>SMALLBRUSH ACCESS</div>
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryBoss()} placeholder="รหัสผ่าน" style={{...S.inp,marginBottom:10,border:`1px solid ${err?C.danger:C.border}`}} autoComplete="off"/>
          {err&&<div style={{fontSize:10,color:C.danger,fontFamily:"'DM Mono',monospace",marginBottom:8,textAlign:"center"}}>รหัสผิด</div>}
          <button onClick={tryBoss} style={{width:"100%",background:C.accent,color:C.bg,border:"none",borderRadius:6,padding:11,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:3,cursor:"pointer"}}>ENTER</button>
        </div>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:20}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:10,letterSpacing:3,color:C.muted,marginBottom:14}}>TEAM ACCESS</div>
          <button onClick={onTeam} style={{width:"100%",background:"transparent",color:C.muted,border:`1px solid ${C.border}`,borderRadius:6,padding:11,fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:600,letterSpacing:3,cursor:"pointer"}}>ENTER AS TEAM</button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────
export default function App(){
  const [role,setRole]=useState(null);
  const [orders,setOrders]=useState(()=>load("cit-orders-v3",[]));
  const [kpiLogs,setKpiLogs]=useState(()=>load("cit-kpi-logs",{}));
  const [workPlans,setWorkPlans]=useState(()=>load("cit-work-plans",{}));
  const [workSchedules,setWorkSchedules]=useState(()=>load("cit-work-schedules",[]));
  const [shopEvents,setShopEvents]=useState(()=>load("cit-shop-events",[]));
  const [showAdd,setShowAdd]=useState(false);
  const [tab,setTab]=useState("orders");
  const [filterStatus,setFilterStatus]=useState("all");
  const [search,setSearch]=useState("");
  const writing=useRef(false);
  const pollRef=useRef({});

  // ── Firebase poll sync (every 8s) ──
  useEffect(()=>{
    if(!role) return;
    let mounted=true;
    const poll=async()=>{
      if(!mounted) return;
      try {
        const [o,k,wp,ws,se]=await Promise.all([
          fsGet("cit-orders-v3",null),
          fsGet("cit-kpi-logs",null),
          fsGet("cit-work-plans",null),
          fsGet("cit-work-schedules",null),
          fsGet("cit-shop-events",null),
        ]);
        if(!mounted||writing.current) return;
        if(o&&Array.isArray(o)) { setOrders(o); save("cit-orders-v3",o); }
        if(k&&typeof k==="object") { setKpiLogs(k); save("cit-kpi-logs",k); }
        if(wp&&typeof wp==="object") { setWorkPlans(wp); save("cit-work-plans",wp); }
        if(ws&&Array.isArray(ws)) { setWorkSchedules(ws); save("cit-work-schedules",ws); }
        if(se&&Array.isArray(se)) { setShopEvents(se); save("cit-shop-events",se); }
      } catch(e) {}
    };
    poll();
    const interval=setInterval(poll, 8000);
    return ()=>{ mounted=false; clearInterval(interval); };
  },[role]);

  if(!role) return <Login onBoss={()=>setRole("boss")} onTeam={()=>setRole("team")}/>;
  const isBoss=role==="boss";

  const add=o=>{ const next=[o,...orders]; writing.current=true; setOrders(next); save("cit-orders-v3",next); fsSet("cit-orders-v3",next).then(()=>{ writing.current=false; }); };
  const upd=o=>{ const next=orders.map(x=>x.id===o.id?o:x); writing.current=true; setOrders(next); save("cit-orders-v3",next); fsSet("cit-orders-v3",next).then(()=>{ writing.current=false; }); };
  const del=id=>{ const next=orders.filter(x=>x.id!==id); writing.current=true; setOrders(next); save("cit-orders-v3",next); fsSet("cit-orders-v3",next).then(()=>{ writing.current=false; }); };

  const nextId=Math.max(0,...orders.map(o=>o.id||0))+1;
  const filtered=orders
    .filter(o=>filterStatus==="all"||o.status===filterStatus)
    .filter(o=>!search||o.customer?.includes(search)||o.model?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>{ const p={urgent:0,normal:1,low:2}; return (p[a.priority]??1)-(p[b.priority]??1)||new Date(a.deadline)-new Date(b.deadline); });
  const counts=Object.fromEntries(STATUSES.map(s=>[s.key,orders.filter(o=>o.status===s.key).length]));
  const TABS=[{k:"orders",l:"Orders"},{k:"calendar",l:"Calendar"},{k:"kpi",l:"KPI"},...(isBoss?[{k:"planner",l:"Planner"},{k:"finance",l:"Finance"},{k:"stats",l:"Stats"},{k:"dashboard",l:"Dashboard"}]:[])];

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text}}>
      <link href={FONTS} rel="stylesheet"/>
      {/* Topbar */}
      <div style={{background:"#0e1014",borderBottom:`1px solid ${C.border}`,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8}}>
          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,letterSpacing:-0.5,color:C.text}}>CUSTOMIT</span>
          <span style={{fontSize:8,color:C.muted,fontFamily:"'DM Mono',monospace",letterSpacing:2}}>TH</span>
          {isBoss&&<span style={{fontSize:8,color:C.accent,background:C.accent+"20",borderRadius:4,padding:"2px 8px",fontFamily:"'DM Mono',monospace",letterSpacing:1,border:`1px solid ${C.accent}40`}}>SMALLBRUSH</span>}
        </div>
        <div style={{display:"flex",gap:8}}>
          {isBoss&&<button onClick={()=>setShowAdd(true)} style={{background:C.accent,color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:11,fontFamily:"'Syne',sans-serif",fontWeight:700,letterSpacing:1,cursor:"pointer"}}>+ NEW</button>}
          <button onClick={()=>setRole(null)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:5,color:C.muted,fontSize:10,padding:"5px 10px",cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>EXIT</button>
        </div>
      </div>
      {/* Status bar */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,overflowX:"auto"}}>
        {[{key:"all",label:"ALL",color:C.text,count:orders.length},...STATUSES.map(s=>({...s,count:counts[s.key]||0}))].map(s=>(
          <button key={s.key} onClick={()=>setFilterStatus(s.key)} style={{flex:1,minWidth:50,padding:"8px 4px",background:"transparent",border:"none",borderBottom:`2px solid ${filterStatus===s.key?s.color:"transparent"}`,cursor:"pointer"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:filterStatus===s.key?s.color:C.muted}}>{s.count}</div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:7,letterSpacing:1,color:filterStatus===s.key?s.color:C.muted,opacity:filterStatus===s.key?1:0.5}}>{s.label}</div>
          </button>
        ))}
      </div>
      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,padding:"0 16px",overflowX:"auto",background:C.surface}}>
        {TABS.map(t=><button key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 14px 9px 0",background:"none",border:"none",borderBottom:`2px solid ${tab===t.k?C.accent:"transparent"}`,color:tab===t.k?C.accent:C.muted,fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:10,letterSpacing:1,cursor:"pointer",marginBottom:-1,whiteSpace:"nowrap"}}>{t.l}</button>)}
      </div>
      {/* Content */}
      <div style={{padding:"14px 16px 80px"}}>
        {tab==="orders"&&(
          <>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search orders..." style={{...S.inp,marginBottom:12}}/>
            {STATUSES.map(st=>{ const group=filtered.filter(o=>o.status===st.key); if(!group.length)return null; return(
              <div key={st.key} style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:st.color}}/>
                  <span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:10,letterSpacing:2,color:st.color}}>{st.label}</span>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.muted}}>({group.length})</span>
                  <div style={{flex:1,height:1,background:st.color+"22"}}/>
                </div>
                {group.map(o=><OrderCard key={o.id} order={o} onUpdate={upd} onDelete={del} isBoss={isBoss} kpiLogs={kpiLogs}/>)}
              </div>
            ); })}
            {filtered.length===0&&<div style={{textAlign:"center",color:C.muted,padding:60,fontFamily:"'DM Mono',monospace",letterSpacing:2,fontSize:12}}>NO ORDERS</div>}
          </>
        )}
        {tab==="calendar"&&<CalView orders={orders} workPlans={workPlans} workSchedules={workSchedules} shopEvents={shopEvents} kpiLogs={kpiLogs} isBoss={isBoss}/>}
        {tab==="kpi"&&<KpiTracker isBoss={isBoss} workPlans={workPlans} orders={orders} setOrders={upd_orders=>{ setOrders(upd_orders); save("cit-orders-v3",upd_orders); fsSet("cit-orders-v3",upd_orders); }}/>}
        {tab==="planner"&&isBoss&&<WorkPlanner workPlans={workPlans} setWorkPlans={setWorkPlans} workSchedules={workSchedules} setWorkSchedules={setWorkSchedules} shopEvents={shopEvents} setShopEvents={setShopEvents} orders={orders}/>}
        {tab==="finance"&&isBoss&&<FinanceView orders={orders}/>}
        {tab==="stats"&&isBoss&&<StatsView orders={orders} kpiLogs={kpiLogs} workPlans={workPlans}/>}
        {tab==="dashboard"&&isBoss&&<Dashboard orders={orders} kpiLogs={kpiLogs} workPlans={workPlans}/>}
      </div>
      {showAdd&&<AddModal onClose={()=>setShowAdd(false)} onAdd={add} nextId={nextId} isBoss={isBoss}/>}
    </div>
  );
}
