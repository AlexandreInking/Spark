import { describe, it, expect } from "vitest";
import { buildContext, buildRequest, cleanKey, detectIntent, parseResponse } from "./ai";
import type { RagInput } from "./ai";

describe("ai providers (v1.7.0, sin red)", () => {
  const msgs = [{ role: "user" as const, content: "hola" }];
  it("openai-compatible: url + bearer", () => {
    const r = buildRequest({ provider: "groq", model: "m", apiKey: "k" }, msgs);
    expect(r.kind).toBe("openai");
    expect(r.url).toContain("groq.com");
    expect((r.init.headers as any).Authorization).toBe("Bearer k");
  });
  it("openrouter agrega referer", () => {
    const r = buildRequest({ provider: "openrouter", model: "x/y", apiKey: "k" }, msgs);
    expect((r.init.headers as any)["HTTP-Referer"]).toBeTruthy();
  });
  it("sin key lanza (nube)", () => {
    expect(() => buildRequest({ provider: "openai", model: "m" }, msgs)).toThrow("API key");
  });
  it("cleanKey quita Bearer y espacios", () => {
    expect(cleanKey("  Bearer sk-abc  ")).toBe("sk-abc");
    expect(cleanKey("sk-abc")).toBe("sk-abc");
    expect(cleanKey(undefined)).toBe("");
  });
  it("sin modelo lanza", () => {
    expect(() => buildRequest({ provider: "ollama", model: " " }, msgs)).toThrow("modelo");
  });
  it("anthropic: headers y system separado", () => {
    const r = buildRequest({ provider: "anthropic", model: "h", apiKey: "k" },
      [{ role: "system", content: "s" }, ...msgs]);
    expect(r.url).toContain("anthropic.com");
    const b = JSON.parse(r.init.body as string);
    expect(b.system).toBe("s");
    expect(b.max_tokens).toBeGreaterThan(0);
  });
  it("google: key en query y roles user/model", () => {
    const r = buildRequest({ provider: "google", model: "gemma", apiKey: "k" },
      [...msgs, { role: "assistant" as const, content: "a" }]);
    expect(r.url).toContain("key=k");
    const b = JSON.parse(r.init.body as string);
    expect(b.contents[1].role).toBe("model");
  });
  it("ollama sin key y con endpoint custom", () => {
    const r = buildRequest({ provider: "ollama", model: "qwen", endpoint: "http://x:11434/" }, msgs);
    expect(r.url).toBe("http://x:11434/api/chat");
  });
  it("parse por kind", () => {
    expect(parseResponse("openai", { choices: [{ message: { content: " ok " } }] })).toBe("ok");
    expect(parseResponse("anthropic", { content: [{ text: "a" }] })).toBe("a");
    expect(parseResponse("google", { candidates: [{ content: { parts: [{ text: "g" }] } }] })).toBe("g");
    expect(parseResponse("ollama", { message: { content: "o" } })).toBe("o");
    expect(() => parseResponse("openai", {})).toThrow();
    expect(() => parseResponse("openai", { error: { message: "bad key" } })).toThrow("bad key");
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
