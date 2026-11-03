import requests
import base64
import os
import sys
import json
import random
import time

# Try to load .env if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

SD_WEBUI_URL = os.getenv(
    "SD_WEBUI_URL", os.getenv("RUNPOD_URL", "http://127.0.0.1:7860")
)

SD_USE_HTTPS = os.getenv("SD_USE_HTTPS", "false").lower() == "true"
GROQ_API_KEY = os.getenv("VITE_GROQ_API_KEY")


def get_sd_url() -> str:
    url = SD_WEBUI_URL
    if url.startswith("http://") and SD_USE_HTTPS:
        url = url.replace("http://", "https://")
    return url


def enhance_prompt_with_ollama(base_idea: str) -> str:
    print(f"🧠 Asking Ollama (llama3.2:1b) to enhance prompt: '{base_idea}'...")
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3.2:1b",
                "prompt": f"Create a highly detailed, descriptive prompt for an AI image generator based on this concept: '{base_idea}'. Only output the prompt, no conversational text.",
                "stream": False,
            },
            timeout=3,  # Fail fast so we don't delay ComfyUI
        )
        response.raise_for_status()
        enhanced_prompt = response.json().get("response", "").strip()
        print(f"✨ Enhanced Prompt (Ollama): {enhanced_prompt}\n")
        return enhanced_prompt
    except Exception as e:
        print(f"⚠️ Ollama unavailable or error: {e}")
        return None


def enhance_prompt_with_groq(base_idea: str) -> str:
    if not GROQ_API_KEY:
        print("⚠️ No Groq API Key found in environment.")
        return None

    print(f"🚀 Asking Groq (llama-3.1-70b-versatile) to enhance prompt: '{base_idea}'...")
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.1-70b-versatile",
                "messages": [
                    {
                        "role": "user",
                        "content": f"Create a highly detailed, descriptive prompt for an AI image generator based on this concept: '{base_idea}'. Only output the prompt, no conversational text.",
                    }
                ],
            },
            timeout=10,
        )
        response.raise_for_status()
        enhanced_prompt = (
            response.json()["choices"][0]["message"]["content"].strip()
        )
        print(f"✨ Enhanced Prompt (Groq): {enhanced_prompt}\n")
        return enhanced_prompt
    except Exception as e:
        print(f"❌ Error connecting to Groq: {e}")
        return None


def check_sd_webui_api(base_url: str) -> bool:
    try:
        verify = not base_url.startswith("https://localhost")
        health = requests.get(
            f"{base_url}/sdapi/v1/sd-models", timeout=5, verify=verify
        )
        health.raise_for_status()
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Stable Diffusion API is not reachable at {base_url}: {e}")
        return False


def generate_image_with_sd(prompt: str, output_file: str = "output.png"):
    print("🎨 Sending prompt to Stable Diffusion WebUI...")

    base_url = get_sd_url()
    if not check_sd_webui_api(base_url):
        return {"success": False, "error": "SD WebUI not reachable"}

    try:
        verify = not base_url.startswith("https://localhost")
        sd_response = requests.post(
            f"{base_url}/sdapi/v1/txt2img",
            json={
                "prompt": prompt,
                "steps": 20,
                "width": 512,
                "height": 512,
                "cfg_scale": 7,
            },
            timeout=300,
            verify=verify,
        )
        sd_response.raise_for_status()
        response_data = sd_response.json()

        if "images" in response_data and len(response_data["images"]) > 0:
            image_b64 = response_data["images"][0]
            image_data = base64.b64decode(image_b64)

            with open(output_file, "wb") as f:
                f.write(image_data)
            print(f"✅ Success! Image saved to {os.path.abspath(output_file)}")
            return {"success": True, "file": output_file, "b64": image_b64}
        else:
            return {"success": False, "error": "No image returned"}

    except requests.exceptions.Timeout:
        return {"success": False, "error": "Request timed out"}
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": str(e)}

def check_comfyui_api(base_url: str) -> bool:
    try:
        health = requests.get(f"{base_url}/object_info", timeout=3)
        health.raise_for_status()
        return True
    except:
        return False

