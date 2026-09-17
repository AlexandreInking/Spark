// Tema Reactiva (v1.4.2) — 100% puro salvo analyzeImage (canvas).
// Extrae los colores más usados de una imagen (cuantización 4 bits/canal)
// y los asigna por contraste WCAG a los roles del programa.

export interface RGB { r: number; g: number; b: number; }

export function toHex(c: RGB): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

function bucketKey(r: number, g: number, b: number): string {
  return `${r >> 4},${g >> 4},${b >> 4}`;
}

/** Top de colores por frecuencia (representante = centro del bucket). */
export function topColors(pixels: Uint8ClampedArray | number[], n = 8): { color: RGB; count: number }[] {
  const acc = new Map<string, { sum: number[]; count: number }>();
  for (let i = 0; i + 2 < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const k = bucketKey(r, g, b);
    const e = acc.get(k) || { sum: [0, 0, 0], count: 0 };
    e.sum[0] += r; e.sum[1] += g; e.sum[2] += b; e.count++;
    acc.set(k, e);
  }
  return Array.from(acc.values())
    .map(e => ({ color: { r: e.sum[0] / e.count, g: e.sum[1] / e.count, b: e.sum[2] / e.count }, count: e.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function lum(c: RGB): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

export function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = lum(a) >= lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
  return (hi + 0.05) / (lo + 0.05);
}

function saturation(c: RGB): number {
  const mx = Math.max(c.r, c.g, c.b) / 255, mn = Math.min(c.r, c.g, c.b) / 255;
  if (mx === 0) return 0;
  return (mx - mn) / mx;
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 12, g: 12, b: 16 };

export interface ReactiveRoles {
  bg: RGB; surface: RGB; surface2: RGB; border: RGB;
  text: RGB; muted: RGB; faint: RGB;
  accent: RGB; primary: RGB; hover: RGB;
}

/** Asigna roles: fondo = más oscuro frecuente; texto = más claro con contraste ≥4.5; acento = más saturado. */
export function buildReactiveRoles(top: { color: RGB; count: number }[]): ReactiveRoles {
  const cols = top.map(t => t.color);
  const fallback = cols[0] || { r: 30, g: 30, b: 34 };
  const byLum = [...cols].sort((a, b) => lum(a) - lum(b));
  const bg = byLum[0] || fallback;
  const bgIsDark = lum(bg) < 0.25;
  const lightFirst = [...cols].sort((a, b) => lum(b) - lum(a));
  const text = lightFirst.find(c => contrast(c, bg) >= 4.5) || (bgIsDark ? WHITE : BLACK);
  const sat = [...cols].sort((a, b) => saturation(b) - saturation(a));
  const accent = sat.find(c => saturation(c) > 0.25 && contrast(c, bg) >= 2.2)
    || sat[0]
    || (bgIsDark ? { r: 14, g: 165, b: 233 } : { r: 2, g: 132, b: 199 });
  const toText = (t: number) => mix(bg, text, t);
  return {
    bg,
    surface: mix(bg, text, 0.05),
    surface2: mix(bg, text, 0.10),
    border: mix(bg, text, 0.20),
    text,
    muted: toText(0.62),
    faint: toText(0.42),
    accent,
    primary: accent,
    hover: mix(accent, bgIsDark ? WHITE : BLACK, 0.18),
  };
}

export function rolesToVars(r: ReactiveRoles, scheme: "dark" | "light"): Record<string, string> {
  void scheme;
  return {
    "--bg": toHex(r.bg),
    "--surface": toHex(r.surface),
    "--surface-2": toHex(r.surface2),
    "--border": toHex(r.border),
    "--text": toHex(r.text),
    "--text-muted": toHex(r.muted),
    "--text-faint": toHex(r.faint),
    "--accent": toHex(r.accent),
    "--accent-2": toHex(r.muted),
    "--primary": toHex(r.primary),
    "--primary-hover": toHex(r.hover),
  };
}
