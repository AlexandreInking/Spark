import { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Input, Label, Textarea, Select, Badge } from "../components/ui/primitives";
import { db } from "../lib/db";
import { useAuth } from "../stores/useAuth";
import type { GeneralReminder } from "../types";
import { Trash2, Plus, Edit3, DollarSign, FileText } from "lucide-react";

export default function RemindersPage(){
  const { user } = useAuth();
  const [items, setItems] = useState<GeneralReminder[]>([]);
  const [show, setShow]=useState(false);
  const [editing, setEditing]=useState<GeneralReminder|null>(null);

  const load=async()=>{ if(!user) return; const list=await db.listReminders(user.id); setItems(list); };
  useEffect(()=>{ load(); },[user?.id]);

  const save=async(data:Partial<GeneralReminder>)=>{
    if(!user) return;
    if(!data.title?.trim() || !data.dueDate || !data.dueTime) return alert("Título, fecha y hora requeridos");
    const now=new Date().toISOString();
    const item:GeneralReminder={
      id: editing?.id || crypto.randomUUID(),
      userId:user.id,
      title:data.title!.trim(),
      description:data.description?.trim(),
      dueDate:data.dueDate!,
      dueTime:data.dueTime!,
      type:data.type||"pago",
      amount: data.amount? Number(data.amount): undefined,
      paid: data.paid||false,
      priority: data.priority||"media",
      reminderMinutesBefore: Number(data.reminderMinutesBefore)||60,
      recurring: data.recurring||"none",
      createdAt: editing?.createdAt||now
    };
    await db.saveReminder(item);
    setShow(false); setEditing(null);
    await load();
  };

  return (
    <div style={{ flex:1, overflow:"auto" }}>
      <Topbar title="Pagos y trámites" subtitle="Recordatorios no ligados a curso • con alarma y sonido" actions={<Button variant="primary" onClick={()=>{ setEditing(null); setShow(true); }}><Plus size={14}/> Nuevo recordatorio</Button>} />
      <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14 }}>
        {show && <ReminderForm initial={editing||undefined} onClose={()=>{ setShow(false); setEditing(null); }} onSave={save} />}
        {items.length===0? <Card><p className="muted">Sin pagos/trámites. Crea uno para que aparezca en calendario y notifique.</p></Card> : (
          <div className="grid grid-2">
            {items.map(r=>(
              <Card key={r.id}>
                <div className="flex justify-between items-center">
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    {r.type==="pago"? <DollarSign size={14} style={{ color:"#d97706" }}/>: <FileText size={14} style={{ color:"#7c3aed" }}/>}
                    <b style={{ fontSize:13 }}>{r.title}</b>
                    <Badge variant={r.type==="pago"?"warn":"info"}>{r.type}</Badge>
                    {r.paid && <Badge variant="success">pagado</Badge>}
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <Button size="sm" onClick={()=>{ setEditing(r); setShow(true); }}><Edit3 size={12}/></Button>
                    <Button size="sm" onClick={async()=>{ if(confirm("Eliminar?")){ await db.deleteReminder(r.id); await load(); }}}><Trash2 size={12}/></Button>
                  </div>
                </div>
                <div className="muted small" style={{ marginTop:6 }}>{r.dueDate} {r.dueTime} {r.amount?`• $${r.amount}`:""} • prioridad {r.priority} • recuerda {r.reminderMinutesBefore} min antes {r.recurring!=="none"?`• ${r.recurring}`:""}</div>
                {r.description && <div style={{ marginTop:6, fontSize:12 }}>{r.description}</div>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReminderForm({ initial, onClose, onSave }:{ initial?: Partial<GeneralReminder>; onClose:()=>void; onSave:(d:Partial<GeneralReminder>)=>void }){
  const [title,setTitle]=useState(initial?.title||"");
  const [desc,setDesc]=useState(initial?.description||"");
  const [dueDate,setDueDate]=useState(initial?.dueDate|| new Date().toISOString().slice(0,10));
  const [dueTime,setDueTime]=useState(initial?.dueTime||"09:00");
  const [type,setType]=useState(initial?.type||"pago");
  const [amount,setAmount]=useState(initial?.amount!==undefined? String(initial.amount):"");
  const [priority,setPriority]=useState(initial?.priority||"media");
  const [reminder,setReminder]=useState(String(initial?.reminderMinutesBefore||60));
  const [recurring,setRecurring]=useState(initial?.recurring||"none");
  const [paid,setPaid]=useState(initial?.paid||false);
  return (
    <Card>
      <div className="flex justify-between items-center"><b>{initial?.id?"Editar":"Nuevo"} pago/trámite</b><Button size="sm" onClick={onClose}>Cerrar</Button></div>
      <div className="grid grid-3" style={{ marginTop:10 }}>
        <div style={{ gridColumn:"span 2" }}><Label>Título *</Label><Input value={title} onChange={e=> setTitle(e.target.value)} placeholder="Pago matrícula, Trámite título..." /></div>
        <div><Label>Tipo</Label><Select value={type} onChange={e=> setType(e.target.value as any)}><option value="pago">pago</option><option value="tramite">trámite</option><option value="otro">otro</option></Select></div>
      </div>
      <div style={{ marginTop:8 }}><Label>Descripción</Label><Textarea value={desc} onChange={e=> setDesc(e.target.value)} placeholder="Detalles..." /></div>
      <div className="grid grid-3" style={{ marginTop:8 }}>
        <div><Label>Fecha *</Label><Input type="date" value={dueDate} onChange={e=> setDueDate(e.target.value)} /></div>
        <div><Label>Hora *</Label><Input type="time" value={dueTime} onChange={e=> setDueTime(e.target.value)} /></div>
        <div><Label>Monto $ (si pago)</Label><Input type="number" value={amount} onChange={e=> setAmount(e.target.value)} placeholder="0" /></div>
      </div>
      <div className="grid grid-3" style={{ marginTop:8 }}>
        <div><Label>Prioridad</Label><Select value={priority} onChange={e=> setPriority(e.target.value as any)}><option value="alta">alta</option><option value="media">media</option><option value="baja">baja</option></Select></div>
        <div><Label>Recordatorio min antes</Label><Input type="number" value={reminder} onChange={e=> setReminder(e.target.value)} /></div>
        <div><Label>Recurrencia</Label><Select value={recurring} onChange={e=> setRecurring(e.target.value as any)}><option value="none">no</option><option value="semanal">semanal</option><option value="mensual">mensual</option></Select></div>
      </div>
      <label style={{ display:"flex", gap:8, alignItems:"center", marginTop:10 }}><input type="checkbox" checked={paid} onChange={e=> setPaid(e.target.checked)} /> Pagado / realizado</label>
      <div style={{ marginTop:12, display:"flex", gap:8 }}><Button variant="primary" className="w-full" onClick={()=> onSave({ title, description:desc, dueDate, dueTime, type:type as any, amount: amount? Number(amount): undefined, priority:priority as any, reminderMinutesBefore:Number(reminder), recurring:recurring as any, paid })}>Guardar</Button><Button onClick={onClose}>Cancelar</Button></div>
    </Card>
  );
}
