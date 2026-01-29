import json
import uuid
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from groq import Groq

app = FastAPI(title="AI Assistant")

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
    if not os.path.exists(HISTORY_FILE):
        return {}
    with open(HISTORY_FILE, "r") as f:
        return json.load(f)


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
        {"role": "system", "content": "You are a helpful AI assistant. Answer clearly and simply."}
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

    return {"reply": ai_text, "session_id": session_id}


@app.get("/sessions")
def get_sessions():
    return list(load_history().keys())


@app.get("/history/{session_id}")
def get_history(session_id: str):
    return load_history().get(session_id, [])


@app.delete("/delete/{session_id}")
def delete_session(session_id: str):
    history = load_history()
    if session_id in history:
        del history[session_id]
        save_history(history)
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Session not found")


# ---------- Serve React Build ----------
if os.path.exists("frontend/build"):
    app.mount("/static", StaticFiles(directory="frontend/build/static"), name="static")

    @app.get("/")
    def serve_react():
        return FileResponse("frontend/build/index.html")
