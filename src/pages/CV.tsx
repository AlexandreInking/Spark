import { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Input, Textarea, Select, Label } from "../components/ui/primitives";
import { db } from "../lib/db";
import { useAuth } from "../stores/useAuth";
import { Plus, Trash2, Download, User, Briefcase, GraduationCap, Wrench, Languages, Award, Eye, Edit3 } from "lucide-react";
import type { CVProfile, CVWorkExperience, CVEducation, CVSkill, CVLanguage, CVCertificate } from "../types";
import { escapeHtml } from "../lib/security";

type Tab = "perfil" | "trabajo" | "educacion" | "habilidades" | "idiomas" | "certificados" | "preview";
const TABS: { key: Tab; label: string; icon: any }[] = [
  { key:"perfil", label:"Perfil", icon:User },
  { key:"trabajo", label:"Experiencia", icon:Briefcase },
  { key:"educacion", label:"Educación", icon:GraduationCap },
  { key:"habilidades", label:"Habilidades", icon:Wrench },
  { key:"idiomas", label:"Idiomas", icon:Languages },
  { key:"certificados", label:"Certificados", icon:Award },
  { key:"preview", label:"Vista previa", icon:Eye },
];

export default function CVPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("perfil");
  const [profile, setProfile] = useState<CVProfile | null>(null);
  const [work, setWork] = useState<CVWorkExperience[]>([]);
  const [edu, setEdu] = useState<CVEducation[]>([]);
  const [skills, setSkills] = useState<CVSkill[]>([]);
  const [langs, setLangs] = useState<CVLanguage[]>([]);
  const [certs, setCerts] = useState<CVCertificate[]>([]);

  const load = async () => {
    if (!user) return;
    const [p, w, e, s, l, c] = await Promise.all([
      db.getCVProfile(user.id), db.listCVWork(user.id), db.listCVEducation(user.id),
      db.listCVSkills(user.id), db.listCVLanguages(user.id), db.listCVCertificates(user.id),
    ]);
    setProfile(p); setWork(w); setEdu(e); setSkills(s); setLangs(l); setCerts(c);
  };
  useEffect(() => { load(); }, [user?.id]);

  return (
    <div style={{ flex:1, overflow:"auto" }}>
      <Topbar title="CV / Currículum" subtitle="Generador optimizado para sistemas ATS de selección de personal — exporta PDF" actions={
        <Button size="sm" variant="primary" onClick={()=>{
          const win = window.open("", "_blank");
          if (!win) return alert("Permitir popups para exportar PDF");
          win.document.write(generatePDFHTML(profile, work, edu, skills, langs, certs, user?.displayName || ""));
          win.document.close();
          setTimeout(() => { win.print(); }, 500);
        }}><Download size={14}/> Exportar PDF</Button>
      }/>
      <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14, maxWidth:960 }}>
        <Card style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {TABS.map(t => (
            <Button key={t.key} size="sm" variant={tab===t.key?"primary":"ghost"} onClick={()=>setTab(t.key)}>
              <t.icon size={14}/> {t.label}
            </Button>
          ))}
        </Card>

        {tab === "perfil" && profile && <ProfileSection profile={profile} userId={user!.id} onSave={async p=>{ await db.saveCVProfile(p); setProfile(p); }} />}
        {tab === "perfil" && !profile && <ProfileSection profile={null} userId={user!.id} onSave={async p=>{ await db.saveCVProfile(p); setProfile(p); }} />}

        {tab === "trabajo" && <WorkSection items={work} userId={user!.id} onSave={async w=>{ await db.saveCVWork(w); await load(); }} onDelete={async id=>{ await db.deleteCVWork(id); await load(); }} />}
        {tab === "educacion" && <EduSection items={edu} userId={user!.id} onSave={async e=>{ await db.saveCVEducation(e); await load(); }} onDelete={async id=>{ await db.deleteCVEducation(id); await load(); }} />}
        {tab === "habilidades" && <SkillsSection items={skills} userId={user!.id} onSave={async s=>{ await db.saveCVSkill(s); await load(); }} onDelete={async id=>{ await db.deleteCVSkill(id); await load(); }} />}
        {tab === "idiomas" && <LangsSection items={langs} userId={user!.id} onSave={async l=>{ await db.saveCVLanguage(l); await load(); }} onDelete={async id=>{ await db.deleteCVLanguage(id); await load(); }} />}
        {tab === "certificados" && <CertsSection items={certs} userId={user!.id} onSave={async c=>{ await db.saveCVCertificate(c); await load(); }} onDelete={async id=>{ await db.deleteCVCertificate(id); await load(); }} />}

        {tab === "preview" && <PreviewSection profile={profile} work={work} edu={edu} skills={skills} langs={langs} certs={certs} />}
      </div>
    </div>
  );
}

