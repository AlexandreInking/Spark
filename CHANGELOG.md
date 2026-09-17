# Changelog — UniverseCity Spark

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Versionado con `npm run bump -- <x.y.z>` (sincroniza `package.json`, `tauri.conf.json`, `Cargo.toml` y `config.ts`).

## [1.7.2] - 2026-09-12
### Sparky: transporte por Rust + diagnóstico por capas
- Las peticiones van primero por Rust (plugin-http, inmune a rarezas del WebView) con caída al fetch normal.
- Botón Diagnosticar red: internet → servidor del proveedor (+key) → chat mínimo, diciendo exactamente dónde muere.

## [1.7.1] - 2026-09-12
### Sparky: diagnóstico real de fallos de red
- Los errores `Failed to fetch` ahora dicen la causa probable (sin internet, timeout, firewall/antivirus, VPN, proxy universitario) en vez de un mensaje genérico.
- Timeouts: 45s chat, 10s prueba de conexión (antes colgaba indefinido).
- Limpia keys pegadas con `Bearer ` o espacios.

## [1.7.0] - 2026-09-12
### Sparky: chatbot multi-proveedor con RAG interno
- Pestaña Sparky (`/sparky`): OpenAI, Anthropic, OpenRouter, Groq, Google y Ollama local (sin dependencias: fetch directo). Modelo escribible (sin IDs quemados), probar conexión, prompts rápidos, historial.
- RAG: detecta intención (horario, entregas, notas, dinero, trabajo, enfoque) y arma contexto acotado (~6k chars) con tus datos + system prompt corto en español.
- Claves solo en settings locales (incluidas en tu backup). Tests de builders/parsers/RAG sin red.
- Sin cambios en lógica existente.

## [1.6.0] - 2026-09-11
### Flashcards SM-2 + asistencia + horario PNG
- Flashcards (`/flashcards`): mazos por curso, estudio con Otra vez/Difícil/Bien/Fácil y algoritmo SM-2 real (intervalos 1→6→×ease, tope 1.3).
- Asistencia por curso: pasar lista por fecha (presente/tarde/falta, tardanza = ½), % con límite configurable (default 30%), insignias en riesgo/inhabilitado.
- Calendario: exportar semana a PNG con los colores de tu tema activo (clases + turnos).
- Tests SM-2/asistencia/horario. Sin cambios en lógica existente.

## [1.5.0] - 2026-09-11
### Sin P2P + notas portables
- Eliminado P2P por completo: panel de salas, `sync.ts`, sincronizaciones en stores y textos. Menos peso y cero confusión (`yjs`/`y-webrtc` desinstalados).
- Notas: importar `.md`/`.txt` (a borrador) y `.json` (con reasignación de IDs y duplicados renovados); exportar nota `.md`, cuaderno `.md` y todo en JSON; botón Compartir (copia formato WhatsApp).
- Tests de export/import. Sin cambios en lógica existente.

## [1.4.4] - 2026-09-10
### Activación en Ajustes
- Nueva sección Activación: ID de computadora visible/copiable en cualquier momento + estado (prueba/activo) + campo de clave. Al activar, recarga limpio: desaparece la cuenta atrás y queda permanente.

## [1.4.3] - 2026-09-10
### Elenco Sanrio completo (12 temas más)
- Sanrio: My Melody, Kuromi, Cinnamoroll, Pompompurin, Badtz-maru, Keroppi, Gudetama.
- Aggretsuko: Fenneko, Haida, Washimi, Gori, Ton (más la Retsuko existente).
- Cada uno con paleta de identidad y fondos únicos (28 bgs distintos verificados por test).

## [1.4.2] - 2026-09-10
### Temas Reactiva + Sanrio
- Reactiva ✨: analiza tu imagen (cuantización local, sin nube), extrae los colores más usados y los aplica por contraste WCAG; preview de 5 colores antes de aplicar.
- Sanrio/Hello Kitty (lazo rojo, blanco, nariz amarilla, overol azul) y Sanrio/Aggretsuko (óxido/crema/rojo metal, oscuro).

