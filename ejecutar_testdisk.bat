@echo off
cd /d "E:\workspace-unificado"
echo Buscando TestDisk...
where testdisk 2>nul
where photorec_win 2>nul
for /f "delims=" %%i in ('where testdisk 2^>nul') do set TDPATH=%%i
for /f "delims=" %%i in ('where photorec_win 2^>nul') do set TDPATH=%%~dpi
echo.
echo Ejecutando TestDisk analyze,search en PhysicalDrive3...
echo Device: \\.\PhysicalDrive3 (Disk 3 - ADATA HM900)
echo.
"C:\Program Files\TestDisk\testdisk_win.exe" /log /logname "E:\workspace-unificado\testdisk_log.txt" /cmd "\\.\PhysicalDrive3" analyze,search > "E:\workspace-unificado\testdisk_salida.txt" 2>&1
echo.
echo Salida guardada en testdisk_salida.txt
pause
