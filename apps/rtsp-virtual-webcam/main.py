"""
Cámara virtual: toma la señal RTSP y la expone como webcam para videollamadas.
Requiere OBS instalado (OBS Virtual Camera). Se ejecuta en bandeja del sistema.
"""
import importlib.util
import json
import os
import sys
import threading
import time

import cv2

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
_win_links = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "WinGet", "Links")
if os.path.isdir(_win_links):
    os.environ["PATH"] = _win_links + os.pathsep + os.environ.get("PATH", "")


def load_config():
    p = CONFIG_PATH
    if os.path.isfile(p):
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"rtsp_url": "rtsp://user:pass@192.168.1.1:554/stream", "width": 1280, "height": 720, "fps": 30}


def save_config(cfg):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)


_config = load_config()
RTSP_URL = _config.get("rtsp_url", "rtsp://ubnt:ubnt@192.168.100.32:554/s0")
WIDTH = int(_config.get("width", 1280))
HEIGHT = int(_config.get("height", 720))
FPS = int(_config.get("fps", 30))

_running = True
_status = "Parado"


def run_camera():
    global _status
    if not importlib.util.find_spec("pyvirtualcam"):
        _status = "Falta: pip install pyvirtualcam"
        return
    import pyvirtualcam
    cap = None
    cam = None
    while _running:
        try:
            if cap is None or not cap.isOpened():
                _status = "Conectando RTSP..."
                cap = cv2.VideoCapture(RTSP_URL, cv2.CAP_FFMPEG)
                if not cap.isOpened():
                    _status = "Error RTSP"
                    time.sleep(3)
                    continue
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)
                cap.set(cv2.CAP_PROP_FPS, FPS)
            if cam is None:
                _status = "Iniciando cámara virtual..."
                cam = pyvirtualcam.Camera(width=WIDTH, height=HEIGHT, fps=FPS)
                _status = "En vivo: " + str(cam.device)
            ret, frame = cap.read()
            if not ret:
                cap.release()
                cap = None
                continue
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            cam.send(frame_rgb)
            cam.sleep_until_next_frame()
        except Exception as e:
            _status = "Error: " + str(e)[:40]
            if cap:
                try:
                    cap.release()
                except Exception:
                    pass
                cap = None
            if cam:
                try:
                    cam.close()
                except Exception:
                    pass
                cam = None
            time.sleep(2)
    if cap:
        try:
            cap.release()
        except Exception:
            pass
    if cam:
        try:
            cam.close()
        except Exception:
            pass
    _status = "Parado"


def main_tray():
    global _running, _status
    try:
        import pystray
        from PIL import Image
    except ImportError:
        print("Instala: pip install pystray Pillow")
        return
    icon_image = Image.new("RGB", (64, 64), color=(37, 99, 235))
    stream_thread = [None]

    def start_stream(icon_item=None):
        if stream_thread[0] and stream_thread[0].is_alive():
            return
        global _running
        _running = True
        stream_thread[0] = threading.Thread(target=run_camera, daemon=True)
        stream_thread[0].start()

    def stop_stream(icon_item=None):
        global _running
        _running = False

    def quit_app(icon_item=None):
        global _running
        _running = False
        icon.stop()

    menu = pystray.Menu(
        pystray.MenuItem("Iniciar cámara", start_stream, default=True),
        pystray.MenuItem("Parar cámara", stop_stream),
        pystray.MenuItem("Estado: " + _status, lambda: None, enabled=False),
        pystray.MenuItem("Salir", quit_app),
    )
    icon = pystray.Icon("rtsp_webcam", icon_image, "RTSP Cámara virtual", menu=menu)
    start_stream()
    icon.run()


def main_console():
    global _running
    print("Cámara virtual RTSP")
    print("URL:", RTSP_URL)
    print("Resolución:", WIDTH, "x", HEIGHT, FPS, "FPS")
    print("Conectando... (Ctrl+C para salir)")
    if not importlib.util.find_spec("pyvirtualcam"):
        print("Ejecuta: pip install pyvirtualcam opencv-python")
        return
    _running = True
    t = threading.Thread(target=run_camera, daemon=True)
    t.start()
    try:
        while t.is_alive():
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    _running = False
    time.sleep(1)
    print("Cerrado.")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--tray":
        main_tray()
    else:
        main_console()
