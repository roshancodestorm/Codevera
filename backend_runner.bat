@echo off
cd /d "%~dp0"
node server.js > "%~dp0runner_out.txt" 2>&1
