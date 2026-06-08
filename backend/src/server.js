// Асосий сервер — Express + Socket.io
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const { xavfsizlikHeaders } = require('./middleware/xavfsizlik');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const driverRoutes = require('./routes/driverRoutes');
const passengerRoutes = require('./routes/passengerRoutes');
const messageRoutes = require('./routes/messageRoutes');
const rideRoutes = require('./routes/rideRoutes');
const shareRoutes = require('./routes/shareRoutes');
const geocodeRoutes = require('./routes/geocodeRoutes');
const heatmapRoutes = require('./routes/heatmapRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const pushRoutes = require('./routes/pushRoutes');
const telegramRoutes = require('./routes/telegramRoutes');
const reklamaRoutes = require('./routes/reklamaRoutes');
const topilmaRoutes = require('./routes/topilmaRoutes');
const { auksionlarniTekshir } = require('./controllers/reklamaController');

const app = express();
const server = http.createServer(app);

// CORS — продакшнда фақат ўз frontend манзилимизга очамиз
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
  : '*';
// Продакшнда FRONTEND_URL белгиланмаса CORS барча манзилга очиқ қолади — огоҳлантирамиз.
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  console.warn('⚠️  FRONTEND_URL белгиланмаган — CORS барча манзилларга очиқ (*). Продакшнда ўз доменингизни қўйинг.');
}

// Socket.io созлаш
const io = new Server(server, {
  cors: { origin: allowedOrigins },
});

// Middleware
app.use(xavfsizlikHeaders);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

// io объектини routes ичида ишлатиш учун
app.set('io', io);

// Frontend dist йўли (версия текшируви ва static хизмат учун)
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');

// Жорий деплой версияси — index.html'даги асосий JS хеши. Service worker буни
// ТУТМАЙДИ (/api денилист), шунинг учun frontend янги версияни ишончли сезади.
app.get('/api/version', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const html = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
    const m = html.match(/\/assets\/index-[\w-]+\.js/);
    res.json({ v: m ? m[0] : null });
  } catch {
    res.json({ v: null });
  }
});

// API йўллари
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/passenger', passengerRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/heatmap', heatmapRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/reklama', reklamaRoutes);
app.use('/api/topilma', topilmaRoutes);

// Мос келмаган API йўли — HTML эмас, JSON 404 қайтарамиз
app.use('/api', (req, res) => {
  res.status(404).json({ xato: 'Йўл топилмади' });
});

// Health check (frontend build йўқлигида)
const hasFrontend = fs.existsSync(path.join(distPath, 'index.html'));

if (!hasFrontend) {
  app.get('/', (req, res) => {
    res.json({ holat: 'Сервер ишламоқда ✅' });
  });
} else {
  // Frontend build'ни хизмат қиламиз.
  // Хешланган ассетлар (assets/) — узоқ, ўзгармас кэш. Кириш нуқталари
  // (index.html, sw.js, manifest) — no-cache: фойдаланувчи доим янги версияни
  // олади (Telegram webview SW ишлатмаса ҳам — янги ассет ҳаволалари тортилади).
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (/(index\.html|sw\.js|workbox-[^/]*\.js|\.webmanifest)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'no-cache');
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  // SPA fallback — React Router учун (index.html доим янги)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log(`📂 Frontend хизмат қилмоқда: ${distPath}`);
}

// Глобал хато-ишловчи — стек оқиб кетмайди, доим JSON {xato}
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ xato: 'Нотўғри JSON' });
  }
  console.error('Кутилмаган сервер хатоси:', err?.message);
  res.status(500).json({ xato: 'Сервер хатоси' });
});

// Socket.io уланиш мантиғи
require('./socket/socketHandler')(io);

// Хавфсизлик огоҳлантириши — дефолт/заиф махфий калитлар билан деплой қилинмасин.
// Бу қийматлар .env.example'даги намуналар; продакшнда улар бўлса webhook/токен
// сохталаштирилиши мумкин.
function maxfiyKalitTekshir() {
  const ogohlar = [];
  const testRejim = process.env.PAYMENT_TEST_MODE === '1';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'juda_maxfiy_kalit_ozgartiring') {
    ogohlar.push('JWT_SECRET — дефолт/бўш: токенлар сохталаштирилиши мумкин');
  }
  if (testRejim) {
    ogohlar.push('PAYMENT_TEST_MODE=1 — тест тўлови ОЧИҚ. Продакшнда ўчиринг!');
  } else {
    const paymeYoq = !process.env.PAYME_KEY || process.env.PAYME_KEY === 'test_payme_key';
    const clickYoq = !process.env.CLICK_SECRET || process.env.CLICK_SECRET === 'test_secret';
    if (paymeYoq) ogohlar.push('PAYME_KEY — дефолт/бўш: Payme webhook рад этилади (реал калит керак)');
    if (clickYoq) ogohlar.push('CLICK_SECRET — дефолт/бўш: Click webhook рад этилади (реал сир керак)');
  }
  if (ogohlar.length) {
    console.warn('\n⚠️  ХАВФСИЗЛИК ОГОҲЛАНТИРИШИ:');
    ogohlar.forEach((o) => console.warn('   • ' + o));
    console.warn('   Продакшнга чиқишдан олдин .env ни текширинг.\n');
  }
}
maxfiyKalitTekshir();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер ${PORT} портда ишламоқда`);
  // Telegram бот буйруқлари менюсини ўрнатамиз (токен бўлса; жим, fire-and-forget)
  require('./controllers/telegramBotController').komandalarOrnat();
  // Реклама кимошдиларини текшириб турамиз — тугаганини ёпиб, ғолибни аниқлаймиз
  // ва келаси ой учун очиқ кимошди бўлишини таъминлаймиз (лазий + соатлик).
  auksionlarniTekshir();
  setInterval(auksionlarniTekshir, 60 * 60 * 1000);
});
