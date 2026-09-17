// Formulario de empleo dinámico por tipo (v0.9.1) — 100% puro.
// Misma ficha JobOffer (sin migración): solo cambia qué se muestra/pide.
// Los valores ocultos se conservan (no se borran al cambiar de tipo).

import type { JobOfferType, SalaryPeriod } from "../types";

export interface JobTypeConfig {
  scheduleHelper: boolean;      // atajo "mismo horario a varios días"
  scheduleHint: string;
  salaryPeriods: SalaryPeriod[]; // opciones válidas
  defaultPeriod: SalaryPeriod;
  showBonuses: boolean;         // bonos mensuales (fijo/parcial)
  showGrowth: boolean;
  deadlineLabel: string;
  hiringHint: string;
}

export const JOB_TYPE_CONFIG: Record<JobOfferType, JobTypeConfig> = {
  fijo: {
    scheduleHelper: true,
    scheduleHint: "Horario semanal fijo (Lun–Vie corrido con el atajo).",
    salaryPeriods: ["mes"], defaultPeriod: "mes",
    showBonuses: true, showGrowth: true,
    deadlineLabel: "Cierre postulación",
    hiringHint: "Contratación (fecha de ingreso, cobros mensuales).",
  },
  parcial: {
    scheduleHelper: true,
    scheduleHint: "Días y horas pactadas (suelen variar por día).",
    salaryPeriods: ["mes", "hora"], defaultPeriod: "mes",
    showBonuses: true, showGrowth: true,
    deadlineLabel: "Cierre postulación",
    hiringHint: "Contratación (inicio, fin si es por temporada, cobros).",
  },
  gig: {
    scheduleHelper: false,
    scheduleHint: "Día(s) del evento, uno por uno.",
    salaryPeriods: ["evento", "hora"], defaultPeriod: "evento",
    showBonuses: false, showGrowth: false,
    deadlineLabel: "Fecha del evento",
    hiringHint: "Si te contrataron: fecha del evento y cobro pactado.",
  },
  practica: {
    scheduleHelper: true,
    scheduleHint: "Horario del convenio de prácticas.",
    salaryPeriods: ["mes", "hora"], defaultPeriod: "mes",
    showBonuses: false, showGrowth: true,
    deadlineLabel: "Cierre postulación",
    hiringHint: "Convenio (inicio/fin según universidad y empresa).",
  },
};

export function jobTypeConfig(type: JobOfferType): JobTypeConfig {
  return JOB_TYPE_CONFIG[type] || JOB_TYPE_CONFIG.parcial;
}

/** Periodo válido al cambiar de tipo (si el actual no aplica, usa el default). */
export function validPeriodFor(type: JobOfferType, current: SalaryPeriod): SalaryPeriod {
  const cfg = jobTypeConfig(type);
  return cfg.salaryPeriods.includes(current) ? current : cfg.defaultPeriod;
}
