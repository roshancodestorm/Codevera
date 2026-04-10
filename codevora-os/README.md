# CODEVORA-OS 🧠

> A complete AI Operating System — voice control, app automation, file analysis, multi-agent intelligence, and communication bots.

## Quick Start

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

### Voice Engine (Python)
```bash
cd voice_engine
pip install -r requirements.txt
python main.py
```

## Environment Variables
Copy `.env.example` to `.env` and fill in your API keys.

## Modules
- Voice Engine: Wake word + STT + TTS
- AI Brain: Multi-agent LLM system  
- Memory: Conversation history + context
- Desktop Control: App launcher, file management
- Automation: API integrations, workflow tasks
- Communication: WhatsApp & Telegram bots
- Dashboard: React-based UI
