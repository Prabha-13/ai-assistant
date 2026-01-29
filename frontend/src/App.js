import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const API = "https://ai-assistant-zi8b.onrender.com";

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSessions = async () => {
    const res = await fetch(`${API}/sessions`);
    const data = await res.json();
    setSessions(data);
  };

  const loadHistory = async (id) => {
    const res = await fetch(`${API}/history/${id}`);
    const data = await res.json();
    setCurrentSession(id);
    setMessages(
      data.map((m) => ({
        sender: m.role === "user" ? "user" : "ai",
        text: m.content,
      }))
    );
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const res = await fetch(`${API}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMsg.text,
        session_id: currentSession,
      }),
    });

    const data = await res.json();
    setCurrentSession(data.session_id);
    fetchSessions();

    const aiMsg = { sender: "ai", text: data.reply };
    setMessages((prev) => [...prev, aiMsg]);
  };

  const newChat = () => {
    setCurrentSession(null);
    setMessages([]);
  };

  const deleteChat = async (id) => {
    await fetch(`${API}/delete/${id}`, { method: "DELETE" });
    if (id === currentSession) {
      setMessages([]);
      setCurrentSession(null);
    }
    fetchSessions();
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

    const res = await fetch(`${API}/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setCurrentSession(data.session_id);
    fetchSessions();

    setMessages((prev) => [
      ...prev,
      { sender: "user", text: question },
      { sender: "ai", text: data.reply },
    ]);
  };

  return (
    <div className="app">
      <div className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h2>AI Chats</h2>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
        </div>

        <button className="new-chat" onClick={newChat}>+ New Chat</button>

        {sessions.map((id) => (
          <div key={id} className="session-row">
            <span onClick={() => loadHistory(id)}>{id.slice(0, 8)}</span>
            <button onClick={() => deleteChat(id)}>🗑</button>
          </div>
        ))}
      </div>

      <div className="chat-area">
        <div className="header">AI Assistant</div>

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
          <button onClick={() => fileInputRef.current.click()}>📎</button>
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
