@echo off
REM Wrapper legacy (utiliser scripts\deploy-netlify.ps1)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy-netlify.ps1"
