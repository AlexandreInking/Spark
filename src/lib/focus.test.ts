import { describe, it, expect } from "vitest";
import { formatClock, getPreset, nextPhase, pickBreak, streakDays } from "./focus";

describe("focus presets y fases", () => {
  it("pomodoro: largo cada 4", () => {
    const p = getPreset("pomodoro");
    expect(nextPhase(p, 2, "focus")).toEqual({ kind: "break", minutes: 5 });
    expect(nextPhase(p, 3, "focus")).toEqual({ kind: "long", minutes: 15 });
    expect(nextPhase(p, 3, "break")).toEqual({ kind: "focus", minutes: 25 });
  });
  it("ritmo52 sin largo práctico", () => {
    const p = getPreset("ritmo52");
    expect(nextPhase(p, 0, "focus")).toEqual({ kind: "break", minutes: 17 });
  });
  it("formatClock", () => {
    expect(formatClock(1500)).toBe("25:00");
    expect(formatClock(61)).toBe("01:01");
    expect(formatClock(-5)).toBe("00:00");
  });
  it("pickBreak determinista", () => {
    expect(pickBreak(3)).toEqual(pickBreak(3));
  });
});

describe("streakDays", () => {
  it("3 días seguidos hasta hoy", () => {
    expect(streakDays(["2026-09-04", "2026-09-05", "2026-09-06"], "2026-09-06")).toBe(3);
  });
  it("hoy vacío pero ayer sí: mantiene sin sumar", () => {
    expect(streakDays(["2026-09-04", "2026-09-05"], "2026-09-06")).toBe(2);
  });
  it("hueco rompe racha", () => {
    expect(streakDays(["2026-09-01", "2026-09-06"], "2026-09-06")).toBe(1);
  });
  it("sin sesiones = 0", () => {
    expect(streakDays([], "2026-09-06")).toBe(0);
  });
});
