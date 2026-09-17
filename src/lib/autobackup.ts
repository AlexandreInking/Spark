// Autoguardado programado: UNA sola copia (se sobreescribe, no crea copias).
// Funciona solo con la PC encendida y la app abierta (el chequeo corre cada 60s en App.tsx).

export type AutoBackupFreq = "diaria" | "semanal" | "quincenal" | "mensual";

export interface AutoBackupConfig {
  enabled: boolean;
  freq: AutoBackupFreq;
  time: string; // "HH:MM" — hora a partir de la cual se ejecuta
  lastRun: string | null; // ISO
}

const CFG_KEY = "uc_autobackup_cfg";
export const AUTO_BACKUP_SLOT = "uc_auto_backup"; // única copia, siempre se sobreescribe

export const FREQ_DAYS: Record<AutoBackupFreq, number> = {
  diaria: 1,
  semanal: 7,
  quincenal: 15,
  mensual: 30,
};

export const FREQ_LABEL: Record<AutoBackupFreq, string> = {
  diaria: "Diaria",
  semanal: "Semanal",
  quincenal: "Quincenal",
  mensual: "Mensual",
};

export function getAutoBackupConfig(): AutoBackupConfig {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      return { enabled: !!c.enabled, freq: c.freq || "semanal", time: c.time || "03:00", lastRun: c.lastRun || null };
    }
  } catch {}
  return { enabled: false, freq: "semanal", time: "03:00", lastRun: null };
}

export function saveAutoBackupConfig(c: AutoBackupConfig) {
  localStorage.setItem(CFG_KEY, JSON.stringify(c));
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** ¿Toca ejecutar ahora? Requiere: activado + intervalo cumplido + hora del día alcanzada. */
export function shouldRunBackup(now: Date = new Date(), cfg?: AutoBackupConfig): boolean {
  const c = cfg || getAutoBackupConfig();
  if (!c.enabled) return false;
  // primera vez: se ejecuta de inmediato para dejar la copia base creada
  if (!c.lastRun) return true;
  const last = new Date(c.lastRun);
  if (isNaN(last.getTime())) return true;
  const diffDays = (now.getTime() - last.getTime()) / 86400000;
  if (diffDays < FREQ_DAYS[c.freq]) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= timeToMinutes(c.time);
}

/** Próxima ejecución estimada (informativa). */
export function nextDueDate(cfg?: AutoBackupConfig): Date | null {
  const c = cfg || getAutoBackupConfig();
  if (!c.enabled) return null;
  const base = c.lastRun ? new Date(c.lastRun) : new Date();
  const due = new Date(base.getTime() + FREQ_DAYS[c.freq] * 86400000);
  const [h, m] = c.time.split(":").map(Number);
  due.setHours(h || 0, m || 0, 0, 0);
  return due;
}

/** Ejecuta el autoguardado: exporta todo y SOBREESCRIBE la única copia. */
export async function runAutoBackup(): Promise<{ ok: boolean; at: string; error?: string }> {
  try {
    const { exportBackup } = await import("./backup");
    const txt = await exportBackup();
    // sobreescribe — nunca crea copias
    localStorage.setItem(AUTO_BACKUP_SLOT, txt);
    const cfg = getAutoBackupConfig();
    cfg.lastRun = new Date().toISOString();
    saveAutoBackupConfig(cfg);
    return { ok: true, at: cfg.lastRun };
  } catch (e: any) {
    return { ok: false, at: "", error: e?.message || "Error desconocido" };
  }
}

/** Revisa si toca y ejecuta. La llama App.tsx cada 60s. */
export async function checkAutoBackup(): Promise<boolean> {
  try {
    if (!shouldRunBackup()) return false;
    const r = await runAutoBackup();
    return r.ok;
  } catch {
    return false;
  }
}

/** Lee la copia del autoguardado (para descargar o restaurar). */
export function getAutoBackupText(): string | null {
  return localStorage.getItem(AUTO_BACKUP_SLOT);
}

export function getAutoBackupInfo(): { at: string; sizeKb: number } | null {
  const t = getAutoBackupText();
  if (!t) return null;
  try {
    const d = JSON.parse(t);
    return { at: d.exportedAt || "?", sizeKb: Math.round(t.length / 1024) };
  } catch {
    return { at: "?", sizeKb: Math.round(t.length / 1024) };
  }
}
