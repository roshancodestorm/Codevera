#!/usr/bin/env python3
"""
ComfyUI Bridge - Connects Jarvis Chat to ComfyUI for Image Generation
"""

import json
import urllib.request
import urllib.parse
import uuid
import websocket
import os
from PIL import Image
import io
import asyncio
from aiohttp import web
import aiohttp_cors

# ComfyUI Configuration
COMFYUI_SERVER = "127.0.0.1:8188"  # Default ComfyUI address
OUTPUT_DIR = "E:/Codestrom/output"

# Create output directory if it doesn't exist
os.makedirs(OUTPUT_DIR, exist_ok=True)

class ComfyUIBridge:
    def __init__(self):
        self.server_address = COMFYUI_SERVER
        self.client_id = str(uuid.uuid4())
        
    def queue_prompt(self, prompt):
        """Send prompt to ComfyUI queue"""
        p = {"prompt": prompt, "client_id": self.client_id}
        data = json.dumps(p).encode('utf-8')
        req = urllib.request.Request(
            f"http://{self.server_address}/prompt",
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        return json.loads(urllib.request.urlopen(req).read())
    
    def get_image(self, filename, subfolder, folder_type):
        """Get generated image from ComfyUI"""
        data = {"filename": filename, "subfolder": subfolder, "type": folder_type}
        url_values = urllib.parse.urlencode(data)
        with urllib.request.urlopen(
            f"http://{self.server_address}/view?{url_values}"
        ) as response:
            return response.read()
    
    def get_history(self, prompt_id):
        """Get execution history"""
        with urllib.request.urlopen(
            f"http://{self.server_address}/history/{prompt_id}"
        ) as response:
            return json.loads(response.read())
    
    def generate_image(self, prompt_text, width=512, height=512, seed=None):
        """Generate image using ComfyUI"""
        if seed is None:
            seed = uuid.uuid4().int % (2**32)
        
        # Load workflow template
        workflow = self.get_workflow_template()
        
        # Update with user prompt
        workflow["6"]["inputs"]["text"] = prompt_text
        workflow["3"]["inputs"]["seed"] = seed
        workflow["5"]["inputs"]["width"] = width
        workflow["5"]["inputs"]["height"] = height
        
        # Queue the prompt
        ws = websocket.WebSocket()
        ws.connect(f"ws://{self.server_address}/ws?clientId={self.client_id}")
        
        prompt_response = self.queue_prompt(workflow)
        prompt_id = prompt_response['prompt_id']
        
        # Wait for completion
        output_images = {}
        current_node = ""
        
        while True:
            out = ws.recv()
            if isinstance(out, str):
                message = json.loads(out)
                if message['type'] == 'executing':
                    data = message['data']
                    if data['node'] is None and data['prompt_id'] == prompt_id:
                        break  # Execution done
        
        # Get history
        history = self.get_history(prompt_id)[prompt_id]
        
        # Get output images
        for node_id in history['outputs']:
            node_output = history['outputs'][node_id]
            if 'images' in node_output:
                images_output = []
                for image in node_output['images']:
                    image_data = self.get_image(
                        image['filename'],
                        image['subfolder'],
                        image['type']
                    )
                    images_output.append(image_data)
                output_images[node_id] = images_output
        
        ws.close()
        
        # Return first image
        if output_images:
            first_node = list(output_images.keys())[0]
            return output_images[first_node][0]
        return None
    
    def get_workflow_template(self):
        """Basic ComfyUI workflow for text-to-image"""
        return {
            "3": {
                "inputs": {
                    "seed": 156680208700286,
                    "steps": 20,
                    "cfg": 8.0,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 1.0,
                    "model": ["4", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["5", 0]
                },
                "class_type": "KSampler"
            },
            "4": {
                "inputs": {
                    "ckpt_name": "v1-5-pruned-emaonly.safetensors"
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "5": {
                "inputs": {
                    "width": 512,
                    "height": 512,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage"
            },
            "6": {
                "inputs": {
                    "text": "beautiful scenery nature glass bottle landscape, purple galaxy bottle",
                    "clip": ["4", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "7": {
                "inputs": {
                    "text": "text, watermark",
                    "clip": ["4", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "8": {
                "inputs": {
                    "samples": ["3", 0],
                    "vae": ["4", 2]
                },
                "class_type": "VAEDecode"
            },
            "9": {
                "inputs": {
                    "filename_prefix": "ComfyUI",
                    "images": ["8", 0]
                },
                "class_type": "SaveImage"
            }
        }

# Initialize bridge
bridge = ComfyUIBridge()

async def handle_generate(request):
    """Handle image generation request"""
    try:
        data = await request.json()
        prompt = data.get('prompt', '')
        width = data.get('width', 512)
        height = data.get('height', 512)
        
        # Generate image
        image_data = bridge.generate_image(prompt, width, height)
        
        if image_data:
            # Save to output directory
            os.makedirs(OUTPUT_DIR, exist_ok=True)
            filename = f"jarvis_{uuid.uuid4().hex[:8]}.png"
            filepath = os.path.join(OUTPUT_DIR, filename)
            
            with open(filepath, 'wb') as f:
                f.write(image_data)
            
            return web.json_response({
                'success': True,
                'filename': filename,
                'path': f'/output/{filename}'
            })
        else:
            return web.json_response({
                'success': False,
                'error': 'Failed to generate image'
            }, status=500)
    
    except Exception as e:
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)

async def handle_chat(request):
    """Handle chat with image detection"""
    try:
        data = await request.json()
        message = data.get('message', '').lower()
        
        # Check if user wants image generation
        image_keywords = ['create image', 'generate image', 'draw', 'paint', 'make image']
        wants_image = any(keyword in message for keyword in image_keywords)
        
        if wants_image:
            # Extract prompt (remove keywords)
            prompt = message
            for keyword in image_keywords:
                prompt = prompt.replace(keyword, '')
            prompt = prompt.strip()
            
            # Generate image
            image_data = bridge.generate_image(prompt, 512, 512)
            
            if image_data:
                os.makedirs(OUTPUT_DIR, exist_ok=True)
                filename = f"jarvis_{uuid.uuid4().hex[:8]}.png"
                filepath = os.path.join(OUTPUT_DIR, filename)
                
                with open(filepath, 'wb') as f:
                    f.write(image_data)
                
                return web.json_response({
                    'type': 'image',
                    'message': f'I\'ve created an image based on your request: "{prompt}"',
                    'filename': filename,
                    'path': f'/output/{filename}'
                })
        
        # Regular chat - forward to OpenAI
        return web.json_response({
            'type': 'text',
            'message': 'Use the frontend OpenAI integration for text chat.'
        })
    
    except Exception as e:
        return web.json_response({
            'type': 'error',
            'message': str(e)
        }, status=500)

async def init_app():
    """Initialize web application"""
    app = web.Application()
    
    # Setup CORS
    cors = aiohttp_cors.setup(app, defaults={
        "*": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
            allow_methods="*"
        )
    })
    
    # Add routes
    app.router.add_post('/api/generate', handle_generate)
    app.router.add_post('/api/chat', handle_chat)
    app.router.add_static('/output', OUTPUT_DIR)
    
    # Apply CORS to all routes
    for route in list(app.router.routes()):
        cors.add(route)
    
    return app

if __name__ == '__main__':
    print("ComfyUI Bridge Server Starting...")
    print(f"ComfyUI Server: {COMFYUI_SERVER}")
    print(f"Output Directory: {OUTPUT_DIR}")
    print("API Endpoints:")
    print("   POST /api/generate - Generate image from prompt")
    print("   POST /api/chat - Chat with image detection")
    print("   GET  /output/<filename> - Download generated image")
    print("\nMake sure ComfyUI is running on port 8188!")
    
    app = asyncio.run(init_app())
    web.run_app(app, host='0.0.0.0', port=7860)
