import { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Input, Label } from "../components/ui/primitives";
import { getNotifySettings, saveNotifySettings, type NotifySettings } from "../lib/notifications";
import { THEMES, analyzeImage, applyAmbience, loadAmbience, loadCustom, loadFx, loadReactive, loadThemeId, saveAmbience, saveCustom, saveFx, saveReactive, setThemeId, type CustomTheme, type FxFlags } from "../lib/themes";
import { lic, type LicenseStatus, type MachineCode, type TrialStatus } from "../lib/license";

export default function SettingsPage() {
  const [autostart, setAutostart] = useState<boolean | null>(null);
  const [minimizeToTray, setMinimizeToTray] = useState(localStorage.getItem("uc_minimize_to_tray")==="1");
  const [version, setVersion] = useState<string>("0.1.0");
  const [notify, setNotify]=useState<NotifySettings>({ enabled:true, soundEnabled:true, soundVolume:70, foregroundToast:true, backgroundOS:true });

  useEffect(()=>{
    (async()=>{
      try {
        const { enable, disable, isEnabled } = await import("@tauri-apps/plugin-autostart");
        (window as any).__autostart = { enable, disable, isEnabled };
        const enabled = await isEnabled();
        setAutostart(enabled);
      } catch { setAutostart(null); }
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const v = await invoke("get_app_version") as string;
        setVersion(v);
      } catch {}
      const ns = await getNotifySettings();
      setNotify(ns);
    })();
  }, []);

  const toggleAutostart = async()=>{
    try {
      const { enable, disable } = (window as any).__autostart;
      if (autostart) { await disable(); setAutostart(false); }
      else { await enable(); setAutostart(true); }
    } catch (e:any) { alert("Autostart no disponible en web: "+ e.message); }
  };

  return (
    <div style={{ flex:1, overflow:"auto" }}>
      <Topbar title="Ajustes" subtitle="Ejecución en segundo plano, inicio con encendido, atajos, local-first" />
      <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14, maxWidth:820 }}>
        <Card>
          <b style={{ fontSize:14 }}>Sistema • local-first (Mac y Windows)</b>
          <p className="muted small">Binario sin consola, totalmente optimizado con Tauri (Rust). Datos en SQLite local (carpeta de datos de la app). Sin telemetría.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", border:"1px solid var(--border)", borderRadius:10 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600 }}>Inicio con el encendido (configurable)</div>
                <div className="muted small">Usa tauri-plugin-autostart</div>
              </div>
              {autostart===null ? <span className="badge">No disponible en navegador</span> : <Button variant="primary" size="sm" onClick={toggleAutostart}>{autostart? "Desactivar":"Activar"}</Button>}
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", border:"1px solid var(--border)", borderRadius:10 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600 }}>Ejecución en segundo plano</div>
                <div className="muted small">Al cerrar, minimiza a bandeja.</div>
              </div>
              <label style={{ display:"flex", gap:8, alignItems:"center", cursor:"pointer" }}>
                <input type="checkbox" checked={minimizeToTray} onChange={e=>{ setMinimizeToTray(e.target.checked); localStorage.setItem("uc_minimize_to_tray", e.target.checked?"1":"0"); }} />
                <span style={{ fontSize:13, fontWeight:600 }}>{minimizeToTray? "Activado":"Desactivado"}</span>
              </label>
            </div>
          </div>
        </Card>


        <Card>
          <b style={{ fontSize:14 }}>🔔 Notificaciones y sonido (1er y 2do plano)</b>
          <p className="muted small">Alertas configurables para entregables, clases y pagos. Suena en primer plano (toast) y en segundo plano (notificación OS + sonido).</p>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:10 }}>
            <label style={{ display:"flex", gap:8, alignItems:"center" }}><input type="checkbox" checked={notify.enabled} onChange={async e=>{ const v={...notify, enabled:e.target.checked}; setNotify(v); await saveNotifySettings(v); }} /> Activar notificaciones</label>
            <label style={{ display:"flex", gap:8, alignItems:"center" }}><input type="checkbox" checked={notify.foregroundToast} onChange={async e=>{ const v={...notify, foregroundToast:e.target.checked}; setNotify(v); await saveNotifySettings(v); }} /> Toast en 1er plano</label>
            <label style={{ display:"flex", gap:8, alignItems:"center" }}><input type="checkbox" checked={notify.backgroundOS} onChange={async e=>{ const v={...notify, backgroundOS:e.target.checked}; setNotify(v); await saveNotifySettings(v); }} /> Notificación OS en 2do plano</label>
            <label style={{ display:"flex", gap:8, alignItems:"center" }}><input type="checkbox" checked={notify.soundEnabled} onChange={async e=>{ const v={...notify, soundEnabled:e.target.checked}; setNotify(v); await saveNotifySettings(v); }} /> Sonido</label>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <span style={{ fontSize:12, fontWeight:600 }}>Volumen {notify.soundVolume}%</span>
              <input type="range" min={0} max={100} value={notify.soundVolume} onChange={async e=>{ const v={...notify, soundVolume:Number(e.target.value)}; setNotify(v); await saveNotifySettings(v); }} style={{ flex:1 }} />
              <Button size="sm" onClick={()=>{
                if(notify.soundFile){
                  const a=new Audio(notify.soundFile); a.volume=notify.soundVolume/100; a.play();
                } else {
                  const ctx=new (window.AudioContext||(window as any).webkitAudioContext)();
                  const o=ctx.createOscillator(); const g=ctx.createGain(); o.frequency.value=880; g.gain.value=notify.soundVolume/100*0.3; o.connect(g); g.connect(ctx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime+0.6); o.stop(ctx.currentTime+0.6);
                }
              }}>Probar sonido</Button>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:6 }}>
              <span className="muted small">Sonido personalizado (.wav/.mp3):</span>
              <label className="btn btn-sm" style={{ cursor:"pointer" }}>Elegir archivo<input type="file" accept="audio/*" hidden onChange={e=>{
                const f=e.target.files?.[0]; if(!f) return;
                const reader=new FileReader();
                reader.onload=async()=>{
                  const data=reader.result as string;
                  const v={...notify, soundFile:data, soundEnabled:true};
                  setNotify(v); await saveNotifySettings(v);
                  alert("Sonido guardado local");
                };
                reader.readAsDataURL(f);
              }} /></label>
              {notify.soundFile && <Button size="sm" onClick={async()=>{ const v={...notify, soundFile:undefined}; setNotify(v); await saveNotifySettings(v); }}>Usar beep por defecto</Button>}
            </div>
          </div>
        </Card>

        <Card>
          <b style={{ fontSize:14 }}>💾 Backup local + Importar (Moodle CSV / ICS)</b>
          <p className="muted small">Todo queda en tu máquina. Exporta un <code>.json</code> cifrado con todos tus datos para migrar, e importa cursos/entregables desde Moodle o calendario.</p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:10 }}>
            <Button size="sm" variant="primary" onClick={async()=>{
              const { exportBackup, downloadText } = await import("../lib/backup");
              const txt=await exportBackup();
              downloadText(txt, `spark_backup_${new Date().toISOString().slice(0,10)}.json`);
            }}>Exportar backup JSON</Button>
            <label className="btn btn-sm" style={{ cursor:"pointer" }}>Importar backup JSON<input type="file" accept=".json" hidden onChange={async e=>{
              const f=e.target.files?.[0]; if(!f) return;
              const txt=await f.text();
              const { importBackup } = await import("../lib/backup");
              try{ await importBackup(txt); alert("Backup importado. Recarga."); location.reload(); }catch(err:any){ alert("Error: "+err.message); }
            }} /></label>
            <label className="btn btn-sm" style={{ cursor:"pointer" }}>Importar Moodle CSV<input type="file" accept=".csv" hidden onChange={async e=>{
              const f=e.target.files?.[0]; if(!f) return;
              const txt=await f.text();
              const { importMoodleCSV } = await import("../lib/backup");
              const { useAuth } = await import("../stores/useAuth");
              const user=useAuth.getState().user; if(!user) return alert("Login primero");
              const r=await importMoodleCSV(txt, user.id);
              alert(`Importado: ${r.courses} cursos, ${r.deliverables} entregables`);
              location.reload();
            }} /></label>
          </div>
          <div className="muted small" style={{ marginTop:6 }}>CSV cursos: cabecera <code>Curso,Codigo,Semestre,Profesor,Creditos</code> • Entregables: <code>CursoCode,Titulo,Fecha,Hora,Tipo</code></div>
        </Card>

        <AutoBackupCard />

        <AppearanceCard />

        <ActivationCard />

        <Card>
          <b style={{ fontSize:14 }}>Acerca de</b>
          <div className="muted small" style={{ marginTop:6 }}>
            <div>Spark v{version}</div>
            <div style={{ marginTop:6 }}>local-first • Tus datos nunca salen de este equipo.</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ActivationCard() {
  const [mc, setMc] = useState<MachineCode | null>(null);
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [licSt, setLicSt] = useState<LicenseStatus | null>(null);
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    lic.machineCode().then(setMc);
    lic.trial().then(setTrial);
    lic.status().then(setLicSt);
  }, []);

  const copyCode = async () => {
    if (!mc) return;
    try { await navigator.clipboard.writeText(mc.code); alert("Código copiado"); }
    catch { prompt("Copia tu ID de computadora:", mc.code); }
  };

  const activate = async () => {
    if (!key.trim()) return setErr("Pega tu clave de activación");
    setErr(""); setBusy(true);
    const r = await lic.activate(key.trim());
    setBusy(false);
    if (!r.ok) { setErr(r.error || "Clave inválida"); return; }
    alert("¡Activado para siempre! Recargando…");
    location.reload();
  };

  return (
    <Card>
      <b style={{ fontSize: 14 }}>Activación</b>
      {licSt?.licensed ? (
        <div style={{ marginTop: 10, padding: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 10, fontSize: 12 }}>
          ✅ Activo para siempre{licSt.grandfather ? " (licencia de lanzamiento)" : ""}
          {licSt.expiry ? ` (vence ${licSt.expiry})` : ""}
          {licSt.reseller !== null && licSt.reseller !== undefined ? ` • Revendedor #${licSt.reseller}` : ""}
        </div>
      ) : (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="muted small" style={{ margin: 0 }}>
            {trial ? `Prueba: ${trial.days_left} día(s) restantes (desde ${trial.start}).` : "Estado de prueba no disponible en web."}{" "}
            Activa cuando quieras: la cuenta atrás desaparece y queda permanente.
          </p>
          <div>
            <Label>ID de computadora</Label>
            <div style={{ display: "flex", gap: 8 }}>
              <Input value={mc?.code || "…"} readOnly style={{ fontFamily: "monospace", fontSize: 12 }} />
              <Button size="sm" onClick={copyCode}>Copiar</Button>
            </div>
            <p className="muted small" style={{ marginTop: 4 }}>Contiene solo hashes: tu IP y datos nunca salen de tu PC.</p>
          </div>
          <div>
            <Label>Clave de activación (la que te entregan al comprar)</Label>
            <Input value={key} onChange={e => setKey(e.target.value)} placeholder="Pega aquí tu clave…" style={{ fontFamily: "monospace", fontSize: 12 }} />
          </div>
          {err && <div style={{ padding: "8px 10px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 8, fontSize: 12 }}>{err}</div>}
          <div><Button variant="primary" onClick={activate} disabled={busy}>{busy ? "Verificando…" : "Activar para siempre"}</Button></div>
        </div>
      )}
    </Card>
  );
}

function AppearanceCard() {
  const [themeId, setThemeIdState] = useState(loadThemeId());
  const [custom, setCustom] = useState<CustomTheme>(loadCustom());
  const [fx, setFx] = useState<FxFlags>(loadFx());

  const pick = (id: string) => { setThemeIdState(id); setThemeId(id); };
  const updCustom = (patch: Partial<CustomTheme>) => {
    const next = { ...custom, ...patch };
    setCustom(next);
    saveCustom(next);
  };
  const updFx = (patch: Partial<FxFlags>) => {
    const next = { ...fx, ...patch };
    setFx(next);
    saveFx(next);
  };

  const pickBg = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return alert("Elige una imagen");
    if (f.size > 2.5 * 1024 * 1024) return alert("Imagen muy pesada (máx 2.5MB): comprímela o usa otra");
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(new Error("read"));
      r.readAsDataURL(f);
    });
    updCustom({ bgImage: dataUrl });
  };

  const clearBg = async () => {
    try {
      const { db } = await import("../lib/db");
      await db.setSetting("custom_bg", "");
    } catch {}
    updCustom({ bgImage: undefined });
  };

  return (
    <Card>
      <b style={{ fontSize: 14 }}>Apariencia</b>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <Label>Tema</Label>
          <select className="select" value={themeId} onChange={e => pick(e.target.value)} style={{ width: "100%" }}>
            {THEMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        {themeId === "reactiva" && <ReactivaBlock />}
        {themeId === "custom" && (
          <div style={{ padding: 10, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <Label>Base</Label>
              <select className="select" value={custom.base} onChange={e => updCustom({ base: e.target.value })} style={{ width: "100%" }}>
                {THEMES.filter(t => t.id !== "custom").map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Imagen de fondo (máx 2.5MB)</Label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label className="btn btn-sm" style={{ cursor: "pointer" }}>Elegir imagen
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { void pickBg(e.target.files); e.target.value = ""; }} />
                </label>
                {custom.bgImage && <Button size="sm" onClick={() => void clearBg()}>Quitar fondo</Button>}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <Label>Tamaño de letra</Label>
                <select className="select" value={custom.fontSize || "m"} onChange={e => updCustom({ fontSize: e.target.value as any })} style={{ width: "100%" }}>
                  <option value="s">Pequeña</option>
                  <option value="m">Normal</option>
                  <option value="l">Grande</option>
                  <option value="xl">Extra</option>
                </select>
              </div>
              <div>
                <Label>Fuente</Label>
                <select className="select" value={custom.fontFamily || "inter"} onChange={e => updCustom({ fontFamily: e.target.value as any })} style={{ width: "100%" }}>
                  <option value="inter">Inter</option>
                  <option value="system">Sistema</option>
                  <option value="serif">Serif</option>
                  <option value="mono">Monoespaciada</option>
                </select>
              </div>
              <div>
                <Label>Color de letras</Label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="color" value={custom.fontColor || "#f1f1f3"} onChange={e => updCustom({ fontColor: e.target.value })} />
                  {custom.fontColor && <Button size="sm" onClick={() => updCustom({ fontColor: undefined })}>Original</Button>}
                </div>
              </div>
              <div>
                <Label>Color de fondo</Label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="color" value={custom.bgColor || "#0f0f10"} onChange={e => updCustom({ bgColor: e.target.value })} />
                  {custom.bgColor && <Button size="sm" onClick={() => updCustom({ bgColor: undefined })}>Original</Button>}
                </div>
              </div>
              <div>
                <Label>Color tarjetas</Label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="color" value={custom.surfaceColor || "#1a1a1e"} onChange={e => updCustom({ surfaceColor: e.target.value })} />
                  {custom.surfaceColor && <Button size="sm" onClick={() => updCustom({ surfaceColor: undefined })}>Original</Button>}
                </div>
              </div>
              <div>
                <Label>Color acento/botones</Label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="color" value={custom.accentColor || "#f1f1f3"} onChange={e => updCustom({ accentColor: e.target.value })} />
                  {custom.accentColor && <Button size="sm" onClick={() => updCustom({ accentColor: undefined })}>Original</Button>}
                </div>
              </div>
            </div>
          </div>
        )}
        <div>
          <Label>Efectos</Label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={fx.click} onChange={e => updFx({ click: e.target.checked })} /> Clic
            </label>
            <div>
              <Label>Animación clic</Label>
              <select className="select" value={fx.clickStyle} onChange={e => updFx({ clickStyle: e.target.value as any })}>
                <option value="burst">Explosión</option>
                <option value="rings">Anillos</option>
                <option value="confetti">Confeti</option>
                <option value="spiral">Espiral</option>
                <option value="fireworks">Fuegos artificiales</option>
              </select>
            </div>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={fx.trails} onChange={e => updFx({ trails: e.target.checked })} /> Estela
            </label>
            <div>
              <Label>Estela</Label>
              <select className="select" value={fx.trailStyle} onChange={e => updFx({ trailStyle: e.target.value as any })}>
                <option value="dots">Puntos</option>
                <option value="stars">Estrellas</option>
                <option value="bubbles">Burbujas</option>
                <option value="comet">Cometa</option>
                <option value="sparkles">Destellos</option>
              </select>
            </div>
            <div>
              <Label>Color fx</Label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="color" value={fx.fxColor || "#f43f5e"} onChange={e => updFx({ fxColor: e.target.value })} />
                {fx.fxColor && <Button size="sm" onClick={() => updFx({ fxColor: undefined })}>Auto</Button>}
              </div>
            </div>
          </div>
          <p className="muted small" style={{ marginTop: 4 }}>Auto = multicolor en clics y color del tema en estela.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end", marginTop: 4 }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={fx.sfx} onChange={e => updFx({ sfx: e.target.checked })} /> Sonido de clic
            </label>
            <div>
              <Label>Tipo</Label>
              <select className="select" value={fx.sfxStyle} onChange={e => updFx({ sfxStyle: e.target.value as any })}>
                <option value="click">Click</option>
                <option value="pop">Pop</option>
                <option value="soft">Suave</option>
              </select>
            </div>
            <div>
              <Label>Volumen ({fx.sfxVolume}%)</Label>
              <input type="range" min={0} max={100} step={5} value={fx.sfxVolume} onChange={e => updFx({ sfxVolume: Number(e.target.value) })} style={{ width: 120 }} />
            </div>
          </div>
        </div>
        <AmbienceBlock />
      </div>
    </Card>
  );
}

function ReactivaBlock() {
  const [prev, setPrev] = useState<string[] | null>(null);
  const [vars, setVars] = useState<Record<string, string> | null>(null);
  const [scheme, setScheme] = useState<"dark" | "light">("dark");
  const [busy, setBusy] = useState(false);
  const stored = loadReactive();

  const pick = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const r = await analyzeImage(f);
      setPrev(r.preview);
      setVars(r.vars);
      setScheme(r.scheme);
    } catch (e: any) {
      alert(e?.message || "No se pudo analizar");
    } finally { setBusy(false); }
  };

  const apply = () => {
    if (!vars) return;
    saveReactive(vars, scheme);
    setThemeId("reactiva");
    setPrev(null); setVars(null);
  };

  return (
    <div style={{ padding: 10, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10 }}>
      <p className="muted small" style={{ margin: "0 0 8px" }}>
        Analiza tu imagen, extrae sus colores más usados y los coloca donde mejor contraste dan (fondo, texto, acentos).
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label className="btn btn-sm" style={{ cursor: "pointer" }}>{busy ? "Analizando…" : stored ? "Analizar otra imagen" : "Elegir imagen"}
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { void pick(e.target.files); e.target.value = ""; }} />
        </label>
        {stored && !prev && (
          <span className="muted small">Paleta guardada: {stored.scheme === "dark" ? "oscura" : "clara"}</span>
        )}
      </div>
      {prev && vars && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {prev.map((c, i) => (
              <div key={i} title={c} style={{ width: 34, height: 34, borderRadius: 8, background: c, border: "1px solid var(--border)" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" variant="primary" onClick={apply}>Aplicar tema</Button>
            <Button size="sm" onClick={() => { setPrev(null); setVars(null); }}>Descartar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AmbienceBlock() {
  const [cfg, setCfg] = useState(loadAmbience());
  const [hasFile, setHasFile] = useState(false);

  useEffect(() => {
    import("../lib/db").then(({ db }) => db.getSetting("ambience_audio")).then(v => setHasFile(!!v)).catch(() => {});
  }, []);

  const upd = async (patch: Partial<{ enabled: boolean; volume: number }>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    saveAmbience(next);
    await applyAmbience();
  };

  const pick = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("audio/")) return alert("Elige un audio (mp3, ogg, wav)");
    if (f.size > 8 * 1024 * 1024) return alert("Audio muy pesado (máx 8MB): usa una pista corta en bucle");
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(new Error("read"));
      r.readAsDataURL(f);
    });
    const { db } = await import("../lib/db");
    await db.setSetting("ambience_audio", dataUrl);
    setHasFile(true);
    const { applyAmbience } = await import("../lib/themes");
    await applyAmbience();
  };

  const clear = async () => {
    const { db } = await import("../lib/db");
    await db.setSetting("ambience_audio", "");
    setHasFile(false);
    const { applyAmbience } = await import("../lib/themes");
    await applyAmbience();
  };

  return (
    <div style={{ marginTop: 10 }}>
      <Label>Audio de fondo en bucle (máx 8MB)</Label>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
          <input type="checkbox" checked={cfg.enabled} onChange={e => void upd({ enabled: e.target.checked })} /> Activado
        </label>
        <div>
          <Label>Volumen ({cfg.volume}%)</Label>
          <input type="range" min={0} max={100} step={5} value={cfg.volume} onChange={e => void upd({ volume: Number(e.target.value) })} style={{ width: 120 }} />
        </div>
        <label className="btn btn-sm" style={{ cursor: "pointer" }}>Elegir audio
          <input type="file" accept="audio/*" style={{ display: "none" }} onChange={e => { void pick(e.target.files); e.target.value = ""; }} />
        </label>
        {hasFile && <Button size="sm" onClick={() => void clear()}>Quitar audio</Button>}
      </div>
      <p className="muted small" style={{ marginTop: 4 }}>Empieza con tu primer clic (el navegador lo exige). Se guarda en la DB local.</p>
    </div>
  );
}

function AutoBackupCard(){
  const [enabled, setEnabled]=useState(false);
  const [freq, setFreq]=useState("semanal");
  const [time, setTime]=useState("03:00");
  const [lastRun, setLastRun]=useState<string|null>(null);
  const [info, setInfo]=useState<{at:string;sizeKb:number}|null>(null);
  const [next, setNext]=useState<string|null>(null);
  const [running, setRunning]=useState(false);

  const refresh=async()=>{
    const m=await import("../lib/autobackup");
    const c=m.getAutoBackupConfig();
    setEnabled(c.enabled); setFreq(c.freq); setTime(c.time); setLastRun(c.lastRun);
    setInfo(m.getAutoBackupInfo());
    const n=m.nextDueDate(c);
    setNext(n? n.toLocaleString() : null);
  };
  useEffect(()=>{ refresh(); },[]);

  const save=async()=>{
    const m=await import("../lib/autobackup");
    m.saveAutoBackupConfig({ enabled, freq: freq as any, time, lastRun });
    await refresh();
    alert("Autoguardado configurado.");
  };

  return (
    <Card>
      <b style={{ fontSize:14 }}>⏱️ Autoguardado programado (una sola copia)</b>
      <p className="muted small">Respaldo automático por si borras algo por error. <b>No crea copias: siempre sobreescribe la misma.</b> Requiere PC encendida y app abierta a la hora programada (funciona en 1er y 2do plano).</p>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:10 }}>
        <label style={{ display:"flex", gap:8, alignItems:"center", cursor:"pointer" }}>
          <input type="checkbox" checked={enabled} onChange={e=> setEnabled(e.target.checked)} />
          <span style={{ fontSize:13, fontWeight:600 }}>{enabled? "Activado":"Desactivado"}</span>
        </label>
        <div className="grid grid-2">
          <div>
            <Label>Frecuencia</Label>
            <select className="select" value={freq} onChange={e=> setFreq(e.target.value)} style={{ width:"100%" }}>
              <option value="diaria">Diaria</option>
              <option value="semanal">Semanal</option>
              <option value="quincenal">Quincenal</option>
              <option value="mensual">Mensual</option>
            </select>
          </div>
          <div>
            <Label>Hora (se ejecuta a partir de)</Label>
            <Input type="time" value={time} onChange={e=> setTime(e.target.value)} />
          </div>
        </div>
        <div className="muted small">
          <div>Último autoguardado: <b>{lastRun? new Date(lastRun).toLocaleString() : "nunca"}</b>{info? ` • ${info.sizeKb} KB` : ""}</div>
          <div>Próximo estimado: <b>{enabled? (next || "—") : "desactivado"}</b></div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <Button size="sm" variant="primary" onClick={save}>Guardar configuración</Button>
          <Button size="sm" disabled={running} onClick={async()=>{
            setRunning(true);
            const m=await import("../lib/autobackup");
            const r=await m.runAutoBackup();
            setRunning(false);
            await refresh();
            alert(r.ok? "Autoguardado completado (copia única sobreescrita)." : "Error: "+r.error);
          }}>{running? "Guardando…" : "Ejecutar ahora"}</Button>
          <Button size="sm" onClick={async()=>{
            const m=await import("../lib/autobackup");
            const t=m.getAutoBackupText();
            if(!t) return alert("Aún no hay autoguardado.");
            const { downloadText }=await import("../lib/backup");
              downloadText(t, `spark_autoguardado_${new Date().toISOString().slice(0,10)}.json`);
          }}>Descargar copia</Button>
          <Button size="sm" onClick={async()=>{
            const m=await import("../lib/autobackup");
            const t=m.getAutoBackupText();
            if(!t) return alert("Aún no hay autoguardado.");
            if(!confirm("¿Restaurar el autoguardado? Se fusionará con los datos actuales.")) return;
            const { importBackup }=await import("../lib/backup");
            try{ await importBackup(t); alert("Restaurado. Recarga."); location.reload(); }catch(err:any){ alert("Error: "+err.message); }
          }}>Restaurar autoguardado</Button>
        </div>
      </div>
    </Card>
  );
}
