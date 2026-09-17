// Enfoque / métodos de estudio (v0.8.0) — 100% puro.
// Presets de intervalos + racha Kaizen + banco de pausas activas + checklist pre-sesión.

import type { FocusPresetId } from "../types";

export interface FocusPreset {
  id: FocusPresetId;
  label: string;
  desc: string;
  focusMin: number;
  breakMin: number;
  longBreakMin: number;
  longEvery: number; // cada cuántos enfoques toca descanso largo
}

export const FOCUS_PRESETS: FocusPreset[] = [
  { id: "pomodoro", label: "Pomodoro 25/5", desc: "Clásico: 25 enfoque, 5 pausa, largo cada 4", focusMin: 25, breakMin: 5, longBreakMin: 15, longEvery: 4 },
  { id: "ritmo52", label: "Ritmo 52/17", desc: "Bloques largos: 52 enfoque, 17 pausa", focusMin: 52, breakMin: 17, longBreakMin: 17, longEvery: 99 },
  { id: "ultradian90", label: "Ultradian 90/20", desc: "Ciclo completo: 90 enfoque, 20 pausa", focusMin: 90, breakMin: 20, longBreakMin: 30, longEvery: 2 },
];

export function getPreset(id: FocusPresetId): FocusPreset {
  return FOCUS_PRESETS.find(p => p.id === id) || FOCUS_PRESETS[0];
}

export type PhaseKind = "focus" | "break" | "long";

/** Siguiente fase tras completar `focusDone` enfoques (focusDone = los ya terminados). */
export function nextPhase(preset: FocusPreset, focusDone: number, justFinished: PhaseKind): { kind: PhaseKind; minutes: number } {
  if (justFinished !== "focus") return { kind: "focus", minutes: preset.focusMin };
  const done = focusDone + 1;
  if (done % preset.longEvery === 0) return { kind: "long", minutes: preset.longBreakMin };
  return { kind: "break", minutes: preset.breakMin };
}

export function formatClock(totalSecs: number): string {
  const s = Math.max(0, Math.floor(totalSecs));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/** Racha de días consecutivos con ≥1 sesión, contando hasta hoy (ayer vale si hoy aún no hay). */
export function streakDays(dayISOs: string[], today = new Date().toISOString().slice(0, 10)): number {
  const set = new Set(dayISOs);
  let streak = 0;
  let cur = today;
  if (!set.has(cur)) {
    // permite continuar si ayer hubo sesión
    const y = new Date(cur + "T12:00:00");
    y.setDate(y.getDate() - 1);
    const yISO = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    if (!set.has(yISO)) return 0;
    cur = yISO;
    streak = 0; // hoy aún no suma
  }
  for (let i = 0; i < 365; i++) {
    if (!set.has(cur)) break;
    streak++;
    const d = new Date(cur + "T12:00:00");
    d.setDate(d.getDate() - 1);
    cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return streak;
}

export interface BreakMove { title: string; detail: string; }

/** Banco local de pausas activas de ~5 min. */
export const BREAK_BANK: BreakMove[] = [
  { title: "Cuello y hombros", detail: "10 círculos lentos de cuello + 10 elevaciones de hombros. Suelta el celular." },
  { title: "Caminata + agua", detail: "Camina 3 min (pasillo/patio) + un vaso de agua. Sin pantallas." },
  { title: "Respiración 4-7-8", detail: "Inhala 4s, sostén 7s, exhala 8s. Repite 4 veces." },
  { title: "Estiramiento de espalda", detail: "De pie: brazos al cielo 20s + torsión suave a cada lado 20s." },
  { title: "Ojos 20-20-20", detail: "Mira 20 segundos algo a 20 pies (~6m). Parpadea lento 10 veces." },
  { title: "Sentadillas suaves", detail: "2 series de 10 sentadillas lentas + sacude piernas y brazos." },
  { title: "Orden relámpago", detail: "2 min ordenando tu escritorio (Seiri): solo lo de la próxima sesión." },
  { title: "Sol y aire", detail: "Asómate a ventana/balcón 2 min. Luz natural = mejor alerta." },
];

export function pickBreak(seed: number): BreakMove {
  return BREAK_BANK[Math.abs(seed) % BREAK_BANK.length];
}

/** Checklist pre-sesión (orden Seiri/Seiton en 3 toques). */
export const PRE_CHECKLIST = [
  "Escritorio despejado (solo lo de esta sesión)",
  "Materiales listos (cuaderno, agua, links abiertos)",
  "Distracciones fuera (celular lejos / silencio)",
];
