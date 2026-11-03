#!/usr/bin/env python3
import requests
import json

url = "http://localhost:7860/api/generate"
data = {
    "prompt": "a beautiful girl, portrait, detailed face, long hair, soft lighting",
    "width": 512,
    "height": 512
}

print("Sending request to ComfyUI Bridge...")
response = requests.post(url, json=data)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