function ProfileSection({ profile, userId, onSave }: { profile: CVProfile | null; userId: string; onSave: (p: CVProfile)=>void }) {
  const [p, setP] = useState<CVProfile>(profile || { id:`cvp_${userId}`, userId, fullName:"", title:"", email:"", phone:"", location:"", website:"", linkedin:"", github:"", summary:"", updatedAt:"" });
  const set = (k: keyof CVProfile, v: string) => setP(prev => ({ ...prev, [k]: v }));
  return (
    <Card>
      <b>Información personal</b>
      <p className="muted small" style={{ marginTop:4 }}>Esta info va al CV final. Sé conciso y profesional. Los sistemas ATS buscan: nombre, email, teléfono, ubicación, LinkedIn.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:12 }}>
        <div><Label>Nombre completo *</Label><Input value={p.fullName} onChange={e=>set("fullName",e.target.value)} placeholder="Juan Pérez" /></div>
        <div><Label>Título profesional</Label><Input value={p.title||""} onChange={e=>set("title",e.target.value)} placeholder="Ingeniero de Software" /></div>
        <div><Label>Email</Label><Input type="email" value={p.email||""} onChange={e=>set("email",e.target.value)} placeholder="juan@gmail.com" /></div>
        <div><Label>Teléfono</Label><Input value={p.phone||""} onChange={e=>set("phone",e.target.value)} placeholder="+54 11 1234-5678" /></div>
        <div><Label>Ubicación</Label><Input value={p.location||""} onChange={e=>set("location",e.target.value)} placeholder="Buenos Aires, Argentina" /></div>
        <div><Label>LinkedIn</Label><Input value={p.linkedin||""} onChange={e=>set("linkedin",e.target.value)} placeholder="linkedin.com/in/juanperez" /></div>
        <div><Label>GitHub</Label><Input value={p.github||""} onChange={e=>set("github",e.target.value)} placeholder="github.com/juanperez" /></div>
        <div><Label>Sitio web</Label><Input value={p.website||""} onChange={e=>set("website",e.target.value)} placeholder="juanperez.dev" /></div>
      </div>
      <div style={{ marginTop:10 }}><Label>Resumen profesional (2-3 líneas, orientado a resultados)</Label><Textarea value={p.summary||""} onChange={e=>set("summary",e.target.value)} rows={3} placeholder="Ingeniero de software con 3+ años de experiencia en React y Node.js. Implementé sistema que redujo tiempo de carga en 40%. Busco rol senior en fintech." /></div>
      <Button variant="primary" style={{ marginTop:12 }} onClick={()=>onSave({...p, updatedAt:new Date().toISOString()})}>Guardar perfil</Button>
    </Card>
  );
}

