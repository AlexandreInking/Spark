import { useEffect, useMemo, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Input, Label, Textarea } from "../components/ui/primitives";
import { db } from "../lib/db";
import { useAuth } from "../stores/useAuth";
import { autoProgress, boardRules, isDueSoon, isOverdue, shouldAutoDone, wipExceeded } from "../lib/projectDates";
import type { ProjectBoard, ProjectCard } from "../types";
import { Trash2, Plus, Edit3, ChevronLeft, ChevronRight, AlertTriangle, GripVertical } from "lucide-react";

// Tableros por columnas (v1.2.0): tarjetas con etiquetas, fechas, checklist,
// progreso y automatización auto-done. Sin drag&drop (mover con ◀ ▶): simple y no se rompe.
export default function ProjectsPage() {
  const { user } = useAuth();
  const [boards, setBoards] = useState<ProjectBoard[]>([]);
  const [boardId, setBoardId] = useState("");
  const [cards, setCards] = useState<ProjectCard[]>([]);
  const [search, setSearch] = useState("");
  const [openCard, setOpenCard] = useState<ProjectCard | null>(null);
  const [quickAdd, setQuickAdd] = useState<Record<string, string>>({});
  const [drag, setDrag] = useState<{ kind: "card" | "col"; id: string } | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const loadBoards = async () => {
    if (!user) return;
    const bs = await db.listProjectBoards(user.id).catch(() => [] as ProjectBoard[]);
    setBoards(bs);
    if (!boardId && bs.length) setBoardId(bs[0].id);
    if (boardId && !bs.some(b => b.id === boardId)) setBoardId(bs[0]?.id || "");
  };
  const loadCards = async (bid: string) => {
    if (!bid) { setCards([]); return; }
    setCards(await db.listProjectCards(bid).catch(() => []));
  };
  useEffect(() => { loadBoards(); }, [user?.id]);
  useEffect(() => { loadCards(boardId); }, [boardId]);

  const board = boards.find(b => b.id === boardId) || null;
  const today = new Date().toISOString().slice(0, 10);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(c => (c.title + " " + (c.desc || "") + " " + c.labels.join(" ")).toLowerCase().includes(q));
  }, [cards, search]);
  const overdue = cards.filter(c => c.dueDate && c.dueDate < today && c.progress < 100).length;

  const refresh = async () => { await loadBoards(); if (boardId) await loadCards(boardId); };

  const newBoard = async () => {
    if (!user) return;
    const name = prompt("Nombre del tablero:", "Proyecto");
    if (!name?.trim()) return;
    const b: ProjectBoard = {
      id: crypto.randomUUID(), userId: user.id, name: name.trim(),
      columns: [
        { id: crypto.randomUUID(), title: "Por hacer" },
        { id: crypto.randomUUID(), title: "En curso" },
        { id: crypto.randomUUID(), title: "Hecho" },
      ],
      createdAt: new Date().toISOString(),
    };
    await db.saveProjectBoard(b);
    setBoardId(b.id);
    await loadBoards(); await loadCards(b.id);
  };

  const addColumn = async () => {
    if (!board || !user) return;
    const title = prompt("Nombre de la columna:");
    if (!title?.trim()) return;
    await db.saveProjectBoard({ ...board, columns: [...board.columns, { id: crypto.randomUUID(), title: title.trim() }] });
    await loadBoards();
  };

  const renameColumn = async (colId: string, cur: string) => {
    if (!board) return;
    const title = prompt("Renombrar columna:", cur);
    if (!title?.trim()) return;
    await db.saveProjectBoard({ ...board, columns: board.columns.map(c => c.id === colId ? { ...c, title: title.trim() } : c) });
    await loadBoards();
  };

  const deleteColumn = async (colId: string) => {
    if (!board) return;
    const n = cards.filter(c => c.columnId === colId).length;
    if (n > 0 && !confirm(`La columna tiene ${n} tarjeta(s). ¿Borrar columna y sus tarjetas?`)) return;
    if (n === 0 && !confirm("¿Borrar columna?")) return;
    for (const c of cards.filter(x => x.columnId === colId)) await db.deleteProjectCard(c.id);
    await db.saveProjectBoard({ ...board, columns: board.columns.filter(c => c.id !== colId) });
    await refresh();
  };

  const quickCreate = async (colId: string) => {
    if (!board || !user) return;
    const title = (quickAdd[colId] || "").trim();
    if (!title) return;
    const inCol = cards.filter(c => c.columnId === colId);
    await db.saveProjectCard({
      id: crypto.randomUUID(), boardId: board.id, columnId: colId, title,
      labels: [], assignees: [], progress: 0, checklist: [],
      position: inCol.length ? Math.max(...inCol.map(c => c.position)) + 1 : 0,
      createdAt: new Date().toISOString(),
    });
    setQuickAdd({ ...quickAdd, [colId]: "" });
    await loadCards(board.id);
  };

  const setRules = async (patch: Partial<import("../types").BoardRules>) => {
    if (!board) return;
    const rules = { ...boardRules(board), ...patch };
    await db.saveProjectBoard({ ...board, rules, autoDone: rules.autoDone });
    await loadBoards();
  };

  const setWip = async (colId: string, cur?: number) => {
    if (!board) return;
    const raw = prompt("Límite WIP (0 = sin límite):", String(cur || 0));
    if (raw === null) return;
    const wip = Math.max(0, Number(raw) || 0);
    await db.saveProjectBoard({
      ...board,
      columns: board.columns.map(c => c.id === colId ? { ...c, wip: wip || undefined } : c),
    });
    await loadBoards();
  };

  const moveColumn = async (colId: string, dir: -1 | 1) => {
    if (!board) return;
    const cols = [...board.columns];
    const i = cols.findIndex(c => c.id === colId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cols.length) return;
    [cols[i], cols[j]] = [cols[j], cols[i]];
    await db.saveProjectBoard({ ...board, columns: cols });
    await loadBoards();
  };

  // --- drag & drop nativo (mouse; botones como respaldo). Sin búsqueda activa para no confundir índices.
  const onDropCardOnCard = async (target: ProjectCard) => {
    if (!board || !drag || drag.kind !== "card" || search.trim()) return;
    const moving = cards.find(c => c.id === drag.id);
    if (!moving || moving.id === target.id) return;
    const colCards = cards
      .filter(c => c.columnId === target.columnId && c.id !== moving.id)
      .sort((a, b) => a.position - b.position);
    const at = colCards.findIndex(c => c.id === target.id);
    colCards.splice(at < 0 ? colCards.length : at, 0, moving);
    let i = 0;
    for (const c of colCards) {
      await db.saveProjectCard({ ...c, columnId: target.columnId, position: i++ });
    }
    setDrag(null); setOverCol(null);
    await loadCards(board.id);
  };

  const onDropCardOnColumn = async (colId: string) => {
    if (!board || !drag || drag.kind !== "card" || search.trim()) return;
    const moving = cards.find(c => c.id === drag.id);
    if (!moving || moving.columnId === colId) { setDrag(null); setOverCol(null); return; }
    const inCol = cards.filter(c => c.columnId === colId);
    await db.saveProjectCard({ ...moving, columnId: colId, position: inCol.length ? Math.max(...inCol.map(c => c.position)) + 1 : 0 });
    setDrag(null); setOverCol(null);
    await loadCards(board.id);
  };

  const onDropColOnCol = async (targetId: string) => {
    if (!board || !drag || drag.kind !== "col") return;
    const cols = [...board.columns];
    const from = cols.findIndex(c => c.id === drag.id);
    const to = cols.findIndex(c => c.id === targetId);
    if (from < 0 || to < 0 || from === to) { setDrag(null); return; }
    const [moved] = cols.splice(from, 1);
    cols.splice(to, 0, moved);
    await db.saveProjectBoard({ ...board, columns: cols });
    setDrag(null);
    await loadBoards();
  };

  const moveCard = async (card: ProjectCard, dir: -1 | 1) => {
    if (!board) return;
    const idx = board.columns.findIndex(c => c.id === card.columnId);
    const ni = idx + dir;
    if (ni < 0 || ni >= board.columns.length) return;
    await db.saveProjectCard({ ...card, columnId: board.columns[ni].id });
    await loadCards(board.id);
  };

  const moveCardTo = async (card: ProjectCard, colId: string) => {
    if (!board || card.columnId === colId) return;
    const inCol = cards.filter(c => c.columnId === colId);
    await db.saveProjectCard({ ...card, columnId: colId, position: inCol.length ? Math.max(...inCol.map(c => c.position)) + 1 : 0 });
    await loadCards(board.id);
  };

  const saveCard = async (card: ProjectCard) => {
    if (!board) return;
    const rules = boardRules(board);
    let next = card;
    // automatización: progreso = % checklist
    if (rules.autoProgress) {
      const auto = autoProgress(card);
      if (auto !== null) next = { ...next, progress: auto };
    }
    // automatización: checklist completo → última columna
    if (rules.autoDone && shouldAutoDone(next)) {
      const last = board.columns[board.columns.length - 1];
      if (last && next.columnId !== last.id) next = { ...next, columnId: last.id, progress: 100 };
    }
    // automatización: vencidas al frente (primera columna)
    if (rules.overdueToFront && isOverdue(next, new Date().toISOString().slice(0, 10))) {
      const first = board.columns[0];
      if (first && next.columnId !== first.id) next = { ...next, columnId: first.id };
    }
    await db.saveProjectCard(next);
    setOpenCard(null);
    await loadCards(board.id);
  };

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <Topbar title="Proyectos" subtitle="Tableros por columnas: tarjetas, etiquetas, fechas y checklist" actions={
        <div style={{ display: "flex", gap: 8 }}>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…" style={{ width: 160 }} />
          <Button variant="primary" onClick={newBoard}><Plus size={14} /> Tablero</Button>
        </div>
      } />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        {boards.length === 0 ? (
          <Card><p className="muted">Sin tableros. Crea el primero (viene con Por hacer / En curso / Hecho).</p></Card>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {boards.map(b => (
                  <Button key={b.id} size="sm" variant={b.id === boardId ? "primary" : "ghost"} onClick={() => setBoardId(b.id)}>{b.name}</Button>
                ))}
              </div>
              <span style={{ flex: 1 }} />
              {board && (
                <>
                  {overdue > 0 && <span className="badge badge-warn" style={{ display: "flex", gap: 4, alignItems: "center" }}><AlertTriangle size={12} /> {overdue} vencida(s)</span>}
                  <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }} title="Al completar el checklist, la tarjeta pasa sola a la última columna">
                    <input type="checkbox" checked={boardRules(board).autoDone} onChange={e => setRules({ autoDone: e.target.checked })} /> Auto-done
                  </label>
                  <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }} title="El avance se calcula solo desde el checklist">
                    <input type="checkbox" checked={boardRules(board).autoProgress} onChange={e => setRules({ autoProgress: e.target.checked })} /> Auto-avance
                  </label>
                  <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }} title="Al guardar, las vencidas van a la primera columna">
                    <input type="checkbox" checked={boardRules(board).overdueToFront} onChange={e => setRules({ overdueToFront: e.target.checked })} /> Vencidas al frente
                  </label>
                  <Button size="sm" onClick={addColumn}><Plus size={12} /> Columna</Button>
                  <Button size="sm" onClick={async () => { if (confirm(`¿Borrar tablero "${board.name}" y sus tarjetas?`)) { await db.deleteProjectBoard(board.id); setBoardId(""); await loadBoards(); } }}><Trash2 size={12} /></Button>
                </>
              )}
            </div>
            {board && (
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
                {board.columns.map((col, colIdx) => {
                  const colCards = visible.filter(c => c.columnId === col.id).sort((a, b) => a.position - b.position);
                  const wipBad = wipExceeded(col, cards.filter(c => c.columnId === col.id).length);
                  return (
                    <div key={col.id}
                      onDragOver={e => { if (drag) { e.preventDefault(); setOverCol(col.id); } }}
                      onDragLeave={() => setOverCol(o => o === col.id ? null : o)}
                      onDrop={() => { if (drag?.kind === "card") void onDropCardOnColumn(col.id); else if (drag?.kind === "col") void onDropColOnCol(col.id); }}
                      style={{ minWidth: 260, maxWidth: 300, flex: "0 0 auto", background: "var(--surface-2)", border: overCol === col.id ? "2px dashed var(--primary)" : "1px solid var(--border)", borderRadius: 12, padding: 10 }}>
                      <div className="flex justify-between items-center"
                        draggable
                        onDragStart={e => { e.dataTransfer.effectAllowed = "move"; setDrag({ kind: "col", id: col.id }); }}
                        onDragEnd={() => { setDrag(null); setOverCol(null); }}
                        style={{ cursor: "grab" }} title="Arrastra para reordenar columnas">
                        <b style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
                          <GripVertical size={12} style={{ color: "var(--text-faint)" }} />
                          {col.title} <span className="muted">({colCards.length}{col.wip ? `/${col.wip}` : ""})</span>
                          {wipBad && <span className="badge badge-warn" style={{ fontSize: 9 }}>WIP</span>}
                        </b>
                        <div style={{ display: "flex", gap: 2 }}>
                          <Button size="sm" onClick={() => moveColumn(col.id, -1)} disabled={colIdx === 0} title="Mover izquierda"><ChevronLeft size={11} /></Button>
                          <Button size="sm" onClick={() => moveColumn(col.id, 1)} disabled={colIdx === board.columns.length - 1} title="Mover derecha"><ChevronRight size={11} /></Button>
                          <Button size="sm" onClick={() => setWip(col.id, col.wip)} title="Límite WIP">WIP</Button>
                          <Button size="sm" onClick={() => renameColumn(col.id, col.title)} title="Renombrar"><Edit3 size={11} /></Button>
                          <Button size="sm" onClick={() => deleteColumn(col.id)} title="Borrar"><Trash2 size={11} /></Button>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                        {colCards.map(card => (
                          <div key={card.id} onClick={() => setOpenCard(card)}
                            draggable
                            onDragStart={e => { e.dataTransfer.effectAllowed = "move"; setDrag({ kind: "card", id: card.id }); }}
                            onDragEnd={() => { setDrag(null); setOverCol(null); }}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.stopPropagation(); void onDropCardOnCard(card); }}
                            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", cursor: "grab", opacity: drag?.kind === "card" && drag.id === card.id ? 0.5 : 1 }}
                            title={search.trim() ? "Quita la búsqueda para arrastrar" : "Arrastra o edita para mover"}>
                            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{card.title}</div>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4, alignItems: "center" }}>
                              {(card.assignees || []).slice(0, 3).map(a => (
                                <span key={a} title={a} style={{ width: 20, height: 20, borderRadius: 999, background: "var(--primary)", color: "var(--surface)", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center" }}>
                                  {a.trim()[0]?.toUpperCase() || "?"}
                                </span>
                              ))}
                              {card.labels.slice(0, 3).map(l => <span key={l} className="badge" style={{ fontSize: 10 }}>{l}</span>)}
                              {card.dueDate && <span className="badge" style={{ fontSize: 10, ...(isOverdue(card, today) ? { background: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" } : isDueSoon(card, today) ? { background: "#fffbeb", color: "#92400e", borderColor: "#fde68a" } : {}) }}>{card.dueDate}</span>}
                              {card.checklist.length > 0 && <span className="muted small">{card.checklist.filter(i => i.done).length}/{card.checklist.length} ✓</span>}
                              {card.progress > 0 && <span className="muted small">{card.progress}%</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <Input value={quickAdd[col.id] || ""} onChange={e => setQuickAdd({ ...quickAdd, [col.id]: e.target.value })}
                          onKeyDown={e => { if (e.key === "Enter") void quickCreate(col.id); }}
                          placeholder="+ tarjeta (Enter)" style={{ fontSize: 12 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      {openCard && board && (
        <div className="modal-overlay" onClick={() => setOpenCard(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <CardEditor card={openCard} board={board}
              onClose={() => setOpenCard(null)}
              onSave={saveCard}
              onMove={moveCard}
              onMoveTo={moveCardTo}
              onDelete={async () => { if (confirm("¿Borrar tarjeta?")) { await db.deleteProjectCard(openCard.id); setOpenCard(null); await loadCards(board.id); } }} />
          </div>
        </div>
      )}
    </div>
  );
}

function CardEditor({ card, board, onClose, onSave, onMove, onMoveTo, onDelete }: {
  card: ProjectCard; board: ProjectBoard;
  onClose: () => void; onSave: (c: ProjectCard) => void;
  onMove: (c: ProjectCard, dir: -1 | 1) => void; onMoveTo: (c: ProjectCard, colId: string) => void; onDelete: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [desc, setDesc] = useState(card.desc || "");
  const [labels, setLabels] = useState(card.labels.join(", "));
  const [assignees, setAssignees] = useState<string[]>(card.assignees || []);
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [freeAgent, setFreeAgent] = useState("");
  const { user: me } = useAuth();
  useEffect(() => {
    if (me) db.listContacts(me.id).then(cs => setContacts(cs.map(c => ({ id: c.id, name: c.name })))).catch(() => {});
  }, [me?.id]);
  const [startDate, setStartDate] = useState(card.startDate || "");
  const [dueDate, setDueDate] = useState(card.dueDate || "");
  const [progress, setProgress] = useState(card.progress || 0);
  const [checklist, setChecklist] = useState(card.checklist || []);
  const [newItem, setNewItem] = useState("");

  const colIdx = board.columns.findIndex(c => c.id === card.columnId);

  const save = () => {
    if (!title.trim()) return alert("Título requerido");
    onSave({
      ...card, title: title.trim(), desc: desc.trim() || undefined,
      labels: labels.split(",").map(s => s.trim()).filter(Boolean),
      assignees,
      startDate: startDate || undefined, dueDate: dueDate || undefined,
      progress: Math.min(100, Math.max(0, Number(progress) || 0)),
      checklist,
    });
  };

  return (
    <div>
      <div className="modal-header">
        <b>Tarjeta • {board.columns[colIdx]?.title}</b>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Button size="sm" disabled={colIdx <= 0} onClick={() => onMove({ ...card, title, desc, labels: card.labels, assignees, progress, checklist }, -1)}><ChevronLeft size={12} /></Button>
          <Button size="sm" disabled={colIdx >= board.columns.length - 1} onClick={() => onMove({ ...card, title, desc, labels: card.labels, assignees, progress, checklist }, 1)}><ChevronRight size={12} /></Button>
          <select className="select" value={card.columnId} onChange={e => onMoveTo({ ...card, title, desc, labels: card.labels, assignees, progress, checklist }, e.target.value)} style={{ width: 130, fontSize: 12 }} title="Mover a…">
            {board.columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <Button size="sm" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
      <div><Label>Título *</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
      <div style={{ marginTop: 8 }}><Label>Descripción</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} /></div>
      <div style={{ marginTop: 8 }}><Label>Etiquetas (coma)</Label><Input value={labels} onChange={e => setLabels(e.target.value)} placeholder="urgente, UTP…" /></div>
      <div style={{ marginTop: 8 }}>
        <Label>Asignados</Label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          {assignees.length === 0 ? <span className="muted small">Sin asignar</span> : assignees.map(a => (
            <span key={a} className="chip">{a}
              <button onClick={() => setAssignees(assignees.filter(x => x !== a))} style={{ marginLeft: 4, border: "none", background: "transparent", cursor: "pointer" }}>✕</button>
            </span>
          ))}
        </div>
        {contacts.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            {contacts.filter(c => !assignees.includes(c.name)).slice(0, 8).map(c => (
              <Button key={c.id} size="sm" onClick={() => setAssignees([...assignees, c.name])}>+ {c.name}</Button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          <Input value={freeAgent} onChange={e => setFreeAgent(e.target.value)} placeholder="Otra persona… (Enter)"
            onKeyDown={e => { if (e.key === "Enter" && freeAgent.trim() && !assignees.includes(freeAgent.trim())) { setAssignees([...assignees, freeAgent.trim()]); setFreeAgent(""); } }} />
        </div>
      </div>
      <div className="grid grid-3" style={{ marginTop: 8 }}>
        <div><Label>Inicio (Gantt)</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        <div><Label>Fin (Gantt)</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
        <div><Label>Avance {progress}%</Label><input type="range" min={0} max={100} step={5} value={progress} onChange={e => setProgress(Number(e.target.value))} style={{ width: "100%" }} /></div>
      </div>
      <div style={{ marginTop: 10 }}>
        <b style={{ fontSize: 12 }}>Checklist {checklist.length > 0 && `(${checklist.filter(i => i.done).length}/${checklist.length})`}</b>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
          {checklist.map(it => (
            <div key={it.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
              <input type="checkbox" checked={it.done} onChange={e => setChecklist(checklist.map(x => x.id === it.id ? { ...x, done: e.target.checked } : x))} />
              <span style={{ flex: 1, textDecoration: it.done ? "line-through" : "none" }}>{it.text}</span>
              <button onClick={() => setChecklist(checklist.filter(x => x.id !== it.id))} style={{ border: "none", background: "transparent", cursor: "pointer" }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <Input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="+ ítem (Enter)"
            onKeyDown={e => { if (e.key === "Enter" && newItem.trim()) { setChecklist([...checklist, { id: crypto.randomUUID(), text: newItem.trim(), done: false }]); setNewItem(""); } }} />
        </div>
        {board.autoDone && <p className="muted small" style={{ marginTop: 4 }}>Auto-done activo: al completar el checklist pasa a “{board.columns[board.columns.length - 1]?.title}”.</p>}
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <Button variant="primary" className="w-full" onClick={save}>Guardar</Button>
        <Button onClick={onDelete}><Trash2 size={12} /></Button>
      </div>
    </div>
  );
}
