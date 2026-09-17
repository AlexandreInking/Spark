import { describe, it, expect } from "vitest";
import { jobTypeConfig, validPeriodFor } from "./jobForm";

describe("formulario dinámico por tipo (v0.9.1)", () => {
  it("gig: sin helper multi-día, sin bonos, periodo evento", () => {
    const c = jobTypeConfig("gig");
    expect(c.scheduleHelper).toBe(false);
    expect(c.showBonuses).toBe(false);
    expect(c.defaultPeriod).toBe("evento");
    expect(c.deadlineLabel).toBe("Fecha del evento");
  });
  it("fijo: mensual y con bonos", () => {
    const c = jobTypeConfig("fijo");
    expect(c.salaryPeriods).toEqual(["mes"]);
    expect(c.showBonuses).toBe(true);
  });
  it("validPeriodFor corrige periodo inválido al cambiar tipo", () => {
    expect(validPeriodFor("gig", "mes")).toBe("evento");
    expect(validPeriodFor("gig", "hora")).toBe("hora");
    expect(validPeriodFor("fijo", "hora")).toBe("mes");
  });
  it("tipo desconocido cae a parcial", () => {
    expect(jobTypeConfig("x" as any).defaultPeriod).toBe("mes");
  });
});
