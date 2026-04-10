"""
System / Desktop Control Router
Open apps, manage files, run system commands, get hardware stats.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os, subprocess, platform, psutil, time

router = APIRouter()

APP_MAP = {
    "chrome":    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "vscode":    os.path.join(os.environ.get("LOCALAPPDATA", ""), r"Programs\Microsoft VS Code\Code.exe"),
    "notepad":   "notepad.exe",
    "calculator":"calc.exe",
    "explorer":  "explorer.exe",
    "terminal":  "wt.exe",
    "paint":     "mspaint.exe",
    "word":      r"C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE",
    "excel":     r"C:\Program Files\Microsoft Office\root\Office16\EXCEL.EXE",
}

class AppCommand(BaseModel):
    app: str
    args: Optional[str] = None

class SystemCommand(BaseModel):
    action: str  # shutdown | restart | lock | sleep | volume_up | volume_down

class FileCommand(BaseModel):
    action: str   # open | delete | move | copy | list
    path: str
    dest: Optional[str] = None

@router.post("/open-app")
async def open_app(cmd: AppCommand):
    """Open a desktop application by name."""
    key = cmd.app.lower().replace(" ", "")
    exe = APP_MAP.get(key)
    
    if not exe:
        # Try to open directly in case user provided full path
        exe = cmd.app
    
    try:
        args = [exe]
        if cmd.args:
            args.append(cmd.args)
        subprocess.Popen(args, shell=True)
        return {"status": "success", "message": f"Opened {cmd.app}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open {cmd.app}: {e}")

@router.post("/command")
async def system_command(cmd: SystemCommand):
    """Execute system-level commands."""
    actions = {
        "shutdown":    ("shutdown /s /t 5", "Shutting down in 5 seconds"),
        "restart":     ("shutdown /r /t 5", "Restarting in 5 seconds"),
        "lock":        ("rundll32.exe user32.dll,LockWorkStation", "Locking workstation"),
        "sleep":       ("rundll32.exe powrprof.dll,SetSuspendState 0,1,0", "Going to sleep"),
        "volume_up":   ("nircmd.exe changesysvolume 5000", "Volume increased"),
        "volume_down": ("nircmd.exe changesysvolume -5000", "Volume decreased"),
    }
    
    action = cmd.action.lower()
    if action not in actions:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")
    
    shell_cmd, msg = actions[action]
    try:
        os.system(shell_cmd)
        return {"status": "success", "message": msg}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def system_stats():
    """Return real-time CPU, RAM, disk usage."""
    cpu = psutil.cpu_percent(interval=0.5)
    ram = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    net = psutil.net_io_counters()
    
    return {
        "cpu_percent": cpu,
        "ram": {
            "total_gb": round(ram.total / 1e9, 2),
            "used_gb":  round(ram.used  / 1e9, 2),
            "percent":  ram.percent,
        },
        "disk": {
            "total_gb": round(disk.total / 1e9, 2),
            "used_gb":  round(disk.used  / 1e9, 2),
            "percent":  disk.percent,
        },
        "network": {
            "sent_mb": round(net.bytes_sent / 1e6, 2),
            "recv_mb": round(net.bytes_recv / 1e6, 2),
        },
        "platform": platform.system(),
        "timestamp": time.time(),
    }

@router.get("/apps")
async def list_apps():
    """Return list of controllable apps."""
    return {"apps": list(APP_MAP.keys())}
