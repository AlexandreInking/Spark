// Persistencia local-first: SQLite via tauri-plugin-sql + fallback localStorage para vite dev
import type { Course, Deliverable, User, Contact, CVProfile, CVWorkExperience, CVEducation, CVSkill, CVLanguage, CVCertificate, PortfolioItem } from "../types";

let dbInstance: any = null;

async function getDb(): Promise<any> {
  if (dbInstance) return dbInstance;
  try {
    // dynamic import para no romper en web sin tauri
    const { default: Database } = await import("@tauri-apps/plugin-sql");
    // @ts-ignore
    dbInstance = await Database.load("sqlite:universecity.db");
    await migrate(dbInstance);
    return dbInstance;
  } catch (e) {
    console.warn("[db] Tauri SQL no disponible, usando localStorage fallback", e);
    return null;
  }
}

async function migrate(db: any) {
  // Migraciones idempotentes
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      student_code TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      color TEXT NOT NULL,
      credits INTEGER DEFAULT 3,
      semester TEXT,
      professor TEXT,
      professor_email TEXT,
      classroom TEXT,
      schedule_json TEXT,
      links_json TEXT,
      credentials_json TEXT,
      attachments_json TEXT,
      weighting_json TEXT,
      status TEXT DEFAULT 'activo',
      start_date TEXT,
      end_date TEXT,
      min_passing_grade REAL,
      absence_limit REAL,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  // migracion columnas nuevas si DB antigua (cubre instalaciones 0.3.x sin JSON cols)
  try { await db.execute(`ALTER TABLE courses ADD COLUMN color TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE courses ADD COLUMN credits INTEGER DEFAULT 3`); } catch {}
  try { await db.execute(`ALTER TABLE courses ADD COLUMN semester TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE courses ADD COLUMN professor TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE courses ADD COLUMN professor_email TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE courses ADD COLUMN classroom TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE courses ADD COLUMN schedule_json TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE courses ADD COLUMN links_json TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE courses ADD COLUMN credentials_json TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE courses ADD COLUMN weighting_json TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE courses ADD COLUMN status TEXT DEFAULT 'activo'`); } catch {}
  try { await db.execute(`ALTER TABLE courses ADD COLUMN start_date TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE courses ADD COLUMN end_date TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE courses ADD COLUMN min_passing_grade REAL`); } catch {}
  try { await db.execute(`ALTER TABLE courses ADD COLUMN deleted_at TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE courses ADD COLUMN created_at TEXT`); } catch {}
  // migración v0.6.3: material del curso
  try { await db.execute(`ALTER TABLE courses ADD COLUMN attachments_json TEXT`); } catch {}
  // migración v1.6.0: límite de faltas + flashcards + asistencia
  try { await db.execute(`ALTER TABLE courses ADD COLUMN absence_limit REAL`); } catch {}
  await db.execute(`
    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      deck_id TEXT NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      ease REAL DEFAULT 2.5,
      reps INTEGER DEFAULT 0,
      interval_days INTEGER DEFAULT 0,
      next_review TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      date TEXT NOT NULL,
      slot_id TEXT NOT NULL,
      status TEXT DEFAULT 'present',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  try { await db.execute(`ALTER TABLE deliverables ADD COLUMN deleted_at TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE vault_items ADD COLUMN deleted_at TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE general_reminders ADD COLUMN deleted_at TEXT`); } catch {}
  await db.execute(`
    CREATE TABLE IF NOT EXISTS deliverables (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT NOT NULL,
      due_time TEXT NOT NULL,
      end_date TEXT,
      end_time TEXT,
      location TEXT,
      duration_minutes INTEGER,
      weight REAL,
      max_score REAL,
      obtained_score REAL,
      status TEXT DEFAULT 'pendiente',
      priority TEXT DEFAULT 'media',
      tags_json TEXT,
      links_json TEXT,
      attachments_json TEXT,
      reminder_minutes_before INTEGER DEFAULT 60,
      estimated_hours REAL,
      week_number INTEGER,
      is_exact_date INTEGER DEFAULT 1,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
    );
  `);
  try { await db.execute(`ALTER TABLE deliverables ADD COLUMN week_number INTEGER`); } catch {}
  try { await db.execute(`ALTER TABLE deliverables ADD COLUMN is_exact_date INTEGER DEFAULT 1`); } catch {}
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_deliverables_due ON deliverables(due_date, due_time);`);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS board_docs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      snapshot_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vault_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      notes TEXT,
      category TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_vault_user ON vault_items(user_id);`);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS general_reminders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT NOT NULL,
      due_time TEXT NOT NULL,
      type TEXT DEFAULT 'pago',
      amount REAL,
      paid INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'media',
      reminder_minutes_before INTEGER DEFAULT 60,
      recurring TEXT DEFAULT 'none',
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_reminders_due ON general_reminders(due_date, due_time);`);
  // settings key-value via store plugin fallback, pero guardamos aquí también
  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  // CONTACTS
  await db.execute(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      relation TEXT DEFAULT 'externo',
      phone TEXT,
      email TEXT,
      birthday TEXT,
      company TEXT,
      role TEXT,
      notes TEXT,
      tags_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  // CV PROFILE
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cv_profile (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      title TEXT,
      email TEXT,
      phone TEXT,
      location TEXT,
      website TEXT,
      linkedin TEXT,
      github TEXT,
      summary TEXT,
      photo_url TEXT,
      updated_at TEXT NOT NULL
    );
  `);
  // CV WORK EXPERIENCE
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cv_work (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      current INTEGER DEFAULT 0,
      description TEXT,
      achievements_json TEXT,
      skills_json TEXT,
      sort_order INTEGER DEFAULT 0
    );
  `);
  // CV EDUCATION
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cv_education (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      institution TEXT NOT NULL,
      degree TEXT NOT NULL,
      field TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      current INTEGER DEFAULT 0,
      gpa TEXT,
      notes TEXT,
      sort_order INTEGER DEFAULT 0
    );
  `);
  // CV SKILLS
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cv_skills (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      level INTEGER DEFAULT 3,
      sort_order INTEGER DEFAULT 0
    );
  `);
  // CV LANGUAGES
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cv_languages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      level TEXT DEFAULT 'B1',
      listening TEXT DEFAULT 'Intermedio',
      writing TEXT DEFAULT 'Intermedio',
      speaking TEXT DEFAULT 'Intermedio',
      sort_order INTEGER DEFAULT 0
    );
  `);
  try { await db.execute(`ALTER TABLE cv_languages ADD COLUMN listening TEXT DEFAULT 'Intermedio'`); } catch {}
  try { await db.execute(`ALTER TABLE cv_languages ADD COLUMN writing TEXT DEFAULT 'Intermedio'`); } catch {}
  try { await db.execute(`ALTER TABLE cv_languages ADD COLUMN speaking TEXT DEFAULT 'Intermedio'`); } catch {}
  // CV CERTIFICATES
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cv_certificates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      issuer TEXT NOT NULL,
      date TEXT,
      url TEXT,
      sort_order INTEGER DEFAULT 0
    );
  `);
  // PORTFOLIO
  await db.execute(`
    CREATE TABLE IF NOT EXISTS portfolio_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'otro',
      description TEXT,
      url TEXT,
      image_url TEXT,
      tags_json TEXT,
      date TEXT,
      sort_order INTEGER DEFAULT 0,
      extra_json TEXT,
      created_at TEXT NOT NULL
    );
  `);
  // migración v0.9.0 (instalaciones sin extra_json)
  try { await db.execute(`ALTER TABLE portfolio_items ADD COLUMN extra_json TEXT`); } catch {}
  // JOB OFFERS (v0.6.0)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS job_offers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company TEXT NOT NULL,
      position TEXT NOT NULL,
      type TEXT DEFAULT 'parcial',
      modality TEXT DEFAULT 'presencial',
      location TEXT,
      schedule_json TEXT,
      bonuses_json TEXT,
      salary_min REAL,
      salary_max REAL,
      salary_period TEXT DEFAULT 'mes',
      deadline TEXT,
      status TEXT DEFAULT 'guardada',
      url TEXT,
      contact TEXT,
      growth INTEGER,
      notes TEXT,
      hired_start TEXT,
      hired_end TEXT,
      pay_date TEXT,
      pay_recurrence TEXT,
      pay_amount REAL,
      show_in_calendar INTEGER,
      added_to_cv INTEGER,
      cv_work_id TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  // migración v0.6.1 para instalaciones 0.6.0 (tabla sin columnas de contratación)
  try { await db.execute(`ALTER TABLE job_offers ADD COLUMN hired_start TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE job_offers ADD COLUMN hired_end TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE job_offers ADD COLUMN pay_date TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE job_offers ADD COLUMN pay_recurrence TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE job_offers ADD COLUMN pay_amount REAL`); } catch {}
  try { await db.execute(`ALTER TABLE job_offers ADD COLUMN show_in_calendar INTEGER`); } catch {}
  try { await db.execute(`ALTER TABLE job_offers ADD COLUMN added_to_cv INTEGER`); } catch {}
  try { await db.execute(`ALTER TABLE job_offers ADD COLUMN cv_work_id TEXT`); } catch {}
  // migración v0.6.2
  try { await db.execute(`ALTER TABLE job_offers ADD COLUMN bonuses_json TEXT`); } catch {}
  // TRANSACTIONS (v0.7.0)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      recurring TEXT DEFAULT 'none',
      note TEXT,
      debt_id TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  // migración v0.7.0 (instalaciones sin debt_id) + DEBTS (v0.7.1)
  try { await db.execute(`ALTER TABLE transactions ADD COLUMN debt_id TEXT`); } catch {}
  // PROJECTS (v1.2.0)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_boards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      columns_json TEXT,
      auto_done INTEGER DEFAULT 0,
      rules_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  // migración v1.3.0 (reglas, asignados, notas)
  try { await db.execute(`ALTER TABLE project_boards ADD COLUMN rules_json TEXT`); } catch {}
  try { await db.execute(`ALTER TABLE project_cards ADD COLUMN assignees_json TEXT`); } catch {}
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      notebook_id TEXT,
      parent_id TEXT,
      title TEXT NOT NULL,
      content TEXT,
      tags_json TEXT,
      pinned INTEGER DEFAULT 0,
      course_id TEXT,
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_cards (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      column_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      labels_json TEXT,
      assignees_json TEXT,
      start_date TEXT,
      due_date TEXT,
      progress INTEGER DEFAULT 0,
      checklist_json TEXT,
      position INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(board_id) REFERENCES project_boards(id) ON DELETE CASCADE
    );
  `);
  // STUDY SESSIONS (v0.8.0)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT,
      title TEXT,
      preset TEXT DEFAULT 'pomodoro',
      planned_minutes INTEGER NOT NULL,
      actual_minutes INTEGER NOT NULL,
      distractions INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  // DEBTS (v0.7.1)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      creditor TEXT NOT NULL,
      title TEXT,
      total REAL NOT NULL,
      due_date TEXT,
      notes TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
}

function lsKey(k: string) { return `uc_${k}`; }

// Helpers genéricos para fallback
function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(lsKey(key));
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveLS(key: string, val: unknown) {
  localStorage.setItem(lsKey(key), JSON.stringify(val));
}

// API publica

export const db = {
  async init() { await getDb(); },

  // USERS
  async getUserByCode(code: string): Promise<User | null> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM users WHERE student_code = $1", [code]);
      if (!rows.length) return null;
      const r = rows[0];
      return { id: r.id, studentCode: r.student_code, displayName: r.display_name, createdAt: r.created_at };
    } else {
      const users = loadLS<User[]>("users", []);
      return users.find(u => u.studentCode === code) || null;
    }
  },
  async createUser(u: User) {
    const d = await getDb();
    if (d) {
      await d.execute("INSERT INTO users (id, student_code, display_name, created_at) VALUES ($1,$2,$3,$4)", [u.id, u.studentCode, u.displayName, u.createdAt]);
    } else {
      const users = loadLS<User[]>("users", []);
      users.push(u); saveLS("users", users);
    }
  },
  async listUsers(): Promise<User[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM users");
      return rows.map(r => ({ id: r.id, studentCode: r.student_code, displayName: r.display_name, createdAt: r.created_at }));
    } else return loadLS<User[]>("users", []);
  },

  // auto-backup antes de borrar
  async _backupTrash(type: string, data: any){
    try {
      const key = `uc_trash_${type}`;
      const arr = loadLS<any[]>(key, []);
      arr.unshift({ at: new Date().toISOString(), data });
      if(arr.length>50) arr.pop();
      saveLS(key, arr);
      // también guarda último backup completo
      const backup = await (await import("./backup")).exportBackup().catch(()=>null);
      if(backup) localStorage.setItem("uc_last_backup", backup);
    } catch {}
  },
  // COURSES
  async listCourses(userId: string): Promise<Course[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM courses WHERE user_id = $1 AND (deleted_at IS NULL OR deleted_at='') ORDER BY created_at DESC", [userId]);
      return rows.map(mapCourseRow);
    } else {
      const all = loadLS<any[]>("courses", []);
      const filtered = all.filter(c => (c.userId ?? c.user_id) === userId && !(c as any).deleted_at);
      return filtered.map(c => {
        // fallback almacenó Course camelCase directo; si es fila DB (snake_case) mapear
        if (c.schedule_json !== undefined || c.user_id !== undefined) return mapCourseRow(c);
        return c as Course;
      });
    }
  },
  async listTrashedCourses(userId: string): Promise<any[]> {
    const d = await getDb();
    if(d){
      const rows:any[] = await d.select("SELECT * FROM courses WHERE user_id=$1 AND deleted_at IS NOT NULL AND deleted_at<>'' ORDER BY deleted_at DESC", [userId]);
      return rows.map(mapCourseRow);
    } else {
      const all=loadLS<any[]>("courses", []);
      const filtered = all.filter(c=> (c.userId ?? c.user_id)===userId && (c as any).deleted_at);
      return filtered.map(c => {
        if (c.schedule_json !== undefined || c.user_id !== undefined) return mapCourseRow(c);
        return c as Course;
      });
    }
  },
  async restoreCourse(id:string){
    const d=await getDb();
    if(d) await d.execute("UPDATE courses SET deleted_at=NULL WHERE id=$1",[id]);
    else {
      const all=loadLS<any[]>("courses", []);
      const it=all.find(x=> x.id===id);
      if(it) { delete (it as any).deleted_at; saveLS("courses", all); }
    }
  },
  async saveCourse(c: Course) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO courses (id,user_id,name,code,color,credits,semester,professor,professor_email,classroom,schedule_json,links_json,credentials_json,attachments_json,weighting_json,status,start_date,end_date,min_passing_grade,absence_limit,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
        [c.id, c.userId, c.name, c.code, c.color, c.credits, c.semester, c.professor, c.professorEmail || null, c.classroom || null, JSON.stringify(c.schedule), JSON.stringify(c.links), JSON.stringify(c.credentials), JSON.stringify(c.attachments || []), JSON.stringify(c.weighting || []), c.status, c.startDate || null, c.endDate || null, c.minPassingGrade ?? null, c.absenceLimit ?? null, c.createdAt]
      );
    } else {
      const all = loadLS<Course[]>("courses", []);
      const idx = all.findIndex(x => x.id === c.id);
      if (idx >= 0) all[idx] = c; else all.push(c);
      saveLS("courses", all);
    }
  },
  async deleteCourse(id: string) {
    // backup antes de soft-delete
    try {
      const d2=await getDb();
      if(d2){
        const rows:any[] = await d2.select("SELECT * FROM courses WHERE id=$1",[id]);
        if(rows[0]) await db._backupTrash("course", rows[0]);
      } else {
        const all=loadLS<any[]>("courses", []);
        const it=all.find(x=> x.id===id);
        if(it) await db._backupTrash("course", it);
      }
    } catch {}
    const d = await getDb();
    if (d) {
      const now=new Date().toISOString();
      await d.execute("UPDATE courses SET deleted_at=$1 WHERE id=$2",[now, id]);
      await d.execute("UPDATE deliverables SET deleted_at=$1 WHERE course_id=$2",[now, id]);
    } else {
      let all = loadLS<any[]>("courses", []);
      const it=all.find(x=> x.id===id);
      if(it) (it as any).deleted_at=new Date().toISOString();
      saveLS("courses", all);
      let dels = loadLS<any[]>("deliverables", []);
      for(const del of dels.filter(x=> x.courseId===id)) (del as any).deleted_at=new Date().toISOString();
      saveLS("deliverables", dels);
    }
  },
  async hardDeleteCourse(id:string){
    const d=await getDb();
    if(d){ await d.execute("DELETE FROM deliverables WHERE course_id=$1",[id]); await d.execute("DELETE FROM courses WHERE id=$1",[id]); }
    else {
      let all=loadLS<Course[]>("courses", []);
      all=all.filter(x=> x.id!==id); saveLS("courses", all);
      let dels=loadLS<Deliverable[]>("deliverables", []);
      dels=dels.filter(x=> x.courseId!==id); saveLS("deliverables", dels);
    }
  },

  // DELIVERABLES
  async listDeliverables(courseId?: string): Promise<Deliverable[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = courseId
        ? await d.select("SELECT * FROM deliverables WHERE course_id=$1 AND (deleted_at IS NULL OR deleted_at='') ORDER BY due_date ASC, due_time ASC", [courseId])
        : await d.select("SELECT * FROM deliverables WHERE (deleted_at IS NULL OR deleted_at='') ORDER BY due_date ASC, due_time ASC");
      return rows.map(mapDelRow);
    } else {
      const all = loadLS<any[]>("deliverables", []);
      const filtered = all.filter(x=> !(x as any).deleted_at);
      const f2 = courseId ? filtered.filter(x => x.courseId === courseId) : filtered;
      return f2.sort((a, b) => (a.dueDate + a.dueTime).localeCompare(b.dueDate + b.dueTime));
    }
  },
  async listTrashedDeliverables(): Promise<Deliverable[]> {
    const d=await getDb();
    if(d){
      const rows:any[] = await d.select("SELECT * FROM deliverables WHERE deleted_at IS NOT NULL AND deleted_at<>'' ORDER BY deleted_at DESC");
      return rows.map(mapDelRow);
    } else {
      const all=loadLS<any[]>("deliverables", []);
      const filtered = all.filter(x=> (x as any).deleted_at);
      return filtered.map(c => {
        if (c.due_date !== undefined || c.course_id !== undefined) return mapDelRow(c);
        return c as Deliverable;
      });
    }
  },
  async restoreDeliverable(id:string){
    const d=await getDb();
    if(d) await d.execute("UPDATE deliverables SET deleted_at=NULL WHERE id=$1",[id]);
    else {
      const all=loadLS<any[]>("deliverables", []);
      const it=all.find(x=> x.id===id);
      if(it){ delete (it as any).deleted_at; saveLS("deliverables", all); }
    }
  },
  async saveDeliverable(del: Deliverable) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO deliverables (id,course_id,type,title,description,due_date,due_time,end_date,end_time,location,duration_minutes,weight,max_score,obtained_score,status,priority,tags_json,links_json,attachments_json,reminder_minutes_before,estimated_hours,week_number,is_exact_date,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
        [del.id, del.courseId, del.type, del.title, del.description || null, del.dueDate, del.dueTime, del.endDate || null, del.endTime || null, del.location || null, del.durationMinutes || null, del.weight ?? null, del.maxScore ?? null, del.obtainedScore ?? null, del.status, del.priority, JSON.stringify(del.tags), JSON.stringify(del.links || []), JSON.stringify(del.attachments || []), del.reminderMinutesBefore, del.estimatedHours ?? null, del.weekNumber ?? null, del.isExactDate ? 1 : 0, del.createdAt]
      );
    } else {
      const all = loadLS<Deliverable[]>("deliverables", []);
      const idx = all.findIndex(x => x.id === del.id);
      if (idx >= 0) all[idx] = del; else all.push(del);
      saveLS("deliverables", all);
    }
  },
  async deleteDeliverable(id: string) {
    try{
      const d2=await getDb();
      if(d2){
        const rows:any[]=await d2.select("SELECT * FROM deliverables WHERE id=$1",[id]);
        if(rows[0]) await db._backupTrash("deliverable", rows[0]);
      } else {
        const all=loadLS<any[]>("deliverables", []);
        const it=all.find(x=> x.id===id);
        if(it) await db._backupTrash("deliverable", it);
      }
    }catch{}
    const d = await getDb();
    if (d) await d.execute("UPDATE deliverables SET deleted_at=$1 WHERE id=$2",[new Date().toISOString(), id]);
    else {
      let all = loadLS<any[]>("deliverables", []);
      const it=all.find(x=> x.id===id);
      if(it){ (it as any).deleted_at=new Date().toISOString(); saveLS("deliverables", all); }
    }
  },
  async hardDeleteDeliverable(id:string){
    const d=await getDb();
    if(d) await d.execute("DELETE FROM deliverables WHERE id=$1",[id]);
    else {
      let all=loadLS<Deliverable[]>("deliverables", []);
      all=all.filter(x=> x.id!==id); saveLS("deliverables", all);
    }
  },

  // SETTINGS (admin_config, etc.)
  async getSetting(key: string): Promise<string | null> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT value FROM app_settings WHERE key=$1", [key]);
      return rows[0]?.value || null;
    } else {
      return localStorage.getItem(lsKey(`setting_${key}`));
    }
  },
  async setSetting(key: string, value: string) {
    const d = await getDb();
    if (d) {
      await d.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ($1,$2)", [key, value]);
    } else {
      localStorage.setItem(lsKey(`setting_${key}`), value);
    }
  },
  // VAULT (privado por usuario, admin sin acceso)
  async listVault(userId: string): Promise<import("../types").VaultItem[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM vault_items WHERE user_id=$1 AND (deleted_at IS NULL OR deleted_at='') ORDER BY updated_at DESC", [userId]);
      return rows.map((r:any)=> ({
        id: r.id, userId: r.user_id, title: r.title, url: r.url, username: r.username, password: r.password, notes: r.notes||undefined, category: r.category||undefined, createdAt: r.created_at, updatedAt: r.updated_at
      }));
    } else {
      const all = loadLS<any[]>("vault", []);
      const filtered = all.filter(v=> (v.userId ?? v.user_id)===userId && !(v as any).deleted_at);
      return filtered.map(v=> {
        if (v.user_id !== undefined || v.created_at !== undefined) {
          return { id: v.id, userId: v.user_id, title: v.title, url: v.url, username: v.username, password: v.password, notes: v.notes||undefined, category: v.category||undefined, createdAt: v.created_at, updatedAt: v.updated_at } as any;
        }
        return v as any;
      });
    }
  },
  async listTrashedVault(userId: string): Promise<import("../types").VaultItem[]> {
    const d=await getDb();
    if(d){
      const rows:any[] = await d.select("SELECT * FROM vault_items WHERE user_id=$1 AND deleted_at IS NOT NULL AND deleted_at<>'' ORDER BY deleted_at DESC",[userId]);
      return rows.map((r:any)=> ({ id: r.id, userId: r.user_id, title: r.title, url: r.url, username: r.username, password: r.password, notes: r.notes||undefined, category: r.category||undefined, createdAt: r.created_at, updatedAt: r.updated_at }));
    } else {
      const all=loadLS<any[]>("vault", []);
      const filtered = all.filter(v=> (v.userId ?? v.user_id)===userId && (v as any).deleted_at);
      return filtered.map(v=> {
        if (v.user_id !== undefined || v.created_at !== undefined) {
          return { id: v.id, userId: v.user_id, title: v.title, url: v.url, username: v.username, password: v.password, notes: v.notes||undefined, category: v.category||undefined, createdAt: v.created_at, updatedAt: v.updated_at } as any;
        }
        return v as any;
      });
    }
  },
  async restoreVault(id:string){
    const d=await getDb();
    if(d) await d.execute("UPDATE vault_items SET deleted_at=NULL WHERE id=$1",[id]);
    else {
      const all=loadLS<any[]>("vault", []);
      const it=all.find(x=> x.id===id);
      if(it){ delete (it as any).deleted_at; saveLS("vault", all); }
    }
  },
  async saveVault(item: import("../types").VaultItem) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO vault_items (id,user_id,title,url,username,password,notes,category,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [item.id, item.userId, item.title, item.url, item.username, item.password, item.notes||null, item.category||null, item.createdAt, item.updatedAt]
      );
    } else {
      const all = loadLS<import("../types").VaultItem[]>("vault", []);
      const idx=all.findIndex(x=> x.id===item.id);
      if(idx>=0) all[idx]=item; else all.push(item);
      saveLS("vault", all);
    }
  },
  async deleteVault(id: string) {
    try{
      const d2=await getDb();
      if(d2){
        const rows:any[]=await d2.select("SELECT * FROM vault_items WHERE id=$1",[id]);
        if(rows[0]) await db._backupTrash("vault", rows[0]);
      } else {
        const all=loadLS<any[]>("vault", []);
        const it=all.find(x=> x.id===id);
        if(it) await db._backupTrash("vault", it);
      }
    }catch{}
    const d = await getDb();
    if (d) await d.execute("UPDATE vault_items SET deleted_at=$1 WHERE id=$2",[new Date().toISOString(), id]);
    else {
      let all=loadLS<any[]>("vault", []);
      const it=all.find(x=> x.id===id);
      if(it){ (it as any).deleted_at=new Date().toISOString(); saveLS("vault", all); }
    }
  },
  async hardDeleteVault(id:string){
    const d=await getDb();
    if(d) await d.execute("DELETE FROM vault_items WHERE id=$1",[id]);
    else {
      let all=loadLS<import("../types").VaultItem[]>("vault", []);
      all=all.filter(x=> x.id!==id); saveLS("vault", all);
    }
  },

  // GENERAL REMINDERS (pagos/trámites no ligados a curso)
  async listReminders(userId: string): Promise<import("../types").GeneralReminder[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM general_reminders WHERE user_id=$1 AND (deleted_at IS NULL OR deleted_at='') ORDER BY due_date ASC, due_time ASC", [userId]);
      return rows.map((r:any)=> ({
        id: r.id, userId: r.user_id, title: r.title, description: r.description||undefined, dueDate: r.due_date, dueTime: r.due_time, type: r.type, amount: r.amount??undefined, paid: !!r.paid, priority: r.priority, reminderMinutesBefore: r.reminder_minutes_before, recurring: r.recurring, createdAt: r.created_at
      }));
    } else {
      const all = loadLS<any[]>("reminders", []);
      const filtered = all.filter(x=> (x.userId ?? x.user_id)===userId && !(x as any).deleted_at);
      return filtered.map(v=> {
        if (v.user_id !== undefined || v.due_date !== undefined) {
          return { id: v.id, userId: v.user_id, title: v.title, description: v.description, dueDate: v.due_date, dueTime: v.due_time, type: v.type, amount: v.amount??undefined, paid: !!v.paid, priority: v.priority, reminderMinutesBefore: v.reminder_minutes_before, recurring: v.recurring, createdAt: v.created_at } as any;
        }
        return v as any;
      });
    }
  },
  async listTrashedReminders(userId: string): Promise<import("../types").GeneralReminder[]> {
    const d=await getDb();
    if(d){
      const rows:any[] = await d.select("SELECT * FROM general_reminders WHERE user_id=$1 AND deleted_at IS NOT NULL AND deleted_at<>'' ORDER BY deleted_at DESC",[userId]);
      return rows.map((r:any)=> ({ id: r.id, userId: r.user_id, title: r.title, description: r.description||undefined, dueDate: r.due_date, dueTime: r.due_time, type: r.type, amount: r.amount??undefined, paid: !!r.paid, priority: r.priority, reminderMinutesBefore: r.reminder_minutes_before, recurring: r.recurring, createdAt: r.created_at }));
    } else {
      const all=loadLS<any[]>("reminders", []);
      const filtered = all.filter(x=> (x.userId ?? x.user_id)===userId && (x as any).deleted_at);
      return filtered.map(v=> {
        if (v.user_id !== undefined || v.due_date !== undefined) {
          return { id: v.id, userId: v.user_id, title: v.title, description: v.description||undefined, dueDate: v.due_date, dueTime: v.due_time, type: v.type, amount: v.amount??undefined, paid: !!v.paid, priority: v.priority, reminderMinutesBefore: v.reminder_minutes_before, recurring: v.recurring, createdAt: v.created_at } as any;
        }
        return v as any;
      });
    }
  },
  async restoreReminder(id:string){
    const d=await getDb();
    if(d) await d.execute("UPDATE general_reminders SET deleted_at=NULL WHERE id=$1",[id]);
    else {
      const all=loadLS<any[]>("reminders", []);
      const it=all.find(x=> x.id===id);
      if(it){ delete (it as any).deleted_at; saveLS("reminders", all); }
    }
  },
  async saveReminder(rem: import("../types").GeneralReminder) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO general_reminders (id,user_id,title,description,due_date,due_time,type,amount,paid,priority,reminder_minutes_before,recurring,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [rem.id, rem.userId, rem.title, rem.description||null, rem.dueDate, rem.dueTime, rem.type, rem.amount??null, rem.paid?1:0, rem.priority, rem.reminderMinutesBefore, rem.recurring||"none", rem.createdAt]
      );
    } else {
      const all = loadLS<import("../types").GeneralReminder[]>("reminders", []);
      const idx=all.findIndex(x=> x.id===rem.id);
      if(idx>=0) all[idx]=rem; else all.push(rem);
      saveLS("reminders", all);
    }
  },
  async deleteReminder(id: string) {
    try{
      const d2=await getDb();
      if(d2){
        const rows:any[]=await d2.select("SELECT * FROM general_reminders WHERE id=$1",[id]);
        if(rows[0]) await db._backupTrash("reminder", rows[0]);
      } else {
        const all=loadLS<any[]>("reminders", []);
        const it=all.find(x=> x.id===id);
        if(it) await db._backupTrash("reminder", it);
      }
    }catch{}
    const d = await getDb();
    if (d) await d.execute("UPDATE general_reminders SET deleted_at=$1 WHERE id=$2",[new Date().toISOString(), id]);
    else {
      let all=loadLS<any[]>("reminders", []);
      const it=all.find(x=> x.id===id);
      if(it){ (it as any).deleted_at=new Date().toISOString(); saveLS("reminders", all); }
    }
  },
  async hardDeleteReminder(id:string){
    const d=await getDb();
    if(d) await d.execute("DELETE FROM general_reminders WHERE id=$1",[id]);
    else {
      let all=loadLS<import("../types").GeneralReminder[]>("reminders", []);
      all=all.filter(x=> x.id!==id); saveLS("reminders", all);
    }
  },

  // JOB OFFERS (propuestas laborales, v0.6.0)
  async listJobOffers(userId: string): Promise<import("../types").JobOffer[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM job_offers WHERE user_id=$1 AND (deleted_at IS NULL OR deleted_at='') ORDER BY created_at DESC", [userId]);
      return rows.map(mapJobOfferRow);
    } else {
      const all = loadLS<any[]>("job_offers", []);
      const filtered = all.filter(x => (x.userId ?? x.user_id) === userId && !(x as any).deleted_at);
      return filtered.map(v => {
        if (v.user_id !== undefined || v.schedule_json !== undefined) return mapJobOfferRow(v);
        return v as any;
      });
    }
  },
  async saveJobOffer(o: import("../types").JobOffer) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO job_offers (id,user_id,company,position,type,modality,location,schedule_json,bonuses_json,salary_min,salary_max,salary_period,deadline,status,url,contact,growth,notes,hired_start,hired_end,pay_date,pay_recurrence,pay_amount,show_in_calendar,added_to_cv,cv_work_id,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
        [o.id, o.userId, o.company, o.position, o.type, o.modality, o.location || null, JSON.stringify(o.schedule || []), JSON.stringify(o.bonuses || []), o.salaryMin ?? null, o.salaryMax ?? null, o.salaryPeriod, o.deadline || null, o.status, o.url || null, o.contact || null, o.growth ?? null, o.notes || null, o.hiredStart || null, o.hiredEnd || null, o.payDate || null, o.payRecurrence || null, o.payAmount ?? null, o.showInCalendar === undefined ? null : (o.showInCalendar ? 1 : 0), o.addedToCV ? 1 : 0, o.cvWorkId || null, o.createdAt]
      );
    } else {
      const all = loadLS<import("../types").JobOffer[]>("job_offers", []);
      const idx = all.findIndex(x => x.id === o.id);
      if (idx >= 0) all[idx] = o; else all.push(o);
      saveLS("job_offers", all);
    }
  },
  async deleteJobOffer(id: string) {
    const d = await getDb();
    if (d) await d.execute("UPDATE job_offers SET deleted_at=$1 WHERE id=$2", [new Date().toISOString(), id]);
    else {
      const all = loadLS<any[]>("job_offers", []);
      const it = all.find(x => x.id === id);
      if (it) { (it as any).deleted_at = new Date().toISOString(); saveLS("job_offers", all); }
    }
  },
  async restoreJobOffer(id: string) {
    const d = await getDb();
    if (d) await d.execute("UPDATE job_offers SET deleted_at=NULL WHERE id=$1", [id]);
    else {
      const all = loadLS<any[]>("job_offers", []);
      const it = all.find(x => x.id === id);
      if (it) { delete (it as any).deleted_at; saveLS("job_offers", all); }
    }
  },
  async hardDeleteJobOffer(id: string) {
    const d = await getDb();
    if (d) await d.execute("DELETE FROM job_offers WHERE id=$1", [id]);
    else {
      let all = loadLS<import("../types").JobOffer[]>("job_offers", []);
      all = all.filter(x => x.id !== id); saveLS("job_offers", all);
    }
  },

  // TRANSACTIONS / FINANZAS (v0.7.0)
  async listTransactions(userId: string): Promise<import("../types").MoneyTransaction[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM transactions WHERE user_id=$1 AND (deleted_at IS NULL OR deleted_at='') ORDER BY date DESC", [userId]);
      return rows.map(mapTxRow);
    } else {
      const all = loadLS<any[]>("transactions", []);
      const filtered = all.filter(x => (x.userId ?? x.user_id) === userId && !(x as any).deleted_at);
      return filtered
        .map(v => {
          if (v.user_id !== undefined) return mapTxRow(v);
          return v as any;
        })
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    }
  },
  async saveTransaction(t: import("../types").MoneyTransaction) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO transactions (id,user_id,kind,category,amount,date,recurring,note,debt_id,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [t.id, t.userId, t.kind, t.category, t.amount, t.date, t.recurring, t.note || null, t.debtId || null, t.createdAt]
      );
    } else {
      const all = loadLS<import("../types").MoneyTransaction[]>("transactions", []);
      const idx = all.findIndex(x => x.id === t.id);
      if (idx >= 0) all[idx] = t; else all.push(t);
      saveLS("transactions", all);
    }
  },
  async deleteTransaction(id: string) {
    const d = await getDb();
    if (d) await d.execute("UPDATE transactions SET deleted_at=$1 WHERE id=$2", [new Date().toISOString(), id]);
    else {
      const all = loadLS<any[]>("transactions", []);
      const it = all.find(x => x.id === id);
      if (it) { (it as any).deleted_at = new Date().toISOString(); saveLS("transactions", all); }
    }
  },
  async restoreTransaction(id: string) {
    const d = await getDb();
    if (d) await d.execute("UPDATE transactions SET deleted_at=NULL WHERE id=$1", [id]);
    else {
      const all = loadLS<any[]>("transactions", []);
      const it = all.find(x => x.id === id);
      if (it) { delete (it as any).deleted_at; saveLS("transactions", all); }
    }
  },
  async hardDeleteTransaction(id: string) {
    const d = await getDb();
    if (d) await d.execute("DELETE FROM transactions WHERE id=$1", [id]);
    else {
      let all = loadLS<import("../types").MoneyTransaction[]>("transactions", []);
      all = all.filter(x => x.id !== id); saveLS("transactions", all);
    }
  },

  // DEBTS (v0.7.1)
  async listDebts(userId: string): Promise<import("../types").Debt[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM debts WHERE user_id=$1 AND (deleted_at IS NULL OR deleted_at='') ORDER BY created_at DESC", [userId]);
      return rows.map(mapDebtRow);
    } else {
      const all = loadLS<any[]>("debts", []);
      const filtered = all.filter(x => (x.userId ?? x.user_id) === userId && !(x as any).deleted_at);
      return filtered.map(v => {
        if (v.user_id !== undefined) return mapDebtRow(v);
        return v as any;
      });
    }
  },
  async saveDebt(debt: import("../types").Debt) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO debts (id,user_id,creditor,title,total,due_date,notes,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [debt.id, debt.userId, debt.creditor, debt.title || null, debt.total, debt.dueDate || null, debt.notes || null, debt.createdAt]
      );
    } else {
      const all = loadLS<import("../types").Debt[]>("debts", []);
      const idx = all.findIndex(x => x.id === debt.id);
      if (idx >= 0) all[idx] = debt; else all.push(debt);
      saveLS("debts", all);
    }
  },
  async deleteDebt(id: string) {
    const d = await getDb();
    if (d) await d.execute("UPDATE debts SET deleted_at=$1 WHERE id=$2", [new Date().toISOString(), id]);
    else {
      const all = loadLS<any[]>("debts", []);
      const it = all.find(x => x.id === id);
      if (it) { (it as any).deleted_at = new Date().toISOString(); saveLS("debts", all); }
    }
  },
  async restoreDebt(id: string) {
    const d = await getDb();
    if (d) await d.execute("UPDATE debts SET deleted_at=NULL WHERE id=$1", [id]);
    else {
      const all = loadLS<any[]>("debts", []);
      const it = all.find(x => x.id === id);
      if (it) { delete (it as any).deleted_at; saveLS("debts", all); }
    }
  },
  async hardDeleteDebt(id: string) {
    const d = await getDb();
    if (d) await d.execute("DELETE FROM debts WHERE id=$1", [id]);
    else {
      let all = loadLS<import("../types").Debt[]>("debts", []);
      all = all.filter(x => x.id !== id); saveLS("debts", all);
    }
  },

  // STUDY SESSIONS / ENFOQUE (v0.8.0)
  async listStudySessions(userId: string): Promise<import("../types").StudySession[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM study_sessions WHERE user_id=$1 AND (deleted_at IS NULL OR deleted_at='') ORDER BY started_at DESC LIMIT 200", [userId]);
      return rows.map(mapStudySessionRow);
    } else {
      const all = loadLS<any[]>("study_sessions", []);
      const filtered = all.filter(x => (x.userId ?? x.user_id) === userId && !(x as any).deleted_at);
      return filtered
        .map(v => {
          if (v.user_id !== undefined) return mapStudySessionRow(v);
          return v as any;
        })
        .sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""))
        .slice(0, 200);
    }
  },
  async saveStudySession(s: import("../types").StudySession) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO study_sessions (id,user_id,course_id,title,preset,planned_minutes,actual_minutes,distractions,completed,started_at,ended_at,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [s.id, s.userId, s.courseId || null, s.title || null, s.preset, s.plannedMinutes, s.actualMinutes, s.distractions, s.completed ? 1 : 0, s.startedAt, s.endedAt || null, s.createdAt]
      );
    } else {
      const all = loadLS<import("../types").StudySession[]>("study_sessions", []);
      const idx = all.findIndex(x => x.id === s.id);
      if (idx >= 0) all[idx] = s; else all.push(s);
      saveLS("study_sessions", all);
    }
  },
  async deleteStudySession(id: string) {
    const d = await getDb();
    if (d) await d.execute("UPDATE study_sessions SET deleted_at=$1 WHERE id=$2", [new Date().toISOString(), id]);
    else {
      const all = loadLS<any[]>("study_sessions", []);
      const it = all.find(x => x.id === id);
      if (it) { (it as any).deleted_at = new Date().toISOString(); saveLS("study_sessions", all); }
    }
  },
  async restoreStudySession(id: string) {
    const d = await getDb();
    if (d) await d.execute("UPDATE study_sessions SET deleted_at=NULL WHERE id=$1", [id]);
    else {
      const all = loadLS<any[]>("study_sessions", []);
      const it = all.find(x => x.id === id);
      if (it) { delete (it as any).deleted_at; saveLS("study_sessions", all); }
    }
  },
  async hardDeleteStudySession(id: string) {
    const d = await getDb();
    if (d) await d.execute("DELETE FROM study_sessions WHERE id=$1", [id]);
    else {
      let all = loadLS<import("../types").StudySession[]>("study_sessions", []);
      all = all.filter(x => x.id !== id); saveLS("study_sessions", all);
    }
  },

  // TRASH: lecturas de borrado suave para entidades v0.6+ (v0.9.2)
  async listTrashedJobOffers(userId: string): Promise<import("../types").JobOffer[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM job_offers WHERE user_id=$1 AND deleted_at IS NOT NULL AND deleted_at<>'' ORDER BY deleted_at DESC", [userId]);
      return rows.map(mapJobOfferRow);
    } else {
      const all = loadLS<any[]>("job_offers", []);
      return all
        .filter(x => (x.userId ?? x.user_id) === userId && (x as any).deleted_at)
        .map(v => {
          if (v.user_id !== undefined || v.schedule_json !== undefined) return mapJobOfferRow(v);
          return v as any;
        });
    }
  },
  async listTrashedTransactions(userId: string): Promise<import("../types").MoneyTransaction[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM transactions WHERE user_id=$1 AND deleted_at IS NOT NULL AND deleted_at<>'' ORDER BY deleted_at DESC", [userId]);
      return rows.map(mapTxRow);
    } else {
      const all = loadLS<any[]>("transactions", []);
      return all
        .filter(x => (x.userId ?? x.user_id) === userId && (x as any).deleted_at)
        .map(v => {
          if (v.user_id !== undefined) return mapTxRow(v);
          return v as any;
        });
    }
  },
  async listTrashedDebts(userId: string): Promise<import("../types").Debt[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM debts WHERE user_id=$1 AND deleted_at IS NOT NULL AND deleted_at<>'' ORDER BY deleted_at DESC", [userId]);
      return rows.map(mapDebtRow);
    } else {
      const all = loadLS<any[]>("debts", []);
      return all.filter(x => (x.userId ?? x.user_id) === userId && (x as any).deleted_at);
    }
  },
  async listTrashedStudySessions(userId: string): Promise<import("../types").StudySession[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM study_sessions WHERE user_id=$1 AND deleted_at IS NOT NULL AND deleted_at<>'' ORDER BY deleted_at DESC", [userId]);
      return rows.map(mapStudySessionRow);
    } else {
      const all = loadLS<any[]>("study_sessions", []);
      return all
        .filter(x => (x.userId ?? x.user_id) === userId && (x as any).deleted_at)
        .map(v => {
          if (v.user_id !== undefined) return mapStudySessionRow(v);
          return v as any;
        });
    }
  },

  // PROJECT BOARDS + CARDS (v1.2.0, borrado físico con confirmación)
  async listProjectBoards(userId: string): Promise<import("../types").ProjectBoard[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM project_boards WHERE user_id=$1 ORDER BY created_at ASC", [userId]);
      return rows.map((r: any) => {
        const rules = safeJson(r.rules_json, null) || (r.auto_done ? { autoDone: true } : undefined);
        return { id: r.id, userId: r.user_id, name: r.name, columns: safeJson(r.columns_json, []), autoDone: !!(rules?.autoDone ?? r.auto_done), rules, createdAt: r.created_at };
      });
    } else {
      return loadLS<any[]>("project_boards", []).filter((x: any) => (x.userId ?? x.user_id) === userId);
    }
  },
  async saveProjectBoard(b: import("../types").ProjectBoard) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO project_boards (id,user_id,name,columns_json,auto_done,rules_json,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [b.id, b.userId, b.name, JSON.stringify(b.columns || []), b.autoDone ? 1 : 0, b.rules ? JSON.stringify(b.rules) : null, b.createdAt]
      );
    } else {
      const all = loadLS<any[]>("project_boards", []);
      const idx = all.findIndex((x: any) => x.id === b.id);
      if (idx >= 0) all[idx] = b; else all.push(b);
      saveLS("project_boards", all);
    }
  },
  async deleteProjectBoard(id: string) {
    const d = await getDb();
    if (d) {
      await d.execute("DELETE FROM project_cards WHERE board_id=$1", [id]);
      await d.execute("DELETE FROM project_boards WHERE id=$1", [id]);
    } else {
      let boards = loadLS<any[]>("project_boards", []);
      boards = boards.filter((x: any) => x.id !== id); saveLS("project_boards", boards);
      let cards = loadLS<any[]>("project_cards", []);
      cards = cards.filter((x: any) => (x.boardId ?? x.board_id) !== id); saveLS("project_cards", cards);
    }
  },
  async listProjectCards(boardId: string): Promise<import("../types").ProjectCard[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM project_cards WHERE board_id=$1 ORDER BY position ASC", [boardId]);
      return rows.map(mapProjectCardRow);
    } else {
      const all = loadLS<any[]>("project_cards", []);
      return all
        .filter((x: any) => (x.boardId ?? x.board_id) === boardId)
        .map((v: any) => {
          if (v.board_id !== undefined) return mapProjectCardRow(v);
          return v as any;
        })
        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
    }
  },
  async saveProjectCard(c: import("../types").ProjectCard) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO project_cards (id,board_id,column_id,title,description,labels_json,assignees_json,start_date,due_date,progress,checklist_json,position,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [c.id, c.boardId, c.columnId, c.title, c.desc || null, JSON.stringify(c.labels || []), JSON.stringify(c.assignees || []), c.startDate || null, c.dueDate || null, c.progress || 0, JSON.stringify(c.checklist || []), c.position || 0, c.createdAt]
      );
    } else {
      const all = loadLS<any[]>("project_cards", []);
      const idx = all.findIndex((x: any) => x.id === c.id);
      if (idx >= 0) all[idx] = c; else all.push(c);
      saveLS("project_cards", all);
    }
  },
  async deleteProjectCard(id: string) {
    const d = await getDb();
    if (d) await d.execute("DELETE FROM project_cards WHERE id=$1", [id]);
    else {
      let all = loadLS<any[]>("project_cards", []);
      all = all.filter((x: any) => x.id !== id); saveLS("project_cards", all);
    }
  },

  // NOTEBOOKS + NOTES (v1.3.0, borrado físico con confirmación)
  async listNotebooks(userId: string): Promise<import("../types").Notebook[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM notebooks WHERE user_id=$1 ORDER BY created_at ASC", [userId]);
      return rows.map((r: any) => ({ id: r.id, userId: r.user_id, name: r.name, createdAt: r.created_at }));
    } else {
      return loadLS<any[]>("notebooks", []).filter((x: any) => (x.userId ?? x.user_id) === userId);
    }
  },
  async saveNotebook(n: import("../types").Notebook) {
    const d = await getDb();
    if (d) {
      await d.execute(`INSERT OR REPLACE INTO notebooks (id,user_id,name,created_at) VALUES ($1,$2,$3,$4)`, [n.id, n.userId, n.name, n.createdAt]);
    } else {
      const all = loadLS<any[]>("notebooks", []);
      const idx = all.findIndex((x: any) => x.id === n.id);
      if (idx >= 0) all[idx] = n; else all.push(n);
      saveLS("notebooks", all);
    }
  },
  async deleteNotebook(id: string) {
    const d = await getDb();
    if (d) {
      await d.execute("UPDATE notes SET notebook_id=NULL WHERE notebook_id=$1", [id]);
      await d.execute("DELETE FROM notebooks WHERE id=$1", [id]);
    } else {
      let nbs = loadLS<any[]>("notebooks", []);
      nbs = nbs.filter((x: any) => x.id !== id); saveLS("notebooks", nbs);
      const notes = loadLS<any[]>("notes", []);
      for (const n of notes) if ((n as any).notebookId === id) delete (n as any).notebookId;
      saveLS("notes", notes);
    }
  },
  async listNotes(userId: string): Promise<import("../types").Note[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM notes WHERE user_id=$1 ORDER BY pinned DESC, updated_at DESC LIMIT 500", [userId]);
      return rows.map(mapNoteRow);
    } else {
      const all = loadLS<any[]>("notes", []);
      return all
        .filter((x: any) => (x.userId ?? x.user_id) === userId)
        .map((v: any) => {
          if (v.user_id !== undefined) return mapNoteRow(v);
          return v as any;
        })
        .sort((a: any, b: any) => ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || (b.updatedAt || "").localeCompare(a.updatedAt || ""))
        .slice(0, 500);
    }
  },
  async saveNote(n: import("../types").Note) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO notes (id,user_id,notebook_id,parent_id,title,content,tags_json,pinned,course_id,updated_at,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [n.id, n.userId, n.notebookId || null, n.parentId || null, n.title, n.content || null, JSON.stringify(n.tags || []), n.pinned ? 1 : 0, n.courseId || null, n.updatedAt, n.createdAt]
      );
    } else {
      const all = loadLS<any[]>("notes", []);
      const idx = all.findIndex((x: any) => x.id === n.id);
      if (idx >= 0) all[idx] = n; else all.push(n);
      saveLS("notes", all);
    }
  },
  async deleteNote(id: string) {
    const d = await getDb();
    if (d) {
      // las hijas suben un nivel (no se pierde contenido)
      await d.execute("UPDATE notes SET parent_id=(SELECT parent_id FROM notes WHERE id=$1) WHERE parent_id=$1", [id]);
      await d.execute("DELETE FROM notes WHERE id=$1", [id]);
    } else {
      const all = loadLS<any[]>("notes", []);
      const me = all.find((x: any) => x.id === id);
      const rest = all.filter((x: any) => x.id !== id);
      for (const n of rest) if ((n as any).parentId === id) (n as any).parentId = me?.parentId;
      saveLS("notes", rest);
    }
  },

  // DECKS + FLASHCARDS + ATTENDANCE (v1.6.0, borrado físico con confirmación)
  async listDecks(userId: string): Promise<import("../types").Deck[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM decks WHERE user_id=$1 ORDER BY created_at ASC", [userId]);
      return rows.map((r: any) => ({ id: r.id, userId: r.user_id, courseId: r.course_id || undefined, name: r.name, createdAt: r.created_at }));
    } else {
      return loadLS<any[]>("decks", []).filter((x: any) => (x.userId ?? x.user_id) === userId);
    }
  },
  async saveDeck(x: import("../types").Deck) {
    const d = await getDb();
    if (d) {
      await d.execute(`INSERT OR REPLACE INTO decks (id,user_id,course_id,name,created_at) VALUES ($1,$2,$3,$4,$5)`,
        [x.id, x.userId, x.courseId || null, x.name, x.createdAt]);
    } else {
      const all = loadLS<any[]>("decks", []);
      const idx = all.findIndex((a: any) => a.id === x.id);
      if (idx >= 0) all[idx] = x; else all.push(x);
      saveLS("decks", all);
    }
  },
  async deleteDeck(id: string) {
    const d = await getDb();
    if (d) {
      await d.execute("DELETE FROM flashcards WHERE deck_id=$1", [id]);
      await d.execute("DELETE FROM decks WHERE id=$1", [id]);
    } else {
      let ds = loadLS<any[]>("decks", []);
      ds = ds.filter((x: any) => x.id !== id); saveLS("decks", ds);
      let cs = loadLS<any[]>("flashcards", []);
      cs = cs.filter((x: any) => (x.deckId ?? x.deck_id) !== id); saveLS("flashcards", cs);
    }
  },
  async listFlashcards(deckId: string): Promise<import("../types").Flashcard[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM flashcards WHERE deck_id=$1 ORDER BY created_at ASC", [deckId]);
      return rows.map(mapFlashcardRow);
    } else {
      const all = loadLS<any[]>("flashcards", []);
      return all.filter((x: any) => (x.deckId ?? x.deck_id) === deckId)
        .map((v: any) => {
          if (v.deck_id !== undefined) return mapFlashcardRow(v);
          return v as any;
        });
    }
  },
  async saveFlashcard(c: import("../types").Flashcard) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO flashcards (id,deck_id,front,back,ease,reps,interval_days,next_review,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [c.id, c.deckId, c.front, c.back, c.ease, c.reps, c.interval, c.nextReview, c.createdAt]);
    } else {
      const all = loadLS<any[]>("flashcards", []);
      const idx = all.findIndex((x: any) => x.id === c.id);
      if (idx >= 0) all[idx] = c; else all.push(c);
      saveLS("flashcards", all);
    }
  },
  async deleteFlashcard(id: string) {
    const d = await getDb();
    if (d) await d.execute("DELETE FROM flashcards WHERE id=$1", [id]);
    else {
      let all = loadLS<any[]>("flashcards", []);
      all = all.filter((x: any) => x.id !== id); saveLS("flashcards", all);
    }
  },
  async listAttendance(courseId: string): Promise<import("../types").Attendance[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM attendance WHERE course_id=$1 ORDER BY date ASC", [courseId]);
      return rows.map(mapAttendanceRow);
    } else {
      const all = loadLS<any[]>("attendance", []);
      return all
        .filter((x: any) => (x.courseId ?? x.course_id) === courseId)
        .map((v: any) => {
          if (v.course_id !== undefined) return mapAttendanceRow(v);
          return v as any;
        })
        .sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""));
    }
  },
  async saveAttendance(a: import("../types").Attendance) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO attendance (id,user_id,course_id,date,slot_id,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [a.id, a.userId, a.courseId, a.date, a.slotId, a.status, a.createdAt]);
    } else {
      const all = loadLS<any[]>("attendance", []);
      const idx = all.findIndex((x: any) => x.id === a.id);
      if (idx >= 0) all[idx] = a; else all.push(a);
      saveLS("attendance", all);
    }
  },
  async deleteAttendance(id: string) {
    const d = await getDb();
    if (d) await d.execute("DELETE FROM attendance WHERE id=$1", [id]);
    else {
      let all = loadLS<any[]>("attendance", []);
      all = all.filter((x: any) => x.id !== id); saveLS("attendance", all);
    }
  },

  // ADMIN: all courses/deliverables regardless of user
  async listAllCourses(): Promise<Course[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM courses ORDER BY created_at DESC");
      return rows.map(mapCourseRow);
    } else {
      const all = loadLS<any[]>("courses", []);
      return all.map(c => {
        if (c.schedule_json !== undefined || c.user_id !== undefined) return mapCourseRow(c);
        return c as Course;
      });
    }
  },
  async listAllDeliverables(): Promise<Deliverable[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM deliverables ORDER BY due_date ASC");
      return rows.map(mapDelRow);
    } else {
      const all = loadLS<any[]>("deliverables", []);
      return all.map(c => {
        if (c.due_date !== undefined || c.course_id !== undefined) return mapDelRow(c);
        return c as Deliverable;
      });
    }
  },

  // CONTACTS
  async listContacts(userId: string): Promise<Contact[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM contacts WHERE user_id=$1 ORDER BY name ASC", [userId]);
      return rows.map((r: any) => ({
        id: r.id, userId: r.user_id, name: r.name, relation: r.relation,
        phone: r.phone || undefined, email: r.email || undefined, birthday: r.birthday || undefined,
        company: r.company || undefined, role: r.role || undefined, notes: r.notes || undefined,
        tags: safeJson(r.tags_json, []), createdAt: r.created_at, updatedAt: r.updated_at,
      }));
    } else {
      return loadLS<any[]>("contacts", []).filter((c: any) => c.userId === userId);
    }
  },
  async saveContact(c: Contact) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO contacts (id,user_id,name,relation,phone,email,birthday,company,role,notes,tags_json,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [c.id, c.userId, c.name, c.relation, c.phone||null, c.email||null, c.birthday||null, c.company||null, c.role||null, c.notes||null, JSON.stringify(c.tags||[]), c.createdAt, c.updatedAt]
      );
    } else {
      const all = loadLS<any[]>("contacts", []);
      const idx = all.findIndex((x: any) => x.id === c.id);
      if (idx >= 0) all[idx] = c; else all.push(c);
      saveLS("contacts", all);
    }
  },
  async deleteContact(id: string) {
    const d = await getDb();
    if (d) await d.execute("DELETE FROM contacts WHERE id=$1", [id]);
    else {
      let all = loadLS<any[]>("contacts", []);
      all = all.filter((x: any) => x.id !== id);
      saveLS("contacts", all);
    }
  },

  // CV PROFILE
  async getCVProfile(userId: string): Promise<CVProfile | null> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM cv_profile WHERE user_id=$1", [userId]);
      if (!rows.length) return null;
      const r = rows[0];
      return { id: r.id, userId: r.user_id, fullName: r.full_name, title: r.title||undefined, email: r.email||undefined, phone: r.phone||undefined, location: r.location||undefined, website: r.website||undefined, linkedin: r.linkedin||undefined, github: r.github||undefined, summary: r.summary||undefined, photoUrl: r.photo_url||undefined, updatedAt: r.updated_at };
    } else {
      const all = loadLS<any[]>("cv_profiles", []);
      return all.find((p: any) => p.userId === userId) || null;
    }
  },
  async saveCVProfile(p: CVProfile) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO cv_profile (id,user_id,full_name,title,email,phone,location,website,linkedin,github,summary,photo_url,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [p.id, p.userId, p.fullName, p.title||null, p.email||null, p.phone||null, p.location||null, p.website||null, p.linkedin||null, p.github||null, p.summary||null, p.photoUrl||null, p.updatedAt]
      );
    } else {
      const all = loadLS<any[]>("cv_profiles", []);
      const idx = all.findIndex((x: any) => x.id === p.id);
      if (idx >= 0) all[idx] = p; else all.push(p);
      saveLS("cv_profiles", all);
    }
  },

  // CV WORK
  async listCVWork(userId: string): Promise<CVWorkExperience[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM cv_work WHERE user_id=$1 ORDER BY sort_order ASC", [userId]);
      return rows.map((r: any) => ({ id: r.id, userId: r.user_id, company: r.company, role: r.role, startDate: r.start_date, endDate: r.end_date||undefined, current: !!r.current, description: r.description||undefined, achievements: safeJson(r.achievements_json, []), skills: safeJson(r.skills_json, []), order: r.sort_order }));
    } else {
      return loadLS<any[]>("cv_work", []).filter((x: any) => x.userId === userId).sort((a: any, b: any) => a.order - b.order);
    }
  },
  async saveCVWork(w: CVWorkExperience) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO cv_work (id,user_id,company,role,start_date,end_date,current,description,achievements_json,skills_json,sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [w.id, w.userId, w.company, w.role, w.startDate, w.endDate||null, w.current?1:0, w.description||null, JSON.stringify(w.achievements||[]), JSON.stringify(w.skills||[]), w.order]
      );
    } else {
      const all = loadLS<any[]>("cv_work", []);
      const idx = all.findIndex((x: any) => x.id === w.id);
      if (idx >= 0) all[idx] = w; else all.push(w);
      saveLS("cv_work", all);
    }
  },
  async deleteCVWork(id: string) {
    const d = await getDb();
    if (d) await d.execute("DELETE FROM cv_work WHERE id=$1", [id]);
    else { let all = loadLS<any[]>("cv_work", []); all = all.filter((x: any) => x.id !== id); saveLS("cv_work", all); }
  },

  // CV EDUCATION
  async listCVEducation(userId: string): Promise<CVEducation[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM cv_education WHERE user_id=$1 ORDER BY sort_order ASC", [userId]);
      return rows.map((r: any) => ({ id: r.id, userId: r.user_id, institution: r.institution, degree: r.degree, field: r.field||undefined, startDate: r.start_date, endDate: r.end_date||undefined, current: !!r.current, gpa: r.gpa||undefined, notes: r.notes||undefined, order: r.sort_order }));
    } else {
      return loadLS<any[]>("cv_education", []).filter((x: any) => x.userId === userId).sort((a: any, b: any) => a.order - b.order);
    }
  },
  async saveCVEducation(e: CVEducation) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO cv_education (id,user_id,institution,degree,field,start_date,end_date,current,gpa,notes,sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [e.id, e.userId, e.institution, e.degree, e.field||null, e.startDate, e.endDate||null, e.current?1:0, e.gpa||null, e.notes||null, e.order]
      );
    } else {
      const all = loadLS<any[]>("cv_education", []);
      const idx = all.findIndex((x: any) => x.id === e.id);
      if (idx >= 0) all[idx] = e; else all.push(e);
      saveLS("cv_education", all);
    }
  },
  async deleteCVEducation(id: string) {
    const d = await getDb();
    if (d) await d.execute("DELETE FROM cv_education WHERE id=$1", [id]);
    else { let all = loadLS<any[]>("cv_education", []); all = all.filter((x: any) => x.id !== id); saveLS("cv_education", all); }
  },

  // CV SKILLS
  async listCVSkills(userId: string): Promise<CVSkill[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM cv_skills WHERE user_id=$1 ORDER BY sort_order ASC", [userId]);
      return rows.map((r: any) => ({ id: r.id, userId: r.user_id, name: r.name, category: r.category||undefined, level: r.level, order: r.sort_order }));
    } else {
      return loadLS<any[]>("cv_skills", []).filter((x: any) => x.userId === userId).sort((a: any, b: any) => a.order - b.order);
    }
  },
  async saveCVSkill(s: CVSkill) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO cv_skills (id,user_id,name,category,level,sort_order) VALUES ($1,$2,$3,$4,$5,$6)`,
        [s.id, s.userId, s.name, s.category||null, s.level, s.order]
      );
    } else {
      const all = loadLS<any[]>("cv_skills", []);
      const idx = all.findIndex((x: any) => x.id === s.id);
      if (idx >= 0) all[idx] = s; else all.push(s);
      saveLS("cv_skills", all);
    }
  },
  async deleteCVSkill(id: string) {
    const d = await getDb();
    if (d) await d.execute("DELETE FROM cv_skills WHERE id=$1", [id]);
    else { let all = loadLS<any[]>("cv_skills", []); all = all.filter((x: any) => x.id !== id); saveLS("cv_skills", all); }
  },

  // CV LANGUAGES
  async listCVLanguages(userId: string): Promise<CVLanguage[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM cv_languages WHERE user_id=$1 ORDER BY sort_order ASC", [userId]);
      return rows.map((r: any) => ({ id: r.id, userId: r.user_id, name: r.name, level: r.level, listening: r.listening||"Intermedio", writing: r.writing||"Intermedio", speaking: r.speaking||"Intermedio", order: r.sort_order }));
    } else {
      return loadLS<any[]>("cv_languages", []).filter((x: any) => x.userId === userId).sort((a: any, b: any) => a.order - b.order);
    }
  },
  async saveCVLanguage(l: CVLanguage) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO cv_languages (id,user_id,name,level,listening,writing,speaking,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [l.id, l.userId, l.name, l.level, l.listening||"Intermedio", l.writing||"Intermedio", l.speaking||"Intermedio", l.order]
      );
    } else {
      const all = loadLS<any[]>("cv_languages", []);
      const idx = all.findIndex((x: any) => x.id === l.id);
      if (idx >= 0) all[idx] = l; else all.push(l);
      saveLS("cv_languages", all);
    }
  },
  async deleteCVLanguage(id: string) {
    const d = await getDb();
    if (d) await d.execute("DELETE FROM cv_languages WHERE id=$1", [id]);
    else { let all = loadLS<any[]>("cv_languages", []); all = all.filter((x: any) => x.id !== id); saveLS("cv_languages", all); }
  },

  // CV CERTIFICATES
  async listCVCertificates(userId: string): Promise<CVCertificate[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM cv_certificates WHERE user_id=$1 ORDER BY sort_order ASC", [userId]);
      return rows.map((r: any) => ({ id: r.id, userId: r.user_id, name: r.name, issuer: r.issuer, date: r.date||undefined, url: r.url||undefined, order: r.sort_order }));
    } else {
      return loadLS<any[]>("cv_certificates", []).filter((x: any) => x.userId === userId).sort((a: any, b: any) => a.order - b.order);
    }
  },
  async saveCVCertificate(c: CVCertificate) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO cv_certificates (id,user_id,name,issuer,date,url,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [c.id, c.userId, c.name, c.issuer, c.date||null, c.url||null, c.order]
      );
    } else {
      const all = loadLS<any[]>("cv_certificates", []);
      const idx = all.findIndex((x: any) => x.id === c.id);
      if (idx >= 0) all[idx] = c; else all.push(c);
      saveLS("cv_certificates", all);
    }
  },
  async deleteCVCertificate(id: string) {
    const d = await getDb();
    if (d) await d.execute("DELETE FROM cv_certificates WHERE id=$1", [id]);
    else { let all = loadLS<any[]>("cv_certificates", []); all = all.filter((x: any) => x.id !== id); saveLS("cv_certificates", all); }
  },

  // PORTFOLIO
  async listPortfolio(userId: string): Promise<PortfolioItem[]> {
    const d = await getDb();
    if (d) {
      const rows: any[] = await d.select("SELECT * FROM portfolio_items WHERE user_id=$1 ORDER BY sort_order ASC", [userId]);
      return rows.map((r: any) => ({ id: r.id, userId: r.user_id, title: r.title, category: r.category, description: r.description||undefined, url: r.url||undefined, imageUrl: r.image_url||undefined, tags: safeJson(r.tags_json, []), date: r.date||undefined, order: r.sort_order, extra: safeJson(r.extra_json, undefined), createdAt: r.created_at }));
    } else {
      return loadLS<any[]>("portfolio", []).filter((x: any) => x.userId === userId).sort((a: any, b: any) => a.order - b.order);
    }
  },
  async savePortfolio(p: PortfolioItem) {
    const d = await getDb();
    if (d) {
      await d.execute(
        `INSERT OR REPLACE INTO portfolio_items (id,user_id,title,category,description,url,image_url,tags_json,date,sort_order,extra_json,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [p.id, p.userId, p.title, p.category, p.description||null, p.url||null, p.imageUrl||null, JSON.stringify(p.tags||[]), p.date||null, p.order, p.extra ? JSON.stringify(p.extra) : null, p.createdAt]
      );
    } else {
      const all = loadLS<any[]>("portfolio", []);
      const idx = all.findIndex((x: any) => x.id === p.id);
      if (idx >= 0) all[idx] = p; else all.push(p);
      saveLS("portfolio", all);
    }
  },
  async deletePortfolio(id: string) {
    const d = await getDb();
    if (d) await d.execute("DELETE FROM portfolio_items WHERE id=$1", [id]);
    else { let all = loadLS<any[]>("portfolio", []); all = all.filter((x: any) => x.id !== id); saveLS("portfolio", all); }
  },
};

function mapCourseRow(r: any): Course {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    code: r.code,
    color: r.color,
    credits: r.credits,
    semester: r.semester,
    professor: r.professor,
    professorEmail: r.professor_email,
    classroom: r.classroom,
    schedule: safeJson(r.schedule_json, []),
    links: safeJson(r.links_json, []),
    credentials: safeJson(r.credentials_json, []),
    attachments: safeJson(r.attachments_json, []),
    weighting: safeJson(r.weighting_json, []),
    status: r.status,
    startDate: r.start_date || undefined,
    endDate: r.end_date || undefined,
    minPassingGrade: r.min_passing_grade ?? undefined,
    absenceLimit: r.absence_limit ?? undefined,
    createdAt: r.created_at,
  };
}
function mapDelRow(r: any): Deliverable {
  return {
    id: r.id,
    courseId: r.course_id,
    type: r.type,
    title: r.title,
    description: r.description || undefined,
    dueDate: r.due_date,
    dueTime: r.due_time,
    endDate: r.end_date || undefined,
    endTime: r.end_time || undefined,
    location: r.location || undefined,
    durationMinutes: r.duration_minutes || undefined,
    weight: r.weight ?? undefined,
    maxScore: r.max_score ?? undefined,
    obtainedScore: r.obtained_score ?? undefined,
    status: r.status,
    priority: r.priority,
    tags: safeJson(r.tags_json, []),
    links: safeJson(r.links_json, []),
    attachments: safeJson(r.attachments_json, []),
    reminderMinutesBefore: r.reminder_minutes_before,
    estimatedHours: r.estimated_hours ?? undefined,
    weekNumber: r.week_number ?? undefined,
    isExactDate: r.is_exact_date === 1 || r.is_exact_date === true,
    createdAt: r.created_at,
  };
}
function mapJobOfferRow(r: any): import("../types").JobOffer {
  return {
    id: r.id,
    userId: r.user_id,
    company: r.company,
    position: r.position,
    type: r.type,
    modality: r.modality,
    location: r.location || undefined,
    schedule: safeJson(r.schedule_json, []),
    bonuses: safeJson(r.bonuses_json, []),
    salaryMin: r.salary_min ?? undefined,
    salaryMax: r.salary_max ?? undefined,
    salaryPeriod: r.salary_period || "mes",
    deadline: r.deadline || undefined,
    status: r.status,
    url: r.url || undefined,
    contact: r.contact || undefined,
    growth: r.growth ?? undefined,
    notes: r.notes || undefined,
    hiredStart: r.hired_start || undefined,
    hiredEnd: r.hired_end || undefined,
    payDate: r.pay_date || undefined,
    payRecurrence: r.pay_recurrence || undefined,
    payAmount: r.pay_amount ?? undefined,
    showInCalendar: r.show_in_calendar === null || r.show_in_calendar === undefined ? undefined : !!r.show_in_calendar,
    addedToCV: !!r.added_to_cv,
    cvWorkId: r.cv_work_id || undefined,
    createdAt: r.created_at,
  };
}
function mapTxRow(r: any): import("../types").MoneyTransaction {
  return {
    id: r.id,
    userId: r.user_id,
    kind: r.kind,
    category: r.category,
    amount: r.amount,
    date: r.date,
    recurring: r.recurring || "none",
    note: r.note || undefined,
    debtId: r.debt_id || undefined,
    createdAt: r.created_at,
  };
}

function mapProjectCardRow(r: any): import("../types").ProjectCard {
  return {
    id: r.id,
    boardId: r.board_id,
    columnId: r.column_id,
    title: r.title,
    desc: r.description || undefined,
    labels: safeJson(r.labels_json, []),
    assignees: safeJson(r.assignees_json, []),
    startDate: r.start_date || undefined,
    dueDate: r.due_date || undefined,
    progress: r.progress ?? 0,
    checklist: safeJson(r.checklist_json, []),
    position: r.position ?? 0,
    createdAt: r.created_at,
  };
}

function mapNoteRow(r: any): import("../types").Note {
  return {
    id: r.id,
    userId: r.user_id,
    notebookId: r.notebook_id || undefined,
    parentId: r.parent_id || undefined,
    title: r.title,
    content: r.content || "",
    tags: safeJson(r.tags_json, []),
    pinned: !!r.pinned,
    courseId: r.course_id || undefined,
    updatedAt: r.updated_at,
    createdAt: r.created_at,
  };
}

function mapFlashcardRow(r: any): import("../types").Flashcard {
  return {
    id: r.id, deckId: r.deck_id, front: r.front, back: r.back,
    ease: r.ease ?? 2.5, reps: r.reps ?? 0, interval: r.interval_days ?? 0,
    nextReview: r.next_review, createdAt: r.created_at,
  };
}

function mapAttendanceRow(r: any): import("../types").Attendance {
  return {
    id: r.id, userId: r.user_id, courseId: r.course_id, date: r.date,
    slotId: r.slot_id, status: r.status, createdAt: r.created_at,
  };
}

function mapStudySessionRow(r: any): import("../types").StudySession {
  return {
    id: r.id,
    userId: r.user_id,
    courseId: r.course_id || undefined,
    title: r.title || undefined,
    preset: r.preset || "pomodoro",
    plannedMinutes: r.planned_minutes,
    actualMinutes: r.actual_minutes,
    distractions: r.distractions ?? 0,
    completed: !!r.completed,
    startedAt: r.started_at,
    endedAt: r.ended_at || undefined,
    createdAt: r.created_at,
  };
}

function mapDebtRow(r: any): import("../types").Debt {
  return {
    id: r.id,
    userId: r.user_id,
    creditor: r.creditor,
    title: r.title || undefined,
    total: r.total,
    dueDate: r.due_date || undefined,
    notes: r.notes || undefined,
    createdAt: r.created_at,
  };
}
function safeJson(s: string | null, fallback: any) {
  if (!s) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
}
