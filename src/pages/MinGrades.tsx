import { Card, Badge } from "../components/ui/primitives";
import { useData } from "../stores/useData";
import type { GradeWeight } from "../types";

function weightedAvg(ws: GradeWeight[]): number | null {
  const valid = ws.filter(w=> w.obtainedScore!==undefined);
  if(!valid.length) return null;
  const totalW = valid.reduce((s,w)=> s+w.weight,0);
  if(!totalW) return null;
  return valid.reduce((s,w)=> s+ (w.obtainedScore!/w.maxScore)*w.weight,0) * (100/totalW);
}

function to100Scale(minPass?: number): number {
  if(minPass===undefined || minPass===null) return 52.5; // default 10.5*5
  if(minPass <= 20) return minPass*5;
  return minPass;
}

/** Sección reutilizable (vive dentro de Analítica desde v1.2.2). */
export function MinGradesSection(){
  const { courses } = useData();

  return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {courses.length===0 ? <Card><p className="muted">Crea cursos con pesos y nota mínima.</p></Card> : (
          <div className="grid grid-2">
            {courses.map(c=>{
              const minPassRaw = c.minPassingGrade ?? 10.5;
              const target = to100Scale(minPassRaw);
              const all = c.weighting||[];
              const obtained = all.filter(w=> w.obtainedScore!==undefined);
              const pending = all.filter(w=> w.obtainedScore===undefined);
              const totalWeight = all.reduce((s,w)=> s+w.weight,0) || 100;
              const currentSum = obtained.reduce((s,w)=> s+ (w.obtainedScore!/w.maxScore)*w.weight,0);
              const obtainedWeight = obtained.reduce((s,w)=> s+w.weight,0);
              const remainingWeight = totalWeight - obtainedWeight;
              const neededTotal = target * totalWeight / 100;
              const neededPending = neededTotal - currentSum;
              const currentAvg = weightedAvg(all);
              const pendingAvgNeeded = remainingWeight>0 ? (neededPending / remainingWeight)*100 : 0;

              let status: { text:string; variant:"success"|"warn"|"danger"|"info" } = { text:"", variant:"info" };
              if(pending.length===0){
                if(currentAvg!==null && currentAvg >= target) status={ text:`✅ Aprobado (${currentAvg.toFixed(1)} ≥ ${target.toFixed(1)})`, variant:"success" };
                else status={ text:`❌ No aprobado (${currentAvg!==null? currentAvg.toFixed(1):"—"} < ${target.toFixed(1)})`, variant:"danger" };
              } else {
                if(neededPending <= 0) status={ text:`✅ Ya tienes lo necesario, incluso con 0 en pendientes`, variant:"success" };
                else if(pendingAvgNeeded > 100) status={ text:`❌ Imposible aun con 100% en todo lo pendiente (necesitas ${pendingAvgNeeded.toFixed(1)}%)`, variant:"danger" };
                else if(pendingAvgNeeded <= 0) status={ text:`✅ Con 0 ya apruebas`, variant:"success" };
                else status={ text:`Necesitas promedio ${pendingAvgNeeded.toFixed(1)}% en lo pendiente`, variant: pendingAvgNeeded>70?"warn":"info" };
              }

              return (
                <Card key={c.id}>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span className="dot" style={{ background:c.color, width:12, height:12 }}/>
                    <b style={{ fontSize:13 }}>{c.code} {c.name}</b>
                    <Badge>Min {minPassRaw} ({target.toFixed(1)}%)</Badge>
                    <Badge variant={currentAvg!==null && currentAvg>=target? "success":"default"}>Actual {currentAvg!==null? currentAvg.toFixed(1):"—"}</Badge>
                  </div>
                  <div className="muted small" style={{ marginTop:4 }}>{c.semester} • {all.length} evaluaciones • {obtained.length} calificadas • {pending.length} pendientes</div>
                  <div style={{ marginTop:10, padding:10, background: status.variant==="success"?"#ecfdf5": status.variant==="danger"?"#fef2f2": status.variant==="warn"?"#fffbeb":"#eff6ff", border:"1px solid var(--border)", borderRadius:10 }}>
                    <div style={{ fontSize:12, fontWeight:700 }}>{status.text}</div>
                    {pending.length>0 && neededPending>0 && pendingAvgNeeded<=100 && (
                      <div className="small" style={{ marginTop:4, color: status.variant==="success"?"#065f46": status.variant==="danger"?"#991b1b": status.variant==="warn"?"#92400e":"#1e40af" }}>
                        Objetivo: {neededTotal.toFixed(2)} pts totales • Ya tienes {currentSum.toFixed(2)} • Te faltan {neededPending.toFixed(2)} pts en {remainingWeight}% restantes.
                      </div>
                    )}
                  </div>
                  {pending.length>0 && (
                    <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:6 }}>
                      <b style={{ fontSize:12 }}>Próximas evaluaciones:</b>
                      {pending.map(w=>{
                        const needScore = Math.ceil((pendingAvgNeeded/100)*w.maxScore*10)/10;
                        const feasible = needScore <= w.maxScore && needScore>=0;
                        return (
                          <div key={w.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 8px", border:"1px solid var(--border)", borderRadius:8, background:"var(--surface)" }}>
                            <span style={{ fontSize:12 }}>{w.item} ({w.weight}% de {w.maxScore})</span>
                            <span className="badge" style={{ background: feasible? (needScore/w.maxScore>0.8?"#fef2f2": "#eff6ff"):"var(--surface-2)" }}>
                              {feasible? `Necesitas ≥ ${needScore}/${w.maxScore} (${pendingAvgNeeded.toFixed(1)}%)` : needScore> w.maxScore? "Imposible": "—"}
                            </span>
                          </div>
                        );
                      })}
                      <div className="muted small">Si necesitas el mismo promedio en todas las pendientes, arriba tienes el cálculo. Si quieres priorizar, usa Analítica what-if para simular notas distintas.</div>
                    </div>
                  )}
                  {obtained.length>0 && (
                    <div style={{ marginTop:10 }}>
                      <b style={{ fontSize:12 }}>Ya calificadas:</b>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:6 }}>
                        {obtained.map(w=> <span key={w.id} className="chip">{w.item} {w.obtainedScore}/{w.maxScore} ({w.weight}%)</span>)}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
  );
}
