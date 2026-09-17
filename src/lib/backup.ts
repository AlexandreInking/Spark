// Backup local JSON + import CSV Moodle / ICS

import { db } from "./db";

export const BACKUP_VERSION = "1.6.0";

export async function exportBackup(): Promise<string> {
  const users = await db.listUsers();
  const courses = await db.listAllCourses();
  const dels = await db.listAllDeliverables();
  const settingsKeys = ["admin_config","notify_settings","uc_ollama","custom_bg","ambience_audio","ai_cfg"];
  const settings: Record<string,string|null> = {};
  for(const k of settingsKeys) settings[k] = await db.getSetting(k);
  // vault no se exporta si está cifrado sin clave - exporta cifrado tal cual
  const allVault: any[] = [];
  const rems: any[] = [];
  const contacts: any[] = [];
  const cvProfiles: any[] = [];
  const cvWork: any[] = [];
  const cvEducation: any[] = [];
  const cvSkills: any[] = [];
  const cvLanguages: any[] = [];
  const cvCertificates: any[] = [];
  const portfolio: any[] = [];
  const jobOffers: any[] = [];
  const transactions: any[] = [];
  const debts: any[] = [];
  const studySessions: any[] = [];
  const decks: any[] = [];
  const flashcards: any[] = [];
  const attendance: any[] = [];
  const projectBoards: any[] = [];
  const projectCards: any[] = [];
  const notebooks: any[] = [];
  const notes: any[] = [];
  for(const u of users){
    allVault.push(...await db.listVault(u.id).catch(()=>[]));
    rems.push(...await db.listReminders(u.id).catch(()=>[]));
    contacts.push(...await db.listContacts(u.id).catch(()=>[]));
    const p = await db.getCVProfile(u.id).catch(()=>null);
    if(p) cvProfiles.push(p);
    cvWork.push(...await db.listCVWork(u.id).catch(()=>[]));
    cvEducation.push(...await db.listCVEducation(u.id).catch(()=>[]));
    cvSkills.push(...await db.listCVSkills(u.id).catch(()=>[]));
    cvLanguages.push(...await db.listCVLanguages(u.id).catch(()=>[]));
    cvCertificates.push(...await db.listCVCertificates(u.id).catch(()=>[]));
    portfolio.push(...await db.listPortfolio(u.id).catch(()=>[]));
    jobOffers.push(...await db.listJobOffers(u.id).catch(()=>[]));
    transactions.push(...await db.listTransactions(u.id).catch(()=>[]));
    debts.push(...await db.listDebts(u.id).catch(()=>[]));
    studySessions.push(...await db.listStudySessions(u.id).catch(()=>[]));
    const pbs = await db.listProjectBoards(u.id).catch(()=>[]);
    projectBoards.push(...pbs);
    for (const b of pbs) projectCards.push(...await db.listProjectCards(b.id).catch(()=>[]));
    notebooks.push(...await db.listNotebooks(u.id).catch(()=>[]));
    notes.push(...await db.listNotes(u.id).catch(()=>[]));
    const dks = await db.listDecks(u.id).catch(()=>[]);
    decks.push(...dks);
    for (const d of dks) flashcards.push(...await db.listFlashcards(d.id).catch(()=>[]));
    const ccs = await db.listAllCourses().catch(()=>[]);
    for (const c of ccs.filter(x => x.userId === u.id)) attendance.push(...await db.listAttendance(c.id).catch(()=>[]));
  }
  // papelera (borrado suave): también se respalda para restauración total
  const trashed: Record<string, any[]> = { courses: [], deliverables: [], vault: [], reminders: [], job_offers: [], transactions: [], debts: [], study_sessions: [] };
  for (const u of users) {
    trashed.courses.push(...await (db as any).listTrashedCourses(u.id).catch(() => []));
    trashed.vault.push(...await (db as any).listTrashedVault(u.id).catch(() => []));
    trashed.reminders.push(...await (db as any).listTrashedReminders(u.id).catch(() => []));
    trashed.job_offers.push(...await (db as any).listTrashedJobOffers(u.id).catch(() => []));
    trashed.transactions.push(...await (db as any).listTrashedTransactions(u.id).catch(() => []));
    trashed.debts.push(...await (db as any).listTrashedDebts(u.id).catch(() => []));
    trashed.study_sessions.push(...await (db as any).listTrashedStudySessions(u.id).catch(() => []));
  }
  trashed.deliverables.push(...await (db as any).listTrashedDeliverables().catch(() => []));

  // preferencias locales (temas, fx, pesos, checklist, notificaciones, vault-crypto, historial...).
  // Excluye: backups anidados, sesión (login limpio al restaurar) y restos admin.
  const localStorageDump: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k === "uc_last_backup" || k === "uc_auto_backup" || k === "uc_session") continue;
      if (k === "uc_admin_session" || k === "uc_tg_offset") continue;
      const v = localStorage.getItem(k);
      if (v !== null) localStorageDump[k] = v;
    }
  } catch {}
  const data = {
    version: BACKUP_VERSION, exportedAt: new Date().toISOString(),
    users, courses, deliverables: dels, vault: allVault, reminders: rems, settings,
    contacts, cv: { profiles: cvProfiles, work: cvWork, education: cvEducation, skills: cvSkills, languages: cvLanguages, certificates: cvCertificates },
    portfolio, job_offers: jobOffers, transactions, debts, study_sessions: studySessions,
    project_boards: projectBoards, project_cards: projectCards, notebooks, notes,
    decks, flashcards, attendance,
    trashed, localStorage: localStorageDump,
  };
  return JSON.stringify(data, null, 2);
}

