@echo off
title CODEVORA-OS Launcher
color 0B

echo.
echo  ===================================================================
echo   CODEVORA-OS  v2.0  --  AI OPERATING SYSTEM
echo  ===================================================================
echo.

echo [1/3] Starting Python Backend (FastAPI)...
start "CODEVORA Backend" cmd /k "cd /d D:\Project\Codestrom\codevora-os\backend && pip install -r requirements.txt -q && uvicorn main:app --reload --port 8000"
timeout /t 5 /nobreak >nul

echo [2/3] Starting React Dashboard (Codevora OS Vite project)...
start "CODEVORA Frontend" cmd /k "cd /d D:\Project\Codestrom\codevora-os\frontend && npm run dev"
timeout /t 4 /nobreak >nul

echo [3/3] Opening CODEVORA-OS Dashboard...
timeout /t 3 /nobreak >nul
start http://localhost:5173/

echo.
echo  CODEVORA-OS is running!
echo  Dashboard:  http://localhost:5173/
echo  API Docs:   http://localhost:8000/docs
echo.
echo  Voice Engine: python codevora-os\voice_engine\main.py
echo  Telegram Bot: python codevora-os\backend\telegram_bot.py
echo.
pause