function WorkSection({ items, userId, onSave, onDelete }: { items: CVWorkExperience[]; userId: string; onSave: (w: CVWorkExperience)=>void; onDelete: (id: string)=>void }) {
  const [editing, setEditing] = useState<CVWorkExperience | null>(null);
  const [show, setShow] = useState(false);
  const startNew = () => { setEditing({ id:`cvw_${Date.now()}`, userId, company:"", role:"", startDate:"", current:false, achievements:[], skills:[], order:items.length }); setShow(true); };
  return (
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <b>Experiencia laboral</b>
        <Button size="sm" variant="primary" onClick={startNew}><Plus size={14}/> Agregar</Button>
      </div>
      {items.length === 0 && !show && <p className="muted small">Agrega tu experiencia laboral. Los sistemas ATS buscan: empresa, cargo, fechas, logros con métricas.</p>}
      {items.map(w => (
        <div key={w.id} style={{ padding:10, border:"1px solid var(--border)", borderRadius:10, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontWeight:700 }}>{w.role}</div>
            <div className="muted small">{w.company} • {w.startDate} - {w.current ? "Presente" : w.endDate || "?"}</div>
            {w.description && <div style={{ fontSize:12, marginTop:4 }}>{w.description}</div>}
            {w.achievements && w.achievements.length > 0 && (
              <ul style={{ margin:"4px 0 0 16px", fontSize:12 }}>
                {w.achievements.map((a,i) => <li key={i}>{a}</li>)}
              </ul>
            )}
          </div>
          <div style={{ display:"flex", gap:4 }}>
            <Button size="icon" onClick={()=>{ setEditing(w); setShow(true); }}><Edit3 size={13}/></Button>
            <Button size="icon" onClick={()=>onDelete(w.id)}><Trash2 size={13}/></Button>
          </div>
        </div>
      ))}
      {show && <WorkForm item={editing} onSave={w=>{ onSave(w); setShow(false); setEditing(null); }} onCancel={()=>{ setShow(false); setEditing(null); }} />}
    </Card>
  );
}

function WorkForm({ item, onSave, onCancel }: { item: CVWorkExperience | null; onSave: (w: CVWorkExperience)=>void; onCancel: ()=>void }) {
  const [w, setW] = useState<CVWorkExperience>(item!);
  const [achText, setAchText] = useState((item?.achievements||[]).join("\n"));
  const set = (k: keyof CVWorkExperience, v: any) => setW(prev => ({ ...prev, [k]: v }));
  return (
    <Card style={{ border:"2px solid var(--primary)" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div><Label>Empresa *</Label><Input value={w.company} onChange={e=>set("company",e.target.value)} placeholder="Google" /></div>
        <div><Label>Cargo *</Label><Input value={w.role} onChange={e=>set("role",e.target.value)} placeholder="Software Engineer" /></div>
        <div><Label>Fecha inicio *</Label><Input type="month" value={w.startDate} onChange={e=>set("startDate",e.target.value)} /></div>
        <div><Label>Fecha fin</Label><Input type="month" value={w.endDate||""} onChange={e=>set("endDate",e.target.value)} disabled={w.current} /></div>
        <label style={{ display:"flex", gap:6, alignItems:"center", fontSize:12 }}><input type="checkbox" checked={!!w.current} onChange={e=>set("current",e.target.checked)} /> Trabajo actual</label>
        <div style={{ gridColumn:"span 2" }}><Label>Descripción</Label><Textarea value={w.description||""} onChange={e=>set("description",e.target.value)} rows={2} placeholder="Responsabilidades principales..." /></div>
        <div style={{ gridColumn:"span 2" }}><Label>Logros (uno por línea, con métricas — ATS ama números)</Label><Textarea value={achText} onChange={e=>setAchText(e.target.value)} rows={4} placeholder={`Implementé sistema de caching que redujo latencia en 60%\nLideré equipo de 5 devs para migrar a microservicios\nReduje costos de infraestructura en $15k anuales`} /></div>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:10 }}>
        <Button variant="primary" onClick={()=>{ w.achievements = achText.split("\n").filter((l:string)=>l.trim()); onSave(w); }}>Guardar</Button>
        <Button onClick={onCancel}>Cancelar</Button>
      </div>
    </Card>
  );
}

function EduSection({ items, userId, onSave, onDelete }: { items: CVEducation[]; userId: string; onSave: (e: CVEducation)=>void; onDelete: (id: string)=>void }) {
  const [editing, setEditing] = useState<CVEducation | null>(null);
  const [show, setShow] = useState(false);
  const startNew = () => { setEditing({ id:`cve_${Date.now()}`, userId, institution:"", degree:"", startDate:"", current:false, order:items.length }); setShow(true); };
  return (
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <b>Educación</b>
        <Button size="sm" variant="primary" onClick={startNew}><Plus size={14}/> Agregar</Button>
      </div>
      {items.map(e => (
        <div key={e.id} style={{ padding:10, border:"1px solid var(--border)", borderRadius:10, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontWeight:700 }}>{e.degree}{e.field ? ` en ${e.field}` : ""}</div>
            <div className="muted small">{e.institution} • {e.startDate} - {e.current ? "Presente" : e.endDate || "?"}</div>
            {e.gpa && <div style={{ fontSize:12, marginTop:2 }}>Promedio: {e.gpa}</div>}
            {e.notes && <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>{e.notes}</div>}
          </div>
          <div style={{ display:"flex", gap:4 }}>
            <Button size="icon" onClick={()=>{ setEditing(e); setShow(true); }}><Edit3 size={13}/></Button>
            <Button size="icon" onClick={()=>onDelete(e.id)}><Trash2 size={13}/></Button>
          </div>
        </div>
      ))}
      {show && <EduForm item={editing} onSave={e=>{ onSave(e); setShow(false); setEditing(null); }} onCancel={()=>{ setShow(false); setEditing(null); }} />}
    </Card>
  );
}

