// Portafolio dinámico por tipo (v0.9.0) — 100% puro.
// Cada categoría pide sus propios campos (ej. software → repo; marketing → métricas, sin GitHub).

import type { PortfolioCategory } from "../types";

export interface PortfolioFieldDef {
  key: string;
  label: string;
  kind: "url" | "text";
  required?: boolean;
  placeholder?: string;
}

export const PORTFOLIO_SCHEMAS: Record<PortfolioCategory, PortfolioFieldDef[]> = {
  desarrollo_software: [
    { key: "repo", label: "Repo (GitHub/GitLab)", kind: "url", required: true, placeholder: "https://github.com/..." },
    { key: "demo", label: "Demo en vivo", kind: "url", placeholder: "https://..." },
    { key: "stack", label: "Stack", kind: "text", placeholder: "React, Node, Postgres…" },
  ],
  diseno_grafico: [
    { key: "galeria", label: "Galería / Behance", kind: "url", placeholder: "https://..." },
    { key: "herramientas", label: "Herramientas", kind: "text", placeholder: "Photoshop, Figma…" },
  ],
  marketing: [
    { key: "rol", label: "Tu rol", kind: "text", placeholder: "Community manager, pauta…" },
    { key: "metricas", label: "Métricas / resultados", kind: "text", placeholder: "+40% alcance, 3x ROAS…" },
    { key: "enlace", label: "Enlace campaña", kind: "url", placeholder: "https://..." },
  ],
  fotografia: [
    { key: "galeria", label: "Galería", kind: "url", placeholder: "https://..." },
    { key: "cliente", label: "Cliente / agencia", kind: "text", placeholder: "…" },
  ],
  modelaje: [
    { key: "book", label: "Book / portafolio", kind: "url", placeholder: "https://..." },
    { key: "agencia", label: "Agencia", kind: "text", placeholder: "…" },
  ],
  big_data: [
    { key: "dataset", label: "Dataset / modelo", kind: "url", placeholder: "https://..." },
    { key: "notebook", label: "Notebook / demo", kind: "url", placeholder: "https://..." },
    { key: "stack", label: "Stack", kind: "text", placeholder: "Python, Spark, SQL…" },
  ],
  genai: [
    { key: "modelo", label: "Modelo / dataset", kind: "url", placeholder: "https://..." },
    { key: "demo", label: "Demo", kind: "url", placeholder: "https://..." },
  ],
  ai_training: [
    { key: "dataset", label: "Dataset / proyecto", kind: "url", placeholder: "https://..." },
    { key: "plataforma", label: "Plataforma", kind: "text", placeholder: "Scale, Remotasks…" },
  ],
  otro: [
    { key: "enlace", label: "Enlace", kind: "url", placeholder: "https://..." },
  ],
};

export function schemaFor(category: PortfolioCategory): PortfolioFieldDef[] {
  return PORTFOLIO_SCHEMAS[category] || PORTFOLIO_SCHEMAS.otro;
}

/** Etiquetas de campos requeridos sin valor (para alertar). */
export function missingRequired(category: PortfolioCategory, extra: Record<string, string> | undefined): string[] {
  return schemaFor(category)
    .filter(f => f.required && !(extra?.[f.key] || "").trim())
    .map(f => f.label);
}

/** Limpia extras: solo claves del schema y valores no vacíos. */
export function cleanExtra(category: PortfolioCategory, extra: Record<string, string> | undefined): Record<string, string> {
  const keys = new Set(schemaFor(category).map(f => f.key));
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(extra || {})) {
    if (keys.has(k) && v.trim()) out[k] = v.trim();
  }
  return out;
}
