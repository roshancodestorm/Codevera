@echo off
echo Starting Codestrom Development Server...
echo Please wait a few seconds while the server starts up.
start cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
start chrome http://localhost:5173
