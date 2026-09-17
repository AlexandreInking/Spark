import { useState } from "react";
import { Card, Button, Input, Label, Select } from "../components/ui/primitives";
import { useAuth } from "../stores/useAuth";
import { db } from "../lib/db";
import { Sparkles, BookOpen, Briefcase, Check } from "lucide-react";
import type { JobOfferType } from "../types";

// Onboarding de primera ejecución (v1.0.0): perfil → primer curso → primer trabajo (opcional).
// Solo aparece si la DB no tiene usuarios. Todo paso 2-3 es omitible.

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { login } = useAuth();
  const [step, setStep] = useState(0);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobPosition, setJobPosition] = useState("");
  const [jobType, setJobType] = useState<JobOfferType>("parcial");

  const doLogin = async () => {
    setErr(""); setBusy(true);
    const res = await login(code, name);
    setBusy(false);
    if (!res.ok) { setErr(res.error || "Error"); return; }
    setStep(1);
  };

  const saveCourse = async () => {
    const user = useAuth.getState().user;
    if (!user) return;
    if (!courseName.trim() || !courseCode.trim()) return alert("Nombre y código del curso");
    setBusy(true);
    try {
      await db.saveCourse({
        id: crypto.randomUUID(), userId: user.id,
        name: courseName.trim(), code: courseCode.trim().toUpperCase(),
        color: "#0ea5e9", credits: 3, semester: "2026-1", professor: "",
        schedule: [], links: [], credentials: [], attachments: [],
        status: "activo", createdAt: new Date().toISOString(),
      });
      setStep(2);
    } catch (e: any) {
      alert(`No se pudo guardar: ${e?.message || e}`);
    } finally { setBusy(false); }
  };

  const saveJob = async () => {
    const user = useAuth.getState().user;
    if (!user) return;
    if (jobCompany.trim() && jobPosition.trim()) {
      setBusy(true);
      try {
        await db.saveJobOffer({
          id: crypto.randomUUID(), userId: user.id,
          company: jobCompany.trim(), position: jobPosition.trim(), type: jobType,
          modality: "presencial", schedule: [], bonuses: [],
          salaryPeriod: jobType === "gig" ? "evento" : "mes",
          status: "guardada", createdAt: new Date().toISOString(),
        });
      } catch (e: any) {
        alert(`No se pudo guardar: ${e?.message || e}`);
        setBusy(false);
        return;
      } finally { setBusy(false); }
    }
    onDone();
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 18 }}>
      <Card style={{ width: "100%", maxWidth: 460, padding: 22 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#111827", display: "grid", placeItems: "center", color: "#fff" }}>
            {step === 0 ? <Sparkles /> : step === 1 ? <BookOpen /> : <Briefcase />}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Bienvenido a Spark</div>
            <div className="muted small">Todo queda en tu PC • {step + 1} de 3</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, margin: "12px 0" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ flex: 1, height: 6, borderRadius: 999, background: i <= step ? "var(--primary)" : "var(--surface-2)" }} />
          ))}
        </div>

        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p className="muted small" style={{ margin: 0 }}>Organiza cursos, trabajo, dinero y estudio sin nube ni cuentas. Crea tu perfil local para empezar.</p>
            <div><Label>Código de alumno *</Label><Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="UC-2026-001" autoFocus /></div>
            <div><Label>Tu nombre *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" /></div>
            {err && <div style={{ padding: "8px 10px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 8, fontSize: 13 }}>{err}</div>}
            <Button variant="primary" onClick={doLogin} disabled={busy}>{busy ? "Creando…" : "Crear perfil y continuar"}</Button>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p className="muted small" style={{ margin: 0 }}>Registra tu primer curso. El resto (horarios, pesos, material) lo añades después en Cursos.</p>
            <div><Label>Nombre del curso *</Label><Input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Cálculo I" autoFocus /></div>
            <div><Label>Código *</Label><Input value={courseCode} onChange={e => setCourseCode(e.target.value)} placeholder="MAT-101" /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="primary" className="w-full" onClick={saveCourse} disabled={busy}>{busy ? "Guardando…" : "Guardar y continuar"}</Button>
              <Button onClick={() => setStep(2)}>Omitir</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p className="muted small" style={{ margin: 0 }}>¿Trabajas? Registra tu primer trabajo (opcional). Los detalles van después en Empleo.</p>
            <div><Label>Empresa</Label><Input value={jobCompany} onChange={e => setJobCompany(e.target.value)} placeholder="ACME S.A.C." autoFocus /></div>
            <div><Label>Puesto</Label><Input value={jobPosition} onChange={e => setJobPosition(e.target.value)} placeholder="Asistente part-time" /></div>
            <div><Label>Tipo</Label><Select value={jobType} onChange={e => setJobType(e.target.value as JobOfferType)}>
              <option value="fijo">Fijo (tiempo completo)</option><option value="parcial">Medio tiempo</option>
              <option value="gig">Por evento</option><option value="practica">Práctica</option>
            </Select></div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="primary" className="w-full" onClick={saveJob} disabled={busy}><Check size={14} /> {busy ? "Guardando…" : "Entrar a la app"}</Button>
              <Button onClick={onDone}>Omitir</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
