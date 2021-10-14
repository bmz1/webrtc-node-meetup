import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(express.static(join(__dirname, '..', 'ui/dist')));

app.use((req, res, next) => {
  res.sendFile(join(__dirname, '..', 'ui/dist', '/index.html'));
});

io.on('connection', (socket) => {
  console.log('a user connected: ', socket.id);

  socket.on('offer', offer => {
    console.log('gotOffer', socket.id)
    socket.broadcast.emit('offer', offer);
  })

  socket.on('answer', answer => {
    console.log('gotAnswer')
    socket.broadcast.emit('answer', answer);
  })

  socket.on('candidate', candidate => {
    console.log('gotCandiate')
    socket.broadcast.emit('candidate', candidate);
  })

  socket.on('hangup', () => {
    console.log('hangup')
    socket.broadcast.emit('hangup');
  })

  socket.on('disconnect', () => {
    console.log('user disconnected: ', socket.id);
    socket.broadcast.emit('peer-disconnected', socket.id);
  })
});

server.listen(5000, () => {
  console.log('listening on *:5000');
});
