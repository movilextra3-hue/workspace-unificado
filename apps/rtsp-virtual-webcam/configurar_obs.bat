@echo off
cd /d "%~dp0"
title Configurar OBS
echo Cierra OBS si esta abierto. Configurando escena...
"venv\Scripts\python.exe" configurar_obs_escena.py
echo.
pause
