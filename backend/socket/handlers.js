/**
 * Socket.IO 이벤트 핸들러
 * 화상회의 및 실시간 통신 관련 이벤트 처리
 */

let onlineUsers = [];
// 각 방의 참가자 정보를 저장 { roomId: [{ userId, userState }] }
const roomParticipants = new Map();

/**
 * Socket.IO 이벤트 핸들러 초기화
 * @param {Server} io - Socket.IO 서버 인스턴스
 */
function initializeSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // 새 사용자 추가
    socket.on('addNewUser', (clerkUser) => {
      if (clerkUser && !onlineUsers.some(user => user?.userId === clerkUser.id)) {
        onlineUsers.push({
          userId: clerkUser.id,
          socketId: socket.id,
          profile: clerkUser,
        });
        console.log(`👤 User added: ${clerkUser.id}`);
      }
      io.emit('getUsers', onlineUsers);
    });

    // 화상회의 방 참여
    socket.on('join-room', (roomId, userId, userState) => {
      console.log(`🚪 User ${userId} joining room ${roomId} with state:`, userState);
      socket.join(roomId);

      // 방에 참가자 정보 저장
      if (!roomParticipants.has(roomId)) {
        roomParticipants.set(roomId, []);
      }

      const participants = roomParticipants.get(roomId);
      // 중복 체크 후 추가
      if (!participants.some(p => p.userId === userId)) {
        participants.push({ userId, userState, socketId: socket.id });
      }

      console.log(`📊 Room ${roomId} participants:`, participants.map(p => ({ userId: p.userId, state: p.userState })));

      // 기존 참가자 목록을 새로 들어온 사용자에게 전송
      const existingParticipants = participants
        .filter(p => p.userId !== userId)
        .map(p => ({ userId: p.userId, userState: p.userState }));

      socket.emit('existing-participants', existingParticipants);
      console.log(`📤 Sending ${existingParticipants.length} existing participants to ${userId}`);

      // 방의 다른 사용자들에게 새 참가자 알림
      socket.to(roomId).emit('user-connected', userId, userState);

      // 참여 확인 메시지
      socket.emit('room-joined', { roomId, userId });
    });

    // 사용자 연결 (PeerJS)
    socket.on('user-connected', (roomId, userId, userState) => {
      console.log(`🔗 User ${userId} connected in room ${roomId}`);
      socket.to(roomId).emit('user-connected', userId, userState);
    });

    // 비디오 토글
    socket.on('toggle-video', (data) => {
      const { roomId, userId, enabled } = data;
      console.log(`📹 User ${userId} toggled video: ${enabled}`);
      socket.to(roomId).emit('user-toggled-video', { userId, enabled });
    });

    // 오디오 토글
    socket.on('toggle-audio', (data) => {
      const { roomId, userId, enabled } = data;
      console.log(`🎤 User ${userId} toggled audio: ${enabled}`);
      socket.to(roomId).emit('user-toggled-audio', { userId, enabled });
    });

    // 채팅 메시지
    socket.on('chat-message', (data) => {
      const { roomId, message } = data;
      console.log(`💬 Chat message in room ${roomId}`);
      io.to(roomId).emit('chat-message', message);
    });

    // 화면 공유
    socket.on('screen-share-started', (data) => {
      const { roomId, userId } = data;
      console.log(`🖥️ User ${userId} started screen sharing in room ${roomId}`);
      socket.to(roomId).emit('user-screen-share-started', userId);
    });

    socket.on('screen-share-stopped', (data) => {
      const { roomId, userId } = data;
      console.log(`🖥️ User ${userId} stopped screen sharing in room ${roomId}`);
      socket.to(roomId).emit('user-screen-share-stopped', userId);
    });

    // 1:1 통화 (기존 call 이벤트)
    socket.on('call', async (participants) => {
      if (participants.receiver.socketId) {
        io.to(participants.receiver.socketId).emit('incomingCall', participants);
        console.log(`📞 Call from ${participants.caller.userId} to ${participants.receiver.userId}`);
      }
    });

    // 연결 해제
    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);

      // 온라인 사용자 목록에서 제거
      const disconnectedUser = onlineUsers.find(user => user.socketId === socket.id);
      onlineUsers = onlineUsers.filter(user => user.socketId !== socket.id);

      // 모든 방에서 해당 사용자 제거
      roomParticipants.forEach((participants, roomId) => {
        const participant = participants.find(p => p.socketId === socket.id);
        if (participant) {
          // 방에서 제거
          roomParticipants.set(
            roomId,
            participants.filter(p => p.socketId !== socket.id)
          );
          // 해당 방의 다른 사용자들에게 알림
          socket.to(roomId).emit('user-disconnected', participant.userId);
          console.log(`🚪 User ${participant.userId} removed from room ${roomId}`);
          console.log(`📊 Room ${roomId} remaining participants:`, roomParticipants.get(roomId).map(p => p.userId));
        }
      });

      // 모든 방에서 사용자 퇴장 알림
      if (disconnectedUser) {
        io.emit('getUsers', onlineUsers);
      }
    });

    // 방장이 회의 종료
    socket.on('host-ended-meeting', (roomId) => {
      console.log(`👑 Host ended meeting in room ${roomId}`);
      // 방의 모든 참가자에게 회의 종료 알림
      io.to(roomId).emit('meeting-ended-by-host', roomId);

      // 방 참가자 목록 삭제
      if (roomParticipants.has(roomId)) {
        console.log(`🗑️ Clearing room ${roomId} participants`);
        roomParticipants.delete(roomId);
      }
    });

    // 방 나가기
    socket.on('leave-room', (roomId, userId) => {
      console.log(`🚪 User ${userId} leaving room ${roomId}`);
      socket.leave(roomId);

      // 방 참가자 목록에서 제거
      if (roomParticipants.has(roomId)) {
        const participants = roomParticipants.get(roomId);
        const updatedParticipants = participants.filter(p => p.userId !== userId);
        roomParticipants.set(roomId, updatedParticipants);

        console.log(`📊 Room ${roomId} remaining participants:`, updatedParticipants.map(p => p.userId));

        // 마지막 참가자인지 확인
        const isLastParticipant = updatedParticipants.length === 0;

        if (isLastParticipant) {
          console.log(`🏁 User ${userId} is the last participant leaving room ${roomId}`);
          // 마지막 참가자에게 알림
          socket.emit('last-participant-leaving', roomId);
          // 방 삭제
          roomParticipants.delete(roomId);
        }
      }

      socket.to(roomId).emit('user-disconnected', userId);
    });
  });
}

module.exports = {
  initializeSocketHandlers,
  getOnlineUsers: () => onlineUsers
};