/** Validación en seco (no escribe nada): forma válida + conteos por sección. */
export function verifyBackup(jsonText: string): { ok: boolean; error?: string; counts?: Record<string, number> } {
  let data: any;
  try { data = JSON.parse(jsonText); }
  catch { return { ok: false, error: "No es JSON válido" }; }
  if (!data || !data.users || !data.courses) return { ok: false, error: "Backup inválido: faltan users/courses" };
  const n = (v: any) => Array.isArray(v) ? v.length : 0;
  const cv = data.cv || {};
  const tr = data.trashed || {};
  return {
    ok: true,
    counts: {
      users: n(data.users), courses: n(data.courses), deliverables: n(data.deliverables),
      vault: n(data.vault), reminders: n(data.reminders), contacts: n(data.contacts),
      cv_work: n(cv.work), cv_education: n(cv.education), portfolio: n(data.portfolio),
      job_offers: n(data.job_offers), transactions: n(data.transactions),
      debts: n(data.debts), study_sessions: n(data.study_sessions),
      project_boards: n(data.project_boards), project_cards: n(data.project_cards),
      notebooks: n(data.notebooks), notes: n(data.notes),
      decks: n(data.decks), flashcards: n(data.flashcards), attendance: n(data.attendance),
      trashed: ["courses", "deliverables", "vault", "reminders", "job_offers", "transactions", "debts", "study_sessions"].reduce((s, k) => s + n(tr[k]), 0),
      prefs: data.localStorage ? Object.keys(data.localStorage).length : 0,
    },
  };
}

export function downloadText(text:string, filename:string, mime="application/json"){
  const blob=new Blob([text],{ type:mime });
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}

