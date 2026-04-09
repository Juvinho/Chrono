import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    // Determine the socket URL based on environment
    const SOCKET_URL = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : window.location.origin;

    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('✅ Socket.io connected:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket.io disconnected');
    });

    socket.on('connect_error', (error) => {
      // Auth errors are expected when not logged in — stop spamming reconnect attempts
      if (error.message?.includes('Authentication error') || error.message?.includes('token required')) {
        if (socket) socket.io.opts.reconnection = false;
      } else {
        console.warn('⚠️ Socket.io connection error:', error.message);
      }
    });
  }

  return socket;
};

export const closeSocket = () => {
  if (socket) {
    socket.close();
    socket = null;
  }
};

/** Call after successful login to re-enable and reconnect the socket. */
export const reconnectSocket = () => {
  if (socket) {
    socket.io.opts.reconnection = true;
    socket.connect();
  }
};

export const isSocketConnected = (): boolean => {
  return socket?.connected || false;
};
