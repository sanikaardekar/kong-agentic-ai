import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from agent import process_user_input

load_dotenv()

app = FastAPI(title="Agent Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.get("/health")
async def health_check():
    return {"ok": True, "service": "agent-service"}

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    print(f"\n[API] Received: {request.message}")
    
    try:
        if not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        result = process_user_input(request.message)
        
        print(f"[API] Sending response\n")
        
        return {
            "success": True,
            "response": result.get("response", ""),
            "jobs": result.get("jobs", []),
            "intent": result.get("intent", "unknown")
        }
        
    except Exception as err:
        print(f"[API] Error: {str(err)}")
        raise HTTPException(status_code=500, detail=str(err))

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 6001))
    print(f"\n{'='*60}")
    print("AGENT SERVICE STARTED")
    print(f"{'='*60}")
    print(f"Port: {port}")
    print(f"Endpoint: POST /chat")
    print(f"Health: GET /health")
    print(f"{'='*60}\n")
    
    uvicorn.run(app, host="0.0.0.0", port=port)
