// Licencias offline v1.2.0 — ed25519, atadas a máquina, trial 7 días multicapa.
// - Código de máquina: hash estable (MachineGuid+usuario) + segmento de red (hash IPs, informativo).
//   La IP cruda y el GUID JAMÁS se muestran ni salen del equipo.
// - Trial: fecha mínima entre SQLite-no (3 tiendas): app_data/trial.dat, ~/.universecity_trial, HKCU.
//   Reinstalar no lo reinicia (ratchet). Solo un wipe total + reinstall lo renovaría.
// - Licencia: clave firmada (privada solo en generador externo). App solo VERIFICA (pública embebida).
// - Grandfather: instalaciones con datos previos a 1.2.0 se marcan una vez vía claim (JS solo lo pide si hay datos).

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

pub const TRIAL_DAYS: i64 = 7;
const EPOCH2020_DAYS: i64 = 18262; // días Unix del 2020-01-01

// Accesores crate-only para tests E2E (la firma real solo vive en el generador externo).
pub(crate) const EPOCH2020_PUB: i64 = EPOCH2020_DAYS;
pub(crate) fn stable_fp_pub() -> Vec<u8> { stable_fp() }
pub(crate) fn parse_fp_pub(code: &str) -> Option<Vec<u8>> { parse_fp(code) }
pub(crate) fn check_key_pub(key: &str, fp: &[u8]) -> LicenseCheck { check_key(key, fp) }

// ---------- tiempo sin chrono ----------

fn unix_days() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| (d.as_secs() / 86400) as i64)
        .unwrap_or(0)
}

fn civil_from_days(z: i64) -> (i32, u32, u32) {
    let z = z + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u32;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (if m <= 2 { y + 1 } else { y } as i32, m, d)
}

fn days_from_iso(s: &str) -> Option<i64> {
    let p: Vec<&str> = s.trim().split('-').collect();
    if p.len() != 3 { return None; }
    let (y, m, d): (i64, i64, i64) = (p[0].parse().ok()?, p[1].parse().ok()?, p[2].parse().ok()?);
    if !(1..=12).contains(&m) || !(1..=31).contains(&d) { return None; }
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = (y - era * 400) as u64;
    let mp = ((m + 9) % 12) as u64;
    let doy = (153 * mp + 2) / 5 + d as u64 - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    Some(era * 146097 + doe as i64 - 719468)
}

fn today_iso() -> String {
    let (y, m, d) = civil_from_days(unix_days());
    format!("{y:04}-{m:02}-{d:02}")
}

fn iso_from_days(z: i64) -> String {
    let (y, m, d) = civil_from_days(z);
    format!("{y:04}-{m:02}-{d:02}")
}

// ---------- huella de máquina ----------

fn sha256_hex(data: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let mut h = Sha256::new();
    h.update(data);
    data_encoding::HEXLOWER.encode(&h.finalize())
}

fn stable_id() -> String {
    let guid = machine_uid::get()
        .map(|s| s.to_string())
        .unwrap_or_else(|_| "sin-guid".to_string());
    let user = std::env::var("USERNAME")
        .or_else(|_| std::env::var("USER"))
        .unwrap_or_default();
    format!("{guid}|{user}|uc-spark-v1")
}

/// Primeros 10 bytes del hash estable = a lo que se ata la licencia.
fn stable_fp() -> Vec<u8> {
    use sha2::{Digest, Sha256};
    let mut h = Sha256::new();
    h.update(stable_id().as_bytes());
    h.finalize()[..10].to_vec()
}

fn b32(data: &[u8]) -> String {
    data_encoding::BASE32_NOPAD.encode(data)
}

/// Hash de IPs locales (nunca se expone la IP): solo segmento informativo del código.
fn net_segment() -> String {
    let mut ips: Vec<String> = if_addrs::get_if_addrs()
        .unwrap_or_default()
        .into_iter()
        .map(|i| i.addr.ip())
        .filter(|ip| !ip.is_loopback())
        .map(|ip| ip.to_string())
        .collect();
    ips.sort();
    let h = sha256_hex(ips.join(",").as_bytes());
    let raw = hex_to_bytes(&h[..8]);
    b32(&raw)
}

fn hex_to_bytes(s: &str) -> Vec<u8> {
    data_encoding::HEXLOWER.decode(s.as_bytes()).unwrap_or_default()
}

#[derive(Serialize)]
pub struct MachineCode {
    pub code: String,
    pub note: String,
}

#[tauri::command]
pub fn cmd_machine_code() -> MachineCode {
    let fp = stable_fp();
    let code = format!("UC1-{}-{}", b32(&fp), net_segment());
    MachineCode {
        code,
        note: "Contiene solo hashes (GUID+usuario+red). Tu IP y GUID nunca se muestran ni salen del equipo.".into(),
    }
}

