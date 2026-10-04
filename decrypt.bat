@echo off
chcp 65001 >nul
title Rescue Vault - Dosya Deşifreleyici

:: Scriptin bulunduğu dizine git
cd /d "%~dp0"

:: Node.js kontrolü
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] Node.js sisteminizde kurulu bulunamadi.
    echo Lutfen https://nodejs.org adresinden Node.js kurun.
    pause
    exit /b 1
)

:: Deşifreleme aracını çalıştır
node "scripts\decrypt-tool.js" %*

echo.
pause
