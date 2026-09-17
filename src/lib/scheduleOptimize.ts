import type { Deliverable, Course } from "../types";
import { addDays, format, parseISO, isBefore } from "date-fns";

// Optimización simple local-first: distribuye bloques de estudio según proximidad y peso
export interface StudySuggestion {
  date: string; // YYYY-MM-DD
  blocks: { deliverableId: string; title: string; hours: number; priority: string; reason: string }[];
  freeHours: number;
}

export function optimizeStudySchedule(
  deliverables: Deliverable[],
  courses: Course[],
  daysAhead = 7,
  dailyCapacityHours = 4
): StudySuggestion[] {
  const now = new Date();
  const upcoming = deliverables
    .filter(d => d.status === "pendiente" || d.status === "en_progreso")
    .filter(d => {
      try { return !isBefore(parseISO(`${d.dueDate}T${d.dueTime}:00`), now); } catch { return true; }
    })
    .sort((a, b) => {
      const da = parseISO(`${a.dueDate}T${a.dueTime}:00`).getTime();
      const dB = parseISO(`${b.dueDate}T${b.dueTime}:00`).getTime();
      if (da !== dB) return da - dB;
      // peso y prioridad desempatan
      const pa = (a.weight || 0) + (a.priority === "alta" ? 10 : a.priority === "media" ? 5 : 0);
      const pb = (b.weight || 0) + (b.priority === "alta" ? 10 : b.priority === "media" ? 5 : 0);
      return pb - pa;
    });

  const suggestions: StudySuggestion[] = [];
  // ocupa días siguientes
  const courseMap = new Map(courses.map(c => [c.id, c]));

  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(now, i);
    const iso = format(date, "yyyy-MM-dd");
    // horas bloqueadas por clases ese día
    const dow = date.getDay();
    let blocked = 0;
    for (const c of courses) for (const s of c.schedule) if (s.dayOfWeek === dow) {
      const [sh, sm] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      blocked += (eh * 60 + em - (sh * 60 + sm)) / 60;
    }
    let free = Math.max(0, dailyCapacityHours - 0); // capacidad estudio independiente de clases; simplificado
    // si hay clases, reducimos 30% pero no bloqueamos total
    if (blocked > 4) free = Math.max(1, dailyCapacityHours - 1);
    // asignar tareas más urgentes primero
    const blocks: any[] = [];
    let remaining = free;
    for (const d of upcoming) {
      if (remaining <= 0) break;
      const est = d.estimatedHours || estimateHours(d);
      // si ya vence antes de este día, no asignar después
      const due = parseISO(`${d.dueDate}T${d.dueTime}:00`);
      if (isBefore(due, date)) continue;
      // asignar fraccional
      const alloc = Math.min(remaining, Math.max(0.5, est / Math.max(1, daysUntil(due, date))));
      if (alloc < 0.5) continue;
      remaining -= alloc;
      const course = courseMap.get(d.courseId);
      blocks.push({
        deliverableId: d.id,
        title: `${course?.code || ""} ${d.title}`,
        hours: Math.round(alloc * 2) / 2,
        priority: d.priority,
        reason: `${d.type} vence ${d.dueDate} peso ${d.weight ?? "-"}%`
      });
      // reducir estimado restante mutando copia? simplificado no rastreamos
    }
    suggestions.push({ date: iso, blocks, freeHours: free });
  }
  return suggestions;
}

function estimateHours(d: Deliverable): number {
  if (d.estimatedHours) return d.estimatedHours;
  if (d.type === "examen") return 6;
  if (d.type === "entregable") return 4;
  if (d.type === "practica") return 3;
  if (d.type === "tarea") return 2;
  return 1.5;
}
function daysUntil(due: Date, from: Date): number {
  const diff = (due.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.ceil(diff));
}
