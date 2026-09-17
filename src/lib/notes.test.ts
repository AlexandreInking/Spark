import { describe, it, expect } from "vitest";
import { backlinks, exportPack, extractLinks, importMarkdownFile, notebookToMarkdown, noteToShareText, parsePack, renderNoteMd, wordCount } from "./notes";

describe("notas (v1.3.0)", () => {
  it("extractLinks únicos y limpios", () => {
    expect(extractLinks("ver [[Física]] y [[Física]] y [[  Química ]]")).toEqual(["Física", "Química"]);
  });
  it("render escapa HTML hostil y decora markdown", () => {
    const html = renderNoteMd("# Título\nHola **fuerte** y *suave* `<x>`\n[[Otra]]");
    expect(html).toContain("<h4");
    expect(html).toContain("<b>fuerte</b>");
    expect(html).toContain("&lt;x&gt;");
    expect(html).not.toContain("<x>");
    expect(html).toContain('data-note="Otra"');
  });
  it("listas y checklist", () => {
    const html = renderNoteMd("- a\n- [ ] b\n- [x] c");
    expect(html).toContain("<ul>");
    expect(html).toContain("☑");
  });
  it("backlinks por título exacto, sin la propia", () => {
    const notes = [
      { id: "1", title: "A", content: "mira [[B]]" },
      { id: "2", title: "B", content: "hola" },
      { id: "3", title: "C", content: "otra [[b]]" },
    ];
    expect(backlinks(notes, "2", "B").map(n => n.id).sort()).toEqual(["1", "3"]);
  });
  it("wordCount", () => {
    expect(wordCount("  hola   mundo ")).toBe(2);
    expect(wordCount("")).toBe(0);
  });
});

describe("exportar/compartir/importar (v1.5.0)", () => {
  const nb = { id: "nb1", userId: "u", name: "Uni", createdAt: "" };
  const notes = [
    { id: "1", userId: "u", title: "A", content: "uno", tags: ["x"], pinned: false, updatedAt: "", createdAt: "" },
    { id: "2", userId: "u", parentId: "1", title: "B", content: "dos", tags: [], pinned: false, updatedAt: "", createdAt: "" },
  ];
  it("notebookToMarkdown jerarquiza", () => {
    const md = notebookToMarkdown("Uni", notes as any);
    expect(md).toContain("# Cuaderno: Uni");
    expect(md).toContain("## A");
    expect(md).toContain("### B");
  });
  it("pack round-trip + rechaza basura", () => {
    const txt = exportPack([nb] as any, notes as any);
    const p = parsePack(txt);
    expect(p.notebooks).toHaveLength(1);
    expect(p.notes).toHaveLength(2);
    expect(() => parsePack("zzz")).toThrow();
    expect(() => parsePack("{}")).toThrow();
  });
  it("importMarkdownFile usa primer heading o filename", () => {
    expect(importMarkdownFile("x.md", "# Hola\ncuerpo")).toEqual({ title: "Hola", content: "cuerpo" });
    expect(importMarkdownFile("mi_archivo.txt", "solo cuerpo")).toEqual({ title: "mi archivo", content: "solo cuerpo" });
  });
  it("noteToShareText formato WhatsApp", () => {
    expect(noteToShareText({ title: "T", content: "**a**" })).toBe("*T*\n\n**a**");
  });
});
