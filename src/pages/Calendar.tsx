import { useMemo, useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Badge, Button } from "../components/ui/primitives";
import { exportWeekPng } from "../lib/scheduleImage";
import { useData } from "../stores/useData";
import { useAuth } from "../stores/useAuth";
import { detectOverlaps } from "../lib/overlap";
import { db } from "../lib/db";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { Deliverable, GeneralReminder, JobOffer } from "../types";
import { nextPayDates, todayISO, upcomingDatedBonuses } from "../lib/jobScore";
import { addDays, parseISO, format } from "date-fns";

export default function CalendarPage() {
  const { courses, deliverables } = useData();
  const { user } = useAuth();
  const [selected, setSelected] = useState<any>(null);
  const [hover, setHover] = useState<{ title:string; subtitle:string; detail:string; color:string; x:number; y:number } | null>(null);
  const [reminders, setReminders] = useState<GeneralReminder[]>([]);
  const [jobs, setJobs] = useState<JobOffer[]>([]);

  useEffect(()=>{
    if(!user) return;
    db.listReminders(user.id).then(setReminders);
    db.listJobOffers(user.id).then(setJobs).catch(()=>{});
  }, [user?.id, deliverables.length]);

  // generar eventos de clases recurrentes
  const classEvents = useMemo(()=>{
    const evs: any[] = [];
    const rangeStart = new Date(); rangeStart.setHours(0,0,0,0);
    const rangeEnd = addDays(rangeStart, 60);
    for(const c of courses){
      if(!c.schedule.length) continue;
      const cStart = c.startDate ? parseISO(c.startDate) : rangeStart;
      const cEnd = c.endDate ? parseISO(c.endDate) : rangeEnd;
      const start = cStart > rangeStart ? cStart : rangeStart;
      const end = cEnd < rangeEnd ? cEnd : rangeEnd;
      for(let d=new Date(start); d<=end; d.setDate(d.getDate()+1)){
        const dow = d.getDay();
        for(const s of c.schedule){
          if(s.dayOfWeek !== dow) continue;
          const ds = format(d, "yyyy-MM-dd");
          const st = `${ds}T${s.startTime}:00`;
          const en = `${ds}T${s.endTime}:00`;
          // solo si dentro de rango curso
          if(ds < (c.startDate||"") || (c.endDate && ds > c.endDate)) continue;
          evs.push({
            id: `class_${c.id}_${s.id}_${ds}`,
            title: `${c.code} ${c.name} • ${s.type||"clase"}`,
            start: st,
            end: en,
            backgroundColor: c.color,
            borderColor: c.color,
            textColor: "#fff",
            extendedProps: { kind:"class", course:c, schedule:s, date:ds }
          });
        }
      }
    }
    return evs;
  }, [courses]);

  // turnos de trabajos contratados + fechas de cobro (v0.6.1, derivado: no se guarda nada)
  const workEvents = useMemo(()=>{
    const evs: any[] = [];
    const rangeStart = new Date(); rangeStart.setHours(0,0,0,0);
    const rangeEnd = addDays(rangeStart, 60);
    const today = todayISO();
    const endISO = todayISO(rangeEnd);
    for(const j of jobs){
      if(!j.hiredStart || j.showInCalendar === false) continue;
      // turnos semanales entre inicio y fin del contrato
      if(j.schedule?.length){
        const start = j.hiredStart > today ? j.hiredStart : today;
        const end = j.hiredEnd && j.hiredEnd < endISO ? j.hiredEnd : endISO;
        for(let ds = start; ds <= end; ){
          const dow = new Date(ds + "T12:00:00").getDay();
          for(const s of j.schedule){
            if(s.dayOfWeek !== dow) continue;
            evs.push({
              id: `work_${j.id}_${s.id}_${ds}`,
              title: `💼 ${j.company} — ${j.position}`,
              start: `${ds}T${s.startTime}:00`,
              end: `${ds}T${s.endTime}:00`,
              backgroundColor: "#b45309",
              borderColor: "#b45309",
              textColor: "#fff",
              extendedProps: { kind:"workjob", job:j, date:ds, slot:s }
            });
          }
          const nd = new Date(ds + "T12:00:00"); nd.setDate(nd.getDate()+1);
          ds = `${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,"0")}-${String(nd.getDate()).padStart(2,"0")}`;
        }
      }
      // cobros próximos dentro del rango
      for(const pd of nextPayDates(j, today, 4)){
        if(pd > endISO) continue;
        evs.push({
          id: `pay_${j.id}_${pd}`,
          title: `💰 Cobro ${j.company}${j.payAmount?` S/ ${j.payAmount}`:""}`,
          start: pd,
          allDay: true,
          backgroundColor: "#059669",
          borderColor: "#059669",
          extendedProps: { kind:"workpay", job:j, date:pd }
        });
      }
      // bonos con fecha de cobro dentro del rango
      for(const { date: pd, bonus } of upcomingDatedBonuses(j, today)){
        if(pd > endISO) continue;
        evs.push({
          id: `bonus_${j.id}_${bonus.id}`,
          title: `💰 Bono ${j.company} S/ ${bonus.amount}`,
          start: pd,
          allDay: true,
          backgroundColor: "#7c3aed",
          borderColor: "#7c3aed",
          extendedProps: { kind:"workpay", job:j, date:pd, bonus }
        });
      }
    }
    return evs;
  }, [jobs]);

  const events = useMemo(()=>{
    const delEvs = deliverables.map(d=>{
      const color = d.type==="entrevista" ? "#059669" : courses.find(c=> c.id===d.courseId)?.color || "#111827";
      const start = `${d.dueDate}T${d.dueTime}:00`;
      const end = new Date(new Date(start).getTime() + (d.durationMinutes||60)*60000).toISOString();
      const prefix = d.type==="entrevista" ? "💼" : courses.find(c=>c.id===d.courseId)?.code || "";
      return {
        id: d.id,
        title: `${prefix} ${d.title}`,
        start,
        end,
        backgroundColor: color,
        borderColor: color,
        extendedProps: { kind:"deliverable", d }
      };
    });
    const remEvs = reminders.map(r=>{
      const start = `${r.dueDate}T${r.dueTime}:00`;
      const end = new Date(new Date(start).getTime()+60*60000).toISOString();
      const color = r.type==="pago" ? "#d97706" : r.type==="tramite" ? "#7c3aed" : "#334155";
      return {
        id: r.id,
        title: `${r.type==="pago"?"💳":"📋"} ${r.title}${r.amount?` $${r.amount}`:""}`,
        start, end,
        backgroundColor: color,
        borderColor: color,
        extendedProps: { kind:"reminder", r }
      };
    });
    return [...delEvs, ...remEvs, ...classEvents, ...workEvents];
  }, [deliverables, courses, reminders, classEvents, workEvents]);

  const overlaps = useMemo(()=> detectOverlaps(deliverables), [deliverables]);

  return (
    <div style={{ flex:1, overflow:"auto" }}>
      <Topbar title="Calendario" subtitle="Clases + entregables + pagos/trámites + trabajos y cobros • hover para detalle" actions={
        <Button variant="primary" size="sm" onClick={() => exportWeekPng(courses, jobs)}>🖼 Exportar semana PNG</Button>
      } />
      <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14 }}>
        {overlaps.length>0 ? (
          <Card>
            <div className="alert-cross">
              <div style={{ fontSize:12, fontWeight:700, display:"flex", gap:6, alignItems:"center" }}>⚠️ {overlaps.length} alertas de solapamiento (mismo lapso)</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:8 }}>
                {overlaps.map((o,i)=>(
                  <div key={i} style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 10px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, fontSize:12.5 }}>
                    <Badge variant="warn">{o.reason}</Badge>
                    <span><b>{o.a.title}</b> ({o.a.dueDate} {o.a.dueTime})</span>
                    <span>↔</span>
                    <span><b>{o.b.title}</b> ({o.b.dueDate} {o.b.dueTime})</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <Card><div className="alert-cross" style={{ opacity:0.8 }}><div style={{ fontSize:12, fontWeight:700 }}>✓ Sin solapamientos en entregables</div><div className="muted small">Solo se alerta si coinciden fechas y lapsos.</div></div></Card>
        )}

        <Card style={{ position:"relative" }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{ left:"prev,next today", center:"title", right:"dayGridMonth,timeGridWeek,timeGridDay" }}
            events={events as any}
            height="auto"
            nowIndicator
            selectable
            eventClick={(info)=> {
              const p = (info.event.extendedProps as any);
              if(p.kind==="deliverable") setSelected({ kind:"deliverable", data:p.d });
              else if(p.kind==="reminder") setSelected({ kind:"reminder", data:p.r });
              else if(p.kind==="class") setSelected({ kind:"class", data:p });
              else if(p.kind==="workjob") setSelected({ kind:"workjob", data:p });
              else if(p.kind==="workpay") setSelected({ kind:"workpay", data:p });
            }}
            eventMouseEnter={(info)=>{
              const p = (info.event.extendedProps as any);
              const rect = (info.el as HTMLElement).getBoundingClientRect();
              let title="", subtitle="", detail="", color="#111827";
              if(p.kind==="deliverable"){
                const d:Deliverable=p.d;
                const c=courses.find(x=> x.id===d.courseId);
                title=`${d.type==="entrevista"?"💼":c?.code||""} ${d.title}`;
                subtitle=`${d.type} • ${d.priority} ${d.weekNumber?`• Sem ${d.weekNumber}`:""}`;
                detail=`${d.dueDate} ${d.dueTime} ${d.location?`• ${d.location}`:""} • ${d.durationMinutes||60} min`;
                color=d.type==="entrevista"?"#059669":c?.color||"#111827";
              } else if(p.kind==="class"){
                title=`${p.course.code} ${p.schedule.startTime}-${p.schedule.endTime}`;
                subtitle=`Clase ${p.schedule.type||""} • ${p.course.name}`;
                detail=`${p.date} en ${p.schedule.location}`;
                color=p.course.color;
              } else if(p.kind==="reminder"){
                const r=p.r;
                title=`${r.title}`;
                subtitle=`${r.type} ${r.amount?`$${r.amount}`:""} • ${r.priority}`;
                detail=`${r.dueDate} ${r.dueTime}`;
                color="#d97706";
              } else if(p.kind==="workjob"){
                title=`💼 ${p.job.company} — ${p.job.position}`;
                subtitle=`Turno • ${p.slot.startTime}-${p.slot.endTime}`;
                detail=`${p.date}${p.job.location?` en ${p.job.location}`:""}`;
                color="#b45309";
              } else if(p.kind==="workpay"){
                title = p.bonus ? `💰 Bono ${p.job.company} S/ ${p.bonus.amount}` : `💰 Cobro ${p.job.company}`;
                subtitle = p.bonus ? `${p.bonus.concept} • ${p.bonus.month}` : `${p.job.payAmount?`S/ ${p.job.payAmount}`:""} ${p.job.payRecurrence||""}`;
                detail=`${p.date}`;
                color = p.bonus ? "#7c3aed" : "#059669";
              }
              setHover({ title, subtitle, detail, color, x: rect.left + rect.width/2, y: rect.top });
            }}
            eventMouseLeave={()=> setHover(null)}
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            locale="es"
            buttonText={{ today:"Hoy", month:"Mes", week:"Semana", day:"Día" }}
          />
          {hover && (
            <div style={{
              position:"fixed",
              left: Math.min(hover.x, window.innerWidth-280),
              top: Math.max(12, hover.y - 10),
              transform: "translate(-50%, -100%)",
              zIndex: 40,
              background:"var(--surface)",
              border:"1px solid var(--border)",
              borderRadius:12,
              boxShadow:"var(--shadow-lg)",
              padding:"10px 12px",
              minWidth:240,
              maxWidth:320,
              pointerEvents:"none"
            }}>
              <div style={{ fontSize:12, fontWeight:700, display:"flex", gap:6, alignItems:"center" }}>
                <span className="dot" style={{ background: hover.color }}/>
                {hover.title}
              </div>
              <div className="muted small" style={{ marginTop:4 }}>{hover.subtitle}</div>
              <div className="muted small">{hover.detail}</div>
              <div style={{ fontSize:11, marginTop:6, color:"var(--text-faint)" }}>Solo visible en hover • Click para detalle</div>
            </div>
          )}
          <p className="muted small" style={{ marginTop:8 }}>Las clases aparecen recurridas entre inicio y fin del curso. Si no pusiste fechas, se muestran 60 días.</p>
        </Card>

        {selected && (
          <Card>
            <div className="flex justify-between items-center"><b>{selected.kind==="deliverable"? selected.data.title : selected.kind==="reminder"? selected.data.title : selected.kind==="workjob"? `💼 ${selected.data.job.company}` : selected.kind==="workpay"? `💰 Cobro ${selected.data.job.company}` : `${selected.data.course.code} ${selected.data.schedule.startTime}`}</b><button className="btn btn-sm" onClick={()=>setSelected(null)}>Cerrar</button></div>
            {selected.kind==="deliverable" && (
              <>
                <div className="muted small" style={{ marginTop:6 }}>
                  Curso: {courses.find(c=>c.id===selected.data.courseId)?.name || selected.data.courseId} • Tipo: {selected.data.type} • Prioridad: {selected.data.priority} • Peso: {selected.data.weight??"—"}% • Ubicación: {selected.data.location||"—"} • Duración: {selected.data.durationMinutes}min
                </div>
                <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>{selected.data.tags.map((t:string)=> <span key={t} className="badge">{t}</span>)}</div>
                {selected.data.description && <p style={{ fontSize:13 }}>{selected.data.description}</p>}
              </>
            )}
            {selected.kind==="class" && (
              <div className="muted small" style={{ marginTop:6 }}>
                Curso: {selected.data.course.name} ({selected.data.course.code}) • {selected.data.schedule.type} • {selected.data.date} {selected.data.schedule.startTime}-{selected.data.schedule.endTime} en {selected.data.schedule.location}
              </div>
            )}
            {selected.kind==="reminder" && (
              <div className="muted small" style={{ marginTop:6 }}>
                Tipo: {selected.data.type} • {selected.data.dueDate} {selected.data.dueTime} {selected.data.amount?`• $${selected.data.amount}`:""} • Prioridad {selected.data.priority} • {selected.data.paid?"Pagado":"Pendiente"}
              </div>
            )}
            {selected.kind==="workjob" && (
              <div className="muted small" style={{ marginTop:6 }}>
                Trabajo: {selected.data.job.company} — {selected.data.job.position} • {selected.data.date} {selected.data.slot.startTime}-{selected.data.slot.endTime} {selected.data.job.location?`en ${selected.data.job.location}`:""}
              </div>
            )}
            {selected.kind==="workpay" && (
              <div className="muted small" style={{ marginTop:6 }}>
                {selected.data.bonus
                  ? <>Bono: {selected.data.job.company} • {selected.data.date} • S/ {selected.data.bonus.amount} • {selected.data.bonus.concept} ({selected.data.bonus.month})</>
                  : <>Cobro: {selected.data.job.company} • {selected.data.date} {selected.data.job.payAmount?`• S/ ${selected.data.job.payAmount}`:""} {selected.data.job.payRecurrence?`• ${selected.data.job.payRecurrence}`:""}</>}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
