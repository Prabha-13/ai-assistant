import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const API_BASE = "https://ai-assistant-zi8b.onrender.com";

function App() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [file, setFile] = useState(null);
  const [dark, setDark] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSessions = async () => {
    const res = await fetch(`${API_BASE}/sessions`);
    const data = await res.json();
    setSessions(data.reverse());
  };

  const loadHistory = async (id) => {
    const res = await fetch(`${API_BASE}/history/${id}`);
    const data = await res.json();
    setActiveSession(id);
    setMessages(data);
  };

  const newChat = () => {
    setActiveSession(null);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!input && !file) return;

    let formData;
    let response;

    if (file) {
      formData = new FormData();
      formData.append("file", file);
      formData.append("question", input || "Explain this file");
      if (activeSession) formData.append("session_id", activeSession);

      response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData
      });
      setFile(null);
    } else {
      response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          session_id: activeSession
        })
      });
    }

    const data = await response.json();
    setActiveSession(data.session_id);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: input },
      { role: "ai", content: data.reply }
    ]);
    setInput("");
    loadSessions();
  };

  return (
    <div className={`app ${dark ? "dark" : "light"}`}>
      <aside className="sidebar">
        <h2>AI Assistant</h2>
        <input
          className="search"
          placeholder="Search chats..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="newchat" onClick={newChat}>+ New Chat</button>

        <div className="chatlist">
          {sessions
            .filter(id => id.includes(search))
            .map(id => (
              <div
                key={id}
                className={`chatitem ${id === activeSession ? "active" : ""}`}
                onClick={() => loadHistory(id)}
              >
                {id.slice(0, 8)}
              </div>
            ))}
        </div>
      </aside>

      <main className="chat">
        <header>
          <h3>AI Assistant</h3>
          <button className="theme" onClick={() => setDark(!dark)}>
            {dark ? "🌙" : "☀️"}
          </button>
        </header>

        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome">Hi 👋 How can I help you today?</div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              {m.content}
            </div>
          ))}
          <div ref={bottomRef}></div>
        </div>

        <div className="inputbar">
          <label className="attach">
            📎
            <input type="file" hidden onChange={(e) => setFile(e.target.files[0])} />
          </label>
          <input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </main>
    </div>
  );
}

export default App;
