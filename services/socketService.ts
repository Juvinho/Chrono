import { io, Socket } from 'socket.io-client';

// Use the same base URL as the API, removing '/api' if present or just the host
const getSocketUrl = () => {
    if (typeof window !== 'undefined') {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocal) {
            // Force local socket when running locally
            return `http://127.0.0.1:3001`;
        }
        // In production, socket is on the same origin
        return window.location.origin;
    }
    return 'http://127.0.0.1:3001';
};

class SocketService {
    private socket: Socket | null = null;

    connect() {
        if (this.socket?.connected) return;

        this.socket = io(getSocketUrl(), {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket?.id);
        });

        this.socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
        });
    }

    joinUserRoom(userId: string) {
        if (this.socket) {
            // Wait for connection if not ready? socket.io buffers emits usually.
            this.socket.emit('join_user_room', userId);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    on(event: string, callback: (...args: any[]) => void) {
        this.socket?.on(event, callback);
    }

    off(event: string, callback?: (...args: any[]) => void) {
        this.socket?.off(event, callback);
    }

    emit(event: string, data: any) {
        this.socket?.emit(event, data);
    }
}

export const socketService = new SocketService();
