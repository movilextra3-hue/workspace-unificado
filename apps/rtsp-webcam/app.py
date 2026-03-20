"""
Visor web de cámara RTSP: vídeo en vivo (MJPEG) + audio en vivo (HLS).
Reconexión automática; transmisión continua.
"""
import os
import subprocess
import threading
import time

import cv2
from flask import Flask, Response, render_template_string, send_from_directory

_win_links = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "WinGet", "Links")
if os.path.isdir(_win_links):
    os.environ["PATH"] = _win_links + os.pathsep + os.environ.get("PATH", "")

RTSP_URL = "rtsp://ubnt:ubnt@192.168.100.32:554/s0"
WIDTH = 1280
HEIGHT = 720
FPS_TARGET = 30

app = Flask(__name__)
AUDIO_HLS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio_hls")
_audio_process = None


def _ffmpeg_available():
    import shutil
    return bool(shutil.which("ffmpeg"))

FFMPEG_AVAILABLE = _ffmpeg_available()


def ensure_audio_hls_dir():
    os.makedirs(AUDIO_HLS_DIR, exist_ok=True)


def run_audio_hls():
    """Genera HLS solo audio en segundo plano."""
    global _audio_process
    ensure_audio_hls_dir()
    playlist = os.path.join(AUDIO_HLS_DIR, "playlist.m3u8")
    seg = os.path.join(AUDIO_HLS_DIR, "a%03d.ts")
    cmd = [
        "ffmpeg", "-rtsp_transport", "tcp", "-i", RTSP_URL,
        "-vn", "-c:a", "aac", "-b:a", "192k", "-filter:a", "volume=2.0",
        "-f", "hls", "-hls_time", "2", "-hls_list_size", "3",
        "-hls_flags", "delete_segments+append_list",
        "-hls_segment_filename", seg, "-y", playlist,
    ]
    while True:
        try:
            _audio_process = subprocess.Popen(
                cmd, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            _audio_process.wait()
        except (FileNotFoundError, OSError):
            pass
        time.sleep(2)


if FFMPEG_AVAILABLE:
    ensure_audio_hls_dir()
    threading.Thread(target=run_audio_hls, daemon=True).start()
    for _ in range(15):
        if os.path.isfile(os.path.join(AUDIO_HLS_DIR, "playlist.m3u8")):
            break
        time.sleep(0.5)
AUDIO_HLS_READY = FFMPEG_AVAILABLE and os.path.isfile(os.path.join(AUDIO_HLS_DIR, "playlist.m3u8"))


# --- Vídeo MJPEG con reconexión infinita ---
def generate_frames():
    while True:
        cap = cv2.VideoCapture(RTSP_URL, cv2.CAP_FFMPEG)
        if not cap.isOpened():
            time.sleep(2)
            continue
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)
        cap.set(cv2.CAP_PROP_FPS, FPS_TARGET)
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                _, buf = cv2.imencode(".jpg", frame)
                yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n")
        finally:
            cap.release()
        time.sleep(1)


@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-store"},
    )


@app.route("/audio_hls/<path:filename>")
def audio_hls_files(filename):
    return send_from_directory(AUDIO_HLS_DIR, filename)


