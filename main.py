import json, uuid, os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import PyPDF2
from docx import Document
from PIL import Image
import io

app = FastAPI(title="AI Assistant (Groq + File Upload)")

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

def extract_text(file: UploadFile):
    content = ""

    if file.filename.endswith(".pdf"):
        reader = PyPDF2.PdfReader(file.file)
        for page in reader.pages:
            content += page.extract_text() + "\n"

    elif file.filename.endswith(".txt"):
        content = file.file.read().decode("utf-8")

    elif file.filename.endswith(".docx"):
        doc = Document(io.BytesIO(file.file.read()))
        for para in doc.paragraphs:
            content += para.text + "\n"

    elif file.filename.lower().endswith((".png", ".jpg", ".jpeg")):
        content = "Image uploaded. Please describe what you want to know about this image."

    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    return content.strip()

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

    messages = [{"role": "system", "content": "You are a helpful AI assistant. Answer clearly."}]
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

@app.post("/upload")
def upload_file(file: UploadFile = File(...), question: str = Form(...), session_id: str = Form(None)):
    text = extract_text(file)

    combined_prompt = f"""
File Content:
{text}

User Question:
{question}
"""

    return chat(ChatRequest(message=combined_prompt, session_id=session_id))

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
# 🔥 Serve React build as root
app.mount("/", StaticFiles(directory="frontend/build", html=True), name="frontend")