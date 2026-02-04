import React, { useState, useEffect, useRef } from "react"; 
import io from "socket.io-client"; 
import { useSound } from "../../../contexts/SoundContext";

// Conecta no seu backend usando o IP dinâmico do acesso atual
const getSocketUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:3001`;
  }
  return "http://localhost:3001";
};

const socket = io(getSocketUrl(), {
    transports: ['websocket', 'polling']
}); 

const COMMON_EMOJIS = ["💀", "💜", "🔥", "⚡", "🤖", "🎮", "🛸", "✨", "⛓️", "💊"];

function ChatTest() { 
  const { playSound } = useSound();
  const [username, setUsername] = useState(""); 
  const [room, setRoom] = useState(""); 
  const [showChat, setShowChat] = useState(false); 
  const [currentMessage, setCurrentMessage] = useState(""); 
  const [messageList, setMessageList] = useState<any[]>([]); 
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const joinRoom = () => { 
    if (username !== "" && room !== "") { 
      socket.emit("join_room", room); 
      setShowChat(true); 
    } 
  }; 

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentMessage(e.target.value);
    
    // Emitir evento de digitação
    socket.emit("typing", { room, username });

    // Limpar timeout anterior
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Definir timeout para parar de digitar após 2 segundos de inatividade
    typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing", { room, username });
    }, 2000);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const sendMessage = async () => { 
    if (currentMessage !== "" || selectedImage) { 
      const messageData = { 
        room: room, 
        author: username, 
        message: currentMessage, 
        imageUrl: selectedImage,
        time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes().toString().padStart(2, '0'), 
      }; 

      await socket.emit("send_message", messageData); 
      socket.emit("stop_typing", { room, username });
      
      setMessageList((list) => [...list, { ...messageData, status: 'sent' }]); 
      setCurrentMessage(""); 
      setSelectedImage(null);
    } 
  }; 

  const addEmoji = (emoji: string) => {
    setCurrentMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => { 
    const receiveHandler = (data: any) => { 
      setMessageList((list) => [...list, data]); 
      
      // Tocar som se a aba estiver em segundo plano ou não for o autor
      if (data.author !== username) {
        try {
            if (document.hidden) {
                playSound('blim');
            } else {
                playSound('notification');
            }
        } catch (e) {
            console.warn("Could not play notification sound:", e);
        }
      }
    }; 

    const typingHandler = (data: any) => {
        if (data.username !== username) {
            setIsOtherTyping(true);
            setTypingUser(data.username);
        }
    };

    const stopTypingHandler = (data: any) => {
        if (data.username !== username) {
            setIsOtherTyping(false);
        }
    };

    socket.on("receive_message", receiveHandler); 
    socket.on("display_typing", typingHandler);
    socket.on("hide_typing", stopTypingHandler);

    return () => { 
      socket.off("receive_message", receiveHandler); 
      socket.off("display_typing", typingHandler);
      socket.off("hide_typing", stopTypingHandler);
    }; 
  }, [username]); 

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageList, isOtherTyping]);

  return ( 
    <div style={{ 
      padding: '20px', 
      color: '#0f0', 
      background: '#050505', 
      minHeight: '100vh', 
      fontFamily: 'monospace',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}> 
      {!showChat ? ( 
        <div style={{ 
          background: '#111', 
          padding: '30px', 
          borderRadius: '10px', 
          border: '1px solid #0f0',
          boxShadow: '0 0 20px rgba(0, 255, 0, 0.2)',
          width: '100%',
          maxWidth: '400px'
        }}> 
          <h2 style={{ textAlign: 'center', marginBottom: '30px', textShadow: '0 0 10px #0f0' }}>[ CHRONO_PROTOCOL: CHAT ]</h2> 
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>IDENTIFICAÇÃO_USUÁRIO:</label>
            <input 
              type="text" 
              placeholder="Username..." 
              onChange={(event) => setUsername(event.target.value)} 
              style={{ width: '100%', padding: '12px', marginTop: '5px', background: '#000', color: '#0f0', border: '1px solid #0f0', outline: 'none' }} 
            /> 
          </div>
          <div style={{ marginBottom: '25px' }}>
            <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>FREQUÊNCIA_SALA:</label>
            <input 
              type="text" 
              placeholder="Room ID..." 
              onChange={(event) => setRoom(event.target.value)} 
              style={{ width: '100%', padding: '12px', marginTop: '5px', background: '#000', color: '#0f0', border: '1px solid #0f0', outline: 'none' }} 
            /> 
          </div>
          <button 
            onClick={joinRoom} 
            style={{ 
              width: '100%', 
              padding: '15px', 
              background: '#0f0', 
              color: '#000', 
              fontWeight: 'bold', 
              border: 'none', 
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}
          >
            Conectar ao Nexus
          </button> 
        </div> 
      ) : ( 
        <div style={{ 
          width: '100%', 
          maxWidth: '600px', 
          height: '80vh', 
          display: 'flex', 
          flexDirection: 'column',
          background: '#111',
          border: '1px solid #0f0',
          borderRadius: '5px',
          overflow: 'hidden',
          boxShadow: '0 0 30px rgba(0, 255, 0, 0.1)'
        }}> 
          {/* Header */}
          <div style={{ 
            padding: '15px', 
            background: '#000', 
            borderBottom: '1px solid #0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}> 
            <div>
                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>FREQUÊNCIA:</span>
                <span style={{ marginLeft: '10px', color: '#f0f' }}>{room}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0f0', marginRight: '8px', animation: 'pulse 2s infinite' }}></div>
                <span style={{ fontSize: '0.8rem' }}>{username}</span>
            </div>
          </div> 

          {/* Body */}
          <div style={{ 
            flexGrow: 1, 
            overflowY: 'auto', 
            padding: '20px', 
            background: 'linear-gradient(180deg, #000 0%, #111 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}> 
            {messageList.map((msg, index) => ( 
              <div key={index} style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: username === msg.author ? 'flex-end' : 'flex-start' 
              }}> 
                <div style={{ 
                  background: username === msg.author ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)', 
                  border: `1px solid ${username === msg.author ? '#0f0' : '#333'}`,
                  padding: '12px', 
                  borderRadius: '8px', 
                  maxWidth: '80%',
                  position: 'relative'
                }}> 
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Upload" style={{ maxWidth: '100%', borderRadius: '4px', marginBottom: '10px', border: '1px solid #222' }} />
                  )}
                  {msg.message && (
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4', wordBreak: 'break-word' }}>{msg.message}</p> 
                  )}
                  <div style={{ 
                    fontSize: '0.65rem', 
                    opacity: 0.5, 
                    marginTop: '8px', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '15px'
                  }}> 
                    <span>{msg.author}</span>
                    <span>{msg.time}</span>
                  </div> 
                </div> 
              </div> 
            ))} 
            
            {isOtherTyping && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.7 }}>
                    <div className="typing-dots" style={{ display: 'flex', gap: '4px' }}>
                        <span style={{ width: '4px', height: '4px', background: '#0f0', borderRadius: '50%', animation: 'typing 1s infinite' }}></span>
                        <span style={{ width: '4px', height: '4px', background: '#0f0', borderRadius: '50%', animation: 'typing 1s infinite 0.2s' }}></span>
                        <span style={{ width: '4px', height: '4px', background: '#0f0', borderRadius: '50%', animation: 'typing 1s infinite 0.4s' }}></span>
                    </div>
                    <span style={{ fontSize: '0.7rem' }}>{typingUser} está escrevendo...</span>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div> 

          {/* Footer / Input */}
          <div style={{ padding: '20px', background: '#000', borderTop: '1px solid #0f0' }}> 
            {selectedImage && (
                <div style={{ marginBottom: '15px', position: 'relative', display: 'inline-block' }}>
                    <img src={selectedImage} style={{ height: '80px', borderRadius: '5px', border: '1px solid #0f0' }} alt="Preview" />
                    <button 
                        onClick={() => setSelectedImage(null)}
                        style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#f00', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}
                    >×</button>
                </div>
            )}

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}> 
              <button 
                onClick={() => fileInputRef.current?.click()}
                style={{ background: 'none', border: '1px solid #333', color: '#0f0', padding: '8px', cursor: 'pointer', borderRadius: '4px' }}
                title="Upload Image"
              >
                🖼️
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} accept="image/*" />
              
              <div style={{ position: 'relative' }}>
                <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={{ background: 'none', border: '1px solid #333', color: '#0f0', padding: '8px', cursor: 'pointer', borderRadius: '4px' }}
                >
                    😊
                </button>
                {showEmojiPicker && (
                    <div style={{ 
                        position: 'absolute', bottom: '50px', left: '0', background: '#111', border: '1px solid #0f0', padding: '10px', borderRadius: '5px', display: 'flex', gap: '10px', zIndex: 10
                    }}>
                        {COMMON_EMOJIS.map(e => (
                            <span key={e} onClick={() => addEmoji(e)} style={{ cursor: 'pointer', fontSize: '1.2rem' }}>{e}</span>
                        ))}
                    </div>
                )}
              </div>

              <input 
                type="text" 
                value={currentMessage} 
                placeholder="Transmitir dados..." 
                onChange={handleTyping} 
                onKeyPress={(event) => { event.key === "Enter" && sendMessage(); }} 
                style={{ flexGrow: 1, padding: '12px', background: '#050505', color: '#0f0', border: '1px solid #333', outline: 'none', fontSize: '0.9rem' }} 
              /> 
              <button 
                onClick={sendMessage} 
                style={{ 
                    padding: '12px 25px', 
                    background: '#0f0', 
                    color: '#000', 
                    fontWeight: 'bold', 
                    border: 'none', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
              >
                ENVIAR
              </button> 
            </div> 
          </div> 
          
          <style>{`
            @keyframes pulse {
                0% { opacity: 0.3; }
                50% { opacity: 1; }
                100% { opacity: 0.3; }
            }
            @keyframes typing {
                0% { transform: translateY(0); }
                50% { transform: translateY(-3px); }
                100% { transform: translateY(0); }
            }
          `}</style>
        </div> 
      )} 
    </div> 
  ); 
} 

export default ChatTest; 
