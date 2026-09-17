// Comparador de propuestas laborales (v0.6.0) — 100% puro, sin dependencias de UI ni DB.
// - Compatibilidad horaria: cruza los slots propuestos con el horario de cursos activos.
// - Sueldo: estimado mensual comparable (hora × horas semanales × 4.33, mes directo, evento puntual).
// - Puntaje: ponderado transparente con pesos del usuario (sueldo, compatibilidad, modalidad, crecimiento).

import type { CompareWeights, Course, JobOffer, JobSlot } from "../types";

export const DEFAULT_WEIGHTS: CompareWeights = { salary: 30, compatibility: 30, modality: 20, growth: 20 };

interface SlotLike { dayOfWeek: number; startTime: string; endTime: string; }

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export function dayName(d: number): string { return DAYS[d] || `Día ${d}`; }

/** Cruces entre slots de la oferta y slots de cursos (mismo día + traslape). */
export function findScheduleClashes(offerSlots: SlotLike[], courseSlots: SlotLike[]): { day: number; offer: string; course: string }[] {
  const res: { day: number; offer: string; course: string }[] = [];
  for (const o of offerSlots) {
    if (!o.startTime || !o.endTime) continue;
    const os = toMin(o.startTime), oe = toMin(o.endTime);
    if (!(oe > os)) continue;
    for (const c of courseSlots) {
      if (c.dayOfWeek !== o.dayOfWeek || !c.startTime || !c.endTime) continue;
      const cs = toMin(c.startTime), ce = toMin(c.endTime);
      if (!(ce > cs)) continue;
      if (Math.max(os, cs) < Math.min(oe, ce)) {
        res.push({ day: o.dayOfWeek, offer: `${o.startTime}-${o.endTime}`, course: `${c.startTime}-${c.endTime}` });
      }
    }
  }
  return res;
}

/** Compatibilidad 0..100. Sin horario declarado o sin cursos = 100 (neutral, no penaliza). */
export function compatibilityScore(offer: JobOffer, courses: Course[]): { score: number; clashes: { day: number; offer: string; course: string; courseCode: string }[] } {
  const slots = offer.schedule || [];
  if (slots.length === 0) return { score: 100, clashes: [] };
  const clashes: { day: number; offer: string; course: string; courseCode: string }[] = [];
  for (const c of courses) {
    const found = findScheduleClashes(slots, c.schedule || []);
    for (const f of found) clashes.push({ ...f, courseCode: c.code });
  }
  // cada día distinto con choque resta 25 (4+ días = 0)
  const clashDays = new Set(clashes.map(x => x.day)).size;
  return { score: Math.max(0, 100 - clashDays * 25), clashes };
}

/** Horas semanales declaradas en el horario de la oferta. */
export function weeklyHours(slots: JobSlot[]): number {
  return slots.reduce((s, x) => {
    if (!x.startTime || !x.endTime) return s;
    const d = toMin(x.endTime) - toMin(x.startTime);
    return s + (d > 0 ? d / 60 : 0);
  }, 0);
}

function midSalary(o: JobOffer): number | null {
  if (o.salaryMin !== undefined && o.salaryMax !== undefined) return (o.salaryMin + o.salaryMax) / 2;
  return o.salaryMin ?? o.salaryMax ?? null;
}

/**
 * Estimado mensual comparable.
 * - mes: directo. - hora: tarifa × horas semanales × 4.33 (sin horario: ×160h).
 * - evento: monto puntual (se compara tal cual; es aproximado y se indica en UI).
 */
export function monthlyEstimate(o: JobOffer): number | null {
  const mid = midSalary(o);
  if (mid === null) return null;
  if (o.salaryPeriod === "mes") return mid;
  if (o.salaryPeriod === "evento") return mid;
  const wh = weeklyHours(o.schedule || []);
  return mid * (wh > 0 ? wh * 4.33 : 160);
}

function modalityScore(o: JobOffer): number {
  return o.modality === "remoto" ? 100 : o.modality === "hibrido" ? 75 : 50;
}

function growthScore(o: JobOffer): number {
  if (o.growth === undefined) return 50; // neutral si no se evalúa
  return Math.min(5, Math.max(1, o.growth)) * 20;
}

export interface OfferScore {
  total: number;
  salary: number;
  compatibility: number;
  modality: number;
  growth: number;
  monthly: number | null;
  clashes: { day: number; offer: string; course: string; courseCode: string }[];
}

