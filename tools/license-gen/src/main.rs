// Generador EXTERNO de claves (privado: nunca dentro de la app).
// Uso:
//   license-gen init [--seed "frase secreta"] [--out ruta]
//   license-gen pubkey [--key ruta]
//   license-gen make --code "UC1-...." --reseller 7 [--days 365] [--key ruta]
//   license-gen verify --code "UC1-...." --license "CLAVE..."
//
// La app solo VERIFICA (lleva la pública embebida). Quien tenga este binario + privkey,
// PUEDE firmar: guárdalo tú, no lo compartas con revendedores.

use license_gen::{default_key_path, load_priv_bytes, make_key, parse_fp, pubkey_hex, sha256};
use std::fs;
use std::path::PathBuf;

fn arg(args: &[String], name: &str) -> Option<String> {
    args.windows(2)
        .find(|w| w[0] == name)
        .map(|w| w[1].clone())
}

fn key_path(args: &[String]) -> PathBuf {
    arg(args, "--key").map(PathBuf::from).unwrap_or_else(default_key_path)
}

fn load_priv(path: &PathBuf) -> [u8; 32] {
    let raw = fs::read(path).unwrap_or_else(|_| panic!("No existe {:?}. Corre `init` primero.", path));
    load_priv_bytes(&raw).unwrap_or_else(|e| panic!("{}", e))
}

fn cmd_init(args: &[String]) {
    let out = key_path(args);
    if out.exists() {
        eprintln!("Ya existe {:?}. Bórralo a mano si quieres regenerar (¡invalida claves viejas si cambias de llave!).", out);
        std::process::exit(1);
    }
    let secret: [u8; 32] = match arg(args, "--seed") {
        Some(seed) => {
            // Derivación determinista doble-hash (recuperable con la frase; usa frase LARGA y única)
            let h1 = sha256(format!("uc-spark-license-v1|{seed}").as_bytes());
            let h2 = sha256(&h1);
            let mut secret = [0u8; 32];
            secret.copy_from_slice(&h2[..32]);
            secret
        }
        None => {
            let mut b = [0u8; 32];
            rand_core::RngCore::fill_bytes(&mut rand_core::OsRng, &mut b);
            b
        }
    };
    fs::write(&out, secret).expect("no se pudo guardar privkey");
    println!("OK privkey en {:?}", out);
    println!("PUBKEY (embebe este hex en src-tauri/src/license_pubkey.hex):");
    println!("{}", pubkey_hex(&secret));
    println!("¡Respalda {:?} + la frase (si usaste --seed) en 2 lugares! Sin esto no puedes firmar más claves.", out);
}

fn cmd_pubkey(args: &[String]) {
    let secret = load_priv(&key_path(args));
    println!("{}", pubkey_hex(&secret));
}

fn cmd_make(args: &[String]) {
    let code = arg(args, "--code").expect("falta --code \"UC1-...\"");
    let reseller: u16 = arg(args, "--reseller").expect("falta --reseller N").parse().expect("reseller numérico");
    let days: u32 = arg(args, "--days").map(|s| s.parse().expect("days numérico")).unwrap_or(0);
    let fp = parse_fp(&code).unwrap_or_else(|e| panic!("{}", e));
    let secret = load_priv(&key_path(args));
    let key = make_key(&secret, &fp, reseller, days);
    println!("CLAVE para revendedor #{} (expira: {}):", reseller, if days == 0 { "nunca".into() } else { format!("en {} días", days) });
    println!("{}", key);
}

fn cmd_verify(args: &[String]) {
    let code = arg(args, "--code").expect("falta --code");
    let license = arg(args, "--license").expect("falta --license");
    let fp = parse_fp(&code).unwrap_or_else(|e| panic!("{}", e));
    let clean: String = license.to_uppercase().chars().filter(|c| c.is_ascii_alphanumeric()).collect();
    let raw = data_encoding::BASE32_NOPAD.decode(clean.as_bytes()).expect("clave inválida");
    assert!(raw.len() == 83 && &raw[..2] == b"UC" && raw[2] == 1, "clave inválida");
    assert_eq!(&raw[9..19], fp.as_slice(), "la clave NO es de esta máquina");
    println!("OK: la clave corresponde a ese código de máquina (firma se verifica en la app).");
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let cmd = args.get(1).map(|s| s.as_str()).unwrap_or("");
    match cmd {
        "init" => cmd_init(&args),
        "pubkey" => cmd_pubkey(&args),
        "make" => cmd_make(&args),
        "verify" => cmd_verify(&args),
        _ => {
            eprintln!("Uso: license-gen init [--seed FRASE] | pubkey | make --code UC1-... --reseller N [--days N] | verify --code UC1-... --license CLAVE");
            std::process::exit(1);
        }
    }
}
