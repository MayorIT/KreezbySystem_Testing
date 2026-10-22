@echo off
cd /d "%~dp0"
title Kreezby server
if not exist node_modules call npm install
start "" /min cmd /c "timeout /t 6 >nul & start http://localhost:3000/auth/start.html"
node server.js
echo.
echo Server stopped. Press any key to close.
pause >nul
