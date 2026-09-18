import { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Input, Label, Textarea, Badge } from "../components/ui/primitives";
import { db } from "../lib/db";
import { useAuth } from "../stores/useAuth";
import { useData } from "../stores/useData";
import { SPARKY_SYSTEM, buildContext, chat, diagnoseNetwork, testConnection, type ChatMsg, type DiagStep } from "../lib/ai";
import { Bot, Send, Trash2, PlugZap } from "lucide-react";

// Sparky — chatbot 100% local con RAG interno.
// Solo Ollama (localhost). Sin nube, sin API keys: tus datos no salen de tu PC.
const QUICK = ["¿Qué tengo esta semana?", "¿Voy a aprobar?", "¿Cómo va mi dinero?", "¿Algún choque de horarios?"];

interface SavedCfg { model: string; endpoint: string; }

const DEFAULT_CFG: SavedCfg = { model: "qwen2.5:3b", endpoint: "http://localhost:11434" };

export default function SparkyPage() {
  const { user } = useAuth();
  const { courses, deliverables } = useData();
  const [cfg, setCfg] = useState<SavedCfg>(DEFAULT_CFG);
  const [conn, setConn] = useState<string>("");
  const [testing, setTesting] = useState(false);
  const [diag, setDiag] = useState<DiagStep[] | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    db.getSetting("ai_cfg").then(raw => {
      if (!raw) return;
      try {
        const old = JSON.parse(raw);
        // Migra configuraciones antiguas (proveedor nube + keys) a local y
        // borra cualquier clave que hubiera quedado guardada en este equipo.
        const next: SavedCfg = {
          model: typeof old.model === "string" && old.model.trim() ? old.model : DEFAULT_CFG.model,
          endpoint: typeof old.endpoint === "string" && old.endpoint.trim() ? old.endpoint : DEFAULT_CFG.endpoint,
        };
        setCfg(next);
        if (old.keys !== undefined || old.provider !== undefined || old.apiKey !== undefined) {
          db.setSetting("ai_cfg", JSON.stringify(next)).catch(() => {});
        }
      } catch {}
    }).catch(() => {});
  }, []);

  const persist = async (next: SavedCfg) => {
    setCfg(next);
    try { await db.setSetting("ai_cfg", JSON.stringify(next)); } catch {}
  };

  const doTest = async () => {
    setTesting(true); setConn("Probando…");
    const r = await testConnection({ provider: "ollama", model: cfg.model, endpoint: cfg.endpoint });
    setTesting(false);
    setConn(r.ok ? "✅ Conectado" : `❌ ${r.error}`);
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy || !user) return;
    setErr("");
    const history = [...msgs.slice(-8), { role: "user" as const, content: q }];
    setMsgs(history);
    setDraft("");
    setBusy(true);
    try {
      const [rems, jobs, txs, debts, notes, sessions] = await Promise.all([
        db.listReminders(user.id).catch(() => []),
        db.listJobOffers(user.id).catch(() => []),
        db.listTransactions(user.id).catch(() => []),
        db.listDebts(user.id).catch(() => []),
        db.listNotes(user.id).catch(() => []),
        db.listStudySessions(user.id).catch(() => []),
      ]);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const weekISO = weekAgo.toISOString().slice(0, 10);
      const focusMinWeek = sessions.filter(s => s.completed && s.startedAt.slice(0, 10) >= weekISO).reduce((s, x) => s + x.actualMinutes, 0);
      const ctx = buildContext({
        today: new Date().toISOString().slice(0, 10),
        courses, deliverables, reminders: rems, jobs, txs, debts,
        notesMeta: notes.slice(0, 20).map(n => ({ title: n.title, tags: n.tags || [] })),
        focusMinWeek,
      }, q);
      const answer = await chat(
        { provider: "ollama", model: cfg.model, endpoint: cfg.endpoint },
        [{ role: "system", content: `${SPARKY_SYSTEM}\n\nDATOS DEL USUARIO:\n${ctx}` }, ...history]
      );
      setMsgs(h => [...h, { role: "assistant", content: answer }]);
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <Topbar title="Sparky" subtitle="Chat con acceso a tus datos • 100% local con Ollama" actions={
        <Button size="sm" onClick={() => { setMsgs([]); setErr(""); }}>Limpiar chat</Button>
      } />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, maxWidth: 980 }}>
        <Card>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
            <Bot size={14} style={{ color: "var(--text-muted)" }} />
            <b style={{ fontSize: 12 }}>Modelo local (Ollama)</b>
            {conn && <Badge variant={conn.startsWith("✅") ? "success" : "danger"}>{conn}</Badge>}
          </div>
          <div className="grid grid-2">
            <div><Label>Modelo</Label><Input value={cfg.model} onChange={e => void persist({ ...cfg, model: e.target.value })} placeholder="qwen2.5:3b" /></div>
            <div><Label>Endpoint Ollama</Label><Input value={cfg.endpoint} onChange={e => void persist({ ...cfg, endpoint: e.target.value })} placeholder="http://localhost:11434" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <Button size="sm" variant="primary" onClick={doTest} disabled={testing}><PlugZap size={12} /> {testing ? "Probando…" : "Probar conexión"}</Button>
            <Button size="sm" onClick={async () => { setDiagnosing(true); setDiag(null); setDiag(await diagnoseNetwork({ provider: "ollama", model: cfg.model, endpoint: cfg.endpoint })); setDiagnosing(false); }} disabled={diagnosing}>{diagnosing ? "Diagnosticando…" : "Diagnosticar"}</Button>
            <span className="muted small">100% local: requiere <code>ollama serve</code> y un modelo descargado (<code>ollama pull qwen2.5:3b</code>). Sin cuentas, sin claves, tus datos no salen de tu PC.</span>
          </div>
          {diag && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
              {diag.map((s, i) => (
                <div key={i} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, background: s.ok ? "#ecfdf5" : "#fef2f2", border: "1px solid", borderColor: s.ok ? "#a7f3d0" : "#fecaca" }}>
                  <b>{s.ok ? "✓" : "✗"} {s.name}:</b> {s.detail}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 200 }}>
            {msgs.length === 0 && <p className="muted small">Pregunta por tus clases, pendientes, notas, dinero o trabajo. Sparky solo responde con tus datos.</p>}
            {msgs.filter(m => m.role !== "system").map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%", padding: "8px 12px", borderRadius: 12, fontSize: 13, whiteSpace: "pre-wrap",
                background: m.role === "user" ? "var(--primary)" : "var(--surface-2)",
                color: m.role === "user" ? "var(--surface)" : "var(--text)",
              }}>{m.content}</div>
            ))}
            {busy && <span className="muted small">Sparky pensando…</span>}
            {err && <div style={{ padding: "8px 10px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 8, fontSize: 12 }}>⚠️ {err}</div>}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {QUICK.map(q => <Button key={q} size="sm" onClick={() => void send(q)} disabled={busy}>{q}</Button>)}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2} placeholder="Pregunta algo… (Enter para enviar)"
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(draft); } }} style={{ flex: 1 }} />
            <Button variant="primary" onClick={() => void send(draft)} disabled={busy || !draft.trim()}><Send size={14} /></Button>
          </div>
          <div style={{ marginTop: 8 }}>
            <Button size="sm" onClick={() => setMsgs([])}><Trash2 size={12} /> Borrar historial</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
