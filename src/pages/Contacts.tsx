import { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Input, Textarea, Select, Badge, Label } from "../components/ui/primitives";
import { db } from "../lib/db";
import { useAuth } from "../stores/useAuth";
import { Plus, Trash2, Phone, Mail, Calendar, Building2, Edit3 } from "lucide-react";
import type { Contact, ContactRelation } from "../types";

const RELATIONS: { value: ContactRelation; label: string }[] = [
  { value:"familiar", label:"Familiar" },
  { value:"profesor", label:"Profesor" },
  { value:"alumno", label:"Alumno" },
  { value:"externo", label:"Externo" },
];

const REL_COLORS: Record<string, string> = {
  familiar:"#7c3aed", profesor:"#0369a1", alumno:"#059669", externo:"#64748b"
};

export default function ContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    setContacts(await db.listContacts(user.id));
  };
  useEffect(() => { load(); }, [user?.id]);

  const filtered = contacts.filter(c => {
    if (filter !== "all" && c.relation !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !(c.email||"").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSave = async (data: Omit<Contact, "id" | "userId" | "createdAt" | "updatedAt">) => {
    if (!user) return;
    const now = new Date().toISOString();
    const c: Contact = {
      ...data,
      id: editing?.id || `ct_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      userId: user.id,
      createdAt: editing?.createdAt || now,
      updatedAt: now,
    };
    await db.saveContact(c);
    setShowForm(false); setEditing(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar contacto?")) return;
    await db.deleteContact(id);
    await load();
  };

  return (
    <div style={{ flex:1, overflow:"auto" }}>
      <Topbar title="Contactos" subtitle="Personas, cumpleaños, relaciones" actions={
        <Button size="sm" variant="primary" onClick={()=>{ setEditing(null); setShowForm(true); }}><Plus size={14}/> Nuevo contacto</Button>
      }/>
      <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14, maxWidth:900 }}>
        <Card>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <Input placeholder="Buscar nombre o email..." value={search} onChange={e=>setSearch(e.target.value)} style={{ flex:1, minWidth:200, fontSize:12, padding:"6px 10px" }} />
            <Select value={filter} onChange={e=>setFilter(e.target.value)} style={{ fontSize:12, padding:"6px 8px" }}>
              <option value="all">Todos ({contacts.length})</option>
              {RELATIONS.map(r => <option key={r.value} value={r.value}>{r.label} ({contacts.filter(c=>c.relation===r.value).length})</option>)}
            </Select>
          </div>
        </Card>

        {showForm && (
          <ContactForm contact={editing} onSave={handleSave} onCancel={()=>{ setShowForm(false); setEditing(null); }} />
        )}

        {filtered.length === 0 ? (
          <Card><p className="muted">No hay contactos{filter !== "all" ? ` con filtro "${filter}"` : ""}. Agrega uno con el botón superior.</p></Card>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12 }}>
            {filtered.map(c => (
              <Card key={c.id} hover>
                <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <div style={{ width:42, height:42, borderRadius:999, background: REL_COLORS[c.relation] || "#64748b", display:"grid", placeItems:"center", color:"#fff", fontWeight:700, fontSize:16, flexShrink:0 }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</div>
                    <Badge variant={c.relation==="familiar"?"info":c.relation==="profesor"?"success":c.relation==="alumno"?"warn":"default"}>{RELATIONS.find(r=>r.value===c.relation)?.label||c.relation}</Badge>
                    {c.company && <div style={{ fontSize:12, marginTop:4, display:"flex", gap:4, alignItems:"center" }}><Building2 size={12}/> {c.role?`${c.role} en `:""}{c.company}</div>}
                    {c.email && <div style={{ fontSize:12, display:"flex", gap:4, alignItems:"center", color:"var(--text-muted)" }}><Mail size={11}/> {c.email}</div>}
                    {c.phone && <div style={{ fontSize:12, display:"flex", gap:4, alignItems:"center", color:"var(--text-muted)" }}><Phone size={11}/> {c.phone}</div>}
                    {c.birthday && <div style={{ fontSize:12, display:"flex", gap:4, alignItems:"center", color:"var(--text-muted)" }}><Calendar size={11}/> {c.birthday}</div>}
                    {c.notes && <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:4 }}>{c.notes}</div>}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    <Button size="icon" onClick={()=>{ setEditing(c); setShowForm(true); }}><Edit3 size={13}/></Button>
                    <Button size="icon" onClick={()=>handleDelete(c.id)}><Trash2 size={13}/></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContactForm({ contact, onSave, onCancel }: { contact: Contact | null; onSave: (d: any)=>void; onCancel: ()=>void }) {
  const [name, setName] = useState(contact?.name || "");
  const [relation, setRelation] = useState<ContactRelation>(contact?.relation || "externo");
  const [phone, setPhone] = useState(contact?.phone || "");
  const [email, setEmail] = useState(contact?.email || "");
  const [birthday, setBirthday] = useState(contact?.birthday || "");
  const [company, setCompany] = useState(contact?.company || "");
  const [role, setRole] = useState(contact?.role || "");
  const [notes, setNotes] = useState(contact?.notes || "");

  return (
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <b>{contact ? "Editar contacto" : "Nuevo contacto"}</b>
        <Button size="sm" onClick={onCancel}>Cancelar</Button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div><Label>Nombre *</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="María García" /></div>
        <div><Label>Relación</Label>
          <Select value={relation} onChange={e=>setRelation(e.target.value as ContactRelation)}>
            {RELATIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </div>
        <div><Label>Email</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="maria@empresa.com" /></div>
        <div><Label>Teléfono</Label><Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+54 11 1234-5678" /></div>
        <div><Label>Cumpleaños</Label><Input type="date" value={birthday} onChange={e=>setBirthday(e.target.value)} /></div>
        <div><Label>Empresa</Label><Input value={company} onChange={e=>setCompany(e.target.value)} placeholder="Google" /></div>
        <div><Label>Cargo</Label><Input value={role} onChange={e=>setRole(e.target.value)} placeholder="Software Engineer" /></div>
        <div style={{ gridColumn:"span 2" }}><Label>Notas</Label><Textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Detalles adicionales..." /></div>
      </div>
      <Button variant="primary" style={{ marginTop:12 }} onClick={()=>{
        if (!name.trim()) return alert("Nombre es obligatorio");
        onSave({ name: name.trim(), relation, phone: phone.trim()||undefined, email: email.trim()||undefined, birthday: birthday||undefined, company: company.trim()||undefined, role: role.trim()||undefined, notes: notes.trim()||undefined, tags: [] });
      }}>{contact ? "Guardar cambios" : "Crear contacto"}</Button>
    </Card>
  );
}
