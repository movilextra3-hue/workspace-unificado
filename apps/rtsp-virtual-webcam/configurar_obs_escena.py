"""
Añade la fuente RTSP a la escena de OBS editando el JSON directamente.
Cierra OBS antes de ejecutar; luego abre OBS y tendrás la fuente en la escena.
"""
import json
import os
import uuid

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    RTSP_URL = json.load(f).get("rtsp_url", "rtsp://ubnt:ubnt@192.168.100.32:554/s0")

SCENE_FILE = os.path.join(os.environ.get("APPDATA", ""), "obs-studio", "basic", "scenes", "Sin_Título.json")
SOURCE_NAME = "Camara RTSP"

def main():
    if not os.path.isfile(SCENE_FILE):
        print("No se encontró la escena de OBS. Abre OBS una vez y cierra para crear la escena.")
        return
    with open(SCENE_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    sources = data.get("sources", [])
    scene_source = None
    for s in sources:
        if s.get("id") == "scene" and s.get("name") == "Escena":
            scene_source = s
            break
    if not scene_source:
        print("No se encontró la escena 'Escena'.")
        return
    # Quitar fuente anterior si existe
    sources = [s for s in sources if s.get("name") != SOURCE_NAME]
    items = list(scene_source.get("settings", {}).get("items", []))
    items = [i for i in items if i.get("name") != SOURCE_NAME]
    id_counter = scene_source["settings"].get("id_counter", 0) + 1
    new_uuid = str(uuid.uuid4())
    # Fuente ffmpeg (Media Source) para RTSP
    ffmpeg_source = {
        "prev_ver": 536870916,
        "name": SOURCE_NAME,
        "uuid": new_uuid,
        "id": "ffmpeg_source",
        "versioned_id": "ffmpeg_source",
        "settings": {
            "input": RTSP_URL,
            "input_format": "",
            "restart_on_activate": True,
            "close_when_inactive": False,
            "is_local_file": False,
        },
        "mixers": 255,
        "sync": 0,
        "flags": 0,
        "volume": 1.0,
        "balance": 0.5,
        "enabled": True,
        "muted": False,
        "push-to-mute": False,
        "push-to-mute-delay": 0,
        "push-to-talk": False,
        "push-to-talk-delay": 0,
        "hotkeys": {"libobs.mute": [], "libobs.unmute": [], "libobs.push-to-mute": [], "libobs.push-to-talk": []},
        "deinterlace_mode": 0,
        "deinterlace_field_order": 0,
        "monitoring_type": 0,
        "private_settings": {},
    }
    sources.append(ffmpeg_source)
    # Item en la escena (referencia a la fuente)
    scene_item = {
        "name": SOURCE_NAME,
        "id": id_counter,
        "pos": {"x": 0.0, "y": 0.0},
        "scale": {"x": 1.0, "y": 1.0},
        "rot": 0.0,
        "alignment": 5,
        "bounds_type": 0,
        "bounds_alignment": 0,
        "bounds": {"x": 0.0, "y": 0.0},
        "crop": {"left": 0, "top": 0, "right": 0, "bottom": 0},
        "visible": True,
        "locked": False,
    }
    items.append(scene_item)
    scene_source["settings"]["items"] = items
    scene_source["settings"]["id_counter"] = id_counter
    data["sources"] = sources
    with open(SCENE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print("OBS configurado: fuente '%s' añadida a la escena." % SOURCE_NAME)
    print("Abre OBS Studio y pulsa 'Iniciar transmision virtual' para usarla en videollamadas.")

if __name__ == "__main__":
    main()
