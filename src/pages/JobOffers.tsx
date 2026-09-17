import { useEffect, useMemo, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Input, Label, Textarea, Select, Badge } from "../components/ui/primitives";
import { db } from "../lib/db";
import { useAuth } from "../stores/useAuth";
import { useData } from "../stores/useData";
import { DEFAULT_WEIGHTS, buildSlotsForDays, dayName, isHired, jobPhase, nextPayDates, rankOffers, todayISO, upcomingDatedBonuses } from "../lib/jobScore";
import { jobTypeConfig, validPeriodFor } from "../lib/jobForm";
import { safeUrl } from "../lib/security";
import type { BonusConcept, CompareWeights, JobBonus, JobModality, JobOffer, JobOfferStatus, JobOfferType, JobSlot, PayRecurrence, SalaryPeriod } from "../types";
import { Trash2, Plus, Edit3, Briefcase, AlertTriangle, CheckCircle2, GraduationCap, BellRing, Wallet } from "lucide-react";

const TYPE_LABEL: Record<JobOfferType, string> = { fijo: "Fijo", parcial: "Medio tiempo", gig: "Por evento", practica: "Práctica" };
const STATUS_LABEL: Record<JobOfferStatus, string> = { guardada: "Guardada", postulada: "Postulada", entrevista: "Entrevista", oferta: "Oferta", rechazada: "Rechazada", descartada: "Descartada" };
const PHASE_LABEL = { upcoming: "Se viene", current: "Vigente", past: "Pasado" } as const;

