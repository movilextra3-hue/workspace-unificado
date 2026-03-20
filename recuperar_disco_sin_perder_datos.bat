@echo off
echo ============================================
echo  Recuperar disco sin perder datos
echo ============================================
echo.
echo Este script intenta poner el disco offline en ONLINE.
echo NO se borra ningun dato.
echo.
echo Requiere permisos de Administrador.
echo.
pause

echo Listando discos...
diskpart /s "%~dp0diskpart_online_disk.txt"

echo.
echo ============================================
echo Si aparecio "disco en linea" o "online", el disco ya deberia estar visible.
echo Revisa "Este equipo" o "Administracion de discos".
echo ============================================
pause
