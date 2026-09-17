// APA 7 herramienta local usando citation-js + fallback manual
// Provee generación sin servidor

import { escapeHtml } from "./security";

export interface ApaInput {
  type: "book" | "journal" | "website" | "thesis" | "conference" | "report" | "chapter" | "dataset" | "legal";
  authors: string[]; // "Apellido, N." o "Nombre Apellido"
  year?: string;
  title: string;
  publisher?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  url?: string;
  doi?: string;
  editors?: string[];
  conference?: string;
  location?: string;
  institution?: string;
  reportNumber?: string;
  chapter?: string;
  version?: string;
}

export function toApa7(input: ApaInput): string {
  // v0.9.2: todo contenido del usuario se escapa (el HTML se renderiza); solo quedan <i> propios
  const e = (s: string | undefined) => escapeHtml(s || "");
  const authors = formatAuthors(input.authors.map(a => escapeHtml(a)));
  const year = input.year ? `(${e(input.year)}).` : "(s.f.).";
  const title = formatTitle(e(input.title), input.type);
  let rest = "";
  switch (input.type) {
    case "book":
      if (input.editors?.length) rest += `(Eds.), `;
      rest += input.publisher ? `${e(input.publisher)}.` : "";
      break;
    case "chapter":
      rest = `En ${input.editors?.length ? formatAuthors(input.editors.map(a => escapeHtml(a))) + " (Eds.), " : ""}<i>${e(input.publisher) || "Libro"}</i> ${input.pages ? `(pp. ${e(input.pages)})` : ""}. ${e(input.publisher)}.`;
      break;
    case "journal":
      rest = `${input.journal ? `<i>${e(input.journal)}</i>` : ""}${input.volume ? `, <i>${e(input.volume)}</i>` : ""}${input.issue ? `(${e(input.issue)})` : ""}${input.pages ? `, ${e(input.pages)}` : ""}.`;
      if (input.doi) rest += ` https://doi.org/${e(input.doi)}`;
      else if (input.url) rest += ` ${e(input.url)}`;
      break;
    case "conference":
      rest = `${input.conference ? `<i>${e(input.conference)}</i>` : ""}${input.location ? `, ${e(input.location)}` : ""}. ${e(input.publisher)}.`;
      if (input.url) rest += ` ${e(input.url)}`;
      break;
    case "report":
      rest = `${input.institution ? `${e(input.institution)}. ` : ""}${input.reportNumber ? `(${e(input.reportNumber)}). ` : ""}${e(input.publisher)}.`;
      if (input.url) rest += ` ${e(input.url)}`;
      break;
    case "website":
      rest = `${input.publisher ? e(input.publisher) + ". " : ""}${input.url ? `Recuperado de ${e(input.url)}` : ""}`;
      break;
    case "thesis":
      rest = `${input.institution ? `${e(input.institution)}. ` : ""}${input.publisher ? `${e(input.publisher)}. ` : ""}${input.url ? e(input.url) : ""}`;
      break;
    case "dataset":
      rest = `${input.version ? `(Versión ${e(input.version)}) ` : ""}[Conjunto de datos]. ${e(input.publisher)}. ${input.doi ? `https://doi.org/${e(input.doi)}` : e(input.url)}`;
      break;
    case "legal":
      rest = `${e(input.publisher)}. ${e(input.url)}`;
      break;
  }
  return `${authors} ${year} ${title} ${rest}`.replace(/\s+/g, " ").trim();
}

function formatAuthors(authors: string[]): string {
  if (!authors.length) return "";
  const norm = authors.map(a => a.trim()).filter(Boolean);
  if (norm.length === 1) return norm[0] + ".";
  if (norm.length === 2) return `${norm[0]} & ${norm[1]}.`;
  // >3: listar todos con comas + & último
  return norm.slice(0, -1).join(", ") + ", & " + norm[norm.length - 1] + ".";
}
function formatTitle(title: string, _type: string): string {
  // APA: solo primera palabra y nombres propios en mayúscula; simplificamos capitalizar solo primera
  const t = title.trim();
  if (!t.endsWith(".")) return `<i>${t}.</i>`;
  return `<i>${t}</i>`;
}

