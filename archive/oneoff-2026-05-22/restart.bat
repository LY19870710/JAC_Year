@echo off
chcp 65001 >nul
cd /d "%~dp0"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
ping -n 2 127.0.0.1 >nul
call npx tsc >nul 2>&1
start "JAC_Year" cmd /c "title JAC_Year Server && node dist/server.js && pause"