## [1.4.1] - 2026-09-10
### Terminología: local-only → local-first en toda la UI y docs.

## [1.4.0] - 2026-09-10
### Backup total, Dashboard próximo, fin del Admin, personalización++
- Backup/autoguardado total: papelera + preferencias locales (temas, fx, pesos, checklist, notificaciones, crypto del vault, historial…) + `custom_bg`/`ambience_audio`. Test round-trip ampliado.
- Dashboard: sección Hoy + timeline Lo próximo (14 días: entregas, pagos, cobros, bonos, cierres).
- Admin eliminado por completo (código, tests, ruta, login, ajustes): una sola versión. Tablas SQLite de admin no existían (todo era settings/LS), nada que migrar.
- Personalización: audio de fondo en bucle (8MB, volumen), sonidos de clic sintetizados (3), colores de fondo/tarjetas/acento, 4 fuentes, clic Espiral/Fuegos, estelas Cometa/Destellos.
- Sin cambios en lógica existente salvo lo pedido.

## [1.3.1] - 2026-09-10
### Rebrand a Spark + limpieza de menciones
- La app se llama “Spark” en todas partes visibles (sidebar, login, onboarding, licencia, reportes, ajustes, tray, ventana, instaladores).
- Fuera menciones a Notion/Obsidian/Evernote/Trello/Miro en la UI.
- Intencionalmente intacto (invisible y cambiarlo borraría datos): identificador `com.universecity.spark`, `universecity.db`, claves de persistencia. Historial del CHANGELOG conserva nombres pasados.

## [1.3.0] - 2026-09-10
### Añadido — Trello completo, Notas, Dashboard sin huecos, responsive
- Proyectos: arrastrar tarjetas y columnas (API nativa + botones de respaldo), columnas movibles, WIP con alerta, asignados (contactos + libres), automatizaciones (auto-done, auto-avance, vencidas al frente), “mover a”, vencimiento ≤3d.
- Notas (`/notas`): cuadernos, subpáginas, etiquetas, fijadas, búsqueda global, `[[enlaces]]` con backlinks, preview Markdown seguro, export .md, vínculo a curso.
- Dashboard: tarjeta Trabajo nunca vacía (propuestas/CTA), tarjeta Enfoque hoy, grilla sin huecos, KPIs que envuelven, salud con valores.
- Responsive: nav móvil horizontal <760px, subtítulo Topbar oculto en angosto. Backup cubre proyectos y notas.
- Sin dependencias nuevas, sin cambios en lógica existente.

## [1.2.2] - 2026-09-10
### Quitado + unificado
- Eliminada la pestaña Ranking (ruta, nav y página). El panel Admin conserva su vista local (solo dueño).
- Mínimas unificado como sección dentro de Analítica (misma lógica, sin duplicar). Ruta `/minimas` y nav retirados.
- Sin cambios en lógica existente.

## [1.2.1] - 2026-09-07
### Seguridad licencias: el usuario no puede autogenerarse códigos
- Verificado: generador y privada fuera de la app (`resources: []`, dist sin firma, pública embebida).
- Marca grandfather atada a la máquina (hash verificado al leer): copiar el archivo a otra PC no activa nada.
- Sin cambios visibles ni de lógica.

## [1.2.0] - 2026-09-07
### Añadido — Licencias por máquina, Proyectos Trello + Gantt, badges Experimental
- Licencias offline ed25519: 7 días gratis que NO se reinician al reinstalar (ratchet en 3 tiendas), código de máquina con solo hashes (IP/GUID nunca expuestos), clave atada a la PC con revendedor firmado. Instalaciones existentes quedan activas (grandfather).
- Generador externo `tools/license-gen` (init/make/verify) + README; privada fuera de la app.
- Proyectos (`/proyectos`): tableros estilo Trello (columnas, tarjetas, etiquetas, fechas, checklist, avance, búsqueda, auto-done, mover ◀ ▶) + Gantt (`/gantt`, SVG/divs, vencidas en rojo).
- Badges Experimental en sala P2P, paráfrasis IA y plagio/IA.
- Verificado E2E: firma válida pasa; otra PC, manipulada y vencida se rechazan (test temporal eliminado tras pasar).

