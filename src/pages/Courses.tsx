import { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Input, Textarea, Badge, Label, Select } from "../components/ui/primitives";
import { useData } from "../stores/useData";
import { useAuth } from "../stores/useAuth";
import type { Course, Deliverable, ClassSchedule, CourseLink, CourseAttachment, AttachmentFileType, Credential, GradeWeight, DeliverableType, Priority, Attendance } from "../types";
import { Copy, Trash2, Plus, Link as LinkIcon, KeyRound, Clock, AlertTriangle, Edit3, CalendarDays, Paperclip, Download, UserCheck } from "lucide-react";
import { attendanceStats, classOccurrences } from "../lib/study";
import { db } from "../lib/db";

const FILE_TYPE_ICON: Record<AttachmentFileType, string> = { documento: "📄", video: "🎬", audio: "🎧", diapositiva: "📊", imagen: "🖼️", otro: "🔗" };
function attachmentIcon(a: CourseAttachment): string {
  if (a.fileType) return FILE_TYPE_ICON[a.fileType];
  return a.kind === "enlace" ? "🔗" : "📄"; // legacy sin fileType
}
import { detectOverlaps } from "../lib/overlap";
import { isActiveCourse } from "../lib/activeCourses";
import { safeUrl } from "../lib/security";

const COLORS = ["#0ea5e9","#8b5cf6","#ec4899","#10b981","#f59e0b","#ef4444","#06b6d4","#111827"];

