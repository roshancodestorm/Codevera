import os
import json
import logging
import subprocess
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("CodevoraVoiceGod")

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """
You are CODEVORA-VOICE-GOD, a universal voice-controlled AI system.
You have the ability to control all aspects of the system, applications, files, internet, and automation using voice commands.

MISSION
Allow the user to control EVERYTHING using voice.

COMMAND UNDERSTANDING & DOMAINS:
1. FILE SYSTEM (Open, Create, Delete, Search)
2. APPLICATION CONTROL (Open Chrome, VS Code, Close apps)
3. SYSTEM CONTROL (Shutdown, Lock system)
4. WEB CONTROL (Search Google, Open YouTube)
5. AI TASKS (Code, Analyze data)
6. COMMUNICATION (Read/Send messages)
7. AUTOMATION (Create workflow, Schedule tasks)

SMART FEATURES
- Multi-language understanding (Reply in the language spoken)
- Context awareness

FAILSAFES:
If unclear -> ask for clarification.
If risky (like delete DB) -> ask for confirmation.

VOICE RESPONSE STYLE:
- Short, Clear, Smart, Human-like
- E.g., "Opening Chrome", "Task completed"

OUTPUT FORMAT:
You MUST respond STRICTLY in JSON format with no markdown wrappers:
{
  "command": "<user exact voice input>",
  "intent": "<understood intent>",
  "steps": ["<step1>", "<step2>"],
  "action": "<what you are deciding to execute: e.g. 'open_chrome', 'sleep', 'none' if just chatting>",
  "status": "<success | clarification_needed | confirmation_needed>",
  "voice_reply": "<short spoken response to user>"
}
"""

async def process_voice_command(user_text: str) -> dict:
    """Sends the voice prompt to the LLM and parses the strict JSON output to execute actions."""
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_text}
            ],
            response_format={ "type": "json_object" }, # Force JSON
            temperature=0.3
        )
        
        result_text = response.choices[0].message.content
        ai_data = json.loads(result_text)
        
        return await execute_action(ai_data)
        
    except Exception as e:
        logger.error(f"Voice God Error: {str(e)}")
        return {
            "status": "error",
            "voice_reply": "My neural link was disturbed. Please try again."
        }

async def execute_action(ai_data: dict) -> dict:
    """Takes the AI's intended action and actually runs it on the Host PC."""
    action = ai_data.get("action", "").lower()
    
    # Example local system execution mappings
    if action == "open_chrome":
        try:
            subprocess.Popen(["start", "chrome"], shell=True)
            ai_data["status"] = "success"
        except:
            ai_data["status"] = "error"
            ai_data["voice_reply"] = "I had trouble starting Chrome."
            
    elif action == "open_vscode":
        try:
            subprocess.Popen(["code"], shell=True)
            ai_data["status"] = "success"
        except:
            pass

    # For safety on risky commands:
    elif action == "shutdown":
        ai_data["status"] = "confirmation_needed"
        ai_data["voice_reply"] = "Are you absolutely sure you want to shut down the system?"
        
    # Return the mutated state back to the UI
    return ai_data
