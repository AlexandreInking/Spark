// Horario semanal exportable a PNG con el tema activo (v1.6.0).
// Cálculos puros testeables + dibujo en canvas que lee las CSS vars vigentes.

import type { Course, JobOffer } from "../types";

export interface WeekItem {
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string;   // HH:MM
  label: string;
  sub?: string;
  color: string;
}

/** Lunes..domingo de la semana que contiene `today`. */
export function weekDates(today: string): string[] {
  const base = new Date(today + "T12:00:00");
  const dow = (base.getDay() + 6) % 7; // 0 = lunes
  const mon = new Date(base);
  mon.setDate(base.getDate() - dow);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
}

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Fracción del día 0..1. */
export function fracOfDay(t: string): number {
  return Math.min(1, Math.max(0, toMin(t) / 1440));
}

/** Clases (cursos no archivados en su lapso) + turnos contratados visibles, para esas fechas. */
export function collectWeekItems(courses: Course[], jobs: JobOffer[], dates: string[]): WeekItem[] {
  const out: WeekItem[] = [];
  for (const ds of dates) {
    const dow = new Date(ds + "T12:00:00").getDay();
    for (const c of courses) {
      if (c.status === "archivado") continue;
      if (c.startDate && ds < c.startDate) continue;
      if (c.endDate && ds > c.endDate) continue;
      for (const s of c.schedule || []) {
        if (s.dayOfWeek !== dow) continue;
        out.push({ date: ds, start: s.startTime, end: s.endTime, label: `${c.code}`, sub: s.location, color: c.color });
      }
    }
    for (const j of jobs) {
      if (!j.hiredStart || j.showInCalendar === false) continue;
      if (ds < j.hiredStart) continue;
      if (j.hiredEnd && ds > j.hiredEnd) continue;
      for (const s of j.schedule || []) {
        if (s.dayOfWeek !== dow) continue;
        out.push({ date: ds, start: s.startTime, end: s.endTime, label: `💼 ${j.company}`, sub: j.position, color: "#b45309" });
      }
    }
  }
  return out;
}

export interface ThemeSnap {
  bg: string; surface: string; border: string; text: string; muted: string;
  font: string;
}

export function readTheme(): ThemeSnap {
  const cs = getComputedStyle(document.documentElement);
  const g = (k: string, fb: string) => (cs.getPropertyValue(k) || "").trim() || fb;
  return {
    bg: g("--bg", "#111111"),
    surface: g("--surface", "#1c1c1c"),
    border: g("--border", "#333333"),
    text: g("--text", "#ffffff"),
    muted: g("--text-muted", "#aaaaaa"),
    font: getComputedStyle(document.body).fontFamily || "system-ui, sans-serif",
  };
}

/** Dibuja y descarga el PNG. Rango horario dinámico según los ítems (mín 8h). */
export function drawWeekPng(title: string, dates: string[], items: WeekItem[], th: ThemeSnap): void {
  const DAY_W = 148, HEAD_H = 64, HOUR_H = 34, LEFT_W = 56;
  const allMin = items.map(i => toMin(i.start));
  const allMax = items.map(i => toMin(i.end));
  let h0 = allMin.length ? Math.max(0, Math.min(...allMin) - 60) : 7 * 60;
  let h1 = allMax.length ? Math.min(1440, Math.max(...allMax) + 60) : 22 * 60;
  if (h1 - h0 < 8 * 60) { const mid = (h0 + h1) / 2; h0 = Math.max(0, mid - 240); h1 = Math.min(1440, mid + 240); }
  const W = LEFT_W + DAY_W * 7 + 16;
  const H = HEAD_H + Math.ceil((h1 - h0) / 60) * HOUR_H + 16;
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const cv = document.createElement("canvas");
  cv.width = W * 2; cv.height = H * 2;
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  ctx.scale(2, 2);
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.font = `700 17px ${th.font}`;
  ctx.fillStyle = th.text;
  ctx.fillText(title, 14, 26);
  ctx.font = `12px ${th.font}`;
  ctx.fillStyle = th.muted;
  ctx.fillText(`${dates[0]} → ${dates[6]} • Spark`, 14, 46);

  const yOf = (mins: number) => HEAD_H + ((mins - h0) / 60) * HOUR_H;
  ctx.strokeStyle = th.border;
  ctx.fillStyle = th.muted;
  ctx.font = `10px ${th.font}`;
  for (let m = Math.ceil(h0 / 60) * 60; m <= h1; m += 60) {
    const y = yOf(m);
    ctx.beginPath(); ctx.moveTo(LEFT_W, y); ctx.lineTo(W - 8, y); ctx.stroke();
    ctx.fillText(`${String(Math.floor(m / 60)).padStart(2, "0")}:00`, 8, y + 3);
  }
  dates.forEach((ds, i) => {
    const x = LEFT_W + i * DAY_W;
    ctx.fillStyle = th.text;
    ctx.font = `700 12px ${th.font}`;
    ctx.fillText(`${days[i]} ${ds.slice(8)}/${ds.slice(5, 7)}`, x + 6, HEAD_H - 26);
    ctx.strokeStyle = th.border;
    ctx.beginPath(); ctx.moveTo(x, HEAD_H - 12); ctx.lineTo(x, H - 8); ctx.stroke();
  });

  for (const it of items) {
    const i = dates.indexOf(it.date);
    if (i < 0) continue;
    const x = LEFT_W + i * DAY_W + 3;
    const y = yOf(toMin(it.start));
    const h = Math.max(16, yOf(toMin(it.end)) - y);
    ctx.fillStyle = it.color;
    ctx.beginPath();
    (ctx as any).roundRect ? (ctx as any).roundRect(x, y, DAY_W - 6, h, 6) : ctx.rect(x, y, DAY_W - 6, h);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 11px ${th.font}`;
    ctx.fillText(it.label.slice(0, 20), x + 6, y + 15, DAY_W - 18);
    if (h > 30) {
      ctx.font = `10px ${th.font}`;
      ctx.fillText(`${it.start}-${it.end}${it.sub ? ` ${it.sub}` : ""}`.slice(0, 24), x + 6, y + 29, DAY_W - 18);
    }
  }

  const a = document.createElement("a");
  a.href = cv.toDataURL("image/png");
  a.download = `horario_${dates[0]}.png`;
  a.click();
}

/** Flujo completo: semana actual + tema vigente → PNG. */
export function exportWeekPng(courses: Course[], jobs: JobOffer[]): void {
  const today = new Date();
  const ds = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const dates = weekDates(ds);
  const items = collectWeekItems(courses, jobs, dates);
  if (!items.length) { alert("Sin clases ni turnos esta semana."); return; }
  drawWeekPng("Mi semana", dates, items, readTheme());
}
