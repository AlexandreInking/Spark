import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, BookOpen, CalendarDays, StickyNote, Wrench, Settings, LogOut, Sparkles, KeyRound, Wallet, BarChart3, FileText, Users, UserSquare, Palette, Briefcase, Scale, Timer, LayoutGrid, CalendarRange, NotebookPen, Layers, Bot }
from "lucide-react";
import { useAuth } from "../../stores/useAuth";
import { lic } from "../../lib/license";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [trialDays, setTrialDays] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      const [t, l] = await Promise.all([lic.trial(), lic.status()]);
      if (t && l && !l.licensed && !t.expired) setTrialDays(t.days_left);
    })();
  }, []);
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div style={{ width:36, height:36, borderRadius:10, background:"#111827", display:"grid", placeItems:"center", color:"#fff" }}>
          <Sparkles size={18} />
        </div>
        <div>
          <h1>Spark</h1>
          <span>local-first</span>
        </div>
      </div>

      <div className="sidebar-scroll">
      <nav className="nav">
        <NavLink to="/" className={({isActive})=> isActive?"active":""}><LayoutDashboard size={16}/> Dashboard</NavLink>
        <NavLink to="/courses" className={({isActive})=> isActive?"active":""}><BookOpen size={16}/> Cursos</NavLink>
        <NavLink to="/calendar" className={({isActive})=> isActive?"active":""}><CalendarDays size={16}/> Calendario</NavLink>
        <NavLink to="/board" className={({isActive})=> isActive?"active":""}><StickyNote size={16}/> Board infinito</NavLink>
        <NavLink to="/tools" className={({isActive})=> isActive?"active":""}><Wrench size={16}/> Herramientas</NavLink>
        <NavLink to="/vault" className={({isActive})=> isActive?"active":""}><KeyRound size={16}/> Vault</NavLink>
        <NavLink to="/reminders" className={({isActive})=> isActive?"active":""}><Wallet size={16}/> Pagos y trámites</NavLink>
        <NavLink to="/contacts" className={({isActive})=> isActive?"active":""}><Users size={16}/> Contactos</NavLink>
        <NavLink to="/cv" className={({isActive})=> isActive?"active":""}><UserSquare size={16}/> CV / Currículum</NavLink>
        <NavLink to="/portfolio" className={({isActive})=> isActive?"active":""}><Palette size={16}/> Portafolio</NavLink>
        <NavLink to="/analytics" className={({isActive})=> isActive?"active":""}><BarChart3 size={16}/> Analítica</NavLink>
        <NavLink to="/report" className={({isActive})=> isActive?"active":""}><FileText size={16}/> Reporte</NavLink>
        <NavLink to="/empleo" className={({isActive})=> isActive?"active":""}><Briefcase size={16}/> Empleo</NavLink>
        <NavLink to="/finanzas" className={({isActive})=> isActive?"active":""}><Scale size={16}/> Finanzas</NavLink>
        <NavLink to="/enfoque" className={({isActive})=> isActive?"active":""}><Timer size={16}/> Enfoque</NavLink>
        <NavLink to="/proyectos" className={({isActive})=> isActive?"active":""}><LayoutGrid size={16}/> Proyectos</NavLink>
        <NavLink to="/gantt" className={({isActive})=> isActive?"active":""}><CalendarRange size={16}/> Gantt</NavLink>
        <NavLink to="/notas" className={({isActive})=> isActive?"active":""}><NotebookPen size={16}/> Notas</NavLink>
        <NavLink to="/flashcards" className={({isActive})=> isActive?"active":""}><Layers size={16}/> Flashcards</NavLink>
        <NavLink to="/sparky" className={({isActive})=> isActive?"active":""}><Bot size={16}/> Sparky</NavLink>
        <NavLink to="/settings" className={({isActive})=> isActive?"active":""}><Settings size={16}/> Ajustes</NavLink>
      </nav>
      </div>

      <div className="sidebar-footer">
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:999, background:"var(--surface-2)", border:"1px solid var(--border)", display:"grid", placeItems:"center", fontWeight:700, fontSize:12 }}>{user?.displayName?.[0]?.toUpperCase() || "A"}</div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user?.displayName}</div>
            <div style={{ fontSize:11, color:"var(--text-muted)" }}>{user?.studentCode}</div>
            {trialDays !== null && <div className="badge badge-warn" style={{ marginTop: 4, fontSize: 10 }}>Prueba: {trialDays}d</div>}
          </div>
        </div>
        <button className="btn btn-sm" onClick={logout}><LogOut size={14}/> Cerrar sesión</button>
        <button className="btn btn-sm" style={{ background:"var(--surface)", borderColor:"var(--border)" }} onClick={()=> (window as any).exitApp?.()} title="Cerrar programa">⛔ Cerrar programa</button>
      </div>
    </aside>
  );
}
