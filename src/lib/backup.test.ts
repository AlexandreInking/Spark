import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db";
import { exportBackup, importBackup, verifyBackup } from "./backup";

// Corre en fallback localStorage (sin Tauri): round-trip real export → wipe → import.
const U = { id: "u-bk", studentCode: "BK-001", displayName: "Test", createdAt: new Date().toISOString() };

async function seed() {
  await db.createUser(U as any);
  await db.saveCourse({ id: "c1", userId: "u-bk", name: "N", code: "C-1", color: "#000", credits: 3, semester: "2026-1", professor: "P", schedule: [], links: [], credentials: [], attachments: [], status: "activo", createdAt: new Date().toISOString() } as any);
  await db.saveDeliverable({ id: "d1", courseId: "c1", type: "tarea", title: "T", dueDate: "2026-09-10", dueTime: "23:59", status: "pendiente", priority: "media", tags: [], reminderMinutesBefore: 60, createdAt: new Date().toISOString() } as any);
  await db.saveReminder({ id: "r1", userId: "u-bk", title: "R", dueDate: "2026-09-10", dueTime: "09:00", type: "pago", amount: 50, paid: false, priority: "media", reminderMinutesBefore: 60, createdAt: new Date().toISOString() } as any);
  await db.saveVault({ id: "v1", userId: "u-bk", title: "V", url: "https://x.com", username: "u", password: "p", createdAt: "", updatedAt: "" } as any);
  await db.saveContact({ id: "k1", userId: "u-bk", name: "C", relation: "externo", createdAt: "", updatedAt: "" } as any);
  await db.saveCVWork({ id: "w1", userId: "u-bk", company: "ACME", role: "Dev", startDate: "2026-01-01", order: 0 } as any);
  await db.savePortfolio({ id: "p1", userId: "u-bk", title: "P", category: "otro", order: 0, createdAt: "" } as any);
  await db.saveJobOffer({ id: "j1", userId: "u-bk", company: "ACME", position: "Dev", type: "parcial", modality: "remoto", schedule: [], bonuses: [], salaryPeriod: "mes", status: "guardada", createdAt: "" } as any);
  await db.saveTransaction({ id: "t1", userId: "u-bk", kind: "gasto", category: "comida", amount: 10, date: "2026-09-01", recurring: "none", createdAt: "" } as any);
  await db.saveDebt({ id: "b1", userId: "u-bk", creditor: "Banco", total: 100, createdAt: "" } as any);
  await db.saveStudySession({ id: "s1", userId: "u-bk", preset: "pomodoro", plannedMinutes: 25, actualMinutes: 25, distractions: 0, completed: true, startedAt: new Date().toISOString(), createdAt: "" } as any);
  await db.saveDeck({ id: "dk1", userId: "u-bk", name: "Mazo", createdAt: "" } as any);
  await db.saveFlashcard({ id: "f1", deckId: "dk1", front: "Q", back: "A", ease: 2.5, reps: 0, interval: 0, nextReview: "2026-09-01", createdAt: "" } as any);
  await db.saveAttendance({ id: "a1", userId: "u-bk", courseId: "c1", date: "2026-09-01", slotId: "s", status: "present", createdAt: "" } as any);
}

describe("backup blindaje (v0.9.2)", () => {
  beforeEach(() => { localStorage.clear(); });

  it("verifyBackup rechaza basura y acepta export real", async () => {
    expect(verifyBackup("no-json").ok).toBe(false);
    expect(verifyBackup("{}").ok).toBe(false);
    await seed();
    const txt = await exportBackup();
    const v = verifyBackup(txt);
    expect(v.ok).toBe(true);
    expect(v.counts?.courses).toBe(1);
    expect(v.counts?.job_offers).toBe(1);
    expect(v.counts?.transactions).toBe(1);
    expect(v.counts?.study_sessions).toBe(1);
    expect(v.counts?.decks).toBe(1);
    expect(v.counts?.flashcards).toBe(1);
    expect(v.counts?.attendance).toBe(1);
  });

  it("round-trip: export → wipe → import restaura todo", async () => {
    await seed();
    const txt = await exportBackup();
    localStorage.clear();
    expect(await db.listCourses("u-bk")).toHaveLength(0);
    await importBackup(txt);
    expect((await db.listCourses("u-bk")).map(c => c.code)).toEqual(["C-1"]);
    expect(await db.listAllDeliverables().then(ds => ds.length)).toBe(1);
    expect(await db.listReminders("u-bk").then(rs => rs.length)).toBe(1);
    expect(await db.listContacts("u-bk").then(x => x.length)).toBe(1);
    expect(await db.listCVWork("u-bk").then(x => x.length)).toBe(1);
    expect(await db.listPortfolio("u-bk").then(x => x.length)).toBe(1);
    expect(await db.listJobOffers("u-bk").then(x => x.length)).toBe(1);
    expect(await db.listTransactions("u-bk").then(x => x.length)).toBe(1);
    expect(await db.listDebts("u-bk").then(x => x.length)).toBe(1);
    expect(await db.listStudySessions("u-bk").then(x => x.length)).toBe(1);
    expect(await db.listDecks("u-bk").then(x => x.length)).toBe(1);
    expect(await db.listFlashcards("dk1").then(x => x.length)).toBe(1);
    expect(await db.listAttendance("c1").then(x => x.length)).toBe(1);
    expect(await db.listVault("u-bk").then(x => x.length)).toBe(1);
  });

  it("papelera y preferencias también se restauran", async () => {
    await seed();
    localStorage.setItem("uc_theme", "cyberpunk");
    await db.saveCourse({ id: "cx", userId: "u-bk", name: "X", code: "X-1", color: "#000", credits: 1, semester: "2026-1", professor: "", schedule: [], links: [], credentials: [], attachments: [], status: "activo", createdAt: "" } as any);
    await db.deleteCourse("cx");
    const txt = await exportBackup();
    const v = verifyBackup(txt);
    expect(v.counts?.trashed).toBeGreaterThanOrEqual(1);
    expect(v.counts?.prefs).toBeGreaterThanOrEqual(1);
    localStorage.clear();
    await importBackup(txt);
    const trashed = await (db as any).listTrashedCourses("u-bk");
    expect(trashed.map((c: any) => c.id)).toContain("cx");
    expect(localStorage.getItem("uc_theme")).toBe("cyberpunk");
  });

  it("import tolera backups viejos (0.3.x sin claves nuevas)", async () => {
    await db.createUser(U as any);
    await importBackup(JSON.stringify({ version: "0.3.1", users: [U], courses: [] }));
    expect(await db.listCourses("u-bk")).toHaveLength(0);
  });
});
