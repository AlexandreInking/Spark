// Sistema de temas (v1.1.1) — 100% local.
// 14 presets con identidad propia + Custom. Vars inline (vencen al media query).
// Custom: imagen de fondo, tamaño de letra S/M/L/XL (rem: se adapta sin romper layout),
// color de letra, animación de clic (3) y estela del mouse (3) con color elegible.

export interface ThemeDef {
  id: string;
  label: string;
  scheme: "dark" | "light";
  vars: Record<string, string>;
}

export const THEMES: ThemeDef[] = [
  { id: "oscuro", label: "Oscuro", scheme: "dark", vars: {
    "--bg": "#0f0f10", "--surface": "#1a1a1e", "--surface-2": "#232326", "--border": "#2a2a30",
    "--text": "#f1f1f3", "--text-muted": "#a1a1b0", "--text-faint": "#6b6b76",
    "--accent": "#f1f1f3", "--accent-2": "#334155", "--primary": "#f1f1f3", "--primary-hover": "#e4e4e7" } },
  { id: "claro", label: "Claro", scheme: "light", vars: {
    "--bg": "#f8f7f5", "--surface": "#ffffff", "--surface-2": "#f1efeB", "--border": "#e8e6e1",
    "--text": "#1a1a1e", "--text-muted": "#6b6b76", "--text-faint": "#9a9aa3",
    "--accent": "#0f172a", "--accent-2": "#334155", "--primary": "#111827", "--primary-hover": "#1f2937" } },
  { id: "golden", label: "Golden Hour", scheme: "dark", vars: {
    "--bg": "#170e04", "--surface": "#241505", "--surface-2": "#33200a", "--border": "#5c3d14",
    "--text": "#ffe9c4", "--text-muted": "#d9a75f", "--text-faint": "#8a6132",
    "--accent": "#ffb300", "--accent-2": "#8a6132", "--primary": "#ff9e00", "--primary-hover": "#ffb84d" } },
  { id: "sunset", label: "Sunset", scheme: "dark", vars: {
    "--bg": "#200a1c", "--surface": "#33122b", "--surface-2": "#4a1a3c", "--border": "#7a2f5c",
    "--text": "#ffe0ec", "--text-muted": "#e08bb0", "--text-faint": "#96587c",
    "--accent": "#ff5e78", "--accent-2": "#96587c", "--primary": "#ff2e63", "--primary-hover": "#ff5e78" } },
  { id: "cyberpunk", label: "Cyberpunk", scheme: "dark", vars: {
    "--bg": "#050510", "--surface": "#0c0c22", "--surface-2": "#151536", "--border": "#2de2e6",
    "--text": "#eafffb", "--text-muted": "#5eead4", "--text-faint": "#2f6f7e",
    "--accent": "#f9f002", "--accent-2": "#2f6f7e", "--primary": "#00e5ff", "--primary-hover": "#5eeaff" } },
  { id: "halloween", label: "Halloween", scheme: "dark", vars: {
    "--bg": "#0b0503", "--surface": "#160a04", "--surface-2": "#241307", "--border": "#5b2d8e",
    "--text": "#ffd9a0", "--text-muted": "#c98f3d", "--text-faint": "#7d5a28",
    "--accent": "#b366ff", "--accent-2": "#7d5a28", "--primary": "#ff6d00", "--primary-hover": "#ff8c42" } },
  { id: "coquette", label: "Coquette", scheme: "light", vars: {
    "--bg": "#faf0f3", "--surface": "#fff7f9", "--surface-2": "#f6dfe7", "--border": "#e3b3c2",
    "--text": "#571f31", "--text-muted": "#9c5f74", "--text-faint": "#c08fa0",
    "--accent": "#571f31", "--accent-2": "#9c5f74", "--primary": "#a4133c", "--primary-hover": "#c9184a" } },
  { id: "biopunk", label: "Biopunk", scheme: "dark", vars: {
    "--bg": "#04120a", "--surface": "#0a1f13", "--surface-2": "#12301d", "--border": "#1f5c33",
    "--text": "#d3f9d8", "--text-muted": "#69b47c", "--text-faint": "#3d7351",
    "--accent": "#b2ff59", "--accent-2": "#3d7351", "--primary": "#2bff62", "--primary-hover": "#69ff8f" } },
  { id: "christmas", label: "Christmas", scheme: "dark", vars: {
    "--bg": "#071009", "--surface": "#0d1c12", "--surface-2": "#14291b", "--border": "#2f5c3d",
    "--text": "#f8faf8", "--text-muted": "#b7d3bf", "--text-faint": "#64806d",
    "--accent": "#2dc653", "--accent-2": "#64806d", "--primary": "#e63946", "--primary-hover": "#ee5360" } },
  { id: "newyear", label: "New Year", scheme: "dark", vars: {
    "--bg": "#05051a", "--surface": "#0b0b30", "--surface-2": "#141448", "--border": "#3d3d8f",
    "--text": "#fffbe6", "--text-muted": "#d6c87a", "--text-faint": "#7a723f",
    "--accent": "#ffd700", "--accent-2": "#7a723f", "--primary": "#ffcf00", "--primary-hover": "#ffe066" } },
  { id: "primavera", label: "Primavera", scheme: "light", vars: {
    "--bg": "#faf6ef", "--surface": "#fffdf7", "--surface-2": "#f4e4ec", "--border": "#dfb9cb",
    "--text": "#3f2a3a", "--text-muted": "#96687f", "--text-faint": "#bd94a8",
    "--accent": "#2e933c", "--accent-2": "#96687f", "--primary": "#d6336c", "--primary-hover": "#e64980" } },
  { id: "verano", label: "Verano", scheme: "light", vars: {
    "--bg": "#e8fbff", "--surface": "#f2feff", "--surface-2": "#c2f0f5", "--border": "#53c4cf",
    "--text": "#07333d", "--text-muted": "#0e7490", "--text-faint": "#5aa9bc",
    "--accent": "#f97316", "--accent-2": "#5aa9bc", "--primary": "#0284c7", "--primary-hover": "#0ea5e9" } },
  { id: "otono", label: "Otoño", scheme: "dark", vars: {
    "--bg": "#120b04", "--surface": "#1e1106", "--surface-2": "#2f1c0b", "--border": "#6b4423",
    "--text": "#f7e8d5", "--text-muted": "#d29a5b", "--text-faint": "#8a6238",
    "--accent": "#e8590c", "--accent-2": "#8a6238", "--primary": "#d9480f", "--primary-hover": "#f76707" } },
  { id: "invierno", label: "Invierno", scheme: "dark", vars: {
    "--bg": "#04090f", "--surface": "#0a1420", "--surface-2": "#10233a", "--border": "#234a75",
    "--text": "#e3f2fd", "--text-muted": "#8fb8dd", "--text-faint": "#4f6f92",
    "--accent": "#74c0fc", "--accent-2": "#4f6f92", "--primary": "#339af0", "--primary-hover": "#4dabf7" } },
  { id: "sanrio-kitty", label: "Sanrio/Hello Kitty", scheme: "light", vars: {
    "--bg": "#fff3f5", "--surface": "#ffffff", "--surface-2": "#ffe2e9", "--border": "#f2a9be",
    "--text": "#3d0a16", "--text-muted": "#a44a64", "--text-faint": "#cb8ba0",
    "--accent": "#2c73b7", "--accent-2": "#a44a64", "--primary": "#e90d2f", "--primary-hover": "#ff2e4d" } },
  { id: "sanrio-aggretsuko", label: "Sanrio/Aggretsuko", scheme: "dark", vars: {
    "--bg": "#0d0906", "--surface": "#191009", "--surface-2": "#251610", "--border": "#5a2f1c",
    "--text": "#fdf3e7", "--text-muted": "#d9a066", "--text-faint": "#7d5638",
    "--accent": "#ff2e2e", "--accent-2": "#7d5638", "--primary": "#e8641b", "--primary-hover": "#ff7a2e" } },
  { id: "sanrio-melody", label: "Sanrio/My Melody", scheme: "light", vars: {
    "--bg": "#fdf1f5", "--surface": "#ffffff", "--surface-2": "#f9d8e4", "--border": "#e5a3bc",
    "--text": "#571f31", "--text-muted": "#a05f76", "--text-faint": "#c795a8",
    "--accent": "#e23a5f", "--accent-2": "#a05f76", "--primary": "#d6336c", "--primary-hover": "#e64980" } },
  { id: "sanrio-kuromi", label: "Sanrio/Kuromi", scheme: "dark", vars: {
    "--bg": "#0e0716", "--surface": "#180c26", "--surface-2": "#241239", "--border": "#4e2a6b",
    "--text": "#f7ecfa", "--text-muted": "#c79bdd", "--text-faint": "#7d5a94",
    "--accent": "#a855f7", "--accent-2": "#7d5a94", "--primary": "#ff4fa3", "--primary-hover": "#ff77b8" } },
  { id: "sanrio-cinamoroll", label: "Sanrio/Cinnamoroll", scheme: "light", vars: {
    "--bg": "#eef7fe", "--surface": "#ffffff", "--surface-2": "#d9ecf9", "--border": "#9fcbe8",
    "--text": "#1e3a52", "--text-muted": "#5b87a3", "--text-faint": "#8fb4c9",
    "--accent": "#f4a7c3", "--accent-2": "#5b87a3", "--primary": "#2f9fd8", "--primary-hover": "#54b4e4" } },
  { id: "sanrio-purin", label: "Sanrio/Pompompurin", scheme: "light", vars: {
    "--bg": "#fdf3df", "--surface": "#fffdf4", "--surface-2": "#f6e5c2", "--border": "#dfc084",
    "--text": "#4a2f14", "--text-muted": "#9c7839", "--text-faint": "#c2a06b",
    "--accent": "#7c4a21", "--accent-2": "#9c7839", "--primary": "#9a6608", "--primary-hover": "#b97f0b" } },
  { id: "sanrio-badtz", label: "Sanrio/Badtz-maru", scheme: "dark", vars: {
    "--bg": "#08080b", "--surface": "#101014", "--surface-2": "#1a1a22", "--border": "#33333f",
    "--text": "#f2f2ee", "--text-muted": "#c4bd8a", "--text-faint": "#6e6c52",
    "--accent": "#ffd400", "--accent-2": "#6e6c52", "--primary": "#eab308", "--primary-hover": "#facc15" } },
  { id: "sanrio-keroppi", label: "Sanrio/Keroppi", scheme: "light", vars: {
    "--bg": "#edf7ea", "--surface": "#ffffff", "--surface-2": "#d6eecb", "--border": "#93c683",
    "--text": "#1e3a20", "--text-muted": "#4d7c4f", "--text-faint": "#86a986",
    "--accent": "#e63946", "--accent-2": "#4d7c4f", "--primary": "#43a047", "--primary-hover": "#4caf50" } },
  { id: "sanrio-gudetama", label: "Sanrio/Gudetama", scheme: "dark", vars: {
    "--bg": "#12100a", "--surface": "#1d1810", "--surface-2": "#2b2114", "--border": "#57401f",
    "--text": "#fdf3da", "--text-muted": "#d3b25f", "--text-faint": "#7d6a3a",
    "--accent": "#c97b1a", "--accent-2": "#7d6a3a", "--primary": "#f5b301", "--primary-hover": "#ffce4d" } },
  { id: "sanrio-fenneko", label: "Sanrio/Fenneko", scheme: "light", vars: {
    "--bg": "#f7efe0", "--surface": "#fffdf6", "--surface-2": "#efe0c6", "--border": "#d3b183",
    "--text": "#43301c", "--text-muted": "#9c7a4b", "--text-faint": "#c0a071",
    "--accent": "#7c4a21", "--accent-2": "#9c7a4b", "--primary": "#8a5a22", "--primary-hover": "#a86e2c" } },
  { id: "sanrio-haida", label: "Sanrio/Haida", scheme: "dark", vars: {
    "--bg": "#100c09", "--surface": "#1a1411", "--surface-2": "#27201a", "--border": "#4d4034",
    "--text": "#efe6d8", "--text-muted": "#b3a184", "--text-faint": "#6f6250",
    "--accent": "#e8a33d", "--accent-2": "#6f6250", "--primary": "#b57a28", "--primary-hover": "#d1943a" } },
  { id: "sanrio-washimi", label: "Sanrio/Washimi", scheme: "dark", vars: {
    "--bg": "#0a0d13", "--surface": "#111724", "--surface-2": "#1a2436", "--border": "#2f3d5c",
    "--text": "#eef2f7", "--text-muted": "#9fb0c8", "--text-faint": "#5f7089",
    "--accent": "#e63946", "--accent-2": "#5f7089", "--primary": "#8fa3bf", "--primary-hover": "#a9bcd4" } },
  { id: "sanrio-gori", label: "Sanrio/Gori", scheme: "dark", vars: {
    "--bg": "#150c10", "--surface": "#221016", "--surface-2": "#301822", "--border": "#5c2a3c",
    "--text": "#f9e8ee", "--text-muted": "#d69aab", "--text-faint": "#8a5a68",
    "--accent": "#ff7eb0", "--accent-2": "#8a5a68", "--primary": "#e75480", "--primary-hover": "#f06a96" } },
  { id: "sanrio-ton", label: "Sanrio/Ton", scheme: "dark", vars: {
    "--bg": "#14090d", "--surface": "#1f0f14", "--surface-2": "#2c151c", "--border": "#552b36",
    "--text": "#fbe9ec", "--text-muted": "#d196a1", "--text-faint": "#86555f",
    "--accent": "#ff8fa3", "--accent-2": "#86555f", "--primary": "#c1121f", "--primary-hover": "#e63946" } },
  { id: "reactiva", label: "Reactiva ✨ (desde imagen)", scheme: "dark", vars: {} },
  { id: "custom", label: "Custom", scheme: "dark", vars: {} },
];

