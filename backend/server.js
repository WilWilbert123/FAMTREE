const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const treeRoutes = require('./routes/treeRoutes');
const memberRoutes = require('./routes/memberRoutes');
const uploadController = require('./controller/uploadController');
const upload = require('./middleware/upload');
const authMiddleware = require('./middleware/auth');

require('dotenv').config();

connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('io', io);

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!', 
    timestamp: new Date().toISOString(),
    ip: req.ip 
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/tree', treeRoutes);
app.use('/api/members', memberRoutes);
app.post('/api/upload/image', authMiddleware, upload.single('image'), uploadController.uploadImage);
app.post('/api/upload/multiple', authMiddleware, upload.array('images', 10), uploadController.uploadMultiple);

io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('join-tree', (treeId) => {
    socket.join(`tree-${treeId}`);
  });
  
  socket.on('leave-tree', (treeId) => {
    socket.leave(`tree-${treeId}`);
  });
  
  socket.on('tree-update', (data) => {
    io.to(`tree-${data.treeId}`).emit('tree-updated', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://${getLocalIp()}:${PORT}`);
});

function getLocalIp() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}