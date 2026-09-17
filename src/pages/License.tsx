import { useEffect, useState } from "react";
import { Card, Button, Input, Label } from "../components/ui/primitives";
import { lic, type MachineCode, type TrialStatus } from "../lib/license";
import { KeyRound, Copy, ShieldCheck } from "lucide-react";

// Pantalla de activación (v1.2.0): trial 7 días, luego exige clave atada a esta PC.
export default function LicensePage({ onActivated }: { onActivated: () => void }) {
  const [mc, setMc] = useState<MachineCode | null>(null);
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    lic.machineCode().then(setMc);
    lic.trial().then(setTrial);
  }, []);

  const copyCode = async () => {
    if (!mc) return;
    try { await navigator.clipboard.writeText(mc.code); alert("Código copiado"); }
    catch { prompt("Copia tu código de máquina:", mc.code); }
  };

  const activate = async () => {
    if (!key.trim()) return setErr("Pega tu clave de desbloqueo");
    setErr(""); setBusy(true);
    const r = await lic.activate(key.trim());
    setBusy(false);
    if (!r.ok) { setErr(r.error || "Clave inválida"); return; }
    onActivated();
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 18 }}>
      <Card style={{ width: "100%", maxWidth: 480, padding: 22 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#111827", display: "grid", placeItems: "center", color: "#fff" }}>
            <KeyRound />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Activa Spark</div>
            <div className="muted small">
              {trial && !trial.expired
                ? `Te quedan ${trial.days_left} día(s) gratis (desde ${trial.start})`
                : "Tu semana gratis terminó — ingresa tu clave"}
            </div>
          </div>
        </div>
        <p className="muted small" style={{ margin: "0 0 12px" }}>
          1) Copia tu <b>código de máquina</b> y envíaselo a quien te vendió (con tu pago).
          2) Te devuelven la <b>clave de desbloqueo</b>, la pegas abajo y listo.
          La clave solo funciona en esta PC.
        </p>
        <div><Label>Tu código de máquina (contiene solo hashes, nada personal sale de tu PC)</Label>
          <div style={{ display: "flex", gap: 8 }}>
            <Input value={mc?.code || "…"} readOnly style={{ fontFamily: "monospace", fontSize: 12 }} />
            <Button size="sm" onClick={copyCode}><Copy size={12} /> Copiar</Button>
          </div>
        </div>
        <div style={{ marginTop: 12 }}><Label>Clave de desbloqueo</Label>
          <Input value={key} onChange={e => setKey(e.target.value)} placeholder="Pega aquí tu clave…" style={{ fontFamily: "monospace", fontSize: 12 }} />
        </div>
        {err && <div style={{ marginTop: 10, padding: "8px 10px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 8, fontSize: 13 }}>{err}</div>}
        <Button variant="primary" className="w-full" style={{ marginTop: 12 }} onClick={activate} disabled={busy}>
          <ShieldCheck size={14} /> {busy ? "Verificando…" : "Activar"}
        </Button>
        {trial && !trial.expired && (
          <Button className="w-full" style={{ marginTop: 8 }} onClick={onActivated}>Seguir en prueba ({trial.days_left}d)</Button>
        )}
      </Card>
    </div>
  );
}
