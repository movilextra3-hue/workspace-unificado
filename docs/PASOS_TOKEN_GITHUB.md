# Pasos para crear el token de GitHub (con lo que ves en el navegador)

Así entiendes qué es cada pantalla.

---

## Paso 1: Confirmar identidad (lo que ves ahora)

**Pantalla:** "Confirm access" / "Signed in as @movilextra3-hue"

- GitHub pide que demuestres que eres tú antes de crear un token.
- Hay un **cuadro de texto** (placeholder XXXXXXXX) y un botón **Verify**.

**Qué hacer tú:**

1. Revisa el correo que usas en GitHub (el que termina en **@gmail.com**).
2. Abre el correo que te mandó **GitHub** con el asunto tipo "Verification code" o "Confirmación".
3. **Copia el código** de 6 u 8 números/dígitos.
4. En la ventana del navegador: **pega ese código** en el cuadro y pulsa **Verify**.

---

## Paso 2: Crear el token (después de Verify)

**Pantalla:** "New personal access token"

- **Note:** un nombre para recordar (ej. "Push desde Cursor").
- **Expiration:** cuánto dura (30 días, 90 días, etc.).
- **Scopes:** casillas de permisos. Marca **repo** (acceso a tus repositorios).

**Qué hacer tú:**

- Rellena el nombre si quieres.
- Elige expiración (por ejemplo 90 días).
- Marca la casilla **repo**.
- Baja y pulsa **Generate token** (o "Generate new token").

---

## Paso 3: Copiar el token (solo se muestra una vez)

**Pantalla:** Te muestra una **cadena de letras y números** (empieza por `ghp_` o similar).

- **Cópialo ya** y guárdalo en un lugar seguro (bloc de notas, gestor de contraseñas).
- No lo compartas por chat ni lo subas a ningún archivo del proyecto.

---

## Paso 4: Usar el token para el push

1. Abre la **terminal** en Cursor (en la carpeta del token).
2. Ejecuta: `.\scripts\push-a-github.ps1`
3. Cuando pida **Password**, **pega el token** (no tu contraseña de GitHub) y Enter.

Con eso se sube tu código a GitHub y la URL del logo para Tronscan quedará lista.
