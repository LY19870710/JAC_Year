@echo off
cd /d E:\Claw\JAC_Year
start /b node dist/server.js
timeout /t 2 >nul
curl -X POST http://localhost:3000/api/citations/generate
