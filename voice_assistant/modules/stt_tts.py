import speech_recognition as sr
import pyttsx3
import os

# Initialize TTS Engine
engine = pyttsx3.init()
voices = engine.getProperty('voices')
# Set standard natural voice
engine.setProperty('voice', voices[0].id)
engine.setProperty('rate', 170) 

def speak(text):
    """Text to Speech with console output console absolute space."""
    print(f"🎙️ Codevora: {text}")
    engine.say(text)
    engine.runAndWait()

def listen():
    """Speech to Text algorithm listening loop space absolute."""
    r = sr.Recognizer()
    with sr.Microphone() as source:
        print("\n🎧 Listening...")
        r.pause_threshold = 1
        audio = r.listen(source)

    try:
        print("🔍 Understanding...")
        query = r.recognize_google(audio, language='en-US')
        print(f"🗣️ User: {query}")
        return query.lower()
    except Exception as e:
        return ""
