import json
import uuid
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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

    history[session_id].append({"role": "user", "content": req.message})

    messages = [{"role": "system", "content": "You are a helpful AI assistant. Answer clearly and in simple words."}]
    for m in history[session_id]:
        messages.append({"role": m["role"], "content": m["content"]})

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages
        )
        ai_text = response.choices[0].message.content
    except Exception as e:
        print("OpenAI Error:", e)
        ai_text = f"AI Error: {str(e)}"

    history[session_id].append({"role": "assistant", "content": ai_text})
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
