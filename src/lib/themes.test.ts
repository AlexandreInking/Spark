import { describe, it, expect, beforeEach } from "vitest";
import { THEMES, applyTheme, getTheme, loadCustom, loadFx } from "./themes";

describe("themes (v1.1.1)", () => {
  beforeEach(() => { localStorage.clear(); });

  it("30 entradas: 28 presets + reactiva + custom", () => {
    expect(THEMES).toHaveLength(30);
    expect(THEMES.map(t => t.id)).toContain("custom");
    expect(THEMES.map(t => t.id)).toContain("reactiva");
    for (const t of ["claro", "golden", "sunset", "cyberpunk", "halloween", "coquette", "biopunk",
      "christmas", "newyear", "primavera", "verano", "otono", "invierno",
      "sanrio-kitty", "sanrio-aggretsuko", "sanrio-melody", "sanrio-kuromi",
      "sanrio-cinamoroll", "sanrio-purin", "sanrio-badtz", "sanrio-keroppi",
      "sanrio-gudetama", "sanrio-fenneko", "sanrio-haida", "sanrio-washimi",
      "sanrio-gori", "sanrio-ton"]) {
      expect(THEMES.some(x => x.id === t)).toBe(true);
    }
  });
  it("labels Sanrio/[Nombre]", () => {
    expect(getTheme("sanrio-melody").label).toBe("Sanrio/My Melody");
    expect(getTheme("sanrio-ton").label).toBe("Sanrio/Ton");
  });
  it("sanrio con identidad: kitty rojo/blanco/azul, retsuko óxido/crema/rojo metal", () => {
    const k = getTheme("sanrio-kitty");
    expect(k.vars["--primary"]).toBe("#e90d2f");
    expect(k.vars["--accent"]).toBe("#2c73b7");
    const r = getTheme("sanrio-aggretsuko");
    expect(r.vars["--primary"]).toBe("#e8641b");
    expect(r.vars["--accent"]).toBe("#ff2e2e");
    expect(r.scheme).toBe("dark");
    expect(k.label).toBe("Sanrio/Hello Kitty");
  });
  it("christmas es rojo/blanco/verde, no clon neutro", () => {
    const c = getTheme("christmas");
    expect(c.vars["--primary"]).toBe("#e63946");
    expect(c.vars["--accent"]).toBe("#2dc653");
    expect(c.vars["--text"]).toBe("#f8faf8");
  });
  it("cada preset tiene identidad (bg distintos)", () => {
    const bgs = new Set(THEMES.filter(t => t.id !== "custom" && t.id !== "reactiva").map(t => t.vars["--bg"]));
    expect(bgs.size).toBe(28);
  });
  it("id desconocido cae a oscuro", () => {
    expect(getTheme("nope").id).toBe("oscuro");
  });
  it("applyTheme pinta variables inline", () => {
    applyTheme("cyberpunk");
    expect(document.documentElement.style.getPropertyValue("--bg")).toBe("#050510");
    expect(document.documentElement.dataset.theme).toBe("cyberpunk");
  });
  it("custom aplica color de letra y tamaño sin zoom", () => {
    applyTheme("custom", { base: "oscuro", fontColor: "#ff0000", fontSize: "l" });
    expect(document.documentElement.style.getPropertyValue("--text")).toBe("#ff0000");
    expect(document.documentElement.dataset.font).toBe("l");
    expect(document.body.style.zoom).toBeFalsy();
  });
  it("presets limpian fondo custom", () => {
    applyTheme("custom", { base: "oscuro", bgImage: "data:image/png;base64,xx" });
    applyTheme("claro");
    expect(document.body.style.backgroundImage).toBe("");
  });
  it("defaults seguros sin storage", () => {
    expect(loadCustom().base).toBe("oscuro");
    expect(loadFx()).toEqual({ click: false, trails: false, clickStyle: "burst", trailStyle: "dots", sfx: false, sfxStyle: "click", sfxVolume: 60 });
  });
});
