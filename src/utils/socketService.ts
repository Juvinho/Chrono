import { io, Socket } from 'socket.io-client';

// Use the same base URL as the API, removing '/api' if present or just the host
const getSocketUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || 
                       hostname === '127.0.0.1' || 
                       hostname.startsWith('192.168.') || 
                       hostname.startsWith('10.') || 
                       hostname.startsWith('172.');
        
        if (isLocal) {
            // Force socket to the backend port on the same host
            return `http://${hostname}:3001`;
        }
        // In production, socket is on the same origin
        return window.location.origin;
    }
    return 'http://127.0.0.1:3001';
};

class SocketService {
    private socket: Socket | null = null;
    private toastHandler?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;

    connect() {
        if (this.socket?.connected) return;

        this.socket = io(getSocketUrl(), {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket?.id);
        });

        this.socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
        });

        this.socket.io.on('reconnect_attempt', (attempt) => {
            console.log('Socket reconnect attempt:', attempt);
        });

        this.socket.io.on('reconnect_failed', () => {
            console.error('Socket reconnection failed');
        });

        this.socket.on('disconnect', (reason) => {
            console.warn('Socket disconnected:', reason);
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

    setToastHandler(handler: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void) {
        this.toastHandler = handler;
    }
}

export const socketService = new SocketService();
