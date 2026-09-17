// Vault cifrado AES-GCM + PBKDF2 - 100% local, admin sin acceso sin clave
// La clave se deriva de una contraseña maestra del Vault (distinta a la de admin)
// Solo el usuario que conoce su clave de Vault puede descifrar sus contraseñas

const VAULT_SALT_KEY = "uc_vault_salt";
const VAULT_TEST_KEY = "uc_vault_test"; // para verificar clave sin exponer datos

async function getSalt(): Promise<Uint8Array> {
  let saltB64 = localStorage.getItem(VAULT_SALT_KEY);
  if (!saltB64) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    saltB64 = btoa(String.fromCharCode(...salt));
    localStorage.setItem(VAULT_SALT_KEY, saltB64);
  }
  const bin = atob(saltB64);
  return Uint8Array.from(bin, c=> c.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(password);
  const baseKey = await crypto.subtle.importKey("raw", enc, "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name:"PBKDF2", salt, iterations: 100000, hash:"SHA-256" },
    baseKey,
    { name:"AES-GCM", length:256 },
    false,
    ["encrypt","decrypt"]
  );
}

export async function setVaultMaster(password: string): Promise<void> {
  if(password.length < 6) throw new Error("Mín 6 caracteres");
  const salt = await getSalt();
  const key = await deriveKey(password, salt);
  // test encrypt para verificar luego
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, new TextEncoder().encode("vault-test"));
  const combined = new Uint8Array(iv.length + enc.byteLength);
  combined.set(iv,0); combined.set(new Uint8Array(enc), iv.length);
  localStorage.setItem(VAULT_TEST_KEY, btoa(String.fromCharCode(...combined)));
  // guarda hash para saber que está configurado (no la clave)
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  localStorage.setItem("uc_vault_configured","1");
  localStorage.setItem("uc_vault_hash", Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join(""));
  // guarda clave en memoria de sesión (no en disco) via sessionStorage
  sessionStorage.setItem("uc_vault_unlocked","1");
  // también guarda la clave derivada temporalmente en memoria (no persistente) via closure variable
  (window as any).__vaultKey = key;
  (window as any).__vaultSalt = salt;
}

export async function unlockVault(password: string): Promise<boolean> {
  const salt = await getSalt();
  const key = await deriveKey(password, salt);
  const testB64 = localStorage.getItem(VAULT_TEST_KEY);
  if(!testB64) return false;
  try {
    const combined = Uint8Array.from(atob(testB64), c=> c.charCodeAt(0));
    const iv = combined.slice(0,12);
    const data = combined.slice(12);
    await crypto.subtle.decrypt({ name:"AES-GCM", iv }, key, data);
    (window as any).__vaultKey = key;
    (window as any).__vaultSalt = salt;
    sessionStorage.setItem("uc_vault_unlocked","1");
    return true;
  } catch { return false; }
}

export function isVaultUnlocked(): boolean {
  return !!(window as any).__vaultKey && sessionStorage.getItem("uc_vault_unlocked")==="1";
}
export function lockVault(){ (window as any).__vaultKey=null; sessionStorage.removeItem("uc_vault_unlocked"); }
export function isVaultConfigured(): boolean { return localStorage.getItem("uc_vault_configured")==="1"; }

export async function encryptField(plain: string): Promise<string> {
  const key = (window as any).__vaultKey as CryptoKey;
  if(!key) throw new Error("Vault bloqueado - desbloquea primero");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, new TextEncoder().encode(plain));
  const combined = new Uint8Array(iv.length + enc.byteLength);
  combined.set(iv,0); combined.set(new Uint8Array(enc), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptField(cipherB64: string): Promise<string> {
  const key = (window as any).__vaultKey as CryptoKey;
  if(!key) throw new Error("Vault bloqueado");
  const combined = Uint8Array.from(atob(cipherB64), c=> c.charCodeAt(0));
  const iv = combined.slice(0,12);
  const data = combined.slice(12);
  const dec = await crypto.subtle.decrypt({ name:"AES-GCM", iv }, key, data);
  return new TextDecoder().decode(dec);
}

// helpers para migrar datos antiguos plaintext -> cifrado
export function isEncrypted(s: string): boolean {
  try {
    const bin = atob(s);
    return bin.length > 20;
  } catch { return false; }
}