export function getTheme(id: string): ThemeDef {
  return THEMES.find(t => t.id === id) || THEMES[0];
}

export type FontSizeOpt = "s" | "m" | "l" | "xl";
export type ClickStyle = "burst" | "rings" | "confetti" | "spiral" | "fireworks";
export type TrailStyle = "dots" | "stars" | "bubbles" | "comet" | "sparkles";
export type FontFamilyOpt = "inter" | "system" | "serif" | "mono";
export type SfxStyle = "click" | "pop" | "soft";

export interface CustomTheme {
  base: string;        // preset base sobre el que personalizar
  fontColor?: string;  // #rrggbb (también tiñe atenuados)
  fontSize?: FontSizeOpt;
  bgImage?: string;    // dataURL (se guarda en settings, tope ~2.5MB)
  bgColor?: string;    // #rrggbb fondo
  surfaceColor?: string; // #rrggbb superficies/tarjetas
  accentColor?: string;  // #rrggbb primario/botones
  fontFamily?: FontFamilyOpt;
}

export interface FxFlags {
  click: boolean;
  trails: boolean;
  clickStyle: ClickStyle;
  trailStyle: TrailStyle;
  fxColor?: string; // vacío = auto (multicolor clics / accent estela)
  sfx: boolean;     // sonido de clic (WebAudio sintetizado, sin archivos)
  sfxStyle: SfxStyle;
  sfxVolume: number; // 0..100
}

