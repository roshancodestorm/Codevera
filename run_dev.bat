@echo off
echo Starting Codestrom Development Server...
echo Please wait a few seconds while the server starts up.
set "CODESTROM_ROOT=%~dp0"
for /f %%P in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)"') do set "CODESTROM_BACKEND_PID=%%P"
if not defined CODESTROM_BACKEND_PID start "Codestrom Backend" cmd /k "cd /d ""%CODESTROM_ROOT%backend"" && node server.js"
timeout /t 3 /nobreak >nul
start cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
start chrome http://localhost:5173