/// Extrae el fingerprint estable desde un código de máquina pegado.
fn parse_fp(code: &str) -> Option<Vec<u8>> {
    let clean: String = code.to_uppercase().chars().filter(|c| c.is_ascii_alphanumeric()).collect();
    let body = clean.strip_prefix("UC1").unwrap_or(&clean);
    if body.len() < 16 { return None; }
    let raw = data_encoding::BASE32_NOPAD.decode(body[..16].as_bytes()).ok()?;
    if raw.len() < 10 { return None; }
    Some(raw[..10].to_vec())
}

// ---------- trial multicapa (ratchet) ----------

fn app_data_dir(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok()
}

fn read_date_file(p: &PathBuf) -> Option<String> {
    let s = fs::read_to_string(p).ok()?;
    let d = s.trim().get(..10)?.to_string();
    days_from_iso(&d).map(|_| d)
}

fn write_date_file(p: &PathBuf, date: &str) {
    if let Some(parent) = p.parent() { let _ = fs::create_dir_all(parent); }
    let _ = fs::write(p, date);
}

#[cfg(target_os = "windows")]
fn reg_read() -> Option<String> {
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};
    RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey("Software\\UniverseCitySpark")
        .ok()?
        .get_value::<String, _>("TrialStart")
        .ok()
        .and_then(|s| days_from_iso(&s).map(|_| s.trim()[..10].to_string()))
}

#[cfg(target_os = "windows")]
fn reg_write(date: &str) {
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};
    if let Ok((key, _)) = RegKey::predef(HKEY_CURRENT_USER).create_subkey("Software\\UniverseCitySpark") {
        let _ = key.set_value("TrialStart", &date.to_string());
    }
}

#[cfg(not(target_os = "windows"))]
fn reg_read() -> Option<String> { None }
#[cfg(not(target_os = "windows"))]
fn reg_write(_date: &str) {}

/// Fecha de inicio del trial = mínima válida entre las 3 tiendas (las faltantes se siembran con hoy).
fn trial_start(app: &AppHandle) -> String {
    let today = today_iso();
    let mut dates: Vec<String> = Vec::new();
    let mut missing_file1 = true;
    let mut missing_file2 = true;

    if let Some(dir) = app_data_dir(app) {
        let p = dir.join("trial.dat");
        match read_date_file(&p) {
            Some(d) => { dates.push(d); missing_file1 = false; }
            None => write_date_file(&p, &today),
        }
    }
    if let Some(home) = dirs::home_dir() {
        let p = home.join(".universecity_trial");
        match read_date_file(&p) {
            Some(d) => { dates.push(d); missing_file2 = false; }
            None => write_date_file(&p, &today),
        }
    }
    match reg_read() {
        Some(d) => dates.push(d),
        None => reg_write(&today),
    }
    dates.push(today.clone());
    let _ = (missing_file1, missing_file2);
    dates.into_iter().min().unwrap_or(today)
}

#[derive(Serialize)]
pub struct TrialStatus {
    pub start: String,
    pub days_left: i64,
    pub expired: bool,
}

#[tauri::command]
pub fn cmd_trial_status(app: AppHandle) -> TrialStatus {
    let start = trial_start(&app);
    let elapsed = unix_days() - days_from_iso(&start).unwrap_or(unix_days());
    let days_left = TRIAL_DAYS - elapsed;
    TrialStatus { start, days_left, expired: days_left < 0 }
}

// ---------- licencias firmadas ----------

#[derive(Serialize, Deserialize)]
struct LicenseFile {
    key: Option<String>,
    grandfather: Option<bool>,
    /// Huella atada a la máquina (hex SHA256 del id estable): una marca copiada de otra PC no vale.
    fp: Option<String>,
    date: Option<String>,
}

/// Huella hexadecimal del id estable (nunca el GUID/IP en claro).
fn stable_fp_hex() -> String {
    sha256_hex(stable_id().as_bytes())
}

fn license_path(app: &AppHandle) -> Option<PathBuf> {
    app_data_dir(app).map(|d| d.join("license.dat"))
}

fn read_license(app: &AppHandle) -> Option<LicenseFile> {
    let p = license_path(app)?;
    let s = fs::read_to_string(p).ok()?;
    serde_json::from_str(&s).ok()
}

fn pubkey() -> [u8; 32] {
    let hex = include_str!("license_pubkey.hex");
    let raw = data_encoding::HEXLOWER
        .decode(hex.trim().as_bytes())
        .unwrap_or_default();
    let mut out = [0u8; 32];
    if raw.len() == 32 { out.copy_from_slice(&raw); }
    out
}

#[derive(Serialize)]
pub struct LicenseCheck {
    pub ok: bool,
    pub reseller: Option<u16>,
    pub expiry: Option<String>,
    pub error: Option<String>,
}