## [1.1.1] - 2026-09-07
### Apariencia corregida: paletas con identidad + estaciones + fx variados
- Paletas reescritas con identidad real (Christmas rojo/blanco/verde, etc.; antes clones de claro/oscuro) + 4 estaciones: Primavera, Verano, Otoño, Invierno.
- Fuera el zoom (rompía layout): tamaño de letra S/M/L/XL en rem, se adapta sin descolocar. Botones/calendario ahora sí siguen al tema (colores fijos unificados a variables).
- Fx: clic en Explosión/Anillos/Confeti, estela en Puntos/Estrellas/Burbujas, color elegible o Auto.

## [1.1.0] - 2026-09-07
### Añadido — Temas de apariencia + build Estudiante
- Apariencia real: dropdown con Claro, Oscuro, Golden Hour, Sunset, Cyberpunk, Halloween, Coquette, Biopunk, Christmas, New Year y Custom (imagen de fondo máx 2.5MB, tamaño interfaz, color de letras, explosión al clic, estela del mouse). Se aplica al arrancar.
- Variante Estudiante (`VITE_ADMIN_ENABLED=false`): cero superficie visible de Admin (sin ruta, botón de login, link, sección de ajustes ni menciones). Tests `themes.test.ts`. Sin cambios en lógica existente.

## [1.0.0] - 2026-09-07
### Estable: onboarding + instalador único + alcance congelado
- Onboarding de primer arranque (solo si la DB no tiene usuarios): perfil local → primer curso → primer trabajo opcional, todo omitible salvo el perfil. Instalaciones existentes no lo ven.
- Instalador único en raíz (`Instalar UniverseCity Spark.exe`) además del portable.
- Alcance congelado: a partir de aquí solo parches Z (fixes) salvo decisión explícita.

## [0.9.2] - 2026-09-06
### Blindaje + vulnerabilidades
- Backup completo: ahora cubre contactos, CV (6 tablas), portafolio, empleos, transacciones, deudas y sesiones (antes solo 6 secciones). `verifyBackup()` valida sin escribir; test round-trip export→wipe→import restaura todo; backups viejos siguen importando.
- Papelera completa: empleos, movimientos, deudas y sesiones (restaurar + definitivo + vaciado total).
- XSS local: escape en toast, citas APA, export CV/Reporte y CSV anti-fórmulas (`'=...`); links de usuario solo http/https (`javascript:`/`data:` ya no son clicables). SQL 100% parametrizado (verificado).
- Auditoría npm: 0 altas/críticas; 30 moderadas en `@tiptap/*` vía tldraw cuyo fix exige major breaking → no se aplica (riesgo local mínimo: solo edita tu propio texto).
- Sin cambios en lógica existente.

## [0.9.1] - 2026-09-06
### Añadido — Formularios dinámicos en Empleo y Finanzas
- Empleo: el formulario se adapta al tipo (gig → periodo por evento, sin atajo multi-día ni bonos, “Fecha del evento”; fijo → mensual con bonos; práctica → hint de convenio). Misma ficha, sin migración; lo oculto se conserva.
- Finanzas: gasto con categoría deudas puede vincularse a una deuda pendiente (descuenta del saldo). Tests `jobForm.test.ts`. Sin cambios en lógica existente.

## [0.9.0] - 2026-09-06
### Añadido — Portafolio dinámico por tipo
- Cada categoría pide sus campos: software → repo (requerido) + demo + stack; marketing → rol + métricas (sin GitHub); foto/modelaje → galería/agencia; datos/IA → dataset + demo; etc.
- Vista en tarjeta + export de texto incluyen los campos. Migración SQLite (`extra_json`) + tests de schemas. Sin cambios en lógica existente.

