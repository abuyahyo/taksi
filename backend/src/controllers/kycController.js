// KYC — ҳайдовчи ҳужжатлари (паспорт/ID, селфи). Расмлар локал дискда сақланади
// (backend/uploads/kyc), базада фақат метадан. Файллар маxфий — фақат эгаси ёки
// админ кўра олади (authenticated endpoint, public static эмас).
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { query } = require('../config/db');

// Uber услубидаги уланиш — паспорт + селфидан ташқари гувоҳнома ва машина расмлари.
// turi DB'да VARCHAR(20) — энг узуни 'mashina_plate' (13 белги), сиғади.
const TURLAR = ['passport', 'selfie', 'license', 'mashina_old', 'mashina_plate'];
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'kyc');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const KENGAYTMA = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = KENGAYTMA[file.mimetype] || 'jpg';
    cb(null, `${req.user.id}_${req.body.turi || 'hujjat'}_${Date.now()}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 }, // 6 МБ
  fileFilter: (req, file, cb) => cb(null, !!KENGAYTMA[file.mimetype]),
});

// Ҳайдовчи ҳужжат юклайди (multipart: fayl + turi)
const yukla = async (req, res) => {
  try {
    const turi = String(req.body.turi || '');
    if (!TURLAR.includes(turi)) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ xato: 'Нотўғри ҳужжат тури' });
    }
    if (!req.file) return res.status(400).json({ xato: 'Расм юкланмади (jpg/png/webp, макс 6МБ)' });

    // drivers ёзуви бўлмаса яратамиз (профил тўлдирилмаган бўлиши мумкин)
    const bor = await query(`SELECT 1 FROM drivers WHERE user_id = $1`, [req.user.id]);
    if (bor.rowCount === 0) {
      await query(`INSERT INTO drivers (user_id) VALUES ($1)`, [req.user.id]);
    }

    // Эски файлни топиб (бўлса) — янгиси билан алмаштирамиз
    const eski = await query(
      `SELECT fayl FROM driver_hujjatlar WHERE user_id = $1 AND turi = $2`,
      [req.user.id, turi]
    );

    await query(
      `INSERT INTO driver_hujjatlar (user_id, turi, fayl, holat, rad_sababi, yuklangan)
       VALUES ($1, $2, $3, 'kutilmoqda', NULL, NOW())
       ON CONFLICT (user_id, turi)
       DO UPDATE SET fayl = $3, holat = 'kutilmoqda', rad_sababi = NULL, yuklangan = NOW()`,
      [req.user.id, turi, req.file.filename]
    );

    // Ҳайдовчи умумий ҳолатини "кутилмоқда"га ўтказамиз (агар тасдиқланмаган бўлса)
    await query(
      `UPDATE drivers SET tasdiq_holati = 'kutilmoqda', rad_sababi = NULL
       WHERE user_id = $1 AND tasdiqlangan IS NOT TRUE`,
      [req.user.id]
    );

    // Эски файлни ўчирамиз (орфан қолмасин)
    const eskiFayl = eski.rows[0]?.fayl;
    if (eskiFayl && eskiFayl !== req.file.filename) {
      fs.unlink(path.join(UPLOAD_DIR, eskiFayl), () => {});
    }

    res.json({ ok: true, turi });
  } catch (err) {
    console.error('kyc yukla xato:', err.message);
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ xato: 'Юклаб бўлмади' });
  }
};

// Ҳайдовчи ўз ҳужжатлари ва умумий тасдиқ ҳолатини кўради
const royxatim = async (req, res) => {
  try {
    const h = await query(
      `SELECT id, turi, holat, rad_sababi, yuklangan
       FROM driver_hujjatlar WHERE user_id = $1`,
      [req.user.id]
    );
    const d = await query(
      `SELECT COALESCE(tasdiqlangan, FALSE) AS tasdiqlangan,
              COALESCE(tasdiq_holati, 'yangi') AS tasdiq_holati, rad_sababi
       FROM drivers WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({
      hujjatlar: h.rows,
      tasdiqlangan: d.rows[0]?.tasdiqlangan || false,
      tasdiq_holati: d.rows[0]?.tasdiq_holati || 'yangi',
      rad_sababi: d.rows[0]?.rad_sababi || null,
      turlar: TURLAR,
    });
  } catch (err) {
    console.error('kyc royxatim xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// Файлни узатиш — фақат эгаси ёки админ. Расм <img> token юбора олмагани учун
// фронтенд буни axios орқали blob сифатида олади.
const faylBer = async (req, res) => {
  try {
    const r = await query(`SELECT user_id, fayl FROM driver_hujjatlar WHERE id = $1`, [req.params.id]);
    const hujjat = r.rows[0];
    if (!hujjat) return res.status(404).json({ xato: 'Топилмади' });
    const ruxsat = req.user.rol === 'admin' || req.user.id === hujjat.user_id;
    if (!ruxsat) return res.status(403).json({ xato: 'Рухсат йўқ' });

    const fayl = path.join(UPLOAD_DIR, path.basename(hujjat.fayl)); // basename — path traversal'дан ҳимоя
    if (!fs.existsSync(fayl)) return res.status(404).json({ xato: 'Файл йўқ' });
    res.sendFile(fayl);
  } catch (err) {
    console.error('kyc faylBer xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// Бот орқали юкланган KYC ҳужжатни базага ёзиш — файл аллақачон UPLOAD_DIR'да.
// (Telegram'да расм юборган ҳайдовчи учун.)
async function kycYoz(userId, turi, faylNomi) {
  if (!TURLAR.includes(turi)) return false;
  const bor = await query(`SELECT 1 FROM drivers WHERE user_id = $1`, [userId]);
  if (bor.rowCount === 0) await query(`INSERT INTO drivers (user_id) VALUES ($1)`, [userId]);

  const eski = await query(`SELECT fayl FROM driver_hujjatlar WHERE user_id = $1 AND turi = $2`, [userId, turi]);
  await query(
    `INSERT INTO driver_hujjatlar (user_id, turi, fayl, holat, rad_sababi, yuklangan)
     VALUES ($1, $2, $3, 'kutilmoqda', NULL, NOW())
     ON CONFLICT (user_id, turi)
     DO UPDATE SET fayl = $3, holat = 'kutilmoqda', rad_sababi = NULL, yuklangan = NOW()`,
    [userId, turi, faylNomi]
  );
  await query(
    `UPDATE drivers SET tasdiq_holati = 'kutilmoqda', rad_sababi = NULL
     WHERE user_id = $1 AND tasdiqlangan IS NOT TRUE`,
    [userId]
  );
  const eskiFayl = eski.rows[0]?.fayl;
  if (eskiFayl && eskiFayl !== faylNomi) fs.unlink(path.join(UPLOAD_DIR, eskiFayl), () => {});
  return true;
}

module.exports = { upload, yukla, royxatim, faylBer, kycYoz, KYC_DIR: UPLOAD_DIR };
