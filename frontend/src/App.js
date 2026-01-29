import React, { useEffect, useState } from "react";
import "./App.css";

const API_BASE = "https://ai-assistant-zi8b.onrender.com";

function App() {
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (search.trim() === "") {
      setFilteredSessions(sessions);
    } else {
      setFilteredSessions(
        sessions.filter(s =>
          s.title.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, sessions]);

  const fetchSessions = async () => {
    const res = await fetch(`${API_BASE}/sessions`);
    const ids = await res.json();

    const withTitles = await Promise.all(
      ids.map(async (id) => {
        const h = await fetch(`${API_BASE}/history/${id}`);
        const msgs = await h.json();
        const firstUser = msgs.find(m => m.role === "user");
        const title = firstUser
          ? firstUser.content.split(" ").slice(0, 4).join(" ")
          : "New Chat";
        return { id, title };
      })
    );

    setSessions(withTitles);
    setFilteredSessions(withTitles);
  };

  const loadHistory = async (id) => {
    setCurrentSession(id);
    const res = await fetch(`${API_BASE}/history/${id}`);
    const data = await res.json();
    setMessages(data);
  };

  const newChat = () => {
    setCurrentSession(null);
    setMessages([]);
  };

  const deleteChat = async (id) => {
    await fetch(`${API_BASE}/delete/${id}`, { method: "DELETE" });
    fetchSessions();
    if (currentSession === id) {
      setCurrentSession(null);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);

    const payload = {
      message: input,
      session_id: currentSession
    };

    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    setCurrentSession(data.session_id);

    const h = await fetch(`${API_BASE}/history/${data.session_id}`);
    const fullHistory = await h.json();
    setMessages(fullHistory);

    setInput("");
    setLoading(false);
    fetchSessions();
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h2>AI Assistant</h2>
        <input
          className="search"
          placeholder="Search chats..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="newchat" onClick={newChat}>+ New Chat</button>

        <div className="sessions">
          {filteredSessions.map(chat => (
            <div
              key={chat.id}
              className={`session ${currentSession === chat.id ? "active" : ""}`}
              onClick={() => loadHistory(chat.id)}
            >
              {chat.title}
              <span
                className="delete"
                onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
              >🗑</span>
            </div>
          ))}
        </div>
      </div>

      <div className="chat">
        <div className="chat-header">AI Assistant</div>

        <div className="chat-body">
          {messages.length === 0 && (
            <div className="welcome">Hi 👋 How can I help you today?</div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              {m.content}
            </div>
          ))}
        </div>

        <div className="chat-input">
          <input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} disabled={loading}>
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
