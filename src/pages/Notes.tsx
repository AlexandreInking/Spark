import { useEffect, useMemo, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Input, Label, Textarea, Select } from "../components/ui/primitives";
import { db } from "../lib/db";
import { useAuth } from "../stores/useAuth";
import { useData } from "../stores/useData";
import { backlinks, exportPack, importMarkdownFile, notebookToMarkdown, noteToShareText, parsePack, renderNoteMd, wordCount } from "../lib/notes";
import type { Note, Notebook } from "../types";
import { Trash2, Plus, Edit3, Pin, PinOff, Download, Link2 } from "lucide-react";

// Notas (v1.3.0, sin IA): cuadernos + subpáginas + etiquetas + fijadas +
// búsqueda global + enlaces [[Título]] con backlinks + preview Markdown seguro + export .md.
export default function NotesPage() {
  const { user } = useAuth();
  const { courses } = useData();
  const [nbs, setNbs] = useState<Notebook[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selNb, setSelNb] = useState("all");
  const [selId, setSelId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(false);

  // editor
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [pinned, setPinned] = useState(false);
  const [nbId, setNbId] = useState("");
  const [parentId, setParentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dirty, setDirty] = useState(false);

  const load = async () => {
    if (!user) return;
    const [a, b] = await Promise.all([
      db.listNotebooks(user.id).catch(() => [] as Notebook[]),
      db.listNotes(user.id).catch(() => [] as Note[]),
    ]);
    setNbs(a); setNotes(b);
  };
  useEffect(() => { load(); }, [user?.id]);

  const sel = notes.find(n => n.id === selId) || null;

  const openNote = (n: Note | null) => {
    setSelId(n?.id || null);
    setTitle(n?.title || "");
    setContent(n?.content || "");
    setTags((n?.tags || []).join(", "));
    setPinned(!!n?.pinned);
    setNbId(n?.notebookId || "");
    setParentId(n?.parentId || "");
    setCourseId(n?.courseId || "");
    setPreview(false);
    setDirty(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter(n =>
      (selNb === "all" || (n.notebookId || "") === selNb) &&
      (!q || (n.title + " " + n.content + " " + n.tags.join(" ")).toLowerCase().includes(q)));
  }, [notes, selNb, search]);

  const roots = useMemo(() => {
    const byParent = new Map<string, Note[]>();
    for (const n of filtered) {
      const k = n.parentId || "";
      if (!byParent.has(k)) byParent.set(k, []);
      byParent.get(k)!.push(n);
    }
    return { byParent };
  }, [filtered]);

  const backs = useMemo(() => (sel ? backlinks(notes, sel.id, sel.title) : []), [notes, sel]);

  const save = async () => {
    if (!user) return;
    if (!title.trim()) return alert("Título requerido");
    const now = new Date().toISOString();
    const note: Note = {
      id: sel?.id || crypto.randomUUID(), userId: user.id,
      notebookId: nbId || undefined,
      parentId: parentId && parentId !== sel?.id ? parentId : undefined,
      title: title.trim(), content,
      tags: tags.split(",").map(s => s.trim()).filter(Boolean),
      pinned, courseId: courseId || undefined,
      updatedAt: now, createdAt: sel?.createdAt || now,
    };
    await db.saveNote(note);
    setSelId(note.id);
    setDirty(false);
    await load();
  };

  const newNotebook = async () => {
    if (!user) return;
    const name = prompt("Nombre del cuaderno:");
    if (!name?.trim()) return;
    await db.saveNotebook({ id: crypto.randomUUID(), userId: user.id, name: name.trim(), createdAt: new Date().toISOString() });
    await load();
  };

  const download = (text: string, filename: string, mime = "text/markdown") => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportMd = () => {
    if (!sel) return;
    download(`# ${sel.title}\n\n${sel.content}`, `${sel.title.slice(0, 40)}.md`);
  };

  const shareNote = async () => {
    if (!sel) return;
    try { await navigator.clipboard.writeText(noteToShareText(sel)); alert("Copiado: pégalo en WhatsApp/Telegram"); }
    catch { prompt("Copia el texto:", noteToShareText(sel)); }
  };

  const exportAllJson = () => {
    download(exportPack(nbs, notes), `notas_${new Date().toISOString().slice(0, 10)}.json`, "application/json");
  };

  const exportNotebook = () => {
    const nb = nbs.find(x => x.id === selNb);
    if (!nb) return;
    download(notebookToMarkdown(nb.name, notes.filter(n => (n.notebookId || "") === nb.id)), `${nb.name.slice(0, 40)}.md`);
  };

  const importFile = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f || !user) return;
    try {
      const text = await f.text();
      if (/\.json$/i.test(f.name)) {
        const pack = parsePack(text);
        if (!confirm(`Importar ${pack.notebooks.length} cuaderno(s) y ${pack.notes.length} nota(s)? Los IDs duplicados se renuevan.`)) return;
        const existingNbs = await db.listNotebooks(user.id);
        const nbMap = new Map<string, string>();
        for (const nb of pack.notebooks) {
          const nid = existingNbs.some(x => x.id === nb.id) ? crypto.randomUUID() : nb.id;
          nbMap.set(nb.id, nid);
          await db.saveNotebook({ ...nb, id: nid, userId: user.id });
        }
        const existingIds = new Set((await db.listNotes(user.id)).map(n => n.id));
        const idMap = new Map<string, string>();
        for (const n of pack.notes) idMap.set(n.id, existingIds.has(n.id) ? crypto.randomUUID() : n.id);
        const now = new Date().toISOString();
        for (const n of pack.notes) {
          await db.saveNote({
            ...n, id: idMap.get(n.id)!, userId: user.id,
            notebookId: n.notebookId ? nbMap.get(n.notebookId) : undefined,
            parentId: n.parentId ? (idMap.get(n.parentId) || undefined) : undefined,
            tags: n.tags || [], updatedAt: now, createdAt: n.createdAt || now,
          });
        }
        alert("Importación completa.");
      } else {
        const { title, content } = importMarkdownFile(f.name, text);
        openNote(null);
        setTitle(title);
        setContent(content);
        setDirty(true);
        if (selNb !== "all") setNbId(selNb);
        alert(`Cargado como borrador: "${title}". Revisa y pulsa Guardar.`);
      }
      await load();
    } catch (e: any) {
      alert("No se pudo importar: " + (e?.message || e));
    }
  };

  const goLink = (t: string) => {
    const found = notes.find(n => n.title.toLowerCase() === t.toLowerCase());
    if (found) openNote(found);
    else if (confirm(`No existe "[[${t}]]". ¿Crear nota con ese título?`)) {
      openNote(null);
      setTitle(t);
      setDirty(true);
    }
  };

  const renderTree = (parent: string, depth: number): React.ReactNode[] => {
    return (roots.byParent.get(parent) || []).map(n => (
      <div key={n.id}>
        <div onClick={() => openNote(n)}
          style={{
            padding: "6px 8px", borderRadius: 8, cursor: "pointer", fontSize: 12.5,
            marginLeft: depth * 14, display: "flex", gap: 6, alignItems: "center",
            background: n.id === selId ? "var(--surface-2)" : "transparent",
            border: n.id === selId ? "1px solid var(--border)" : "1px solid transparent",
            fontWeight: n.id === selId ? 700 : 400,
          }}>
          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {n.pinned ? "📌 " : ""}{n.title}
          </span>
        </div>
        {renderTree(n.id, depth + 1)}
      </div>
    ));
  };

  const html = useMemo(() => renderNoteMd(content, t => `<a href="#" data-note="${t.replace(/"/g, "")}">${t}</a>`), [content]);

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <Topbar title="Notas" subtitle="Cuadernos + subpáginas + [[enlaces]] + búsqueda • todo local, sin IA" actions={
        <div style={{ display: "flex", gap: 8 }}>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en todo…" style={{ width: 170 }} />
          <Button variant="primary" onClick={() => openNote(null)}><Plus size={14} /> Nota</Button>
        </div>
      } />
      <div style={{ padding: 18, display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Card style={{ width: 280, minWidth: 240 }}>
          <div className="flex justify-between items-center">
            <b style={{ fontSize: 12 }}>Cuadernos</b>
            <Button size="sm" onClick={newNotebook}><Plus size={12} /></Button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
            <div onClick={() => setSelNb("all")} style={{ padding: "6px 8px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: selNb === "all" ? 700 : 400, background: selNb === "all" ? "var(--surface-2)" : "transparent" }}>
              📚 Todas ({notes.length})
            </div>
            {nbs.map(nb => (
              <div key={nb.id} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <div onClick={() => setSelNb(nb.id)} style={{ flex: 1, padding: "6px 8px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: selNb === nb.id ? 700 : 400, background: selNb === nb.id ? "var(--surface-2)" : "transparent" }}>
                  📓 {nb.name} ({notes.filter(n => (n.notebookId || "") === nb.id).length})
                </div>
                <button title="Borrar cuaderno (las notas quedan sueltas)" onClick={async () => { if (confirm(`¿Borrar cuaderno "${nb.name}"?`)) { await db.deleteNotebook(nb.id); if (selNb === nb.id) setSelNb("all"); await load(); } }}
                  style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-faint)" }}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <b style={{ fontSize: 12 }}>Páginas</b>
            <div style={{ marginTop: 6, maxHeight: 320, overflowY: "auto" }}>
              {filtered.length === 0 ? <p className="muted small">Sin notas aquí.</p> : renderTree("", 0)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            <label className="btn btn-sm" style={{ cursor: "pointer", flex: 1, justifyContent: "center" }}>Importar
              <input type="file" accept=".md,.txt,.json" style={{ display: "none" }} onChange={e => { void importFile(e.target.files); e.target.value = ""; }} />
            </label>
            <Button size="sm" onClick={exportAllJson} title="Todo en JSON (fidelidad total)">Todo JSON</Button>
            {selNb !== "all" && <Button size="sm" onClick={exportNotebook} title="Cuaderno en .md">Cuaderno .md</Button>}
          </div>
        </Card>

        <div style={{ flex: 1, minWidth: 300, display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <div className="flex justify-between items-center" style={{ flexWrap: "wrap", gap: 8 }}>
              <b style={{ fontSize: 13 }}>{sel ? "Editar nota" : "Nueva nota"}{dirty && <span className="muted"> • sin guardar</span>}</b>
              <div style={{ display: "flex", gap: 6 }}>
                <Button size="sm" variant={preview ? "primary" : "ghost"} onClick={() => setPreview(p => !p)}>{preview ? "Editar" : "Vista"}</Button>
                {sel && <Button size="sm" onClick={shareNote} title="Copiar para WhatsApp/Telegram">Compartir</Button>}
                {sel && <Button size="sm" onClick={exportMd}><Download size={12} /> .md</Button>}
                {sel && <Button size="sm" onClick={async () => { if (confirm("¿Borrar nota? (las hijas suben un nivel)")) { await db.deleteNote(sel.id); openNote(null); await load(); } }}><Trash2 size={12} /></Button>}
              </div>
            </div>
            <div className="grid grid-3" style={{ marginTop: 10 }}>
              <div style={{ gridColumn: "span 2" }}><Label>Título *</Label><Input value={title} onChange={e => { setTitle(e.target.value); setDirty(true); }} placeholder="Título…" /></div>
              <div><Label>Fijada</Label><div><Button size="sm" variant={pinned ? "primary" : "ghost"} onClick={() => { setPinned(p => !p); setDirty(true); }}>{pinned ? <PinOff size={12} /> : <Pin size={12} />}{pinned ? " Fijada" : " Fijar"}</Button></div></div>
            </div>
            <div className="grid grid-3" style={{ marginTop: 8 }}>
              <div><Label>Cuaderno</Label><Select value={nbId} onChange={e => { setNbId(e.target.value); setDirty(true); }}>
                <option value="">Sin cuaderno</option>
                {nbs.map(nb => <option key={nb.id} value={nb.id}>{nb.name}</option>)}
              </Select></div>
              <div><Label>Subpágina de</Label><Select value={parentId} onChange={e => { setParentId(e.target.value); setDirty(true); }}>
                <option value="">Raíz</option>
                {notes.filter(n => n.id !== sel?.id).map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
              </Select></div>
              <div><Label>Curso</Label><Select value={courseId} onChange={e => { setCourseId(e.target.value); setDirty(true); }}>
                <option value="">Ninguno</option>
                {courses.filter(c => c.status === "activo").map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
              </Select></div>
            </div>
            <div style={{ marginTop: 8 }}><Label>Etiquetas (coma)</Label><Input value={tags} onChange={e => { setTags(e.target.value); setDirty(true); }} placeholder="examen,udemy…" /></div>
            {preview ? (
              <div style={{ marginTop: 8, padding: 12, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface-2)", fontSize: 13, minHeight: 200 }}
                onClick={e => {
                  const a = (e.target as HTMLElement).closest("[data-note]");
                  if (a) { e.preventDefault(); goLink(a.getAttribute("data-note") || ""); }
                }}
                dangerouslySetInnerHTML={{ __html: html || '<p class="muted">Vacío</p>' }} />
            ) : (
              <div style={{ marginTop: 8 }}><Label>Contenido (Markdown simple + [[enlaces]])</Label>
                <Textarea value={content} onChange={e => { setContent(e.target.value); setDirty(true); }} rows={14} placeholder={"# Título\n**negrita** *cursiva* `código`\n- lista\n- [ ] tarea\n> cita\n\nVer [[Otra nota]]"} style={{ fontFamily: "monospace", fontSize: 12.5 }} />
              </div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
              <Button variant="primary" className="w-full" onClick={save}><Edit3 size={12} /> Guardar</Button>
              <span className="muted small">{wordCount(content)} palabras</span>
            </div>
          </Card>

          {sel && (
            <Card>
              <b style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}><Link2 size={12} /> Enlazado desde ({backs.length})</b>
              {backs.length === 0
                ? <p className="muted small" style={{ marginTop: 4 }}>Nadie enlaza aquí. Escribe [[{sel.title}]] en otra nota.</p>
                : <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {backs.map(b => <Button key={b.id} size="sm" onClick={() => openNote(b)}>{b.title}</Button>)}
                </div>}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
