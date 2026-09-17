// Spark KeyGen — UI privada para firmar claves (nunca se distribuye).
// La llave privada vive en TU disco: se carga del archivo junto al exe,
// de ../license-gen/ o la eliges a mano. Nada sale de esta ventana.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Mutex, OnceLock};

static KEY: OnceLock<Mutex<Option<[u8; 32]>>> = OnceLock::new();
static KEY_PATH: OnceLock<Mutex<Option<String>>> = OnceLock::new();

fn key() -> &'static Mutex<Option<[u8; 32]>> {
    KEY.get_or_init(|| Mutex::new(None))
}
fn key_path() -> &'static Mutex<Option<String>> {
    KEY_PATH.get_or_init(|| Mutex::new(None))
}

fn set_key(secret: [u8; 32], path: String) {
    *key().lock().unwrap() = Some(secret);
    *key_path().lock().unwrap() = Some(path);
}

#[derive(serde::Serialize)]
struct Status {
    has_key: bool,
    path: Option<String>,
    pubkey: Option<String>,
}

#[tauri::command]
fn lic_status() -> Status {
    let guard = key().lock().unwrap();
    match *guard {
        Some(s) => Status {
            has_key: true,
            path: key_path().lock().unwrap().clone(),
            pubkey: Some(license_gen::pubkey_hex(&s)),
        },
        None => Status { has_key: false, path: None, pubkey: None },
    }
}

#[tauri::command]
fn lic_load_default() -> Result<Status, String> {
    // 1) junto al exe  2) carpeta del proyecto (../license-gen/)
    let mut cands: Vec<std::path::PathBuf> = Vec::new();
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            cands.push(dir.join("license-privkey.bin"));
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        cands.push(cwd.join("license-privkey.bin"));
        cands.push(cwd.join("..").join("license-gen").join("license-privkey.bin"));
    }
    for p in cands {
        if let Ok(raw) = std::fs::read(&p) {
            if let Ok(secret) = license_gen::load_priv_bytes(&raw) {
                set_key(secret, p.to_string_lossy().into_owned());
                return Ok(lic_status());
            }
        }
    }
    Err("No se encontró license-privkey.bin (junto al exe o en ../license-gen/). Elígela a mano.".into())
}

#[tauri::command]
fn lic_load_bytes(raw: Vec<u8>, name: String) -> Result<Status, String> {
    let secret = license_gen::load_priv_bytes(&raw)?;
    set_key(secret, format!("{} (elegido a mano)", name));
    Ok(lic_status())
}

#[tauri::command]
fn lic_make(code: String, reseller: u16, days: u32) -> Result<MakeOut, String> {
    let secret = key().lock().unwrap().clone().ok_or("Sin llave privada cargada")?;
    let fp = license_gen::parse_fp(&code)?;
    let key = license_gen::make_key(&secret, &fp, reseller, days);
    Ok(MakeOut {
        key,
        expiry: if days == 0 { "nunca".into() } else { format!("en {} días", days) },
    })
}

#[derive(serde::Serialize)]
struct MakeOut {
    key: String,
    expiry: String,
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![lic_status, lic_load_default, lic_load_bytes, lic_pubkey_check, lic_make])
        .run(tauri::generate_context!())
        .expect("error while running keygen");
}

#[tauri::command]
fn lic_pubkey_check() -> Result<String, String> {
    let guard = key().lock().unwrap();
    match *guard {
        Some(s) => Ok(license_gen::pubkey_hex(&s)),
        None => Err("Sin llave privada cargada".into()),
    }
}