export interface AmbienceCfg { enabled: boolean; volume: number; }

const K_THEME = "uc_theme";
const K_CUSTOM = "uc_theme_custom";
const K_FX = "uc_theme_fx";
const K_REACTIVE = "uc_reactive";

export function loadThemeId(): string {
  try { return localStorage.getItem(K_THEME) || "oscuro"; } catch { return "oscuro"; }
}

export function loadCustom(): CustomTheme {
  try {
    const raw = localStorage.getItem(K_CUSTOM);
    if (raw) return { base: "oscuro", fontSize: "m", ...JSON.parse(raw) };
  } catch {}
  return { base: "oscuro", fontSize: "m" };
}

export function loadFx(): FxFlags {
  const def: FxFlags = { click: false, trails: false, clickStyle: "burst", trailStyle: "dots", sfx: false, sfxStyle: "click", sfxVolume: 60 };
  try {
    const raw = localStorage.getItem(K_FX);
    if (raw) return { ...def, ...JSON.parse(raw) };
  } catch {}
  return def;
}

const K_AMB = "uc_ambience";

export function loadAmbience(): AmbienceCfg {
  try {
    const raw = localStorage.getItem(K_AMB);
    if (raw) return { enabled: false, volume: 40, ...JSON.parse(raw) };
  } catch {}
  return { enabled: false, volume: 40 };
}

