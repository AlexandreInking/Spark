// Lógica compartida CLI + GUI (el secreto NUNCA sale de tu poder).
use std::path::PathBuf;

pub const EPOCH2020_DAYS: i64 = 18262;

pub fn b32(data: &[u8]) -> String {
    data_encoding::BASE32_NOPAD.encode(data)
}

pub fn sha256(data: &[u8]) -> Vec<u8> {
    use sha2::{Digest, Sha256};
    let mut h = Sha256::new();
    h.update(data);
    h.finalize().to_vec()
}

pub fn default_key_path() -> PathBuf {
    PathBuf::from("license-privkey.bin")
}

pub fn load_priv_bytes(raw: &[u8]) -> Result<[u8; 32], String> {
    if raw.len() != 32 {
        return Err("privkey inválida (deben ser 32 bytes)".into());
    }
    let mut out = [0u8; 32];
    out.copy_from_slice(raw);
    Ok(out)
}

pub fn pubkey_hex(secret: &[u8; 32]) -> String {
    let sk = ed25519_dalek::SigningKey::from_bytes(secret);
    data_encoding::HEXLOWER.encode(&sk.verifying_key().to_bytes())
}

pub fn parse_fp(code: &str) -> Result<Vec<u8>, String> {
    let clean: String = code.to_uppercase().chars().filter(|c| c.is_ascii_alphanumeric()).collect();
    let body = clean.strip_prefix("UC1").unwrap_or(&clean);
    if body.len() < 16 {
        return Err("código de máquina inválido".into());
    }
    let raw = data_encoding::BASE32_NOPAD
        .decode(body[..16].as_bytes())
        .map_err(|_| "código inválido".to_string())?;
    if raw.len() < 10 {
        return Err("código inválido".into());
    }
    Ok(raw[..10].to_vec())
}

pub fn days_today() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| (d.as_secs() / 86400) as i64)
        .unwrap_or(0)
}

/// Clave agrupada lista para enviar. days=0 → permanente.
pub fn make_key(secret: &[u8; 32], fp: &[u8], reseller: u16, days: u32) -> String {
    let expiry = if days == 0 {
        0u32
    } else {
        ((days_today() - EPOCH2020_DAYS) + days as i64).max(0) as u32
    };
    let mut payload = Vec::with_capacity(19);
    payload.extend_from_slice(b"UC");
    payload.push(1u8);
    payload.extend_from_slice(&reseller.to_le_bytes());
    payload.extend_from_slice(&expiry.to_le_bytes());
    payload.extend_from_slice(fp);
    let sk = ed25519_dalek::SigningKey::from_bytes(secret);
    use ed25519_dalek::Signer;
    let sig = sk.sign(&payload);
    let mut full = payload;
    full.extend_from_slice(&sig.to_bytes());
    let key = b32(&full);
    key.chars()
        .collect::<Vec<_>>()
        .chunks(5)
        .map(|c| c.iter().collect::<String>())
        .collect::<Vec<_>>()
        .join("-")
}
