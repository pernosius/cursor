@echo off
rem Creates Desktop and Start menu shortcuts that open Print Counter in its own window.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
if errorlevel 1 pause