export function saveAmbience(a: AmbienceCfg) {
  try { localStorage.setItem(K_AMB, JSON.stringify(a)); } catch {}
  applyAmbience();
}

export function saveFx(fx: FxFlags) {
  try { localStorage.setItem(K_FX, JSON.stringify(fx)); } catch {}
}

/** Aplica preset + custom. Lee bg guardado en settings (SQLite/localStorage). */
export async function applyStoredTheme(): Promise<void> {
  const id = loadThemeId();
  const custom = loadCustom();
  let bg = custom.bgImage;
  try {
    const { db } = await import("./db");
    const stored = await db.getSetting("custom_bg");
    if (stored) bg = stored;
  } catch {}
  applyTheme(id, { ...custom, bgImage: bg });
}

export function loadReactive(): { vars: Record<string, string>; scheme: "dark" | "light" } | null {
  try {
    const raw = localStorage.getItem(K_REACTIVE);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p.vars !== "object") return null;
    return { vars: p.vars, scheme: p.scheme === "light" ? "light" : "dark" };
  } catch { return null; }
}

export function saveReactive(vars: Record<string, string>, scheme: "dark" | "light"): void {
  try { localStorage.setItem(K_REACTIVE, JSON.stringify({ vars, scheme })); } catch {}
}

/** Analiza una imagen (máx 3MB) y devuelve vars + esquema + preview de 5 colores. */
export function analyzeImage(file: File): Promise<{ vars: Record<string, string>; scheme: "dark" | "light"; preview: string[] }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("No es imagen"));
    if (file.size > 3 * 1024 * 1024) return reject(new Error("Imagen muy pesada (máx 3MB)"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const S = 64;
        const cv = document.createElement("canvas");
        cv.width = S; cv.height = S;
        const ctx = cv.getContext("2d");
        if (!ctx) throw new Error("Sin canvas");
        ctx.drawImage(img, 0, 0, S, S);
        const data = ctx.getImageData(0, 0, S, S).data;
        URL.revokeObjectURL(url);
        // import dinámico para no cargar peso extra al inicio
        import("./reactive").then(({ topColors, buildReactiveRoles, rolesToVars, toHex }) => {
          const top = topColors(data, 8);
          const roles = buildReactiveRoles(top);
          const bgLum = 0.2126 * roles.bg.r / 255 + 0.7152 * roles.bg.g / 255 + 0.0722 * roles.bg.b / 255;
          const scheme = bgLum < 0.25 ? "dark" : "light";
          resolve({
            vars: rolesToVars(roles, scheme),
            scheme,
            preview: top.slice(0, 5).map(t => toHex(t.color)),
          });
        }).catch(reject);
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer")); };
    img.src = url;
  });
}

