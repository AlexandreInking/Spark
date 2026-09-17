// Fuente única de versionado: node scripts/bump-version.mjs 0.5.0
// Sincroniza package.json, src-tauri/tauri.conf.json, src-tauri/Cargo.toml y src/config.ts.
// La versión visible en Ajustes sale de Cargo.toml vía comando Rust get_app_version.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Uso: node scripts/bump-version.mjs <x.y.z>  (ej: 0.5.0)");
  process.exit(1);
}

function patch(path, fn, optional = false) {
  const full = join(root, path);
  let before;
  try {
    before = readFileSync(full, "utf8");
  } catch {
    if (optional) { console.log(`SKIP ${path} (no existe)`); return; }
    throw new Error(`Falta ${path}`);
  }
  const after = fn(before);
  if (after === before) throw new Error(`Sin cambios en ${path}, revisa el formato`);
  writeFileSync(full, after);
  console.log(`OK ${path}`);
}

// 1. package.json
patch("package.json", (s) => {
  const j = JSON.parse(s);
  j.version = version;
  return JSON.stringify(j, null, 2) + "\n";
});

// 2. src-tauri/tauri.conf.json
patch("src-tauri/tauri.conf.json", (s) => {
  const j = JSON.parse(s);
  j.version = version;
  return JSON.stringify(j, null, 2) + "\n";
});

// 3. src-tauri/Cargo.toml (solo la versión del paquete, primera ocurrencia tras [package])
patch("src-tauri/Cargo.toml", (s) =>
  s.replace(/^version = "\d+\.\d+\.\d+"/m, `version = "${version}"`)
);

// 4. src/config.ts (APP_VERSION) — eliminado en 1.4.0 con el Admin
patch("src/config.ts", (s) =>
  s.replace(/APP_VERSION = "\d+\.\d+\.\d+"/, `APP_VERSION = "${version}"`)
, true);

console.log(`Versión sincronizada: ${version}`);
