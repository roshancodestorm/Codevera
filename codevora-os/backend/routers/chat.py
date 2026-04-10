"""
AI Brain Router — GPT/Gemini multi-model chat with memory context injection.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import openai, os, json, time
from pathlib import Path

router = APIRouter()

MEMORY_PATH = Path(os.getenv("MEMORY_DB_PATH", "./data/memory.json"))

SYSTEM_PROMPT = """You are CODEVORA-OS, an advanced AI Operating System assistant.
You are intelligent, fast, and helpful. You can control the computer, answer questions,
analyze files, automate tasks, and communicate. Keep responses concise and actionable.
Always respond as if you are JARVIS from Iron Man — confident, precise, and witty."""

class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = "gpt-4o"
    include_memory: Optional[bool] = True

class ChatResponse(BaseModel):
    reply: str
    model: str
    timestamp: float

def load_memory_context() -> str:
    """Load last 10 messages from memory for context."""
    try:
        if MEMORY_PATH.exists():
            data = json.loads(MEMORY_PATH.read_text())
            history = data.get("history", [])[-10:]
            return "\n".join([f"{m['role'].upper()}: {m['content']}" for m in history])
    except:
        pass
    return ""

def save_to_memory(role: str, content: str):
    """Append message to memory store."""
    try:
        MEMORY_PATH.parent.mkdir(parents=True, exist_ok=True)
        data = {"history": []}
        if MEMORY_PATH.exists():
            data = json.loads(MEMORY_PATH.read_text())
        data["history"].append({"role": role, "content": content, "time": time.time()})
        data["history"] = data["history"][-100:]  # Keep last 100
        MEMORY_PATH.write_text(json.dumps(data, indent=2))
    except:
        pass

@router.post("/", response_model=ChatResponse)
async def chat_with_ai(req: ChatRequest):
    """Send message to AI brain and get a response."""
    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    memory_ctx = load_memory_context() if req.include_memory else ""
    system = SYSTEM_PROMPT
    if memory_ctx:
        system += f"\n\nConversation History:\n{memory_ctx}"
    
    try:
        save_to_memory("user", req.message)
        
        response = client.chat.completions.create(
            model=req.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": req.message}
            ],
            max_tokens=500,
            temperature=0.7,
        )
        reply = response.choices[0].message.content
        save_to_memory("assistant", reply)
        
        return ChatResponse(reply=reply, model=req.model, timestamp=time.time())
    
    except Exception as e:
        # Fallback heuristic response
        raise HTTPException(status_code=500, detail=f"AI Brain Error: {str(e)}")

@router.get("/models")
async def list_models():
    return {"models": ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"]}