export function applyTheme(id: string, custom?: CustomTheme): void {
  const root = document.documentElement;
  const c = custom || loadCustom();
  const base = getTheme(c.base);
  let preset = id === "custom" ? base : getTheme(id);
  let overrideVars: Record<string, string> | null = null;
  let scheme = preset.scheme;
  if (id === "reactiva") {
    const r = loadReactive();
    if (r) { overrideVars = r.vars; scheme = r.scheme; }
    else { preset = getTheme("oscuro"); }
  }
  root.dataset.theme = id;
  (root.style as any).colorScheme = scheme;
  for (const [k, v] of Object.entries(preset.vars)) root.style.setProperty(k, v);
  if (overrideVars) for (const [k, v] of Object.entries(overrideVars)) root.style.setProperty(k, v);
  const isHex = (s?: string) => !!s && /^#[0-9a-fA-F]{6}$/.test(s);
  if (id === "custom") {
    if (isHex(c.fontColor)) {
      root.style.setProperty("--text", c.fontColor as string);
      root.style.setProperty("--text-muted", (c.fontColor as string) + "b3");
      root.style.setProperty("--text-faint", (c.fontColor as string) + "80");
    }
    if (isHex(c.bgColor)) root.style.setProperty("--bg", c.bgColor as string);
    if (isHex(c.surfaceColor)) {
      root.style.setProperty("--surface", c.surfaceColor as string);
      root.style.setProperty("--surface-2", c.surfaceColor as string);
    }
    if (isHex(c.accentColor)) {
      root.style.setProperty("--primary", c.accentColor as string);
      root.style.setProperty("--primary-hover", c.accentColor as string);
      root.style.setProperty("--accent", c.accentColor as string);
    }
    const fonts: Record<string, string> = {
      inter: "'Inter', system-ui, sans-serif",
      system: "system-ui, sans-serif",
      serif: "Georgia, 'Times New Roman', serif",
      mono: "'JetBrains Mono', Consolas, monospace",
    };
    document.body.style.fontFamily = fonts[c.fontFamily || "inter"];
    root.dataset.font = c.fontSize || "m";
  } else {
    delete root.dataset.font;
    document.body.style.fontFamily = "";
  }
  const bg = id === "custom" ? c.bgImage : undefined;
  if (bg) {
    document.body.style.backgroundImage = `url("${bg}")`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundPosition = "center";
  } else {
    document.body.style.backgroundImage = "";
  }
}

