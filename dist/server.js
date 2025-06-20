"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const next_1 = __importDefault(require("next"));
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
const nextApp = (0, next_1.default)({ dev, hostname, port });
const handle = nextApp.getRequestHandler();
// 전역으로 rooms 선언
const rooms = new Map();
// 각 방의 메시지 히스토리를 저장
const roomMessages = new Map();
// 소켓 ID와 사용자 ID의 매핑을 저장
const socketToUser = new Map();
nextApp.prepare().then(() => {
    const app = (0, express_1.default)();
    const server = (0, http_1.createServer)(app);
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });
    io.on('connection', (socket) => {
        console.log('Socket connected:', socket.id);
        socket.on('join-room', (roomId, userId, userState) => {
            // 이전 연결 정리
            const previousConnection = socketToUser.get(socket.id);
            if (previousConnection) {
                const prevRoom = rooms.get(previousConnection.roomId);
                if (prevRoom) {
                    prevRoom.delete(previousConnection.userId);
                    socket.leave(previousConnection.roomId);
                }
            }
            console.log(`User ${userId} joining room ${roomId}`);
            // 방 참가자 관리
            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Map());
            }
            const room = rooms.get(roomId);
            if (room) {
                // 같은 사용자의 이전 연결 제거
                const existingUser = room.get(userId);
                if (existingUser && existingUser.socketId !== socket.id) {
                    const oldSocket = io.sockets.sockets.get(existingUser.socketId);
                    if (oldSocket) {
                        oldSocket.disconnect();
                    }
                    room.delete(userId);
                }
                // 새로운 연결 추가
                room.set(userId, Object.assign(Object.assign({}, userState), { socketId: socket.id, lastConnected: Date.now() }));
                // 소켓 ID와 사용자 ID 매핑 저장
                socketToUser.set(socket.id, { roomId, userId });
                const participants = Array.from(room.keys());
                console.log(`Room ${roomId} participants (${participants.length}):`, participants);
            }
            // 새로 접속한 사용자에게 이전 메시지 히스토리 전송
            const messages = roomMessages.get(roomId) || [];
            socket.emit('message-history', messages);
            socket.join(roomId);
            socket.to(roomId).emit('user-connected', userId, userState);
            // 연결 해제 처리
            socket.on('disconnect', () => {
                const userMapping = socketToUser.get(socket.id);
                if (userMapping) {
                    const { roomId, userId } = userMapping;
                    console.log(`User ${userId} disconnected from room ${roomId}`);
                    const room = rooms.get(roomId);
                    if (room) {
                        const userState = room.get(userId);
                        if (userState && userState.socketId === socket.id) {
                            room.delete(userId);
                            if (room.size === 0) {
                                rooms.delete(roomId);
                            }
                            const participants = Array.from(room.keys());
                            console.log(`Room ${roomId} participants after disconnect (${participants.length}):`, participants);
                        }
                    }
                    socketToUser.delete(socket.id);
                    socket.to(roomId).emit('user-disconnected', userId);
                }
            });
        });
        // 새 메시지 처리
        socket.on('new-message', ({ roomId, message }) => {
            console.log('New message received:', { roomId, message });
            // 메시지 히스토리에 추가
            if (!roomMessages.has(roomId)) {
                roomMessages.set(roomId, []);
            }
            const messages = roomMessages.get(roomId);
            messages.push(message);
            // 방의 다른 참가자들에게 메시지 브로드캐스트
            socket.to(roomId).emit('receive-message', message);
        });
        socket.on('toggle-video', ({ roomId, userId, enabled }) => {
            console.log('Toggle video event received:', { roomId, userId, enabled });
            const room = rooms.get(roomId);
            if (room) {
                const userState = room.get(userId);
                if (userState) {
                    userState.isVideoEnabled = enabled;
                    socket.to(roomId).emit('user-toggle-video', { userId, enabled });
                }
            }
        });
        socket.on('toggle-audio', ({ roomId, userId, enabled }) => {
            console.log('Toggle audio event received:', { roomId, userId, enabled });
            const room = rooms.get(roomId);
            if (room) {
                const userState = room.get(userId);
                if (userState) {
                    userState.isAudioEnabled = enabled;
                    socket.to(roomId).emit('user-toggle-audio', { userId, enabled });
                }
            }
        });
    });
    // API 라우트를 Next.js에 위임
    app.all('/api/*', (req, res) => {
        return handle(req, res);
    });
    // 기타 라우트 처리
    app.all('*', (req, res) => {
        return handle(req, res);
    });
    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
