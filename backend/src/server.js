// Асосий сервер — Express + Socket.io
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const driverRoutes = require('./routes/driverRoutes');
const passengerRoutes = require('./routes/passengerRoutes');
const messageRoutes = require('./routes/messageRoutes');
const rideRoutes = require('./routes/rideRoutes');
const shareRoutes = require('./routes/shareRoutes');
const geocodeRoutes = require('./routes/geocodeRoutes');
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
app.use('/api/driver', driverRoutes);
app.use('/api/passenger', passengerRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/payment', paymentRoutes);

// Health check (frontend build йўқлигида)
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
const hasFrontend = fs.existsSync(path.join(distPath, 'index.html'));

if (!hasFrontend) {
  app.get('/', (req, res) => {
    res.json({ holat: 'Сервер ишламоқда ✅' });
  });
} else {
  // Frontend build'ни хизмат қиламиз
  app.use(express.static(distPath));
  // SPA fallback — React Router учун
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log(`📂 Frontend хизмат қилмоқда: ${distPath}`);
}

// Socket.io уланиш мантиғи
require('./socket/socketHandler')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер ${PORT} портда ишламоқда`);
});
