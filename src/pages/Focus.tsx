import { useEffect, useMemo, useRef, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Input, Label, Select, Badge } from "../components/ui/primitives";
import { db } from "../lib/db";
import { useAuth } from "../stores/useAuth";
import { useData } from "../stores/useData";
import { BREAK_BANK, FOCUS_PRESETS, PRE_CHECKLIST, formatClock, getPreset, nextPhase, pickBreak, streakDays } from "../lib/focus";
import type { FocusPresetId, StudySession } from "../types";
import { Trash2, Play, Pause, RotateCcw, Eye, EyeOff, Plus, Flame } from "lucide-react";

export default function FocusPage() {
  const { user } = useAuth();
  const { courses } = useData();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [presetId, setPresetId] = useState<FocusPresetId>("pomodoro");
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [checks, setChecks] = useState<boolean[]>(() => {
    try { return JSON.parse(localStorage.getItem("uc_focus_checks") || "[false,false,false]"); } catch { return [false, false, false]; }
  });
  const [phase, setPhase] = useState<{ kind: "focus" | "break" | "long"; minutes: number } | null>(null);
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [focusDone, setFocusDone] = useState(0);
  const [distractions, setDistractions] = useState(0);
  const [startedAt, setStartedAt] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [breakMove, setBreakMove] = useState(BREAK_BANK[0]);

  const preset = getPreset(presetId);
  const live = useRef({ phase, distractions, startedAt, focusDone, presetId, courseId, title });
  live.current = { phase, distractions, startedAt, focusDone, presetId, courseId, title };

  const load = async () => { if (!user) return; setSessions(await db.listStudySessions(user.id).catch(() => [])); };
  useEffect(() => { load(); }, [user?.id]);

  // tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { clearInterval(id); setRunning(false); setTimeUp(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // transición al terminar una fase
  useEffect(() => {
    if (!timeUp) return;
    setTimeUp(false);
    const L = live.current;
    if (!L.phase) return;
    document.title = L.phase.kind === "focus" ? "✅ Enfoque completo — Spark" : "▶ A enfocar — Spark";
    setTimeout(() => { document.title = "Spark"; }, 8000);
    if (L.phase.kind === "focus") {
      void persistSession(true);
      const nx = nextPhase(getPreset(L.presetId), L.focusDone, "focus");
      setFocusDone(L.focusDone + 1);
      setPhase(nx);
      setSecs(nx.minutes * 60);
      if (nx.kind !== "focus") setBreakMove(pickBreak(L.focusDone + 1));
    } else {
      const nx = { kind: "focus" as const, minutes: getPreset(L.presetId).focusMin };
      setPhase(nx);
      setSecs(nx.minutes * 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  const persistSession = async (completed: boolean) => {
    if (!user) return;
    const L = live.current;
    const elapsedMin = L.phase && L.phase.kind === "focus"
      ? Math.max(1, Math.round((getPreset(L.presetId).focusMin * 60 - secs) / 60))
      : L.phase ? L.phase.minutes : 0;
    const now = new Date().toISOString();
    await db.saveStudySession({
      id: crypto.randomUUID(), userId: user.id,
      courseId: L.courseId || undefined, title: L.title.trim() || undefined,
      preset: L.presetId, plannedMinutes: L.phase?.minutes || 0,
      actualMinutes: completed && L.phase?.kind === "focus" ? L.phase.minutes : elapsedMin,
      distractions: L.distractions, completed,
      startedAt: L.startedAt || now, endedAt: now, createdAt: now,
    });
    await load();
  };

  const startFocus = () => {
    if (!checks.every(Boolean)) return alert("Marca el checklist pre-sesión (3 toques)");
    const p = getPreset(presetId);
    setPhase({ kind: "focus", minutes: p.focusMin });
    setSecs(p.focusMin * 60);
    setDistractions(0);
    setStartedAt(new Date().toISOString());
    setRunning(true);
  };

  const continuePhase = () => {
    if (!phase) return;
    if (phase.kind === "focus") {
      setDistractions(0);
      setStartedAt(new Date().toISOString());
    }
    setSecs(phase.minutes * 60);
    setRunning(true);
  };

  const finishEarly = async (savePartial: boolean) => {
    setRunning(false);
    if (savePartial && phase?.kind === "focus") await persistSession(false);
    setPhase(null);
    setFocusMode(false);
  };

  const setCheck = (i: number, v: boolean) => {
    const next = checks.map((c, j) => (j === i ? v : c));
    setChecks(next);
    try { localStorage.setItem("uc_focus_checks", JSON.stringify(next)); } catch {}
  };

  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = useMemo(() => sessions.filter(s => s.startedAt.slice(0, 10) === today), [sessions, today]);
  const streak = useMemo(() => streakDays(sessions.map(s => s.startedAt.slice(0, 10))), [sessions]);
  const todayMin = todaySessions.filter(s => s.completed).reduce((s, x) => s + x.actualMinutes, 0);
  const activeCourses = courses.filter(c => c.status === "activo");

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <Topbar title="Enfoque" subtitle="Timer por métodos + pausas activas + modo enfoque + rachas" actions={
        streak > 0 ? <span className="badge badge-warn" style={{ display: "flex", gap: 4, alignItems: "center" }}><Flame size={12} /> Racha {streak}d</span> : undefined
      } />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="grid grid-3">
          {FOCUS_PRESETS.map(p => (
            <Card key={p.id} hover>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b style={{ fontSize: 13 }}>{p.label}</b>
                {presetId === p.id
                  ? <Badge variant="success">Activo</Badge>
                  : <Button size="sm" onClick={() => { if (phase) return alert("Termina o descarta la fase actual"); setPresetId(p.id); }}>Usar</Button>}
              </div>
              <p className="muted small" style={{ marginTop: 4 }}>{p.desc}</p>
            </Card>
          ))}
        </div>

        <Card>
          <b style={{ fontSize: 12 }}>Sesión</b>
          <div className="grid grid-3" style={{ marginTop: 8 }}>
            <div><Label>Curso (opcional)</Label><Select value={courseId} onChange={e => setCourseId(e.target.value)}>
              <option value="">Libre</option>
              {activeCourses.map(c => <option key={c.id} value={c.id}>{c.code} {c.name}</option>)}
            </Select></div>
            <div style={{ gridColumn: "span 2" }}><Label>Tema (opcional)</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Cap. 4, informe lab…" /></div>
          </div>
          <div style={{ marginTop: 10 }}>
            <b style={{ fontSize: 12 }}>Checklist pre-sesión</b>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
              {PRE_CHECKLIST.map((t, i) => (
                <label key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
                  <input type="checkbox" checked={checks[i]} onChange={e => setCheck(i, e.target.checked)} /> {t}
                </label>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div className="muted small">
              {!phase ? preset.label : phase.kind === "focus" ? `Enfoque ${focusDone + 1}` : phase.kind === "break" ? "Pausa" : "Pausa larga"}
              {phase?.kind === "focus" && distractions > 0 && ` • ${distractions} distracción(es)`}
            </div>
            <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
              {formatClock(phase ? secs : preset.focusMin * 60)}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
              {!phase ? (
                <Button variant="primary" onClick={startFocus}><Play size={14} /> Iniciar enfoque</Button>
              ) : running ? (
                <Button onClick={() => setRunning(false)}><Pause size={14} /> Pausar</Button>
              ) : (
                <Button variant="primary" onClick={continuePhase}><Play size={14} /> Seguir</Button>
              )}
              {phase && <Button onClick={() => setFocusMode(f => !f)}>{focusMode ? <EyeOff size={14} /> : <Eye size={14} />} Modo enfoque</Button>}
              {phase?.kind === "focus" && <Button onClick={() => setDistractions(d => d + 1)}><Plus size={12} /> Me distraje</Button>}
              {phase && <Button onClick={() => { setRunning(false); setSecs(phase.minutes * 60); }} title="Reiniciar fase"><RotateCcw size={14} /></Button>}
              {phase && <Button onClick={() => void finishEarly(true)}>Terminar y guardar</Button>}
              {phase && <Button onClick={() => void finishEarly(false)}>Descartar</Button>}
            </div>
            {phase && phase.kind !== "focus" && (
              <div style={{ marginTop: 12, padding: 10, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, textAlign: "left" }}>
                <b style={{ fontSize: 12 }}>Pausa activa sugerida: {breakMove.title}</b>
                <p className="muted small" style={{ margin: "4px 0 0" }}>{breakMove.detail}</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center">
            <b style={{ fontSize: 12 }}>Hoy: {todayMin} min enfocados • {todaySessions.length} sesión(es)</b>
            {streak > 0 && <span className="badge badge-warn"><Flame size={12} /> {streak} día(s) seguidos</span>}
          </div>
          {todaySessions.length === 0 ? (
            <p className="muted small" style={{ marginTop: 6 }}>Sin sesiones hoy. Kaizen: empieza con una.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {todaySessions.map(s => (
                <div key={s.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}>
                  <Badge variant={s.completed ? "success" : "default"}>{s.completed ? "completa" : "parcial"}</Badge>
                  <span style={{ flex: 1 }}>{s.title || activeCourses.find(c => c.id === s.courseId)?.code || "Libre"} • {s.actualMinutes} min {s.distractions > 0 && `• ${s.distractions} distr.`}</span>
                  <Button size="sm" onClick={async () => { if (confirm("Eliminar sesión?")) { await db.deleteStudySession(s.id); await load(); } }}><Trash2 size={12} /></Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {focusMode && phase && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "var(--bg)", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ textAlign: "center" }}>
            <div className="muted small">{phase.kind === "focus" ? "ENFOQUE" : "PAUSA"}</div>
            <div style={{ fontSize: 96, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatClock(secs)}</div>
            <div className="muted small">{running ? "en marcha" : "en pausa"}{distractions > 0 && ` • ${distractions} distracción(es)`}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              {running
                ? <Button onClick={() => setRunning(false)}><Pause size={14} /> Pausar</Button>
                : <Button variant="primary" onClick={continuePhase}><Play size={14} /> Seguir</Button>}
              {phase.kind === "focus" && <Button onClick={() => setDistractions(d => d + 1)}><Plus size={12} /> Me distraje</Button>}
              <Button onClick={() => setFocusMode(false)}><EyeOff size={14} /> Salir (sigue corriendo)</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