/** Puntaje ponderado 0..100. Sueldo relativo al mejor estimado del conjunto (sin sueldos = neutral 50). */
export function scoreOffer(offer: JobOffer, all: JobOffer[], courses: Course[], weights: CompareWeights): OfferScore {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const totalW = (w.salary || 0) + (w.compatibility || 0) + (w.modality || 0) + (w.growth || 0) || 1;
  const monthly = monthlyEstimate(offer);
  const best = Math.max(0, ...all.map(o => monthlyEstimate(o) ?? 0));
  const salary = monthly === null || best <= 0 ? 50 : (monthly / best) * 100;
  const { score: compatibility, clashes } = compatibilityScore(offer, courses);
  const modality = modalityScore(offer);
  const growth = growthScore(offer);
  const total = (salary * w.salary + compatibility * w.compatibility + modality * w.modality + growth * w.growth) / totalW;
  return { total, salary, compatibility, modality, growth, monthly, clashes };
}

export function rankOffers(offers: JobOffer[], courses: Course[], weights: CompareWeights): { offer: JobOffer; score: OfferScore }[] {
  return offers
    .map(offer => ({ offer, score: scoreOffer(offer, offers, courses, weights) }))
    .sort((a, b) => b.score.total - a.score.total);
}

// --- Horario multi-día + bonos (v0.6.2) ---

/** Construye slots con el mismo horario para los días elegidos (ids vacíos: la UI asigna uuid). */
export function buildSlotsForDays(days: number[], startTime: string, endTime: string): JobSlot[] {
  if (!startTime || !endTime || startTime >= endTime) return [];
  const uniq = Array.from(new Set(days)).filter(d => d >= 0 && d <= 6).sort((a, b) => a - b);
  return uniq.map(dayOfWeek => ({ id: "", dayOfWeek, startTime, endTime }));
}

/** Bonos con fecha de cobro conocida, desde `from`, ordenados. */
export function upcomingDatedBonuses(o: import("../types").JobOffer, from = todayISO()): { date: string; bonus: import("../types").JobBonus }[] {
  return (o.bonuses || [])
    .filter(b => b.date && b.date >= from)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .map(bonus => ({ date: bonus.date as string, bonus }));
}

// --- Historial laboral / cobros (v0.6.1) ---

/** Ya es trabajo (pasado, vigente o por empezar) si tiene fecha de inicio. */
export function isHired(o: JobOffer): boolean { return !!o.hiredStart; }

/** Estado del trabajo según fechas: "upcoming" | "current" | "past". */
export function jobPhase(o: JobOffer, today = todayISO()): "upcoming" | "current" | "past" {
  if (!o.hiredStart) return "current";
  if (o.hiredStart > today) return "upcoming";
  if (o.hiredEnd && o.hiredEnd < today) return "past";
  return "current";
}

export function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysISO(ds: string, n: number): string {
  const d = new Date(ds + "T12:00:00");
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

function addMonthISO(ds: string): string {
  const d = new Date(ds + "T12:00:00");
  const day = d.getDate();
  d.setMonth(d.getMonth() + 1);
  // si el mes no tiene ese día (ej 31→feb), retrocede al último día del mes
  if (d.getDate() < day) d.setDate(0);
  return todayISO(d);
}

function payStep(rec: string | undefined): ((ds: string) => string) | null {
  if (rec === "semanal") return (ds) => addDaysISO(ds, 7);
  if (rec === "quincenal") return (ds) => addDaysISO(ds, 14);
  if (rec === "mensual") return addMonthISO;
  return null; // "unico" o sin recurrencia
}

/** Próximas fechas de cobro (YYYY-MM-DD) desde `from`, máx `count`. Solo futuro/hoy. */
export function nextPayDates(o: JobOffer, from = todayISO(), count = 3): string[] {
  if (!o.payDate) return [];
  const step = payStep(o.payRecurrence);
  const out: string[] = [];
  if (!step) {
    if (o.payDate >= from) out.push(o.payDate);
    return out;
  }
  let cur = o.payDate;
  for (let i = 0; i < 60 && out.length < count; i++) {
    if (cur >= from) out.push(cur);
    cur = step(cur);
    if (cur <= o.payDate) break; // seguridad anti-bucle
  }
  return out;
}