function EduForm({ item, onSave, onCancel }: { item: CVEducation | null; onSave: (e: CVEducation)=>void; onCancel: ()=>void }) {
  const [e, setE] = useState<CVEducation>(item!);
  const set = (k: keyof CVEducation, v: any) => setE(prev => ({ ...prev, [k]: v }));
  return (
    <Card style={{ border:"2px solid var(--primary)" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div><Label>Institución *</Label><Input value={e.institution} onChange={ev=>set("institution",ev.target.value)} placeholder="UTN" /></div>
        <div><Label>Título *</Label><Input value={e.degree} onChange={ev=>set("degree",ev.target.value)} placeholder="Ingeniero en Sistemas" /></div>
        <div><Label>Campo / Orientación</Label><Input value={e.field||""} onChange={ev=>set("field",ev.target.value)} placeholder="Informática" /></div>
        <div><Label>Promedio / GPA</Label><Input value={e.gpa||""} onChange={ev=>set("gpa",ev.target.value)} placeholder="8.5 / 10" /></div>
        <div><Label>Inicio *</Label><Input type="month" value={e.startDate} onChange={ev=>set("startDate",ev.target.value)} /></div>
        <div><Label>Fin</Label><Input type="month" value={e.endDate||""} onChange={ev=>set("endDate",ev.target.value)} disabled={e.current} /></div>
        <label style={{ display:"flex", gap:6, alignItems:"center", fontSize:12 }}><input type="checkbox" checked={!!e.current} onChange={ev=>set("current",ev.target.checked)} /> Estudiando actualmente</label>
        <div><Label>Notas adicionales</Label><Input value={e.notes||""} onChange={ev=>set("notes",ev.target.value)} placeholder="Mención honorífica..." /></div>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:10 }}>
        <Button variant="primary" onClick={()=>onSave(e)}>Guardar</Button>
        <Button onClick={onCancel}>Cancelar</Button>
      </div>
    </Card>
  );
}

