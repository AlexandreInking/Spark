// Proyectos/Gantt (v1.2.0) — 100% puro: rango visible, posiciones % y automatización auto-done.

import type { ProjectCard } from "../types";

function addDaysISO(ds: string, n: number): string {
  const d = new Date(ds + "T12:00:00");
  d.setDate(d.getDate() + n);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000);
}

export interface GanttBar {
  id: string;
  title: string;
  start: string;
  end: string;
  progress: number;
  leftPct: number;
  widthPct: number;
  overdue: boolean;
}

/** Rango visible: desde el inicio más temprano (-3d margen) hasta el fin más tardío (+7d), mín 14 días. */
export function ganttRange(cards: ProjectCard[], today: string): { from: string; to: string } {
  const dated = cards.filter(c => c.startDate || c.dueDate);
  if (!dated.length) return { from: addDaysISO(today, -3), to: addDaysISO(today, 11) };
  let from = dated.map(c => c.startDate || c.dueDate as string).sort()[0];
  let to = dated.map(c => c.dueDate || c.startDate as string).sort().reverse()[0];
  if (from > today) from = today;
  if (to < today) to = today;
  from = addDaysISO(from, -2);
  to = addDaysISO(to, 5);
  if (diffDays(from, to) < 14) to = addDaysISO(from, 14);
  return { from, to };
}

/** Barras posicionadas en % sobre [from, to]. Sin fechas = no aparece (se edita en Proyectos). */
export function ganttBars(cards: ProjectCard[], from: string, to: string, today: string): GanttBar[] {
  const span = Math.max(1, diffDays(from, to) + 1);
  return cards
    .filter(c => c.startDate || c.dueDate)
    .map(c => {
      const start = c.startDate || c.dueDate as string;
      const end = c.dueDate || c.startDate as string;
      const l = Math.max(0, diffDays(from, start));
      const r = Math.min(span, diffDays(from, end) + 1);
      return {
        id: c.id, title: c.title, start, end,
        progress: Math.min(100, Math.max(0, c.progress || 0)),
        leftPct: (l / span) * 100,
        widthPct: Math.max(2, ((r - l) / span) * 100),
        overdue: end < today && (c.progress || 0) < 100,
      };
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Automatización auto-done: checklist completo y no vacío → sugiere última columna. */
export function shouldAutoDone(card: ProjectCard): boolean {
  return card.checklist.length > 0 && card.checklist.every(i => i.done);
}

// --- Reglas locales v1.3.0 ---

import type { BoardRules, ProjectBoard, ProjectColumn } from "../types";

/** Reglas efectivas (compat legacy autoDone suelto). */
export function boardRules(b: ProjectBoard): Required<BoardRules> {
  const r = b.rules || {};
  return {
    autoDone: r.autoDone ?? !!b.autoDone,
    autoProgress: r.autoProgress ?? false,
    overdueToFront: r.overdueToFront ?? false,
  };
}

/** Progreso automático = % checklist (solo si hay ítems). */
export function autoProgress(card: ProjectCard): number | null {
  if (!card.checklist.length) return null;
  return Math.round((card.checklist.filter(i => i.done).length / card.checklist.length) * 100);
}

/** Vencida y sin completar. */
export function isOverdue(card: ProjectCard, today: string): boolean {
  return !!card.dueDate && card.dueDate < today && (card.progress || 0) < 100;
}

/** Vence en ≤3 días (incluye vencidas). */
export function isDueSoon(card: ProjectCard, today: string): boolean {
  if (!card.dueDate || (card.progress || 0) >= 100) return false;
  return card.dueDate <= addDaysISO(today, 3);
}

/** WIP excedido en la columna. */
export function wipExceeded(col: ProjectColumn, count: number): boolean {
  return (col.wip ?? 0) > 0 && count > (col.wip as number);
}
