// Notas (v1.3.0, sin IA) — 100% puro.
// Subconjunto Markdown renderizado a HTML SEGURO (se escapa primero, luego se decora).
// Enlaces [[Título]] con panel de backlinks.

import { escapeHtml } from "./security";
import type { Note, Notebook } from "../types";

export function extractLinks(content: string): string[] {
  const out: string[] = [];
  const re = /\[\[([^\[\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content || "")) !== null) {
    const t = m[1].trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

function inlineMd(escaped: string, linkify: (title: string) => string): string {
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<i>$2</i>")
    .replace(/\[\[([^\[\]]+)\]\]/g, (_m, t) => linkify(t));
}

function defaultLinkify(title: string): string {
  return `<a href="#" data-note="${title}">${title}</a>`;
}

/** Renderiza a HTML seguro (usar con dangerouslySetInnerHTML: todo contenido pasó por escape). */
export function renderNoteMd(content: string, linkify: (title: string) => string = defaultLinkify): string {
  const lines = String(content || "").split("\n");
  const html: string[] = [];
  let inList = false;
  const closeList = () => { if (inList) { html.push("</ul>"); inList = false; } };
  for (const raw of lines) {
    const line = raw;
    let m: RegExpExecArray | null;
    if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) {
      closeList();
      const lvl = m[1].length;
      html.push(`<h${lvl + 3} style="margin:8px 0 4px">${inlineMd(escapeHtml(m[2]), linkify)}</h${lvl + 3}>`);
    } else if ((m = /^-\s+\[([ xX])\]\s+(.*)$/.exec(line))) {
      if (!inList) { html.push("<ul>"); inList = true; }
      const done = m[1].toLowerCase() === "x";
      html.push(`<li style="list-style:none">${done ? "☑" : "☐"} ${inlineMd(escapeHtml(m[2]), linkify)}</li>`);
    } else if ((m = /^-\s+(.*)$/.exec(line))) {
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li>${inlineMd(escapeHtml(m[1]), linkify)}</li>`);
    } else if ((m = /^>\s?(.*)$/.exec(line))) {
      closeList();
      html.push(`<blockquote style="border-left:3px solid var(--border);margin:4px 0;padding-left:8px;color:var(--text-muted)">${inlineMd(escapeHtml(m[1]), linkify)}</blockquote>`);
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      html.push(`<p style="margin:4px 0">${inlineMd(escapeHtml(line), linkify)}</p>`);
    }
  }
  closeList();
  return html.join("");
}

/** Notas que enlazan a `title` (case-insensitive), excluyendo la propia. */
export function backlinks<T extends { id: string; title: string; content: string }>(notes: T[], selfId: string, title: string): T[] {
  const t = title.trim().toLowerCase();
  if (!t) return [];
  return notes.filter(n => n.id !== selfId && extractLinks(n.content).some(l => l.toLowerCase() === t));
}

export function wordCount(s: string): number {
  return String(s || "").trim().split(/\s+/).filter(Boolean).length;
}

// --- Exportar / compartir / importar (v1.5.0) ---

export function noteToMarkdown(n: Pick<Note, "title" | "content" | "tags">): string {
  const tags = (n.tags || []).length ? `\n\nEtiquetas: ${(n.tags || []).join(", ")}` : "";
  return `# ${n.title}\n\n${n.content || ""}${tags}\n`;
}

/** Texto para compartir (WhatsApp renderiza **negrita**, *cursiva*, ```código```). */
export function noteToShareText(n: Pick<Note, "title" | "content">): string {
  return `*${n.title}*\n\n${n.content || ""}`;
}

/** Un cuaderno entero en un .md (jerarquía con ## por subpágina). */
export function notebookToMarkdown(name: string, notes: Note[]): string {
  const byParent = new Map<string, Note[]>();
  for (const n of notes) {
    const k = n.parentId || "";
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(n);
  }
  const out = [`# Cuaderno: ${name}`, ""];
  const walk = (parent: string, depth: number) => {
    const kids = (byParent.get(parent) || []).slice().sort((a, b) => a.title.localeCompare(b.title));
    for (const k of kids) {
      out.push(`${"#".repeat(Math.min(6, depth + 2))} ${k.title}`, "", k.content || "", "");
      walk(k.id, depth + 1);
    }
  };
  walk("", 0);
  return out.join("\n");
}

export interface NotesPack { version: 1; exportedAt: string; notebooks: Notebook[]; notes: Note[]; }

export function exportPack(notebooks: Notebook[], notes: Note[]): string {
  const pack: NotesPack = { version: 1, exportedAt: new Date().toISOString(), notebooks, notes };
  return JSON.stringify(pack, null, 2);
}

/** Valida un pack importado (no escribe nada). */
export function parsePack(text: string): NotesPack {
  const d = JSON.parse(text);
  if (!d || d.version !== 1 || !Array.isArray(d.notes)) throw new Error("Archivo inválido");
  return {
    version: 1,
    exportedAt: typeof d.exportedAt === "string" ? d.exportedAt : "",
    notebooks: Array.isArray(d.notebooks) ? d.notebooks : [],
    notes: d.notes,
  };
}

/** Un .md/.txt suelto → {título, contenido} (título = primer # o nombre de archivo). */
export function importMarkdownFile(fileName: string, text: string): { title: string; content: string } {
  const lines = String(text || "").split("\n");
  const h = lines.findIndex(l => /^#{1,3}\s+/.test(l.trim()));
  if (h >= 0) {
    const title = lines[h].trim().replace(/^#{1,3}\s+/, "").slice(0, 120) || fileName;
    const rest = [...lines.slice(0, h), ...lines.slice(h + 1)].join("\n").trim();
    return { title, content: rest };
  }
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return { title: base.slice(0, 120) || "Sin título", content: String(text || "").trim() };
}
