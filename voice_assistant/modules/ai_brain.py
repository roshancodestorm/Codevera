import openai
import os

# Ensure API Key loaded
openai.api_key = os.getenv("OPENAI_API_KEY")

def ask_ai(prompt, memory_context=""):
    """Ask LLM question using context absolute memory."""
    system_prompt = "You are Codevora Omega, an AI Voice OS assistant. Be concise, fast, and helpful."
    
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"{memory_context}\nUser: {prompt}"}
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        return "I encountered an issue reaching my brain modules."
