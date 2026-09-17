import { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Input, Label, Textarea, Select, Badge } from "../components/ui/primitives";
import { db } from "../lib/db";
import { useAuth } from "../stores/useAuth";
import type { VaultItem } from "../types";
import { safeUrl } from "../lib/security";
import { Copy, Trash2, Plus, Edit3, Eye, EyeOff, KeyRound, Link as LinkIcon, ShieldAlert, Lock, Unlock } from "lucide-react";
import { isVaultConfigured, isVaultUnlocked, setVaultMaster, unlockVault, lockVault, encryptField, decryptField } from "../lib/vaultCrypto";

export default function VaultPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("todos");
  const [showForm, setShowForm] = useState<Partial<VaultItem> | null>(null);
  const [editing, setEditing] = useState<VaultItem | null>(null);
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});
  const [vaultPw, setVaultPw] = useState("");
  const [vaultNewPw, setVaultNewPw] = useState("");
  const [unlocked, setUnlocked] = useState(isVaultUnlocked());
  const [configured, setConfigured] = useState(isVaultConfigured());

  const load = async()=> {
    if(!user) return;
    const list = await db.listVault(user.id);
    // descifrar si está desbloqueado, si no mostrar cifrado
    let decrypted = list;
    if (isVaultUnlocked()) {
      decrypted = await Promise.all(list.map(async it=>{
        try {
          const u = await decryptField(it.username).catch(()=> it.username);
          const p = await decryptField(it.password).catch(()=> it.password);
          return { ...it, username: u, password: p };
        } catch { return it; }
      }));
    }
    setItems(decrypted);
  };
  useEffect(()=>{ load(); }, [user?.id, unlocked]);

  const filtered = items.filter(i=>{
    const matchQ = !q || `${i.title} ${i.url} ${i.username} ${i.category}`.toLowerCase().includes(q.toLowerCase());
    const matchCat = category==="todos" || i.category===category;
    return matchQ && matchCat;
  });
  const categories = Array.from(new Set(items.map(i=> i.category).filter(Boolean) as string[]));

  const save = async(data: Partial<VaultItem>)=>{
    if(!user) return;
    if(!isVaultUnlocked()) return alert("Desbloquea el Vault primero con tu clave maestra");
    if(!data.title?.trim() || !data.url?.trim() || !data.username?.trim() || !data.password?.trim()) return alert("Título, link, usuario y contraseña requeridos");
    const now = new Date().toISOString();
    // cifrar usuario y contraseña
    const encUser = await encryptField(data.username!.trim());
    const encPass = await encryptField(data.password!);
    const item: VaultItem = {
      id: editing?.id || crypto.randomUUID(),
      userId: user.id,
      title: data.title!.trim(),
      url: data.url!.trim(),
      username: encUser,
      password: encPass,
      notes: data.notes?.trim() || undefined,
      category: data.category?.trim() || undefined,
      createdAt: editing?.createdAt || now,
      updatedAt: now,
    };
    await db.saveVault(item);
    setShowForm(null); setEditing(null);
    await load();
  };

  return (
    <div style={{ flex:1, overflow:"auto" }}>
      <Topbar title="Vault — Links con credenciales" subtitle="Cifrado AES-GCM local, privado por alumno. Admin no tiene acceso." actions={
        unlocked ? <Button variant="primary" onClick={()=> { setEditing(null); setShowForm({}); }}><Plus size={14}/> Guardar link + credencial</Button> : null
      }/>
      <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14, maxWidth:920 }}>
        {!configured ? (
          <Card>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}><Lock size={16}/><b>Configura tu Vault cifrado</b></div>
            <p className="muted small">Define una clave maestra para tu Vault (distinta a tu código alumno). Con ella se cifra user/mail y contraseña con AES-GCM + PBKDF2. Ni el admin ni nadie sin esta clave puede leerlos. 100% local.</p>
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <Input type="password" value={vaultNewPw} onChange={e=> setVaultNewPw(e.target.value)} placeholder="Clave maestra Vault (mín 6)" style={{ flex:1 }} />
              <Button variant="primary" onClick={async()=>{
                try{ await setVaultMaster(vaultNewPw); setConfigured(true); setUnlocked(true); setVaultNewPw(""); alert("Vault configurado y desbloqueado"); await load(); }catch(e:any){ alert(e.message); }
              }}>Crear Vault cifrado</Button>
            </div>
          </Card>
        ) : !unlocked ? (
          <Card>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}><Lock size={16}/><b>Vault bloqueado</b><Badge variant="warn">cifrado</Badge></div>
            <p className="muted small">Ingresa tu clave maestra de Vault para descifrar. Admin no tiene esta clave.</p>
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <Input type="password" value={vaultPw} onChange={e=> setVaultPw(e.target.value)} placeholder="Tu clave maestra Vault" style={{ flex:1 }} />
              <Button variant="primary" onClick={async()=>{
                const ok=await unlockVault(vaultPw);
                if(!ok) return alert("Clave incorrecta");
                setUnlocked(true); setVaultPw(""); await load();
              }}><Unlock size={14}/> Desbloquear</Button>
            </div>
          </Card>
        ) : (
          <Card>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}><Unlock size={14} style={{ color:"#059669" }}/><b>Vault desbloqueado</b><Badge variant="success">AES-GCM</Badge></div>
              <Button size="sm" onClick={()=>{ lockVault(); setUnlocked(false); setItems([]); }}>Bloquear</Button>
            </div>
            <div className="muted small" style={{ marginTop:6 }}>Tus credenciales se descifran solo en memoria. Al cerrar el programa se bloquea.</div>
          </Card>
        )}

        {unlocked && (
          <>
            <Card>
              <div style={{ display:"flex", gap:8, alignItems:"end", flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:200 }}><Label>Buscar</Label><Input value={q} onChange={e=> setQ(e.target.value)} placeholder="Moodle, correo, biblioteca..." /></div>
                <div style={{ minWidth:160 }}><Label>Categoría</Label><Select value={category} onChange={e=> setCategory(e.target.value)}><option value="todos">Todas</option>{categories.map(c=> <option key={c} value={c}>{c}</option>)}</Select></div>
                <Badge variant="info">{filtered.length} items</Badge>
              </div>
              <div style={{ marginTop:10, padding:10, background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:10, display:"flex", gap:6, alignItems:"center" }}>
                <ShieldAlert size={14} style={{ color:"#059669" }}/>
                <span className="muted small"><b>Privado y cifrado:</b> <code>vault_items</code> guarda usuario y contraseña cifrados. Admin consulta solo <code>users/courses/deliverables</code>.</span>
              </div>
            </Card>

            {showForm !== null && (
              <VaultForm initial={editing || undefined} onClose={()=> { setShowForm(null); setEditing(null); }} onSave={save} />
            )}

            {filtered.length===0 ? <Card><p className="muted">Sin enlaces guardados. Usa “Guardar link + credencial”.</p></Card> : (
              <div className="grid grid-2">
                {filtered.map(it=> (
                  <Card key={it.id}>
                    <div className="flex justify-between items-center">
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <KeyRound size={14} style={{ color:"var(--text-muted)" }}/>
                        <b style={{ fontSize:13 }}>{it.title}</b>
                        {it.category && <Badge>{it.category}</Badge>}
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        <Button size="sm" onClick={async()=>{
                          // para editar, necesita descifrar ya está descifrado en items
                          setEditing(it); setShowForm(it);
                        }}><Edit3 size={12}/></Button>
                        <Button size="sm" onClick={async()=>{ if(confirm("Eliminar?")) { await db.deleteVault(it.id); await load(); }}}><Trash2 size={12}/></Button>
                      </div>
                    </div>
                    <a href={safeUrl(it.url) || undefined} target="_blank" rel="noreferrer" className="muted small" style={{ display:"flex", gap:6, alignItems:"center", marginTop:6, wordBreak:"break-all" }}><LinkIcon size={12}/>{it.url}</a>
                    <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:8 }}>
                      <div style={{ display:"flex", gap:6, alignItems:"center", padding:"6px 8px", border:"1px solid var(--border)", borderRadius:8, background:"var(--surface)" }}>
                        <span style={{ fontSize:12, fontWeight:600, minWidth:70 }}>Usuario</span>
                        <span style={{ flex:1, fontSize:12, overflow:"hidden", textOverflow:"ellipsis" }}>{it.username}</span>
                        <Button size="sm" onClick={async()=>{ await navigator.clipboard.writeText(it.username); alert("Usuario copiado"); }}><Copy size={12}/> Copiar</Button>
                      </div>
                      <div style={{ display:"flex", gap:6, alignItems:"center", padding:"6px 8px", border:"1px solid var(--border)", borderRadius:8, background:"var(--surface)" }}>
                        <span style={{ fontSize:12, fontWeight:600, minWidth:70 }}>Contraseña</span>
                        <span style={{ flex:1, fontFamily:"monospace", fontSize:12 }}>{showPw[it.id]? it.password : "•".repeat(Math.min(12, it.password.length))}</span>
                        <Button size="sm" onClick={()=> setShowPw(s=> ({ ...s, [it.id]: !s[it.id] }))}>{showPw[it.id]? <EyeOff size={12}/>:<Eye size={12}/>}</Button>
                        <Button size="sm" variant="primary" onClick={async()=>{ await navigator.clipboard.writeText(it.password); alert("Contraseña copiada"); }}><Copy size={12}/> Copiar</Button>
                      </div>
                      <Button size="sm" onClick={async()=>{ await navigator.clipboard.writeText(it.url); alert("Link copiado"); }}><Copy size={12}/> Copiar link</Button>
                      {it.notes && <div className="muted small" style={{ padding:"6px 8px", background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:8 }}>{it.notes}</div>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function VaultForm({ initial, onClose, onSave }: { initial?: Partial<VaultItem>; onClose:()=>void; onSave:(data:Partial<VaultItem>)=>void }) {
  const [title,setTitle]=useState(initial?.title||"");
  const [url,setUrl]=useState(initial?.url||"");
  const [username,setUsername]=useState(initial?.username||"");
  const [password,setPassword]=useState(initial?.password||"");
  const [notes,setNotes]=useState(initial?.notes||"");
  const [category,setCategory]=useState(initial?.category||"clases");

  return (
    <Card>
      <div className="flex justify-between items-center"><b>{initial?.id ? "Editar" : "Nuevo"} link con credencial (cifrado)</b><Button size="sm" onClick={onClose}>Cerrar</Button></div>
      <div className="grid grid-2" style={{ marginTop:10 }}>
        <div><Label>Título *</Label><Input value={title} onChange={e=> setTitle(e.target.value)} placeholder="Moodle Física" /></div>
        <div><Label>Categoría</Label><Select value={category} onChange={e=> setCategory(e.target.value)}><option value="clases">clases</option><option value="correo">correo</option><option value="biblioteca">biblioteca</option><option value="laboratorio">laboratorio</option><option value="otro">otro</option></Select></div>
      </div>
      <div style={{ marginTop:10 }}><Label>Link / URL *</Label><Input value={url} onChange={e=> setUrl(e.target.value)} placeholder="https://..." /></div>
      <div className="grid grid-2" style={{ marginTop:10 }}>
        <div><Label>Usuario / Mail *</Label><Input value={username} onChange={e=> setUsername(e.target.value)} placeholder="tu@mail.com" /></div>
        <div><Label>Contraseña *</Label><Input type="password" value={password} onChange={e=> setPassword(e.target.value)} placeholder="••••••••" /></div>
      </div>
      <div style={{ marginTop:10 }}><Label>Notas</Label><Textarea value={notes} onChange={e=> setNotes(e.target.value)} placeholder="Notas privadas..." /></div>
      <div style={{ marginTop:10, display:"flex", gap:8 }}>
        <Button variant="primary" className="w-full" onClick={()=> onSave({ title, url, username, password, notes, category })}>Guardar cifrado (local)</Button>
        <Button onClick={onClose}>Cancelar</Button>
      </div>
      <div className="muted small" style={{ marginTop:6 }}>Se cifra con AES-GCM antes de guardar. Admin no puede descifrar sin tu clave.</div>
    </Card>
  );
}
