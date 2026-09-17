import { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Input, Textarea, Select, Label } from "../components/ui/primitives";
import { db } from "../lib/db";
import { useAuth } from "../stores/useAuth";
import { Plus, Trash2, ExternalLink, Edit3 } from "lucide-react";
import type { PortfolioItem, PortfolioCategory } from "../types";
import { cleanExtra, missingRequired, schemaFor } from "../lib/portfolioFields";
import { safeUrl } from "../lib/security";

const CATEGORIES: { value: PortfolioCategory; label: string; emoji: string }[] = [
  { value:"desarrollo_software", label:"Desarrollo de Software", emoji:"💻" },
  { value:"diseno_grafico", label:"Diseño Gráfico", emoji:"🎨" },
  { value:"marketing", label:"Marketing Digital", emoji:"📊" },
  { value:"fotografia", label:"Fotografía", emoji:"📷" },
  { value:"modelaje", label:"Modelaje", emoji:"💃" },
  { value:"big_data", label:"Big Data", emoji:"📈" },
  { value:"genai", label:"GenAI Usage", emoji:"🤖" },
  { value:"ai_training", label:"AI Training", emoji:"🧠" },
  { value:"otro", label:"Otro", emoji:"📁" },
];

const CAT_COLORS: Record<string, string> = {
  desarrollo_software:"#2563eb", diseno_grafico:"#9333ea", marketing:"#ea580c",
  fotografia:"#059669", modelaje:"#db2777", big_data:"#0891b2",
  genai:"#6d28d9", ai_training:"#7c3aed", otro:"#64748b"
};

