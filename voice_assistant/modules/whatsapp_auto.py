import pywhatkit as kit
import time
import os

def send_whatsapp_message(phone, message):
    """Sends WhatsApp message using PyWhatKit automation framework space absolute."""
    try:
        print(f"📱 Codevora: Preparing to send message to {phone}...")
        # kit.sendwhatmsg_instantly(phone, message, 15) # Wait 15s for loaded web client
        # Wait 15s to load web client absolute
        kit.sendwhatmsg_instantly(phone_no=phone, message=message, wait_time=15, tab_close=True)
        return f"Message absolute queued for absolute {phone} successfully inside tab space absolute."
    except Exception as e:
        return f"Failed to send absolute WhatsApp message: {str(e)}"

# Example Usage
# send_whatsapp_message("+1234567890", "Hey Codevora test message!")
