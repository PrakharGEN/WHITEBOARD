import { useState, useEffect } from "react";

const ChatBox = ({ socket, user, roomId }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (socket) {
      socket.on("receiveMessage", (data) => {
        setMessages((prev) => [...prev, data]);
      });
    }

    return () => {
      if (socket) {
        socket.off("receiveMessage");
      }
    };
  }, [socket]);

  const handleSend = () => {
    if (message.trim()) {
      socket.emit("sendMessage", {
        roomId,
        name: user.name,
        message,
      });
      setMessage("");
    }
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", height: "400px", overflowY: "auto", backgroundColor: "#f9f9f9" }}>
      <div style={{ marginBottom: "1rem", maxHeight: "320px", overflowY: "auto" }}>
        {messages.map((msg, i) => (
          <div key={i}>
            <strong>{msg.name}</strong>: {msg.message} <small>({msg.timestamp})</small>
          </div>
        ))}
      </div>
      <div className="d-flex gap-2">
        <input
          className="form-control"
          value={message}
          placeholder="Type a message"
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button className="btn btn-primary" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;