import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import { useAuth } from "./stores/useAuth";
import { useData } from "./stores/useData";
import { db } from "./lib/db";
import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import CoursesPage from "./pages/Courses";
// pesadas (tldraw ~1.7MB, fullcalendar): carga diferida para arranque rápido
const CalendarPage = lazy(() => import("./pages/Calendar"));
const BoardPage = lazy(() => import("./pages/Board"));
import ToolsPage from "./pages/Tools";
import SettingsPage from "./pages/Settings";
import VaultPage from "./pages/Vault";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import LicensePage from "./pages/License";
import { lic, type LicenseStatus, type TrialStatus } from "./lib/license";
import RemindersPage from "./pages/Reminders";
import AnalyticsPage from "./pages/Analytics";
import ReportPage from "./pages/Report";
import JobOffersPage from "./pages/JobOffers";
import FinancePage from "./pages/Finance";
import FocusPage from "./pages/Focus";
import ContactsPage from "./pages/Contacts";
import ProjectsPage from "./pages/Projects";
import GanttPage from "./pages/Gantt";
import NotesPage from "./pages/Notes";
import FlashcardsPage from "./pages/Flashcards";
import SparkyPage from "./pages/Sparky";
import CVPage from "./pages/CV";
import PortfolioPage from "./pages/Portfolio";
import { checkAndNotify } from "./lib/notifications";
import { escapeHtml } from "./lib/security";
import { applyAmbience, applyStoredTheme, installFx } from "./lib/themes";
import "./index.css";

