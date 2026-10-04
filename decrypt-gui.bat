@echo off
title Rescue Vault - Offline Decryptor GUI
cd /d "%~dp0"

set "HTML_PATH=%~dp0public\decrypt.html"

:: 1. Microsoft Edge App Modu (Masaüstü Penceresi Olarak Açar)
set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE_PATH%" set "EDGE_PATH=C:\Program Files\Microsoft\Edge\Application\msedge.exe"

if exist "%EDGE_PATH%" (
    start "" "%EDGE_PATH%" --app="file:///%HTML_PATH:\=/%" --window-size=500,680
    exit /b 0
)

:: 2. Edge bulunamazsa varsayılan tarayıcıda aç
start "" "%HTML_PATH%"
exit /b 0
