import React, { useEffect, useState } from 'react';

const Chat = ({ socket, roomId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!socket) return; // <-- guard: do nothing if socket not ready

    const handleMessage = msg => setMessages(prev => [...prev, msg]);

    socket.on('receive-message', handleMessage);

    // Clean up listener on unmount
    return () => {
      socket.off('receive-message', handleMessage);
    };
  }, [socket]);

  const sendMessage = e => {
    e.preventDefault();
    if (!socket) return; // <-- guard in case socket is null
    socket.emit('send-message', { roomId, message: input });
    setInput('');
  };

  return (
    <div>
      <div>
        {messages.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>
      <form onSubmit={sendMessage}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default Chat;