fn check_key(key: &str, current_fp: &[u8]) -> LicenseCheck {
    let bad = |e: &str| LicenseCheck { ok: false, reseller: None, expiry: None, error: Some(e.into()) };
    let clean: String = key.to_uppercase().chars().filter(|c| c.is_ascii_alphanumeric()).collect();
    let raw = match data_encoding::BASE32_NOPAD.decode(clean.as_bytes()) {
        Ok(r) => r,
        Err(_) => return bad("Formato inválido"),
    };
    if raw.len() != 83 || raw[0] != b'U' || raw[1] != b'C' || raw[2] != 1 {
        return bad("Clave inválida");
    }
    let (payload, sig) = raw.split_at(19);
    let reseller = u16::from_le_bytes([payload[3], payload[4]]);
    let expiry_days = u32::from_le_bytes([payload[5], payload[6], payload[7], payload[8]]);
    let fp = &payload[9..19];
    if fp != current_fp {
        return bad("Esta clave es de otra PC (código de máquina distinto)");
    }
    let vk = match ed25519_dalek::VerifyingKey::from_bytes(&pubkey()) {
        Ok(k) => k,
        Err(_) => return bad("Error interno de verificación"),
    };
    let mut arr = [0u8; 64];
    arr.copy_from_slice(sig); // sig siempre mide 64: raw.len()==83 verificado arriba
    let sig = ed25519_dalek::Signature::from_bytes(&arr);
    use ed25519_dalek::Verifier;
    if vk.verify_strict(payload, &sig).is_err() {
        return bad("Firma inválida (clave alterada o falsa)");
    }
    if expiry_days == 0 {
        return LicenseCheck { ok: true, reseller: Some(reseller), expiry: None, error: None };
    }
    let exp_unix = EPOCH2020_DAYS + expiry_days as i64;
    if unix_days() > exp_unix {
        return bad("Clave vencida");
    }
    LicenseCheck { ok: true, reseller: Some(reseller), expiry: Some(iso_from_days(exp_unix)), error: None }
}

#[derive(Serialize)]
pub struct LicenseStatus {
    pub licensed: bool,
    pub grandfather: bool,
    pub reseller: Option<u16>,
    pub expiry: Option<String>,
}

#[tauri::command]
pub fn cmd_license_status(app: AppHandle) -> LicenseStatus {
    let off = LicenseStatus { licensed: false, grandfather: false, reseller: None, expiry: None };
    let lic = match read_license(&app) {
        Some(l) => l,
        None => return off,
    };
    if lic.grandfather == Some(true) {
        // la marca solo vale en la máquina que la generó
        if lic.fp.as_deref() == Some(stable_fp_hex().as_str()) {
            return LicenseStatus { licensed: true, grandfather: true, reseller: None, expiry: None };
        }
        return off;
    }
    match lic.key {
        Some(k) => {
            let c = check_key(&k, &stable_fp());
            if c.ok {
                LicenseStatus { licensed: true, grandfather: false, reseller: c.reseller, expiry: c.expiry }
            } else { off }
        }
        None => off,
    }
}

#[derive(Serialize)]
pub struct ActivateResult {
    pub ok: bool,
    pub error: Option<String>,
}

#[tauri::command]
pub fn cmd_activate(app: AppHandle, key: String) -> ActivateResult {
    let c = check_key(&key, &stable_fp());
    if !c.ok {
        return ActivateResult { ok: false, error: c.error };
    }
    let clean: String = key.to_uppercase().chars().filter(|c| c.is_ascii_alphanumeric()).collect();
    if let Some(p) = license_path(&app) {
        if let Some(parent) = p.parent() { let _ = fs::create_dir_all(parent); }
        let doc = LicenseFile { key: Some(clean), grandfather: None, fp: None, date: Some(today_iso()) };
        if serde_json::to_string(&doc).map(|s| fs::write(&p, s).is_ok()).unwrap_or(false) {
            return ActivateResult { ok: true, error: None };
        }
    }
    ActivateResult { ok: false, error: Some("No se pudo guardar la licencia".into()) }
}

/// Marca instalaciones con datos previos a 1.2.0 (el JS solo lo pide si ya hay usuarios/cursos).
/// Atada a la máquina: copiar el archivo a otra PC no activa nada.
#[tauri::command]
pub fn cmd_claim_grandfather(app: AppHandle) -> bool {
    if read_license(&app).is_some() { return false; }
    if let Some(p) = license_path(&app) {
        if let Some(parent) = p.parent() { let _ = fs::create_dir_all(parent); }
        let doc = LicenseFile { key: None, grandfather: Some(true), fp: Some(stable_fp_hex()), date: Some(today_iso()) };
        return serde_json::to_string(&doc).map(|s| fs::write(&p, s).is_ok()).unwrap_or(false);
    }
    false
}
