import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server;

export const initSocket = (httpServer: HttpServer, allowedOrigins: string[]) => {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // --- User's Simplified Chat Logic (For Testing & Compatibility) ---
    // Quando o usuário entra numa sala (conversa com alguém)
    socket.on("join_room", (room_id) => {
      socket.join(room_id);
      console.log(`Usuário ${socket.id} entrou na sala: ${room_id}`);
    });

    // Quando o usuário manda mensagem
    socket.on("send_message", (data) => {
      // data deve ter: { room, author, message, time, imageUrl }
      // Envia para todo mundo QUE ESTÁ NA MESMA SALA
      socket.to(data.room).emit("receive_message", data);
    });

    // Eventos de digitação
    socket.on("typing", (data) => {
      // data: { room, username }
      socket.to(data.room).emit("display_typing", data);
    });

    socket.on("stop_typing", (data) => {
      // data: { room, username }
      socket.to(data.room).emit("hide_typing", data);
    });
    // ------------------------------------------------------------------

    // User joins a room identified by their User ID (Used by Chrono features)
    socket.on('join_user_room', (userId: string) => {
        if(userId) {
            socket.join(userId);
            console.log(`Socket ${socket.id} joined user room ${userId}`);
        }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
