import { describe, it, expect } from "vitest";
import { autoProgress, boardRules, ganttBars, ganttRange, isDueSoon, isOverdue, shouldAutoDone, wipExceeded } from "./projectDates";
import type { ProjectBoard, ProjectCard } from "../types";

function mkCard(over: Partial<ProjectCard> = {}): ProjectCard {
  return {
    id: "k1", boardId: "b1", columnId: "c1", title: "Tarea", labels: [], assignees: [],
    progress: 0, checklist: [], position: 0, createdAt: "", ...over,
  };
}

describe("gantt (v1.2.0)", () => {
  it("rango con márgenes y mínimo 14 días", () => {
    const r = ganttRange([mkCard({ startDate: "2026-09-10", dueDate: "2026-09-12" })], "2026-09-06");
    expect(r.from < "2026-09-10").toBe(true);
    expect(r.to > "2026-09-12").toBe(true);
  });
  it("sin fechas: ventana por defecto de 15 días", () => {
    const r = ganttRange([mkCard()], "2026-09-06");
    expect(r.from).toBe("2026-09-03");
    expect(r.to).toBe("2026-09-17");
  });
  it("barras en % y overdue", () => {
    const bars = ganttBars([
      mkCard({ id: "a", startDate: "2026-09-01", dueDate: "2026-09-10", progress: 50 }),
      mkCard({ id: "b", startDate: "2026-08-01", dueDate: "2026-08-05", progress: 10 }),
    ], "2026-09-01", "2026-09-30", "2026-09-06");
    expect(bars).toHaveLength(2);
    expect(bars[0].leftPct).toBe(0);
    expect(bars[0].widthPct).toBeGreaterThan(0);
    const old = bars.find(b => b.id === "b")!;
    expect(old.overdue).toBe(true);
  });
  it("autoDone solo con checklist completo no vacío", () => {
    expect(shouldAutoDone(mkCard())).toBe(false);
    expect(shouldAutoDone(mkCard({ checklist: [{ id: "1", text: "a", done: true }] }))).toBe(true);
    expect(shouldAutoDone(mkCard({ checklist: [{ id: "1", text: "a", done: false }] }))).toBe(false);
  });
});

describe("reglas locales (v1.3.0)", () => {
  const board = (over: Partial<ProjectBoard> = {}): ProjectBoard =>
    ({ id: "b", userId: "u", name: "B", columns: [], createdAt: "", ...over });
  it("boardRules respeta legacy autoDone", () => {
    expect(boardRules(board({ autoDone: true })).autoDone).toBe(true);
    expect(boardRules(board({ rules: { autoProgress: true } })).autoDone).toBe(false);
    expect(boardRules(board({ rules: { autoProgress: true } })).autoProgress).toBe(true);
  });
  it("autoProgress es % checklist", () => {
    expect(autoProgress(mkCard())).toBeNull();
    expect(autoProgress(mkCard({ checklist: [{ id: "1", text: "a", done: true }, { id: "2", text: "b", done: false }] }))).toBe(50);
  });
  it("overdue y dueSoon", () => {
    expect(isOverdue(mkCard({ dueDate: "2026-09-01", progress: 10 }), "2026-09-06")).toBe(true);
    expect(isOverdue(mkCard({ dueDate: "2026-09-01", progress: 100 }), "2026-09-06")).toBe(false);
    expect(isDueSoon(mkCard({ dueDate: "2026-09-08" }), "2026-09-06")).toBe(true);
    expect(isDueSoon(mkCard({ dueDate: "2026-09-20" }), "2026-09-06")).toBe(false);
  });
  it("wipExceeded", () => {
    expect(wipExceeded({ id: "c", title: "X", wip: 2 }, 3)).toBe(true);
    expect(wipExceeded({ id: "c", title: "X", wip: 2 }, 2)).toBe(false);
    expect(wipExceeded({ id: "c", title: "X" }, 99)).toBe(false);
  });
});