function SkillsSection({ items, userId, onSave, onDelete }: { items: CVSkill[]; userId: string; onSave: (s: CVSkill)=>void; onDelete: (id: string)=>void }) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState("");
  const [level, setLevel] = useState(3);
  const categories = ["Técnica", "Blanda", "Herramienta", "Framework", "Lenguaje", "Otro"];
  return (
    <Card>
      <b>Habilidades</b>
      <p className="muted small" style={{ marginTop:4 }}>Skills para ATS. Nivel: 1=básico, 5=experto.</p>
      <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
        <Input value={name} onChange={e=>setName(e.target.value)} placeholder="React, Python, Liderazgo..." style={{ flex:1, minWidth:180, fontSize:12 }} />
        <Select value={cat} onChange={e=>setCat(e.target.value)} style={{ fontSize:12 }}>
          <option value="">Categoría</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={level} onChange={e=>setLevel(Number(e.target.value))} style={{ fontSize:12 }}>
          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} - {["","Básico","Intermedio","Avanzado","Experto","Master"][n]}</option>)}
        </Select>
        <Button size="sm" variant="primary" onClick={()=>{
          if (!name.trim()) return;
          onSave({ id:`cvs_${Date.now()}`, userId, name:name.trim(), category:cat||undefined, level, order:items.length });
          setName(""); setCat(""); setLevel(3);
        }}>Agregar</Button>
      </div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:12 }}>
        {items.map(s => (
          <div key={s.id} style={{ display:"flex", gap:4, alignItems:"center", padding:"4px 8px", border:"1px solid var(--border)", borderRadius:8, fontSize:12 }}>
            <span>{s.name}</span>
            {s.category && <span className="muted small">({s.category})</span>}
            <span style={{ color:"var(--primary)", fontWeight:700 }}>{s.level}/5</span>
            <button onClick={()=>onDelete(s.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--danger)", padding:0 }}><Trash2 size={11}/></button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LangsSection({ items, userId, onSave, onDelete }: { items: CVLanguage[]; userId: string; onSave: (l: CVLanguage)=>void; onDelete: (id: string)=>void }) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("B1");
  const [listening, setListening] = useState("Intermedio");
  const [writing, setWriting] = useState("Intermedio");
  const [speaking, setSpeaking] = useState("Intermedio");
  const levels = ["A1","A2","B1","B2","C1","C2","C2+"];
  const subLevels = ["Básico","Elemental","Intermedio","Avanzado","Nativo"];
  return (
    <Card>
      <b>Idiomas</b>
      <p className="muted small" style={{ marginTop:4 }}>Nivel general CEFR (A1-C2+) + sub-habilidades individuales para Listening, Writing y Speaking.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10 }}>
        <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Inglés, Portugués..." style={{ fontSize:12 }} />
        <div>
          <Label>Nivel CEFR</Label>
          <Select value={level} onChange={e=>setLevel(e.target.value)} style={{ fontSize:12 }}>
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
        </div>
        <div>
          <Label>Listening</Label>
          <Select value={listening} onChange={e=>setListening(e.target.value)} style={{ fontSize:12 }}>
            {subLevels.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
        </div>
        <div>
          <Label>Writing</Label>
          <Select value={writing} onChange={e=>setWriting(e.target.value)} style={{ fontSize:12 }}>
            {subLevels.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
        </div>
        <div>
          <Label>Speaking</Label>
          <Select value={speaking} onChange={e=>setSpeaking(e.target.value)} style={{ fontSize:12 }}>
            {subLevels.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
        </div>
      </div>
      <Button size="sm" variant="primary" style={{ marginTop:8 }} onClick={()=>{
        if (!name.trim()) return;
        onSave({ id:`cvl_${Date.now()}`, userId, name:name.trim(), level, listening, writing, speaking, order:items.length });
        setName(""); setLevel("B1"); setListening("Intermedio"); setWriting("Intermedio"); setSpeaking("Intermedio");
      }}>Agregar idioma</Button>
      <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:12 }}>
        {items.map(l => (
          <div key={l.id} style={{ padding:"8px 12px", border:"1px solid var(--border)", borderRadius:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <span style={{ fontWeight:700, fontSize:13 }}>{l.name}</span>
              <span className="badge" style={{ marginLeft:8 }}>{l.level}</span>
              <div style={{ display:"flex", gap:8, marginTop:4, fontSize:11, color:"var(--text-muted)" }}>
                <span>🎧 {l.listening}</span>
                <span>✍️ {l.writing}</span>
                <span>🗣️ {l.speaking}</span>
              </div>
            </div>
            <button onClick={()=>onDelete(l.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--danger)", padding:0 }}><Trash2 size={13}/></button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CertsSection({ items, userId, onSave, onDelete }: { items: CVCertificate[]; userId: string; onSave: (c: CVCertificate)=>void; onDelete: (id: string)=>void }) {
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [date, setDate] = useState("");
  const [url, setUrl] = useState("");
  return (
    <Card>
      <b>Certificados</b>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10 }}>
        <Input value={name} onChange={e=>setName(e.target.value)} placeholder="AWS Solutions Architect" style={{ fontSize:12 }} />
        <Input value={issuer} onChange={e=>setIssuer(e.target.value)} placeholder="Amazon" style={{ fontSize:12 }} />
        <Input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ fontSize:12 }} />
        <Input value={url} onChange={e=>setUrl(e.target.value)} placeholder="URL verificación (opcional)" style={{ fontSize:12 }} />
      </div>
      <Button size="sm" variant="primary" style={{ marginTop:8 }} onClick={()=>{
        if (!name.trim() || !issuer.trim()) return alert("Nombre y emisor son obligatorios");
        onSave({ id:`cvc_${Date.now()}`, userId, name:name.trim(), issuer:issuer.trim(), date:date||undefined, url:url.trim()||undefined, order:items.length });
        setName(""); setIssuer(""); setDate(""); setUrl("");
      }}>Agregar certificado</Button>
      <div style={{ marginTop:10 }}>
        {items.map(c => (
          <div key={c.id} style={{ padding:8, border:"1px solid var(--border)", borderRadius:8, marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:13 }}>{c.name}</div>
              <div className="muted small">{c.issuer}{c.date ? ` • ${c.date}` : ""}</div>
            </div>
            <Button size="icon" onClick={()=>onDelete(c.id)}><Trash2 size={13}/></Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PreviewSection({ profile, work, edu, skills, langs, certs }: { profile: CVProfile | null; work: CVWorkExperience[]; edu: CVEducation[]; skills: CVSkill[]; langs: CVLanguage[]; certs: CVCertificate[] }) {
  if (!profile) return <Card><p className="muted">Completa tu perfil primero para ver la vista previa.</p></Card>;
  return (
    <Card>
      <b>Vista previa del CV (formato ATS-friendly)</b>
      <div style={{ marginTop:12, padding:20, border:"1px solid var(--border)", borderRadius:12, background:"#fff", color:"#111", fontFamily:"Arial, sans-serif", fontSize:12, lineHeight:1.6 }}>
        <div style={{ textAlign:"center", borderBottom:"2px solid #111", paddingBottom:10, marginBottom:12 }}>
          <h2 style={{ margin:0, fontSize:18, textTransform:"uppercase", letterSpacing:"0.05em" }}>{profile.fullName}</h2>
          {profile.title && <div style={{ fontSize:13, color:"#555" }}>{profile.title}</div>}
          <div style={{ fontSize:11, color:"#666", marginTop:4 }}>
            {[profile.email, profile.phone, profile.location, profile.linkedin, profile.github].filter(Boolean).join(" | ")}
          </div>
        </div>
        {profile.summary && <div style={{ marginBottom:10 }}><div style={{ fontWeight:700, textTransform:"uppercase", fontSize:11, borderBottom:"1px solid #ccc", marginBottom:4 }}>Resumen</div><div style={{ fontSize:11 }}>{profile.summary}</div></div>}
        {work.length > 0 && <div style={{ marginBottom:10 }}><div style={{ fontWeight:700, textTransform:"uppercase", fontSize:11, borderBottom:"1px solid #ccc", marginBottom:4 }}>Experiencia</div>
          {work.map(w => <div key={w.id} style={{ marginBottom:6 }}><div style={{ fontWeight:700, fontSize:12 }}>{w.role} — {w.company}</div><div style={{ fontSize:10, color:"#888" }}>{w.startDate} - {w.current?"Presente":w.endDate||"?"}</div>{w.description && <div style={{ fontSize:11 }}>{w.description}</div>}{w.achievements && w.achievements.length > 0 && <ul style={{ margin:"2px 0 0 16px", fontSize:11 }}>{w.achievements.map((a,i) => <li key={i}>{a}</li>)}</ul>}</div>)}
        </div>}
        {edu.length > 0 && <div style={{ marginBottom:10 }}><div style={{ fontWeight:700, textTransform:"uppercase", fontSize:11, borderBottom:"1px solid #ccc", marginBottom:4 }}>Educación</div>
          {edu.map(e => <div key={e.id} style={{ marginBottom:4 }}><div style={{ fontWeight:700, fontSize:12 }}>{e.degree}{e.field ? ` en ${e.field}` : ""}</div><div style={{ fontSize:11 }}>{e.institution} • {e.startDate} - {e.current?"Presente":e.endDate||"?"}{e.gpa ? ` • GPA: ${e.gpa}` : ""}</div></div>)}
        </div>}
        {skills.length > 0 && <div style={{ marginBottom:10 }}><div style={{ fontWeight:700, textTransform:"uppercase", fontSize:11, borderBottom:"1px solid #ccc", marginBottom:4 }}>Habilidades</div><div style={{ fontSize:11 }}>{skills.map(s => s.name).join(" • ")}</div></div>}
        {langs.length > 0 && <div style={{ marginBottom:10 }}><div style={{ fontWeight:700, textTransform:"uppercase", fontSize:11, borderBottom:"1px solid #ccc", marginBottom:4 }}>Idiomas</div><div style={{ fontSize:11 }}>{langs.map(l => `${l.name} (${l.level}) — 🎧${l.listening} ✍️${l.writing} 🗣️${l.speaking}`).join(" • ")}</div></div>}
        {certs.length > 0 && <div><div style={{ fontWeight:700, textTransform:"uppercase", fontSize:11, borderBottom:"1px solid #ccc", marginBottom:4 }}>Certificados</div>
          {certs.map(c => <div key={c.id} style={{ fontSize:11, marginBottom:2 }}>• {c.name} — {c.issuer}{c.date ? ` (${c.date})` : ""}</div>)}
        </div>}
      </div>
    </Card>
  );
}

function generatePDFHTML(profile: CVProfile | null, work: CVWorkExperience[], edu: CVEducation[], skills: CVSkill[], langs: CVLanguage[], certs: CVCertificate[], _name: string): string {
  if (!profile) return "<html><body><p>Primero completa tu perfil en la pestaña Perfil.</p></body></html>";
  const e = escapeHtml;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>CV - ${e(profile.fullName)}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;color:#111;padding:30px;font-size:12px;line-height:1.5}
    h1{text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #111;padding-bottom:6px;text-align:center;font-size:20px}
    .subtitle{text-align:center;color:#555;font-size:13px}
    .contact{text-align:center;color:#666;font-size:11px;margin-bottom:12px}
    h2{text-transform:uppercase;font-size:12px;border-bottom:1px solid #ccc;margin:12px 0 6px;letter-spacing:.04em}
    .job{margin-bottom:8px}.job b{font-size:12px}.job .meta{font-size:10px;color:#888}
    .edu{margin-bottom:4px}.edu b{font-size:12px}
    ul{margin:2px 0 0 18px;font-size:11px}
    .skills{font-size:11px}
    @media print{body{padding:20px;font-size:11px}}
  </style></head><body>
    <h1>${e(profile.fullName)}</h1>
    ${profile.title ? `<div class="subtitle">${e(profile.title)}</div>` : ""}
    <div class="contact">${[profile.email, profile.phone, profile.location, profile.linkedin, profile.github].filter(Boolean).map(e).join(" | ")}</div>
    ${profile.summary ? `<h2>Resumen</h2><div style="font-size:11px">${e(profile.summary)}</div>` : ""}
    ${work.length ? `<h2>Experiencia Laboral</h2>${work.map(w => `<div class="job"><b>${e(w.role)} — ${e(w.company)}</b><div class="meta">${e(w.startDate)} - ${w.current?"Presente":e(w.endDate)||"?"}</div>${w.description?`<div>${e(w.description)}</div>`:""}${w.achievements&&w.achievements.length?`<ul>${w.achievements.map(a=>`<li>${e(a)}</li>`).join("")}</ul>`:""}</div>`).join("")}` : ""}
    ${edu.length ? `<h2>Educación</h2>${edu.map(x => `<div class="edu"><b>${e(x.degree)}${x.field?` en ${e(x.field)}`:""}</b><div style="font-size:11px">${e(x.institution)} • ${e(x.startDate)} - ${x.current?"Presente":e(x.endDate)||"?"}${x.gpa?` • GPA: ${e(x.gpa)}`:""}</div></div>`).join("")}` : ""}
    ${skills.length ? `<h2>Habilidades</h2><div class="skills">${skills.map(s=>e(s.name)).join(" • ")}</div>` : ""}
    ${langs.length ? `<h2>Idiomas</h2><div style="font-size:11px">${langs.map(l=>`<div style="margin-bottom:3px"><b>${e(l.name)}</b> (${e(l.level)}) — 🎧 Listening: ${e(l.listening)} | ✍️ Writing: ${e(l.writing)} | 🗣️ Speaking: ${e(l.speaking)}</div>`).join("")}</div>` : ""}
    ${certs.length ? `<h2>Certificados</h2><div style="font-size:11px">${certs.map(c=>`• ${e(c.name)} — ${e(c.issuer)}${c.date?` (${e(c.date)})`:""}`).join("<br>")}</div>` : ""}
  </body></html>`;
}
