// Sparky — chatbot 100% local con RAG interno.
// Solo Ollama local (http://localhost:11434). Sin nube, sin API keys:
// tus datos nunca salen de tu PC. Sin dependencias: fetch directo.
// Las configuraciones antiguas con proveedores de nube se migran a Ollama
// y cualquier clave guardada se elimina (ver Sparky.tsx).

import type { Course, Debt, Deliverable, GeneralReminder, JobOffer, MoneyTransaction } from "../types";

export type AiProvider = "ollama";

export interface AiConfig {
  provider: AiProvider;
  model: string;
  endpoint?: string; // override (Ollama local por defecto)
}

export interface ChatMsg { role: "user" | "assistant" | "system"; content: string; }

export const PROVIDERS: { id: AiProvider; label: string; modelHint: string; note: string }[] = [
  { id: "ollama", label: "Ollama (local)", modelHint: "qwen2.5:3b", note: "Requiere ollama serve. 100% local, cero costo, sin claves." },
];

const OLLAMA_EP = "http://localhost:11434";

function cleanEp(ep?: string, fb = ""): string {
  const e = (ep || "").trim().replace(/\/+$/, "");
  return e || fb;
}

// ---------- constructores puros (testeables, sin red) ----------

export interface BuiltRequest { url: string; init: RequestInit; kind: "ollama"; }

export function buildRequest(cfg: AiConfig, messages: ChatMsg[]): BuiltRequest {
  const model = cfg.model.trim();
  if (!model) throw new Error("Elige un modelo");
  const sys = messages.filter(m => m.role === "system");
  const convo = messages.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content }));
  const sysText = sys.map(m => m.content).join("\n");

  const base = cleanEp(cfg.endpoint, OLLAMA_EP);
  return {
    kind: "ollama",
    url: `${base}/api/chat`,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: sysText ? [{ role: "system", content: sysText }, ...convo] : convo, stream: false }),
    },
  };
}

export function parseResponse(kind: BuiltRequest["kind"], json: any): string {
  try {
    void kind;
    const t = json?.message?.content || "";
    if (t.trim()) return t.trim();
  } catch (e: any) {
    if (e?.message && !e.message.startsWith("Respuesta vacía")) throw e;
  }
  throw new Error("Respuesta vacía del modelo");
}

async function fetchTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Transporte híbrido (v1.7.2): primero Rust (plugin-http, inmune a rarezas del
 * WebView: preflights rotos, escaneo HTTPS del antivirus, etc.), si falla cae
 * al fetch del WebView. En web/dev sin Tauri va directo al fetch.
 */
async function smartFetch(url: string, init: RequestInit, ms: number): Promise<Response> {
  const race = <T>(p: Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      const id = setTimeout(() => reject(new DOMException("timeout", "AbortError")), ms);
      p.then(v => { clearTimeout(id); resolve(v); }, e => { clearTimeout(id); reject(e); });
    });
  let rustErr: any = null;
  try {
    const mod: any = await import("@tauri-apps/plugin-http");
    if (typeof mod?.fetch === "function") {
      try {
        return await race(mod.fetch(url, init));
      } catch (e) {
        rustErr = e; /* cae al WebView */
      }
    }
  } catch (e) {
    rustErr = rustErr ?? e; /* sin Tauri: sigue */
  }
  try {
    return await fetchTimeout(url, init, ms);
  } catch (webErr) {
    if (rustErr) {
      const r = String((rustErr as any)?.message ?? rustErr).slice(0, 200);
      const w = String((webErr as any)?.message ?? webErr).slice(0, 200);
      const err = new Error(`fetch falló (rust: ${r} | web: ${w})`);
      (err as any).cause = (webErr as any) ?? rustErr;
      throw err;
    }
    throw webErr;
  }
}

function netError(e: any): Error {
  if (e?.name === "AbortError") return new Error("Se agotó el tiempo esperando a Ollama. ¿Modelo descargado (ollama pull)? Intenta de nuevo.");
  const cause = String(e?.message ?? "").slice(0, 150);
  const suffix = cause ? ` Detalle: ${cause}` : "";
  return new Error(`Ollama no responde. ¿ollama serve en marcha?${suffix}`);
}

