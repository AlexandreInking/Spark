import { useEffect, useMemo, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Input, Label, Textarea, Select, Badge } from "../components/ui/primitives";
import { db } from "../lib/db";
import { useAuth } from "../stores/useAuth";
import { useData } from "../stores/useData";
import { smReview, todayISO, type SmQuality } from "../lib/study";
import type { Deck, Flashcard } from "../types";
import { Trash2, Plus, Edit3, Play, Eye } from "lucide-react";

// Flashcards con repetición espaciada SM-2 (v1.6.0), 100% local.
export default function FlashcardsPage() {
  const { user } = useAuth();
  const { courses } = useData();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckId, setDeckId] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [newDeck, setNewDeck] = useState("");
  const [newDeckCourse, setNewDeckCourse] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [editing, setEditing] = useState<Flashcard | null>(null);
  // estudio
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);

  const loadDecks = async () => {
    if (!user) return;
    const ds = await db.listDecks(user.id).catch(() => [] as Deck[]);
    setDecks(ds);
    if (!deckId && ds.length) setDeckId(ds[0].id);
    if (deckId && !ds.some(d => d.id === deckId)) setDeckId(ds[0]?.id || "");
  };
  const loadCards = async (did: string) => {
    if (!did) { setCards([]); return; }
    setCards(await db.listFlashcards(did).catch(() => []));
  };
  useEffect(() => { loadDecks(); }, [user?.id]);
  useEffect(() => { loadCards(deckId); setQueue([]); setRevealed(false); }, [deckId]);

  const today = todayISO();
  const due = useMemo(() => cards.filter(c => c.nextReview <= today), [cards, today]);
  const deck = decks.find(d => d.id === deckId) || null;
  const studying = queue.length > 0 ? queue[0] : null;

  const createDeck = async () => {
    if (!user || !newDeck.trim()) return alert("Nombre del mazo");
    const d: Deck = { id: crypto.randomUUID(), userId: user.id, courseId: newDeckCourse || undefined, name: newDeck.trim(), createdAt: new Date().toISOString() };
    await db.saveDeck(d);
    setNewDeck(""); setNewDeckCourse("");
    setDeckId(d.id);
    await loadDecks(); await loadCards(d.id);
  };

  const addCard = async () => {
    if (!deckId || !front.trim() || !back.trim()) return alert("Anverso y reverso requeridos");
    await db.saveFlashcard({
      id: editing?.id || crypto.randomUUID(), deckId,
      front: front.trim(), back: back.trim(),
      ease: editing?.ease ?? 2.5, reps: editing?.reps ?? 0, interval: editing?.interval ?? 0,
      nextReview: editing?.nextReview || today,
      createdAt: editing?.createdAt || new Date().toISOString(),
    });
    setFront(""); setBack(""); setEditing(null);
    await loadCards(deckId);
  };

  const startStudy = (onlyDue: boolean) => {
    const list = (onlyDue ? due : cards).slice().sort((a, b) => a.nextReview.localeCompare(b.nextReview));
    if (!list.length) return;
    setQueue(list);
    setRevealed(false);
    setDone(0);
  };

  const grade = async (q: SmQuality) => {
    if (!studying) return;
    const r = smReview(studying.ease, studying.reps, studying.interval, q, today);
    await db.saveFlashcard({ ...studying, ease: r.ease, reps: r.reps, interval: r.interval, nextReview: r.nextReview });
    setDone(d => d + 1);
    setRevealed(false);
    setQueue(qs => qs.slice(1));
    await loadCards(deckId);
  };

  const courseName = (id?: string) => courses.find(c => c.id === id)?.code || "";

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <Topbar title="Flashcards" subtitle="Repetición espaciada SM-2 • repasa lo vencido cada día" actions={
        <Button variant="primary" onClick={() => startStudy(true)} disabled={due.length === 0}><Play size={14} /> Repasar ({due.length})</Button>
      } />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <Card>
          <b style={{ fontSize: 12 }}>Mazos</b>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
            {decks.map(d => {
              const n = d.id === deckId ? cards.length : null;
              return (
                <Button key={d.id} size="sm" variant={d.id === deckId ? "primary" : "ghost"}
                  onClick={() => setDeckId(d.id)}>{d.name}{n !== null ? ` (${n})` : ""}</Button>
              );
            })}
            {decks.length === 0 && <span className="muted small">Sin mazos.</span>}
          </div>
          <div className="grid grid-3" style={{ marginTop: 8 }}>
            <div style={{ gridColumn: "span 2" }}><Input value={newDeck} onChange={e => setNewDeck(e.target.value)} placeholder="Nuevo mazo: Anatomía, verbos…" /></div>
            <div><Select value={newDeckCourse} onChange={e => setNewDeckCourse(e.target.value)}>
              <option value="">Sin curso</option>
              {courses.filter(c => c.status === "activo").map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
            </Select></div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Button size="sm" variant="primary" onClick={createDeck}><Plus size={12} /> Crear mazo</Button>
            {deck && <Button size="sm" onClick={async () => { if (confirm(`¿Borrar mazo "${deck.name}" y sus tarjetas?`)) { await db.deleteDeck(deck.id); setDeckId(""); await loadDecks(); } }}><Trash2 size={12} /></Button>}
            {deck && cards.length > 0 && due.length === 0 && <Button size="sm" onClick={() => startStudy(false)}>Practicar todo ({cards.length})</Button>}
          </div>
        </Card>

        {studying ? (
          <Card>
            <div className="flex justify-between items-center">
              <b style={{ fontSize: 12 }}>{deck?.name} • {done + 1}/{done + queue.length} • vence {studying.nextReview}</b>
              <Button size="sm" onClick={() => setQueue([])}>Salir</Button>
            </div>
            <div style={{ marginTop: 10, padding: 18, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, minHeight: 120 }}>
              <div className="muted small">Anverso</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, whiteSpace: "pre-wrap" }}>{studying.front}</div>
              {revealed && (
                <>
                  <div className="muted small" style={{ marginTop: 12 }}>Reverso</div>
                  <div style={{ fontSize: 14, marginTop: 4, whiteSpace: "pre-wrap" }}>{studying.back}</div>
                </>
              )}
            </div>
            {!revealed ? (
              <Button variant="primary" className="w-full" style={{ marginTop: 10 }} onClick={() => setRevealed(true)}><Eye size={14} /> Ver respuesta</Button>
            ) : (
              <div className="grid grid-3" style={{ marginTop: 10 }}>
                <Button onClick={() => void grade(0)}>Otra vez</Button>
                <Button onClick={() => void grade(3)}>Difícil</Button>
                <Button onClick={() => void grade(4)}>Bien</Button>
              </div>
            )}
            {revealed && <Button className="w-full" style={{ marginTop: 8 }} onClick={() => void grade(5)}>Fácil</Button>}
          </Card>
        ) : (
          done > 0 && <Card><p className="muted">Sesión completa: {done} tarjeta(s). ¡Vuelve mañana por más!</p></Card>
        )}

        {deck && (
          <Card>
            <b style={{ fontSize: 12 }}>Tarjetas de {deck.name} ({cards.length}) {courseName(deck.courseId) && <Badge>{courseName(deck.courseId)}</Badge>}</b>
            <div className="grid grid-3" style={{ marginTop: 8 }}>
              <div style={{ gridColumn: "span 2" }}><Label>Anverso *</Label><Textarea value={front} onChange={e => setFront(e.target.value)} rows={2} placeholder="Pregunta o término…" /></div>
              <div><Label>Reverso *</Label><Textarea value={back} onChange={e => setBack(e.target.value)} rows={2} placeholder="Respuesta…" /></div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <Button size="sm" variant="primary" onClick={addCard}>{editing ? "Guardar cambios" : <><Plus size={12} /> Añadir</>}</Button>
              {editing && <Button size="sm" onClick={() => { setEditing(null); setFront(""); setBack(""); }}>Cancelar</Button>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              {cards.map(c => (
                <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}>
                  <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><b>{c.front}</b> <span className="muted">→ {c.back.slice(0, 40)}</span></span>
                  {c.nextReview <= today
                    ? <span className="badge badge-warn" style={{ fontSize: 10 }}>vence {c.nextReview}</span>
                    : <span className="badge" style={{ fontSize: 10 }}>{c.nextReview}</span>}
                  <Button size="sm" onClick={() => { setEditing(c); setFront(c.front); setBack(c.back); }}><Edit3 size={12} /></Button>
                  <Button size="sm" onClick={async () => { if (confirm("¿Borrar tarjeta?")) { await db.deleteFlashcard(c.id); if (editing?.id === c.id) { setEditing(null); setFront(""); setBack(""); } await loadCards(deckId); } }}><Trash2 size={12} /></Button>
                </div>
              ))}
              {cards.length === 0 && <span className="muted small">Sin tarjetas. Añade la primera arriba.</span>}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
