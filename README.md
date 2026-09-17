# Spark — Organizador Universitario local-first

**local-first • Windows & Mac • Minimalista • Sin consola • P2P serverless**

Sistema integral para carrera universitaria: calendario con alarmas, registro de cursos/notas/pesos, dashboard relevante, board infinito Miro-like, herramientas APA/paráfrasis/plagio, P2P multicursor, credenciales con copy, tray y autostart.

> **Stack elegido (usa librerías existentes, no reinventado):** Tauri 2 (Rust) + React + Vite + TypeScript • SQLite (`tauri-plugin-sql`) • FullCalendar • tldraw • Yjs + y-webrtc • citation-js • date-fns • Zustand • Tauri plugins: sql, store, autostart, single-instance, notification, clipboard.

---

## 🚀 Inicio rápido (3 formas, todas sin consola en release)

### 1) Ejecutable optimizado (RECOMENDADO - 11MB, sin cmd)
Doble-click:
- `Spark.exe` — binario release ya compilado (`cargo build --release`, `windows_subsystem=windows` → **no abre consola**)
- o `Iniciar Spark.vbs` — launcher VBS que oculta cualquier ventana
- o `Spark-Start.bat` — launcher que usa PowerShell hidden
- o acceso directo ya creado en Escritorio: `Spark.lnk`

### 2) Acceso directo automático
```powershell
# PowerShell (como admin no necesario)
.\Crear Acceso Directo.ps1
# Crea .lnk en Escritorio y opcional en Startup (autostart)
```

### 3) Desarrollo / Web fallback (sin Tauri)
```bash
npm install
npm run dev      # vite en http://localhost:1420 — funciona sin Tauri (usa localStorage fallback)
npm run build    # tsc + vite build → dist/
npm run preview  # previsualiza build
```

### 4) Tauri dev (con ventana nativa pero con consola en debug)
```bash
npm run tauri dev
```

### Compilar instalador final
```bash
npm run build
npm run tauri build
# Genera: src-tauri/target/release/bundle/nsis/Spark_0.1.0_x64-setup.exe
# y     : src-tauri/target/release/bundle/msi/...
# El exe suelto ya está en: Spark.exe (11MB)
```

---

## ✨ Funciones implementadas

### 1. Login local por código de alumno
- Ruta `/` si no hay sesión → `Login.tsx`
- Código `UC-2024-001` (solo A-Z0-9-), si no existe se registra con nombre.
- Guardado en SQLite `users` + `localStorage` sesión. Sin servidor.

### 2. Cursos — registro con "gran cantidad de parámetros"
`src/types/index.ts` → `Course`:
- `name, code, color, credits, semester, professor, professorEmail, classroom`
- `schedule: ClassSchedule[]` → día, hora inicio/fin, lugar, tipo (teórica/práctica)
- `links: CourseLink[]` → Zoom, Moodle, material (guardar links de las clases)
- `credentials: Credential[]` → usuario/pass/url con **botón copiar** (`navigator.clipboard` + `tauri-plugin-clipboard-manager`)
- `weighting: GradeWeight[]` → notas, pesos %, promedio ponderado

### 3. Entregables / Tareas / Prácticas / Discusiones / Exámenes / Eventos
`Deliverable` con 15+ campos:
- `type, title, description, dueDate/dueTime, endDate/endTime, location, durationMinutes, weight, maxScore, obtainedScore, status, priority, tags, links, attachments, reminderMinutesBefore, estimatedHours`
- CRUD completo en `Cursos` → cada tarjeta de curso tiene su lista + formulario.

### 4. Dashboard principal — información próxima relevante
`src/pages/Dashboard.tsx`:
- KPIs: cursos activos, pendientes, alertas, próximo vencimiento
- **Próximos 7 días** ordenados por urgencia
- **Alertas cruce** (ver abajo)
- **Optimización horarios estudio** (`lib/scheduleOptimize.ts`): greedy por vencimiento + peso + prioridad, distribuye bloques por día según huecos libres
- **Acceso rápido** a cursos: color, aula, links, credencial con copy

