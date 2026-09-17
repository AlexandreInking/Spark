import { describe, it, expect } from "vitest";
import { compatibilityScore, monthlyEstimate, rankOffers, DEFAULT_WEIGHTS, isHired, jobPhase, nextPayDates, buildSlotsForDays, upcomingDatedBonuses } from "./jobScore";
import type { Course, JobOffer } from "../types";

function mkCourse(over: Partial<Course> = {}): Course {
  return {
    id: "c1", userId: "u1", name: "Cálculo", code: "MAT-101", color: "#000",
    credits: 3, semester: "2026-1", professor: "P",
    schedule: [{ id: "s1", dayOfWeek: 1, startTime: "08:00", endTime: "10:00", location: "A1" } as any],
    links: [], credentials: [], status: "activo", createdAt: new Date().toISOString(),
    ...over,
  } as Course;
}

function mkOffer(over: Partial<JobOffer> = {}): JobOffer {
  return {
    id: "o1", userId: "u1", company: "ACME", position: "Asistente",
    type: "parcial", modality: "presencial", schedule: [], bonuses: [],
    salaryPeriod: "mes", status: "guardada", createdAt: new Date().toISOString(),
    ...over,
  };
}

describe("compatibilityScore", () => {
  it("sin horario declarado no penaliza", () => {
    const { score, clashes } = compatibilityScore(mkOffer(), [mkCourse()]);
    expect(score).toBe(100);
    expect(clashes).toHaveLength(0);
  });
  it("detecta choque mismo día y penaliza", () => {
    const o = mkOffer({ schedule: [{ id: "j1", dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }] });
    const { score, clashes } = compatibilityScore(o, [mkCourse()]);
    expect(clashes).toHaveLength(1);
    expect(clashes[0].courseCode).toBe("MAT-101");
    expect(score).toBe(75);
  });
  it("horario sin traslape = 100", () => {
    const o = mkOffer({ schedule: [{ id: "j1", dayOfWeek: 1, startTime: "14:00", endTime: "18:00" }] });
    expect(compatibilityScore(o, [mkCourse()]).score).toBe(100);
  });
});

describe("monthlyEstimate", () => {
  it("mes directo", () => {
    expect(monthlyEstimate(mkOffer({ salaryMin: 1000, salaryMax: 1200, salaryPeriod: "mes" }))).toBe(1100);
  });
  it("hora × horas semanales × 4.33", () => {
    const o = mkOffer({
      salaryMin: 10, salaryPeriod: "hora",
      schedule: [{ id: "j1", dayOfWeek: 1, startTime: "09:00", endTime: "13:00" }], // 4h/sem
    });
    expect(monthlyEstimate(o)).toBeCloseTo(10 * 4 * 4.33, 5);
  });
  it("sin sueldo = null", () => {
    expect(monthlyEstimate(mkOffer())).toBeNull();
  });
});

describe("rankOffers", () => {
  it("ordena por total y sueldo relativo al mejor", () => {
    const a = mkOffer({ id: "a", company: "Bajo", salaryMin: 500, salaryPeriod: "mes" });
    const b = mkOffer({ id: "b", company: "Alto", salaryMin: 1500, salaryPeriod: "mes" });
    const ranked = rankOffers([a, b], [], DEFAULT_WEIGHTS);
    expect(ranked[0].offer.id).toBe("b");
    expect(ranked[0].score.salary).toBe(100);
    expect(ranked[1].score.salary).toBeCloseTo(500 / 1500 * 100, 5);
  });
  it("pesos en cero no rompen (fallback divisor 1)", () => {
    const ranked = rankOffers([mkOffer()], [], { salary: 0, compatibility: 0, modality: 0, growth: 0 });
    expect(Number.isFinite(ranked[0].score.total)).toBe(true);
  });
});

describe("historial laboral (v0.6.1)", () => {
  it("isHired solo con hiredStart", () => {
    expect(isHired(mkOffer())).toBe(false);
    expect(isHired(mkOffer({ hiredStart: "2026-01-10" }))).toBe(true);
  });
  it("jobPhase pasado/vigente/futuro", () => {
    expect(jobPhase(mkOffer({ hiredStart: "2020-01-01", hiredEnd: "2020-06-01" }), "2026-09-06")).toBe("past");
    expect(jobPhase(mkOffer({ hiredStart: "2026-01-01" }), "2026-09-06")).toBe("current");
    expect(jobPhase(mkOffer({ hiredStart: "2026-12-01" }), "2026-09-06")).toBe("upcoming");
  });
  it("nextPayDates unico futuro vs pasado", () => {
    expect(nextPayDates(mkOffer({ payDate: "2026-09-10" }), "2026-09-06")).toEqual(["2026-09-10"]);
    expect(nextPayDates(mkOffer({ payDate: "2026-09-01" }), "2026-09-06")).toEqual([]);
  });
  it("nextPayDates semanal avanza hasta futuro", () => {
    const ds = nextPayDates(mkOffer({ payDate: "2026-08-01", payRecurrence: "semanal" }), "2026-09-06", 2);
    expect(ds).toHaveLength(2);
    expect(ds[0] >= "2026-09-06").toBe(true);
  });
  it("nextPayDates mensual respeta fin de mes", () => {
    const ds = nextPayDates(mkOffer({ payDate: "2026-01-31", payRecurrence: "mensual" }), "2026-01-31", 2);
    expect(ds[0]).toBe("2026-01-31");
    expect(ds[1]).toBe("2026-02-28");
  });
});

describe("horario multi-día y bonos (v0.6.2)", () => {
  it("buildSlotsForDays crea un slot por día, ordenados y sin duplicados", () => {
    const slots = buildSlotsForDays([5, 1, 3, 1], "09:00", "13:00");
    expect(slots.map(s => s.dayOfWeek)).toEqual([1, 3, 5]);
    expect(slots[0].startTime).toBe("09:00");
  });
  it("buildSlotsForDays rechaza rango inválido", () => {
    expect(buildSlotsForDays([1], "13:00", "09:00")).toEqual([]);
    expect(buildSlotsForDays([], "09:00", "13:00")).toEqual([]);
  });
  it("upcomingDatedBonuses solo futuros con fecha, ordenados", () => {
    const o = mkOffer({
      bonuses: [
        { id: "b1", month: "2026-08", amount: 100, concept: "asistencia", date: "2026-08-30" },
        { id: "b2", month: "2026-09", amount: 200, concept: "rendimiento", date: "2026-09-30" },
        { id: "b3", month: "2026-10", amount: 150, concept: "otro" },
      ],
    });
    const up = upcomingDatedBonuses(o, "2026-09-06");
    expect(up.map(x => x.bonus.id)).toEqual(["b2"]);
  });
});
