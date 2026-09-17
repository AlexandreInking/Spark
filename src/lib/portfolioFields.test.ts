import { describe, it, expect } from "vitest";
import { cleanExtra, missingRequired, schemaFor } from "./portfolioFields";

describe("portfolio dinámico (v0.9.0)", () => {
  it("software pide repo (requerido), marketing no pide GitHub", () => {
    const sw = schemaFor("desarrollo_software");
    expect(sw.some(f => f.key === "repo" && f.required)).toBe(true);
    expect(schemaFor("marketing").some(f => f.key.toLowerCase().includes("github") || f.key === "repo")).toBe(false);
  });
  it("missingRequired detecta repo vacío", () => {
    expect(missingRequired("desarrollo_software", {})).toContain("Repo (GitHub/GitLab)");
    expect(missingRequired("desarrollo_software", { repo: "https://github.com/x" })).toEqual([]);
    expect(missingRequired("marketing", {})).toEqual([]);
  });
  it("cleanExtra filtra claves ajenas y vacíos", () => {
    expect(cleanExtra("marketing", { rol: "CM", repo: "https://x", metricas: "  " })).toEqual({ rol: "CM" });
  });
  it("categoría desconocida cae a otro", () => {
    expect(schemaFor("inexistente" as any).length).toBeGreaterThan(0);
  });
});
