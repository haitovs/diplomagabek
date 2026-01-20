@echo off
title HashCracker - WiFi Password Cracking Simulation
color 0A

echo ===============================================
echo   HashCracker - WiFi Cracking Simulation
echo   Diploma Project - Agabel
echo ===============================================
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo [*] Installing dependencies...
    echo.
    call npm install
    if errorlevel 1 (
        echo [!] Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
    echo [+] Dependencies installed successfully!
    echo.
)

:: Start the application
echo [*] Starting development server...
echo [*] Opening http://localhost:5173 in your browser...
echo.
echo Press Ctrl+C to stop the server
echo.

:: Start dev server
start "" http://localhost:5173
call npm run dev
