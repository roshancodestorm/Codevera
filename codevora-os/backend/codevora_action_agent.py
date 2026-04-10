import os
import time
import json
import subprocess
import pyautogui
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from openai import OpenAI
from dotenv import load_load

load_dotenv()

# Initialize OpenAI Client (Make sure OPENAI_API_KEY is in .env)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ═══ SYSTEM DEFINITION PROMPT ═══
AGENT_SYSTEM_PROMPT = """
You are CODEVORA-ACTION-AGENT, a powerful AI system that controls applications, files, browsers, and automation workflows.
Your mission is to understand user intents and safely translate them into sequential, executable JSON steps.

ACTION TYPES YOU SUPPORT:
1. APPLICATION_CONTROL: "open chrome", "open notepad", "close app"
2. FILE_OPERATIONS: "create file", "delete file"
3. WEB_AUTOMATION: "search google", "open website"
4. SYSTEM_CONTROL: "volume up", "shutdown"

SAFETY RULES:
- Never execute harmful commands (like formatting drives or deleting system dirs).
- If the user asks to shutdown or delete important files, flag status as "requires_confirmation".

STRICT OUTPUT FORMAT (Valid JSON only):
{
  "command": "<The natural language command you received>",
  "steps": [
    {"action": "open_app", "target": "chrome"},
    {"action": "web_search", "target": "python tutorial"}
  ],
  "tools_used": ["browser", "system"],
  "status": "safe_to_execute",
  "response": "Understood. Searching for Python tutorials now."
}
"""

def parse_user_command(user_text: str) -> dict:
    """Sends the natural language to OpenAI and enforces the structured JSON output."""
    try:
        completion = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": AGENT_SYSTEM_PROMPT},
                {"role": "user", "content": user_text}
            ],
            temperature=0.3
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        return {"status": "error", "response": f"Failed to connect to Neural Network: {e}"}

def execute_browser_automation(steps):
    """Executes Selenium-based web scraping and navigation."""
    print("[+] Launching Codevora WebDriver (Selenium)...")
    options = webdriver.ChromeOptions()
    options.add_experimental_option("detach", True) # Keep browser open after script finishes
    driver = webdriver.Chrome(options=options)
    
    for step in steps:
        action = step.get("action")
        target = step.get("target")

        if action == "open_website":
            # Basic HTTP formatting
            if not target.startswith("http"): target = "https://" + target
            driver.get(target)
            time.sleep(2)
            
        elif action == "web_search":
            driver.get("https://www.google.com")
            search_box = driver.find_element(By.NAME, "q")
            search_box.send_keys(target)
            search_box.send_keys(Keys.RETURN)
            time.sleep(2)
            
        elif action == "click_first_result":
            # Clicks the first standard Google Search result header
            try:
                first_result = driver.find_element(By.CSS_SELECTOR, "div.yuRUbf h3")
                first_result.click()
            except Exception as e:
                print(f"[-] Could not find the first result: {e}")

def execute_system_automation(steps):
    """Executes PyAutoGUI and Subprocess actions locally on the OS."""
    for step in steps:
        action = step.get("action")
        target = step.get("target")

        if action == "open_app":
            print(f"[+] Opening native application: {target}")
            if os.name == 'nt':  # Windows
                os.system(f"start {target}")
            else:  # Mac/Linux
                os.system(f"open -a {target}" if sys.platform == 'darwin' else f"{target} &")
                
        elif action == "volume_up":
            print("[+] Triggering Keyboard Volume Up Event")
            for _ in range(5):
                pyautogui.press("volumeup")
                time.sleep(0.1)
                
        elif action == "volume_down":
            print("[+] Triggering Keyboard Volume Down Event")
            for _ in range(5):
                pyautogui.press("volumedown")
                time.sleep(0.1)

def execute_plan(plan: dict):
    """Takes the JSON plan from OpenAI and hands it off to physical executors."""
    status = plan.get("status", "error")
    steps = plan.get("steps", [])
    
    if status == "requires_confirmation":
        print(f"[!] WARNING: The action requires safety confirmation.\nResponse: {plan.get('response')}")
        user_input = input("Type 'YES' to override safety and execute: ")
        if user_input.upper() != 'YES':
            print("[-] Task aborted by user.")
            return

    if status == "error":
        print(f"[-] Agent Error: {plan.get('response')}")
        return

    print(f"\n[CODEVORA AI]: {plan.get('response')}")
    print("[+] Executing Universal Task Plan...")
    
    tools = plan.get("tools_used", [])
    
    # Route execution based on required tools
    if "browser" in tools or any("web" in step.get("action", "") for step in steps):
        execute_browser_automation(steps)
        
    if "system" in tools or any("app" in step.get("action", "") for step in steps):
        execute_system_automation(steps)

    print("[✔] Task Processing Complete.")

# --- Testing System ---
if __name__ == "__main__":
    print("═══ CODEVORA ACTION AGENT ONLINE ═══")
    while True:
        try:
            command = input("\n[Commander] Please state your intent: ")
            if command.lower() in ['exit', 'quit']:
                break
                
            print("[...] AI Generating Execution Plan...")
            json_plan = parse_user_command(command)
            
            # Output structured format for debugging
            print("\n[+] Structured Automation Plan:")
            print(json.dumps(json_plan, indent=2))
            
            execute_plan(json_plan)
            
        except KeyboardInterrupt:
            print("\nShutting down action agent.")
            break