export default function PortfolioPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    if (!user) return;
    setItems(await db.listPortfolio(user.id));
  };
  useEffect(() => { load(); }, [user?.id]);

  const filtered = items.filter(i => filter === "all" || i.category === filter);

  const handleSave = async (data: Omit<PortfolioItem, "id" | "userId" | "createdAt">) => {
    if (!user) return;
    const p: PortfolioItem = {
      ...data,
      id: editing?.id || `pf_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      userId: user.id,
      createdAt: editing?.createdAt || new Date().toISOString(),
    };
    await db.savePortfolio(p);
    setShowForm(false); setEditing(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar proyecto del portafolio?")) return;
    await db.deletePortfolio(id);
    await load();
  };

  const grouped = CATEGORIES.filter(c => filtered.some(i => i.category === c.value));

  return (
    <div style={{ flex:1, overflow:"auto" }}>
      <Topbar title="Portafolio" subtitle="Proyectos organizados por categoría — exporta para compartir" actions={
        <div style={{ display:"flex", gap:6 }}>
          <Button size="sm" onClick={()=>{
            const txt = filtered.map(i => {
              const cat = CATEGORIES.find(c=>c.value===i.category);
              const extras = schemaFor(i.category)
                .filter(f => i.extra?.[f.key])
                .map(f => `${f.label}: ${i.extra![f.key]}`).join("\n");
              return `${cat?.emoji||""} ${i.title}\n${cat?.label||i.category}\n${i.description||""}\n${i.url||""}\n${extras}\nTags: ${(i.tags||[]).join(", ")}\n`;
            }).join("\n---\n\n");
            const blob = new Blob([txt], { type:"text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href=url; a.download=`portafolio_${new Date().toISOString().slice(0,10)}.txt`; a.click();
          }}>Exportar texto</Button>
          <Button size="sm" variant="primary" onClick={()=>{ setEditing(null); setShowForm(true); }}><Plus size={14}/> Nuevo proyecto</Button>
        </div>
      }/>
      <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14, maxWidth:960 }}>
        <Card>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            <Button size="sm" variant={filter==="all"?"primary":"ghost"} onClick={()=>setFilter("all")}>Todos ({items.length})</Button>
            {CATEGORIES.map(c => {
              const count = items.filter(i => i.category === c.value).length;
              if (count === 0) return null;
              return <Button key={c.value} size="sm" variant={filter===c.value?"primary":"ghost"} onClick={()=>setFilter(c.value)}>{c.emoji} {c.label} ({count})</Button>;
            })}
          </div>
        </Card>

        {showForm && <PortfolioForm item={editing} onSave={handleSave} onCancel={()=>{ setShowForm(false); setEditing(null); }} />}

        {filtered.length === 0 ? (
          <Card><p className="muted">No hay proyectos{filter!=="all" ? ` en "${CATEGORIES.find(c=>c.value===filter)?.label}"` : ""}. Agrega uno con el botón superior.</p></Card>
        ) : grouped.length > 0 ? (
          grouped.map(cat => (
            <div key={cat.value}>
              <h3 style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>{cat.emoji} {cat.label}</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:10 }}>
                {filtered.filter(i => i.category === cat.value).map(item => (
                  <Card key={item.id} hover>
                    {item.imageUrl && <div style={{ width:"100%", height:140, borderRadius:8, overflow:"hidden", marginBottom:8, background:"var(--surface-2)" }}><img src={item.imageUrl} alt={item.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} /></div>}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:14 }}>{item.title}</div>
                        {item.date && <div className="muted small">{item.date}</div>}
                      </div>
                      <div style={{ display:"flex", gap:4 }}>
                        {item.url && safeUrl(item.url) && <a href={safeUrl(item.url)!} target="_blank" rel="noreferrer" style={{ color:"var(--primary)" }}><ExternalLink size={14}/></a>}
                        <Button size="icon" onClick={()=>{ setEditing(item); setShowForm(true); }}><Edit3 size={13}/></Button>
                        <Button size="icon" onClick={()=>handleDelete(item.id)}><Trash2 size={13}/></Button>
                      </div>
                    </div>
                    {item.description && <p style={{ fontSize:12, color:"var(--text-muted)", marginTop:6 }}>{item.description.length > 120 ? item.description.slice(0,120)+"..." : item.description}</p>}
                    <ExtraRows item={item} />
                    {item.tags && item.tags.length > 0 && (
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:8 }}>
                        {item.tags.map(t => <span key={t} style={{ padding:"2px 8px", borderRadius:6, background:"var(--surface-2)", fontSize:11, fontWeight:600 }}>{t}</span>)}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:10 }}>
            {filtered.map(item => (
              <Card key={item.id} hover>
                {item.imageUrl && <div style={{ width:"100%", height:140, borderRadius:8, overflow:"hidden", marginBottom:8, background:"var(--surface-2)" }}><img src={item.imageUrl} alt={item.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} /></div>}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{item.title}</div>
                    <span style={{ padding:"2px 8px", borderRadius:6, background:CAT_COLORS[item.category]||"#64748b", color:"#fff", fontSize:10, fontWeight:700 }}>{CATEGORIES.find(c=>c.value===item.category)?.label||item.category}</span>
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    {item.url && safeUrl(item.url) && <a href={safeUrl(item.url)!} target="_blank" rel="noreferrer" style={{ color:"var(--primary)" }}><ExternalLink size={14}/></a>}
                    <Button size="icon" onClick={()=>{ setEditing(item); setShowForm(true); }}><Edit3 size={13}/></Button>
                    <Button size="icon" onClick={()=>handleDelete(item.id)}><Trash2 size={13}/></Button>
                  </div>
                </div>
                {item.description && <p style={{ fontSize:12, color:"var(--text-muted)", marginTop:6 }}>{item.description}</p>}
                <ExtraRows item={item} />
                {item.tags && item.tags.length > 0 && (
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:8 }}>
                    {item.tags.map(t => <span key={t} style={{ padding:"2px 8px", borderRadius:6, background:"var(--surface-2)", fontSize:11, fontWeight:600 }}>{t}</span>)}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExtraRows({ item }: { item: PortfolioItem }) {
  const fields = schemaFor(item.category).filter(f => item.extra?.[f.key]);
  if (!fields.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 8 }}>
      {fields.map(f => (
        f.kind === "url" ? (
          safeUrl(item.extra![f.key]) ? (
            <a key={f.key} href={safeUrl(item.extra![f.key])!} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--primary)", display: "flex", gap: 4, alignItems: "center" }}>
              <ExternalLink size={12} /> {f.label}
            </a>
          ) : (
            <div key={f.key} style={{ fontSize: 12 }}><span className="muted">{f.label}: </span>{item.extra![f.key]} <span className="muted">(URL no válida)</span></div>
          )
        ) : (
          <div key={f.key} style={{ fontSize: 12 }}><span className="muted">{f.label}: </span>{item.extra![f.key]}</div>
        )
      ))}
    </div>
  );
}

function PortfolioForm({ item, onSave, onCancel }: { item: PortfolioItem | null; onSave: (d: any)=>void; onCancel: ()=>void }) {
  const [title, setTitle] = useState(item?.title || "");
  const [category, setCategory] = useState<PortfolioCategory>(item?.category || "desarrollo_software");
  const [description, setDescription] = useState(item?.description || "");
  const [url, setUrl] = useState(item?.url || "");
  const [imageUrl, setImageUrl] = useState(item?.imageUrl || "");
  const [date, setDate] = useState(item?.date || "");
  const [tagsText, setTagsText] = useState((item?.tags || []).join(", "));
  const [extra, setExtra] = useState<Record<string, string>>(item?.extra || {});
  const fields = schemaFor(category);
  const setX = (k: string, v: string) => setExtra(prev => ({ ...prev, [k]: v }));

  return (
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <b>{item ? "Editar proyecto" : "Nuevo proyecto"}</b>
        <Button size="sm" onClick={onCancel}>Cancelar</Button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div style={{ gridColumn:"span 2" }}><Label>Título *</Label><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="App de delivery con React Native" /></div>
        <div><Label>Categoría</Label>
          <Select value={category} onChange={e=>setCategory(e.target.value as PortfolioCategory)}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
          </Select>
        </div>
        <div><Label>Fecha</Label><Input type="date" value={date} onChange={e=>setDate(e.target.value)} /></div>
        <div><Label>URL del proyecto</Label><Input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://github.com/..." /></div>
        <div><Label>URL de imagen</Label><Input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://..." /></div>
        <div style={{ gridColumn:"span 2" }}><Label>Descripción</Label><Textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} placeholder="Descripción del proyecto, tu rol, tecnologías usadas, impacto..." /></div>
        {fields.map(f => (
          <div key={f.key} style={{ gridColumn: f.kind === "text" ? "span 2" : undefined }}>
            <Label>{f.label}{f.required ? " *" : ""}</Label>
            <Input value={extra[f.key] || ""} onChange={e=>setX(f.key, e.target.value)} placeholder={f.placeholder} />
          </div>
        ))}
        <div style={{ gridColumn:"span 2" }}><Label>Tags (separados por coma)</Label><Input value={tagsText} onChange={e=>setTagsText(e.target.value)} placeholder="React, Node.js, PostgreSQL, Tailwind" /></div>
      </div>
      <Button variant="primary" style={{ marginTop:12 }} onClick={()=>{
        if (!title.trim()) return alert("Título obligatorio");
        const missing = missingRequired(category, extra);
        if (missing.length) return alert(`Falta: ${missing.join(", ")}`);
        onSave({ title:title.trim(), category, description:description.trim()||undefined, url:url.trim()||undefined, imageUrl:imageUrl.trim()||undefined, date:date||undefined, tags:tagsText.split(",").map((t:string)=>t.trim()).filter(Boolean), order: item?.order ?? 0, extra: cleanExtra(category, extra) });
      }}>{item ? "Guardar" : "Crear proyecto"}</Button>
    </Card>
  );
}
