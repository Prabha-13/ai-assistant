import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const API_BASE = import.meta.env.PROD
  ? "https://ai-assistant-zi8b.onrender.com"
  : "http://127.0.0.1:8000";

function App() {
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([
    { sender: "ai", text: "Hi 👋 How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState("dark");
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredSessions(sessions);
    } else {
      setFilteredSessions(
        sessions.filter((s) =>
          s.title.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, sessions]);

  const fetchSessions = async () => {
    const res = await fetch(`${API_BASE}/sessions`);
    const ids = await res.json();

    const sessionWithTitles = await Promise.all(
      ids.map(async (id) => {
        const h = await fetch(`${API_BASE}/history/${id}`);
        const data = await h.json();
        const firstUserMsg = data.find((m) => m.role === "user");
        return {
          id,
          title: firstUserMsg ? firstUserMsg.content.slice(0, 30) : "New Chat"
        };
      })
    );

    setSessions(sessionWithTitles);
    setFilteredSessions(sessionWithTitles);
  };

  const loadHistory = async (id) => {
    const res = await fetch(`${API_BASE}/history/${id}`);
    const data = await res.json();
    setCurrentSession(id);
    setMessages(
      data.map((m) => ({
        sender: m.role === "user" ? "user" : "ai",
        text: m.content
      }))
    );
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMsg.text,
        session_id: currentSession
      })
    });

    const data = await res.json();
    setCurrentSession(data.session_id);
    fetchSessions();

    const aiMsg = { sender: "ai", text: data.reply };
    setMessages((prev) => [...prev, aiMsg]);
  };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const question = prompt("Ask something about this file:");
    if (!question) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("question", question);
    if (currentSession) formData.append("session_id", currentSession);

    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    setCurrentSession(data.session_id);
    fetchSessions();

    setMessages((prev) => [
      ...prev,
      { sender: "user", text: question },
      { sender: "ai", text: data.reply }
    ]);
  };

  const newChat = () => {
    setCurrentSession(null);
    setMessages([{ sender: "ai", text: "Hi 👋 How can I help you today?" }]);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const deleteChat = async (id) => {
    await fetch(`${API_BASE}/delete/${id}`, { method: "DELETE" });
    if (id === currentSession) {
      setMessages([{ sender: "ai", text: "Hi 👋 How can I help you today?" }]);
      setCurrentSession(null);
    }
    fetchSessions();
  };

  return (
    <div className="app">
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      <div className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h2>AI Assistant</h2>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
        </div>

        <input
          className="search-box"
          placeholder="Search chats..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button className="new-chat" onClick={newChat}>+ New Chat</button>

        <div className="chat-list">
          {filteredSessions.map((s) => (
            <div key={s.id} className="session-row">
              <span onClick={() => loadHistory(s.id)}>{s.title}</span>
              <button onClick={() => deleteChat(s.id)}>🗑</button>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-area">
        <div className="header">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <span>AI Assistant</span>
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "🌞" : "🌙"}
          </button>
        </div>

        <div className="messages">
          {messages.map((m, i) => (
            <div key={i} className={m.sender === "user" ? "user-bubble" : "ai-bubble"}>
              <ReactMarkdown>{m.text}</ReactMarkdown>
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>

        <div className="input-box">
          <button className="clip-btn" onClick={() => fileInputRef.current.click()}>📎</button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage}>Send</button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={uploadFile}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
