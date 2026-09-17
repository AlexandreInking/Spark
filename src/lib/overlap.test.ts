import { describe, it, expect } from "vitest";
import { courseScheduleOverlaps } from "./overlap";
import type { Course } from "../types";

function mkCourse(over: Partial<Course>): Course {
  return {
    id: over.id || "c1",
    userId: "u1",
    name: "Test",
    code: over.code || "TST-101",
    color: "#000",
    credits: 3,
    semester: over.semester || "2026-1",
    professor: "Prof",
    schedule: over.schedule || [],
    links: [],
    credentials: [],
    status: "activo",
    startDate: over.startDate,
    endDate: over.endDate,
    createdAt: new Date().toISOString(),
    ...over,
  } as Course;
}

describe("courseScheduleOverlaps por módulos", ()=>{
  it("no alerta si semestres distintos", ()=>{
    const a = mkCourse({ id:"a", semester:"2026-1", schedule:[{ id:"s1", dayOfWeek:1, startTime:"19:00", endTime:"22:00", location:"A1" } as any] });
    const b = mkCourse({ id:"b", semester:"2026-2", schedule:[{ id:"s2", dayOfWeek:1, startTime:"19:00", endTime:"22:00", location:"A1" } as any] });
    expect(courseScheduleOverlaps([a,b])).toHaveLength(0);
  });
  it("alerta si mismo lapso y mismo horario", ()=>{
    const a = mkCourse({ id:"a", semester:"2026-1", startDate:"2026-03-01", endDate:"2026-06-01", schedule:[{ id:"s1", dayOfWeek:1, startTime:"19:00", endTime:"22:00", location:"A1" } as any] });
    const b = mkCourse({ id:"b", semester:"2026-1", startDate:"2026-03-01", endDate:"2026-06-01", schedule:[{ id:"s2", dayOfWeek:1, startTime:"19:30", endTime:"22:30", location:"A1" } as any] });
    expect(courseScheduleOverlaps([a,b]).length).toBeGreaterThan(0);
  });
  it("no alerta si lapsos no se solapan aunque mismo horario", ()=>{
    const a = mkCourse({ id:"a", startDate:"2026-01-01", endDate:"2026-02-01", semester:"2026-1", schedule:[{ id:"s1", dayOfWeek:1, startTime:"19:00", endTime:"22:00", location:"A1" } as any] });
    const b = mkCourse({ id:"b", startDate:"2026-03-01", endDate:"2026-04-01", semester:"2026-1", schedule:[{ id:"s2", dayOfWeek:1, startTime:"19:00", endTime:"22:00", location:"A1" } as any] });
    expect(courseScheduleOverlaps([a,b])).toHaveLength(0);
  });
});
