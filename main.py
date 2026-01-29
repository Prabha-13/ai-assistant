import json
import uuid
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai

app = FastAPI()

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Gemini API key from Render Environment Variable
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

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

    system_prompt = "You are a helpful AI assistant. Answer clearly and in simple words."
    full_prompt = system_prompt + "\n\n"

    for msg in history[session_id]:
        full_prompt += f"{msg['role']}: {msg['content']}\n"

    try:
        response = client.models.generate_content(
            model="models/gemini-2.0-flash",
            contents=full_prompt
        )
        ai_text = response.text
    except Exception as e:
        print("Gemini Error:", e)
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
