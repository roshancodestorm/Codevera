"""
Telegram Bot — CODEVORA-OS communication module.
Run standalone: python telegram_bot.py
"""

import asyncio, os
from dotenv import load_dotenv
load_dotenv()

from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
import httpx

BACKEND_URL = "http://localhost:8000"
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🤖 *CODEVORA-OS Online*\nI'm your AI assistant. Ask me anything!",
        parse_mode="Markdown"
    )

async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    user_msg = update.message.text
    await update.message.reply_text("⚡ Processing...")
    
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/chat/",
                json={"message": user_msg, "include_memory": True}
            )
            reply = resp.json().get("reply", "Sorry, brain error.")
    except:
        reply = "⚠️ Backend offline. Start the CODEVORA-OS server."
    
    await update.message.reply_text(f"🧠 {reply}")

async def stats_command(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{BACKEND_URL}/api/system/stats")
            s = resp.json()
        await update.message.reply_text(
            f"📊 *System Stats*\n"
            f"CPU: {s['cpu_percent']}%\n"
            f"RAM: {s['ram']['used_gb']}GB / {s['ram']['total_gb']}GB ({s['ram']['percent']}%)\n"
            f"Disk: {s['disk']['used_gb']}GB / {s['disk']['total_gb']}GB ({s['disk']['percent']}%)",
            parse_mode="Markdown"
        )
    except:
        await update.message.reply_text("⚠️ Could not fetch stats.")

def run_bot():
    if not TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN not set in .env")
        return
    
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("stats", stats_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    print("🤖 CODEVORA Telegram Bot running...")
    app.run_polling()

if __name__ == "__main__":
    run_bot()
