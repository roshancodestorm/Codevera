"""
Voice Router — STT/TTS endpoints for the frontend voice panel.
Accepts audio blobs, returns transcribed text and/or synthesized audio.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import os, io, tempfile
import speech_recognition as sr
import pyttsx3

router = APIRouter()

# Shared TTS engine
_engine = None

def get_tts_engine():
    global _engine
    if _engine is None:
        _engine = pyttsx3.init()
        _engine.setProperty('rate', 165)
        _engine.setProperty('volume', 1.0)
        voices = _engine.getProperty('voices')
        if len(voices) > 1:
            _engine.setProperty('voice', voices[1].id)  # Female voice
    return _engine

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "default"

class STTResponse(BaseModel):
    transcript: str
    confidence: float
    language: str

@router.post("/stt", response_model=STTResponse)
async def speech_to_text(audio: UploadFile = File(...)):
    """Convert uploaded audio file to text using Google STT."""
    recognizer = sr.Recognizer()
    
    try:
        content = await audio.read()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        with sr.AudioFile(tmp_path) as source:
            recognizer.adjust_for_ambient_noise(source, duration=0.3)
            audio_data = recognizer.record(source)
        
        os.unlink(tmp_path)
        
        transcript = recognizer.recognize_google(audio_data, language='en-US', show_all=False)
        return STTResponse(transcript=transcript.lower(), confidence=0.95, language="en-US")
    
    except sr.UnknownValueError:
        return STTResponse(transcript="", confidence=0.0, language="en-US")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT Error: {str(e)}")

@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    """Convert text to speech audio and stream it back."""
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name
        
        engine = get_tts_engine()
        engine.save_to_file(req.text, tmp_path)
        engine.runAndWait()
        
        with open(tmp_path, "rb") as f:
            audio_bytes = f.read()
        os.unlink(tmp_path)
        
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/wav",
            headers={"Content-Disposition": "inline; filename=response.wav"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS Error: {str(e)}")

@router.get("/status")
async def voice_status():
    return {"status": "ready", "wake_word": os.getenv("WAKE_WORD", "hey codevora"), "engine": "pyttsx3"}