export function setThemeId(id: string): void {
  try { localStorage.setItem(K_THEME, id); } catch {}
  void applyStoredTheme();
}

export function saveCustom(c: CustomTheme): void {
  try { localStorage.setItem(K_CUSTOM, JSON.stringify({ ...c, bgImage: undefined })); } catch {}
  // la imagen va a settings (puede pasar el techo de localStorage)
  void (async () => {
    try {
      const { db } = await import("./db");
      if (c.bgImage) await db.setSetting("custom_bg", c.bgImage);
      else await db.setSetting("custom_bg", "");
    } catch {}
    void applyStoredTheme();
  })();
}

// --- efectos (clic + estela), un solo par de listeners ---

let fxInstalled = false;
let styleInjected = false;

function ensureFxStyle(): void {
  if (styleInjected) return;
  styleInjected = true;
  const st = document.createElement("style");
  st.id = "uc-fx-style";
  st.textContent = `
    .uc-fx{position:fixed;z-index:9999;pointer-events:none;transform:translate(-50%,-50%)}
    .uc-fx-dot{border-radius:999px;animation:uc-fx-fade .7s ease-out forwards}
    .uc-fx-star{clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);animation:uc-fx-fade .8s ease-out forwards}
    .uc-fx-bubble{border-radius:999px;background:transparent !important;animation:uc-fx-rise .9s ease-out forwards}
    @keyframes uc-fx-fade{from{opacity:.9}to{opacity:0;transform:translate(-50%,-60%) scale(.4)}}
    @keyframes uc-fx-rise{from{opacity:.8}to{opacity:0;transform:translate(-50%,-140%) scale(1.6)}}
    .uc-fx-ring{border-radius:999px;background:transparent !important;animation:uc-fx-ring .5s ease-out forwards}
    @keyframes uc-fx-ring{from{opacity:.9;transform:translate(-50%,-50%) scale(.2)}to{opacity:0;transform:translate(-50%,-50%) scale(1)}}
    .uc-fx-confetti{animation:uc-fx-drop .6s ease-in forwards}
    @keyframes uc-fx-drop{from{opacity:1;transform:translate(-50%,-50%) rotate(0)}to{opacity:0;transform:translate(-50%,120%) rotate(220deg)}}
    .uc-fx-comet{border-radius:999px;animation:uc-fx-fade .5s ease-out forwards}
    .uc-fx-glyph{background:transparent !important;animation:uc-fx-rise 1s ease-out forwards;font-size:14px;line-height:1}`;
  document.head.appendChild(st);
}

