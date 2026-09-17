import type { Deliverable, GeneralReminder, Course } from "../types";
import { db } from "./db";

export type NotifySettings = {
  enabled: boolean;
  soundEnabled: boolean;
  soundVolume: number; // 0-100
  soundFile?: string; // default beep
  foregroundToast: boolean;
  backgroundOS: boolean;
};

let audioCtx: AudioContext | null = null;

function playBeep(volume: number, soundFile?: string) {
  try {
    if (soundFile && soundFile.startsWith("data:audio")) {
      const audio=new Audio(soundFile);
      audio.volume=volume/100;
      audio.play().catch(()=>{});
      return;
    }
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = volume / 100 * 0.3;
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
    osc.stop(audioCtx.currentTime + 0.6);
  } catch {}
}

export async function getNotifySettings(): Promise<NotifySettings> {
  const raw = await db.getSetting("notify_settings");
  if (raw) try { return JSON.parse(raw); } catch {}
  const ls = localStorage.getItem("uc_notify_settings");
  if (ls) try { return JSON.parse(ls); } catch {}
  return { enabled: true, soundEnabled: true, soundVolume: 70, foregroundToast: true, backgroundOS: true };
}
export async function saveNotifySettings(s: NotifySettings) {
  const v = JSON.stringify(s);
  await db.setSetting("notify_settings", v);
  localStorage.setItem("uc_notify_settings", v);
}

let lastNotified = new Set<string>();
const snoozedUntil = new Map<string, number>(); // id -> epoch ms

export function snooze(id:string, minutes:number){
  snoozedUntil.set(id, Date.now()+ minutes*60*1000);
}
function isSnoozed(id:string):boolean{
  const until=snoozedUntil.get(id);
  if(!until) return false;
  if(Date.now() > until){ snoozedUntil.delete(id); return false; }
  return true;
}

export async function checkAndNotify(courses: Course[], deliverables: Deliverable[], reminders: GeneralReminder[]) {
  const settings = await getNotifySettings();
  if (!settings.enabled) return;
  const now = new Date();
  const toNotify: { id:string; title:string; body:string; priority:string }[] = [];

  // Deliverables próximos (ventana reminder)
  for (const d of deliverables) {
    if (d.status==="entregado"||d.status==="calificado") continue;
    const when = new Date(`${d.dueDate}T${d.dueTime}:00`);
    const diffMin = (when.getTime() - now.getTime())/60000;
    const key = `del_${d.id}_${d.dueDate}`;
    if (isSnoozed(key)) continue;
    if (diffMin>0 && diffMin <= d.reminderMinutesBefore && diffMin > d.reminderMinutesBefore -1 && !lastNotified.has(key)) {
      toNotify.push({ id:key, title:`${d.type.toUpperCase()}: ${d.title}`, body:`Vence ${d.dueDate} ${d.dueTime} • ${d.location||""} • peso ${d.weight??"—"}%`, priority:d.priority });
      lastNotified.add(key);
    }
    // si ya vencido y no entregado, notifica una vez al día
    if (diffMin<0 && diffMin>-60*24 && !lastNotified.has(`over_${d.id}`) && d.status==="pendiente") {
      // solo si venció hace <1h
      if (diffMin>-60) { toNotify.push({ id:`over_${d.id}`, title:`Vencido: ${d.title}`, body:`Venció ${d.dueDate} ${d.dueTime}`, priority:"alta" }); lastNotified.add(`over_${d.id}`); }
    }
  }
  // Reminders pagos/trámites
  for (const r of reminders) {
    if (r.paid) continue;
    const when = new Date(`${r.dueDate}T${r.dueTime}:00`);
    const diffMin=(when.getTime()-now.getTime())/60000;
    const key=`rem_${r.id}`;
    if (isSnoozed(key)) continue;
    if (diffMin>0 && diffMin <= r.reminderMinutesBefore && diffMin > r.reminderMinutesBefore-1 && !lastNotified.has(key)) {
      toNotify.push({ id:key, title:`${r.type==="pago"?"💳 Pago":"📋 Trámite"}: ${r.title}`, body:`${r.dueDate} ${r.dueTime}${r.amount?` • $${r.amount}`:""}`, priority:r.priority });
      lastNotified.add(key);
    }
  }
  // Clases que empiezan pronto (15 min antes)
  for (const c of courses) {
    if (!c.schedule.length) continue;
    for (const s of c.schedule) {
      const nowDay = now.getDay();
      if (s.dayOfWeek !== nowDay) continue;
      const [sh, sm] = s.startTime.split(":").map(Number);
      const classStart = new Date(now); classStart.setHours(sh, sm, 0, 0);
      const diffMin = (classStart.getTime() - now.getTime())/60000;
      const key=`class_${c.id}_${s.id}_${now.toISOString().slice(0,10)}`;
      if (isSnoozed(key)) continue;
      if (diffMin>0 && diffMin<=15 && diffMin>14 && !lastNotified.has(key)) {
        toNotify.push({ id:key, title:`Clase: ${c.code} ${c.name}`, body:`${s.startTime}-${s.endTime} en ${s.location} • ${s.type||""}`, priority:"media" });
        lastNotified.add(key);
      }
    }
  }

  // limpiar set si crece demasiado
  if (lastNotified.size>200) lastNotified.clear();

  for (const n of toNotify) {
    await showNotification(n.title, n.body, settings, n.id);
  }
}

async function showNotification(title: string, body: string, settings: NotifySettings, id?: string) {
  const isHidden = document.hidden;
  // foreground toast siempre si enabled
  if (!isHidden && settings.foregroundToast) {
    window.dispatchEvent(new CustomEvent("uc-toast", { detail:{ title, body, id } }));
  }
  // background OS notification
  if ((isHidden && settings.backgroundOS) || (!isHidden && settings.backgroundOS)) {
    try {
      const { isPermissionGranted, requestPermission, sendNotification } = await import("@tauri-apps/plugin-notification");
      let granted = await isPermissionGranted();
      if (!granted) granted = (await requestPermission())==="granted";
      if (granted) await sendNotification({ title, body });
      else throw new Error("no permission");
    } catch {
      if ("Notification" in window) {
        if (Notification.permission==="granted") new Notification(title, { body });
        else if (Notification.permission!=="denied") {
          const p=await Notification.requestPermission();
          if(p==="granted") new Notification(title, { body });
        }
      }
    }
  }
  if (settings.soundEnabled) playBeep(settings.soundVolume, settings.soundFile);
}
