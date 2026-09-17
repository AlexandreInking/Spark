import { describe, it, expect } from "vitest";
import { debtProgress, expenseByCategory, lastMonths, monthEnd, monthTotals, monthlySeries, occurrencesInRange, pendingBills, projectedJobIncome, totalDebtPending } from "./finance";
import type { Debt, MoneyTransaction } from "../types";

function mkTx(over: Partial<MoneyTransaction> = {}): MoneyTransaction {
  return {
    id: "t1", userId: "u1", kind: "gasto", category: "comida",
    amount: 20, date: "2026-09-05", recurring: "none",
    createdAt: new Date().toISOString(), ...over,
  };
}

describe("occurrencesInRange", () => {
  it("unico dentro/fuera", () => {
    expect(occurrencesInRange(mkTx(), "2026-09-01", "2026-09-30")).toEqual(["2026-09-05"]);
    expect(occurrencesInRange(mkTx(), "2026-10-01", "2026-10-31")).toEqual([]);
  });
  it("semanal 4-5 veces en septiembre", () => {
    const occ = occurrencesInRange(mkTx({ date: "2026-09-01", recurring: "semanal" }), "2026-09-01", "2026-09-30");
    expect(occ).toEqual(["2026-09-01", "2026-09-08", "2026-09-15", "2026-09-22", "2026-09-29"]);
  });
  it("quincenal 2 veces", () => {
    const occ = occurrencesInRange(mkTx({ date: "2026-09-01", recurring: "quincenal" }), "2026-09-01", "2026-09-30");
    expect(occ).toEqual(["2026-09-01", "2026-09-15", "2026-09-29"]);
  });
  it("mensual respeta fin de mes y mes correcto", () => {
    const occ = occurrencesInRange(mkTx({ date: "2026-01-31", recurring: "mensual" }), "2026-02-01", "2026-02-28");
    expect(occ).toEqual(["2026-02-28"]);
  });
});

describe("monthTotals", () => {
  it("suma por tipo y expande recurrentes", () => {
    const txs = [
      mkTx({ id: "a", kind: "ingreso", category: "sueldo", amount: 1000, date: "2026-09-01" }),
      mkTx({ id: "b", kind: "gasto", category: "comida", amount: 20, date: "2026-09-01", recurring: "semanal" }),
    ];
    const t = monthTotals(txs, "2026-09");
    expect(t.income).toBe(1000);
    expect(t.expense).toBe(20 * 5);
    expect(t.balance).toBe(1000 - 100);
  });
  it("monthEnd febrero bisiesto y normal", () => {
    expect(monthEnd("2024-02")).toBe("2024-02-29");
    expect(monthEnd("2026-02")).toBe("2026-02-28");
  });
});

describe("proyectado", () => {
  it("pendingBills solo pagos no pagados con monto en el mes", () => {
    const rs = [
      { type: "pago", paid: false, amount: 100, title: "Luz", dueDate: "2026-09-10" },
      { type: "pago", paid: true, amount: 50, title: "Ya", dueDate: "2026-09-11" },
      { type: "tramite", paid: false, title: "T", dueDate: "2026-09-12" },
    ];
    expect(pendingBills(rs, "2026-09")).toHaveLength(1);
  });
  it("projectedJobIncome ignora trabajos pasados", () => {
    const jobs: any[] = [
      { hiredStart: "2020-01-01", hiredEnd: "2020-06-01", salaryMin: 1000, salaryPeriod: "mes", schedule: [], bonuses: [] },
      { hiredStart: "2026-01-01", salaryMin: 500, salaryPeriod: "mes", schedule: [], bonuses: [] },
    ];
    const lines = projectedJobIncome(jobs, "2026-09");
    expect(lines).toHaveLength(1);
    expect(lines[0].amount).toBe(500);
  });
});

describe("gráficos y deudas (v0.7.1)", () => {
  it("lastMonths cruza año", () => {
    expect(lastMonths("2026-01", 3)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });
  it("monthlySeries 2 meses con totales", () => {
    const txs = [
      mkTx({ id: "a", kind: "ingreso", category: "sueldo", amount: 1000, date: "2026-08-01" }),
      mkTx({ id: "b", kind: "gasto", category: "comida", amount: 100, date: "2026-09-01" }),
    ];
    const s = monthlySeries(txs, "2026-09", 2);
    expect(s.map(p => p.ym)).toEqual(["2026-08", "2026-09"]);
    expect(s[0].balance).toBe(1000);
    expect(s[1].balance).toBe(-100);
  });
  it("expenseByCategory agrupa y ordena", () => {
    const txs = [
      mkTx({ id: "a", category: "comida", amount: 50, date: "2026-09-01" }),
      mkTx({ id: "b", category: "transporte", amount: 10, date: "2026-09-01", recurring: "semanal" }),
    ];
    const r = expenseByCategory(txs, "2026-09");
    expect(r[0]).toEqual({ category: "comida", total: 50 });
    expect(r[1]).toEqual({ category: "transporte", total: 50 });
  });
  it("debtProgress suma pagos vinculados hasta hoy (futuros no cuentan)", () => {
    const debt: Debt = { id: "d1", userId: "u1", creditor: "Banco", total: 500, createdAt: "" };
    const txs = [
      mkTx({ id: "p1", category: "deudas", amount: 200, debtId: "d1", date: "2026-09-05" }),
      // semanal desde 01-ago: 01,08,15,22,29-ago + 05-sep = 6 cuotas hasta el 06-sep
      mkTx({ id: "p2", category: "deudas", amount: 50, debtId: "d1", date: "2026-08-01", recurring: "semanal" }),
      mkTx({ id: "x", category: "comida", amount: 999 }),
      mkTx({ id: "f", category: "deudas", amount: 1000, debtId: "d1", date: "2026-12-01" }),
    ];
    const p = debtProgress(debt, txs, "2026-09-06");
    expect(p.paid).toBe(200 + 50 * 6);
    expect(p.remaining).toBe(0);
    expect(p.done).toBe(true);
  });
  it("totalDebtPending ignora pagadas", () => {
    const debts: Debt[] = [
      { id: "d1", userId: "u1", creditor: "A", total: 300, createdAt: "" },
      { id: "d2", userId: "u1", creditor: "B", total: 100, createdAt: "" },
    ];
    const txs = [mkTx({ id: "p", category: "deudas", amount: 100, debtId: "d2" })];
    expect(totalDebtPending(debts, txs)).toEqual({ pending: 300, count: 1 });
  });
});