/** Chat con fallback Ollama legacy (/api/generate) si /api/chat no existe. */
export async function chat(cfg: AiConfig, messages: ChatMsg[]): Promise<string> {
  const built = buildRequest(cfg, messages);
  let res: Response;
  try {
    res = await smartFetch(built.url, built.init, 45000);
  } catch (e: any) {
    throw netError(e);
  }
  if (!res.ok && cfg.provider === "ollama" && res.status === 404) {
    // Ollama viejo: endpoint generate con prompt plano
    const convo = messages.map(m => `${m.role}: ${m.content}`).join("\n");
    const r2 = await smartFetch(`${cleanEp(cfg.endpoint, OLLAMA_EP)}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: cfg.model.trim(), prompt: convo + "\nassistant:", stream: false }),
    }, 45000);
    if (!r2.ok) throw new Error(`Ollama ${r2.status}`);
    const j = await r2.json();
    if ((j?.response || "").trim()) return j.response.trim();
    throw new Error("Respuesta vacía del modelo");
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { detail += ": " + JSON.stringify(await res.json()).slice(0, 200); } catch {}
    throw new Error(detail);
  }
  return parseResponse(built.kind, await res.json());
}

export async function testConnection(cfg: AiConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await smartFetch(`${cleanEp(cfg.endpoint, OLLAMA_EP)}/api/tags`, {}, 10000);
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "fallo" };
  }
}

export interface DiagStep { name: string; ok: boolean; detail: string; }

/**
 * Diagnóstico local: 1) servidor Ollama, 2) petición real mínima.
 * Todo es localhost: no requiere internet ni claves.
 */
export async function diagnoseNetwork(cfg: AiConfig): Promise<DiagStep[]> {
  const steps: DiagStep[] = [];
  // 1) servidor Ollama
  try {
    const r = await smartFetch(`${cleanEp(cfg.endpoint, OLLAMA_EP)}/api/tags`, {}, 8000);
    steps.push(r.ok
      ? { name: "Servidor Ollama", ok: true, detail: "Ollama responde en este equipo." }
      : { name: "Servidor Ollama", ok: false, detail: `Ollama devolvió HTTP ${r.status}. ¿Modelo descargado (ollama pull)?` });
    if (!r.ok) return steps;
  } catch {
    steps.push({ name: "Servidor Ollama", ok: false, detail: "No responde: ¿ollama serve en marcha? Revisa endpoint y firewall local." });
    return steps;
  }
  // 3) petición real mínima
  try {
    await chat(cfg, [{ role: "user", content: "Responde solo: ok" }]);
    steps.push({ name: "Chat completo", ok: true, detail: "El modelo respondió. Todo funciona." });
  } catch (e: any) {
    steps.push({ name: "Chat completo", ok: false, detail: e?.message || "fallo" });
  }
  return steps;
}

// ---------- RAG interno (puro, sin red) ----------

export interface RagInput {
  today: string;
  courses: Course[];
  deliverables: Deliverable[];
  reminders: GeneralReminder[];
  jobs: JobOffer[];
  txs: MoneyTransaction[];
  debts: Debt[];
  notesMeta: { title: string; tags: string[] }[];
  focusMinWeek?: number;
}

const MAX = 6000;

function hasQ(q: string, ...words: string[]): boolean {
  const t = ` ${q.toLowerCase()} `;
  return words.some(w => t.includes(w));
}

export type RagIntent = "horario" | "entregas" | "notas" | "dinero" | "trabajo" | "enfoque" | "general";

export function detectIntent(q: string): RagIntent {
  if (hasQ(q, "horario", "clase", "aula", "profesor", "cuando tengo", "qué tengo hoy", "que tengo hoy")) return "horario";
  if (hasQ(q, "entrega", "tarea", "examen", "pendiente", "vence", "vencimiento", "practica", "práctica")) return "entregas";
  if (hasQ(q, "nota", "promedio", "aprobar", "apruebo", "falta", "peso", "parcial", "jal")) return "notas";
  if (hasQ(q, "dinero", "balance", "gasto", "cobro", "deuda", "sueldo", "plata", "pago", "cuánto debo", "cuanto debo")) return "dinero";
  if (hasQ(q, "trabajo", "empleo", "entrevista", "postul", "gig", "chamba", "jefe")) return "trabajo";
  if (hasQ(q, "estudi", "enfoque", "racha", "pomodoro", "concentr")) return "enfoque";
  return "general";
}

function take<T>(arr: T[], n: number): { items: T[]; more: number } {
  return { items: arr.slice(0, n), more: Math.max(0, arr.length - n) };
}

export function buildContext(inp: RagInput, q: string): string {
  const intent = detectIntent(q);
  const L: string[] = [`Hoy es ${inp.today}.`];
  const active = inp.courses.filter(c => c.status === "activo");

  const addCourses = () => {
    const { items, more } = take(active, 10);
    L.push(`CURSOS (${active.length}):` + (items.length ? "" : " ninguno"));
    for (const c of items) {
      const sch = (c.schedule || []).map(s => `${["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][s.dayOfWeek]} ${s.startTime}-${s.endTime}`).join(", ");
      L.push(`- ${c.code} ${c.name} | prof: ${c.professor || "?"} | ${c.semester || ""}${sch ? ` | ${sch}` : ""}`);
    }
    if (more) L.push(`…(+${more} más)`);
  };
  const addDeliverables = () => {
    const codeOf = (id: string) => inp.courses.find(c => c.id === id)?.code || "";
    const pend = inp.deliverables
      .filter(d => d.status === "pendiente" || d.status === "en_progreso")
      .sort((a, b) => (a.dueDate + a.dueTime).localeCompare(b.dueDate + b.dueTime));
    const { items, more } = take(pend, 10);
    L.push(`PENDIENTES (${pend.length}):` + (items.length ? "" : " ninguno, al día"));
    for (const d of items) L.push(`- ${d.title} [${d.type}] ${codeOf(d.courseId)} vence ${d.dueDate} ${d.dueTime}`);
    if (more) L.push(`…(+${more} más)`);
  };
  const addGrades = () => {
    const withW = active.filter(c => (c.weighting || []).length);
    L.push(`NOTAS (${withW.length} cursos con pesos):`);
    for (const c of withW.slice(0, 8)) {
      const ws = (c.weighting || []).map(w => `${w.item} ${w.weight}%${w.obtainedScore !== undefined ? `=${w.obtainedScore}/${w.maxScore}` : "=?"}`).join("; ");
      L.push(`- ${c.code}: mín ${c.minPassingGrade ?? 10.5} | ${ws}`);
    }
  };
  const addMoney = () => {
    const ym = inp.today.slice(0, 7);
    let ing = 0, gas = 0;
    for (const t of inp.txs) {
      if (t.date.slice(0, 7) !== ym) continue;
      if (t.kind === "ingreso") ing += t.amount; else gas += t.amount;
    }
    L.push(`DINERO ${ym}: ingresos S/ ${ing}, gastos S/ ${gas}, balance S/ ${ing - gas}.`);
    const unpaid = inp.reminders.filter(r => !r.paid);
    if (unpaid.length) L.push(`Por pagar: ${unpaid.slice(0, 5).map(r => `${r.title} ${r.dueDate}${r.amount ? ` S/${r.amount}` : ""}`).join("; ")}`);
    if (inp.debts.length) L.push(`Deudas: ${inp.debts.slice(0, 5).map(d => `${d.creditor} S/${d.total}`).join("; ")}`);
  };
  const addJobs = () => {
    if (!inp.jobs.length) { L.push("TRABAJOS: ninguno registrado."); return; }
    L.push(`TRABAJOS (${inp.jobs.length}):`);
    for (const o of inp.jobs.slice(0, 8)) {
      L.push(`- ${o.company} — ${o.position} [${o.type}/${o.status}]${o.hiredStart ? ` desde ${o.hiredStart}` : ""}${o.salaryMin ? ` S/${o.salaryMin}-${o.salaryMax ?? ""}/${o.salaryPeriod}` : ""}`);
    }
  };
  const addFocus = () => {
    if (inp.focusMinWeek !== undefined) L.push(`ENFOQUE: ${inp.focusMinWeek} min esta semana.`);
  };

  if (intent === "general") {
    L.push(`Resumen: ${active.length} cursos activos, ${inp.deliverables.filter(d => d.status === "pendiente").length} pendientes, ${inp.jobs.length} trabajos/propuestas.`);
    addDeliverables();
    addJobs();
  } else if (intent === "horario") addCourses();
  else if (intent === "entregas") { addCourses(); addDeliverables(); }
  else if (intent === "notas") addGrades();
  else if (intent === "dinero") addMoney();
  else if (intent === "trabajo") addJobs();
  else if (intent === "enfoque") addFocus();

  if (inp.notesMeta.length && (intent === "general" || intent === "entregas")) {
    L.push(`NOTAS: ${inp.notesMeta.slice(0, 8).map(n => n.title).join(" | ")}`);
  }

  let text = L.join("\n");
  if (text.length > MAX) text = text.slice(0, MAX) + "\n…(recortado)";
  return text;
}

export const SPARKY_SYSTEM = `Eres Sparky, asistente de la app Spark. Respondes en español, corto y directo (máx 120 palabras salvo que pidan detalle).
Usas SOLO los datos que te pasan como contexto; si algo no está ahí, dilo y sugiere dónde registrarlo.
Fechas en formato DD/MM. Montos en soles (S/). Nada de consejos médicos/legales.`;