export default function CoursesPage() {
  const { courses, deliverables, addCourse, updateCourse, removeCourse, addDeliverable, updateDeliverable, removeDeliverable } = useData();
  const { user } = useAuth();
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [delModal, setDelModal] = useState<{ courseId: string; initial?: Deliverable } | null>(null);
  const [filterStatus, setFilterStatus] = useState<"activo"|"archivado"|"todos">("activo");
  const [attCourse, setAttCourse] = useState<Course | null>(null);
  const [attMap, setAttMap] = useState<Record<string, Attendance[]>>({});

  const loadAttendance = async (list: Course[]) => {
    const entries = await Promise.all(list.map(async c => [c.id, await db.listAttendance(c.id).catch(() => [] as Attendance[])] as const));
    setAttMap(Object.fromEntries(entries));
  };
  useEffect(() => { if (courses.length) void loadAttendance(courses); }, [courses.length]);

  // "activo" = no archivado + (recién registrado o con clase/entrega en 14 días)
  const visibleCourses = courses.filter(c=> filterStatus==="todos" ? true : filterStatus==="activo" ? isActiveCourse(c, deliverables) : c.status===filterStatus);
  const semesters = Array.from(new Set(courses.map(c=> c.semester).filter(Boolean)));
  return (
    <div style={{ flex:1, overflow:"auto" }}>
      <Topbar title="Cursos" subtitle="Cursos, horarios, inicio/fin, prácticas y exámenes • archiva al cerrar ciclo sin borrar historial" actions={
        <div style={{ display:"flex", gap:8 }}>
          <select className="select" value={filterStatus} onChange={e=> setFilterStatus(e.target.value as any)} style={{ width:130 }}>
            <option value="activo">Activos</option><option value="archivado">Archivados</option><option value="todos">Todos</option>
          </select>
          <Button variant="primary" onClick={()=> { setEditingCourse(null); setShowCourseForm(true); }}><Plus size={14}/> Nuevo curso</Button>
        </div>
      }/>
      <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14 }}>
        <Card>
          <b style={{ fontSize:12 }}>Ciclo académico</b>
          <p className="muted small" style={{ margin:"4px 0 8px" }}>Al terminar el ciclo, usa <b>Cerrar ciclo</b> para archivar los cursos activos del semestre actual. Quedan guardados en <code>SQLite</code> para reporte/historial, pero ya no aparecen en Dashboard/Calendario activo. Así no desconfiguras nada al añadir cursos nuevos. Activo = con clases o entregas en los próximos 14 días (lo demás sigue registrado en Todos).</p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {semesters.map(s=> <span key={s} className="badge">{s} ({courses.filter(c=> c.semester===s && c.status==="activo").length} activos)</span>)}
            <Button size="sm" onClick={async()=>{
              const sem=prompt(`Semestre a cerrar (ej 2026-1). Dejará Archivados los activos de ese semestre.\nSemestres: ${semesters.join(", ")}`, semesters[0]||"2026-1");
              if(!sem) return;
              if(!confirm(`¿Archivar todos los cursos activos de ${sem}? Quedarán en Archivados.`)) return;
              for(const c of courses.filter(x=> x.semester===sem && x.status==="activo")){
                await updateCourse({ ...c, status:"archivado" as const });
              }
              alert(`Ciclo ${sem} cerrado. ${courses.filter(c=> c.semester===sem).length} cursos archivados.`);
            }}>Cerrar ciclo (archivar por semestre)</Button>
            <Button size="sm" onClick={async()=>{
              if(!confirm("¿Restaurar todos los archivados a activos?")) return;
              for(const c of courses.filter(x=> x.status==="archivado")){
                await updateCourse({ ...c, status:"activo" as const });
              }
            }}>Restaurar archivados</Button>
          </div>
        </Card>
        {showCourseForm && (
          <Modal onClose={()=> setShowCourseForm(false)} title={editingCourse?"Editar curso":"Nuevo curso"}>
            <CourseForm key={editingCourse?.id || "new"} userId={user!.id} initial={editingCourse} colors={COLORS} onClose={()=> setShowCourseForm(false)} onSave={async(c)=>{
              console.log("[Courses] saving course payload", c);
              try {
                if(editingCourse) await updateCourse(c); else await addCourse(c);
                setShowCourseForm(false);
              } catch (e:any) {
                console.error("[Courses] save failed", e, c);
                alert(`No se pudo guardar el curso: ${e?.message || e}`);
              }
            }} />
          </Modal>
        )}
        {delModal && (
          <Modal onClose={()=> setDelModal(null)} title={delModal.initial?"Editar entregable":"Nuevo entregable (tarea / práctica / examen / discusión)"}>
            <DeliverableForm courseId={delModal.courseId} initial={delModal.initial} onClose={()=> setDelModal(null)} onSave={async(d)=>{ if(delModal.initial) await updateDeliverable(d); else await addDeliverable(d); setDelModal(null); }} />
          </Modal>
        )}
        {attCourse && (
          <Modal onClose={()=> setAttCourse(null)} title={`Asistencia — ${attCourse.code}`}>
            <AttendanceModal course={attCourse} records={attMap[attCourse.id] || []} onClose={()=> setAttCourse(null)} onChanged={async()=>{ await loadAttendance(courses); }} />
          </Modal>
        )}

        {visibleCourses.length===0 ? (
          <Card><p className="muted">{courses.length===0 ? "Aún no tienes cursos. Crea el primero." : `Sin cursos en "${filterStatus}". Cambia el filtro.`}</p></Card>
        ) : (
          <div className="grid grid-2">
            {visibleCourses.map(c=> {
              const dels = deliverables.filter(d=> d.courseId===c.id).sort((a,b)=> (a.dueDate+a.dueTime).localeCompare(b.dueDate+b.dueTime));
              const overdue = dels.filter(d=> d.status!=="entregado" && d.status!=="calificado" && new Date(`${d.dueDate}T${d.dueTime}:00`) < new Date());
              const avg = c.weighting?.length ? weightedAvg(c.weighting) : null;
              const overlaps = detectOverlaps(dels);
              return (
                <Card key={c.id}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="dot" style={{ background:c.color, width:12, height:12 }}/>
                      <b style={{ fontSize:14 }}>{c.code}</b>
                      <Badge>{c.status}</Badge>
                      {filterStatus === "todos" && c.status === "activo" && !isActiveCourse(c, deliverables) && <Badge>pausado 14d+</Badge>}
                      {c.startDate && <Badge variant="info"><CalendarDays size={10}/> {c.startDate} → {c.endDate||"—"}</Badge>}
                      {overdue.length>0 && <Badge variant="danger">{overdue.length} vencidos</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={()=> { setEditingCourse(c); setShowCourseForm(true); }}><Edit3 size={12}/> Editar</Button>
                      <Button size="sm" onClick={()=> setAttCourse(c)} title="Pasar lista por fecha"><UserCheck size={12}/> Asistencia</Button>
                      <Button size="sm" onClick={async()=>{ const ns=c.status==="archivado"?"activo":"archivado"; await updateCourse({ ...c, status: ns as any }); }} title={c.status==="archivado"?"Reactivar":"Archivar (ciclo cerrado)"}>{c.status==="archivado"?"Reactivar":"Archivar"}</Button>
                      <Button size="sm" onClick={async()=>{ if(confirm(`Eliminar ${c.code}? Borrará ${dels.length} entregables.`)) await removeCourse(c.id); }}><Trash2 size={14}/></Button>
                    </div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, marginTop:6 }}>{c.name} <AttendanceBadge course={c} records={attMap[c.id] || []} /></div>
                  <div className="muted small">{c.professor} {c.professorEmail && `• ${c.professorEmail}`} • {c.credits} cr • {c.semester} • Aula: {c.classroom || "—"} • Nota min: <b style={{ color:"var(--text)" }}>{c.minPassingGrade ?? 10.5}</b></div>
                  {c.startDate && <div className="muted small">Inicio: {c.startDate} • Fin: {c.endDate||"—"}</div>}

                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
                    {c.schedule.map(s=> <span key={s.id} className="chip"><Clock size={12}/>{["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][s.dayOfWeek]} {s.startTime}-{s.endTime} @{s.location} {s.type?`• ${s.type}`:""}</span>)}
                    {c.schedule.length===0 && <span className="muted small">Sin horario — añade en Editar</span>}
                  </div>

                  {c.weighting && c.weighting.length>0 && (
                    <div style={{ marginTop:10, padding:10, background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:10 }}>
                      <div className="flex justify-between items-center"><b style={{ fontSize:12 }}>Pesos y notas</b><span className="badge">Promedio {avg!==null? avg.toFixed(2):"—"}</span></div>
                      <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:6 }}>
                        {c.weighting.map(w=> (
                          <div key={w.id} className="flex justify-between items-center" style={{ fontSize:12 }}>
                            <span>{w.item} • {w.weight}%</span>
                            <span className="badge">{w.obtainedScore ?? "—"}/{w.maxScore}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop:10 }}>
                    <div className="flex gap-2" style={{ flexWrap:"wrap" }}>
                      {c.links.map(l=> <a key={l.id} href={safeUrl(l.url) || undefined} target="_blank" rel="noreferrer" className="badge" style={{ cursor:"pointer" }}><LinkIcon size={12}/>{l.label}</a>)}
                      {c.links.length===0 && <span className="muted small">Sin links</span>}
                    </div>
                    {c.credentials.length>0 && (
                      <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:6 }}>
                        {c.credentials.map(cred=> (
                          <div key={cred.id} style={{ display:"flex", gap:6, alignItems:"center", padding:"6px 8px", border:"1px solid var(--border)", borderRadius:8 }}>
                            <KeyRound size={14} style={{ color:"var(--text-muted)"}}/>
                            <span style={{ fontSize:12, fontWeight:600 }}>{cred.label}</span>
                            <span className="muted small">{cred.username}</span>
                            <span style={{ flex:1 }}/>
                            <Button size="sm" onClick={async()=>{ try{ await navigator.clipboard.writeText(cred.password); alert("Contraseña copiada"); } catch{ prompt("Copia:", cred.password); } }}><Copy size={12}/> Copiar</Button>
                            <Button size="sm" onClick={async()=>{ try{ await navigator.clipboard.writeText(cred.username); } catch{}}} style={{}}>Usuario</Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {(c.attachments?.length || 0) > 0 && (
                      <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
                        <Paperclip size={12} style={{ color:"var(--text-muted)", alignSelf:"center" }}/>
                        {c.attachments.map(a=> (
                          <button key={a.id} className="badge" style={{ cursor:"pointer", display:"flex", gap:4, alignItems:"center" }} title={a.url || `${a.name}${a.size?` • ${Math.round(a.size/1024)}KB`:""}`} onClick={()=>{
                            if(a.url && safeUrl(a.url)) window.open(safeUrl(a.url)!, "_blank");
                            else if(a.dataUrl){ const el=document.createElement("a"); el.href=a.dataUrl; el.download=a.name; el.click(); }
                          }}><Download size={10}/>{attachmentIcon(a)} {a.name.length>22? a.name.slice(0,20)+"…":a.name}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop:12, borderTop:"1px solid var(--border)", paddingTop:10 }}>
                    <div className="flex justify-between items-center">
                      <b style={{ fontSize:12 }}>Prácticas / Exámenes / Tareas por semana o fecha exacta</b>
                      <Button size="sm" variant="primary" onClick={()=> setDelModal({ courseId: c.id })}><Plus size={12}/> Añadir</Button>
                    </div>
                    {overlaps.length>0 && <div className="muted small" style={{ display:"flex", gap:6, alignItems:"center", marginTop:6, color:"#92400e" }}><AlertTriangle size={12}/> {overlaps.length} cruces detectados en este curso</div>}
                    {dels.length===0 ? <p className="muted small">Sin entregables — usa semana 1..16 o fecha exacta</p> : (
                      <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
                        {dels.map(d=> (
                          <div key={d.id} style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 10px", border:"1px solid var(--border)", borderRadius:10, background: d.status==="vencido"?"#fef2f2":"var(--surface)" }}>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:12.5, fontWeight:600, display:"flex", gap:6, alignItems:"center" }}>
                                <Badge variant={d.priority==="alta"?"danger": d.priority==="media"?"warn":"success"}>{d.priority}</Badge>
                                <Badge variant="info">{d.type}</Badge>
                                {d.weekNumber && <Badge>Sem {d.weekNumber}</Badge>}
                                <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{d.title}</span>
                              </div>
                              <div className="muted small">{d.dueDate} {d.dueTime} {d.location?`• ${d.location}`:""} {d.weight?`• peso ${d.weight}%`:""} {d.weekNumber?`• sem ${d.weekNumber}`:""}</div>
                              {d.tags.length>0 && <div style={{ display:"flex", gap:4, marginTop:4 }}>{d.tags.map(t=> <span key={t} className="badge">{t}</span>)}</div>}
                            </div>
                            <Badge variant={d.status==="entregado"?"success": d.status==="vencido"?"danger":"default"}>{d.status}</Badge>
                            <Button size="sm" onClick={()=> setDelModal({ courseId: c.id, initial: d })}><Edit3 size={12}/></Button>
                            <Button size="sm" onClick={async()=>{ if(confirm("Eliminar?")) await removeDeliverable(d.id); }}><Trash2 size={12}/></Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function weightedAvg(ws: GradeWeight[]): number | null {
  const valid = ws.filter(w=> w.obtainedScore!==undefined);
  if(!valid.length) return null;
  const totalW = valid.reduce((s,w)=> s+w.weight,0);
  if(totalW===0) return null;
  return valid.reduce((s,w)=> s+ (w.obtainedScore!/w.maxScore)*w.weight,0) * (100/totalW) /100 * 100;
}

function AttendanceBadge({ course, records }: { course: Course; records: Attendance[] }) {
  if (!records.length) return null;
  const s = attendanceStats(records, course.absenceLimit ?? 30);
  if (s.failed) return <span className="badge badge-danger">inhabilitado {s.pctAbsent.toFixed(0)}%</span>;
  if (s.atRisk) return <span className="badge badge-warn">faltas {s.pctAbsent.toFixed(0)}%</span>;
  return null;
}

function AttendanceModal({ course, records, onClose, onChanged }: { course: Course; records: Attendance[]; onClose: () => void; onChanged: () => void }) {
  const { user } = useAuth();
  const [local, setLocal] = useState<Attendance[]>(records);
  useEffect(() => { setLocal(records); }, [course.id]);
  const past = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const future = (() => { const d = new Date(); d.setDate(d.getDate() + 14); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const occ = classOccurrences(course, past, future);
  const byId = new Map(local.map(r => [r.id, r.status]));
  const stats = attendanceStats(local, course.absenceLimit ?? 30);
  const limit = course.absenceLimit ?? 30;

  const cycle = async (o: { date: string; slotId: string }) => {
    if (!user) return;
    const id = `${course.id}_${o.date}_${o.slotId}`;
    const cur = byId.get(id);
    const next = !cur ? "present" : cur === "present" ? "late" : cur === "late" ? "absent" : undefined;
    if (!next) {
      await db.deleteAttendance(id);
      const nl = local.filter(r => r.id !== id);
      setLocal(nl);
    } else {
      const rec: Attendance = { id, userId: user.id, courseId: course.id, date: o.date, slotId: o.slotId, status: next, createdAt: new Date().toISOString() };
      await db.saveAttendance(rec);
      const nl = local.some(r => r.id === id) ? local.map(r => r.id === id ? rec : r) : [...local, rec];
      setLocal(nl);
    }
    await onChanged();
  };

  const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return (
    <div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span className="badge">Faltas {stats.pctAbsent.toFixed(1)}% (límite {limit}%)</span>
        <span className="muted small">{stats.present} presente • {stats.late} tarde (½) • {stats.absent} falta</span>
        {stats.failed && <span className="badge badge-danger">Inhabilitado</span>}
        {!stats.failed && stats.atRisk && <span className="badge badge-warn">En riesgo</span>}
      </div>
      <p className="muted small" style={{ margin: "6px 0" }}>Toca cada clase para marcar: presente → tarde → falta → borrar. Tardanza = media falta.</p>
      {occ.length === 0 ? <p className="muted small">Sin clases en el rango (revisa horario e inicio/fin).</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 380, overflowY: "auto" }}>
          {occ.map(o => {
            const st = byId.get(`${course.id}_${o.date}_${o.slotId}`);
            const dow = new Date(o.date + "T12:00:00").getDay();
            return (
              <button key={`${o.date}_${o.slotId}`} onClick={() => void cycle(o)}
                style={{
                  display: "flex", gap: 8, alignItems: "center", padding: "6px 10px", cursor: "pointer",
                  border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", textAlign: "left",
                }}>
                <span className="badge" style={{ minWidth: 86, justifyContent: "center" }}>{o.date.slice(5)} {DOW[dow]}</span>
                <span style={{ fontSize: 12 }}>{o.startTime}-{o.endTime}</span>
                <span style={{ flex: 1 }} />
                <span className="badge" style={st === "present" ? { background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0" } : st === "late" ? { background: "#fffbeb", color: "#92400e", borderColor: "#fde68a" } : st === "absent" ? { background: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" } : {}}>{st === "present" ? "✓ Presente" : st === "late" ? "Tarde" : st === "absent" ? "Falta" : "—"}</span>
              </button>
            );
          })}
        </div>
      )}
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <Button onClick={onClose} className="w-full">Cerrar</Button>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: ()=>void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=> e.stopPropagation()}>
        <div className="modal-header"><h3 className="modal-title">{title}</h3><Button size="sm" onClick={onClose}>Cerrar</Button></div>
        {children}
      </div>
    </div>
  );
}

// ------- CourseForm con modales internos -------
function CourseForm({ userId, initial, colors, onClose, onSave }: { userId:string; initial: Course|null; colors:string[]; onClose:()=>void; onSave:(c:Course)=>void }) {
  const [name,setName]=useState(initial?.name||"");
  const [code,setCode]=useState(initial?.code||"");
  const [color,setColor]=useState(initial?.color||colors[0]);
  const [prof,setProf]=useState(initial?.professor||"");
  const [email,setEmail]=useState(initial?.professorEmail||"");
  const [classroom,setClassroom]=useState(initial?.classroom||"");
  const [credits,setCredits]=useState(String(initial?.credits||3));
  const [semester,setSemester]=useState(initial?.semester||"2026-1");
  const [startDate,setStartDate]=useState(initial?.startDate||"");
  const [endDate,setEndDate]=useState(initial?.endDate||"");
  const [minPass,setMinPass]=useState(initial?.minPassingGrade!==undefined?
    String(initial.minPassingGrade):"10.5");
  const [absLim,setAbsLim]=useState(initial?.absenceLimit!==undefined? String(initial.absenceLimit):"30");
  const [links,setLinks]=useState<CourseLink[]>(initial?.links||[]);
  const [creds,setCreds]=useState<Credential[]>(initial?.credentials||[]);
  const [attachments,setAttachments]=useState<CourseAttachment[]>(initial?.attachments||[]);
  const [linkLabel,setLinkLabel]=useState("");
  const [linkUrl,setLinkUrl]=useState("");
  const [linkType,setLinkType]=useState<AttachmentFileType>("documento");

  // v0.6.4: solo enlaces (videos/audios van a Drive/Mega/YouTube). Legacy con dataUrl sigue descargable.
  const addLinkAttachment = () => {
    if (!linkUrl.trim()) return alert("Pega la URL");
    setAttachments([...attachments, { id: crypto.randomUUID(), name: linkLabel.trim() || linkUrl.trim(), mime: "enlace", kind: "enlace", fileType: linkType, url: linkUrl.trim(), createdAt: new Date().toISOString() }]);
    setLinkLabel(""); setLinkUrl("");
  };
  const [schedule,setSchedule]=useState<ClassSchedule[]>(initial?.schedule||[]);
  const [weights,setWeights]=useState<GradeWeight[]>(initial?.weighting||[]);

  const [showSchedule, setShowSchedule]=useState<ClassSchedule|null>(null);
  const [editingSchedule, setEditingSchedule]=useState<ClassSchedule|null>(null);
  const [showLink, setShowLink]=useState<CourseLink|null>(null);
  const [editingLink, setEditingLink]=useState<CourseLink|null>(null);
  const [showCred, setShowCred]=useState<Credential|null>(null);
  const [editingCred, setEditingCred]=useState<Credential|null>(null);
  const [showWeight, setShowWeight]=useState<GradeWeight|null>(null);
  const [editingWeight, setEditingWeight]=useState<GradeWeight|null>(null);

  const save=()=>{
    if(!name.trim()||!code.trim()) return alert("Nombre y código requeridos");
    if(startDate && endDate && startDate > endDate) return alert("Inicio no puede ser posterior a fin");
    const c: Course = {
      id: initial?.id || crypto.randomUUID(),
      userId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      color,
      credits: Number(credits)||3,
      semester,
      professor: prof.trim(),
      professorEmail: email.trim()||undefined,
      classroom: classroom.trim()||undefined,
      schedule,
      links,
      credentials: creds,
      attachments,
      weighting: weights,
      status: initial?.status || "activo",
      startDate: startDate||undefined,
      endDate: endDate||undefined,
      minPassingGrade: minPass? Number(minPass): undefined,
      absenceLimit: absLim? Number(absLim): undefined,
      createdAt: initial?.createdAt || new Date().toISOString()
    };
    onSave(c);
  };

  return (
    <div>
      <div className="grid grid-3">
        <div><Label>Nombre *</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Cálculo I" /></div>
        <div><Label>Código *</Label><Input value={code} onChange={e=>setCode(e.target.value)} placeholder="MAT-101" /></div>
        <div><Label>Color</Label><div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>{colors.map(col=> <button key={col} onClick={()=>setColor(col)} style={{ width:28, height:28, borderRadius:999, background:col, border: color===col?"2px solid #111827":"1px solid var(--border)" }}/>)}</div></div>
      </div>
      <div className="grid grid-3" style={{ marginTop:10 }}>
        <div><Label>Profesor</Label><Input value={prof} onChange={e=>setProf(e.target.value)} placeholder="Dr. Pérez" /></div>
        <div><Label>Email profesor</Label><Input value={email} onChange={e=>setEmail(e.target.value)} placeholder="perez@uni.edu" /></div>
        <div><Label>Aula / Lugar</Label><Input value={classroom} onChange={e=>setClassroom(e.target.value)} placeholder="Aula 305 / Lab 2" /></div>
      </div>
      <div className="grid grid-3" style={{ marginTop:10 }}>
        <div><Label>Créditos</Label><Input type="number" value={credits} onChange={e=>setCredits(e.target.value)} /></div>
        <div><Label>Semestre</Label><Input value={semester} onChange={e=>setSemester(e.target.value)} /></div>
        <div><Label>Inicio curso</Label><Input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} /></div>
      </div>
      <div className="grid grid-3" style={{ marginTop:10 }}>
        <div><Label>Fin curso (última clase)</Label><Input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} /></div>
        <div><Label>Nota mínima aprobatoria</Label><Input type="number" step="0.1" value={minPass} onChange={e=> setMinPass(e.target.value)} placeholder="10.5" /></div>
        <div><Label>Límite faltas % (inhabilita)</Label><Input type="number" value={absLim} onChange={e=> setAbsLim(e.target.value)} placeholder="30" /></div>
      </div>
      <div style={{ marginTop:10, display:"flex", alignItems:"end" }}><Button variant="primary" onClick={save} className="w-full">Guardar curso</Button></div>

      {/* Horarios */}
      <div style={{ marginTop:14 }}>
        <div className="flex justify-between items-center"><b style={{ fontSize:12 }}>Horarios de clase (día, hora, lugar, tipo)</b><Button size="sm" onClick={()=> { setEditingSchedule(null); setShowSchedule({ id:"", dayOfWeek:1, startTime:"08:00", endTime:"10:00", location:"", type:"teorica" } as any); }}><Plus size={12}/> Añadir</Button></div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
          {schedule.length===0 ? <span className="muted small">Sin horarios</span> : schedule.map(s=> (
            <span key={s.id} className="chip">{["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][s.dayOfWeek]} {s.startTime}-{s.endTime} @{s.location} {s.type?`• ${s.type}`:""} <button onClick={()=> { setEditingSchedule(s); setShowSchedule(s); }} style={{ marginLeft:6, border:"none", background:"transparent", cursor:"pointer" }}><Edit3 size={12}/></button> <button onClick={()=> setSchedule(schedule.filter(x=>x.id!==s.id))} style={{ marginLeft:2, border:"none", background:"transparent", cursor:"pointer" }}>✕</button></span>
          ))}
        </div>
        {showSchedule && <ScheduleModal initial={editingSchedule || showSchedule} isEdit={!!editingSchedule} onClose={()=> setShowSchedule(null)} onSave={(s)=>{
          if(editingSchedule) setSchedule(schedule.map(x=> x.id===s.id? s: x));
          else setSchedule([...schedule, { ...s, id: crypto.randomUUID() }]);
          setShowSchedule(null);
        }} />}
      </div>

      {/* Links */}
      <div style={{ marginTop:14 }}>
        <div className="flex justify-between items-center"><b style={{ fontSize:12 }}>Links de la clase</b><Button size="sm" onClick={()=> { setEditingLink(null); setShowLink({ id:"", label:"", url:"", kind:"clase_virtual"} as any); }}><Plus size={12}/> Añadir</Button></div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
          {links.length===0 ? <span className="muted small">Sin links</span> : links.map(l=> (
            <span key={l.id} className="chip">{l.label}: {l.url.slice(0,22)}… <button onClick={()=> { setEditingLink(l); setShowLink(l); }} style={{ marginLeft:6, border:"none", background:"transparent", cursor:"pointer"}}><Edit3 size={12}/></button> <button onClick={()=> setLinks(links.filter(x=>x.id!==l.id))} style={{ marginLeft:2, border:"none", background:"transparent", cursor:"pointer"}}>✕</button></span>
          ))}
        </div>
        {showLink && <LinkModal initial={editingLink || showLink} isEdit={!!editingLink} onClose={()=> setShowLink(null)} onSave={(l)=>{
          if(editingLink) setLinks(links.map(x=> x.id===l.id? l: x));
          else setLinks([...links, { ...l, id: crypto.randomUUID() }]);
          setShowLink(null);
        }} />}
      </div>

      {/* Credenciales */}
      <div style={{ marginTop:14 }}>
        <div className="flex justify-between items-center"><b style={{ fontSize:12 }}>Credenciales (botón copiar)</b><Button size="sm" onClick={()=> { setEditingCred(null); setShowCred({ id:"", label:"", username:"", password:"", url:""} as any); }}><Plus size={12}/> Añadir</Button></div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
          {creds.length===0 ? <span className="muted small">Sin credenciales</span> : creds.map(c=> (
            <span key={c.id} className="chip">{c.label} {c.username} <button onClick={()=> { setEditingCred(c); setShowCred(c); }} style={{ marginLeft:6, border:"none", background:"transparent", cursor:"pointer"}}><Edit3 size={12}/></button> <button onClick={()=> setCreds(creds.filter(x=>x.id!==c.id))} style={{ marginLeft:2, border:"none", background:"transparent", cursor:"pointer"}}>✕</button></span>
          ))}
        </div>
        {showCred && <CredModal initial={editingCred || showCred} isEdit={!!editingCred} onClose={()=> setShowCred(null)} onSave={(c)=>{
          if(editingCred) setCreds(creds.map(x=> x.id===c.id? c: x));
          else setCreds([...creds, { ...c, id: crypto.randomUUID() }]);
          setShowCred(null);
        }} />}
      </div>

      {/* Material del curso (solo enlaces: Drive/Mega/YouTube. Sobrevive al archivado: vive en la ficha) */}
      <div style={{ marginTop:14 }}>
        <div className="flex justify-between items-center">
          <b style={{ fontSize:12 }}>Material del curso (enlaces)</b>
        </div>
        <p className="muted small" style={{ margin:"4px 0 8px" }}>Pega el link de Drive, Mega o YouTube e indica qué encontrarás ahí. Sin subidas: la ficha se mantiene liviana.</p>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {attachments.length===0 ? <span className="muted small">Sin material</span> : attachments.map(a=> (
            <span key={a.id} className="chip">{attachmentIcon(a)} {a.name}{a.size?` (${Math.round(a.size/1024)}KB)`:""} <button onClick={()=> setAttachments(attachments.filter(x=>x.id!==a.id))} style={{ marginLeft:2, border:"none", background:"transparent", cursor:"pointer"}}>✕</button></span>
          ))}
        </div>
        <div className="grid grid-3" style={{ marginTop:8 }}>
          <div><Label>Etiqueta</Label><Input value={linkLabel} onChange={e=> setLinkLabel(e.target.value)} placeholder="Clase 3, sílabo…" /></div>
          <div><Label>Tipo de archivo</Label><Select value={linkType} onChange={e=> setLinkType(e.target.value as AttachmentFileType)}>
            <option value="documento">📄 Documento</option><option value="video">🎬 Video</option>
            <option value="audio">🎧 Audio</option><option value="diapositiva">📊 Diapositivas</option>
            <option value="imagen">🖼️ Imagen</option><option value="otro">🔗 Otro</option>
          </Select></div>
          <div style={{ display:"flex", alignItems:"end" }}><Button size="sm" onClick={addLinkAttachment} className="w-full"><Plus size={12}/> Añadir</Button></div>
        </div>
        <div style={{ marginTop:8 }}><Label>URL *</Label><Input value={linkUrl} onChange={e=> setLinkUrl(e.target.value)} placeholder="https://drive.google.com/..." /></div>
      </div>

      {/* Pesos */}
      <div style={{ marginTop:14 }}>
        <div className="flex justify-between items-center"><b style={{ fontSize:12 }}>Notas y pesos</b><Button size="sm" onClick={()=> { setEditingWeight(null); setShowWeight({ id:"", item:"", weight:30, maxScore:100 } as any); }}><Plus size={12}/> Añadir</Button></div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
          {weights.length===0 ? <span className="muted small">Sin pesos</span> : weights.map(w=> (
            <span key={w.id} className="chip">{w.item} {w.weight}% {w.obtainedScore??"—"}/{w.maxScore} <button onClick={()=> { setEditingWeight(w); setShowWeight(w); }} style={{ marginLeft:6, border:"none", background:"transparent", cursor:"pointer"}}><Edit3 size={12}/></button> <button onClick={()=> setWeights(weights.filter(x=>x.id!==w.id))} style={{ marginLeft:2, border:"none", background:"transparent", cursor:"pointer"}}>✕</button></span>
          ))}
        </div>
        {showWeight && <WeightModal initial={editingWeight || showWeight} isEdit={!!editingWeight} onClose={()=> setShowWeight(null)} onSave={(w)=>{
          if(editingWeight) setWeights(weights.map(x=> x.id===w.id? w: x));
          else setWeights([...weights, { ...w, id: crypto.randomUUID() }]);
          setShowWeight(null);
        }} />}
      </div>

      <div style={{ marginTop:16, display:"flex", gap:8 }}>
        <Button variant="primary" onClick={save} className="w-full">Guardar curso</Button>
        <Button onClick={onClose}>Cancelar</Button>
      </div>
    </div>
  );
}

// --- Sub-modals ---
function ScheduleModal({ initial, isEdit, onClose, onSave }: { initial: ClassSchedule; isEdit:boolean; onClose:()=>void; onSave:(s:ClassSchedule)=>void }) {
  const [day,setDay]=useState(String(initial.dayOfWeek));
  const [st,setSt]=useState(initial.startTime);
  const [et,setEt]=useState(initial.endTime);
  const [loc,setLoc]=useState(initial.location);
  const [type,setType]=useState(initial.type||"teorica");
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e=> e.stopPropagation()} style={{ maxWidth:520 }}>
      <div className="modal-header"><h3 className="modal-title">{isEdit?"Editar horario":"Nuevo horario"}</h3><Button size="sm" onClick={onClose}>Cerrar</Button></div>
      <div className="grid grid-2">
        <div><Label>Día</Label><Select value={day} onChange={e=> setDay(e.target.value)}><option value="0">Domingo</option><option value="1">Lunes</option><option value="2">Martes</option><option value="3">Miércoles</option><option value="4">Jueves</option><option value="5">Viernes</option><option value="6">Sábado</option></Select></div>
        <div><Label>Tipo</Label><Select value={type} onChange={e=> setType(e.target.value)}><option value="teorica">Teórica</option><option value="practica">Práctica</option><option value="laboratorio">Laboratorio</option><option value="taller">Taller</option></Select></div>
      </div>
      <div className="grid grid-3" style={{ marginTop:10 }}>
        <div><Label>Inicio</Label><Input type="time" value={st} onChange={e=> setSt(e.target.value)} /></div>
        <div><Label>Fin</Label><Input type="time" value={et} onChange={e=> setEt(e.target.value)} /></div>
        <div><Label>Lugar</Label><Input value={loc} onChange={e=> setLoc(e.target.value)} placeholder="Aula 101" /></div>
      </div>
      <Button variant="primary" style={{ marginTop:12 }} className="w-full" onClick={()=> onSave({ id: initial.id, dayOfWeek: Number(day), startTime: st, endTime: et, location: loc, type })}>Guardar</Button>
    </div></div>
  );
}
function LinkModal({ initial, isEdit, onClose, onSave }: { initial: CourseLink; isEdit:boolean; onClose:()=>void; onSave:(l:CourseLink)=>void }) {
  const [label,setLabel]=useState(initial.label);
  const [url,setUrl]=useState(initial.url);
  const [kind,setKind]=useState(initial.kind);
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e=> e.stopPropagation()} style={{ maxWidth:520 }}>
      <div className="modal-header"><h3 className="modal-title">{isEdit?"Editar link":"Nuevo link"}</h3><Button size="sm" onClick={onClose}>Cerrar</Button></div>
      <div><Label>Etiqueta</Label><Input value={label} onChange={e=> setLabel(e.target.value)} placeholder="Zoom" /></div>
      <div style={{ marginTop:10 }}><Label>URL</Label><Input value={url} onChange={e=> setUrl(e.target.value)} placeholder="https://..." /></div>
      <div style={{ marginTop:10 }}><Label>Tipo</Label><Select value={kind} onChange={e=> setKind(e.target.value as any)}><option value="clase_virtual">Clase virtual</option><option value="material">Material</option><option value="otro">Otro</option></Select></div>
      <Button variant="primary" style={{ marginTop:12 }} className="w-full" onClick={()=> { if(!label.trim()||!url.trim()) return alert("Completa"); onSave({ id: initial.id, label: label.trim(), url: url.trim(), kind }); }}>Guardar</Button>
    </div></div>
  );
}
function CredModal({ initial, isEdit, onClose, onSave }: { initial: Credential; isEdit:boolean; onClose:()=>void; onSave:(c:Credential)=>void }) {
  const [label,setLabel]=useState(initial.label);
  const [user,setUser]=useState(initial.username);
  const [pass,setPass]=useState(initial.password);
  const [url,setUrl]=useState(initial.url||"");
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e=> e.stopPropagation()} style={{ maxWidth:520 }}>
      <div className="modal-header"><h3 className="modal-title">{isEdit?"Editar credencial":"Nueva credencial"}</h3><Button size="sm" onClick={onClose}>Cerrar</Button></div>
      <div><Label>Servicio</Label><Input value={label} onChange={e=> setLabel(e.target.value)} placeholder="Moodle" /></div>
      <div className="grid grid-2" style={{ marginTop:10 }}><div><Label>Usuario</Label><Input value={user} onChange={e=> setUser(e.target.value)} /></div><div><Label>Contraseña</Label><Input value={pass} onChange={e=> setPass(e.target.value)} type="password" /></div></div>
      <div style={{ marginTop:10 }}><Label>URL (opcional)</Label><Input value={url} onChange={e=> setUrl(e.target.value)} placeholder="https://..." /></div>
      <Button variant="primary" style={{ marginTop:12 }} className="w-full" onClick={()=> { if(!label.trim()) return alert("Etiqueta requerida"); onSave({ id: initial.id, label: label.trim(), username: user.trim(), password: pass, url: url.trim()||undefined }); }}>Guardar</Button>
    </div></div>
  );
}
function WeightModal({ initial, isEdit, onClose, onSave }: { initial: GradeWeight; isEdit:boolean; onClose:()=>void; onSave:(w:GradeWeight)=>void }) {
  const [item,setItem]=useState(initial.item);
  const [weight,setWeight]=useState(String(initial.weight));
  const [max,setMax]=useState(String(initial.maxScore));
  const [obt,setObt]=useState(initial.obtainedScore!==undefined? String(initial.obtainedScore):"");
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal" onClick={e=> e.stopPropagation()} style={{ maxWidth:520 }}>
      <div className="modal-header"><h3 className="modal-title">{isEdit?"Editar peso":"Nuevo peso"}</h3><Button size="sm" onClick={onClose}>Cerrar</Button></div>
      <div><Label>Item</Label><Input value={item} onChange={e=> setItem(e.target.value)} placeholder="Parcial 1" /></div>
      <div className="grid grid-3" style={{ marginTop:10 }}>
        <div><Label>Peso %</Label><Input type="number" value={weight} onChange={e=> setWeight(e.target.value)} /></div>
        <div><Label>Máximo</Label><Input type="number" value={max} onChange={e=> setMax(e.target.value)} /></div>
        <div><Label>Obtenido</Label><Input type="number" value={obt} onChange={e=> setObt(e.target.value)} placeholder="—" /></div>
      </div>
      <Button variant="primary" style={{ marginTop:12 }} className="w-full" onClick={()=> { if(!item.trim()) return alert("Item requerido"); onSave({ id: initial.id, item: item.trim(), weight: Number(weight)||0, maxScore: Number(max)||100, obtainedScore: obt? Number(obt): undefined }); }}>Guardar</Button>
    </div></div>
  );
}

function DeliverableForm({ courseId, initial, onClose, onSave }: { courseId:string; initial?: Deliverable; onClose:()=>void; onSave:(d:Deliverable)=>Promise<void> }) {
  const [type,setType]=useState<DeliverableType>(initial?.type||"tarea");
  const [title,setTitle]=useState(initial?.title||"");
  const [desc,setDesc]=useState(initial?.description||"");
  const [dueDate,setDueDate]=useState(initial?.dueDate||new Date().toISOString().slice(0,10));
  const [dueTime,setDueTime]=useState(initial?.dueTime||"23:59");
  const [location,setLocation]=useState(initial?.location||"");
  const [duration,setDuration]=useState(String(initial?.durationMinutes||60));
  const [weight,setWeight]=useState(initial?.weight!==undefined? String(initial.weight):"");
  const [priority,setPriority]=useState<Priority>(initial?.priority||"media");
  const [tags,setTags]=useState(initial?.tags.join(", ")||"");
  const [reminder,setReminder]=useState(String(initial?.reminderMinutesBefore||60));
  const [est,setEst]=useState(String(initial?.estimatedHours||2));
  const [week,setWeek]=useState(initial?.weekNumber!==undefined? String(initial.weekNumber):"");
  const [isExact,setIsExact]=useState(initial?.isExactDate ?? true);
  const [status,setStatus]=useState<Deliverable["status"]>(initial?.status||"pendiente");

  const save=()=>{
    if(!title.trim()) return alert("Título requerido");
    const d: Deliverable = {
      id: initial?.id || crypto.randomUUID(),
      courseId,
      type,
      title: title.trim(),
      description: desc.trim()||undefined,
      dueDate,
      dueTime,
      location: location.trim()||undefined,
      durationMinutes: Number(duration)||60,
      weight: weight? Number(weight): undefined,
      priority,
      tags: tags.split(",").map(s=> s.trim()).filter(Boolean),
      reminderMinutesBefore: Number(reminder)||60,
      estimatedHours: Number(est)||1,
      status,
      weekNumber: week? Number(week): undefined,
      isExactDate: isExact,
      createdAt: initial?.createdAt || new Date().toISOString()
    };
    onSave(d);
  };
  return (
    <div>
      <div className="grid grid-3">
        <div><Label>Tipo</Label><Select value={type} onChange={e=>setType(e.target.value as any)}><option value="tarea">Tarea</option><option value="examen">Examen</option><option value="practica">Práctica</option><option value="discusion">Discusión</option><option value="evento">Evento</option><option value="entregable">Entregable</option><option value="entrevista">💼 Entrevista laboral</option><option value="clase">Clase</option></Select></div>
        <div style={{ gridColumn:"span 2" }}><Label>Título *</Label><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Entrega informe laboratorio..." /></div>
      </div>
      <div style={{ marginTop:8 }}><Label>Descripción</Label><Textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Rúbrica, requisitos..." /></div>
      <div className="grid grid-3" style={{ marginTop:8 }}>
        <div><Label>Fecha *</Label><Input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} /></div>
        <div><Label>Hora *</Label><Input type="time" value={dueTime} onChange={e=>setDueTime(e.target.value)} /></div>
        <div><Label>Semana (1..16) o fecha exacta</Label>
          <div style={{ display:"flex", gap:6 }}>
            <Select value={String(isExact)} onChange={e=> setIsExact(e.target.value==="true")} style={{ width:120 }}>
              <option value="true">Fecha exacta</option><option value="false">Semana</option>
            </Select>
            <Input type="number" value={week} onChange={e=> setWeek(e.target.value)} placeholder="Sem" style={{ flex:1 }} />
          </div>
        </div>
      </div>
      <div className="grid grid-3" style={{ marginTop:8 }}>
        <div><Label>Lugar / Aula</Label><Input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Aula 203 / Zoom" /></div>
        <div><Label>Duración (min)</Label><Input type="number" value={duration} onChange={e=>setDuration(e.target.value)} /></div>
        <div><Label>Estado</Label><Select value={status} onChange={e=> setStatus(e.target.value as any)}><option value="pendiente">pendiente</option><option value="en_progreso">en progreso</option><option value="entregado">entregado</option><option value="calificado">calificado</option><option value="vencido">vencido</option></Select></div>
      </div>
      <div className="grid grid-3" style={{ marginTop:8 }}>
        <div><Label>Peso %</Label><Input type="number" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="20" /></div>
        <div><Label>Prioridad</Label><Select value={priority} onChange={e=>setPriority(e.target.value as any)}><option value="alta">alta</option><option value="media">media</option><option value="baja">baja</option></Select></div>
        <div><Label>Horas estimadas</Label><Input type="number" value={est} onChange={e=>setEst(e.target.value)} /></div>
      </div>
      <div className="grid grid-3" style={{ marginTop:8 }}>
        <div><Label>Tags (coma)</Label><Input value={tags} onChange={e=>setTags(e.target.value)} placeholder="urgente, grupo" /></div>
        <div><Label>Recordatorio min antes</Label><Input type="number" value={reminder} onChange={e=>setReminder(e.target.value)} /></div>
        <div style={{ display:"flex", alignItems:"end", gap:8 }}><Button variant="primary" onClick={save} className="w-full">Guardar</Button><Button onClick={onClose}>Cancelar</Button></div>
      </div>
    </div>
  );
}
