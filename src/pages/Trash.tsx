import { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Badge } from "../components/ui/primitives";
import { db } from "../lib/db";
import { useAuth } from "../stores/useAuth";
import { RotateCcw, Trash2, ShieldAlert } from "lucide-react";

export default function TrashPage(){
  const { user } = useAuth();
  const [courses, setCourses]=useState<any[]>([]);
  const [dels, setDels]=useState<any[]>([]);
  const [vault, setVault]=useState<any[]>([]);
  const [rems, setRems]=useState<any[]>([]);
  const [jobs, setJobs]=useState<any[]>([]);
  const [txs, setTxs]=useState<any[]>([]);
  const [debts, setDebts]=useState<any[]>([]);
  const [sessions, setSessions]=useState<any[]>([]);
  const [lastBackup, setLastBackup]=useState<string | null>(localStorage.getItem("uc_last_backup"));

  const load=async()=>{
    if(!user) return;
    const [c,d,v,r,j,t,dbt,s]=await Promise.all([
      (db as any).listTrashedCourses(user.id).catch(()=>[]),
      (db as any).listTrashedDeliverables().catch(()=>[]),
      (db as any).listTrashedVault(user.id).catch(()=>[]),
      (db as any).listTrashedReminders(user.id).catch(()=>[]),
      (db as any).listTrashedJobOffers(user.id).catch(()=>[]),
      (db as any).listTrashedTransactions(user.id).catch(()=>[]),
      (db as any).listTrashedDebts(user.id).catch(()=>[]),
      (db as any).listTrashedStudySessions(user.id).catch(()=>[]),
    ]);
    setCourses(c); setDels(d); setVault(v); setRems(r);
    setJobs(j); setTxs(t); setDebts(dbt); setSessions(s);
    setLastBackup(localStorage.getItem("uc_last_backup"));
  };
  useEffect(()=>{ load(); },[user?.id]);

  const total=courses.length+dels.length+vault.length+rems.length+jobs.length+txs.length+debts.length+sessions.length;

  return (
    <div style={{ flex:1, overflow:"auto" }}>
      <Topbar title="Papelera" subtitle="Borrado suave — todo lo que elimines va aquí 30 días. Admin no ve tu Vault." actions={
        <Button size="sm" onClick={async()=>{
          if(!confirm("¿Vaciar papelera definitivamente? No recuperable.")) return;
          for(const c of courses) await (db as any).hardDeleteCourse(c.id);
          for(const d of dels) await (db as any).hardDeleteDeliverable(d.id);
          for(const v of vault) await (db as any).hardDeleteVault(v.id);
          for(const r of rems) await (db as any).hardDeleteReminder(r.id);
          for(const j of jobs) await (db as any).hardDeleteJobOffer(j.id);
          for(const t of txs) await (db as any).hardDeleteTransaction(t.id);
          for(const x of debts) await (db as any).hardDeleteDebt(x.id);
          for(const s of sessions) await (db as any).hardDeleteStudySession(s.id);
          await load();
        }}><Trash2 size={12}/> Vaciar papelera</Button>
      }/>
      <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14, maxWidth:900 }}>
        <Card>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}><ShieldAlert size={14} style={{ color:"#059669" }}/><b>Recuperación sin backup</b></div>
          <p className="muted small" style={{ marginTop:6 }}>
            Desde esta versión todo borrado es <b>soft-delete</b> (se marca <code>deleted_at</code>, no se borra). Puedes restaurar desde aquí. Incluso sin backup, lo del Kanban u otro borrado accidental queda aquí si ocurrió después de esta actualización.
            {lastBackup ? <span> Último backup automático: {new Date(JSON.parse(lastBackup)?.exportedAt||0).toLocaleString()} — <button className="btn btn-sm" onClick={()=>{
              const blob=new Blob([lastBackup!],{ type:"application/json" });
              const url=URL.createObjectURL(blob);
              const a=document.createElement("a"); a.href=url; a.download=`recuperacion_${new Date().toISOString().slice(0,10)}.json`; a.click();
            }}>Descargar último backup</button></span> : " Aún no hay backup automático — exporta uno en Ajustes → Backup."}
          </p>
          <div className="muted small" style={{ marginTop:6 }}>
            <b>¿Borrado Kanban?</b> El board <code>tldraw</code> solo crea shapes, nunca toca <code>courses/deliverables</code>. Si viste borrado al usar Kanban, era porque el botón <code>Archivar</code> o <code>Eliminar curso</code> se confundió. Ahora todo va a Papelera y el board está aislado.
          </div>
        </Card>

        {total===0 ? <Card><p className="muted">Papelera vacía. Si borraste antes de esta actualización sin backup, lamentablemente no es recuperable — a partir de ahora sí lo será.</p></Card> : (
          <>
            {courses.length>0 && (
              <Card>
                <b>Cursos archivados/borrados ({courses.length})</b>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
                  {courses.map((c:any)=>(
                    <div key={c.id} style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 10px", border:"1px solid var(--border)", borderRadius:10 }}>
                      <span style={{ flex:1, fontSize:12, fontWeight:600 }}>{c.code} {c.name} <span className="muted small">({c.semester})</span></span>
                      <Badge>{c.status}</Badge>
                      <Button size="sm" variant="primary" onClick={async()=>{ await (db as any).restoreCourse(c.id); await load(); }}><RotateCcw size={12}/> Restaurar</Button>
                      <Button size="sm" onClick={async()=>{ if(confirm("Borrar definitivamente?")){ await (db as any).hardDeleteCourse(c.id); await load(); }}}><Trash2 size={12}/> Definitivo</Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {dels.length>0 && (
              <Card>
                <b>Entregables borrados ({dels.length})</b>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
                  {dels.map((d:any)=>(
                    <div key={d.id} style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 10px", border:"1px solid var(--border)", borderRadius:10 }}>
                      <span style={{ flex:1, fontSize:12 }}>{d.title} <span className="muted small">{d.dueDate} {d.dueTime}</span></span>
                      <Button size="sm" variant="primary" onClick={async()=>{ await (db as any).restoreDeliverable(d.id); await load(); }}><RotateCcw size={12}/> Restaurar</Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {vault.length>0 && (
              <Card>
                <b>Vault borrado ({vault.length}) — cifrado, admin no lo vio</b>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
                  {vault.map((v:any)=>(
                    <div key={v.id} style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 10px", border:"1px solid var(--border)", borderRadius:10 }}>
                      <span style={{ flex:1, fontSize:12 }}>{v.title} <span className="muted small">{v.url}</span></span>
                      <Button size="sm" variant="primary" onClick={async()=>{ await (db as any).restoreVault(v.id); await load(); }}><RotateCcw size={12}/> Restaurar</Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {rems.length>0 && (
              <Card>
                <b>Pagos/trámites borrados ({rems.length})</b>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
                  {rems.map((r:any)=>(
                    <div key={r.id} style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 10px", border:"1px solid var(--border)", borderRadius:10 }}>
                      <span style={{ flex:1, fontSize:12 }}>{r.title} {r.dueDate}</span>
                      <Button size="sm" variant="primary" onClick={async()=>{ await (db as any).restoreReminder(r.id); await load(); }}><RotateCcw size={12}/> Restaurar</Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {jobs.length>0 && (
              <Card>
                <b>Empleos borrados ({jobs.length})</b>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
                  {jobs.map((j:any)=>(
                    <div key={j.id} style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 10px", border:"1px solid var(--border)", borderRadius:10 }}>
                      <span style={{ flex:1, fontSize:12 }}>{j.company} — {j.position}</span>
                      <Button size="sm" variant="primary" onClick={async()=>{ await (db as any).restoreJobOffer(j.id); await load(); }}><RotateCcw size={12}/> Restaurar</Button>
                      <Button size="sm" onClick={async()=>{ if(confirm("Borrar definitivamente?")){ await (db as any).hardDeleteJobOffer(j.id); await load(); }}}><Trash2 size={12}/> Definitivo</Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {txs.length>0 && (
              <Card>
                <b>Movimientos borrados ({txs.length})</b>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
                  {txs.map((t:any)=>(
                    <div key={t.id} style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 10px", border:"1px solid var(--border)", borderRadius:10 }}>
                      <span style={{ flex:1, fontSize:12 }}>{t.kind === "ingreso" ? "+" : "−"}S/ {t.amount} <span className="muted small">{t.date}</span></span>
                      <Button size="sm" variant="primary" onClick={async()=>{ await (db as any).restoreTransaction(t.id); await load(); }}><RotateCcw size={12}/> Restaurar</Button>
                      <Button size="sm" onClick={async()=>{ if(confirm("Borrar definitivamente?")){ await (db as any).hardDeleteTransaction(t.id); await load(); }}}><Trash2 size={12}/> Definitivo</Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {debts.length>0 && (
              <Card>
                <b>Deudas borradas ({debts.length})</b>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
                  {debts.map((x:any)=>(
                    <div key={x.id} style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 10px", border:"1px solid var(--border)", borderRadius:10 }}>
                      <span style={{ flex:1, fontSize:12 }}>{x.creditor} <span className="muted small">S/ {x.total}</span></span>
                      <Button size="sm" variant="primary" onClick={async()=>{ await (db as any).restoreDebt(x.id); await load(); }}><RotateCcw size={12}/> Restaurar</Button>
                      <Button size="sm" onClick={async()=>{ if(confirm("Borrar definitivamente?")){ await (db as any).hardDeleteDebt(x.id); await load(); }}}><Trash2 size={12}/> Definitivo</Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {sessions.length>0 && (
              <Card>
                <b>Sesiones de enfoque borradas ({sessions.length})</b>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
                  {sessions.map((s:any)=>(
                    <div key={s.id} style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 10px", border:"1px solid var(--border)", borderRadius:10 }}>
                      <span style={{ flex:1, fontSize:12 }}>{s.title || s.preset} <span className="muted small">{s.actualMinutes} min</span></span>
                      <Button size="sm" variant="primary" onClick={async()=>{ await (db as any).restoreStudySession(s.id); await load(); }}><RotateCcw size={12}/> Restaurar</Button>
                      <Button size="sm" onClick={async()=>{ if(confirm("Borrar definitivamente?")){ await (db as any).hardDeleteStudySession(s.id); await load(); }}}><Trash2 size={12}/> Definitivo</Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
