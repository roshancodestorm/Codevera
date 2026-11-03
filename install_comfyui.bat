@echo off
echo ========================================================
echo Installing ComfyUI for CodeStream...
echo ========================================================

IF NOT EXIST "ComfyUI" (
    echo [1/4] Cloning ComfyUI repository...
    git clone https://github.com/comfyanonymous/ComfyUI.git
) ELSE (
    echo [1/4] ComfyUI repository already exists. Skipping clone.
)

cd ComfyUI

IF NOT EXIST "venv" (
    echo [2/4] Creating Python virtual environment...
    python -m venv venv
) ELSE (
    echo [2/4] Virtual environment already exists.
)

echo [3/4] Activating virtual environment and installing PyTorch...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip

:: Force pip to use the E: drive for temporary extraction because C: is full
set TMP=e:\pip_temp
set TEMP=e:\pip_temp
set TMPDIR=e:\pip_temp

pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

echo [4/4] Installing ComfyUI requirements...
pip install -r requirements.txt

echo.
echo ========================================================
echo ✅ ComfyUI Installation Complete!
echo.
echo Note: You may need to copy your models (.safetensors/.ckpt)
echo from Stable Diffusion to ComfyUI\models\checkpoints
echo.
echo You can now run "start_comfyui.bat" to launch it.
echo ========================================================
pause
