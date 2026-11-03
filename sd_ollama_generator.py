import requests
import base64
import os
import sys

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')

SD_WEBUI_URL = os.getenv(
    "SD_WEBUI_URL", os.getenv("RUNPOD_URL", "http://127.0.0.1:7860")
)

SD_USE_HTTPS = os.getenv("SD_USE_HTTPS", "false").lower() == "true"


def get_sd_url() -> str:
    url = SD_WEBUI_URL
    if url.startswith("http://") and SD_USE_HTTPS:
        url = url.replace("http://", "https://")
    return url


def enhance_prompt_with_ollama(base_idea: str) -> str:
    print(f"🧠 Asking Ollama (llama3.2:1b) to enhance prompt: '{base_idea}'...")
    try:
        # Note: 'stream: False' ensures we get a single JSON response instead of a stream
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3.2:1b",
                "prompt": f"Create a highly detailed, descriptive prompt for an AI image generator based on this concept: '{base_idea}'. Only output the prompt, no conversational text.",
                "stream": False,
            },
        )
        response.raise_for_status()
        enhanced_prompt = response.json().get("response", "").strip()
        print(f"✨ Enhanced Prompt: {enhanced_prompt}\n")
        return enhanced_prompt
    except Exception as e:
        print(f"❌ Error connecting to Ollama: {e}")
        print("Make sure Ollama is running and the 'llama3.2:1b' model is installed.")
        return base_idea


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
        print("\n📌 To use with RunPod:")
        print("  1. Deploy SD WebUI template on RunPod")
        print("  2. Enable API: edit relauncher.py and add '--api' to launch_string")
        print("  3. Set environment variable:")
        print("     Windows: set RUNPOD_URL=https://your-pod-id-3001.proxy.runpod.net")
        print(
            "     PowerShell: $env:RUNPOD_URL='https://your-pod-id-3001.proxy.runpod.net'"
        )
        print("\n📌 To use locally:")
        print("  Start webui-user.bat --api")
        print("  Set SD_WEBUI_URL=http://127.0.0.1:7860")
        return False


def generate_image_with_sd(prompt: str, output_file: str = "output.png"):
    print("🎨 Sending prompt to Stable Diffusion WebUI...")

    base_url = get_sd_url()
    if not check_sd_webui_api(base_url):
        return

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
            timeout=120,
            verify=verify,
        )
        sd_response.raise_for_status()
        response_data = sd_response.json()

        # Stable Diffusion returns the images as a base64 encoded string array
        if "images" in response_data and len(response_data["images"]) > 0:
            image_b64 = response_data["images"][0]
            image_data = base64.b64decode(image_b64)

            with open(output_file, "wb") as f:
                f.write(image_data)
            print(f"✅ Success! Image saved to {os.path.abspath(output_file)}")
        else:
            print("❌ No image returned from Stable Diffusion.")

    except requests.exceptions.Timeout:
        print("❌ Image generation request timed out.")
        print("Try fewer steps / smaller resolution, or increase timeout in code.")
    except requests.exceptions.RequestException as e:
        print(f"❌ Stable Diffusion request failed: {e}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    print("Starting AI Image Generation Pipeline...")
    print(f"Using SD WebUI at: {get_sd_url()}")

    base_idea = "A cyberpunk city with flying cars and neon lights"

    if len(sys.argv) > 1:
        base_idea = sys.argv[1]

    print(f"Base idea: {base_idea}")

    enhanced_prompt = enhance_prompt_with_ollama(base_idea)

    if enhanced_prompt:
        output_file = "output.png"
        if len(sys.argv) > 2:
            output_file = sys.argv[2]
        generate_image_with_sd(enhanced_prompt, output_file)
