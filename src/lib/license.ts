// Licencias offline v1.2.0 — wrappers Tauri con fallback web (dev desbloqueado).
// La verificación real (ed25519) vive en Rust; aquí solo se invoca.

export interface TrialStatus { start: string; days_left: number; expired: boolean; }
export interface LicenseStatus { licensed: boolean; grandfather: boolean; reseller: number | null; expiry: string | null; }
export interface MachineCode { code: string; note: string; }

async function inv<T>(cmd: string, args?: any): Promise<T | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<T>(cmd, args);
  } catch {
    return null; // web/dev sin Tauri: sin bloqueo
  }
}

export const lic = {
  machineCode: () => inv<MachineCode>("cmd_machine_code"),
  trial: () => inv<TrialStatus>("cmd_trial_status"),
  status: () => inv<LicenseStatus>("cmd_license_status"),
  activate: async (key: string): Promise<{ ok: boolean; error?: string }> => {
    const r = await inv<{ ok: boolean; error?: string }>("cmd_activate", { key });
    return r || { ok: false, error: "Sin backend Tauri" };
  },
  claimGrandfather: async (): Promise<boolean> => {
    const r = await inv<boolean>("cmd_claim_grandfather");
    return r === true;
  },
};
