import { io } from 'socket.io-client';

export const socket = io.connect("http://localhost:3001");

socket.on('connect', () => {
    console.log('Connected to server, socket id:', socket.id);
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
});