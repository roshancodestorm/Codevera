"""
CODEVORA-OS Backend — FastAPI
Mounts all core module routers and handles CORS for the React dashboard.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn

load_dotenv()

from routers import chat, voice, automation, files, system, memory

app = FastAPI(
    title="CODEVORA-OS API",
    description="AI Operating System Backend — Voice, Brain, Memory, Automation",
    version="2.0.0"
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(chat.router,       prefix="/api/chat",       tags=["AI Chat"])
app.include_router(voice.router,      prefix="/api/voice",      tags=["Voice Engine"])
app.include_router(automation.router, prefix="/api/automation", tags=["Automation"])
app.include_router(files.router,      prefix="/api/files",      tags=["File Analysis"])
app.include_router(system.router,     prefix="/api/system",     tags=["Desktop Control"])
app.include_router(memory.router,     prefix="/api/memory",     tags=["Memory"])

@app.get("/")
async def root():
    return {"status": "CODEVORA-OS ONLINE", "version": "2.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy", "modules": ["chat", "voice", "automation", "files", "system", "memory"]}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
