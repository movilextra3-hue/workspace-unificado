@echo off
cd /d E:\workspace-unificado
testdisk_win /log /logname E:\workspace-unificado\testdisk_log.txt /cmd "\\.\PhysicalDrive3" partition_none,analyze,search > E:\workspace-unificado\testdisk_salida.txt 2>&1
echo Hecho > E:\workspace-unificado\testdisk_done.txt
