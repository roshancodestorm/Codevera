@echo off
echo 🚀 Starting CodeStream + FRIDAY Assistant...

:: Start Image Generation Backend
start cmd /k "cd server && npm start"

:: Start Frontend
start cmd /k "npm run dev"

:: Start FRIDAY MCP Server
start cmd /k "cd Hellomj\friday-tony-stark-demo && uv run friday"

:: Start FRIDAY Voice Agent
start cmd /k "cd Hellomj\friday-tony-stark-demo && uv run friday_voice"

echo ✨ All services are launching in separate windows.
pause
