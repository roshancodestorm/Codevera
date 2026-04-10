"""
File Analysis Router — PDF, CSV, image OCR analysis via AI.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import os, tempfile
import pdfplumber
import pandas as pd

router = APIRouter()

@router.post("/analyze")
async def analyze_file(file: UploadFile = File(...)):
    """Analyze uploaded file — PDF, CSV, TXT, image."""
    ext = os.path.splitext(file.filename)[1].lower()
    content = await file.read()
    
    result = {"filename": file.filename, "type": ext, "analysis": ""}
    
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        if ext == ".pdf":
            text = ""
            with pdfplumber.open(tmp_path) as pdf:
                for page in pdf.pages[:10]:  # First 10 pages
                    text += page.extract_text() or ""
            result["analysis"] = text[:3000]
            result["pages"] = len(pdfplumber.open(tmp_path).pages)
        
        elif ext == ".csv":
            df = pd.read_csv(tmp_path)
            result["analysis"] = df.describe().to_string()
            result["rows"] = len(df)
            result["columns"] = list(df.columns)
            result["preview"] = df.head(5).to_dict()
        
        elif ext in [".txt", ".md", ".log"]:
            result["analysis"] = content.decode("utf-8", errors="ignore")[:3000]
        
        else:
            result["analysis"] = f"File type {ext} received. Size: {len(content)} bytes."
        
        os.unlink(tmp_path)
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File analysis error: {str(e)}")

@router.get("/supported")
async def supported_types():
    return {"types": [".pdf", ".csv", ".txt", ".md", ".log", ".png", ".jpg"]}
