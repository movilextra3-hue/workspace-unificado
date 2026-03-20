# RTSP como cámara web (videollamadas)

Aplicación de escritorio que toma tu cámara IP (RTSP) y la expone como **cámara virtual** en el PC. Así puedes usarla en Zoom, Teams, Meet, Discord, etc. como si fuera una webcam.

## Requisito: OBS (dispositivo virtual)

En Windows, la cámara virtual es **OBS Virtual Camera**. Solo hace falta instalarla una vez:

1. Descarga e instala **OBS Studio**: https://obsproject.com/
2. No hace falta abrir OBS para usar la cámara virtual; esta app envía el vídeo directamente a OBS Virtual Camera.

## Instalación

1. **Python 3.8+** instalado en el PC.

2. En esta carpeta, crea el entorno e instala dependencias:

   ```
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Edita `config.json` si necesitas cambiar la URL RTSP, resolución o FPS.

## Uso

- **Con icono en bandeja** (recomendado):  
  `venv\Scripts\python main.py --tray`  
  Aparece un icono en la bandeja del sistema. Clic en "Iniciar cámara" para conectar la RTSP a la cámara virtual.

- **Solo consola**:  
  `venv\Scripts\python main.py`  
  Conecta al instante; Ctrl+C para salir.

Luego en tu app de videollamadas (Zoom, Teams, etc.) elige como cámara **"OBS Virtual Camera"**. Verás la imagen de tu cámara RTSP.

## Configuración (`config.json`)

- `rtsp_url`: dirección RTSP (con usuario/contraseña si aplica).
- `width` / `height`: resolución que se envía a la cámara virtual.
- `fps`: fotogramas por segundo.

## Inicio automático (opcional)

Puedes crear un acceso directo que ejecute:

`ruta\a\venv\Scripts\pythonw.exe ruta\a\main.py --tray`

y colocarlo en la carpeta de inicio de Windows para que la cámara virtual esté disponible al encender el PC.
