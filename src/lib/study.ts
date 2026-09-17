// Estudio (v1.6.0) — 100% puro: SM-2 para flashcards + asistencia con límite.
// SM-2 clásico: quality 0..5 (aquí: 0 otra vez, 3 difícil, 4 bien, 5 fácil).

import type { Attendance, Course } from "../types";

export type SmQuality = 0 | 3 | 4 | 5;

export interface SmResult { ease: number; reps: number; interval: number; nextReview: string; }

function addDaysISO(ds: string, n: number): string {
  const d = new Date(ds + "T12:00:00");
  d.setDate(d.getDate() + n);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function smReview(ease: number, reps: number, interval: number, q: SmQuality, today = todayISO()): SmResult {
  let e = ease, r = reps, iv = interval;
  if (q < 3) {
    r = 0; iv = 1;
  } else {
    if (r === 0) iv = 1;
    else if (r === 1) iv = 6;
    else iv = Math.round(iv * e);
    e = Math.max(1.3, e + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    r += 1;
  }
  return { ease: Math.round(e * 100) / 100, reps: r, interval: iv, nextReview: addDaysISO(today, iv) };
}

// --- Asistencia ---

export const DEFAULT_ABSENCE_LIMIT = 30; // % que inhabilita (estándar universitario)

export interface AttendanceStats { total: number; present: number; absent: number; late: number; pctAbsent: number; limit: number; atRisk: boolean; failed: boolean; }

/** Tardanza = media falta. Sin registros = 0% (sin datos no se juzga). */
export function attendanceStats(records: Attendance[], limit = DEFAULT_ABSENCE_LIMIT): AttendanceStats {
  let present = 0, absent = 0, late = 0;
  for (const r of records) {
    if (r.status === "present") present++;
    else if (r.status === "absent") absent++;
    else late++;
  }
  const weighted = absent + late * 0.5;
  const total = records.length;
  const pctAbsent = total ? (weighted / total) * 100 : 0;
  return {
    total, present, absent, late, pctAbsent, limit,
    atRisk: total > 0 && pctAbsent >= limit * 0.7 && pctAbsent < limit,
    failed: total > 0 && pctAbsent >= limit,
  };
}

export interface ClassOccurrence { date: string; slotId: string; startTime: string; endTime: string; location: string; }

/** Ocurrencias de clase entre from..to (respeta inicio/fin del curso). */
export function classOccurrences(course: Course, from: string, to: string): ClassOccurrence[] {
  const out: ClassOccurrence[] = [];
  for (let ds = from; ds <= to; ds = addDaysISO(ds, 1)) {
    if (course.startDate && ds < course.startDate) continue;
    if (course.endDate && ds > course.endDate) continue;
    const dow = new Date(ds + "T12:00:00").getDay();
    for (const s of course.schedule || []) {
      if (s.dayOfWeek !== dow) continue;
      out.push({ date: ds, slotId: s.id, startTime: s.startTime, endTime: s.endTime, location: s.location });
    }
  }
  return out;
}
