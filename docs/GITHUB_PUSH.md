# Push a GitHub (movilextra3-hue/workspace-unificado)

GitHub **no acepta contraseña** para `git push`; solo **Personal Access Token (PAT)**.

## Pasos

1. **Crear un PAT:**  
   [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)  
   → "Generate new token (classic)", marcar al menos **repo**, generar y **copiar el token** (solo se muestra una vez).

2. **En la terminal del proyecto:**
   ```powershell
   cd e:\workspace-unificado\blockchain\trc20-token
   .\scripts\push-a-github.ps1
   ```
   Cuando pida **Password**, pega el **PAT** (no la contraseña de la cuenta) y Enter.

3. **No guardes el PAT** en ningún archivo del proyecto. Si quieres que Git lo recuerde en esta PC, el Gestor de credenciales de Windows lo guardará al introducirlo una vez.

## Seguridad

- Si en algún momento compartiste tu contraseña de GitHub por chat o la pusiste en un archivo, **cámbiala ya** en [GitHub → Settings → Password and authentication](https://github.com/settings/security).
- Nunca subas `.env` ni archivos con contraseñas o tokens a Git. Ver [SECURITY.md](../SECURITY.md).
