// Рўйхатдан ўтиш, кириш ва токен яратиш мантиғи
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { initDataTekshir } = require('../utils/telegram');
const { googleTokenTekshir } = require('../utils/google');
require('dotenv').config();

// Токен яратиш ёрдамчи функцияси
const tokenYaratish = (user) => {
  return jwt.sign(
    { id: user.id, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES }
  );
};

// РЎЙХАТДАН ЎТИШ
const register = async (req, res) => {
  try {
    const { ism, telefon, parol, rol } = req.body;

    if (!ism || !telefon || !parol) {
      return res.status(400).json({ xato: 'Барча майдонларни тўлдиринг' });
    }
    if (String(ism).trim().length < 2) {
      return res.status(400).json({ xato: 'Исмни тўлиқ киритинг' });
    }
    // Халқаро формат (E.164): + ва 7–15 рақам. Дунёнинг исталган мамлакати.
    if (!/^\+\d{7,15}$/.test(String(telefon))) {
      return res.status(400).json({ xato: 'Телефон рақамини халқаро форматда киритинг (масалан +998901234567)' });
    }
    if (String(parol).length < 6) {
      return res.status(400).json({ xato: 'Парол камида 6 белгидан иборат бўлсин' });
    }

    // Бу телефон рўйхатдан ўтганми?
    const mavjud = await query('SELECT id FROM users WHERE telefon = $1', [telefon]);
    if (mavjud.rows.length > 0) {
      return res.status(409).json({ xato: 'Бу телефон рақами аллақачон рўйхатдан ўтган' });
    }

    // Паролни хэшлаш
    const parol_hash = await bcrypt.hash(parol, 10);
    const foydalanuvchiRol = rol === 'haydovchi' ? 'haydovchi' : 'mijoz';

    const natija = await query(
      `INSERT INTO users (ism, telefon, parol_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, ism, telefon, rol, reyting`,
      [ism, telefon, parol_hash, foydalanuvchiRol]
    );

    const user = natija.rows[0];

    // Агар ҳайдовчи бўлса, drivers жадвалига ҳам ёзамиз + 7 кунлик trial обуна
    if (foydalanuvchiRol === 'haydovchi') {
      await query('INSERT INTO drivers (user_id) VALUES ($1)', [user.id]);
      await query(
        `INSERT INTO obunalar (user_id, turi, summa, tugash_sana)
         VALUES ($1, 'trial', 0, NOW() + INTERVAL '7 days')`,
        [user.id]
      );
    }

    const token = tokenYaratish(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// КИРИШ
const login = async (req, res) => {
  try {
    const { telefon, parol } = req.body;

    const natija = await query('SELECT * FROM users WHERE telefon = $1', [telefon]);
    if (natija.rows.length === 0) {
      return res.status(401).json({ xato: 'Телефон ёки парол нотўғри' });
    }

    const user = natija.rows[0];

    // Блокланганлик текшируви (шаффоф — сабабини айтамиз)
    if (user.bloklangan) {
      return res.status(403).json({
        xato: 'Ҳисобингиз блокланган',
        sabab: user.blok_sababi || 'Сабаб кўрсатилмаган',
      });
    }

    const togri = await bcrypt.compare(parol, user.parol_hash);
    if (!togri) {
      return res.status(401).json({ xato: 'Телефон ёки парол нотўғри' });
    }

    const token = tokenYaratish(user);
    // Фақат керакли майдонларни қайтарамиз (parol_hash, блок ва манзил майдонлари кетмасин)
    const javobUser = {
      id: user.id, ism: user.ism, telefon: user.telefon,
      rol: user.rol, reyting: user.reyting,
    };
    res.json({ token, user: javobUser });
  } catch (err) {
    console.error('Login хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// TELEGRAM MINI APP КИРИШ — initData'ни бот токени билан текшириб, JWT берамиз.
// Бот токени созланмаган бўлса fail-closed: кириш рад этилади.
const telegramKirish = async (req, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(503).json({ xato: 'Telegram кириш созланмаган' });
    }
    const { initData } = req.body;
    const n = initDataTekshir(initData, botToken);
    if (!n.ok || !n.user?.id) {
      return res.status(401).json({ xato: 'Telegram маълумоти нотўғри' });
    }

    const tgId = String(n.user.id);
    const ism = [n.user.first_name, n.user.last_name].filter(Boolean).join(' ').trim().slice(0, 100) || 'Telegram';

    // Мавжуд фойдаланувчими? — telegram_id бўйича топамиз, бўлмаса яратамиз
    let r = await query('SELECT * FROM users WHERE telegram_id = $1', [tgId]);
    let user = r.rows[0];
    if (!user) {
      const ins = await query(
        `INSERT INTO users (ism, telegram_id, rol) VALUES ($1, $2, 'mijoz') RETURNING *`,
        [ism, tgId]
      );
      user = ins.rows[0];
    }

    // Блокланганлик (шаффоф — сабабини айтамиз)
    if (user.bloklangan) {
      return res.status(403).json({
        xato: 'Ҳисобингиз блокланган',
        sabab: user.blok_sababi || 'Сабаб кўрсатилмаган',
      });
    }

    const token = tokenYaratish(user);
    res.json({
      token,
      user: { id: user.id, ism: user.ism, telefon: user.telefon, rol: user.rol, reyting: user.reyting },
    });
  } catch (err) {
    console.error('Telegram кириш хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// GOOGLE КИРИШ — Google ID token'ни текшириб, JWT берамиз.
// Бот токени каби fail-closed: GOOGLE_CLIENT_ID созланмаса рад этамиз.
const googleKirish = async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({ xato: 'Google кириш созланмаган' });
    }
    const { idToken, rol } = req.body;
    const g = await googleTokenTekshir(idToken, clientId);
    if (!g.ok || !g.sub) {
      return res.status(401).json({ xato: 'Google маълумоти нотўғри' });
    }

    const foydalanuvchiRol = rol === 'haydovchi' ? 'haydovchi' : 'mijoz';
    const ism = String(g.name || g.email || 'Google').slice(0, 100);

    // google_id бўйича топамиз; бўлмаса email билан боғлаймиз; бўлмаса яратамиз
    let r = await query('SELECT * FROM users WHERE google_id = $1', [g.sub]);
    let user = r.rows[0];
    if (!user && g.email) {
      const e = await query('SELECT * FROM users WHERE email = $1', [g.email]);
      if (e.rows[0]) {
        user = e.rows[0];
        await query('UPDATE users SET google_id = $1 WHERE id = $2', [g.sub, user.id]);
      }
    }
    if (!user) {
      const ins = await query(
        `INSERT INTO users (ism, email, google_id, rol) VALUES ($1, $2, $3, $4) RETURNING *`,
        [ism, g.email || null, g.sub, foydalanuvchiRol]
      );
      user = ins.rows[0];
      // Ҳайдовчи бўлса — drivers ёзуви + 7 кунлик trial обуна (register каби)
      if (foydalanuvchiRol === 'haydovchi') {
        await query('INSERT INTO drivers (user_id) VALUES ($1)', [user.id]);
        await query(
          `INSERT INTO obunalar (user_id, turi, summa, tugash_sana)
           VALUES ($1, 'trial', 0, NOW() + INTERVAL '7 days')`,
          [user.id]
        );
      }
    }

    if (user.bloklangan) {
      return res.status(403).json({
        xato: 'Ҳисобингиз блокланган',
        sabab: user.blok_sababi || 'Сабаб кўрсатилмаган',
      });
    }

    const token = tokenYaratish(user);
    res.json({
      token,
      user: { id: user.id, ism: user.ism, telefon: user.telefon, rol: user.rol, reyting: user.reyting },
    });
  } catch (err) {
    console.error('Google кириш хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = { register, login, telegramKirish, googleKirish };
