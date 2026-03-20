@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0iniciar.ps1"
pause
