import { describe, it, expect } from "vitest";
import { csvCell, escapeHtml, safeUrl } from "./security";

describe("security (v0.9.2)", () => {
  it("escapeHtml neutraliza etiquetas y eventos", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(escapeHtml(null)).toBe("");
  });
  it("safeUrl solo http/https", () => {
    expect(safeUrl("https://uni.edu")).toBe("https://uni.edu");
    expect(safeUrl("http://a.bo/x")).toBe("http://a.bo/x");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,<h1>x</h1>")).toBeNull();
    expect(safeUrl("")).toBeNull();
    expect(safeUrl("www.uni.edu/curso")).toBe("https://www.uni.edu/curso");
  });
  it("csvCell entrecomilla y frena fórmulas", () => {
    expect(csvCell("hola")).toBe('"hola"');
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell("=HYPERLINK(1)")).toBe("\"'=HYPERLINK(1)\"");
    expect(csvCell("+cmd")).toBe("\"'+cmd\"");
  });
});
