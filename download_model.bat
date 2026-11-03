@echo off
echo Downloading v1.5 Stable Diffusion checkpoint for ComfyUI (approx 4GB)...
echo This may take a while depending on your internet connection.
curl -L -o "e:\Codestrom\ComfyUI\models\checkpoints\v1-5-pruned-emaonly-fp16.safetensors" "https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors"
echo Download complete! Please restart ComfyUI.
pause
