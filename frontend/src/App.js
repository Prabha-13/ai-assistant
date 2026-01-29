import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { FiSearch, FiPaperclip, FiMoon, FiSun, FiMenu } from "react-icons/fi";
import "./App.css";

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

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
    setMessages(
      data.map((m) => ({
        sender: m.role === "user" ? "user" : "ai",
        text: m.content
      }))
    );
    setSidebarOpen(false); // auto close on mobile
  };

  const sendMessage = async () => {
    if (!input.trim() && !selectedFile) return;

    const userMsg = {
      sender: "user",
      text: selectedFile ? `${input} (File: ${selectedFile.name})` : input
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    let responseData;

    if (selectedFile) {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("question", userMsg.text);
      if (currentSession) formData.append("session_id", currentSession);

      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData
      });
      responseData = await res.json();
      setSelectedFile(null);
    } else {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          session_id: currentSession
        })
      });
      responseData = await res.json();
    }

    setCurrentSession(responseData.session_id);
    fetchSessions();

    const aiMsg = { sender: "ai", text: responseData.reply };
    setMessages((prev) => [...prev, aiMsg]);
  };

  const newChat = () => {
    setCurrentSession(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  const deleteChat = async (id) => {
    await fetch(`http://127.0.0.1:8000/delete/${id}`, { method: "DELETE" });
    if (id === currentSession) {
      setMessages([]);
      setCurrentSession(null);
    }
    fetchSessions();
  };

  const filteredSessions = sessions.filter((id) =>
    id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="app">
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)}></div>}

      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <button className="new-chat" onClick={newChat}>+ New Chat</button>
          <FiSearch className="search-icon" onClick={() => setShowSearch(!showSearch)} />
        </div>

        {showSearch && (
          <input
            className="search-box"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        )}

        {filteredSessions.map((id) => (
          <div key={id} className="session-row">
            <span onClick={() => loadHistory(id)}>{id.slice(0, 8)}</span>
            <button onClick={() => deleteChat(id)}>🗑</button>
          </div>
        ))}
      </div>

      <div className="chat-area">
        <div className="header">
          <FiMenu className="hamburger" onClick={() => setSidebarOpen(true)} />
          <span>AI Assistant</span>
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <FiSun /> : <FiMoon />}
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

        {selectedFile && (
          <div className="file-preview">
            📄 {selectedFile.name}
            <span onClick={() => setSelectedFile(null)}> ✖</span>
          </div>
        )}

        <div className="input-box">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />

          <FiPaperclip
            className="upload-icon"
            onClick={() => fileInputRef.current.click()}
          />

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={(e) => setSelectedFile(e.target.files[0])}
            accept=".pdf,.txt,.docx,.png,.jpg,.jpeg"
          />

          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default App;
