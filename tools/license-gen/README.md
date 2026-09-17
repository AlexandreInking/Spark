# Generador de claves (PRIVADO — solo tú)

La app verifica firmas ed25519 offline. Este binario FIRMA (tiene la llave privada).

## Primera vez (una sola vez)

```powershell
cd tools\license-gen
cargo build --release
.\target\release\license-gen.exe init
```

- Genera `license-privkey.bin` + imprime la **PUBKEY**.
- Pega ese hex en `src-tauri/src/license_pubkey.hex` y recompila la app.
- **Respalda `license-privkey.bin` en 2 lugares (USB + nube). Sin él no puedes firmar más claves.**
- Con `--seed "frase larga única"` la llave deriva de la frase (recuperable). Sin `--seed` es aleatoria.

## Vender

```powershell
# el comprador te pasa su código de máquina (lo ve en la app) + pago vía revendedor #7
.\target\release\license-gen.exe make --code "UC1-XXXX-..." --reseller 7
# perpetual. Con vencimiento: agrega --days 365
```

Entrega la clave agrupada al comprador. El comprador la pega en la app.

## Reglas

- La privada **NUNCA** sale de tu poder (no la subas, no la pases a revendedores).
- Revendedores: dales solo un ID numérico (`--reseller`). La clave lo lleva firmado.
- Si la privada se filtra: genera otra (`init` de nuevo), actualiza la pública en la app y re-emite claves.
