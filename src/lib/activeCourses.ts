// Regla "curso activo" (v0.8.1) — 100% puro.
// Activo = status "activo" Y (recién registrado sin datos O con clase/entrega en los próximos N días).
// Sin actividad en la ventana = registrado pero no activo (sigue en Archivados/Todos).

import type { Course, Deliverable } from "../types";

export const ACTIVE_WINDOW_DAYS = 14;

export function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysISO(ds: string, n: number): string {
  const d = new Date(ds + "T12:00:00");
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

/** ¿Tiene clase o entrega pendiente dentro de los próximos `days` días? */
export function hasActivityInDays(
  course: Course,
  deliverables: Deliverable[],
  days = ACTIVE_WINDOW_DAYS,
  today = todayISO()
): boolean {
  const pending = deliverables.filter(
    d => d.courseId === course.id && (d.status === "pendiente" || d.status === "en_progreso")
  );
  const slots = course.schedule || [];
  // recién registrado (sin horario ni entregas): en preparación, cuenta como activo
  if (slots.length === 0 && pending.length === 0) return true;

  const end = addDaysISO(today, days);
  // clases en ventana (respetando inicio/fin del curso)
  for (let ds = today; ds <= end; ds = addDaysISO(ds, 1)) {
    if (course.startDate && ds < course.startDate) continue;
    if (course.endDate && ds > course.endDate) continue;
    const dow = new Date(ds + "T12:00:00").getDay();
    if (slots.some(s => s.dayOfWeek === dow)) return true;
  }
  // entregas pendientes con vencimiento en ventana
  if (pending.some(d => d.dueDate >= today && d.dueDate <= end)) return true;
  return false;
}

export function isActiveCourse(
  course: Course,
  deliverables: Deliverable[],
  days = ACTIVE_WINDOW_DAYS,
  today = todayISO()
): boolean {
  if (course.status !== "activo") return false;
  return hasActivityInDays(course, deliverables, days, today);
}

/** Próxima actividad (clase o entrega) dentro de la ventana, para mostrar contexto. */
export function nextActivityInDays(
  course: Course,
  deliverables: Deliverable[],
  days = ACTIVE_WINDOW_DAYS,
  today = todayISO()
): string | null {
  const end = addDaysISO(today, days);
  const cands: string[] = [];
  const slots = course.schedule || [];
  for (let ds = today; ds <= end; ds = addDaysISO(ds, 1)) {
    if (course.startDate && ds < course.startDate) continue;
    if (course.endDate && ds > course.endDate) continue;
    const dow = new Date(ds + "T12:00:00").getDay();
    if (slots.some(s => s.dayOfWeek === dow)) { cands.push(ds); break; }
  }
  for (const d of deliverables) {
    if (d.courseId !== course.id) continue;
    if (d.status !== "pendiente" && d.status !== "en_progreso") continue;
    if (d.dueDate >= today && d.dueDate <= end) cands.push(d.dueDate);
  }
  if (!cands.length) return null;
  return cands.sort()[0];
}
