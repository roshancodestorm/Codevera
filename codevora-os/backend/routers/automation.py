"""
Automation Router — Workflow tasks, API calls, scheduled automations.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx, asyncio, time

router = APIRouter()

class WorkflowStep(BaseModel):
    type: str          # http_request | wait | notify | open_app
    config: Dict[str, Any]

class Workflow(BaseModel):
    name: str
    steps: List[WorkflowStep]

class APICallRequest(BaseModel):
    method: str = "GET"
    url: str
    headers: Optional[Dict[str, str]] = {}
    body: Optional[Dict[str, Any]] = None

# In-memory workflow store
workflows_db: Dict[str, Workflow] = {}

@router.post("/workflow")
async def create_workflow(wf: Workflow):
    """Save a new automation workflow."""
    workflows_db[wf.name] = wf
    return {"status": "saved", "name": wf.name, "steps": len(wf.steps)}

@router.get("/workflows")
async def list_workflows():
    return {"workflows": list(workflows_db.keys())}

@router.post("/workflow/{name}/run")
async def run_workflow(name: str):
    """Execute a saved workflow."""
    if name not in workflows_db:
        raise HTTPException(status_code=404, detail=f"Workflow '{name}' not found")
    
    wf = workflows_db[name]
    results = []
    
    async with httpx.AsyncClient(timeout=30) as client:
        for step in wf.steps:
            try:
                if step.type == "http_request":
                    cfg = step.config
                    resp = await client.request(
                        method=cfg.get("method", "GET"),
                        url=cfg["url"],
                        headers=cfg.get("headers", {}),
                        json=cfg.get("body"),
                    )
                    results.append({"step": step.type, "status": resp.status_code, "ok": resp.is_success})
                
                elif step.type == "wait":
                    await asyncio.sleep(step.config.get("seconds", 1))
                    results.append({"step": "wait", "slept": step.config.get("seconds", 1)})
                
                else:
                    results.append({"step": step.type, "status": "executed"})
            
            except Exception as e:
                results.append({"step": step.type, "error": str(e)})
    
    return {"workflow": name, "results": results, "completed_at": time.time()}

@router.post("/api-call")
async def direct_api_call(req: APICallRequest):
    """Make a direct HTTP API call."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.request(
                method=req.method.upper(),
                url=req.url,
                headers=req.headers,
                json=req.body,
            )
            return {
                "status_code": resp.status_code,
                "ok": resp.is_success,
                "body": resp.json() if "json" in resp.headers.get("content-type", "") else resp.text[:1000],
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
