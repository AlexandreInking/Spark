// Higiene anti-XSS local (v0.9.2) — 100% puro.
// La app es local-first (el "atacante" sería contenido pegado por el propio usuario),
// pero un título como `<img src=x onerror=...>` no debe poder ejecutar JS al renderizarse.

/** Escapa texto para interpolar en HTML. */
export function escapeHtml(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * URL segura para href/window.open: solo http/https.
 * `javascript:`, `data:`, etc. → null (no clicable).
 */
export function safeUrl(u: string | null | undefined): string | null {
  const t = String(u ?? "").trim();
  if (!t) return null;
  try {
    // relativo tipo "/x" no tiene sentido aquí; exige esquema http(s)
    const parsed = new URL(t);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return t;
    return null;
  } catch {
    // permite "www.ejemplo.com" agregando https
    if (/^[\w-]+(\.[\w-]+)+/.test(t)) return `https://${t}`;
    return null;
  }
}

/** Celda CSV: entrecomilla + neutraliza inyección de fórmulas (=,+,-,@,tab). */
export function csvCell(v: unknown): string {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
