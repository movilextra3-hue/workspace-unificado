# Cámara web desde RTSP

Usa tu cámara IP (RTSP) como **visor en el navegador** o como **cámara virtual** en aplicaciones (Zoom, Teams, etc.).

## Datos de tu cámara

- **URL:** `rtsp://ubnt:ubnt@192.168.100.32:554/s0` (usuario/contraseña: ubnt)
- **Resolución:** 1280×720
- **Bitrate:** 2800 kbps
- **FPS:** 30

---

## Opción 1: Ver el stream en el navegador

### Inicio automático (recomendado)

1. **Doble clic** en `iniciar.bat`  
   **o** en PowerShell: `.\iniciar.ps1`

2. El script crea el entorno virtual (si no existe), instala dependencias, abre el navegador y arranca el servidor.

3. Verás la cámara en **http://127.0.0.1:5000**. Para cerrar, cierra la ventana del script.

### Manual

- **Requisitos:** Python 3.8+, FFmpeg (recomendado para RTSP).
- Crear venv: `python -m venv venv` → `venv\Scripts\activate`
- Instalar: `pip install -r requirements.txt`
- Ejecutar: `python app.py` → abrir **http://127.0.0.1:5000**

Para ver desde otro dispositivo en la red: **http://&lt;IP-de-tu-PC&gt;:5000**

---

## Opción 2: Usar la cámara RTSP como webcam en Zoom/Teams/Discord

Para que otras aplicaciones (reuniones, streaming) usen tu cámara IP como si fuera una webcam:

### Con OBS Studio (recomendado en Windows)

1. **Instalar OBS Studio**  
   https://obsproject.com/

2. **Instalar el complemento “Virtual Camera”**  
   En OBS 28+ suele venir incluido; si no, está en Herramientas → Complementos o en la instalación de OBS.

3. **Añadir la fuente RTSP:**
   - En OBS: **Fuentes** → **+** → **Fuente de medios** (Media Source).
   - Desmarca **"Archivo local"** y en el campo de texto pega: `rtsp://ubnt:ubnt@192.168.100.32:554/s0`
   - Acepta. Si ves imagen, ya está.
   - Si OBS muestra pantalla negra (algunas cámaras dan problemas con Media Source), usa la alternativa: **Fuentes** → **+** → **Navegador**, y pon `http://127.0.0.1:5000` (con `python app.py` en marcha).

4. **Activar cámara virtual:**
   - En OBS: **Iniciar transmisión virtual** (o “Start Virtual Camera”).
   - En Zoom/Teams: en configuración de vídeo, elige **OBS Virtual Camera** como cámara.

### Con FFmpeg + OBS (flujo alternativo)

Puedes capturar el RTSP con FFmpeg y enviarlo a OBS como fuente (por ejemplo, salida a una ventana o a un dispositivo virtual), pero en Windows lo más sencillo es usar OBS con el visor web como fuente, como arriba.

---

## Cambiar la URL RTSP o la resolución

Edita las variables al inicio de `app.py`:

```python
RTSP_URL = "rtsp://192.168.100.32:554/s0"
WIDTH = 1280
HEIGHT = 720
FPS_TARGET = 30
```

Después reinicia `python app.py`.

---

## Solución de problemas

- **No se ve imagen:** Comprueba que la IP y el puerto (554) sean correctos y que la cámara esté en la misma red. Prueba la URL en VLC: Medios → Abrir ubicación de red → `rtsp://192.168.100.32:554/s0`.
- **Retardo o cortes:** En redes lentas o con mucho uso, baja `FPS_TARGET` en `app.py` (por ejemplo a 15) o la resolución.
- **Error con OpenCV/RTSP:** Asegúrate de tener FFmpeg en el PATH; OpenCV usa FFmpeg para abrir streams RTSP.
