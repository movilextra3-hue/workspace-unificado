#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Descarga e instala herramientas para análisis de binarios (dtc500m, etc.).
Ejecutar: python scripts/install_binary_tools.py
"""

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

# Carpeta donde se instalan las herramientas externas
TOOLS_DIR = Path(__file__).resolve().parent.parent / "tools" / "binary"
TOOLS_DIR.mkdir(parents=True, exist_ok=True)

# Añadir Git/OpenSSL al PATH si existe (para openssl enc)
GIT_SSL = Path("C:/Program Files/Git/usr/bin")

# URLs de descarga (actualizar si cambian)
HASHCAT_URL = "https://hashcat.net/files/hashcat-7.1.2.7z"
JOHN_URL = "https://www.openwall.com/john/k/john-1.9.0-jumbo-1-win64.7z"
OPENSSL_WIN_URL = "https://slproweb.com/products/Win32OpenSSL.html"
CYBERCHEF_REPO = "https://github.com/gchq/CyberChef"


def run(cmd: list[str], cwd: str | Path | None = None) -> tuple[bool, str]:
    """Ejecuta comando, retorna (éxito, salida)."""
    try:
        r = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            cwd=cwd,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
        )
        out = (r.stdout or "") + (r.stderr or "")
        return r.returncode == 0, out.strip()
    except subprocess.TimeoutExpired:
        return False, "Timeout"
    except Exception as e:
        return False, str(e)


def pip_install() -> None:
    """Instala dependencias pip."""
    root = Path(__file__).resolve().parent.parent
    req = root / "requirements-binary-analysis.txt"
    if req.exists():
        ok, out = run([sys.executable, "-m", "pip", "install", "-r", str(req)])
    else:
        ok, out = run([sys.executable, "-m", "pip", "install", "pycryptodome", "binwalk", "py7zr", "crccheck"])
    if ok:
        print("  pip OK")
    else:
        print(f"  pip: {out[:120]}")


def check_openssl() -> bool:
    return bool(shutil.which("openssl"))


def download_file(url: str, dest: Path) -> bool:
    """Descarga archivo con urllib."""
    try:
        import urllib.request
        urllib.request.urlretrieve(url, dest)
        return dest.exists() and dest.stat().st_size > 0
    except Exception as e:
        print(f"  Error descarga {url}: {e}")
        return False


def main():
    print("=== Instalación herramientas análisis binario ===\n")

    # 1. Pip
    print("1. Pip (pycryptodome, binwalk, py7zr, crccheck)")
    pip_install()
    print()

    # 2. OpenSSL
    print("2. OpenSSL")
    if check_openssl():
        exe = shutil.which("openssl")
        print(f"  OK en PATH: {exe}")
    elif GIT_SSL.exists() and (GIT_SSL / "openssl.exe").exists():
        print(f"  OK en Git: {GIT_SSL / 'openssl.exe'}")
        print("  Añadir a PATH: $env:Path += ';C:\\Program Files\\Git\\usr\\bin'")
    else:
        print("  NO en PATH.")
        if platform.system() == "Windows":
            print(f"  Opciones: 1) Instalar Git for Windows (incluye openssl)")
            print(f"  2) Descargar: {OPENSSL_WIN_URL}")
        else:
            print("  Instalar: apt install openssl / brew install openssl")
    print()

    # 3. hashcat
    print("3. hashcat")
    hashcat_dir = TOOLS_DIR / "hashcat"
    hashcat_exe = hashcat_dir / "hashcat.exe" if platform.system() == "Windows" else hashcat_dir / "hashcat"
    if hashcat_exe.exists():
        print(f"  Ya instalado en {hashcat_dir}")
    else:
        arc = TOOLS_DIR / "hashcat.7z"
        print(f"  Descargando {HASHCAT_URL}...")
        if download_file(HASHCAT_URL, arc):
            extracted = False
            if shutil.which("7z"):
                ok, _ = run(["7z", "x", str(arc), f"-o{TOOLS_DIR}"])
                if ok:
                    extracted = True
            if not extracted:
                try:
                    import py7zr
                    with py7zr.SevenZipFile(arc, "r") as z:
                        z.extractall(TOOLS_DIR)
                    extracted = True
                except Exception:
                    pass
            if extracted:
                for d in TOOLS_DIR.iterdir():
                    if d.is_dir() and "hashcat" in d.name.lower() and d.name != "hashcat":
                        dest = TOOLS_DIR / "hashcat"
                        if dest.exists():
                            shutil.rmtree(dest)
                        d.rename(dest)
                        break
                print(f"  Extraído en {hashcat_dir}")
            else:
                print("  Extraer manual: 7z x hashcat.7z (winget install 7zip.7zip)")
            arc.unlink(missing_ok=True)
        else:
            print(f"  Descargar manual: {HASHCAT_URL}")
    print()

    # 4. John the Ripper
    print("4. John the Ripper")
    john_dir = TOOLS_DIR / "john-1.9.0-jumbo-1-win64"
    john_exe = john_dir / "run" / "john.exe" if platform.system() == "Windows" else john_dir / "run" / "john"
    if john_exe.exists():
        print(f"  Ya instalado en {john_dir}")
    elif (TOOLS_DIR / "john-1.9.0-jumbo-1-win64.7z").exists() and shutil.which("7z"):
        print("  Extrayendo john-1.9.0-jumbo-1-win64.7z...")
        ok, _ = run(["7z", "x", str(TOOLS_DIR / "john-1.9.0-jumbo-1-win64.7z"), f"-o{TOOLS_DIR}", "-y"])
        if ok:
            print(f"  Extraído en {john_dir}")
    else:
        print(f"  Descargando {JOHN_URL}...")
        if download_file(JOHN_URL, TOOLS_DIR / "john-1.9.0-jumbo-1-win64.7z"):
            if shutil.which("7z"):
                ok, _ = run(["7z", "x", str(TOOLS_DIR / "john-1.9.0-jumbo-1-win64.7z"), f"-o{TOOLS_DIR}", "-y"])
                if ok:
                    print(f"  Extraído en {john_dir}")
            else:
                print("  Descargado. Extraer con 7z x john-1.9.0-jumbo-1-win64.7z")
    print()

    # 5. CyberChef
    print("5. CyberChef")
    cyber_dir = TOOLS_DIR / "CyberChef"
    if (cyber_dir / "CyberChef.html").exists():
        print(f"  Ya existe en {cyber_dir}")
    else:
        print("  Web (sin instalación): https://gchq.github.io/CyberChef/")
        print(f"  Clone local: git clone {CYBERCHEF_REPO} {cyber_dir}")
    print()

    # 6. 7-Zip y binwalk
    print("6. 7-Zip (para hashcat)")
    if shutil.which("7z"):
        print(f"  OK: {shutil.which('7z')}")
    else:
        print("  Instalar: winget install 7zip.7zip")
    print("7. Binwalk (firmas en binarios)")
    if shutil.which("binwalk"):
        print(f"  OK: {shutil.which('binwalk')}")
    else:
        print("  Linux: apt install binwalk | Windows: descargar de ReFirmLabs/binwalk o usar WSL")
    print()

    print("=== Fin. Herramientas en:", TOOLS_DIR, "===")
    print("Verificar: python analyze_binary.py <archivo> --tools-check")


if __name__ == "__main__":
    main()
