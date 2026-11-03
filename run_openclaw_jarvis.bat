@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo   Starting Jarvis AI Coding Assistant Platform
echo ========================================================
echo.

set "CODING_MODEL=qwen2.5-coder:1.5b"
set "CODING_NUM_CTX=2048"
set "CODING_NUM_PREDICT=4096"
set "CODING_TEMPERATURE=0.2"
set "CODING_TOP_P=0.9"
set "CODING_REPEAT_PENALTY=1.05"

echo [1/4] Checking Ollama...
where ollama >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Ollama CLI not found in PATH.
  echo Install/launch Ollama first, then rerun this script.
  pause
  exit /b 1
)

echo [2/4] Verifying model "%CODING_MODEL%"...
ollama list | findstr /i /c:"%CODING_MODEL%" >nul 2>&1
if errorlevel 1 (
  echo [WARN] Model %CODING_MODEL% not found in local Ollama list.
  echo Run: ollama pull %CODING_MODEL%
  echo Continuing launch anyway...
)

echo [3/4] Starting backend on port 3001 (AI coding route enabled)...
start "Codestrom Backend (Coding Assistant)" cmd /k "cd /d \"%~dp0server\" && set \"CODING_MODEL=%CODING_MODEL%\" && set \"CODING_NUM_CTX=%CODING_NUM_CTX%\" && set \"CODING_NUM_PREDICT=%CODING_NUM_PREDICT%\" && set \"CODING_TEMPERATURE=%CODING_TEMPERATURE%\" && set \"CODING_TOP_P=%CODING_TOP_P%\" && set \"CODING_REPEAT_PENALTY=%CODING_REPEAT_PENALTY%\" && npm run dev"

timeout /t 3 /nobreak >nul

echo [4/4] Starting frontend on port 5173...
start "Codestrom Frontend" cmd /k "cd /d \"%~dp0\" && npm run dev"

timeout /t 4 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo Done. In Jarvis UI, select "AI Coding Assistant".
echo Using qwen2.5-coder:1.5b as the default local coding model.
echo.
pause