// Intento con citation-js si está disponible (para BibTeX/CSL-JSON)
export async function citeWithLibrary(cslJson: any): Promise<string | null> {
  try {
    // @ts-ignore
    const mod: any = await import("citation-js");
    const Cite = mod.default || mod.Cite || mod;
    const cite = new Cite(cslJson);
    const apa = cite.format("bibliography", { format: "text", template: "apa", lang: "en-US" });
    return apa;
  } catch { return null; }
}

// Parafraseo local simple sin IA externa (sinónimos básicos) - para demo local-first
const SYNONYMS: Record<string, string[]> = {
  "importante": ["relevante", "significativo", "trascendente"],
  "analizar": ["examinar", "estudiar", "evaluar"],
  "desarrollar": ["elaborar", "construir", "crear"],
  "utilizar": ["emplear", "usar", "aplicar"],
  "objetivo": ["propósito", "meta", "finalidad"],
  "resultado": ["hallazgo", "desenlace", "conclusión"],
};
export function paraphraseLocal(text: string, strength=50): string {
  // strength 1-100 controla probabilidad de reemplazo
  let out = text;
  const prob = Math.max(0.1, Math.min(0.95, strength/100));
  for (const [word, syns] of Object.entries(SYNONYMS)) {
    const re = new RegExp(`\\b${word}\\b`, "gi");
    out = out.replace(re, (m) => Math.random() < prob ? syns[Math.floor(Math.random() * syns.length)] : m);
  }
  if (strength>30) out = out.replace(/se debe (\w+)/gi, "es necesario $1");
  if (strength>70) {
    // reordenamiento leve para fuerza alta
    out = out.replace(/(\w+) es (\w+)/gi, "$2 es $1");
  }
  return out;
}

// Ollama integración local (http://localhost:11434)
export interface OllamaConfig { endpoint: string; model: string; }
export async function paraphraseWithOllama(text: string, cfg: OllamaConfig, strength=50): Promise<string> {
  const temp = 0.3 + (strength/100)*0.9; // 0.3-1.2
  const prompt = `Parafrasea el siguiente texto académico en español con fuerza ${strength}% (1=ligero, 100=reformulación profunda), manteniendo el significado y tono formal, sin añadir explicaciones:\n\n"${text}"`;
  const res = await fetch(`${cfg.endpoint.replace(/\/$/,"")}/api/generate`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ model: cfg.model, prompt, stream:false, options:{ temperature: temp } })
  });
  if(!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.response || "").trim() || text;
}
export async function checkOllama(cfg: OllamaConfig): Promise<{ ok:boolean; models?:string[]; error?:string }> {
  try {
    const r = await fetch(`${cfg.endpoint.replace(/\/$/,"")}/api/tags`);
    if(!r.ok) return { ok:false, error:`HTTP ${r.status}` };
    const j = await r.json();
    return { ok:true, models: (j.models||[]).map((m:any)=> m.name) };
  } catch(e:any){ return { ok:false, error:e.message } }
}

// Detección plagio local: TF-IDF cosine simplificada + detección IA heurística
export function plagiarismScore(a: string, b: string): number {
  const ta = tokenize(a), tb = tokenize(b);
  const vocab = Array.from(new Set([...ta, ...tb]));
  const va = vocab.map(w => tf(w, ta)), vb = vocab.map(w => tf(w, tb));
  return cosine(va, vb);
}
function tokenize(s: string) { return s.toLowerCase().replace(/[^a-z0-9áéíóúñü\s]/g, "").split(/\s+/).filter(Boolean); }
function tf(w: string, toks: string[]) { return toks.filter(t => t === w).length / toks.length; }
function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
export function aiLikelihood(text: string): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const avgLen = sentences.reduce((s, x) => s + x.split(/\s+/).length, 0) / Math.max(1, sentences.length);
  if (avgLen > 22 && avgLen < 28) { score += 0.15; reasons.push("Longitud de oración muy uniforme"); }
  const perplex = new Set(tokenize(text)).size / Math.max(1, tokenize(text).length);
  if (perplex < 0.45) { score += 0.25; reasons.push("Baja diversidad léxica (perplejidad baja)"); }
  if (/en conclusión|en resumen|es importante destacar|además|cabe mencionar/gi.test(text)) { score += 0.15; reasons.push("Frases genéricas típicas de IA"); }
  if (!/[¡¿]/.test(text) && text.length > 500) { score += 0.1; reasons.push("Falta de matices humanos / signos expresivos"); }
  score = Math.min(0.95, score + Math.random() * 0.05);
  return { score, reasons };
}
