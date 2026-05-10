import { io } from 'socket.io-client';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

if (import.meta.env.DEV) {
  console.log(`Connected backend:\n${API_URL}`);
}

export const socket = io(API_URL, {
  transports: ['websocket', 'polling'],
  withCredentials: true,
  autoConnect: true,
});