export async function importBackup(jsonText: string){
  const data=JSON.parse(jsonText);
  if(!data.users || !data.courses) throw new Error("Backup inválido");
  // importa usuarios (si no existen)
  for(const u of data.users){
    const existing=await db.getUserByCode(u.studentCode);
    if(!existing) await db.createUser(u);
  }
  for(const c of data.courses || []) await db.saveCourse(c);
  for(const d of data.deliverables || []) await db.saveDeliverable(d);
  if(data.vault) for(const v of data.vault) await db.saveVault(v);
  if(data.reminders) for(const r of data.reminders) await db.saveReminder(r);
  if(data.settings) for(const [k,v] of Object.entries(data.settings as Record<string,string>)) if(v) await db.setSetting(k, v);
  // v0.6.0+ (tolerante a backups viejos sin estas claves)
  if(data.contacts) for(const x of data.contacts) await db.saveContact(x);
  const cv = data.cv || {};
  if(cv.profiles) for(const x of cv.profiles) await db.saveCVProfile(x);
  if(cv.work) for(const x of cv.work) await db.saveCVWork(x);
  if(cv.education) for(const x of cv.education) await db.saveCVEducation(x);
  if(cv.skills) for(const x of cv.skills) await db.saveCVSkill(x);
  if(cv.languages) for(const x of cv.languages) await db.saveCVLanguage(x);
  if(cv.certificates) for(const x of cv.certificates) await db.saveCVCertificate(x);
  if(data.portfolio) for(const x of data.portfolio) await db.savePortfolio(x);
  if(data.job_offers) for(const x of data.job_offers) await db.saveJobOffer(x);
  if(data.transactions) for(const x of data.transactions) await db.saveTransaction(x);
  if(data.debts) for(const x of data.debts) await db.saveDebt(x);
  if(data.study_sessions) for(const x of data.study_sessions) await db.saveStudySession(x);
  if(data.project_boards) for(const x of data.project_boards) await db.saveProjectBoard(x);
  if(data.project_cards) for(const x of data.project_cards) await db.saveProjectCard(x);
  if(data.notebooks) for(const x of data.notebooks) await db.saveNotebook(x);
  if(data.notes) for(const x of data.notes) await db.saveNote(x);
  if(data.decks) for(const x of data.decks) await db.saveDeck(x);
  if(data.flashcards) for(const x of data.flashcards) await db.saveFlashcard(x);
  if(data.attendance) for(const x of data.attendance) await db.saveAttendance(x);
  // papelera: re-guardar y re-marcar borrado (conserva contenido; fecha de borrado se renueva)
  const t = data.trashed || {};
  const retrash = async (items: any[], save: (x: any) => Promise<any>, del: (id: string) => Promise<any>) => {
    for (const x of items || []) { await save(x); await del(x.id); }
  };
  await retrash(t.courses, (x) => db.saveCourse(x), (id) => db.deleteCourse(id));
  await retrash(t.deliverables, (x) => db.saveDeliverable(x), (id) => db.deleteDeliverable(id));
  await retrash(t.vault, (x) => db.saveVault(x), (id) => db.deleteVault(id));
  await retrash(t.reminders, (x) => db.saveReminder(x), (id) => db.deleteReminder(id));
  await retrash(t.job_offers, (x) => db.saveJobOffer(x), (id) => db.deleteJobOffer(id));
  await retrash(t.transactions, (x) => db.saveTransaction(x), (id) => db.deleteTransaction(id));
  await retrash(t.debts, (x) => db.saveDebt(x), (id) => db.deleteDebt(id));
  await retrash(t.study_sessions, (x) => db.saveStudySession(x), (id) => db.deleteStudySession(id));
  // preferencias locales
  if (data.localStorage && typeof data.localStorage === "object") {
    try {
      for (const [k, v] of Object.entries(data.localStorage as Record<string, string>)) {
        if (k === "uc_last_backup" || k === "uc_auto_backup" || k === "uc_session") continue;
        localStorage.setItem(k, v);
      }
    } catch {}
  }
}

// CSV Moodle simple: columnas "Curso,Codigo,Semestre,Profesor,Creditos" o "Tarea,CursoCode,Titulo,Fecha,Hora,Tipo"
export async function importMoodleCSV(text:string, userId:string): Promise<{ courses:number, deliverables:number }> {
  const lines=text.split(/\r?\n/).filter(l=> l.trim());
  if(!lines.length) return { courses:0, deliverables:0 };
  const header=lines[0].toLowerCase();
  let courses=0, dels=0;
  if(header.includes("curso") && header.includes("codigo")){
    // archivo cursos
    for(let i=1;i<lines.length;i++){
      const cols=lines[i].split(/[,;]/).map(s=> s.trim().replace(/^"|"$/g,""));
      if(cols.length<2) continue;
      const [name, code, semester, professor, credits]=cols;
      if(!name||!code) continue;
      await db.saveCourse({
        id: crypto.randomUUID(),
        userId,
        name, code: code.toUpperCase(),
        color: "#0ea5e9",
        credits: Number(credits)||3,
        semester: semester||"2026-1",
        professor: professor||"",
        schedule: [], links:[], credentials:[], attachments:[], status:"activo", createdAt:new Date().toISOString()
      } as any);
      courses++;
    }
  } else {
    // entregables
    for(let i=1;i<lines.length;i++){
      const cols=lines[i].split(/[,;]/).map(s=> s.trim().replace(/^"|"$/g,""));
      if(cols.length<3) continue;
      const [courseCode, title, dueDate, dueTime, type]=cols;
      if(!courseCode||!title||!dueDate) continue;
      const cs=await db.listCourses(userId);
      const c=cs.find(x=> x.code===courseCode.toUpperCase());
      if(!c) continue;
      await db.saveDeliverable({
        id: crypto.randomUUID(),
        courseId: c.id,
        type: (type as any)||"tarea",
        title,
        dueDate, dueTime: dueTime||"23:59",
        status:"pendiente", priority:"media", tags:[], reminderMinutesBefore:60, createdAt:new Date().toISOString()
      } as any);
      dels++;
    }
  }
  return { courses, deliverables:dels };
}
