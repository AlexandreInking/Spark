import { useMemo, useEffect, useState } from "react";
import { useData } from "../stores/useData";
import { useAuth } from "../stores/useAuth";
import Topbar from "../components/layout/Topbar";
import { Card } from "../components/ui/primitives";
import { detectOverlaps, courseScheduleOverlaps } from "../lib/overlap";
import { DEFAULT_WEIGHTS, isHired, jobPhase, nextPayDates, rankOffers, todayISO, upcomingDatedBonuses } from "../lib/jobScore";
import { streakDays } from "../lib/focus";
import type { StudySession } from "../types";
import { isActiveCourse } from "../lib/activeCourses";
import { monthTotals, monthlySeries, totalDebtPending } from "../lib/finance";
import { safeUrl } from "../lib/security";
import type { Debt, JobOffer, MoneyTransaction } from "../types";
import { optimizeStudySchedule } from "../lib/scheduleOptimize";
import { format, parseISO, isAfter, differenceInDays } from "date-fns";
import { AlertTriangle, Clock, GraduationCap, Target, Briefcase, Wallet, KeyRound, TrendingUp, CalendarDays, Scale, Timer } from "lucide-react";
import { db } from "../lib/db";

export default function Dashboard() {
  const { courses, deliverables } = useData();
  const { user } = useAuth();
  const [reminders, setReminders] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [txs, setTxs] = useState<MoneyTransaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [studyToday, setStudyToday] = useState<StudySession[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    db.listReminders(user.id).then(setReminders);
    db.listContacts(user.id).then(setContacts);
    db.listJobOffers(user.id).then(setJobs).catch(() => {});
    db.listTransactions(user.id).then(setTxs).catch(() => {});
    db.listDebts(user.id).then(setDebts).catch(() => {});
    db.listStudySessions(user.id).then(all => {
      const t = new Date().toISOString().slice(0, 10);
      setStudyToday(all.filter(s => s.startedAt.slice(0, 10) === t));
      setStreak(streakDays(all.map(s => s.startedAt.slice(0, 10))));
    }).catch(() => {});
  }, [user?.id]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return deliverables
      .filter(d => d.status === "pendiente" || d.status === "en_progreso")
      .map(d => ({ d, date: safeDate(d.dueDate, d.dueTime) }))
      .filter(x => x.date && isAfter(x.date, now))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 8);
  }, [deliverables]);

  const interviews = useMemo(() => {
    const now = new Date();
    return deliverables
      .filter(d => d.type === "entrevista" && (d.status === "pendiente" || d.status === "en_progreso"))
      .map(d => ({ d, date: safeDate(d.dueDate, d.dueTime) }))
      .filter(x => x.date && isAfter(x.date, now))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [deliverables]);

  const unpaidReminders = useMemo(() => reminders.filter(r => !r.paid), [reminders]);

  const overlaps = useMemo(() => detectOverlaps(deliverables), [deliverables]);
  const scheduleConflicts = useMemo(() => courseScheduleOverlaps(courses), [courses]);
  const suggestions = useMemo(() => optimizeStudySchedule(deliverables, courses, 5, 4), [deliverables, courses]);

  // activo = no archivado + (recién registrado o con clase/entrega en 14 días)
  const activeCourses = courses.filter(c => isActiveCourse(c, deliverables));
  const totalCredits = activeCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
  const pendingCount = deliverables.filter(d => d.status === "pendiente").length;
  const urgentCount = deliverables.filter(d => d.status === "pendiente" && d.priority === "alta").length;

  // Trabajo (v0.6.3): historial contratado + próximos cobros (sueldos y bonos)
  const hiredJobs = useMemo(() => jobs.filter(isHired), [jobs]);
  const currentJobs = useMemo(() => hiredJobs.filter(j => jobPhase(j) !== "past"), [hiredJobs]);
  const nextPays = useMemo(() => {
    const today = todayISO();
    const list: { label: string; sub: string; date: string }[] = [];
    for (const o of hiredJobs) {
      for (const d of nextPayDates(o, today, 1)) {
        list.push({ label: `${o.company}`, sub: o.payAmount ? `S/ ${o.payAmount}` : "Cobro", date: d });
      }
      for (const { date, bonus } of upcomingDatedBonuses(o, today)) {
        list.push({ label: `Bono ${o.company}`, sub: `S/ ${bonus.amount} • ${bonus.concept}`, date });
      }
    }
    return list.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  }, [hiredJobs]);

  const monthBalance = useMemo(
    () => monthTotals(txs, new Date().toISOString().slice(0, 7)),
    [txs]);
  const topProposals = useMemo(
    () => rankOffers(jobs.filter(j => !isHired(j)), activeCourses, DEFAULT_WEIGHTS).slice(0, 3),
    [jobs, activeCourses]);
  const focusMinToday = studyToday.filter(s => s.completed).reduce((s, x) => s + x.actualMinutes, 0);

  // Lo próximo (v1.4.0): timeline unificado 14 días + hoy. Solo lectura.
  const timeline = useMemo(() => {
    const today = todayISO();
    const endD = new Date(); endD.setDate(endD.getDate() + 14);
    const end = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, "0")}-${String(endD.getDate()).padStart(2, "0")}`;
    const items: { date: string; time: string; kind: string; title: string; sub: string; color: string }[] = [];
    for (const { d, date } of upcoming) {
      const ds = format(date, "yyyy-MM-dd");
      if (ds > end) continue;
      const c = courses.find(x => x.id === d.courseId);
      items.push({ date: ds, time: d.dueTime || "", kind: d.type === "entrevista" ? "entrevista" : "entrega", title: d.title, sub: `${c?.code || ""} ${d.type}`.trim(), color: c?.color || "#111827" });
    }
    for (const r of unpaidReminders) {
      if (r.dueDate < today || r.dueDate > end) continue;
      items.push({ date: r.dueDate, time: r.dueTime || "", kind: r.type, title: r.title, sub: `${r.type}${r.amount ? ` • S/ ${r.amount}` : ""}`, color: r.type === "pago" ? "#d97706" : "#7c3aed" });
    }
    for (const o of jobs.filter(isHired)) {
      for (const pd of nextPayDates(o, today, 2)) {
        if (pd > end) continue;
        items.push({ date: pd, time: "", kind: "cobro", title: `Cobro ${o.company}`, sub: o.payAmount ? `S/ ${o.payAmount}` : o.position, color: "#059669" });
      }
      for (const { date: pd, bonus } of upcomingDatedBonuses(o, today)) {
        if (pd > end) continue;
        items.push({ date: pd, time: "", kind: "bono", title: `Bono ${o.company}`, sub: `S/ ${bonus.amount} • ${bonus.concept}`, color: "#7c3aed" });
      }
    }
    for (const o of jobs.filter(j => !isHired(j) && ["guardada", "postulada", "entrevista"].includes(j.status))) {
      if (o.deadline && o.deadline >= today && o.deadline <= end) {
        items.push({ date: o.deadline, time: "", kind: "cierre", title: `Cierra: ${o.company}`, sub: o.position, color: "#dc2626" });
      }
    }
    return items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 12);
  }, [upcoming, unpaidReminders, jobs, courses]);
  const todayStr = todayISO();
  const todayItems = timeline.filter(t => t.date === todayStr);
  const todayClasses = useMemo(() => {
    const dow = new Date().getDay();
    return activeCourses.flatMap(c => (c.schedule || [])
      .filter(s => s.dayOfWeek === dow)
      .map(s => ({ course: c, slot: s })));
  }, [activeCourses]);
  const healthSeries = useMemo(
    () => monthlySeries(txs, new Date().toISOString().slice(0, 7), 6),
    [txs]);
  const debtSum = useMemo(() => totalDebtPending(debts, txs), [debts, txs]);
  const healthMax = Math.max(1, ...healthSeries.map(p => Math.abs(p.balance)));

  const kpis = [
    { label: "Cursos activos", value: activeCourses.length, sub: `${totalCredits} créditos`, icon: GraduationCap, color: "#0369a1" },
    { label: "Pendientes", value: pendingCount, sub: `${urgentCount} urgentes`, icon: Clock, color: "#d97706" },
    { label: "Entrevistas", value: interviews.length, sub: interviews.length > 0 ? `Próxima: ${format(interviews[0].date, "dd MMM")}` : "Ninguna", icon: Briefcase, color: "#059669" },
    { label: "Pagos/trámites", value: unpaidReminders.length, sub: unpaidReminders.length > 0 ? `$${unpaidReminders.reduce((s, r) => s + (r.amount || 0), 0).toFixed(0)}` : "Al día", icon: Wallet, color: "#7c3aed" },
    { label: "Trabajos vigentes", value: currentJobs.length, sub: currentJobs.length > 0 ? currentJobs.slice(0, 2).map(j => j.company).join(" • ") : "Sin trabajos", icon: Briefcase, color: "#b45309" },
    { label: "Próximo cobro", value: nextPays[0] ? nextPays[0].date.slice(8) + "/" + nextPays[0].date.slice(5, 7) : "—", sub: nextPays[0] ? `${nextPays[0].label} ${nextPays[0].sub}` : "Sin cobros", icon: Wallet, color: "#059669" },
    { label: "Balance del mes", value: `S/ ${monthBalance.balance.toFixed(0)}`, sub: `+${monthBalance.income.toFixed(0)} / −${monthBalance.expense.toFixed(0)}`, icon: Scale, color: monthBalance.balance >= 0 ? "#059669" : "#dc2626" },
    { label: "Contactos", value: contacts.length, icon: KeyRound, color: "#64748b" },
    { label: "Próximo vencimiento", value: upcoming[0] ? `${differenceInDays(upcoming[0].date, new Date())}d` : "—", sub: upcoming[0] ? upcoming[0].d.title : "", icon: Target, color: "#dc2626" },
  ];

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <Topbar title="Dashboard" subtitle="Resumen completo de tu actividad académica y profesional" actions={<span className="badge">{new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</span>} />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Lo próximo: hoy + 14 días, todo el programa en una línea de tiempo */}
        <Card>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Hoy — {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</h3>
          {todayClasses.length === 0 && todayItems.length === 0 ? (
            <p className="muted small" style={{ marginTop: 6 }}>Nada hoy. Buen día para adelantar o descansar.</p>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {todayClasses.map(({ course: c, slot: s }, i) => (
                <span key={"cl" + i} className="chip"><span className="dot" style={{ background: c.color }} />{c.code} {s.startTime}-{s.endTime}</span>
              ))}
              {todayItems.map((t, i) => (
                <span key={"ti" + i} className="chip"><span className="dot" style={{ background: t.color }} />{t.time ? `${t.time} ` : ""}{t.title}</span>
              ))}
            </div>
          )}
          <h3 style={{ margin: "12px 0 0", fontSize: 13, fontWeight: 700 }}>Lo próximo (14 días)</h3>
          {timeline.length === 0 ? (
            <p className="muted small" style={{ marginTop: 6 }}>Sin vencimientos, cobros ni cierres. Estás al día.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
              {timeline.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
                  <span className="badge" style={{ minWidth: 52, justifyContent: "center" }}>{t.date.slice(8)}/{t.date.slice(5, 7)}</span>
                  <span className="dot" style={{ background: t.color }} />
                  <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><b>{t.title}</b> <span className="muted">• {t.sub}{t.time ? ` • ${t.time}` : ""}</span></span>
                  {t.date === todayStr && <span className="badge badge-warn" style={{ fontSize: 10 }}>HOY</span>}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {kpis.map(k => (
            <Card key={k.label} hover>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: k.color + "18", display: "grid", placeItems: "center" }}>
                  <k.icon size={16} style={{ color: k.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{k.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{k.value}</div>
                  {k.sub && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{k.sub}</div>}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Alertas */}
        {(overlaps.length > 0 || scheduleConflicts.length > 0) && (
          <Card>
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 700 }}>
              <AlertTriangle size={14} style={{ color: "#d97706" }} />
              Alertas de cruce ({overlaps.length + scheduleConflicts.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
              {overlaps.slice(0, 3).map((o, i) => (
                <div key={i} style={{ fontSize: 12, padding: "6px 10px", background: "var(--surface-2)", borderRadius: 8 }}>
                  <b>{o.a.title}</b> ↔ <b>{o.b.title}</b> — {o.reason}
                </div>
              ))}
              {scheduleConflicts.slice(0, 3).map((s, i) => (
                <div key={`s${i}`} style={{ fontSize: 12, padding: "6px 10px", background: "var(--surface-2)", borderRadius: 8 }}>
                  <b>{s.a.code}</b> ↔ <b>{s.b.code}</b> — {s.reason}
                </div>
              ))}
            </div>
          </Card>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>

          {/* Entrevistas próximas */}
          {interviews.length > 0 && (
            <Card>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                <Briefcase size={14} style={{ color: "#059669" }} />
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>💼 Entrevistas laborales</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {interviews.map(({ d, date }) => (
                  <div key={d.id} style={{ padding: 8, border: "1px solid #a7f3d0", background: "#ecfdf5", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{d.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.location || "Sin ubicación"} • {d.durationMinutes || 60} min</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#059669" }}>{format(date, "EEE dd MMM")}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{format(date, "HH:mm")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Próximos 7 días */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Próximos {upcoming.length} entregables</h3>
              <CalendarDays size={14} style={{ color: "var(--text-muted)" }} />
            </div>
            {upcoming.length === 0 ? (
              <p className="muted small">Sin pendientes próximos. ¡Estás al día!</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {upcoming.map(({ d, date }) => {
                  const c = courses.find(x => x.id === d.courseId);
                  const daysLeft = differenceInDays(date, new Date());
                  return (
                    <div key={d.id} style={{ display: "flex", gap: 10, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface-2)" }}>
                      <div style={{ width: 4, borderRadius: 999, background: c?.color || "#111827" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.title}</div>
                        <div className="muted small">{c?.code || "—"} • {d.type} • peso {d.weight ?? "—"}%</div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 60 }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{format(date, "dd MMM")}</div>
                        <div style={{ fontSize: 10, color: daysLeft <= 1 ? "#dc2626" : "var(--text-muted)" }}>
                          {daysLeft === 0 ? "HOY" : daysLeft === 1 ? "MAÑANA" : `${daysLeft}d`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Pagos y trámites pendientes */}
          {unpaidReminders.length > 0 && (
            <Card>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                <Wallet size={14} style={{ color: "#7c3aed" }} />
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Pagos y trámites pendientes</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {unpaidReminders.slice(0, 5).map(r => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.dueDate} • {r.type}</div>
                    </div>
                    {r.amount && <span className="badge">${r.amount}</span>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Enfoque hoy */}
          <Card>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
              <Timer size={14} style={{ color: "#7c3aed" }} />
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Enfoque hoy</h3>
              {streak > 0 && <span className="badge badge-warn" style={{ fontSize: 10 }}>🔥 {streak}d</span>}
            </div>
            {studyToday.length === 0 ? (
              <p className="muted small">Sin sesiones hoy. Una basta para la racha — ver Enfoque.</p>
            ) : (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{focusMinToday}<span className="muted" style={{ fontSize: 12 }}> min</span></div>
                <div className="muted small">{studyToday.length} sesión(es) • {studyToday.filter(s => s.completed).length} completa(s)</div>
              </div>
            )}
          </Card>

          {/* Optimización de estudio */}
          <Card>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
              <TrendingUp size={14} style={{ color: "var(--text-muted)" }} />
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Optimización de estudio</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {suggestions.slice(0, 4).map(s => (
                <div key={s.date} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{format(parseISO(s.date), "EEE dd MMM")} <span className="muted">• {s.freeHours}h libres</span></div>
                  {s.blocks.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                      {s.blocks.map(b => (
                        <span key={b.deliverableId} className="chip" title={b.reason} style={{ fontSize: 10 }}>
                          <span className="dot" style={{ background: b.priority === "alta" ? "#dc2626" : b.priority === "media" ? "#d97706" : "#059669" }} />
                          {b.title} • {b.hours}h
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Acceso rápido a cursos */}
        <Card>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Acceso rápido — Cursos activos</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {activeCourses.slice(0, 6).map(c => (
              <div key={c.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10, minWidth: 200, flex: "1 1 200px", background: "var(--surface-2)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="dot" style={{ background: c.color }} />
                  <b style={{ fontSize: 13 }}>{c.code}</b>
                  <span className="muted small">{c.classroom || ""}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                <div className="muted small">{c.professor}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {c.schedule.length > 0 && <span className="badge" style={{ fontSize: 10 }}>{c.schedule.length} horarios</span>}
                  {deliverables.filter(d => d.courseId === c.id && d.status === "pendiente").length > 0 && (
                    <span className="badge badge-warn" style={{ fontSize: 10 }}>{deliverables.filter(d => d.courseId === c.id && d.status === "pendiente").length} pendientes</span>
                  )}
                  {c.links.slice(0, 1).map(l => (
                    <a key={l.id} className="badge" href={safeUrl(l.url) || undefined} target="_blank" rel="noreferrer" style={{ fontSize: 10 }}>{l.label}</a>
                  ))}
                </div>
                {c.credentials[0] && (
                  <div style={{ marginTop: 6 }}>
                    <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={async () => {
                      try { await navigator.clipboard.writeText(c.credentials[0].password); alert("Contraseña copiada"); } catch { alert(c.credentials[0].password); }
                    }}>Copiar credencial</button>
                  </div>
                )}
              </div>
            ))}
            {activeCourses.length === 0 && <span className="muted small">Registra tu primer curso en "Cursos".</span>}
          </div>
        </Card>

        {/* Trabajo: contratados + cobros; si no hay, mejores propuestas; si nada, CTA */}
        <Card>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Trabajo — resumen <span className="muted" style={{ fontWeight: 400 }}>• detalle en Empleo</span></h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {currentJobs.slice(0, 4).map(j => (
              <div key={j.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10, minWidth: 180, flex: "1 1 180px", background: "var(--surface-2)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="dot" style={{ background: "#b45309" }} />
                  <b style={{ fontSize: 13 }}>{j.company}</b>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{j.position}</div>
                <div className="muted small">{j.hiredStart} → {j.hiredEnd || "vigente"}</div>
              </div>
            ))}
            {nextPays.length > 0 && (
              <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10, minWidth: 180, flex: "1 1 180px", background: "var(--surface-2)" }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Próximos cobros</div>
                {nextPays.slice(0, 3).map((p, i) => (
                  <div key={i} className="muted small" style={{ marginTop: 4 }}>{p.date} • <b style={{ color: "var(--text)" }}>{p.label}</b> {p.sub}</div>
                ))}
              </div>
            )}
            {currentJobs.length === 0 && nextPays.length === 0 && topProposals.length > 0 && (
              <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10, minWidth: 180, flex: "1 1 180px", background: "var(--surface-2)" }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Mejores propuestas</div>
                {topProposals.map(({ offer: o, score: s }) => (
                  <div key={o.id} className="muted small" style={{ marginTop: 4 }}>{o.company} — {o.position} <b style={{ color: "var(--text)" }}>{s.total.toFixed(0)}</b></div>
                ))}
              </div>
            )}
            {currentJobs.length === 0 && nextPays.length === 0 && topProposals.length === 0 && (
              <span className="muted small">Sin trabajos ni propuestas. Registra el primero en Empleo.</span>
            )}
          </div>
        </Card>

        {/* Salud económica (v0.7.1): mini serie de balances + deudas. Detalle en "Finanzas". */}
        {(txs.length > 0 || debts.length > 0) && (
          <Card>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Salud económica — últimos 6 meses</h3>
            <div style={{ display: "flex", gap: 8, alignItems: "end", height: 84, marginTop: 10 }}>
              {healthSeries.map(p => (
                <div key={p.ym} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div title={`${p.label}: ${p.balance >= 0 ? "+" : ""}S/ ${p.balance.toFixed(0)}`}
                    style={{ width: "100%", maxWidth: 44, height: Math.max(4, Math.round(Math.abs(p.balance) / healthMax * 48)), background: p.balance >= 0 ? "#059669" : "#dc2626", borderRadius: 3 }} />
                  <b style={{ fontSize: 10, color: p.balance >= 0 ? "#059669" : "#dc2626" }}>{p.balance >= 0 ? "+" : ""}{p.balance.toFixed(0)}</b>
                  <span className="muted" style={{ fontSize: 9 }}>{p.label}</span>
                </div>
              ))}
            </div>
            {debtSum.count > 0 && (
              <div className="muted small" style={{ marginTop: 6 }}>
                Deudas pendientes: <b style={{ color: "#b45309" }}>S/ {debtSum.pending.toFixed(0)} ({debtSum.count})</b>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function safeDate(d: string, t: string) {
  try { return parseISO(`${d}T${t}:00`); } catch { return new Date(NaN as any); }
}
