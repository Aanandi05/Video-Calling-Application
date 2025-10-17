const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, { cors: { origin: '*' } });

const rooms = {}; // roomId -> [socketIds]

io.on('connection', socket => {

  socket.on('join-room', (roomId) => {
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);

    // Notify everyone else in the room
    rooms[roomId].forEach(id => {
      if (id !== socket.id) io.to(id).emit('user-joined', { participantId: socket.id });
    });

    // When a peer disconnects
    socket.on('disconnect', () => {
      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
        socket.to(roomId).emit('user-left', { participantId: socket.id });
      }
    });

    // Forward offers, answers, and ICE candidates
    socket.on('offer', ({ offer, to }) => io.to(to).emit('offer', { offer, from: socket.id }));
    socket.on('answer', ({ answer, to }) => io.to(to).emit('answer', { answer, from: socket.id }));
    socket.on('ice-candidate', ({ candidate, to }) => io.to(to).emit('ice-candidate', { candidate, from: socket.id }));

    // Chat messages
    socket.on('send-message', ({ roomId, message }) => io.to(roomId).emit('receive-message', message));
  });
});

server.listen(5000, () => console.log('Server running on port 5000'));
