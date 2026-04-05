@echo off
chcp 65001 >nul 2>&1
title HashCracker — WiFi Security Analysis Tool
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
        echo [ERROR] Failed to install frontend dependencies
        pause
        exit /b 1
    )
)
if not exist "server\node_modules" (
    echo [*] Installing backend dependencies...
    call npm --prefix server install
    if errorlevel 1 (
        echo [ERROR] Failed to install backend dependencies
        pause
        exit /b 1
    )
)
echo [OK] Dependencies installed

:: ── Check hashcat ──
where hashcat >nul 2>&1
if errorlevel 1 (
    echo [!] hashcat not found. Download from https://hashcat.net/hashcat/
    echo     Extract and add the folder to your PATH.
) else (
    echo [OK] hashcat found
)

:: ── Check hcxpcapngtool ──
where hcxpcapngtool >nul 2>&1
if errorlevel 1 (
    echo [!] hcxpcapngtool not found ^(needed for .pcapng conversion^)
    echo     Get from https://github.com/ZerBea/hcxtools
) else (
    echo [OK] hcxpcapngtool found
)

:: ── Setup wordlist ──
set "WORDLIST_PATH=%TEMP%\rockyou_sample.txt"
if not exist "%WORDLIST_PATH%" (
    echo [*] Downloading sample wordlist...
    powershell -Command "try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/10k-most-common.txt' -OutFile '%WORDLIST_PATH%' -UseBasicParsing } catch { Write-Host '[!] Download failed' }" 2>nul
)
if exist "%WORDLIST_PATH%" (
    echo [OK] Wordlist ready
)

set "WORDLIST_ROCKYOU_SAMPLE_PATH=%WORDLIST_PATH%"
set "WORDLIST_ROCKYOU_PATH=%WORDLIST_PATH%"

echo.
echo ════════════════════════════════════════════
echo   Starting services in separate windows...
echo ════════════════════════════════════════════
echo.

:: ── Start Backend in new CMD window ──
start "HashCracker Backend (port 8080)" cmd /k "cd /d "%~dp0" && set WORDLIST_PATH=%WORDLIST_PATH% && set WORDLIST_ROCKYOU_SAMPLE_PATH=%WORDLIST_PATH% && set WORDLIST_ROCKYOU_PATH=%WORDLIST_PATH% && echo ━━━ HashCracker Backend ━━━ && echo. && node server\src\index.js"

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: ── Start Frontend in new CMD window ──
start "HashCracker Frontend (port 5173)" cmd /k "cd /d "%~dp0" && echo ━━━ HashCracker Frontend ━━━ && echo. && npx vite --host 0.0.0.0"

:: Wait for frontend to start
timeout /t 3 /nobreak >nul

echo.
echo ════════════════════════════════════════════
echo   Both services started!
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8080
echo.
echo   Close the CMD windows to stop services.
echo ════════════════════════════════════════════
echo.

:: Open browser
timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"

echo Press any key to exit this window...
pause >nul
