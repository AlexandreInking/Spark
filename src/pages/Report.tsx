import { useEffect, useState, useMemo } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Badge, Label, Select } from "../components/ui/primitives";
import { db } from "../lib/db";
import { useAuth } from "../stores/useAuth";
import type { User, Course, Deliverable } from "../types";
import { csvCell, escapeHtml } from "../lib/security";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";

function avgCourse(c: Course): number | null {
  const ws=c.weighting||[];
  const v=ws.filter(w=> w.obtainedScore!==undefined);
  if(!v.length) return null;
  const tw=v.reduce((s,w)=>s+w.weight,0);
  if(!tw) return null;
  return v.reduce((s,w)=> s+(w.obtainedScore!/w.maxScore)*w.weight,0)*(100/tw);
}

export default function ReportPage(){
  const { user } = useAuth();
  const [users, setUsers]=useState<User[]>([]);
  const [courses, setCourses]=useState<Course[]>([]);
  const [dels, setDels]=useState<Deliverable[]>([]);
  const [filterUser, setFilterUser]=useState<string>("todos");
  const [filterSem, setFilterSem]=useState<string>("todos");

  useEffect(()=>{
    (async()=>{
      const [u,c,d]=await Promise.all([db.listUsers(), db.listAllCourses(), db.listAllDeliverables()]);
      setUsers(u); setCourses(c); setDels(d);
    })();
  },[]);

  const filteredCourses = useMemo(()=>{
    return courses.filter(c=> (filterUser==="todos"||c.userId===filterUser) && (filterSem==="todos"||c.semester===filterSem));
  },[courses, filterUser, filterSem]);

  const sems = Array.from(new Set(courses.map(c=> c.semester).filter(Boolean) as string[]));

  const exportCSV=()=>{
    const rows=[["Alumno","Código","Curso","Semestre","Item","Peso%","Obtenido","Máximo","PromedioCurso"] as string[]];
    for(const c of filteredCourses){
      const u=users.find(x=> x.id===c.userId);
      const avg=avgCourse(c);
      if(!c.weighting?.length) rows.push([u?.displayName||"", u?.studentCode||"", c.code, c.semester||"", "-", "-", "-", "-", avg!==null? avg.toFixed(2):"—"]);
      else for(const w of c.weighting!){
        rows.push([u?.displayName||"", u?.studentCode||"", c.code, c.semester||"", w.item, String(w.weight), w.obtainedScore!==undefined? String(w.obtainedScore):"", String(w.maxScore), avg!==null? avg.toFixed(2):""]);
      }
    }
    const csv=rows.map(r=> r.map(csvCell).join(",")).join("\n");
    const blob=new Blob([csv],{ type:"text/csv;charset=utf-8;" });
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`reporte_notas_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const exportPDF=()=>{
    // Genera HTML imprimible y abre print
    const html = `
      <html><head><meta charset="utf-8"><title>Reporte General de Notas</title>
      <style>body{font-family:Inter, sans-serif; padding:24px; color:#111} table{width:100%; border-collapse:collapse; margin-top:12px} th,td{border:1px solid #ddd; padding:6px 8px; font-size:11px; text-align:left} th{background:#f1f5f9} h1{font-size:18px} h2{font-size:13px; color:#555}</style>
      </head><body>
      <h1>Spark — Reporte General de Notas</h1>
      <h2>Generado ${new Date().toLocaleString()} • Filtro: ${filterUser==="todos"?"Todos los alumnos": escapeHtml(users.find(u=>u.id===filterUser)?.displayName)} • ${escapeHtml(filterSem)}</h2>
      <table><tr><th>Alumno</th><th>Curso</th><th>Sem</th><th>Promedio</th><th>Items</th></tr>
      ${filteredCourses.map(c=>{
        const u=users.find(x=> x.id===c.userId);
        const avg=avgCourse(c);
        const items=(c.weighting||[]).map(w=> `${escapeHtml(w.item)} ${w.weight}% ${w.obtainedScore??"—"}/${w.maxScore}`).join("; ");
        return `<tr><td>${escapeHtml(u?.displayName)||""} (${escapeHtml(u?.studentCode)||""})</td><td>${escapeHtml(c.code)} ${escapeHtml(c.name)}</td><td>${escapeHtml(c.semester)||""}</td><td>${avg!==null? avg.toFixed(2):"—"}</td><td>${items||"—"}</td></tr>`;
      }).join("")}
      </table>
      <p style="margin-top:16px; font-size:11px; color:#666">Total cursos: ${filteredCourses.length} • Total entregables: ${dels.filter(d=> filteredCourses.some(c=>c.id===d.courseId)).length}</p>
      </body></html>`;
    const w=window.open("","_blank");
    if(w){ w.document.write(html); w.document.close(); w.focus(); setTimeout(()=> w.print(), 300); }
  };

  return (
    <div style={{ flex:1, overflow:"auto" }}>
      <Topbar title="Reporte general de notas" subtitle="Vista consolidada + exportación local PDF/CSV" actions={
        <div style={{ display:"flex", gap:8 }}>
          <Button size="sm" onClick={exportCSV}><FileSpreadsheet size={14}/> Exportar CSV</Button>
          <Button size="sm" variant="primary" onClick={exportPDF}><FileText size={14}/> Exportar PDF</Button>
          <Button size="sm" onClick={()=> window.print()}><Printer size={14}/> Imprimir</Button>
        </div>
      }/>
      <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14 }}>
        <Card>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"end" }}>
            <div><Label>Alumno</Label><Select value={filterUser} onChange={e=> setFilterUser(e.target.value)}><option value="todos">Todos</option>{users.map(u=> <option key={u.id} value={u.id}>{u.displayName} ({u.studentCode})</option>)}</Select></div>
            <div><Label>Semestre</Label><Select value={filterSem} onChange={e=> setFilterSem(e.target.value)}><option value="todos">Todos</option>{sems.map(s=> <option key={s} value={s}>{s}</option>)}</Select></div>
            <Badge variant="info">{filteredCourses.length} cursos</Badge>
            <Badge>{users.length} alumnos</Badge>
          </div>
        </Card>

        <Card>
          <div style={{ overflow:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ background:"var(--surface-2)" }}><th style={{ textAlign:"left", padding:"8px", border:"1px solid var(--border)" }}>Alumno</th><th style={{ padding:"8px", border:"1px solid var(--border)" }}>Curso</th><th style={{ padding:"8px", border:"1px solid var(--border)" }}>Sem</th><th style={{ padding:"8px", border:"1px solid var(--border)" }}>Créd</th><th style={{ padding:"8px", border:"1px solid var(--border)" }}>Promedio</th><th style={{ padding:"8px", border:"1px solid var(--border)" }}>Items</th></tr></thead>
              <tbody>
                {filteredCourses.map(c=>{
                  const u=users.find(x=> x.id===c.userId);
                  const avg=avgCourse(c);
                  const isMe=user?.id===c.userId;
                  return (
                    <tr key={c.id} style={{ background: isMe? "var(--surface-2)": undefined }}>
                      <td style={{ padding:"6px 8px", border:"1px solid var(--border)", fontWeight: isMe?700:400 }}>{u?.displayName} <span className="muted small">({u?.studentCode})</span></td>
                      <td style={{ padding:"6px 8px", border:"1px solid var(--border)" }}><span className="dot" style={{ background:c.color, display:"inline-block", marginRight:6 }}/>{c.code} {c.name}</td>
                      <td style={{ padding:"6px 8px", border:"1px solid var(--border)" }}>{c.semester}</td>
                      <td style={{ padding:"6px 8px", border:"1px solid var(--border)", textAlign:"center" }}>{c.credits}</td>
                      <td style={{ padding:"6px 8px", border:"1px solid var(--border)", textAlign:"center", fontWeight:700 }}>{avg!==null? avg.toFixed(2):"—"}</td>
                      <td style={{ padding:"6px 8px", border:"1px solid var(--border)" }}>{(c.weighting||[]).map(w=> `${w.item} ${w.weight}% ${w.obtainedScore??"—"}/${w.maxScore}`).join(" • ") || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredCourses.length===0 && <p className="muted small" style={{ marginTop:8 }}>Sin cursos con el filtro.</p>}
          </div>
          <div style={{ marginTop:10, display:"flex", gap:8 }}>
            <Button size="sm" variant="primary" onClick={exportCSV}><Download size={12}/> Descargar CSV (Excel)</Button>
            <Button size="sm" onClick={exportPDF}>Descargar PDF</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
