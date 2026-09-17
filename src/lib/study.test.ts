import { describe, it, expect } from "vitest";
import { attendanceStats, classOccurrences, smReview } from "./study";
import type { Course } from "../types";

describe("SM-2 (v1.6.0)", () => {
  it("primera bien → intervalo 1, segunda → 6", () => {
    const r1 = smReview(2.5, 0, 0, 4, "2026-09-10");
    expect(r1).toMatchObject({ reps: 1, interval: 1, nextReview: "2026-09-11" });
    const r2 = smReview(r1.ease, r1.reps, r1.interval, 4, "2026-09-11");
    expect(r2.reps).toBe(2);
    expect(r2.interval).toBe(6);
  });
  it("fallar resetea racha e intervalo", () => {
    const r = smReview(2.6, 5, 20, 0, "2026-09-10");
    expect(r.reps).toBe(0);
    expect(r.interval).toBe(1);
  });
  it("ease nunca baja de 1.3 y fácil la sube", () => {
    const low = smReview(1.3, 2, 6, 3, "2026-09-10");
    expect(low.ease).toBeGreaterThanOrEqual(1.3);
    const high = smReview(2.5, 2, 6, 5, "2026-09-10");
    expect(high.ease).toBeGreaterThan(2.5);
  });
});

describe("asistencia (v1.6.0)", () => {
  const rec = (status: "present" | "absent" | "late", n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `${status}${i}`, userId: "u", courseId: "c", date: "2026-09-01", slotId: "s", status, createdAt: "" }));
  it("tardanza = media falta; riesgo al 70% del límite", () => {
    // 7 ausencias + 0 tardanzas en 10 → 70% del límite 100? usemos límite 80: 70/80=87.5% → atRisk
    const s = attendanceStats([...rec("absent", 7), ...rec("present", 3)] as any, 80);
    expect(s.pctAbsent).toBeCloseTo(70, 5);
    expect(s.atRisk).toBe(true);
    expect(s.failed).toBe(false);
  });
  it("límite alcanzado = failed; sin datos no juzga", () => {
    expect(attendanceStats([...rec("absent", 3), ...rec("present", 7)] as any, 30).failed).toBe(true);
    expect(attendanceStats([], 30)).toEqual(expect.objectContaining({ pctAbsent: 0, failed: false, atRisk: false }));
  });
  it("occurrences respeta días e inicio/fin", () => {
    const c = {
      id: "c", startDate: "2026-09-07", endDate: "2026-09-30",
      schedule: [{ id: "s1", dayOfWeek: 1, startTime: "08:00", endTime: "10:00", location: "A1" }],
    } as Course;
    const occ = classOccurrences(c, "2026-09-06", "2026-09-20");
    expect(occ.map(o => o.date)).toEqual(["2026-09-07", "2026-09-14"]);
  });
});
