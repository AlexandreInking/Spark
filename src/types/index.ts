// Spark - tipos core local-first

export type DeliverableType = "tarea" | "examen" | "practica" | "discusion" | "evento" | "entregable" | "clase" | "entrevista";
export type Priority = "alta" | "media" | "baja";
export type DeliverableStatus = "pendiente" | "en_progreso" | "entregado" | "calificado" | "vencido";
export type CourseStatus = "activo" | "archivado" | "completado";

export interface User {
  id: string;
  studentCode: string;
  displayName: string;
  avatar?: string;
  createdAt: string;
}

export interface Course {
  id: string;
  userId: string;
  name: string;
  code: string;
  color: string;
  credits: number;
  semester: string;
  professor: string;
  professorEmail?: string;
  classroom?: string;
  schedule: ClassSchedule[];
  links: CourseLink[];
  credentials: Credential[];
  attachments: CourseAttachment[];
  weighting?: GradeWeight[];
  status: CourseStatus;
  startDate?: string;
  endDate?: string;
  minPassingGrade?: number;
  absenceLimit?: number; // % faltas que inhabilita (default 30)
  createdAt: string;
}

export interface ClassSchedule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string;
  type?: string;
}

export interface CourseLink {
  id: string;
  label: string;
  url: string;
  kind: "clase_virtual" | "material" | "otro";
}

export interface Credential {
  id: string;
  label: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
}

export interface GradeWeight {
  id: string;
  item: string;
  weight: number;
  maxScore: number;
  obtainedScore?: number;
}

// --- MATERIAL DEL CURSO (v0.6.4: solo enlaces + tipo; dataUrl queda legacy 0.6.3, sigue descargable) ---
export type AttachmentFileType = "documento" | "video" | "audio" | "diapositiva" | "imagen" | "otro";

export interface CourseAttachment {
  id: string;
  name: string;
  mime: string;
  size?: number; // bytes (solo legacy)
  kind: "archivo" | "enlace";
  fileType?: AttachmentFileType; // qué encontrarás en el link
  dataUrl?: string; // legacy 0.6.3: archivo embebido (base64)
  url?: string;     // enlace externo (Drive, Mega, YouTube, etc.)
  createdAt: string;
}

export interface Deliverable {
  id: string;
  courseId: string;
  type: DeliverableType;
  title: string;
  description?: string;
  dueDate: string;
  dueTime: string;
  endDate?: string;
  endTime?: string;
  location?: string;
  durationMinutes?: number;
  weight?: number;
  maxScore?: number;
  obtainedScore?: number;
  status: DeliverableStatus;
  priority: Priority;
  tags: string[];
  links?: string[];
  attachments?: string[];
  reminderMinutesBefore: number;
  estimatedHours?: number;
  weekNumber?: number;
  isExactDate?: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  courseId?: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  color?: string;
  type: DeliverableType;
}

export interface OverlapAlert {
  id: string;
  a: Deliverable;
  b: Deliverable;
  reason: string;
}

export interface StudyBlock {
  date: string;
  start: string;
  end: string;
  deliverableId: string;
  title: string;
  priority: Priority;
}

