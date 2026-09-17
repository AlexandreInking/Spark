import { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Input, Textarea, Label, Select } from "../components/ui/primitives";
import { toApa7, paraphraseLocal, plagiarismScore, aiLikelihood, type ApaInput, checkOllama, paraphraseWithOllama, type OllamaConfig } from "../lib/apa";

export default function ToolsPage() {
  return (
    <div style={{ flex:1, overflow:"auto" }}>
      <Topbar title="Herramientas académicas" subtitle="Citado APA 7 completo • Paráfrasis con Ollama local • Plagio e IA (local)" />
      <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14 }}>
        <ApaTool />
        <ParaphraseTool />
        <PlagiarismTool />
      </div>
    </div>
  );
}

function ApaTool() {
  const [type,setType]=useState<ApaInput["type"]>("book");
  const [authors,setAuthors]=useState("García, J.");
  const [editors,setEditors]=useState("");
  const [year,setYear]=useState("2023");
  const [title,setTitle]=useState("Introducción a la investigación");
  const [publisher,setPublisher]=useState("Editorial Universitaria");
  const [journal,setJournal]=useState("");
  const [volume,setVolume]=useState("");
  const [issue,setIssue]=useState("");
  const [pages,setPages]=useState("");
  const [url,setUrl]=useState("");
  const [doi,setDoi]=useState("");
  const [conference,setConference]=useState("");
  const [institution,setInstitution]=useState("");
  const [out,setOut]=useState("");

  const gen=()=>{
    const input: ApaInput = {
      type, authors: authors.split(";").map(s=> s.trim()).filter(Boolean), year: year||undefined, title, publisher: publisher||undefined, journal: journal||undefined, volume: volume||undefined, issue: issue||undefined, pages: pages||undefined, url: url||undefined, doi: doi||undefined, editors: editors? editors.split(";").map(s=> s.trim()).filter(Boolean): undefined, conference: conference||undefined, institution: institution||undefined
    };
    setOut(toApa7(input));
  };
  return (
    <Card>
      <b style={{ fontSize:14 }}>Herramienta de citado APA 7 — todas las fuentes</b>
      <p className="muted small">Soporta libro, capítulo, artículo, conferencia, reporte, web, tesis, dataset y legal. Usa <code>citation-js</code> + fallback manual.</p>
      <div className="grid grid-3" style={{ marginTop:10 }}>
        <div><Label>Tipo</Label><Select value={type} onChange={e=> setType(e.target.value as any)}>
          <option value="book">Libro</option><option value="chapter">Capítulo de libro</option><option value="journal">Artículo revista</option><option value="conference">Conferencia</option><option value="report">Reporte</option><option value="website">Página web</option><option value="thesis">Tesis</option><option value="dataset">Dataset</option><option value="legal">Legal</option>
        </Select></div>
        <div><Label>Autores ( ; )</Label><Input value={authors} onChange={e=> setAuthors(e.target.value)} placeholder="García, J.; López, M." /></div>
        <div><Label>Año</Label><Input value={year} onChange={e=> setYear(e.target.value)} placeholder="2023" /></div>
      </div>
      <div className="grid grid-3" style={{ marginTop:8 }}>
        <div style={{ gridColumn: type==="book"||type==="chapter" ? "span 1":"span 2" }}><Label>Título</Label><Input value={title} onChange={e=> setTitle(e.target.value)} /></div>
        {(type==="book"||type==="chapter") && <div><Label>Editores ( ; )</Label><Input value={editors} onChange={e=> setEditors(e.target.value)} placeholder="Pérez, A." /></div>}
        <div><Label>Editorial / Institución</Label><Input value={type==="report"||type==="thesis"? institution: publisher} onChange={e=> type==="report"||type==="thesis"? setInstitution(e.target.value): setPublisher(e.target.value)} placeholder={type==="journal"?"": "Editorial / Univ."} /></div>
      </div>
      {type==="journal" && (
        <div className="grid grid-3" style={{ marginTop:8 }}>
          <div><Label>Revista</Label><Input value={journal} onChange={e=> setJournal(e.target.value)} placeholder="Nature" /></div>
          <div><Label>Volumen</Label><Input value={volume} onChange={e=> setVolume(e.target.value)} /></div>
          <div><Label>Número (issue)</Label><Input value={issue} onChange={e=> setIssue(e.target.value)} /></div>
        </div>
      )}
      {type==="conference" && <div className="grid grid-3" style={{ marginTop:8 }}><div><Label>Conferencia</Label><Input value={conference} onChange={e=> setConference(e.target.value)} /></div><div style={{ gridColumn:"span 2"}}><Label>Lugar</Label><Input value={publisher} onChange={e=> setPublisher(e.target.value)} placeholder="Ciudad, País" /></div></div>}
      <div className="grid grid-3" style={{ marginTop:8 }}>
        <div><Label>Páginas</Label><Input value={pages} onChange={e=> setPages(e.target.value)} placeholder="45-67" /></div>
        <div><Label>DOI</Label><Input value={doi} onChange={e=> setDoi(e.target.value)} placeholder="10.1000/..." /></div>
        <div><Label>URL</Label><Input value={url} onChange={e=> setUrl(e.target.value)} placeholder="https://..." /></div>
      </div>
      <Button variant="primary" onClick={gen} style={{ marginTop:10 }}>Generar cita APA 7</Button>
      {out && <div style={{ marginTop:10, padding:12, background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:10, fontSize:13 }} dangerouslySetInnerHTML={{ __html: out }} />}
      {out && <Button size="sm" style={{ marginTop:8 }} onClick={async()=>{ try{ await navigator.clipboard.writeText(out.replace(/<[^>]+>/g,"")); alert("Copiado"); } catch{}}}>Copiar</Button>}
    </Card>
  );
}

