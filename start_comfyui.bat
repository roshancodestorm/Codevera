@echo off
echo ========================================================
echo Starting ComfyUI (Port 8188)
echo ========================================================

cd /d E:\Codestrom\ComfyUI
call venv\Scripts\activate.bat
python main.py --lowvram --disable-cuda-malloc

pause
