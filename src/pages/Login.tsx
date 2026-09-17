import { useState } from "react";
import { useAuth } from "../stores/useAuth";
import { Button, Input, Label, Card } from "../components/ui/primitives";
import { Sparkles, Shield } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [code,setCode]=useState("");
  const [name,setName]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    setErr(""); setLoading(true);
    const res = await login(code, name);
    if(!res.ok) setErr(res.error||"Error");
    setLoading(false);
  };
  return (
    <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"var(--bg)", padding:18 }}>
      <Card style={{ width: "100%", maxWidth:420, padding:22 }}>
        <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:14 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"#111827", display:"grid", placeItems:"center", color:"#fff" }}><Sparkles /></div>
          <div>
            <div style={{ fontWeight:800, fontSize:16, letterSpacing:"-0.02em" }}>Spark</div>
            <div className="muted small">Logeable con código de alumno • local-first</div>
          </div>
        </div>
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <Label>Código de alumno *</Label>
            <Input value={code} onChange={e=> setCode(e.target.value.toUpperCase())} placeholder="UC-2024-001" autoFocus />
            <div className="muted small" style={{ marginTop:4 }}>Solo local. Si no existe se crea tu cuenta.</div>
          </div>
          <div>
            <Label>Nombre (si es registro)</Label>
            <Input value={name} onChange={e=> setName(e.target.value)} placeholder="Tu nombre" />
          </div>
          {err && <div style={{ padding:"8px 10px", background:"#fef2f2", border:"1px solid #fecaca", color:"#991b1b", borderRadius:8, fontSize:13 }}>{err}</div>}
          <Button variant="primary" type="submit" disabled={loading}>{loading? "Entrando…":"Entrar • Login local"}</Button>
          <div style={{ display:"flex", gap:6, alignItems:"center", padding:"8px 10px", background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:10 }}>
            <Shield size={14} style={{ color:"var(--text-muted)"}}/>
            <span className="muted small">Tus datos viven solo en este equipo. Sin nube, sin cuentas.</span>
          </div>
        </form>
        <div className="muted small" style={{ marginTop:12, textAlign:"center" }}>Windows & Mac • Ejecutable sin cmd • Segundo plano • Autostart configurable</div>
      </Card>
    </div>
  );
}
