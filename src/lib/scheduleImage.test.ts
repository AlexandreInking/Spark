import { describe, it, expect } from "vitest";
import { collectWeekItems, fracOfDay, weekDates } from "./scheduleImage";
import type { Course } from "../types";

describe("horario PNG (v1.6.0)", () => {
  it("weekDates: lunes..domingo conteniendo el día", () => {
    // 2026-09-10 es jueves
    expect(weekDates("2026-09-10")).toEqual([
      "2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10",
      "2026-09-11", "2026-09-12", "2026-09-13",
    ]);
    // domingo sigue en su semana
    expect(weekDates("2026-09-13")[0]).toBe("2026-09-07");
  });
  it("fracOfDay", () => {
    expect(fracOfDay("00:00")).toBe(0);
    expect(fracOfDay("12:00")).toBe(0.5);
    expect(fracOfDay("23:59")).toBeLessThanOrEqual(1);
  });
  it("collectWeekItems respeta lapso, archivados y ventana de contrato", () => {
    const courses = [{
      id: "c", userId: "u", name: "N", code: "MAT", color: "#000", credits: 3,
      semester: "s", professor: "p", schedule: [{ id: "s1", dayOfWeek: 1, startTime: "08:00", endTime: "10:00", location: "A" }],
      links: [], credentials: [], attachments: [], status: "activo",
      startDate: "2026-09-07", endDate: "2026-12-01", createdAt: "",
    } as Course];
    const jobs: any[] = [{
      hiredStart: "2026-09-01", hiredEnd: "2026-09-08", showInCalendar: true,
      company: "ACME", position: "X",
      schedule: [{ id: "j1", dayOfWeek: 2, startTime: "18:00", endTime: "22:00" }],
    }];
    const items = collectWeekItems(courses, jobs, weekDates("2026-09-10"));
    expect(items.some(i => i.label === "MAT" && i.date === "2026-09-07")).toBe(true);
    // turno martes 08 dentro de contrato; martes 15 fuera
    expect(items.some(i => i.date === "2026-09-08" && i.label.includes("ACME"))).toBe(true);
    expect(items.some(i => i.date === "2026-09-15")).toBe(false);
  });
});
