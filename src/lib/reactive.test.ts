import { describe, it, expect } from "vitest";
import { buildReactiveRoles, contrast, rolesToVars, topColors } from "./reactive";

function img(...px: [number, number, number][]): number[] {
  const out: number[] = [];
  for (const [r, g, b] of px) out.push(r, g, b, 255);
  return out;
}

describe("reactiva (v1.4.2)", () => {
  it("topColors rankea por frecuencia", () => {
    const top = topColors(img([10, 10, 10], [10, 10, 10], [200, 0, 0]), 2);
    expect(top[0].count).toBe(2);
    expect(Math.round(top[0].color.r)).toBeLessThan(30);
  });
  it("imagen oscura → texto claro con contraste", () => {
    const top = topColors(img([5, 5, 8], [5, 5, 8], [220, 30, 40], [240, 240, 240]), 8);
    const r = buildReactiveRoles(top);
    expect(contrast(r.text, r.bg)).toBeGreaterThanOrEqual(4.5);
    expect(r.bg.r).toBeLessThan(60);
  });
  it("imagen clara → texto oscuro con contraste", () => {
    const top = topColors(img([250, 250, 250], [250, 250, 250], [20, 20, 20]), 8);
    const r = buildReactiveRoles(top);
    expect(contrast(r.text, r.bg)).toBeGreaterThanOrEqual(4.5);
  });
  it("acento = color saturado (no gris)", () => {
    const top = topColors(img([10, 10, 10], [10, 10, 10], [10, 10, 10], [230, 20, 40]), 8);
    const r = buildReactiveRoles(top);
    expect(r.accent.r).toBeGreaterThan(150);
  });
  it("rolesToVars cubre las 11 vars", () => {
    const top = topColors(img([1, 2, 3]), 8);
    const vars = rolesToVars(buildReactiveRoles(top), "dark");
    for (const k of ["--bg", "--surface", "--surface-2", "--border", "--text", "--text-muted", "--text-faint", "--accent", "--accent-2", "--primary", "--primary-hover"]) {
      expect(vars[k]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