function ParaphraseTool() {
  const [text,setText]=useState("Es importante analizar el objetivo y utilizar un método adecuado para obtener resultados relevantes.");
  const [out,setOut]=useState("");
  const [loading, setLoading]=useState(false);
  const [strength, setStrength]=useState(50);
  const [ollamaCfg, setOllamaCfg]=useState<OllamaConfig>(()=>{
    try{
      const raw=localStorage.getItem("uc_ollama");
      if(raw) return JSON.parse(raw);
    }catch{}
    return { endpoint:"http://localhost:11434", model:"llama3" };
  });
  const [ollamaStatus, setOllamaStatus]=useState<string>("");
  const [models, setModels]=useState<string[]>([]);

  useEffect(()=>{ localStorage.setItem("uc_ollama", JSON.stringify(ollamaCfg)); },[ollamaCfg]);
  useEffect(()=>{ localStorage.setItem("uc_para_strength", String(strength)); },[strength]);
  useEffect(()=>{ const s=localStorage.getItem("uc_para_strength"); if(s) setStrength(Number(s)); },[]);

  const paraphraseLocalFn=()=> setOut(paraphraseLocal(text, strength));
  const paraphraseOllama=async()=>{
    setLoading(true); setOllamaStatus("");
    try{
      const r=await paraphraseWithOllama(text, ollamaCfg, strength);
      setOut(r);
    }catch(e:any){ setOllamaStatus("Error: "+e.message); }
    setLoading(false);
  };
  const testOllama=async()=>{
    setOllamaStatus("Probando...");
    const r=await checkOllama(ollamaCfg);
    if(r.ok){ setOllamaStatus("✅ Conectado. Modelos: "+(r.models?.join(", ")||"—")); setModels(r.models||[]); }
    else setOllamaStatus("❌ "+(r.error||"fallo"));
  };

  return (
    <Card>
      <b style={{ fontSize:14 }}>Paráfrasis — local + Ollama <span className="badge badge-warn" style={{ fontSize:10 }}>Experimental</span></b>
      <p className="muted small">Modo local con sinónimos (offline) y modo Ollama local (requiere <code>ollama serve</code>). Gratis, sin nube.</p>
      <div style={{ padding:10, border:"1px solid var(--border)", borderRadius:10, background:"var(--surface-2)", display:"flex", flexDirection:"column", gap:8, marginBottom:10 }}>
        <Label>Configuración Ollama (local) — parafraseo con IA local</Label>
        <div className="grid grid-3">
          <div><Label>Endpoint</Label><Input value={ollamaCfg.endpoint} onChange={e=> setOllamaCfg({ ...ollamaCfg, endpoint:e.target.value })} placeholder="http://localhost:11434" /></div>
          <div><Label>Modelo</Label><Input value={ollamaCfg.model} onChange={e=> setOllamaCfg({ ...ollamaCfg, model:e.target.value })} placeholder="llama3" list="ollama-models" />
            <datalist id="ollama-models">{models.map(m=> <option key={m} value={m}/>)}</datalist>
          </div>
          <div style={{ display:"flex", alignItems:"end", gap:6 }}><Button size="sm" onClick={testOllama}>Probar conexión</Button><span className="muted small">{ollamaStatus}</span></div>
        </div>
        <div className="muted small">Instala Ollama desde <code>ollama.com</code>, luego <code>ollama pull llama3</code> y <code>ollama serve</code>. Todo queda local.</div>
      </div>
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:10, padding:"8px 10px", border:"1px solid var(--border)", borderRadius:10, background:"var(--surface)" }}>
        <span style={{ fontSize:12, fontWeight:700, minWidth:80 }}>Fuerza {strength}%</span>
        <input type="range" min={1} max={100} value={strength} onChange={e=> setStrength(Number(e.target.value))} style={{ flex:1 }} />
        <span className="muted small" style={{ minWidth:100 }}>{strength<30?"Ligero": strength<70?"Medio":"Profundo"}</span>
      </div>
      <Textarea value={text} onChange={e=> setText(e.target.value)} rows={4} placeholder="Pega tu texto aquí..." />
      <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
        <Button variant="primary" onClick={paraphraseLocalFn}>Parafrasear local {strength}%</Button>
        <Button variant="primary" onClick={paraphraseOllama} disabled={loading}>{loading? "Con Ollama...":`Parafrasear con Ollama ${strength}%`}</Button>
        <Button onClick={()=> setOut("")}>Limpiar</Button>
      </div>
      {out && <div style={{ marginTop:10, padding:12, background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:10, fontSize:13, whiteSpace:"pre-wrap" }}>{out}</div>}
    </Card>
  );
}