export interface BoardDoc {
  id: string;
  title: string;
  snapshot: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface VaultItem {
  id: string;
  userId: string;
  title: string;
  url: string;
  username: string;
  password: string;
  notes?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReminderType = "pago" | "tramite" | "otro";
export interface GeneralReminder {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate: string;
  dueTime: string;
  type: ReminderType;
  amount?: number;
  paid?: boolean;
  priority: Priority;
  reminderMinutesBefore: number;
  recurring?: "none" | "semanal" | "mensual";
  createdAt: string;
}

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  soundFile?: string;
  foregroundToast: boolean;
  backgroundOS: boolean;
}

// --- CONTACTS ---
export type ContactRelation = "familiar" | "profesor" | "alumno" | "externo";
export interface Contact {
  id: string;
  userId: string;
  name: string;
  relation: ContactRelation;
  phone?: string;
  email?: string;
  birthday?: string;
  company?: string;
  role?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// --- CV / RESUME ---
export interface CVProfile {
  id: string;
  userId: string;
  fullName: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
  photoUrl?: string;
  updatedAt: string;
}

export interface CVWorkExperience {
  id: string;
  userId: string;
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  achievements?: string[];
  skills?: string[];
  order: number;
}

export interface CVEducation {
  id: string;
  userId: string;
  institution: string;
  degree: string;
  field?: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  gpa?: string;
  notes?: string;
  order: number;
}

export interface CVSkill {
  id: string;
  userId: string;
  name: string;
  category?: string;
  level?: number;
  order: number;
}

export interface CVLanguage {
  id: string;
  userId: string;
  name: string;
  level: string; // A1, A2, B1, B2, C1, C2, C2+
  listening: string; // Básico, Elemental, Intermedio, Avanzado, Nativo
  writing: string;
  speaking: string;
  order: number;
}

export interface CVCertificate {
  id: string;
  userId: string;
  name: string;
  issuer: string;
  date?: string;
  url?: string;
  order: number;
}

// --- EMPLEO / PROPUESTAS LABORALES (v0.6.0) ---
export type JobOfferType = "fijo" | "parcial" | "gig" | "practica";
export type JobOfferStatus = "guardada" | "postulada" | "entrevista" | "oferta" | "rechazada" | "descartada";
export type JobModality = "presencial" | "remoto" | "hibrido";
export type SalaryPeriod = "hora" | "mes" | "evento";

export interface JobSlot {
  id: string;
  dayOfWeek: number; // 0=Dom..6=Sáb
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

export type BonusConcept = "rendimiento" | "asistencia" | "otro";

export interface JobBonus {
  id: string;
  month: string;    // "YYYY-MM" mes al que corresponde
  amount: number;   // S/
  concept: BonusConcept;
  date?: string;    // YYYY-MM-DD cobro (si se sabe: aparece en calendario y cobros)
  notes?: string;
}

export interface JobOffer {
  id: string;
  userId: string;
  company: string;
  position: string;
  type: JobOfferType;
  modality: JobModality;
  location?: string;
  schedule: JobSlot[]; // horario propuesto (vacío = sin horario declarado, puede variar por día)
  bonuses: JobBonus[]; // bonos mensuales variables (rendimiento/asistencia)
  salaryMin?: number;
  salaryMax?: number;
  salaryPeriod: SalaryPeriod;
  deadline?: string; // YYYY-MM-DD límite de postulación
  status: JobOfferStatus;
  url?: string;
  contact?: string;
  growth?: number; // 1..5 crecimiento percibido
  notes?: string;
  // --- Contratación / historial laboral (v0.6.1). hiredStart define que YA es trabajo ---
  hiredStart?: string; // YYYY-MM-DD inicio (pasado = historial, futuro = se viene)
  hiredEnd?: string;   // YYYY-MM-DD fin (vacío = vigente)
  payDate?: string;    // YYYY-MM-DD próximo cobro
  payRecurrence?: PayRecurrence;
  payAmount?: number;  // monto esperado del cobro (S/)
  showInCalendar?: boolean; // default true (undefined = mostrar)
  addedToCV?: boolean; // importado manualmente al CV
  cvWorkId?: string;   // id del CVWorkExperience creado
  createdAt: string;
}

export type PayRecurrence = "unico" | "semanal" | "quincenal" | "mensual";

export interface CompareWeights {
  salary: number;
  compatibility: number;
  modality: number;
  growth: number;
}

// --- FINANZAS (v0.7.0): gastos vs ingresos manuales; trabajos y pagos alimentan lo proyectado ---
export type TxKind = "ingreso" | "gasto";
export type TxRecurrence = "none" | "semanal" | "quincenal" | "mensual";
export type TxCategory =
  | "sueldo" | "gig" | "bono" | "beca" | "familia" | "otro_ingreso"
  | "comida" | "transporte" | "vivienda" | "estudios" | "salud" | "ocio" | "deudas" | "otro_gasto";

export const TX_CATEGORIES: { value: TxCategory; label: string; kind: TxKind }[] = [
  { value: "sueldo", label: "Sueldo", kind: "ingreso" },
  { value: "gig", label: "Gig / evento", kind: "ingreso" },
  { value: "bono", label: "Bono", kind: "ingreso" },
  { value: "beca", label: "Beca", kind: "ingreso" },
  { value: "familia", label: "Familia", kind: "ingreso" },
  { value: "otro_ingreso", label: "Otro ingreso", kind: "ingreso" },
  { value: "comida", label: "Comida", kind: "gasto" },
  { value: "transporte", label: "Transporte", kind: "gasto" },
  { value: "vivienda", label: "Vivienda", kind: "gasto" },
  { value: "estudios", label: "Estudios", kind: "gasto" },
  { value: "salud", label: "Salud", kind: "gasto" },
  { value: "ocio", label: "Ocio", kind: "gasto" },
  { value: "deudas", label: "Deudas", kind: "gasto" },
  { value: "otro_gasto", label: "Otro gasto", kind: "gasto" },
];

export interface MoneyTransaction {
  id: string;
  userId: string;
  kind: TxKind;
  category: TxCategory;
  amount: number; // S/
  date: string;   // YYYY-MM-DD (inicio si es recurrente)
  recurring: TxRecurrence;
  note?: string;
  debtId?: string; // pago vinculado a una deuda (progreso derivado, v0.7.1)
  createdAt: string;
}

// --- DEUDAS (v0.7.1): saldo derivado de pagos vinculados; sin estado manual ---
export interface Debt {
  id: string;
  userId: string;
  creditor: string;
  title?: string;
  total: number; // S/ monto total adeudado
  dueDate?: string; // YYYY-MM-DD vencimiento (opcional)
  notes?: string;
  createdAt: string;
}

// --- ENFOQUE / SESIONES DE ESTUDIO (v0.8.0) ---
export type FocusPresetId = "pomodoro" | "ritmo52" | "ultradian90";

export interface StudySession {
  id: string;
  userId: string;
  courseId?: string;
  title?: string;
  preset: FocusPresetId;
  plannedMinutes: number;
  actualMinutes: number;
  distractions: number;
  completed: boolean;
  startedAt: string; // ISO
  endedAt?: string;  // ISO
  createdAt: string;
}

// --- PROYECTOS POR COLUMNAS + GANTT (v1.2.0; reglas/WIP/asignados v1.3.0) ---
export interface ProjectColumn { id: string; title: string; wip?: number; }

export interface BoardRules { autoDone?: boolean; autoProgress?: boolean; overdueToFront?: boolean; }

export interface ProjectBoard {
  id: string;
  userId: string;
  name: string;
  columns: ProjectColumn[];
  autoDone?: boolean; // legacy v1.2.0 (ver rules)
  rules?: BoardRules; // automatizaciones locales v1.3.0
  createdAt: string;
}

export interface ChecklistItem { id: string; text: string; done: boolean; }

export interface ProjectCard {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  desc?: string;
  labels: string[];
  assignees: string[]; // responsables (texto libre + contactos)
  startDate?: string; // YYYY-MM-DD (Gantt)
  dueDate?: string;   // YYYY-MM-DD
  progress: number;   // 0..100 (Gantt)
  checklist: ChecklistItem[];
  position: number;
  createdAt: string;
}

// --- FLASHCARDS SM-2 + ASISTENCIA (v1.6.0) ---
export interface Deck {
  id: string;
  userId: string;
  courseId?: string;
  name: string;
  createdAt: string;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  ease: number;      // factor SM-2 (inicia 2.5)
  reps: number;      // repeticiones consecutivas bien
  interval: number;  // días hasta el próximo repaso
  nextReview: string; // YYYY-MM-DD
  createdAt: string;
}

export type AttendanceStatus = "present" | "absent" | "late";

export interface Attendance {
  id: string; // `${courseId}_${YYYY-MM-DD}_${slotId}`
  userId: string;
  courseId: string;
  date: string; // YYYY-MM-DD
  slotId: string;
  status: AttendanceStatus;
  createdAt: string;
}

// --- NOTAS (v1.3.0, sin IA) ---
export interface Notebook { id: string; userId: string; name: string; createdAt: string; }

export interface Note {
  id: string;
  userId: string;
  notebookId?: string;
  parentId?: string; // subpágina
  title: string;
  content: string;   // texto con [[enlaces]], **negrita**, listas
  tags: string[];
  pinned: boolean;
  courseId?: string;
  updatedAt: string;
  createdAt: string;
}

// --- PORTFOLIO ---
export type PortfolioCategory = "diseno_grafico" | "marketing" | "fotografia" | "modelaje" | "desarrollo_software" | "big_data" | "genai" | "ai_training" | "otro";
export interface PortfolioItem {
  id: string;
  userId: string;
  title: string;
  category: PortfolioCategory;
  description?: string;
  url?: string;
  imageUrl?: string;
  tags?: string[];
  date?: string;
  order: number;
  extra?: Record<string, string>; // campos dinámicos por categoría (v0.9.0)
  createdAt: string;
}
