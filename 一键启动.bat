@echo off
setlocal enabledelayedexpansion

title JAC Year Manager

echo.
echo ========================================
echo   JAC Year Manager
echo ========================================
echo.

cd /d D:\Claw\JAC_Year

set "PORT_FOUND=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING"') do (
    set "OLD_PID=%%a"
    set "PORT_FOUND=1"
)

if "%PORT_FOUND%"=="1" (
    echo [WARN] Port 3000 is in use (PID: %OLD_PID%)
    echo.
    echo Options:
    echo   [1] Restart server
    echo   [2] Stop server only
    echo   [3] Cancel
    echo.
    set /p "CHOICE=Select (1/2/3): "

    if "!CHOICE!"=="1" (
        echo.
        echo [STOP] Killing process %OLD_PID%...
        taskkill /F /PID %OLD_PID% >nul 2>&1
        ping 127.0.0.1 -n 3 >nul
    ) else if "!CHOICE!"=="2" (
        echo.
        echo [STOP] Killing process %OLD_PID%...
        taskkill /F /PID %OLD_PID% >nul 2>&1
        echo [DONE] Server stopped
        pause
        exit /b 0
    ) else (
        echo [CANCEL] Operation cancelled
        pause
        exit /b 0
    )
)

echo [START] Starting JAC Year Manager...
echo.

start "JAC Year Server" cmd /c "python -X utf8 src\server.py"

ping 127.0.0.1 -n 4 >nul

set "SERVER_OK=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING"') do (
    set "NEW_PID=%%a"
    set "SERVER_OK=1"
)

if "%SERVER_OK%"=="1" (
    echo [OK] Server started (PID: %NEW_PID%)
    echo [URL] http://localhost:3000
    echo.
    echo [TIP] Close this window will NOT stop server
    echo       Run this script again to stop
    echo.
    ping 127.0.0.1 -n 3 >nul
    start http://localhost:3000
) else (
    echo [FAIL] Server start failed
)

echo.
pause