## [0.8.1] - 2026-09-06
### Cambiado — scroll invisible, regla 14 días, optimización y peso
- Scroll de la columna derecha invisible (modales y cuadros conservan el suyo).
- Curso activo = no archivado + (recién registrado o con clase/entrega en 14 días). Aplica en Dashboard y filtro Activos; en Todos se marca “pausado 14d+”. Compatibilidad de Empleo sigue contra registrados no archivados (no pierde avisos de cursos futuros).
- Arranque más rápido: Board (tldraw) y Calendario (fullcalendar) con carga diferida.
- Peso: eliminado `src-tauri/target/debug` (~8GB sin uso; solo usas release). `target/release` se conserva para builds rápidos.
- Tests `activeCourses.test.ts` (8 casos). Sin cambios en lógica existente salvo la definición de “activo” pedida.

## [0.8.0] - 2026-09-06
### Añadido — Enfoque: timer por métodos + sidebar con scroll + P2P saneado
- Nueva sección Enfoque (`/enfoque`): presets Pomodoro 25/5, Ritmo 52/17 y Ultradian 90/20; curso/tema opcional; checklist pre-sesión (3 toques); timer con pausa/reinicio; pausas activas sugeridas desde banco local; modo enfoque a pantalla completa con contador de distracciones; racha Kaizen de días; historial del día (completas/parciales).
- Sesiones en tabla `study_sessions` (migración incluida, fallback cubierto).
- Sidebar: zona de opciones + P2P con scroll invisible y separador; datos del alumno y cerrar sesión fijos abajo.
- P2P: señalizadores muertos de Heroku eliminados (queda `signaling.yjs.dev` vigente).
- Tests `focus.test.ts` (8 casos). Sin cambios en lógica existente.

## [0.7.1] - 2026-09-06
### Añadido — Gráficos de salud económica + tracking de deudas
- Finanzas: gráfico de 6 meses (ingresos vs gastos + balance) y gasto del mes por categoría, todo con divs puros (cero dependencias).
- Deudas: registro (acreedor, total, vencimiento) con barra de progreso; “Registrar pago” crea el gasto vinculado y descuenta del saldo (derivado, sin estado manual que se desincronice).
- Dashboard: mini tarjeta de salud (serie de balances + total de deudas pendientes).
- Tests de series, categorías y progreso de deudas (incluye corrección: pagos futuros no cuentan como pagados). Sin cambios en lógica existente.

## [0.7.0] - 2026-09-06
### Añadido — Finanzas: gastos vs ingresos
- Nueva sección Finanzas (`/finanzas`): registro manual con categorías, montos y recurrencia (único/semanal/quincenal/mensual), navegador por mes, tarjetas de ingresos/gastos/balance.
- Proyectado aprox: ingresos estimados de trabajos contratados + bonos con fecha + pagos pendientes con monto (separado de lo confirmado).
- Dashboard: KPI “Balance del mes”. Tests `finance.test.ts` (8 casos). Sin cambios en lógica existente.

## [0.6.4] - 2026-09-06
### Cambiado — Material del curso: solo enlaces con tipo
- Se retira la subida directa de archivos (evita fichas pesadas, cuotas y cuelgues). Todo el material es enlace (Drive/Mega/YouTube) con selector de tipo: documento, video, audio, diapositivas, imagen u otro, con icono en ficha y tarjeta.
- Compatibilidad: adjuntos directos guardados en 0.6.3 se siguen descargando igual.

## [0.6.3] - 2026-09-06
### Añadido — Dashboard con trabajo, material por curso y calendario 24h
- Dashboard: KPIs “Trabajos vigentes” y “Próximo cobro” + tarjeta resumen de contratados y cobros (sueldos y bonos). Solo lectura: el detalle sigue en Empleo.
- Material por curso: subir archivos (hasta 10MB, quedan dentro de la ficha) o enlaces (Drive/YouTube). Vive en el curso y sobrevive al archivado; descarga directa desde la tarjeta.
- Calendario 24h (antes 06:00–23:00): cubre turnos de madrugada/noche.
- Migración SQLite (`attachments_json`) + round-trip de adjuntos en tests. Sin cambios en lógica existente.

