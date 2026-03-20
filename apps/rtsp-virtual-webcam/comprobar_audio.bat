@echo off
echo Comprobando audio para videollamadas...
echo.
echo 1. VB-Cable: instalado (CABLE Input / CABLE Output en sonido de Windows)
echo 2. OBS: dispositivo de monitoreo = Altavoces (VB-Audio Virtual Cable)
echo 3. Fuente Camara RTSP: monitorear y salida (ya configurado)
echo.
echo En Zoom/Teams: Microfono = "CABLE Output (VB-Audio Virtual Cable)"
echo                Camara   = "OBS Virtual Camera"
echo.
echo Abriendo OBS...
cd /d "C:\Program Files\obs-studio\data\obs-studio"
start "" "C:\Program Files\obs-studio\bin\64bit\obs64.exe"
echo En OBS: Iniciar Camara Virtual. Si no se oye audio, Ajustes - Audio - Dispositivo de monitoreo = Altavoces (VB-Audio Virtual Cable)
pause
