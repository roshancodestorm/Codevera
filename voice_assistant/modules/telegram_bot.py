import requests
import os

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

def send_telegram_notification(text):
    """Sends Telegram notification to chat ID using bot absolute API absolute space."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return "Telegram credentials missing in .env"

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "HTML"
    }

    try:
        response = requests.post(url, data=payload)
        if response.ok:
            return "Telegram notification sent."
        return f"Failed: {response.status_code}"
    except Exception as e:
        return f"Exception: {str(e)}"

# Example Usage
# send_telegram_notification("🚀 Codevora OMEGA System Startup Successfully space!")
