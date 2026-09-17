import { useEffect, useMemo, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Label, Select } from "../components/ui/primitives";
import { db } from "../lib/db";
import { useAuth } from "../stores/useAuth";
import { ganttBars, ganttRange } from "../lib/projectDates";
import type { ProjectBoard, ProjectCard } from "../types";

// Diagrama de Gantt (v1.2.0): complementa Proyectos con las tarjetas que tienen fechas.
// Solo lectura (se edita en Proyectos). Divs puros, sin librerías.
export default function GanttPage() {
  const { user } = useAuth();
  const [boards, setBoards] = useState<ProjectBoard[]>([]);
  const [boardId, setBoardId] = useState("all");
  const [cards, setCards] = useState<ProjectCard[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const bs = await db.listProjectBoards(user.id).catch(() => [] as ProjectBoard[]);
      setBoards(bs);
      const all: ProjectCard[] = [];
      for (const b of bs) all.push(...await db.listProjectCards(b.id).catch(() => [] as ProjectCard[]));
      setCards(all);
    })();
  }, [user?.id]);

  const filtered = useMemo(
    () => boardId === "all" ? cards : cards.filter(c => c.boardId === boardId),
    [cards, boardId]);
  const dated = useMemo(() => filtered.filter(c => c.startDate || c.dueDate), [filtered]);
  const range = useMemo(() => ganttRange(filtered, today), [filtered, today]);
  const bars = useMemo(() => ganttBars(filtered, range.from, range.to, today), [filtered, range, today]);
  const boardName = (id: string) => boards.find(b => b.id === id)?.name || "";

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <Topbar title="Gantt" subtitle="Cronograma de tus tarjetas con fechas • se edita en Proyectos" actions={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Label>Tablero</Label>
          <Select value={boardId} onChange={e => setBoardId(e.target.value)} style={{ width: 180 }}>
            <option value="all">Todos ({cards.length})</option>
            {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </div>
      } />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        {dated.length === 0 ? (
          <Card><p className="muted">Sin tarjetas con fechas{boardId !== "all" ? " en este tablero" : ""}. Pon inicio/fin en Proyectos para verlas aquí.</p></Card>
        ) : (
          <Card>
            <div className="muted small" style={{ marginBottom: 8 }}>{range.from} → {range.to} • hoy {today} • {bars.length} tarea(s)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {bars.map(b => (
                <div key={b.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 200, minWidth: 140 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={b.title}>{b.title}</div>
                    <div className="muted small">{boardName(filtered.find(c => c.id === b.id)?.boardId || "")} • {b.start} → {b.end}</div>
                  </div>
                  <div style={{ flex: 1, height: 22, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, position: "relative", overflow: "hidden" }}>
                    <div title={`${b.title}: ${b.start} → ${b.end} (${b.progress}%)`}
                      style={{
                        position: "absolute", top: 2, bottom: 2, left: `${b.leftPct}%`, width: `${b.widthPct}%`,
                        background: b.overdue ? "#dc2626" : "#0ea5e9", borderRadius: 4, minWidth: 8,
                      }}>
                      <div style={{ height: "100%", width: `${b.progress}%`, background: "rgba(255,255,255,.45)", borderRadius: 4 }} />
                    </div>
                  </div>
                  <span className="badge" style={{ minWidth: 44, justifyContent: "center" }}>{b.progress}%</span>
                </div>
              ))}
            </div>
            <p className="muted small" style={{ marginTop: 8 }}>Rojo = vencida sin completar. El relleno claro es el avance.</p>
          </Card>
        )}
        <Card>
          <b style={{ fontSize: 12 }}>Sin fecha ({filtered.length - dated.length})</b>
          <p className="muted small" style={{ marginTop: 4 }}>No aparecen en el cronograma hasta tener inicio o fin.</p>
        </Card>
      </div>
    </div>
  );
}
