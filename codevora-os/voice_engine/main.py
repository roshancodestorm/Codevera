"""
Voice Engine — Standalone wake-word listener that calls the backend API.
Run from: python voice_engine/main.py
"""

import os, sys, time, requests
from dotenv import load_dotenv
load_dotenv(dotenv_path="../backend/.env")

import speech_recognition as sr
import pyttsx3

WAKE_WORD     = os.getenv("WAKE_WORD", "hey codevora")
BACKEND_URL   = "http://localhost:8000"
SLEEP_PHRASES = {"sleep", "go to sleep", "exit", "goodbye", "stop listening"}

# ── TTS Engine ──────────────────────────────────────────────────────────────
engine = pyttsx3.init()
engine.setProperty("rate", 160)
engine.setProperty("volume", 1.0)
voices = engine.getProperty("voices")
if len(voices) > 1:
    engine.setProperty("voice", voices[1].id)

def speak(text: str):
    print(f"🎙️  CODEVORA: {text}")
    engine.say(text)
    engine.runAndWait()

# ── STT ─────────────────────────────────────────────────────────────────────
recognizer = sr.Recognizer()
recognizer.pause_threshold = 1.0
recognizer.energy_threshold = 300

def listen(timeout: int = 5) -> str:
    with sr.Microphone() as source:
        print("🎧 Listening...")
        recognizer.adjust_for_ambient_noise(source, duration=0.3)
        try:
            audio = recognizer.listen(source, timeout=timeout, phrase_time_limit=10)
            text  = recognizer.recognize_google(audio, language="en-US")
            print(f"🗣️  You: {text}")
            return text.lower().strip()
        except sr.WaitTimeoutError:
            return ""
        except sr.UnknownValueError:
            return ""
        except Exception as e:
            print(f"⚠️  Listen error: {e}")
            return ""

# ── API Calls ────────────────────────────────────────────────────────────────
def ask_brain(command: str) -> str:
    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/chat/",
            json={"message": command, "include_memory": True},
            timeout=15
        )
        return resp.json().get("reply", "Brain returned empty response.")
    except:
        return "Backend is offline. Please start the server."

def open_app(command: str) -> str:
    try:
        # Extract app name heuristically
        app = command.replace("open", "").replace("launch", "").strip().split()[0]
        resp = requests.post(
            f"{BACKEND_URL}/api/system/open-app",
            json={"app": app},
            timeout=10
        )
        return resp.json().get("message", f"Opened {app}")
    except:
        return "Could not open application."

# ── Main Loop ────────────────────────────────────────────────────────────────
def main():
    speak("CODEVORA-OS initializing. Say 'Hey Codevora' to begin.")
    print(f"\n✅ Wake word: '{WAKE_WORD}'\n")

    while True:
        query = listen(timeout=10)
        if not query:
            continue

        if WAKE_WORD in query:
            speak("Online. How can I assist you?")

            # Active session loop
            while True:
                command = listen(timeout=8)
                if not command:
                    continue

                if any(phrase in command for phrase in SLEEP_PHRASES):
                    speak("Going into background mode. Say 'Hey Codevora' to wake me.")
                    break

                # Route command
                if any(w in command for w in ["open", "launch", "start"]):
                    reply = open_app(command)
                elif any(w in command for w in ["shutdown", "restart", "lock", "sleep"]):
                    action = next((w for w in ["shutdown", "restart", "lock", "sleep"] if w in command), None)
                    try:
                        requests.post(f"{BACKEND_URL}/api/system/command", json={"action": action}, timeout=5)
                        reply = f"Executing {action} command."
                    except:
                        reply = "Backend offline."
                else:
                    reply = ask_brain(command)

                speak(reply)

if __name__ == "__main__":
    main()