export default function JobOffersPage() {
  const { user } = useAuth();
  const { courses } = useData();
  const [items, setItems] = useState<JobOffer[]>([]);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<JobOffer | null>(null);
  const [weights, setWeights] = useState<CompareWeights>(() => {
    try {
      const raw = localStorage.getItem("uc_compare_weights");
      if (raw) return { ...DEFAULT_WEIGHTS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_WEIGHTS;
  });

  const load = async () => { if (!user) return; setItems(await db.listJobOffers(user.id)); };
  useEffect(() => { load(); }, [user?.id]);

  const activeCourses = useMemo(() => courses.filter(c => c.status === "activo"), [courses]);
  const hired = useMemo(() => {
    const order = { upcoming: 0, current: 1, past: 2 } as const;
    return items.filter(isHired).sort((a, b) =>
      order[jobPhase(a)] - order[jobPhase(b)] || (b.hiredStart || "").localeCompare(a.hiredStart || ""));
  }, [items]);
  const proposals = useMemo(
    () => rankOffers(items.filter(o => !isHired(o)), activeCourses, weights),
    [items, activeCourses, weights]);
  const upcomingPays = useMemo(() => {
    const today = todayISO();
    const list: { offer: JobOffer; date: string; bonus?: JobBonus }[] = [];
    for (const o of hired) {
      for (const d of nextPayDates(o, today, 1)) list.push({ offer: o, date: d });
      for (const { date, bonus } of upcomingDatedBonuses(o, today)) list.push({ offer: o, date, bonus });
    }
    return list.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  }, [hired]);

  const save = async (o: JobOffer) => {
    if (!o.company.trim() || !o.position.trim()) return alert("Empresa y puesto requeridos");
    try {
      await db.saveJobOffer(o);
      setShow(false); setEditing(null);
      await load();
    } catch (e: any) {
      console.error("[Empleo] save failed", e, o);
      alert(`No se pudo guardar: ${e?.message || e}`);
    }
  };

  // Importación MANUAL al CV (nunca automática: no todo gig merece estar ahí)
  const addToCV = async (o: JobOffer) => {
    if (!user) return;
    if (!confirm(`Añadir "${o.company} — ${o.position}" a tu CV como experiencia?`)) return;
    try {
      const existing = await db.listCVWork(user.id);
      const entry = {
        id: crypto.randomUUID(),
        userId: user.id,
        company: o.company,
        role: o.position,
        startDate: o.hiredStart || o.createdAt.slice(0, 10),
        endDate: o.hiredEnd,
        description: [TYPE_LABEL[o.type], o.modality, o.location, o.notes].filter(Boolean).join(" • ") || undefined,
        order: existing.length,
      };
      await db.saveCVWork(entry);
      await db.saveJobOffer({ ...o, addedToCV: true, cvWorkId: entry.id });
      await load();
      alert("Añadido al CV (Experiencia). Los cambios posteriores no se sincronizan solos.");
    } catch (e: any) {
      console.error("[Empleo] addToCV failed", e);
      alert(`No se pudo añadir al CV: ${e?.message || e}`);
    }
  };

  const unmarkCV = async (o: JobOffer) => {
    // solo quita la marca (no borra la entrada del CV: eso se hace en la página CV)
    await db.saveJobOffer({ ...o, addedToCV: false, cvWorkId: undefined });
    await load();
  };

  // Alarmas explícitas (tipo "otro" sin monto: no contaminan las sumas de Pagos en Dashboard)
  const remindPay = async (o: JobOffer, date: string, bonus?: JobBonus) => {
    if (!user) return;
    await db.saveReminder({
      id: crypto.randomUUID(), userId: user.id,
      title: bonus ? `Bono: ${o.company} (${bonus.concept} ${bonus.month})` : `Cobro: ${o.company} — ${o.position}`,
      description: `Monto esperado: S/ ${bonus ? bonus.amount : (o.payAmount ?? "—")}`,
      dueDate: date, dueTime: "09:00", type: "otro",
      paid: false, priority: "alta", reminderMinutesBefore: 1440,
      recurring: "none", createdAt: new Date().toISOString(),
    });
    alert(`Alarma creada para el ${date} (Calendario + notificaciones).`);
  };

  const remindStart = async (o: JobOffer) => {
    if (!user || !o.hiredStart) return;
    await db.saveReminder({
      id: crypto.randomUUID(), userId: user.id,
      title: `Inicia trabajo: ${o.company} — ${o.position}`,
      description: o.location ? `Lugar: ${o.location}` : undefined,
      dueDate: o.hiredStart, dueTime: "08:00", type: "otro",
      paid: false, priority: "alta", reminderMinutesBefore: 1440,
      recurring: "none", createdAt: new Date().toISOString(),
    });
    alert(`Alarma de inicio creada para el ${o.hiredStart}.`);
  };

  const removeOffer = async (o: JobOffer) => {
    if (!confirm(`Eliminar ${o.company}? (el CV no se toca)`)) return;
    await db.deleteJobOffer(o.id);
    await load();
  };

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <Topbar title="Empleo" subtitle="Propuestas por comparar + tus trabajos (historial y contratados) • compatibilidad contra cursos registrados no archivados" actions={
        <Button variant="primary" onClick={() => { setEditing(null); setShow(true); }}><Plus size={14} /> Nueva propuesta</Button>
      } />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        {show && (
          <JobOfferForm
            key={editing?.id || "new"}
            userId={user!.id}
            initial={editing}
            onClose={() => { setShow(false); setEditing(null); }}
            onSave={save}
          />
        )}

        {/* ===== MIS TRABAJOS (contratados / historial) ===== */}
        <div className="flex justify-between items-center">
          <b style={{ fontSize: 13 }}>Mis trabajos {hired.length > 0 && <span className="muted">({hired.length})</span>}</b>
        </div>
        {hired.length === 0 ? (
          <Card><p className="muted small">Aún no marcas ningún trabajo como contratado. Abre una propuesta en Editar y ponle fecha de inicio en “Contratación”.</p></Card>
        ) : (
          <div className="grid grid-2">
            {hired.map(o => {
              const phase = jobPhase(o);
              const today = todayISO();
              return (
                <Card key={o.id}>
                  <div className="flex justify-between items-center">
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <Briefcase size={14} style={{ color: "var(--text-muted)" }} />
                      <b style={{ fontSize: 13 }}>{o.company} — {o.position}</b>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button size="sm" onClick={() => { setEditing(o); setShow(true); }}><Edit3 size={12} /></Button>
                      <Button size="sm" onClick={() => removeOffer(o)}><Trash2 size={12} /></Button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    <Badge>{TYPE_LABEL[o.type]}</Badge>
                    <Badge variant={phase === "past" ? "default" : phase === "upcoming" ? "info" : "success"}>{PHASE_LABEL[phase]}</Badge>
                    {o.addedToCV && <Badge variant="success"><GraduationCap size={10} /> En CV</Badge>}
                  </div>
                  <div className="muted small" style={{ marginTop: 6 }}>
                    {o.hiredStart} → {o.hiredEnd || "vigente"}
                    {o.payDate && ` • Cobro: ${o.payDate}${o.payRecurrence && o.payRecurrence !== "unico" ? ` (${o.payRecurrence})` : ""}${o.payAmount ? ` S/ ${o.payAmount}` : ""}`}
                    {(o.bonuses?.length || 0) > 0 && ` • ${o.bonuses.length} bono(s)`}
                    {o.showInCalendar === false && " • oculto del calendario"}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    {!o.addedToCV
                      ? <Button size="sm" onClick={() => addToCV(o)}><GraduationCap size={12} /> Añadir al CV</Button>
                      : <Button size="sm" onClick={() => unmarkCV(o)} title="Quita la marca (la entrada del CV se borra en la página CV)">Desmarcar CV</Button>}
                    {o.payDate && o.payDate >= today && <Button size="sm" onClick={() => remindPay(o, nextPayDates(o, today, 1)[0] || o.payDate!)}><BellRing size={12} /> Recordar cobro</Button>}
                    {o.hiredStart && o.hiredStart >= today && <Button size="sm" onClick={() => remindStart(o)}><BellRing size={12} /> Recordar inicio</Button>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ===== PRÓXIMOS COBROS ===== */}
        {upcomingPays.length > 0 && (
          <Card>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
              <Wallet size={14} style={{ color: "#059669" }} />
              <b style={{ fontSize: 12 }}>Próximos cobros</b>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {upcomingPays.map(({ offer: o, date, bonus }) => (
                <div key={o.id + date + (bonus?.id || "")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>
                      {bonus ? `Bono ${bonus.concept} ${bonus.month}` : `${o.company} — ${o.position}`}
                    </div>
                    <div className="muted small">{date}{bonus ? ` • S/ ${bonus.amount} • ${o.company}` : `${o.payAmount ? ` • S/ ${o.payAmount}` : ""}${o.payRecurrence && o.payRecurrence !== "unico" ? ` • ${o.payRecurrence}` : ""}`}</div>
                  </div>
                  <Button size="sm" onClick={() => remindPay(o, date, bonus)}><BellRing size={12} /> Alarma</Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ===== PROPUESTAS POR COMPARAR ===== */}
        <div className="flex justify-between items-center" style={{ marginTop: 4 }}>
          <b style={{ fontSize: 13 }}>Propuestas por comparar</b>
        </div>
        <Card>
          <b style={{ fontSize: 12 }}>Pesos del comparador (tú decides qué importa)</b>
          <div className="grid grid-3" style={{ marginTop: 8 }}>
            {(["salary", "compatibility", "modality", "growth"] as const).map(k => (
              <div key={k}><Label>{k === "salary" ? "Sueldo" : k === "compatibility" ? "Compatibilidad horaria" : k === "modality" ? "Modalidad" : "Crecimiento"}</Label>
                <Input type="number" min="0" value={weights[k]} onChange={e => {
                  const next = { ...weights, [k]: Math.max(0, Number(e.target.value) || 0) };
                  setWeights(next);
                  try { localStorage.setItem("uc_compare_weights", JSON.stringify(next)); } catch {}
                }} /></div>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: 6 }}>Sueldo relativo a la mejor propuesta • compatibilidad 100 = sin choques • modalidad remoto 100 / híbrido 75 / presencial 50 • evento se compara como monto puntual (aprox).</p>
        </Card>

        {proposals.length === 0 ? (
          <Card><p className="muted">Sin propuestas pendientes. Las contratadas (con fecha de inicio) viven arriba en Mis trabajos.</p></Card>
        ) : (
          <div className="grid grid-2">
            {proposals.map(({ offer: o, score: s }, i) => (
              <Card key={o.id}>
                <div className="flex justify-between items-center">
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Briefcase size={14} style={{ color: "var(--text-muted)" }} />
                    <b style={{ fontSize: 13 }}>#{i + 1} {o.company} — {o.position}</b>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button size="sm" onClick={() => { setEditing(o); setShow(true); }}><Edit3 size={12} /></Button>
                    <Button size="sm" onClick={() => removeOffer(o)}><Trash2 size={12} /></Button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  <Badge>{TYPE_LABEL[o.type]}</Badge>
                  <Badge variant="info">{o.modality}</Badge>
                  <Badge variant={o.status === "oferta" ? "success" : o.status === "rechazada" || o.status === "descartada" ? "danger" : "default"}>{STATUS_LABEL[o.status]}</Badge>
                  {s.monthly !== null && <Badge variant="warn">~S/ {s.monthly.toFixed(0)}/mes{o.salaryPeriod === "evento" ? " (puntual)" : ""}</Badge>}
                  {o.deadline && <Badge variant="danger">cierra {o.deadline}</Badge>}
                </div>
                <div style={{ marginTop: 10, padding: 10, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10 }}>
                  <div className="flex justify-between items-center">
                    <b style={{ fontSize: 12 }}>Puntaje {s.total.toFixed(1)}</b>
                    {s.clashes.length === 0
                      ? <span className="badge badge-success" style={{ display: "flex", gap: 4, alignItems: "center" }}><CheckCircle2 size={12} /> Compatible</span>
                      : <span className="badge badge-warn" style={{ display: "flex", gap: 4, alignItems: "center" }}><AlertTriangle size={12} /> {s.clashes.length} choque(s)</span>}
                  </div>
                  <div style={{ height: 8, background: "var(--surface)", borderRadius: 999, marginTop: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.round(s.total)}%`, background: s.total >= 70 ? "#059669" : s.total >= 40 ? "#d97706" : "#dc2626" }} />
                  </div>
                  <div className="muted small" style={{ marginTop: 6 }}>
                    Sueldo {s.salary.toFixed(0)} • Horario {s.compatibility.toFixed(0)} • Modalidad {s.modality.toFixed(0)} • Crecimiento {s.growth.toFixed(0)}
                  </div>
                  {s.clashes.length > 0 && (
                    <div className="muted small" style={{ marginTop: 4 }}>
                      {s.clashes.map((cl, j) => <div key={j}>{dayName(cl.day)} {cl.offer} choca con {cl.courseCode} ({cl.course})</div>)}
                    </div>
                  )}
                </div>
                {(o.url || o.contact || o.notes) && (
                  <div className="muted small" style={{ marginTop: 8 }}>
                    {o.url && safeUrl(o.url) && <div><a href={safeUrl(o.url)!} target="_blank" rel="noreferrer">Ver aviso</a></div>}
                    {o.contact && <div>Contacto: {o.contact}</div>}
                    {o.notes && <div style={{ marginTop: 4 }}>{o.notes}</div>}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function emptySlot(): JobSlot {
  return { id: "", dayOfWeek: 1, startTime: "09:00", endTime: "13:00" };
}

function JobOfferForm({ userId, initial, onClose, onSave }: { userId: string; initial: JobOffer | null; onClose: () => void; onSave: (o: JobOffer) => void }) {
  const [company, setCompany] = useState(initial?.company || "");
  const [position, setPosition] = useState(initial?.position || "");
  const [type, setType] = useState<JobOfferType>(initial?.type || "parcial");
  const [modality, setModality] = useState<JobModality>(initial?.modality || "presencial");
  const [location, setLocation] = useState(initial?.location || "");
  const [slots, setSlots] = useState<JobSlot[]>(initial?.schedule || []);
  const [salaryMin, setSalaryMin] = useState(initial?.salaryMin !== undefined ? String(initial.salaryMin) : "");
  const [salaryMax, setSalaryMax] = useState(initial?.salaryMax !== undefined ? String(initial.salaryMax) : "");
  const [salaryPeriod, setSalaryPeriod] = useState<SalaryPeriod>(initial?.salaryPeriod || "mes");
  const [deadline, setDeadline] = useState(initial?.deadline || "");
  const [status, setStatus] = useState<JobOfferStatus>(initial?.status || "guardada");
  const [url, setUrl] = useState(initial?.url || "");
  const [contact, setContact] = useState(initial?.contact || "");
  const [growth, setGrowth] = useState(initial?.growth !== undefined ? String(initial.growth) : "3");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [hiredStart, setHiredStart] = useState(initial?.hiredStart || "");
  const [hiredEnd, setHiredEnd] = useState(initial?.hiredEnd || "");
  const [payDate, setPayDate] = useState(initial?.payDate || "");
  const [payRecurrence, setPayRecurrence] = useState<PayRecurrence>(initial?.payRecurrence || "unico");
  const [payAmount, setPayAmount] = useState(initial?.payAmount !== undefined ? String(initial.payAmount) : "");
  const [showInCalendar, setShowInCalendar] = useState(initial?.showInCalendar !== false);
  const tcfg = jobTypeConfig(type);
  const [bonuses, setBonuses] = useState<JobBonus[]>(initial?.bonuses || []);
  const [draft, setDraft] = useState<JobSlot>(emptySlot());
  const [multiDays, setMultiDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [multiStart, setMultiStart] = useState("09:00");
  const [multiEnd, setMultiEnd] = useState("18:00");
  const [bonusMonth, setBonusMonth] = useState(new Date().toISOString().slice(0, 7));
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusConcept, setBonusConcept] = useState<BonusConcept>("rendimiento");
  const [bonusDate, setBonusDate] = useState("");

  const addSlot = () => {
    if (!draft.startTime || !draft.endTime || draft.startTime >= draft.endTime) return alert("Horario inválido");
    setSlots([...slots, { ...draft, id: crypto.randomUUID() }]);
    setDraft(emptySlot());
  };

  const applyMultiDay = () => {
    const built = buildSlotsForDays(multiDays, multiStart, multiEnd);
    if (built.length === 0) return alert("Elige días y un rango válido");
    const existingDays = new Set(slots.map(s => s.dayOfWeek));
    const fresh = built.filter(s => !existingDays.has(s.dayOfWeek));
    if (fresh.length === 0) return alert("Esos días ya tienen horario (edítalos uno por uno)");
    setSlots([...slots, ...fresh.map(s => ({ ...s, id: crypto.randomUUID() }))]);
  };

  const addBonus = () => {
    if (!bonusMonth || !bonusAmount || Number(bonusAmount) <= 0) return alert("Mes y monto del bono requeridos");
    setBonuses([...bonuses, {
      id: crypto.randomUUID(), month: bonusMonth, amount: Number(bonusAmount),
      concept: bonusConcept, date: bonusDate || undefined,
    }]);
    setBonusAmount(""); setBonusDate("");
  };

  const save = () => {
    if (!company.trim() || !position.trim()) return alert("Empresa y puesto requeridos");
    if (hiredStart && hiredEnd && hiredStart > hiredEnd) return alert("Inicio no puede ser posterior al fin");
    const g = growth ? Number(growth) : undefined;
    onSave({
      id: initial?.id || crypto.randomUUID(),
      userId,
      company: company.trim(),
      position: position.trim(),
      type, modality,
      location: location.trim() || undefined,
      schedule: slots,
      bonuses,
      salaryMin: salaryMin ? Number(salaryMin) : undefined,
      salaryMax: salaryMax ? Number(salaryMax) : undefined,
      salaryPeriod,
      deadline: deadline || undefined,
      status,
      url: url.trim() || undefined,
      contact: contact.trim() || undefined,
      growth: g !== undefined && g >= 1 && g <= 5 ? g : undefined,
      notes: notes.trim() || undefined,
      hiredStart: hiredStart || undefined,
      hiredEnd: hiredEnd || undefined,
      payDate: payDate || undefined,
      payRecurrence: payDate ? payRecurrence : undefined,
      payAmount: payAmount ? Number(payAmount) : undefined,
      showInCalendar,
      addedToCV: initial?.addedToCV || false,
      cvWorkId: initial?.cvWorkId,
      createdAt: initial?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <Card>
      <div className="flex justify-between items-center"><b>{initial ? "Editar propuesta" : "Nueva propuesta"}</b><Button size="sm" onClick={onClose}>Cerrar</Button></div>
      <div className="grid grid-3" style={{ marginTop: 10 }}>
        <div><Label>Empresa *</Label><Input value={company} onChange={e => setCompany(e.target.value)} placeholder="ACME S.A.C." /></div>
        <div><Label>Puesto *</Label><Input value={position} onChange={e => setPosition(e.target.value)} placeholder="Asistente part-time" /></div>
        <div><Label>Tipo</Label><Select value={type} onChange={e => { const nt = e.target.value as JobOfferType; setType(nt); setSalaryPeriod(p => validPeriodFor(nt, p)); }}>
          <option value="fijo">Fijo (tiempo completo)</option><option value="parcial">Medio tiempo</option>
          <option value="gig">Por evento</option><option value="practica">Práctica</option>
        </Select></div>
      </div>
      <div className="grid grid-3" style={{ marginTop: 8 }}>
        <div><Label>Modalidad</Label><Select value={modality} onChange={e => setModality(e.target.value as JobModality)}>
          <option value="presencial">Presencial</option><option value="remoto">Remoto</option><option value="hibrido">Híbrido</option>
        </Select></div>
        <div><Label>Lugar</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Miraflores / Remoto" /></div>
        <div><Label>Estado</Label><Select value={status} onChange={e => setStatus(e.target.value as JobOfferStatus)}>
          <option value="guardada">Guardada</option><option value="postulada">Postulada</option>
          <option value="entrevista">Entrevista</option><option value="oferta">Oferta</option>
          <option value="rechazada">Rechazada</option><option value="descartada">Descartada</option>
        </Select></div>
      </div>
      <div className="grid grid-3" style={{ marginTop: 8 }}>
        <div><Label>Sueldo mín (S/)</Label><Input type="number" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="1130" /></div>
        <div><Label>Sueldo máx (S/)</Label><Input type="number" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder="1500" /></div>
        <div><Label>Por</Label><Select value={salaryPeriod} onChange={e => setSalaryPeriod(e.target.value as SalaryPeriod)}>
          {tcfg.salaryPeriods.map(p => <option key={p} value={p}>{p === "mes" ? "Mes" : p === "hora" ? "Hora" : "Evento (puntual)"}</option>)}
        </Select></div>
      </div>
      <div className="grid grid-3" style={{ marginTop: 8 }}>
        <div><Label>{tcfg.deadlineLabel}</Label><Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></div>
        {tcfg.showGrowth && <div><Label>Crecimiento (1-5)</Label><Input type="number" min="1" max="5" value={growth} onChange={e => setGrowth(e.target.value)} /></div>}
        <div><Label>Contacto</Label><Input value={contact} onChange={e => setContact(e.target.value)} placeholder="RRHH, teléfono..." /></div>
      </div>
      <div style={{ marginTop: 8 }}><Label>Link del aviso</Label><Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></div>
      <div style={{ marginTop: 8 }}><Label>Notas</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Beneficios, exigencias, impresiones..." /></div>

      <div style={{ marginTop: 14, padding: 10, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10 }}>
        <b style={{ fontSize: 12 }}>Contratación (si ya es trabajo: historial o se viene)</b>
        <p className="muted small" style={{ margin: "4px 0 8px" }}>{tcfg.hiringHint} Con fecha de inicio pasa a “Mis trabajos” y aparece en Calendario. Al CV solo entra lo que tú marques.</p>
        <div className="grid grid-3">
          <div><Label>Inicio</Label><Input type="date" value={hiredStart} onChange={e => setHiredStart(e.target.value)} /></div>
          <div><Label>Fin (vacío = vigente)</Label><Input type="date" value={hiredEnd} onChange={e => setHiredEnd(e.target.value)} /></div>
          <div style={{ display: "flex", alignItems: "end" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
              <input type="checkbox" checked={showInCalendar} onChange={e => setShowInCalendar(e.target.checked)} /> Mostrar en calendario
            </label>
          </div>
        </div>
        <div className="grid grid-3" style={{ marginTop: 8 }}>
          <div><Label>Fecha de cobro</Label><Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} /></div>
          <div><Label>Recurrencia cobro</Label><Select value={payRecurrence} onChange={e => setPayRecurrence(e.target.value as PayRecurrence)}>
            <option value="unico">Único</option><option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option><option value="mensual">Mensual</option>
          </Select></div>
          <div><Label>Monto cobro (S/)</Label><Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" /></div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="flex justify-between items-center"><b style={{ fontSize: 12 }}>Horario propuesto (para compatibilidad con tus cursos)</b></div>
        <p className="muted small" style={{ margin: "4px 0 0" }}>{tcfg.scheduleHint}</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {slots.length === 0 ? <span className="muted small">Sin horario (no penaliza compatibilidad)</span> : slots.map(s => (
            <span key={s.id} className="chip">{dayName(s.dayOfWeek)} {s.startTime}-{s.endTime}
              <button onClick={() => setSlots(slots.filter(x => x.id !== s.id))} style={{ marginLeft: 6, border: "none", background: "transparent", cursor: "pointer" }}>✕</button>
            </span>
          ))}
        </div>
        <div className="grid grid-3" style={{ marginTop: 8 }}>
          <div><Label>Día</Label><Select value={String(draft.dayOfWeek)} onChange={e => setDraft({ ...draft, dayOfWeek: Number(e.target.value) })}>
            <option value="0">Domingo</option><option value="1">Lunes</option><option value="2">Martes</option>
            <option value="3">Miércoles</option><option value="4">Jueves</option><option value="5">Viernes</option><option value="6">Sábado</option>
          </Select></div>
          <div><Label>Inicio</Label><Input type="time" value={draft.startTime} onChange={e => setDraft({ ...draft, startTime: e.target.value })} /></div>
          <div><Label>Fin</Label><Input type="time" value={draft.endTime} onChange={e => setDraft({ ...draft, endTime: e.target.value })} /></div>
        </div>
        <Button size="sm" style={{ marginTop: 8 }} onClick={addSlot}><Plus size={12} /> Añadir horario</Button>
        {tcfg.scheduleHelper && (
        <div style={{ marginTop: 10, padding: 8, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8 }}>
          <Label>Atajo: mismo horario a varios días</Label>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
            {[1, 2, 3, 4, 5, 6, 0].map(d => (
              <label key={d} className="chip" style={{ cursor: "pointer", opacity: multiDays.includes(d) ? 1 : 0.55 }}>
                <input type="checkbox" checked={multiDays.includes(d)} onChange={e => setMultiDays(e.target.checked ? [...multiDays, d] : multiDays.filter(x => x !== d))} style={{ marginRight: 4 }} />
                {dayName(d)}
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "end" }}>
            <div><Label>Inicio</Label><Input type="time" value={multiStart} onChange={e => setMultiStart(e.target.value)} /></div>
            <div><Label>Fin</Label><Input type="time" value={multiEnd} onChange={e => setMultiEnd(e.target.value)} /></div>
            <Button size="sm" onClick={applyMultiDay}>Aplicar a días</Button>
          </div>
          <p className="muted small" style={{ marginTop: 4 }}>No toca los días que ya tienen horario (para horarios variables por día, edítalos uno por uno).</p>
        </div>
        )}
      </div>

      {tcfg.showBonuses && (
      <div style={{ marginTop: 14 }}>
        <b style={{ fontSize: 12 }}>Bonos mensuales variables (rendimiento / asistencia)</b>
        <p className="muted small" style={{ margin: "4px 0 8px" }}>Con fecha de cobro aparecen en Próximos cobros y en Calendario. No entran al puntaje del comparador (solo sueldo base).</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {bonuses.length === 0 ? <span className="muted small">Sin bonos</span> : bonuses
            .slice().sort((a, b) => a.month.localeCompare(b.month))
            .map(b => (
              <span key={b.id} className="chip">S/ {b.amount} • {b.concept} • {b.month}{b.date ? ` → ${b.date}` : ""}
                <button onClick={() => setBonuses(bonuses.filter(x => x.id !== b.id))} style={{ marginLeft: 6, border: "none", background: "transparent", cursor: "pointer" }}>✕</button>
              </span>
            ))}
        </div>
        <div className="grid grid-3" style={{ marginTop: 8 }}>
          <div><Label>Mes</Label><Input type="month" value={bonusMonth} onChange={e => setBonusMonth(e.target.value)} /></div>
          <div><Label>Monto (S/)</Label><Input type="number" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)} placeholder="300" /></div>
          <div><Label>Concepto</Label><Select value={bonusConcept} onChange={e => setBonusConcept(e.target.value as BonusConcept)}>
            <option value="rendimiento">Rendimiento</option><option value="asistencia">Asistencia</option><option value="otro">Otro</option>
          </Select></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "end" }}>
          <div><Label>Fecha de cobro (opcional)</Label><Input type="date" value={bonusDate} onChange={e => setBonusDate(e.target.value)} /></div>
          <Button size="sm" onClick={addBonus}><Plus size={12} /> Añadir bono</Button>
        </div>
      </div>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <Button variant="primary" onClick={save} className="w-full">Guardar propuesta</Button>
        <Button onClick={onClose}>Cancelar</Button>
      </div>
    </Card>
  );
}
