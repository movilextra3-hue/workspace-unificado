@echo off
set OUTPUT=E:\workspace-unificado\diskpart_salida_completa.txt
diskpart /s E:\workspace-unificado\diskpart_diagnostico_completo.txt > "%OUTPUT%" 2>&1
type "%OUTPUT%"
