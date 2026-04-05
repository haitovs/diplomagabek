@echo off
chcp 65001 >nul 2>&1
title HashCracker - WiFi Security Analysis Tool
color 0A

echo.
echo   ╔══════════════════════════════════════════╗
echo   ║      HashCracker — WiFi Security Tool    ║
echo   ║          Diploma Project                 ║
echo   ╚══════════════════════════════════════════╝
echo.

:: ── Check Node.js ──
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed.
    echo         Download from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo [OK] Node.js %%v

:: ── Install dependencies ──
if not exist "node_modules" (
    echo [*] Installing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
)
if not exist "server\node_modules" (
    echo [*] Installing backend dependencies...
    call npm --prefix server install
    if errorlevel 1 (
        echo [ERROR] server npm install failed
        pause
        exit /b 1
    )
)
echo [OK] Dependencies ready

:: ── Check tools ──
where hashcat >nul 2>&1
if errorlevel 1 (
    echo [!] hashcat not found — download from https://hashcat.net/hashcat/
) else (
    echo [OK] hashcat found
)

where hcxpcapngtool >nul 2>&1
if errorlevel 1 (
    echo [!] hcxpcapngtool not found — get from https://github.com/ZerBea/hcxtools
) else (
    echo [OK] hcxpcapngtool found
)

:: ── Wordlist ──
set "WORDLIST_PATH=%TEMP%\rockyou_sample.txt"
if not exist "%WORDLIST_PATH%" (
    echo [*] Downloading sample wordlist...
    powershell -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/10k-most-common.txt' -OutFile '%WORDLIST_PATH%' -UseBasicParsing } catch { Write-Host '[!] Download failed — dictionary attacks may not work' }" 2>nul
)
if exist "%WORDLIST_PATH%" echo [OK] Wordlist ready

set "WORDLIST_ROCKYOU_SAMPLE_PATH=%WORDLIST_PATH%"
set "WORDLIST_ROCKYOU_PATH=%WORDLIST_PATH%"

:: ── Build frontend if needed ──
if not exist "dist\index.html" (
    echo [*] Building frontend...
    call npx vite build
    if errorlevel 1 (
        echo [ERROR] Build failed
        pause
        exit /b 1
    )
)
echo [OK] Frontend built

echo.
echo ════════════════════════════════════════════════
echo   Open http://localhost:8080 in your browser
echo   Press Ctrl+C to stop the server
echo ════════════════════════════════════════════════
echo.

:: ── Open browser ──
start "" "http://localhost:8080"

:: ── Start server (serves API + frontend on one port) ──
node server\src\index.js