## [0.6.2] - 2026-09-06
### Añadido — Empleo: horario multi-día y bonos mensuales
- Atajo “mismo horario a varios días”: eliges días Lun–Dom + inicio/fin y se crean los slots (no toca días que ya tienen horario; lo variable por día se edita uno por uno).
- Bonos mensuales por trabajo: mes, monto, concepto (rendimiento/asistencia/otro) y fecha de cobro opcional. Con fecha aparecen en Próximos cobros y en Calendario (💰 morado); no entran al puntaje del comparador (solo sueldo base).
- Migración SQLite (`bonuses_json`) + tests de `buildSlotsForDays`/`upcomingDatedBonuses`. Sin cambios en lógica existente.

## [0.6.1] - 2026-09-06
### Añadido — Empleo: historial laboral, calendario, cobros y CV manual
- Contratación en la propuesta: fecha inicio/fin, fecha y recurrencia de cobro (único/semanal/quincenal/mensual), monto, mostrar en calendario. Con fecha de inicio pasa a “Mis trabajos” (se viene / vigente / pasado).
- Trabajos contratados aparecen en Calendario: turnos semanales (💼) entre inicio y fin + fechas de cobro (💰) con recurrencia, con hover y detalle.
- Próximos cobros en Empleo + alarmas explícitas de cobro/inicio (recordatorios tipo “otro” sin monto: no contaminan las sumas de Pagos en Dashboard).
- Importación MANUAL al CV como experiencia (botón por trabajo + desmarcar; nunca automática).
- Migración SQLite para instalaciones 0.6.0 + tests de `isHired/jobPhase/nextPayDates`. Sin cambios en lógica existente.

## [0.6.0] - 2026-09-06
### Añadido — Empleo: propuestas y comparador
- Nueva sección Empleo (`/empleo`): registro de propuestas (empresa, puesto, tipo fijo/parcial/gig/práctica, modalidad, horario, sueldo, cierre, estado, link, contacto, crecimiento 1-5, notas).
- Comparador ponderado transparente con pesos editables (sueldo, compatibilidad horaria, modalidad, crecimiento; se guardan en local).
- Compatibilidad horaria calculada contra cursos activos con el motor de cruces existente; sueldo estimado mensual comparable (hora × horas × 4.33, mes directo, evento puntual).
- Ranking ordenado por puntaje con desglose por criterio y detalle de choques por día/curso.
- Tests `jobScore.test.ts` (8 casos). Sin cambios en lógica existente: solo adiciones (tipos, tabla `job_offers`, página, ruta, nav).

## [0.5.0] - 2026-09-06
### Higiene de release (sin cambios de lógica en la app)
- Añadido: script único de versionado `scripts/bump-version.mjs` (`npm run bump -- 0.6.0`, etc.).
- Añadido: este CHANGELOG.
- Orden: instaladores y ejecutables 0.3.x archivados en `releases/v0.3.x/`; raíz con un solo ejecutable canónico.
- La versión visible en Ajustes sale de `Cargo.toml` vía `get_app_version` (única fuente en runtime).

## [0.4.1] - 2026-09-06 (parche)
### Corregido
- Cursos: en modo web/fallback (`localStorage`) solo se mostraban nombre/código/profesor y el resto se perdía al editar. `listCourses` y demás lecturas ya no truncan el objeto guardado.
- Cursos: al editar se preserva el `status` (antes se forzaba a `activo`).
- Cursos: errores de guardado ahora se muestran con alerta y log en vez de fallar en silencio.
- Mínimas: contraste del texto "Objetivo: … pts" sobre la caja clara (antes gris sobre pastel, ilegible).
- Migración SQLite: cubre todas las columnas de curso (incluidas `*_json`) para DBs de versiones 0.3.x.
### Añadido
- Tests de regresión `db.fallback.test.ts`: crear/editar curso persiste todos los campos.
