import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSessions = async () => {
    const res = await fetch("http://127.0.0.1:8000/sessions");
    const data = await res.json();
    setSessions(data);
  };

  const loadHistory = async (id) => {
    const res = await fetch(`http://127.0.0.1:8000/history/${id}`);
    const data = await res.json();
    setCurrentSession(id);
    setMessages(data.map(m => ({
      sender: m.role === "user" ? "user" : "ai",
      text: m.content
    })));
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: "user", text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    const res = await fetch("http://127.0.0.1:8000/chat", {
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
    setMessages(prev => [...prev, aiMsg]);
  };

  const newChat = () => {
    setCurrentSession(null);
    setMessages([]);
  };

  const deleteChat = async (id) => {
    await fetch(`http://127.0.0.1:8000/delete/${id}`, { method: "DELETE" });
    if (id === currentSession) {
      setMessages([]);
      setCurrentSession(null);
    }
    fetchSessions();
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h2>AI Chats</h2>
        <button className="new-chat" onClick={newChat}>+ New Chat</button>

        {sessions.map(id => (
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
            onChange={e => setInput(e.target.value)}
            placeholder="Send a message..."
            onKeyDown={e => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default App;
