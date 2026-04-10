"""
Memory Router — Persistent conversation history, context store, user preferences.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json, os, time
from pathlib import Path

router = APIRouter()
MEMORY_PATH = Path(os.getenv("MEMORY_DB_PATH", "./data/memory.json"))

class MemoryEntry(BaseModel):
    role: str
    content: str

class PreferenceUpdate(BaseModel):
    key: str
    value: str

def load_db() -> dict:
    MEMORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    if MEMORY_PATH.exists():
        return json.loads(MEMORY_PATH.read_text())
    return {"history": [], "preferences": {}, "notes": []}

def save_db(data: dict):
    MEMORY_PATH.write_text(json.dumps(data, indent=2))

@router.get("/history")
async def get_history(limit: int = 50):
    """Get conversation history."""
    data = load_db()
    return {"history": data.get("history", [])[-limit:], "total": len(data.get("history", []))}

@router.delete("/history")
async def clear_history():
    """Clear all conversation history."""
    data = load_db()
    data["history"] = []
    save_db(data)
    return {"status": "cleared"}

@router.get("/preferences")
async def get_preferences():
    data = load_db()
    return {"preferences": data.get("preferences", {})}

@router.post("/preferences")
async def set_preference(pref: PreferenceUpdate):
    data = load_db()
    data.setdefault("preferences", {})[pref.key] = pref.value
    save_db(data)
    return {"status": "saved", "key": pref.key, "value": pref.value}

@router.get("/notes")
async def get_notes():
    data = load_db()
    return {"notes": data.get("notes", [])}

@router.post("/notes")
async def add_note(note: MemoryEntry):
    data = load_db()
    data.setdefault("notes", []).append({"content": note.content, "time": time.time()})
    save_db(data)
    return {"status": "saved"}
