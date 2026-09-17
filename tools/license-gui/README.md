# Spark-KeyGen (PRIVADO — solo tú, no distribuir)

UI para firmar claves sin usar la consola.

## Uso

1. Doble clic a `Spark-KeyGen.exe` (busca solo tu `license-privkey.bin` junto al exe o en `../license-gen/`; si no, te deja elegirlo a mano).
2. Pega el **código de máquina** del comprador.
3. Pon **revendedor #** (uno por persona, para tus comisiones) y **días** (0 = permanente).
4. **Generar clave** → **📋 Copiar clave** (un clic) → envíasela al comprador.
5. El historial de la sesión permite re-copiar sin regenerar.

## Notas

- Sin tu `license-privkey.bin` este programa no puede firmar nada.
- Si cambias de llave (`init` de nuevo), las claves viejas mueren: avisa a tus compradores activos.
