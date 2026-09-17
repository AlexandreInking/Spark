import { useMemo, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Badge, Input } from "../components/ui/primitives";
import { useData } from "../stores/useData";
import { MinGradesSection } from "./MinGrades";
import type { GradeWeight } from "../types";

function weightedAvg(ws: GradeWeight[]): number | null {
  const valid = ws.filter(w=> w.obtainedScore!==undefined);
  if(!valid.length) return null;
  const totalW = valid.reduce((s,w)=> s+w.weight,0);
  if(!totalW) return null;
  return valid.reduce((s,w)=> s+ (w.obtainedScore!/w.maxScore)*w.weight,0) * (100/totalW);
}

export default function AnalyticsPage(){
  const { courses } = useData();
  const [sim, setSim]=useState<Record<string, Record<string, number>>>({}); // courseId -> weightId -> simulated score

  const ranking = useMemo(()=>{
    return courses.map(c=>{
      const base = weightedAvg(c.weighting||[]);
      // apply sim overrides
      const simWeights = (c.weighting||[]).map(w=>{
        const ov = sim[c.id]?.[w.id];
        if(ov!==undefined) return { ...w, obtainedScore: ov };
        return w;
      });
      const simulated = weightedAvg(simWeights);
      return { course:c, base, simulated, weights: simWeights };
    });
  }, [courses, sim]);

  const globalBase = useMemo(()=>{
    const avgs = ranking.map(r=> r.base).filter((v):v is number=> v!==null);
    return avgs.length? avgs.reduce((a,b)=> a+b,0)/avgs.length : null;
  },[ranking]);
  const globalSim = useMemo(()=>{
    const avgs = ranking.map(r=> r.simulated).filter((v):v is number=> v!==null);
    return avgs.length? avgs.reduce((a,b)=> a+b,0)/avgs.length : null;
  },[ranking]);

  return (
    <div style={{ flex:1, overflow:"auto" }}>
      <Topbar title="Analítica — What-if GPA + Mínimas" subtitle="Simula notas y ve qué necesitas para aprobar • todo local" />
      <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14 }}>
        <Card>
          <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
            <Badge variant="info">Promedio real: {globalBase!==null? globalBase.toFixed(2):"—"}</Badge>
            <Badge variant="success">Simulado: {globalSim!==null? globalSim.toFixed(2):"—"}</Badge>
            {globalBase!==null && globalSim!==null && <Badge variant={globalSim>globalBase?"success": globalSim<globalBase?"danger":"default"}>Δ {(globalSim-globalBase).toFixed(2)}</Badge>}
          </div>
          <p className="muted small" style={{ marginTop:6 }}>Mueve los sliders para simular “si saco X en Y”. No guarda hasta que apliques. Histórico se guarda local.</p>
        </Card>

        {ranking.length===0? <Card><p className="muted">Sin cursos con pesos.</p></Card> : (
          <div className="grid grid-2">
            {ranking.map(({course, base, simulated, weights})=>(
              <Card key={course.id}>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span className="dot" style={{ background:course.color, width:12, height:12 }}/>
                  <b style={{ fontSize:13 }}>{course.code} {course.name}</b>
                  <Badge>Real {base!==null? base.toFixed(1):"—"}</Badge>
                  <Badge variant="info">Sim {simulated!==null? simulated.toFixed(1):"—"}</Badge>
                </div>
                <div className="muted small">{course.semester} • {course.credits}cr</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:10 }}>
                  {weights.map(w=>{
                    const val = sim[course.id]?.[w.id] ?? w.obtainedScore ?? 0;
                    const hasScore = w.obtainedScore!==undefined || sim[course.id]?.[w.id]!==undefined;
                    return (
                      <div key={w.id} style={{ border:"1px solid var(--border)", borderRadius:10, padding:10 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <span style={{ fontSize:12, fontWeight:600 }}>{w.item} ({w.weight}% de {w.maxScore})</span>
                          <span className="badge">{hasScore? `${val}/${w.maxScore}`:"sin nota"}</span>
                        </div>
                        <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:8 }}>
                          <span style={{ fontSize:11, minWidth:24 }}>0</span>
                          <input type="range" min={0} max={w.maxScore} value={val} onChange={e=>{
                            const v=Number(e.target.value);
                            setSim(s=> ({ ...s, [course.id]: { ...(s[course.id]||{}), [w.id]: v }}));
                            // histórico
                            const histKey=`uc_hist_${course.id}_${w.id}`;
                            const hist=JSON.parse(localStorage.getItem(histKey)||"[]");
                            hist.push({ t:Date.now(), v });
                            if(hist.length>50) hist.shift();
                            localStorage.setItem(histKey, JSON.stringify(hist));
                          }} style={{ flex:1 }} />
                          <span style={{ fontSize:11, minWidth:24 }}>{w.maxScore}</span>
                          <Input type="number" value={val} onChange={e=>{
                            const v=Number(e.target.value);
                            setSim(s=> ({ ...s, [course.id]: { ...(s[course.id]||{}), [w.id]: v }}));
                          }} style={{ width:70 }} />
                        </div>
                        <div className="muted small" style={{ marginTop:4 }}>Peso: {w.weight}% • Aporta {((val/w.maxScore)*w.weight).toFixed(2)} pts</div>
                      </div>
                    );
                  })}
                  {weights.length===0 && <span className="muted small">Sin pesos — añade en Cursos → Editar</span>}
                </div>
              </Card>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
          <b style={{ fontSize: 14 }}>Mínimas para aprobar</b>
          <span className="muted small">Qué necesitas en las próximas evaluaciones según tu nota mínima (editable en ficha del curso)</span>
        </div>
        <MinGradesSection />
      </div>
    </div>
  );
}