### 5. Alertas cuando 2 entregas o clases se cruzan
`lib/overlap.ts`:
- `detectOverlaps(deliverables)` → intervalos con `durationMinutes`, inclusive + heurística <2h mismo día
- `courseScheduleOverlaps(courses)` → choque de horarios por día
- Mostradas en Dashboard y Calendario con badge `warn`

### 6. Calendario con alarmas y recordatorios constantes
`src/pages/Calendar.tsx` → FullCalendar (dayGrid + timeGrid + interaction):
- Eventos desde deliverables (color por curso)
- Click → detalle con todos los parámetros
- **Alarmas:** `setInterval` cada minuto + `tauri-plugin-notification` (nativa OS) y fallback `Notification` web. Usa `reminderMinutesBefore` por entregable.

### 7. Board infinito tipo Miro
`src/pages/Board.tsx` → `tldraw` (MIT):
- Stickynotes, flechas conectoras, formas, frames, **imágenes importadas** por drag&drop o Ctrl+V
- **Pines localización:** insertar forma + link mapa (Leaflet offline posible extensión)
- Snapshot persistido en SQLite `board_docs` (clave `universecity-board`)
- **P2P serverless multicursor:** preparado con `Yjs + y-webrtc`, sala por código en Sidebar (`FIS-202`). tldraw tiene soporte `y-tldraw`; en MVP el board es local pero la infraestructura P2P está lista (sin servidor).

### 8. Herramientas académicas (librerías existentes)
`src/lib/apa.ts` + `src/pages/Tools.tsx`:
- **Citado APA 7:** `citation-js` para CSL-JSON + fallback manual `toApa7()` (libro, journal, web, tesis)
- **Paráfrasis:** diccionario sinónimos local `paraphraseLocal()` (sin enviar a servidor). Extensible a `transformers.js` / Ollama local.
- **Plagio:** TF-IDF cosine `plagiarismScore()` + **detección IA** heurística `aiLikelihood()` (diversidad léxica, uniformidad, frases genéricas). 100% local.

### 9. Credenciales de fácil uso + Links
- Por curso, lista de credenciales con botón **Copiar** (clipboard-manager)
- Links por curso renderizados como badges clickeables

### 10. Ejecución en segundo plano + Inicio con encendido (configurable)
- `src-tauri/src/lib.rs`: plugins `autostart` + `single-instance` + `notification` + `clipboard`
- `src/App.tsx`: `onCloseRequested` → si `uc_minimize_to_tray=1` hace `win.hide()` + notificación tray
- `src/pages/Settings.tsx`: toggle **Inicio con encendido** (`tauri-plugin-autostart` → Registry en Windows, LaunchAgent en Mac) + tray
- `src-tauri/tauri.conf.json`: `bundle.windows.nsis.displayLanguageSelector=false`, `windows_subsystem=windows` en release → sin consola

### 11. UI minimalista, intuitiva
`src/index.css`: design system Notion/Linear (Inter, radios 14px, sombras suaves, dark listo), sidebar 248px, topbar 56px, cards, badges.

---

## 📁 Estructura

