# Comprobación del disco, respaldo y protección

## 1. Comprobación del disco (realizada)

### Estado de las unidades
| Unidad | Uso (GB) | Libre (GB) | Total (GB) | Estado |
|--------|----------|------------|------------|--------|
| C:     | 633,35   | 319,67     | 953,01     | Healthy |
| D:     | 1550,57  | 312,44     | 1863,02    | Healthy |
| E:     | 50,44    | 1811,74    | 1862,18    | Healthy |

### Discos físicos
- **XPG GAMMIX S5** (Device 0): Healthy, OK — ~954 GB
- **KINGSTON SNV2S2000G** (Device 1 y 2): Healthy, OK — ~1863 GB c/u

**Conclusión:** Todos los volúmenes reportan *HealthStatus: Healthy*. No se detectaron fallos en la comprobación.

---

## 2. Respaldo (backup)

### Respaldo rápido del proyecto trc20-token
Desde PowerShell, en la carpeta del proyecto:

```powershell
cd E:\Cursor-Workspace\trc20-token
.\scripts\respaldar-proyecto.ps1
```

El respaldo se crea en `E:\Backup\trc20-token_YYYYMMDD_HHmm` (sin `node_modules` ni `build`; **sí incluye .env**).

Para guardar en otra unidad (por ejemplo D:):

```powershell
.\scripts\respaldar-proyecto.ps1 -Destino "D:\Backups"
```

### Respaldo completo del disco / datos importantes
- **Windows:** Configuración → Actualización y seguridad → Copia de seguridad → Usar "Copia de seguridad de Windows" o "Historial de archivos" y elegir unidad externa o red.
- **Recomendado:** Copiar a un disco externo o otra PC:
  - Carpetas de usuario (Documentos, Escritorio, etc.)
  - `E:\Cursor-Workspace` (proyectos)
  - `E:\Cursor-Data` si quieres respaldar datos de Cursor (puede ser grande; evita subir este respaldo a la nube sin cifrar).
- **No incluir en respaldos públicos/nube:** archivos `.env`, claves privadas, contraseñas, la carpeta **`archivos_delicados/`** (conjunto de .env del equipo). Si respaldas en la nube, usa cifrado (por ejemplo 7-Zip con contraseña o OneDrive/Vault cifrado).

---

## 3. Protección

### Ya aplicado en el proyecto
- `.env` está en `.gitignore` (no se sube a Git).
- Claves y `PRIVATE_KEY` solo en `.env`, no en el código.

### Recomendaciones generales
1. **Copia en otro dispositivo:** Mantén al menos un respaldo en disco externo o en otra máquina.
2. **BitLocker (Windows):** Si tienes edición Pro/Enterprise, activar BitLocker en las unidades (sobre todo portátil) protege los datos si pierdes el equipo.
3. **Antivirus:** Tener Windows Defender (o tu antivirus) activo y actualizado.
4. **Actualizaciones:** Mantener Windows y el software actualizados.
5. **Claves y .env:** No compartas `.env` ni pegues `PRIVATE_KEY` en chats, correos o repos públicos. El script de respaldo incluye `.env` en una carpeta local; guarda esa carpeta en un lugar seguro y no la subas a internet.

---

## 4. Comprobaciones que puedes ejecutar tú

- **Comprobar disco (solo lectura):**  
  `Get-Volume | Format-Table DriveLetter, HealthStatus, SizeRemaining -AutoSize`

- **Comprobar disco y reparar (requiere reinicio si hay errores):**  
  Abrir CMD o PowerShell como administrador:  
  `chkdsk E: /F`  
  (sustituye E: por la unidad que quieras; /F repara errores).

- **Ver estado SMART de los discos:**  
  Herramientas como CrystalDiskInfo o el diagnóstico del fabricante (Kingston, ADATA, etc.).

---

*Documento generado como guía. Ajusta destinos de respaldo y políticas a tu situación.*
