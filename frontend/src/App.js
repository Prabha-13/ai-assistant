import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const API_BASE = "https://ai-assistant-zi8b.onrender.com";

function App() {
  const [theme, setTheme] = useState("dark");
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState("");
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSessions = async () => {
    const res = await fetch(`${API_BASE}/sessions`);
    const data = await res.json();
    setSessions(data);
  };

  const loadHistory = async (id) => {
    const res = await fetch(`${API_BASE}/history/${id}`);
    const data = await res.json();
    setCurrentSession(id);
    setMessages(data.map(m => ({
      sender: m.role === "user" ? "user" : "ai",
      text: m.content
    })));
  };

  const sendMessage = async () => {
    if (!input.trim() && !file) return;

    const userMsg = { sender: "user", text: input || `📎 ${file.name}` };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    let response;

    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("question", input || "Analyze this file");
      if (currentSession) formData.append("session_id", currentSession);

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
          session_id: currentSession
        })
      });
    }

    const data = await response.json();
    setCurrentSession(data.session_id);
    fetchSessions();

    setMessages(prev => [...prev, { sender: "ai", text: data.reply }]);
  };

  const newChat = () => {
    setCurrentSession(null);
    setMessages([]);
  };

  const deleteChat = async (id) => {
    await fetch(`${API_BASE}/delete/${id}`, { method: "DELETE" });
    if (id === currentSession) {
      setCurrentSession(null);
      setMessages([]);
    }
    fetchSessions();
  };

  const filteredSessions = sessions.filter(id =>
    id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`app ${theme}`}>
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="title">AI Assistant</div>

        <input
          className="search"
          placeholder="Search chats..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <button className="newchat" onClick={newChat}>+ New Chat</button>

        <div className="session-list">
          {filteredSessions.map(id => (
            <div
              key={id}
              className={`session ${currentSession === id ? "active" : ""}`}
              onClick={() => loadHistory(id)}
            >
              {id.slice(0, 10)}
              <span
                style={{ float: "right", color: "red" }}
                onClick={(e) => { e.stopPropagation(); deleteChat(id); }}
              >🗑</span>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="chat-area">
        <div className="topbar">
          <span>AI Assistant</span>
          <button className="theme" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "🌙" : "☀️"}
          </button>
        </div>

        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome">Start a new conversation 👋</div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.sender}`}>
              <ReactMarkdown>{m.text}</ReactMarkdown>
            </div>
          ))}
          <div ref={bottomRef}></div>
        </div>

        {/* INPUT BAR */}
        <div className="input-bar">
          <label className="attach">
            📎
            <input
              type="file"
              hidden
              onChange={e => setFile(e.target.files[0])}
            />
          </label>

          <input
            type="text"
            placeholder={file ? `File: ${file.name}` : "Type a message..."}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
          />

          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default App;
