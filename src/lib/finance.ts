// Finanzas personales (v0.7.0) — 100% puro.
// - Recurrencias expandidas por rango (none/semanal/quincenal/mensual).
// - Totales confirmados del mes + proyectado (trabajos estimados, bonos con fecha, pagos pendientes).

import type { Debt, JobOffer, MoneyTransaction, TxCategory } from "../types";
import { isHired, jobPhase, monthlyEstimate } from "./jobScore";

export function monthStart(ym: string): string { return `${ym}-01`; }

export function monthEnd(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${ym}-${String(last).padStart(2, "0")}`;
}

function addDaysISO(ds: string, n: number): string {
  const d = new Date(ds + "T12:00:00");
  d.setDate(d.getDate() + n);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function addMonthISO(ds: string): string {
  const d = new Date(ds + "T12:00:00");
  const day = d.getDate();
  d.setMonth(d.getMonth() + 1);
  if (d.getDate() < day) d.setDate(0);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Ocurrencias (YYYY-MM-DD) de una transacción dentro de [from, to]. */
export function occurrencesInRange(tx: MoneyTransaction, from: string, to: string): string[] {
  if (!tx.date) return [];
  if (tx.recurring === "none") {
    return tx.date >= from && tx.date <= to ? [tx.date] : [];
  }
  const step = tx.recurring === "semanal" ? 7 : tx.recurring === "quincenal" ? 14 : 0;
  const out: string[] = [];
  if (step > 0) {
    let cur = tx.date;
    for (let i = 0; i < 500 && cur <= to; i++) {
      if (cur >= from) out.push(cur);
      const nx = addDaysISO(cur, step);
      if (nx <= cur) break;
      cur = nx;
    }
    return out;
  }
  // mensual: mismo día de mes (ajustado a fin de mes si no existe)
  let cur = tx.date;
  // avanzar hasta alcanzar el rango
  for (let i = 0; i < 500 && cur < from; i++) {
    const nx = addMonthISO(cur);
    if (nx <= cur) break;
    cur = nx;
  }
  for (let i = 0; i < 60 && cur <= to; i++) {
    if (cur >= from) out.push(cur);
    const nx = addMonthISO(cur);
    if (nx <= cur) break;
    cur = nx;
  }
  return out;
}

/** Totales confirmados del mes YYYY-MM (expande recurrencias). */
export function monthTotals(txs: MoneyTransaction[], ym: string): { income: number; expense: number; balance: number; count: number } {
  const from = monthStart(ym), to = monthEnd(ym);
  let income = 0, expense = 0, count = 0;
  for (const t of txs) {
    const n = occurrencesInRange(t, from, to).length;
    if (!n) continue;
    count += n;
    if (t.kind === "ingreso") income += t.amount * n;
    else expense += t.amount * n;
  }
  return { income, expense, balance: income - expense, count };
}

export interface ProjectionLine { label: string; sub: string; amount: number; }

/** Ingreso proyectado del mes desde trabajos contratados vigentes/próximos (estimado) + bonos con fecha. */
export function projectedJobIncome(jobs: JobOffer[], ym: string): ProjectionLine[] {
  const lines: ProjectionLine[] = [];
  for (const o of jobs.filter(isHired)) {
    if (jobPhase(o, monthEnd(ym)) === "past" && (!o.hiredEnd || o.hiredEnd < monthStart(ym))) continue;
    const est = monthlyEstimate(o);
    if (est !== null && est > 0) {
      lines.push({ label: `${o.company} — ${o.position}`, sub: o.salaryPeriod === "evento" ? "evento (aprox)" : "estimado mensual", amount: est });
    }
    for (const b of o.bonuses || []) {
      if (b.date && b.date >= monthStart(ym) && b.date <= monthEnd(ym)) {
        lines.push({ label: `Bono ${o.company} (${b.concept})`, sub: b.date, amount: b.amount });
      }
    }
  }
  return lines;
}

/** Egresos pendientes del mes desde recordatorios de pago no pagados con monto. */
export function pendingBills(reminders: { type: string; paid?: boolean; amount?: number; title: string; dueDate: string }[], ym: string): ProjectionLine[] {
  return reminders
    .filter(r => r.type === "pago" && !r.paid && (r.amount || 0) > 0 && r.dueDate >= monthStart(ym) && r.dueDate <= monthEnd(ym))
    .map(r => ({ label: r.title, sub: r.dueDate, amount: r.amount || 0 }));
}

// --- Gráficos y deudas (v0.7.1, puro, sin librerías) ---

const SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Últimos n meses incluyendo ym, ascendente: ["2026-04", ...]. */
export function lastMonths(ym: string, n: number): string[] {
  const [y, m] = ym.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${SHORT[m - 1]} ${String(y).slice(2)}`;
}

export interface MonthPoint { ym: string; label: string; income: number; expense: number; balance: number; }

/** Serie mensual confirmada para gráficos de salud económica. */
export function monthlySeries(txs: MoneyTransaction[], ym: string, n: number): MonthPoint[] {
  return lastMonths(ym, n).map(m => {
    const t = monthTotals(txs, m);
    return { ym: m, label: monthLabel(m), income: t.income, expense: t.expense, balance: t.balance };
  });
}

/** Gasto del mes por categoría (expande recurrencias), descendente. */
export function expenseByCategory(txs: MoneyTransaction[], ym: string): { category: TxCategory; total: number }[] {
  const from = monthStart(ym), to = monthEnd(ym);
  const acc = new Map<TxCategory, number>();
  for (const t of txs) {
    if (t.kind !== "gasto") continue;
    const n = occurrencesInRange(t, from, to).length;
    if (!n) continue;
    acc.set(t.category, (acc.get(t.category) || 0) + t.amount * n);
  }
  return Array.from(acc.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Progreso de una deuda: pagado = suma de gastos vinculados ocurridos hasta hoy (los futuros no cuentan). */
export function debtProgress(debt: Debt, txs: MoneyTransaction[], today = todayISO()): { paid: number; remaining: number; done: boolean } {
  const paid = txs
    .filter(t => t.debtId === debt.id && t.kind === "gasto")
    .reduce((s, t) => {
      if (t.recurring === "none") return s + (t.date <= today ? t.amount : 0);
      return s + t.amount * occurrencesInRange(t, t.date, today).length;
    }, 0);
  const remaining = Math.max(0, debt.total - paid);
  return { paid, remaining, done: remaining <= 0 };
}

/** Deuda total pendiente (suma de restantes). */
export function totalDebtPending(debts: Debt[], txs: MoneyTransaction[]): { pending: number; count: number } {
  let pending = 0, count = 0;
  for (const d of debts) {
    const p = debtProgress(d, txs);
    if (!p.done) { pending += p.remaining; count++; }
  }
  return { pending, count };
}
