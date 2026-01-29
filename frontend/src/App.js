import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

function App() {
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState("");
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    document.body.className = darkMode ? "dark" : "light";
  }, [darkMode]);

  const fetchSessions = async () => {
    const res = await fetch("/sessions");
    const data = await res.json();
    setSessions(data);
  };

  const loadHistory = async (id) => {
    const res = await fetch(`/history/${id}`);
    const data = await res.json();
    setCurrentSession(id);
    setMessages(
      data.map((m) => ({
        sender: m.role === "user" ? "user" : "ai",
        text: m.content,
      }))
    );
    setSidebarOpen(false);
  };

  const sendMessage = async () => {
    if (!input.trim() && !selectedFile) return;

    const userMsg = { sender: "user", text: input || "[File Uploaded]" };
    setMessages((prev) => [...prev, userMsg]);

    let data;

    if (selectedFile) {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("question", input || "Explain this file");
      if (currentSession) formData.append("session_id", currentSession);

      const res = await fetch("/upload", {
        method: "POST",
        body: formData,
      });
      data = await res.json();
      setSelectedFile(null);
    } else {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          session_id: currentSession,
        }),
      });
      data = await res.json();
    }

    setCurrentSession(data.session_id);
    fetchSessions();

    const aiMsg = { sender: "ai", text: data.reply };
    setMessages((prev) => [...prev, aiMsg]);
    setInput("");
  };

  const newChat = () => {
    setCurrentSession(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  const deleteChat = async (id) => {
    await fetch(`/delete/${id}`, { method: "DELETE" });
    if (id === currentSession) {
      setMessages([]);
      setCurrentSession(null);
    }
    fetchSessions();
  };

  const filteredSessions = sessions.filter((id) =>
    id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app">
      <div className={`overlay ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)}></div>

      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <h2>AI Chats</h2>

        <button className="new-chat" onClick={newChat}>+ New Chat</button>

        <input
          className="search-box"
          placeholder="Search chats..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filteredSessions.map((id) => (
          <div key={id} className="session-row">
            <span onClick={() => loadHistory(id)}>{id.slice(0, 8)}</span>
            <button onClick={() => deleteChat(id)}>🗑</button>
          </div>
        ))}
      </div>

      <div className="chat-area">
        <div className="header">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <span>AI Assistant</span>
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "☀️" : "🌙"}
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
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message or upload a file..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />

          <button className="upload-btn" onClick={() => fileInputRef.current.click()}>📎</button>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={(e) => setSelectedFile(e.target.files[0])}
          />

          <button onClick={sendMessage}>Send</button>
        </div>

        {selectedFile && <div className="file-preview">Selected: {selectedFile.name}</div>}
      </div>
    </div>
  );
}

export default App;
