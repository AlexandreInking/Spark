import { describe, it, expect } from "vitest";
import { hasActivityInDays, isActiveCourse, nextActivityInDays } from "./activeCourses";
import type { Course, Deliverable } from "../types";

function mkCourse(over: Partial<Course> = {}): Course {
  return {
    id: "c1", userId: "u1", name: "T", code: "T-1", color: "#000", credits: 3,
    semester: "2026-1", professor: "P", schedule: [], links: [], credentials: [],
    attachments: [], status: "activo", createdAt: "", ...over,
  } as Course;
}

function mkDel(over: Partial<Deliverable> = {}): Deliverable {
  return {
    id: "d1", courseId: "c1", type: "tarea", title: "T", dueDate: "2026-09-10",
    dueTime: "23:59", status: "pendiente", priority: "media", tags: [],
    reminderMinutesBefore: 60, createdAt: "", ...over,
  } as Deliverable;
}

// hoy fijo: domingo 2026-09-06
const TODAY = "2026-09-06";

describe("hasActivityInDays", () => {
  it("clase mañana = activo", () => {
    const c = mkCourse({ schedule: [{ id: "s", dayOfWeek: 1, startTime: "08:00", endTime: "10:00", location: "A" } as any] });
    expect(hasActivityInDays(c, [], 14, TODAY)).toBe(true);
  });
  it("curso que empieza en 30 días = inactivo en ventana 14", () => {
    const c = mkCourse({
      startDate: "2026-10-06",
      schedule: [{ id: "s", dayOfWeek: 1, startTime: "08:00", endTime: "10:00", location: "A" } as any],
    });
    expect(hasActivityInDays(c, [], 14, TODAY)).toBe(false);
    expect(hasActivityInDays(c, [], 45, TODAY)).toBe(true);
  });
  it("entrega en 5 días activa aunque sin clases", () => {
    expect(hasActivityInDays(mkCourse(), [mkDel({ dueDate: "2026-09-11" })], 14, TODAY)).toBe(true);
  });
  it("recién registrado sin nada = activo (en preparación)", () => {
    expect(hasActivityInDays(mkCourse(), [], 14, TODAY)).toBe(true);
  });
  it("curso terminado el mes pasado = inactivo", () => {
    const c = mkCourse({
      startDate: "2026-01-01", endDate: "2026-02-01",
      schedule: [{ id: "s", dayOfWeek: 1, startTime: "08:00", endTime: "10:00", location: "A" } as any],
    });
    expect(hasActivityInDays(c, [], 14, TODAY)).toBe(false);
  });
});

describe("isActiveCourse", () => {
  it("archivado nunca es activo aunque tenga clases", () => {
    const c = mkCourse({
      status: "archivado",
      schedule: [{ id: "s", dayOfWeek: 1, startTime: "08:00", endTime: "10:00", location: "A" } as any],
    });
    expect(isActiveCourse(c, [], 14, TODAY)).toBe(false);
  });
});

describe("nextActivityInDays", () => {
  it("devuelve la más próxima (lunes 07)", () => {
    const c = mkCourse({ schedule: [{ id: "s", dayOfWeek: 1, startTime: "08:00", endTime: "10:00", location: "A" } as any] });
    expect(nextActivityInDays(c, [mkDel({ dueDate: "2026-09-12" })], 14, TODAY)).toBe("2026-09-07");
  });
  it("null sin actividad", () => {
    expect(nextActivityInDays(mkCourse({ schedule: [] }), [], 14, TODAY)).toBe(null);
  });
});