function spawn(cls: string, css: Record<string, string>, x: number, y: number): void {
  const el = document.createElement("span");
  el.className = `uc-fx ${cls}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  for (const [k, v] of Object.entries(css)) (el.style as any)[k] = v;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

function accent(): string {
  return getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#888";
}

// --- audio: ambiente en bucle + clics sintetizados (WebAudio, sin archivos) ---

let ambAudio: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch { return null; }
}

/** Clic sintetizado: click/pop/soft. */
export function playClick(style: SfxStyle = "click", volume01 = 0.6): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    if (style === "pop") {
      o.type = "sine";
      o.frequency.setValueAtTime(600, t);
      o.frequency.exponentialRampToValueAtTime(180, t + 0.12);
      g.gain.setValueAtTime(0.35 * volume01, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      o.start(t); o.stop(t + 0.13);
    } else if (style === "soft") {
      o.type = "triangle";
      o.frequency.setValueAtTime(880, t);
      g.gain.setValueAtTime(0.18 * volume01, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      o.start(t); o.stop(t + 0.09);
    } else {
      o.type = "square";
      o.frequency.setValueAtTime(2000, t);
      g.gain.setValueAtTime(0.12 * volume01, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      o.start(t); o.stop(t + 0.06);
    }
    o.connect(g); g.connect(ctx.destination);
  } catch {}
}

/** Aplica audio ambiente (llamar al arrancar y al cambiar ajustes). */
export async function applyAmbience(): Promise<void> {
  try {
    const cfg = loadAmbience();
    if (!ambAudio) {
      ambAudio = new Audio();
      ambAudio.loop = true;
      ambAudio.preload = "auto";
    }
    ambAudio.volume = Math.min(1, Math.max(0, cfg.volume / 100));
    if (!cfg.enabled) { ambAudio.pause(); return; }
    if (!ambAudio.src) {
      const { db } = await import("./db");
      const url = await db.getSetting("ambience_audio");
      if (!url) return;
      ambAudio.src = url;
    }
    await ambAudio.play().catch(() => {
      // autoplay bloqueado: arranca con el primer gesto
      const go = () => {
        window.removeEventListener("pointerdown", go);
        ambAudio?.play().catch(() => {});
        getCtx();
      };
      window.addEventListener("pointerdown", go, { once: true });
    });
  } catch {}
}

export function installFx(): void {
  if (fxInstalled || typeof window === "undefined") return;
  fxInstalled = true;
  ensureFxStyle();
  const PALETTE = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#a855f7"];
  const GLYPHS = ["✦", "✶", "❤", "★"];
  let lastTrail = 0;
  window.addEventListener("pointerdown", (e) => {
    const fx = loadFx();
    if (fx.sfx) playClick(fx.sfxStyle, (fx.sfxVolume ?? 60) / 100);
    if (!fx.click) return;
    const color = fx.fxColor || "";
    if (fx.clickStyle === "rings") {
      for (const size of [10, 22, 34]) {
        spawn("uc-fx-ring", { width: `${size}px`, height: `${size}px`, border: `2px solid ${color || accent()}` }, e.clientX, e.clientY);
      }
    } else if (fx.clickStyle === "confetti") {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        spawn("uc-fx-confetti", {
          width: "7px", height: "10px",
          background: color || PALETTE[i % PALETTE.length],
        }, e.clientX + Math.cos(a) * 16, e.clientY + Math.sin(a) * 16);
      }
    } else if (fx.clickStyle === "spiral") {
      for (let i = 0; i < 12; i++) {
        const a = i * 0.9;
        const r = 6 + i * 2.4;
        spawn("uc-fx-dot", {
          width: "5px", height: "5px",
          background: color || PALETTE[i % PALETTE.length],
        }, e.clientX + Math.cos(a) * r, e.clientY + Math.sin(a) * r);
      }
    } else if (fx.clickStyle === "fireworks") {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + 0.2;
        const r = 10 + ((i * 37) % 22);
        spawn("uc-fx-confetti", {
          width: "6px", height: "6px", borderRadius: "999px",
          background: color || PALETTE[(i * 2 + 1) % PALETTE.length],
        }, e.clientX + Math.cos(a) * r, e.clientY + Math.sin(a) * r);
      }
    } else {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        spawn("uc-fx-dot", {
          width: "6px", height: "6px",
          background: color || PALETTE[(Math.abs(e.clientX * 7 + e.clientY * 13) + i) % PALETTE.length],
        }, e.clientX + Math.cos(a) * 14, e.clientY + Math.sin(a) * 14);
      }
    }
  }, { passive: true });
  window.addEventListener("pointermove", (e) => {
    const fx = loadFx();
    if (!fx.trails) return;
    const now = Date.now();
    if (now - lastTrail < 45) return;
    lastTrail = now;
    const color = fx.fxColor || accent();
    if (fx.trailStyle === "stars") {
      spawn("uc-fx-star", { width: "10px", height: "10px", background: color }, e.clientX, e.clientY);
    } else if (fx.trailStyle === "bubbles") {
      spawn("uc-fx-bubble", { width: "9px", height: "9px", border: `2px solid ${color}` }, e.clientX, e.clientY);
    } else if (fx.trailStyle === "comet") {
      spawn("uc-fx-comet", { width: "14px", height: "4px", background: color }, e.clientX, e.clientY);
    } else if (fx.trailStyle === "sparkles") {
      const el = document.createElement("span");
      el.className = "uc-fx uc-fx-glyph";
      el.textContent = GLYPHS[(e.clientX + e.clientY) % GLYPHS.length];
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      el.style.color = color;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    } else {
      spawn("uc-fx-dot", { width: "7px", height: "7px", background: color }, e.clientX, e.clientY);
    }
  }, { passive: true });
}
