import os
import subprocess
import pyautogui

def open_app(command):
    """Launch apps via path execution space absolute."""
    if "chrome" in command:
        os.startfile("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
        return "Opening Chrome"
    elif "code" in command or "vs code" in command:
        os.startfile(os.environ.get('LOCALAPPDATA') + "\\Programs\\Microsoft VS Code\\Code.exe")
        return "Opening VS Code"
    return "Application path unknown inside list absolute."

def control_system(command):
    if "shutdown" in command:
        os.system("shutdown /s /t 1")
    elif "restart" in command:
        os.system("shutdown /r /t 1")
