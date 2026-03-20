@echo off
cd /d "%~dp0"
title RTSP Cámara virtual

if not exist "venv\Scripts\python.exe" (
    echo Creando entorno virtual...
    python -m venv venv
    if errorlevel 1 (
        echo Necesitas Python instalado. Descarga: https://www.python.org/
        pause
        exit /b 1
    )
)

echo Instalando dependencias...
call venv\Scripts\activate.bat
pip install -q -r requirements.txt

echo.
echo Abriendo OBS (no inicies la app de bandeja: usa solo OBS para evitar conflicto).
call "%~dp0iniciar_obs.bat"
pause
