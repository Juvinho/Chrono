import React, { useState, useEffect } from "react"; 
import io from "socket.io-client"; 

// Conecta no seu backend usando o IP dinâmico do acesso atual
const getSocketUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Se estiver no localhost, usa 3001. Se estiver no IP, usa o IP:3001
    return `http://${hostname}:3001`;
  }
  return "http://localhost:3001";
};

const socket = io(getSocketUrl(), {
    transports: ['websocket', 'polling']
}); 

function ChatTest() { 
  const [username, setUsername] = useState(""); // Nome do usuário (simulado) 
  const [room, setRoom] = useState(""); // ID da sala (ex: "sala1") 
  const [showChat, setShowChat] = useState(false); // Só mostra o chat depois de entrar na sala 
  const [currentMessage, setCurrentMessage] = useState(""); 
  const [messageList, setMessageList] = useState<any[]>([]); 

  const joinRoom = () => { 
    if (username !== "" && room !== "") { 
      socket.emit("join_room", room); // Avisa o back que entrou na sala 
      setShowChat(true); 
    } 
  }; 

  const sendMessage = async () => { 
    if (currentMessage !== "") { 
      const messageData = { 
        room: room, 
        author: username, 
        message: currentMessage, 
        time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(), 
      }; 

      // Manda pro backend 
      await socket.emit("send_message", messageData); 
      
      // Adiciona na minha própria tela (pra eu ver o que escrevi) 
      setMessageList((list) => [...list, messageData]); 
      setCurrentMessage(""); 
    } 
  }; 

  // O Hook Mágico que ouve as mensagens (FORA DE IFs e LOOPS) 
  useEffect(() => { 
    // Escuta o evento 'receive_message' vindo do servidor 
    const receiveHandler = (data: any) => { 
      setMessageList((list) => [...list, data]); 
    }; 

    socket.on("receive_message", receiveHandler); 

    // Limpeza para não duplicar mensagens (Evita o erro de renderização) 
    return () => { 
      socket.off("receive_message", receiveHandler); 
    }; 
  }, []); 

  return ( 
    <div className="App" style={{ padding: '20px', color: 'white', background: '#111', minHeight: '100vh' }}> 
      {!showChat ? ( 
        <div className="joinChatContainer"> 
          <h3 style={{ color: '#0f0', fontFamily: 'monospace' }}>ENTRAR NO CHRONO_CHAT_TEST</h3> 
          <input 
            type="text" 
            placeholder="Seu Nick..." 
            onChange={(event) => setUsername(event.target.value)} 
            style={{ display: 'block', margin: '10px 0', padding: '10px', background: '#000', color: '#0f0', border: '1px solid #333' }} 
          /> 
          <input 
            type="text" 
            placeholder="ID da Sala (ex: 123)..." 
            onChange={(event) => setRoom(event.target.value)} 
            style={{ display: 'block', margin: '10px 0', padding: '10px', background: '#000', color: '#0f0', border: '1px solid #333' }} 
          /> 
          <button onClick={joinRoom} style={{ padding: '10px 20px', background: '#0f0', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>CONECTAR</button> 
        </div> 
      ) : ( 
        <div className="chat-window"> 
          <div className="chat-header"> 
            <p>SALA_ID: {room}</p> 
          </div> 
          <div className="chat-body" style={{ height: '300px', border: '1px solid #333', overflowY: 'scroll', padding: '10px', background: '#000' }}> 
            {messageList.map((messageContent, index) => { 
              return ( 
                <div key={index} className="message" style={{ display: 'flex', justifyContent: username === messageContent.author ? 'flex-end' : 'flex-start' }}> 
                  <div style={{ background: username === messageContent.author ? '#4caf50' : '#333', padding: '8px', margin: '5px', borderRadius: '5px', maxWidth: '80%' }}> 
                    <div className="message-content"> 
                      <p style={{ margin: 0 }}>{messageContent.message}</p> 
                    </div> 
                    <div className="message-meta" style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}> 
                      <span id="time">{messageContent.time}</span> 
                      <span id="author" style={{ fontWeight: 'bold', marginLeft: '10px' }}>{messageContent.author}</span> 
                    </div> 
                  </div> 
                </div> 
              ); 
            })} 
          </div> 
          <div className="chat-footer" style={{ marginTop: '10px', display: 'flex' }}> 
            <input 
              type="text" 
              value={currentMessage} 
              placeholder="Digite sua mensagem..." 
              onChange={(event) => setCurrentMessage(event.target.value)} 
              onKeyPress={(event) => { event.key === "Enter" && sendMessage(); }} 
              style={{ flexGrow: 1, padding: '10px', background: '#000', color: '#0f0', border: '1px solid #333' }} 
            /> 
            <button onClick={sendMessage} style={{ padding: '10px 20px', background: '#0f0', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>ENVIAR</button> 
          </div> 
          <button onClick={() => setShowChat(false)} style={{ marginTop: '20px', background: 'transparent', color: '#666', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>SAIR DA SALA</button>
        </div> 
      )} 
    </div> 
  ); 
} 

export default ChatTest; 
