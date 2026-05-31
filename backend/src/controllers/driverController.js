// Ҳайдовчи статистикаси, машина профили ва уланиш (онбординг) ҳолати.
const { query } = require('../config/db');

// Машина + ҳайдовчи профили (Uber услубидаги уланиш учун кенгайтирилди)
const profile = async (req, res) => {
  try {
    const r = await query(
      `SELECT u.ism, u.telefon, u.reyting,
              d.mashina_modeli, d.mashina_raqami, d.mashina_rangi, d.mashina_yili,
              d.tugilgan_sana, d.gpro_raqami, d.gpro_amal_qiladi,
              COALESCE(d.tasdiqlangan, FALSE)  AS tasdiqlangan,
              COALESCE(d.tasdiq_holati, 'yangi') AS tasdiq_holati,
              d.rad_sababi
       FROM users u LEFT JOIN drivers d ON d.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(r.rows[0] || {});
  } catch (err) {
    console.error('Driver profile xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const b = req.body || {};
    // Бўш сатр → null (COALESCE мавжуд қийматни сақласин — қадам-қадам PATCH учун муҳим)
    const trim = (s) => {
      if (typeof s !== 'string') return null;
      const x = s.trim().slice(0, 100);
      return x || null;
    };
    const yil = (() => {
      const n = parseInt(b.mashina_yili, 10);
      if (!Number.isFinite(n)) return null;
      const hozir = new Date().getFullYear();
      return n >= 1980 && n <= hozir + 1 ? n : null;
    })();
    const sana = (s) => {
      if (!s) return null;
      const d = new Date(s);
      return isNaN(d) ? null : d.toISOString().slice(0, 10);
    };

    const yangi = {
      mashina_modeli:    trim(b.mashina_modeli),
      mashina_raqami:    trim(b.mashina_raqami),
      mashina_rangi:     trim(b.mashina_rangi),
      mashina_yili:      yil,
      tugilgan_sana:     sana(b.tugilgan_sana),
      gpro_raqami:       trim(b.gpro_raqami),
      gpro_amal_qiladi:  sana(b.gpro_amal_qiladi),
    };

    const upd = await query(
      `UPDATE drivers SET
         mashina_modeli   = COALESCE($2, mashina_modeli),
         mashina_raqami   = COALESCE($3, mashina_raqami),
         mashina_rangi    = COALESCE($4, mashina_rangi),
         mashina_yili     = COALESCE($5, mashina_yili),
         tugilgan_sana    = COALESCE($6, tugilgan_sana),
         gpro_raqami      = COALESCE($7, gpro_raqami),
         gpro_amal_qiladi = COALESCE($8, gpro_amal_qiladi)
       WHERE user_id = $1`,
      [req.user.id, yangi.mashina_modeli, yangi.mashina_raqami, yangi.mashina_rangi,
        yangi.mashina_yili, yangi.tugilgan_sana, yangi.gpro_raqami, yangi.gpro_amal_qiladi]
    );
    if (upd.rowCount === 0) {
      await query(
        `INSERT INTO drivers (user_id, mashina_modeli, mashina_raqami, mashina_rangi,
            mashina_yili, tugilgan_sana, gpro_raqami, gpro_amal_qiladi)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [req.user.id, yangi.mashina_modeli, yangi.mashina_raqami, yangi.mashina_rangi,
          yangi.mashina_yili, yangi.tugilgan_sana, yangi.gpro_raqami, yangi.gpro_amal_qiladi]
      );
    }
    res.json({ ok: true, ...yangi });
  } catch (err) {
    console.error('Driver profile update xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

const stats = async (req, res) => {
  try {
    const natija = await query(
      `SELECT
         COALESCE(SUM(kelishilgan_narx), 0) AS daromad,
         COUNT(*)                            AS safar
       FROM rides
       WHERE haydovchi_id = $1
         AND holat = 'yakunlandi'
         AND yakun_vaqti >= CURRENT_DATE
         AND yakun_vaqti <  CURRENT_DATE + INTERVAL '1 day'`,
      [req.user.id]
    );
    res.json({
      daromad: parseInt(natija.rows[0].daromad, 10),
      safar:   parseInt(natija.rows[0].safar, 10),
    });
  } catch (err) {
    console.error('Driver stats хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// Уланиш ҳолати — қайси қадам тугаган, қайси қолган. Wizard буни ўқиб прогресс кўрсатади.
const KERAKLI_HUJJATLAR = ['passport', 'selfie', 'license', 'mashina_old', 'mashina_plate'];
const onboarding = async (req, res) => {
  try {
    const p = await query(
      `SELECT u.ism,
              d.mashina_modeli, d.mashina_raqami, d.mashina_rangi, d.mashina_yili,
              d.tugilgan_sana, d.gpro_raqami, d.gpro_amal_qiladi,
              COALESCE(d.tasdiqlangan, FALSE)  AS tasdiqlangan,
              COALESCE(d.tasdiq_holati, 'yangi') AS tasdiq_holati,
              d.rad_sababi
       FROM users u LEFT JOIN drivers d ON d.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    const u = p.rows[0] || {};

    const h = await query(
      `SELECT turi, holat FROM driver_hujjatlar WHERE user_id = $1`,
      [req.user.id]
    );
    const turlar = new Set(h.rows.map((r) => r.turi));
    const radTurlar = new Set(h.rows.filter((r) => r.holat === 'rad').map((r) => r.turi));

    const shaxsiy_ok  = !!(u.ism && u.tugilgan_sana);
    const gpro_ok     = !!(u.gpro_raqami && u.gpro_amal_qiladi && turlar.has('license'));
    const mashina_ok  = !!(u.mashina_modeli && u.mashina_raqami && u.mashina_rangi && u.mashina_yili
                            && turlar.has('mashina_old') && turlar.has('mashina_plate'));
    const ariza_ok    = turlar.has('passport') && turlar.has('selfie');

    const bosqichlar = [
      { kalit: 'shaxsiy', tugadi: shaxsiy_ok },
      { kalit: 'gpro',    tugadi: gpro_ok },
      { kalit: 'mashina', tugadi: mashina_ok },
      { kalit: 'ariza',   tugadi: ariza_ok },
    ];
    const tugadi_soni = bosqichlar.filter((b) => b.tugadi).length;
    const foiz = Math.round((tugadi_soni / bosqichlar.length) * 100);

    res.json({
      bosqichlar,
      foiz,
      tasdiqlangan:  u.tasdiqlangan,
      tasdiq_holati: u.tasdiq_holati,
      rad_sababi:    u.rad_sababi || null,
      rad_turlar:    [...radTurlar],     // қайта юклаш керак бўлган ҳужжатлар
      kerakli_hujjatlar: KERAKLI_HUJJATLAR,
    });
  } catch (err) {
    console.error('Driver onboarding xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// Чалкаш белгиларсиз (0/O, 1/I) код — ўқиш/айтиш осон
const KOD_BELGILAR = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const kodYarat = (n = 6) => Array.from({ length: n }, () => KOD_BELGILAR[Math.floor(Math.random() * KOD_BELGILAR.length)]).join('');

// GET /api/driver/code — ҳайдовчининг уникал коди (йўқ бўлса яратилади)
const kodim = async (req, res) => {
  try {
    const r = await query(`SELECT haydovchi_kodi FROM users WHERE id = $1`, [req.user.id]);
    let kod = r.rows[0]?.haydovchi_kodi;
    if (!kod) {
      // Уникал бўлгунча уринамиз (UNIQUE индекс кафолатлайди)
      for (let i = 0; i < 10 && !kod; i++) {
        const c = kodYarat();
        try {
          await query(`UPDATE users SET haydovchi_kodi = $2 WHERE id = $1`, [req.user.id, c]);
          kod = c;
        } catch (e) {
          if (e.code !== '23505') throw e; // 23505 = unique violation — қайта уринамиз
        }
      }
      if (!kod) return res.status(500).json({ xato: 'Код яратилмади' });
    }
    res.json({ kod });
  } catch (err) {
    console.error('Driver kodim xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = { stats, profile, updateProfile, onboarding, kodim };
