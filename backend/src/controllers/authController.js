// Рўйхатдан ўтиш, кириш ва токен яратиш мантиғи
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
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

    // Агар ҳайдовчи бўлса, drivers жадвалига ҳам ёзамиз
    if (foydalanuvchiRol === 'haydovchi') {
      await query('INSERT INTO drivers (user_id) VALUES ($1)', [user.id]);
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
    delete user.parol_hash; // паролни жўнатмаймиз
    res.json({ token, user });
  } catch (err) {
    console.error('Login хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = { register, login };