def generate_image_with_comfyui(prompt: str, output_file: str = "output.png"):
    print("🎨 Sending prompt to ComfyUI...")
    comfy_url = os.getenv("COMFYUI_URL", "http://127.0.0.1:8188")
    if not check_comfyui_api(comfy_url):
        return {"success": False, "error": "ComfyUI not reachable"}
    
    workflow = {
        "3": {
            "inputs": {
                "seed": random.randint(1, 1000000000),
                "steps": 20,
                "cfg": 8,
                "sampler_name": "euler",
                "scheduler": "normal",
                "denoise": 1,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0]
            },
            "class_type": "KSampler"
        },
        "4": {
            "inputs": { "ckpt_name": "v1-5-pruned-emaonly-fp16.safetensors" },
            "class_type": "CheckpointLoaderSimple"
        },
        "5": {
            "inputs": { "width": 512, "height": 512, "batch_size": 1 },
            "class_type": "EmptyLatentImage"
        },
        "6": {
            "inputs": { "text": prompt, "clip": ["4", 1] },
            "class_type": "CLIPTextEncode"
        },
        "7": {
            "inputs": { "text": "bad quality, low resolution, ugly", "clip": ["4", 1] },
            "class_type": "CLIPTextEncode"
        },
        "8": {
            "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
            "class_type": "VAEDecode"
        },
        "9": {
            "inputs": { "filename_prefix": "ComfyUI", "images": ["8", 0] },
            "class_type": "SaveImage"
        }
    }
    
    try:
        req_data = {"prompt": workflow}
        resp = requests.post(f"{comfy_url}/prompt", json=req_data, timeout=30)
        resp.raise_for_status()
        prompt_id = resp.json().get("prompt_id")
        print(f"📋 ComfyUI prompt_id: {prompt_id} — polling for up to 4 minutes...")
        
        # GTX 1650 (4GB VRAM) in lowvram mode needs up to ~3-4 min on first run
        max_retries = 120
        poll_interval = 2  # seconds between polls
        for attempt in range(max_retries):
            time.sleep(poll_interval)
            try:
                history_resp = requests.get(f"{comfy_url}/history/{prompt_id}", timeout=5)
                if history_resp.status_code == 200:
                    history_data = history_resp.json()
                    if prompt_id in history_data:
                        job = history_data[prompt_id]
                        # Check for error status
                        status = job.get("status", {})
                        if status.get("status_str") == "error":
                            msgs = status.get("messages", [])
                            err_detail = str(msgs[-1]) if msgs else "Unknown ComfyUI error"
                            return {"success": False, "error": f"ComfyUI job error: {err_detail}"}
                        outputs = job.get("outputs", {})
                        if "9" in outputs and "images" in outputs["9"]:
                            image_info = outputs["9"]["images"][0]
                            filename = image_info["filename"]
                            subfolder = image_info.get("subfolder", "")
                            folder_type = image_info.get("type", "output")
                            
                            img_url = f"{comfy_url}/view?filename={filename}&subfolder={subfolder}&type={folder_type}"
                            img_resp = requests.get(img_url, timeout=30)
                            img_resp.raise_for_status()
                            
                            image_data = img_resp.content
                            with open(output_file, "wb") as f:
                                f.write(image_data)
                            print(f"✅ Success! Image saved from ComfyUI to {os.path.abspath(output_file)} (attempt {attempt+1})")
                            image_b64 = base64.b64encode(image_data).decode('utf-8')
                            return {"success": True, "file": output_file, "b64": image_b64}
            except requests.RequestException as poll_err:
                print(f"⚠️ Poll attempt {attempt+1} failed: {poll_err}")
            if (attempt + 1) % 15 == 0:
                elapsed = (attempt + 1) * poll_interval
                print(f"⏳ Still waiting... {elapsed}s elapsed (attempt {attempt+1}/{max_retries})")
        return {"success": False, "error": f"ComfyUI generation timed out after {max_retries * poll_interval}s"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    if sys.platform == "win32":
        import codecs
        sys.stdout.reconfigure(encoding='utf-8')
    prompt = None
    if len(sys.argv) > 1 and sys.argv[1] == "--prompt":
        prompt = sys.argv[2] if len(sys.argv) > 2 else None

    if not prompt:
        try:
            input_data = sys.stdin.read()
            if input_data:
                data = json.loads(input_data)
                prompt = data.get("prompt")
        except:
            pass
        
    if not prompt:
        prompt = "A cyberpunk city with neon lights"

    print(f"🚀 Starting AI Image Generation Pipeline...")
    print(f"📡 Will try ComfyUI first, falling back to SD WebUI at {get_sd_url()}")
    print(f"💡 Base idea: {prompt}")

    # Unified Connection: Try Ollama first, fallback to Groq
    enhanced_prompt = enhance_prompt_with_ollama(prompt)
    if not enhanced_prompt:
        enhanced_prompt = enhance_prompt_with_groq(prompt)

    # Use original prompt if enhancement fails
    final_prompt = enhanced_prompt if enhanced_prompt else prompt

    comfy_result = generate_image_with_comfyui(final_prompt, "output.png")
    if comfy_result.get("success"):
        result = comfy_result
    else:
        print(f"⚠️ ComfyUI attempt failed ({comfy_result.get('error')}), falling back to SD WebUI...")
        result = generate_image_with_sd(final_prompt, "output.png")
        
    print(json.dumps(result))