function PlagiarismTool() {
  const [a,setA]=useState("La fotosíntesis es el proceso mediante el cual las plantas convierten la luz solar en energía química.");
  const [b,setB]=useState("La fotosíntesis es el proceso por el cual las plantas transforman la luz del sol en energía química.");
  const [res,setRes]=useState<{score:number, aiA:any, aiB:any} | null>(null);

  const check=()=>{
    const score = plagiarismScore(a,b);
    const aiA = aiLikelihood(a);
    const aiB = aiLikelihood(b);
    setRes({ score, aiA, aiB });
  };
  return (
    <Card>
      <b style={{ fontSize:14 }}>Reconocimiento de plagio y uso de IA (local) <span className="badge badge-warn" style={{ fontSize:10 }}>Experimental</span></b>
      <p className="muted small">TF-IDF cosine + heurística IA. 100% local.</p>
      <div className="grid grid-2">
        <div><Label>Texto A</Label><Textarea value={a} onChange={e=> setA(e.target.value)} rows={4} /></div>
        <div><Label>Texto B (a comparar)</Label><Textarea value={b} onChange={e=> setB(e.target.value)} rows={4} /></div>
      </div>
      <Button variant="primary" onClick={check} style={{ marginTop:10 }}>Analizar</Button>
      {res && (
        <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ padding:10, border:"1px solid var(--border)", borderRadius:10, background: res.score>0.7? "#fef2f2":"#ecfdf5" }}>
            <div style={{ fontSize:12, fontWeight:700 }}>Similitud: {(res.score*100).toFixed(1)}% {res.score>0.8? "— Alta": res.score>0.5? "— Media":"— Baja"}</div>
          </div>
          <div className="grid grid-2">
            <div style={{ padding:10, border:"1px solid var(--border)", borderRadius:10 }}>
              <b style={{ fontSize:12 }}>IA Texto A: {(res.aiA.score*100).toFixed(0)}%</b>
              <ul style={{ margin:"6px 0 0", paddingLeft:16, fontSize:12 }} className="muted">{res.aiA.reasons.map((r:string)=><li key={r}>{r}</li>)}{res.aiA.reasons.length===0 && <li>Sin señales</li>}</ul>
            </div>
            <div style={{ padding:10, border:"1px solid var(--border)", borderRadius:10 }}>
              <b style={{ fontSize:12 }}>IA Texto B: {(res.aiB.score*100).toFixed(0)}%</b>
              <ul style={{ margin:"6px 0 0", paddingLeft:16, fontSize:12 }} className="muted">{res.aiB.reasons.map((r:string)=><li key={r}>{r}</li>)}{res.aiB.reasons.length===0 && <li>Sin señales</li>}</ul>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
