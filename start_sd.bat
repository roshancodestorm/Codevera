@echo off
cd /d E:\Codestrom\stable-diffusion-webui
python launch.py --api --skip-torch-cuda-test --lowvram --no-half --use-cpu all --precision full --skip-install --skip-prepare-environment