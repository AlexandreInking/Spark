import { describe, it, expect } from "vitest";
import { buildContext, buildRequest, detectIntent, parseResponse } from "./ai";
import type { RagInput } from "./ai";

describe("ai local (sin red, sin claves)", () => {
  const msgs = [{ role: "user" as const, content: "hola" }];
  it("sin modelo lanza", () => {
    expect(() => buildRequest({ provider: "ollama", model: " " }, msgs)).toThrow("modelo");
  });
  it("ollama: apunta a /api/chat sin headers de auth", () => {
    const r = buildRequest({ provider: "ollama", model: "qwen2.5:3b" }, msgs);
    expect(r.kind).toBe("ollama");
    expect(r.url).toContain("/api/chat");
    expect((r.init.headers as any).Authorization).toBeUndefined();
  });
  it("ollama sin key y con endpoint custom", () => {
    const r = buildRequest({ provider: "ollama", model: "qwen", endpoint: "http://x:11434/" }, msgs);
    expect(r.url).toBe("http://x:11434/api/chat");
  });
  it("parse ollama", () => {
    expect(parseResponse("ollama", { message: { content: " ok " } })).toBe("ok");
    expect(() => parseResponse("ollama", {})).toThrow();
  });
});

describe("RAG interno", () => {
  const base: RagInput = {
    today: "2026-09-11", courses: [], deliverables: [], reminders: [],
    jobs: [], txs: [], debts: [], notesMeta: [],
  };
  it("intents", () => {
    expect(detectIntent("cuándo tengo clases")).toBe("horario");
    expect(detectIntent("qué tareas vencen")).toBe("entregas");
    expect(detectIntent("voy a aprobar?")).toBe("notas");
    expect(detectIntent("cómo va mi dinero")).toBe("dinero");
    expect(detectIntent("ofertas de chamba")).toBe("trabajo");
    expect(detectIntent("mi racha de estudio")).toBe("enfoque");
    expect(detectIntent("hola")).toBe("general");
  });
  it("general trae resumen + top pendientes", () => {
    const ctx = buildContext({
      ...base,
      courses: [{ id: "1", name: "Mat", code: "M1", professor: "P", status: "activo", schedule: [], links: [], credentials: [], attachments: [], credits: 3, semester: "s", createdAt: "" } as any],
      deliverables: [{ id: "d", courseId: "1", type: "tarea", title: "T1", dueDate: "2026-09-12", dueTime: "23:59", status: "pendiente", priority: "media", tags: [], reminderMinutesBefore: 60, createdAt: "" } as any],
    }, "hola");
    expect(ctx).toContain("T1");
    expect(ctx).toContain("M1");
  });
  it("dinero suma el mes", () => {
    const ctx = buildContext({
      ...base,
      txs: [
        { id: "a", userId: "u", kind: "ingreso", category: "sueldo", amount: 1000, date: "2026-09-01", recurring: "none", createdAt: "" },
        { id: "b", userId: "u", kind: "gasto", category: "comida", amount: 200, date: "2026-09-02", recurring: "none", createdAt: "" },
      ] as any,
    }, "mi balance de dinero");
    expect(ctx).toContain("S/ 800");
  });
  it("recorta a tope", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      id: `${i}`, courseId: "1", type: "tarea", title: `Tarea larguísima número ${i} con relleno`, dueDate: "2026-09-12", dueTime: "23:59",
      status: "pendiente", priority: "media", tags: [], reminderMinutesBefore: 60, createdAt: "",
    }));
    const ctx = buildContext({ ...base, deliverables: many as any }, "pendientes");
    expect(ctx.length).toBeLessThanOrEqual(6100);
  });
});
