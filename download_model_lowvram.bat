@echo off
echo Downloading LIGHTWEIGHT (2.1GB) Stable Diffusion v1.5 for 4GB VRAM...
echo This version is optimized for low VRAM stability.
curl -L -o "e:\Codestrom\ComfyUI\models\checkpoints\v1-5-pruned-emaonly-fp16.safetensors" "https://civitai.com/api/download/models/11745?type=Model&format=SafeTensor&size=pruned&fp=fp16"
echo Download complete! 
echo Please RESTART ComfyUI and select this model in the dropdown.
pause
