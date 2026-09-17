import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db";
import type { Course } from "../types";

// Fallback localStorage: db.ts usa localStorage cuando Tauri SQL no está disponible.
// En vitest/jsdom no hay Tauri, así que getDb() -> null y se usa LS.
function fullCourse(over: Partial<Course> = {}): Course {
  return {
    id: "c-full-1",
    userId: "u1",
    name: "Cálculo I",
    code: "MAT-101",
    color: "#0ea5e9",
    credits: 4,
    semester: "2026-1",
    professor: "Dr. Pérez",
    professorEmail: "perez@uni.edu",
    classroom: "Aula 305",
    schedule: [{ id: "s1", dayOfWeek: 1, startTime: "08:00", endTime: "10:00", location: "Aula 101", type: "teorica" } as any],
    links: [{ id: "l1", label: "Zoom", url: "https://zoom.us/j/123", kind: "clase_virtual" } as any],
    credentials: [{ id: "c1", label: "Moodle", username: "alu123", password: "secreto" } as any],
    attachments: [{ id: "a1", name: "Clase 3", mime: "enlace", kind: "enlace", fileType: "video", url: "https://drive.google.com/x", createdAt: new Date().toISOString() } as any],
    weighting: [{ id: "w1", item: "Parcial 1", weight: 30, maxScore: 100 } as any],
    status: "activo",
    startDate: "2026-03-01",
    endDate: "2026-07-01",
    minPassingGrade: 10.5,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe("db fallback localStorage: curso completo persiste", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("crear: guarda todos los campos, no solo obligatorios", async () => {
    await db.saveCourse(fullCourse());
    const list = await db.listCourses("u1");
    expect(list).toHaveLength(1);
    const c = list[0];
    expect(c.name).toBe("Cálculo I");
    expect(c.code).toBe("MAT-101");
    expect(c.professor).toBe("Dr. Pérez");
    // resto de datos (antes se perdían por mapCourseRow sobre objeto camelCase)
    expect(c.professorEmail).toBe("perez@uni.edu");
    expect(c.classroom).toBe("Aula 305");
    expect(c.credits).toBe(4);
    expect(c.semester).toBe("2026-1");
    expect(c.startDate).toBe("2026-03-01");
    expect(c.endDate).toBe("2026-07-01");
    expect(c.minPassingGrade).toBe(10.5);
    expect(c.schedule).toHaveLength(1);
    expect(c.links).toHaveLength(1);
    expect(c.credentials).toHaveLength(1);
    expect(c.attachments).toHaveLength(1);
    expect(c.attachments[0].fileType).toBe("video");
    expect(c.attachments[0].url).toBe("https://drive.google.com/x");
    expect(c.weighting).toHaveLength(1);
  });

  it("editar: los cambios en resto de campos persisten", async () => {
    await db.saveCourse(fullCourse());
    const [orig] = await db.listCourses("u1");
    const edited: Course = {
      ...orig,
      professorEmail: "nuevo@uni.edu",
      classroom: "Lab 2",
      credits: 5,
      schedule: [...orig.schedule, { id: "s2", dayOfWeek: 3, startTime: "10:00", endTime: "12:00", location: "Lab 2", type: "practica" } as any],
    };
    await db.saveCourse(edited);
    const [after] = await db.listCourses("u1");
    expect(after.professorEmail).toBe("nuevo@uni.edu");
    expect(after.classroom).toBe("Lab 2");
    expect(after.credits).toBe(5);
    expect(after.schedule).toHaveLength(2);
    // obligatorios intactos
    expect(after.name).toBe("Cálculo I");
    expect(after.code).toBe("MAT-101");
  });
});
