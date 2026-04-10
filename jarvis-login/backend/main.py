from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel
import sqlite3
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
import datetime

# Security Configuration
API_KEY = "JARVIS-OMEGA-SECRET-999"
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)

def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key == API_KEY:
        return api_key
    raise HTTPException(status_code=403, detail="Invalid Neural Network Integrity. API Key rejected.")

# Initialize FastAPI App
app = FastAPI(title="JARVIS-OMEGA Core Engine")

# Add CORS Middleware so our HTML frontend can talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Initialization
DATABASE = "jarvis_matrix.db"

def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_name TEXT,
            email TEXT,
            mobile_number TEXT,
            auth_provider TEXT,
            last_login TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# Pydantic Models for Data Validation
class UserLogin(BaseModel):
    user_name: Optional[str] = None
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    auth_provider: str  # e.g., "Google", "OTP"

# API Endpoints
@app.get("/")
def read_root():
    return {"status": "JARVIS Mainframe Online", "database": "Connected"}

@app.post("/api/login")
def register_or_login_user(user: UserLogin, api_key: str = Depends(verify_api_key)):
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE mobile_number = ? OR email = ?", (user.mobile_number, user.email))
        existing_user = cursor.fetchone()
        
        current_time = datetime.datetime.now()

        if existing_user:
            # Update last login
            cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (current_time, existing_user[0]))
            message = "Welcome back, sir."
        else:
            # Insert new user into matrix
            cursor.execute('''
                INSERT INTO users (user_name, email, mobile_number, auth_provider, last_login)
                VALUES (?, ?, ?, ?, ?)
            ''', (user.user_name, user.email, user.mobile_number, user.auth_provider, current_time))
            message = "New neural link established. User registered."

        conn.commit()
        conn.close()
        
        return {"status": "success", "message": message, "provider": user.auth_provider}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database synchronization failed: {str(e)}")
