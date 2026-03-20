"""
Configura OBS Studio: añade la fuente RTSP a la escena actual.
OBS debe estar abierto. Ejecutar una vez.
"""
import json
import os
import sys

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    cfg = json.load(f)
RTSP_URL = cfg.get("rtsp_url", "")
SOURCE_NAME = "Camara RTSP"

def main():
    try:
        import obsws_python as obs
    except ImportError:
        print("Instalando obsws-python...")
        os.system(f'"{sys.executable}" -m pip install -q obsws-python')
        import obsws_python as obs
    # OBS WebSocket: puerto 4455, sin contraseña por defecto
    try:
        cl = obs.ReqClient(host="127.0.0.1", port=4455, password="", timeout=8)
        scenes = cl.get_scene_list()
        scene_name = getattr(scenes, "current_program_scene_name", None) or (
            scenes.scenes[0]["sceneName"] if getattr(scenes, "scenes", None) else "Escena"
        )
        try:
            cl.remove_input(input_name=SOURCE_NAME)
        except Exception:
            pass
        cl.create_input(
            scene_name=scene_name,
            input_name=SOURCE_NAME,
            input_kind="ffmpeg_source",
            input_settings={"input": RTSP_URL, "is_local_file": False},
            scene_item_enabled=True,
        )
        print("OBS configurado: fuente '%s' añadida a la escena '%s'." % (SOURCE_NAME, scene_name))
        print("En OBS: Iniciar transmision virtual para usarla en videollamadas.")
    except Exception as e:
        print("Error:", e)
        print("Abre OBS Studio y vuelve a ejecutar este script.")
        sys.exit(1)

if __name__ == "__main__":
    main()
