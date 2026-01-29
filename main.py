import json
import uuid
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from groq import Groq

app = FastAPI(title="AI Assistant (Groq)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

HISTORY_FILE = "history.json"

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None

def load_history():
    try:
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    except:
        return {}

def save_history(data):
    with open(HISTORY_FILE, "w") as f:
        json.dump(data, f, indent=2)

@app.post("/chat")
def chat(req: ChatRequest):
    history = load_history()

    if not req.session_id:
        session_id = str(uuid.uuid4())
        history[session_id] = []
    else:
        session_id = req.session_id
        if session_id not in history:
            history[session_id] = []

    history[session_id].append({"role": "user", "content": req.message})

    messages = [
        {"role": "system", "content": "You are a helpful AI assistant. Answer clearly in simple words."}
    ]

    for msg in history[session_id]:
        role = "assistant" if msg["role"] == "ai" else "user"
        messages.append({"role": role, "content": msg["content"]})

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages
        )
        ai_text = response.choices[0].message.content
    except Exception as e:
        ai_text = f"AI Error: {str(e)}"

    history[session_id].append({"role": "ai", "content": ai_text})
    save_history(history)

    return {
        "reply": ai_text,
        "session_id": session_id
    }

@app.get("/sessions")
def get_sessions():
    history = load_history()
    return list(history.keys())

@app.get("/history/{session_id}")
def get_history(session_id: str):
    history = load_history()
    return history.get(session_id, [])

@app.delete("/delete/{session_id}")
def delete_session(session_id: str):
    history = load_history()
    if session_id in history:
        del history[session_id]
        save_history(history)
        return {"status": "deleted"}
    else:
        raise HTTPException(status_code=404, detail="Session not found")

# Serve React build
app.mount("/", StaticFiles(directory="frontend/build", html=True), name="frontend")
