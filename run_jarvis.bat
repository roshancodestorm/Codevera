@echo off
echo 🚀 Starting Codevora AI (Local Model Mode)...

:: Start Backend in a new window
start "Jarvis Backend" cmd /k "cd /d e:\Codestrom\backend && npm run dev"

:: Start Frontend in the current window
echo 🌐 Starting Frontend...
npm run dev
