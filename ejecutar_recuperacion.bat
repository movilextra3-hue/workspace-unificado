@echo off
:: Ejecutar como Administrador (clic derecho - Ejecutar como administrador)
cd /d "%~dp0"

echo ============================================
echo  RECUPERAR DISCO - Sin perder datos
echo ============================================
echo.
echo Paso 1: Diagnostico - que discos ve diskpart?
echo.
diskpart /s diskpart_diagnostico.txt > diskpart_resultado.txt 2>&1
type diskpart_resultado.txt
echo.
echo Paso 2: Politica SAN, rescan y poner disco online...
echo.
diskpart /s diskpart_recuperar_completo.txt
echo.
echo ============================================
echo Listo. Revisa "Este equipo" o "Administracion de discos"
echo para ver si tu disco ya aparece.
echo ============================================
pause
