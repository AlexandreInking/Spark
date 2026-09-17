import type { Deliverable, Course } from "../types";
import { parseISO, areIntervalsOverlapping } from "date-fns";

export function toInterval(d: Deliverable): { start: Date; end: Date } | null {
  if (!d.dueDate || !d.dueTime) return null;
  try {
    const startStr = `${d.dueDate}T${d.dueTime}:00`;
    const start = parseISO(startStr);
    const dur = d.durationMinutes ?? 60;
    const end = new Date(start.getTime() + dur * 60 * 1000);
    // si tiene endDate/endTime explicito, usarlo
    if (d.endDate && d.endTime) {
      const e = parseISO(`${d.endDate}T${d.endTime}:00`);
      if (!isNaN(e.getTime())) return { start, end: e };
    }
    return { start, end };
  } catch { return null; }
}

export function detectOverlaps(deliverables: Deliverable[]): { a: Deliverable; b: Deliverable; reason: string }[] {
  const res: { a: Deliverable; b: Deliverable; reason: string }[] = [];
  for (let i = 0; i < deliverables.length; i++) {
    for (let j = i + 1; j < deliverables.length; j++) {
      const a = deliverables[i], b = deliverables[j];
      const ia = toInterval(a), ib = toInterval(b);
      if (!ia || !ib) continue;
      // mismo día? overlapping incluye toque exacto
      if (areIntervalsOverlapping(ia, ib, { inclusive: true })) {
        const reason = sameDay(a, b) ? "Solapamiento horario directo" : "Cruce de intervalos";
        res.push({ a, b, reason });
      } else {
        // también alerta si 2 entregas mismo día con <2h de separación (carga alta)
        if (a.dueDate === b.dueDate) {
          const diff = Math.abs(ia.start.getTime() - ib.start.getTime()) / (1000 * 60);
          if (diff < 120) res.push({ a, b, reason: `Mismo día, solo ${Math.round(diff)} min de separación` });
        }
      }
    }
  }
  return res;
}

function sameDay(a: Deliverable, b: Deliverable) { return a.dueDate === b.dueDate; }

export function courseScheduleOverlaps(courses: Course[]): { a: Course; b: Course; day: number; reason: string }[] {
  const res: any[] = [];
  for (let i = 0; i < courses.length; i++) for (let j = i + 1; j < courses.length; j++) {
    const ca = courses[i], cb = courses[j];
    // Si semestres distintos (módulos/lapsos diferentes) no hay cruce
    if (ca.semester && cb.semester && ca.semester !== cb.semester) continue;
    // Solo alertar si los lapsos (startDate/endDate) se solapan; si son módulos distintos no hay cruce
    if (!periodsOverlap(ca.startDate, ca.endDate, cb.startDate, cb.endDate)) continue;
    for (const sa of ca.schedule) for (const sb of cb.schedule) {
      if (sa.dayOfWeek !== sb.dayOfWeek) continue;
      const [ah, am] = sa.startTime.split(":").map(Number);
      const [bh, bm] = sb.startTime.split(":").map(Number);
      const [ae, aeM] = sa.endTime.split(":").map(Number);
      const [be, beM] = sb.endTime.split(":").map(Number);
      const aStart = ah * 60 + am, aEnd = ae * 60 + aeM, bStart = bh * 60 + bm, bEnd = be * 60 + beM;
      if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
        const lapsoInfo = (ca.startDate || cb.startDate) ? ` (lapsos ${ca.startDate||"?"}→${ca.endDate||"?"} vs ${cb.startDate||"?"}→${cb.endDate||"?"})` : "";
        res.push({ a: ca, b: cb, day: sa.dayOfWeek, reason: `Choque ${dayName(sa.dayOfWeek)} ${sa.startTime}-${sa.endTime} vs ${sb.startTime}-${sb.endTime}${lapsoInfo}` });
      }
    }
  }
  return res;
}
function periodsOverlap(aStart?: string, aEnd?: string, bStart?: string, bEnd?: string): boolean {
  // si ambos sin fechas, asumir mismo lapso -> sí solapa
  if (!aStart && !aEnd && !bStart && !bEnd) return true;
  // si solo uno tiene lapso, no podemos asegurar separación -> considerar solape solo si coinciden semestres? Por ahora si falta fecha, asumir solape para no ocultar alerta
  // Mejor: si alguno no tiene fechas, asumir solape (conservador), excepto si tienen semestres distintos
  // Para módulos distintos con fechas, verificar intersección
  if (aStart && bStart && aEnd && bEnd) {
    return aStart <= bEnd && bStart <= aEnd;
  }
  if (aStart && aEnd && bStart && !bEnd) return bStart <= aEnd && bStart >= aStart;
  if (bStart && bEnd && aStart && !aEnd) return aStart! <= bEnd && aStart! >= bStart;
  // si falta algún extremo, considerar solape
  return true;
}
function dayName(d: number) { return ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][d] || `${d}`; }
