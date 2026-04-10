import time
from modules.stt_tts import speak, listen
from modules.desktop_control import open_app, control_system
from modules.ai_brain import ask_ai

WAKE_WORD = "hey codevora"

def main():
    speak("Codevora Omega is offline. Starting continuous listener...")
    while True:
        query = listen()
        
        # Check Wake Word
        if WAKE_WORD in query:
            speak("Online. How can I assist you?")
            
            while True:
                command = listen()
                if not command:
                    continue
                    
                if "sleep" in command or "exit" in command:
                    speak("Going into background listening mode.")
                    break
                
                # Routing Command
                if "open" in command:
                    reply = open_app(command)
                    speak(reply)
                elif "system" in command:
                    control_system(command)
                else:
                    # Generic AI Query
                    reply = ask_ai(command)
                    speak(reply)

if __name__ == "__main__":
    main()
