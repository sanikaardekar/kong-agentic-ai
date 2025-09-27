import os
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from agent import process_user_input
import random
import string

load_dotenv()

app = FastAPI(title="Agent Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    success: bool
    response: str
    timestamp: str

@app.get("/health")
async def health_check():
    return {"ok": True}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    request_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=7))
    print(f"\n[API-{request_id}] Incoming chat request")
    
    try:
        if not request.message.strip():
            print(f"[API-{request_id}] Empty message received")
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        print(f"[API-{request_id}] Processing message: \"{request.message}\"")
        
        start_time = time.time()
        response = process_user_input(request.message)
        duration = int((time.time() - start_time) * 1000)
        
        print(f"[API-{request_id}] Request completed in {duration}ms")
        print(f"[API-{request_id}] Sending response to client\n")
        
        return ChatResponse(
            success=True,
            response=response,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%S")
        )
        
    except Exception as err:
        print(f"[API-{request_id}] Request failed: {str(err)}")
        raise HTTPException(status_code=500, detail=str(err))

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 6000))
    print("\n" + "=" * 60)
    print("AGENT SERVICE STARTED")
    print("=" * 60)
    print(f"Server listening on port: {port}")
    print("Available tools: job_search, find_emails, draft_email")
    print("Endpoint: POST /chat")
    print("Health check: GET /health")
    print("=" * 60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=port)