HTML_PAGE = """
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cámara RTSP</title>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.12"></script>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; min-height: 100vh; background: #1a1a2e; font-family: 'Segoe UI', system-ui, sans-serif; }
        .floating-btn {
            position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%;
            background: #2563eb; color: #fff; border: 3px solid #fff; box-shadow: 0 4px 24px rgba(0,0,0,0.5);
            cursor: pointer; z-index: 2147483647; display: flex; align-items: center; justify-content: center;
            font-size: 26px; transition: transform 0.2s, box-shadow 0.2s;
        }
        .floating-btn:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(37,99,235,0.7); }
        .floating-panel {
            position: fixed; width: 720px; max-width: 95vw; background: #16213e; border-radius: 12px;
            box-shadow: 0 12px 48px rgba(0,0,0,0.5); z-index: 2147483646; overflow: hidden;
            display: none; right: 24px; bottom: 88px;
        }
        .floating-panel.visible { display: block; }
        .floating-panel .head {
            padding: 8px 12px; background: #0f3460; color: #fff; cursor: move;
            display: flex; align-items: center; justify-content: space-between; user-select: none;
        }
        .floating-panel .head span { font-size: 14px; }
        .floating-panel .head .actions { display: flex; gap: 6px; }
        .floating-panel .head button {
            background: transparent; border: none; color: #fff; cursor: pointer;
            padding: 4px 8px; border-radius: 4px; font-size: 18px; line-height: 1;
        }
        .floating-panel .head button:hover { background: rgba(255,255,255,0.2); }
        .floating-panel .body { padding: 0; min-height: 360px; background: #0f0f1a; }
        .floating-panel img { display: block; width: 100%; height: auto; max-height: 80vh; object-fit: contain; background: #000; }
    </style>
</head>
<body>
    <button type="button" class="floating-btn" id="toggleBtn" title="Ver cámara">📷</button>
    <div class="floating-panel" id="panel">
        <div class="head" id="panelHead">
            <span>📷 En vivo</span>
            <div class="actions">
                <button type="button" id="closeBtn" title="Cerrar">−</button>
            </div>
        </div>
        <div class="body">
            <img id="mjpegImg" alt="En vivo" />
        </div>
        {% if audio_available %}
        <audio id="audioLive" autoplay playsinline></audio>
        {% endif %}
    </div>
    <script>
        (function() {
            var panel = document.getElementById('panel');
            var toggleBtn = document.getElementById('toggleBtn');
            var closeBtn = document.getElementById('closeBtn');
            var head = document.getElementById('panelHead');
            var img = document.getElementById('mjpegImg');
            var audioEl = document.getElementById('audioLive');
            var audioAvailable = {{ 'true' if audio_available else 'false' }};
            var audioHls = null;

            function startVideo() {
                img.onerror = function() {
                    setTimeout(function() { img.src = '/video_feed?r=' + Date.now(); }, 1500);
                };
                img.src = '/video_feed?r=' + Date.now();
            }

            function startAudio() {
                if (!audioAvailable || !audioEl) return;
                var src = '/audio_hls/playlist.m3u8';
                audioEl.muted = false;
                if (Hls.isSupported()) {
                    if (audioHls) { audioHls.destroy(); audioHls = null; }
                    audioHls = new Hls();
                    audioHls.loadSource(src);
                    audioHls.attachMedia(audioEl);
                    audioHls.on(Hls.Events.MANIFEST_PARSED, function() { audioEl.play().catch(function(){}); });
                } else if (audioEl.canPlayType('application/vnd.apple.mpegurl')) {
                    audioEl.src = src;
                    audioEl.play().catch(function(){});
                }
            }

            toggleBtn.addEventListener('click', function() {
                if (panel.classList.contains('visible')) {
                    panel.classList.remove('visible');
                    toggleBtn.title = 'Ver cámara';
                } else {
                    panel.classList.add('visible');
                    toggleBtn.title = 'Cerrar cámara';
                    startVideo();
                    startAudio();
                }
            });
            closeBtn.addEventListener('click', function() {
                panel.classList.remove('visible');
                toggleBtn.title = 'Ver cámara';
            });

            var dragging = false, dx = 0, dy = 0;
            head.addEventListener('mousedown', function(e) {
                if (e.target.tagName === 'BUTTON') return;
                dragging = true;
                dx = e.clientX - panel.getBoundingClientRect().left;
                dy = e.clientY - panel.getBoundingClientRect().top;
            });
            document.addEventListener('mousemove', function(e) {
                if (!dragging) return;
                panel.style.left = (e.clientX - dx) + 'px';
                panel.style.top = (e.clientY - dy) + 'px';
                panel.style.right = 'auto';
                panel.style.bottom = 'auto';
            });
            document.addEventListener('mouseup', function() { dragging = false; });
        })();
    </script>
</body>
</html>
"""


@app.route("/")
def index():
    return render_template_string(
        HTML_PAGE,
        audio_available=AUDIO_HLS_READY,
    )


if __name__ == "__main__":
    print("http://127.0.0.1:5000")
    print("RTSP:", RTSP_URL)
    print("Vídeo: MJPEG en vivo (reconexión automática)")
    print("Audio:", "HLS en vivo" if AUDIO_HLS_READY else "no (FFmpeg o sin audio en cámara)")
    app.run(host="0.0.0.0", port=5000, threaded=True)
