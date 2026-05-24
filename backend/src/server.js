// Асосий сервер — Express + Socket.io
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
const server = http.createServer(app);

// CORS — продакшнда фақат ўз frontend манзилимизга очамиз
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
  : '*';

// Socket.io созлаш
const io = new Server(server, {
  cors: { origin: allowedOrigins },
});

// Middleware
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// io объектини routes ичида ишлатиш учун
app.set('io', io);

// API йўллари
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

// Текшириш йўли
app.get('/', (req, res) => {
  res.json({ holat: 'Сервер ишламоқда ✅' });
});

// Socket.io уланиш мантиғи (кейинги босқичда тўлдирилади)
require('./socket/socketHandler')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер ${PORT} портда ишламоқда`);
});