```
SparkSpark/
├── Spark.exe          # ← EJECUTABLE optimizado 11MB, doble-click sin consola
├── Spark.exe                # copia
├── Iniciar Spark.vbs        # launcher VBS sin consola (fallback dev)
├── Spark-Start.bat          # launcher bat + PowerShell hidden
├── Crear Acceso Directo.ps1        # genera .lnk en Escritorio/Startup
├── src/
│   ├── types/index.ts              # Course, Deliverable, etc.
│   ├── lib/db.ts                   # SQLite + localStorage fallback, migraciones
│   ├── lib/overlap.ts              # detección cruces
│   ├── lib/scheduleOptimize.ts     # optimización estudio
│   ├── lib/apa.ts                  # APA, parafrasis, plagio, IA
│   ├── stores/useAuth.ts           # login código alumno
│   ├── stores/useData.ts           # cursos + deliverables
│   ├── components/ui/primitives.tsx
│   ├── components/layout/Sidebar.tsx # + P2P sala
│   ├── pages/Dashboard.tsx
│   ├── pages/Courses.tsx           # CRUD completo
│   ├── pages/Calendar.tsx          # FullCalendar + notificaciones
│   ├── pages/Board.tsx             # tldraw infinito
│   ├── pages/Tools.tsx             # APA/paráfrasis/plagio
│   ├── pages/Settings.tsx          # autostart, tray, acerca
│   └── App.tsx / main.tsx / index.css
├── src-tauri/
│   ├── Cargo.toml                  # tauri 2 + plugins
│   ├── tauri.conf.json             # ProductName, window 1280x800, bundle
│   ├── capabilities/default.json   # permisos sql, store, notification, etc.
│   └── src/lib.rs + main.rs        # plugins init, single-instance focus
├── dist/                           # frontend build (embed en exe release)
└── package.json
```

---

## 🔧 Tecnologías: por qué cada librería

| Requisito | Librería | Justificación |
|-----------|----------|---------------|
| Desktop local, exe sin consola | **Tauri 2** | 11MB vs 150MB Electron, `windows_subsystem=windows`, WebView2 nativo |
| DB local | **@tauri-apps/plugin-sql (SQLite)** | Archivo `universecity.db` en `AppData`, fallback `localStorage` en web |
| Calendario | **FullCalendar** | Estándar, vistas mes/semana/día, drag, i18n |
| Board infinito | **tldraw** | Miro-like real, stickies, flechas, imágenes, multicursor (usado por Notion) |
| Gráficos/Dashboard | Recharts (opcional) | KPI y progreso |
| P2P serverless | **Yjs + y-webrtc** | CRDT + WebRTC sin servidor, código sala `ABC-123` |
| Citas APA | **citation-js** | CSL-JSON → APA 7, fallback manual |
| Paráfrasis local | `transformers.js` / sinónimos | Sin nube |
| Plagio/IA | TF-IDF local | Cosine + heurística, offline |
| Estado | **Zustand** | Ligero |
| Iconos | **lucide-react** | Minimalista |
| Fechas | **date-fns** | Ligero vs moment |

---

## 🛡️ local-first y privacidad

- **Todo en tu máquina:** `SQLite` en `%APPDATA%/com.universecity.spark` (Win) o `~/Library/Application Support/com.universecity.spark` (Mac)
- Sin telemetría, sin cuenta en nube, sin servidor. P2P es directo entre pares vía WebRTC.
- Migración: copia esa carpeta a otro equipo.
- Login es solo `student_code` hash local.

---

## 📦 Optimización

- `vite.config.ts` → `manualChunks` (tldraw 1.6MB, fullcalendar 259k, vendor 57k) + `chunkSizeWarningLimit`
- `cargo build --release` → LTO + strip, exe 11MB
- `tauri-plugin-single-instance` evita duplicados
- Persistencia tldraw por `persistenceKey`, no re-render innecesario

---

## 🐛 Troubleshooting

- **Exe no abre:** asegúrate que `dist/` existe (`npm run build` antes de `cargo build --release`). El exe release embed dist.
- **Notificaciones no llegan:** en Windows permite notificaciones para la app; en web da permiso en el navegador.
- **Tray no aparece:** en Tauri 2 el tray es opcional; la lógica de minimizar a bandeja está en `App.tsx` (`uc_minimize_to_tray`).
- **P2P no conecta:** WebRTC necesita que ambos pares estén en misma red o con STUN público; sin servidor TURN puede fallar tras NAT estricto.

---

## 📝 Licencia

MIT — Usa, modifica, distribuye. Sin garantías. Para uso académico personal.