function Shell() {
  const { fetchAll } = useData();
  useEffect(()=>{ fetchAll(); }, []);
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main scroll">
        <nav className="mobilenav">
          <NavLink to="/" end>🏠 Inicio</NavLink>
          <NavLink to="/courses">📚 Cursos</NavLink>
          <NavLink to="/calendar">📅 Calendario</NavLink>
          <NavLink to="/enfoque">⏱️ Enfoque</NavLink>
          <NavLink to="/empleo">💼 Empleo</NavLink>
          <NavLink to="/finanzas">💰 Finanzas</NavLink>
          <NavLink to="/notas">📝 Notas</NavLink>
          <NavLink to="/proyectos">🗂️ Proyectos</NavLink>
          <NavLink to="/settings">⚙️ Ajustes</NavLink>
        </nav>
        <Suspense fallback={<div className="muted" style={{ padding: 24 }}>Cargando…</div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/board" element={<BoardPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/cv" element={<CVPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/empleo" element={<JobOffersPage />} />
          <Route path="/finanzas" element={<FinancePage />} />
          <Route path="/enfoque" element={<FocusPage />} />
          <Route path="/proyectos" element={<ProjectsPage />} />
          <Route path="/gantt" element={<GanttPage />} />
          <Route path="/notas" element={<NotesPage />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/sparky" element={<SparkyPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  const { user, loading, init } = useAuth();
  // v1.0.0: onboarding solo si la DB no tiene usuarios (primer arranque)
  const [fresh, setFresh] = useState<boolean | null>(null);
  // v1.2.0: trial 7 días + licencia atada a máquina (web/dev sin Tauri = desbloqueado)
  const [licState, setLicState] = useState<{ trial: TrialStatus | null; lic: LicenseStatus } | null>(null);
  const refreshLicense = async () => {
    const [t, l] = await Promise.all([lic.trial(), lic.status()]);
    if (!t || !l) {
      setLicState({ trial: null, lic: { licensed: true, grandfather: false, reseller: null, expiry: null } });
      return;
    }
    let cur = l;
    if (!l.licensed) {
      // grandfather: instalaciones con datos previos a 1.2.0 no se bloquean
      const users = await db.listUsers().catch(() => []);
      const courses = await db.listAllCourses().catch(() => []);
      if (users.length > 0 || courses.length > 0) {
        await lic.claimGrandfather();
        cur = (await lic.status()) || l;
      }
    }
    setLicState({ trial: t, lic: cur });
  };
  useEffect(()=>{
    init(); db.init();
    db.listUsers().then(u => setFresh(u.length === 0)).catch(() => setFresh(false));
    refreshLicense();
    installFx();
    applyStoredTheme().catch(() => {});
    applyAmbience().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // X button: si "minimizar a bandeja" está activado, oculta la ventana en vez de cerrar
  useEffect(()=>{
    let unlisten: any;
    (async()=>{
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        unlisten = await win.onCloseRequested(async (event)=>{
          const wantTray = localStorage.getItem("uc_minimize_to_tray") === "1";
          if (wantTray) {
            event.preventDefault();
            await win.hide();
          }
          // si wantTray es false, no hacemos preventDefault → Tauri cierra normal
        });
      } catch {}
    })();
    return ()=> { if(unlisten) unlisten(); };
  }, []);
  // exitApp = cerrar del todo (desde botón "Cerrar programa" en Sidebar)
  useEffect(()=>{
    (window as any).exitApp = async()=>{
      try {
        const { exit } = await import("@tauri-apps/plugin-process");
        await exit(0);
      } catch {
        try { const { getCurrentWindow } = await import("@tauri-apps/api/window"); await getCurrentWindow().close(); } catch { window.close(); }
      }
    };
  },[]);
  // notificaciones globales cada 60s (1er y 2do plano con sonido)
  useEffect(()=>{
    if(!user) return;
    const { courses, deliverables } = useData.getState();
    const run = async()=>{
      try{
        const rems = await db.listReminders(user.id);
        await checkAndNotify(courses, deliverables, rems);
      }catch{}
      // autoguardado programado (una sola copia, se sobreescribe)
      try{
        const { checkAutoBackup } = await import("./lib/autobackup");
        await checkAutoBackup();
      }catch{}
    };
    run();
    const id=setInterval(run, 60*1000);
    // toast listener con snooze
    const onToast=(e:any)=>{
      const { title, body, id } = e.detail;
      const el=document.createElement("div");
      el.style.cssText="position:fixed;bottom:18px;right:18px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px 12px;box-shadow:var(--shadow-lg);font-size:12.5px;z-index:60;max-width:380px;font-weight:600;display:flex;flex-direction:column;gap:8px";
      el.innerHTML=`<div><b>${escapeHtml(title)}</b><div style="font-weight:400;color:var(--text-muted)">${escapeHtml(body)}</div></div><div style="display:flex;gap:6px"><button data-snooze="10" style="padding:4px 8px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);font-size:11px;cursor:pointer">Posponer 10m</button><button data-snooze="60" style="padding:4px 8px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);font-size:11px;cursor:pointer">1h</button><button data-close style="padding:4px 8px;border-radius:8px;border:1px solid var(--border);background:var(--primary);color:var(--surface);font-size:11px;cursor:pointer">Cerrar</button></div>`;
      const close=()=> el.remove();
      el.querySelector("[data-close]")?.addEventListener("click", close);
      el.querySelector('[data-snooze="10"]')?.addEventListener("click", async()=>{
        if(id){ const { snooze }=await import("./lib/notifications"); snooze(id,10); }
        close();
      });
      el.querySelector('[data-snooze="60"]')?.addEventListener("click", async()=>{
        if(id){ const { snooze }=await import("./lib/notifications"); snooze(id,60); }
        close();
      });
      document.body.appendChild(el);
      setTimeout(close, 8000);
    };
    window.addEventListener("uc-toast", onToast as any);
    return ()=>{ clearInterval(id); window.removeEventListener("uc-toast", onToast as any); };
  },[user?.id]);

  if (loading || fresh === null || !licState) return <div style={{ height:"100vh", display:"grid", placeItems:"center" }} className="muted">Cargando…</div>;
  const locked = !licState.lic.licensed && (licState.trial?.expired ?? false);
  if (locked) return <LicensePage onActivated={() => { void refreshLicense(); }} />;
  if (!user && fresh) return <Onboarding onDone={() => setFresh(false)} />;
  if (!user) return <Login />;
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
