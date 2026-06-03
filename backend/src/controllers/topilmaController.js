// "Буюм қолди" — таксида қолган буюмни тўлов эвазига қайтариш.
// inDrive услуби: йўловчи нарх таклиф қилади, ҳайдовчи рози бўлади ёки ўз нархини
// беради (савдо). Тўлов нақд, шахсан — биз ушламаймиз. Биз фақат келишувни
// осонлаштирамиз ва хабарнома берамиз. Фақат сўнгги 48 соатдаги тугаган сафарлар.
const { query } = require('../config/db');
const { yuborFoydalanuvchiga } = require('./pushController');
const { botFoydalanuvchiga } = require('./telegramBotController');

const OYNA_SOAT = 48; // сафар тугагач неча соат ичида сўров мумкин

// Иккала каналга (web push + Telegram) хабар юбориш — fail бўлса жим
function xabar(userId, title, body) {
  yuborFoydalanuvchiga(userId, { title, body, url: '/tarix', tag: `topilma-${userId}` }).catch(() => {});
  botFoydalanuvchiga(userId, `${title}\n${body}`).catch(() => {});
}

// Сўровни иштирокчи маълумотлари билан ўқиш (исм + сафар манзиллари)
async function toliq(id) {
  const r = await query(
    `SELECT t.*, r.boshlanish_manzil, r.tugash_manzil,
            m.ism AS mijoz_ism, h.ism AS haydovchi_ism
       FROM topilmalar t
       JOIN rides r ON t.ride_id = r.id
       LEFT JOIN users m ON t.mijoz_id = m.id
       LEFT JOIN users h ON t.haydovchi_id = h.id
      WHERE t.id = $1`,
    [id]
  );
  return r.rows[0] || null;
}

// Фойдаланувчининг шу сўровдаги роли: 'mijoz' | 'haydovchi' | null
function rol(t, userId) {
  if (Number(t.mijoz_id) === Number(userId)) return 'mijoz';
  if (Number(t.haydovchi_id) === Number(userId)) return 'haydovchi';
  return null;
}

// GET /api/topilma — менинг барча сўровларим (йўловчи ёки ҳайдовчи сифатида)
const royxat = async (req, res) => {
  try {
    const r = await query(
      `SELECT t.*, r.boshlanish_manzil, r.tugash_manzil,
              m.ism AS mijoz_ism, h.ism AS haydovchi_ism
         FROM topilmalar t
         JOIN rides r ON t.ride_id = r.id
         LEFT JOIN users m ON t.mijoz_id = m.id
         LEFT JOIN users h ON t.haydovchi_id = h.id
        WHERE t.mijoz_id = $1 OR t.haydovchi_id = $1
        ORDER BY t.yangilangan DESC
        LIMIT 100`,
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('Топилма рўйхати хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/topilma — янги сўров (фақат йўловчи, тугаган сафар, 48 соат ичида)
const yarat = async (req, res) => {
  try {
    const { ride_id, tavsif, narx } = req.body;
    const summa = parseInt(narx, 10);
    if (!ride_id || !tavsif || !String(tavsif).trim()) return res.status(400).json({ xato: 'Буюм тавсифини ёзинг' });
    if (!Number.isFinite(summa) || summa < 0) return res.status(400).json({ xato: 'Нарх нотўғри' });

    const rr = await query(
      `SELECT mijoz_id, haydovchi_id, holat,
              COALESCE(yakun_vaqti, qabul_vaqti, yaratilgan) AS asos_vaqt
         FROM rides WHERE id = $1`,
      [ride_id]
    );
    const ride = rr.rows[0];
    if (!ride) return res.status(404).json({ xato: 'Сафар топилмади' });
    if (Number(ride.mijoz_id) !== Number(req.user.id)) return res.status(403).json({ xato: 'Бу сизнинг сафарингиз эмас' });
    if (!ride.haydovchi_id) return res.status(400).json({ xato: 'Бу сафарда ҳайдовчи йўқ' });
    if (ride.holat !== 'yakunlandi') return res.status(400).json({ xato: 'Фақат тугаган сафар учун' });
    const soat = (Date.now() - new Date(ride.asos_vaqt).getTime()) / 3600000;
    if (soat > OYNA_SOAT) return res.status(400).json({ xato: `Сўров фақат сафардан кейинги ${OYNA_SOAT} соат ичида` });

    let ins;
    try {
      ins = await query(
        `INSERT INTO topilmalar (ride_id, mijoz_id, haydovchi_id, tavsif, taklif_narx, taklif_kim, holat)
         VALUES ($1, $2, $3, $4, $5, 'mijoz', 'soraldi') RETURNING id`,
        [ride_id, ride.mijoz_id, ride.haydovchi_id, String(tavsif).trim().slice(0, 500), summa]
      );
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ xato: 'Бу сафар учун очиқ сўров аллақачон бор' });
      throw e;
    }

    const t = await toliq(ins.rows[0].id);
    xabar(ride.haydovchi_id, '🧳 Буюм қолди сўрови',
      `${t.mijoz_ism || 'Йўловчи'}: ${t.tavsif} · ${summa.toLocaleString()} сўм таклиф қилди`);
    res.status(201).json(t);
  } catch (err) {
    console.error('Топилма яратиш хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// GET /api/topilma/:id — битта сўров (фақат иштирокчи)
const bitta = async (req, res) => {
  try {
    const t = await toliq(req.params.id);
    if (!t) return res.status(404).json({ xato: 'Топилмади' });
    if (!rol(t, req.user.id)) return res.status(403).json({ xato: 'Рухсат йўқ' });
    res.json(t);
  } catch (err) {
    console.error('Топилма ўқиш хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/topilma/:id/javob — ҳайдовчи "топдим"/"топмадим" дейди
const javob = async (req, res) => {
  try {
    const t = await toliq(req.params.id);
    if (!t) return res.status(404).json({ xato: 'Топилмади' });
    if (rol(t, req.user.id) !== 'haydovchi') return res.status(403).json({ xato: 'Фақат ҳайдовчи' });
    if (t.holat !== 'soraldi') return res.status(400).json({ xato: 'Бу сўровга аллақачон жавоб берилган' });

    const topildi = !!req.body.topildi;
    const yangiHolat = topildi ? 'topildi' : 'topilmadi';
    await query(`UPDATE topilmalar SET holat = $2, yangilangan = NOW() WHERE id = $1`, [t.id, yangiHolat]);
    xabar(t.mijoz_id, topildi ? '✅ Буюмингиз топилди' : '❌ Буюм топилмади',
      topildi ? `${t.haydovchi_ism || 'Ҳайдовчи'} буюмни топди — нархни келишинг` : `${t.haydovchi_ism || 'Ҳайдовчи'} буюмни топа олмади`);
    res.json(await toliq(t.id));
  } catch (err) {
    console.error('Топилма жавоб хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/topilma/:id/narx — қарши таклиф (савдо). Иккала томон ҳам бера олади.
const narxTaklif = async (req, res) => {
  try {
    const t = await toliq(req.params.id);
    if (!t) return res.status(404).json({ xato: 'Топилмади' });
    const menRol = rol(t, req.user.id);
    if (!menRol) return res.status(403).json({ xato: 'Рухсат йўқ' });
    if (t.holat !== 'topildi') return res.status(400).json({ xato: 'Ҳозир савдо мумкин эмас' });

    const summa = parseInt(req.body.narx, 10);
    if (!Number.isFinite(summa) || summa < 0) return res.status(400).json({ xato: 'Нарх нотўғри' });

    await query(
      `UPDATE topilmalar SET taklif_narx = $2, taklif_kim = $3, yangilangan = NOW() WHERE id = $1`,
      [t.id, summa, menRol]
    );
    const boshqa = menRol === 'mijoz' ? t.haydovchi_id : t.mijoz_id;
    const ism = menRol === 'mijoz' ? t.mijoz_ism : t.haydovchi_ism;
    xabar(boshqa, '💬 Янги нарх таклифи', `${ism || 'Иштирокчи'}: ${summa.toLocaleString()} сўм`);
    res.json(await toliq(t.id));
  } catch (err) {
    console.error('Топилма нарх хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/topilma/:id/kelishildi — жорий нархга рози бўлиш (ўз таклифини қабул қилиб бўлмайди)
const kelishildi = async (req, res) => {
  try {
    const t = await toliq(req.params.id);
    if (!t) return res.status(404).json({ xato: 'Топилмади' });
    const menRol = rol(t, req.user.id);
    if (!menRol) return res.status(403).json({ xato: 'Рухсат йўқ' });
    if (t.holat !== 'topildi') return res.status(400).json({ xato: 'Ҳозир келишиш мумкин эмас' });
    if (t.taklif_kim === menRol) return res.status(400).json({ xato: 'Ўз таклифингизни қабул қила олмайсиз — иккинчи томон рози бўлсин' });

    await query(
      `UPDATE topilmalar SET holat = 'kelishildi', kelishilgan_narx = taklif_narx, yangilangan = NOW() WHERE id = $1`,
      [t.id]
    );
    const boshqa = menRol === 'mijoz' ? t.haydovchi_id : t.mijoz_id;
    const ism = menRol === 'mijoz' ? t.mijoz_ism : t.haydovchi_ism;
    xabar(boshqa, '🤝 Нарх келишилди', `${ism || 'Иштирокчи'} ${Number(t.taklif_narx).toLocaleString()} сўмга рози бўлди — буюмни етказинг`);
    res.json(await toliq(t.id));
  } catch (err) {
    console.error('Топилма келишиш хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/topilma/:id/qaytarildi — йўловчи буюмни олганини тасдиқлайди (ёпилади)
const qaytarildi = async (req, res) => {
  try {
    const t = await toliq(req.params.id);
    if (!t) return res.status(404).json({ xato: 'Топилмади' });
    if (rol(t, req.user.id) !== 'mijoz') return res.status(403).json({ xato: 'Фақат йўловчи тасдиқлайди' });
    if (t.holat !== 'kelishildi') return res.status(400).json({ xato: 'Аввал нарх келишилсин' });

    await query(`UPDATE topilmalar SET holat = 'qaytarildi', yangilangan = NOW() WHERE id = $1`, [t.id]);
    xabar(t.haydovchi_id, '📦 Буюм қайтарилди', `${t.mijoz_ism || 'Йўловчи'} буюмни олганини тасдиқлади. Раҳмат!`);
    res.json(await toliq(t.id));
  } catch (err) {
    console.error('Топилма қайтариш хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/topilma/:id/bekor — сўровни бекор қилиш (иккала томон ҳам, ёпилмагунча)
const bekor = async (req, res) => {
  try {
    const t = await toliq(req.params.id);
    if (!t) return res.status(404).json({ xato: 'Топилмади' });
    const menRol = rol(t, req.user.id);
    if (!menRol) return res.status(403).json({ xato: 'Рухсат йўқ' });
    if (['qaytarildi', 'bekor', 'topilmadi'].includes(t.holat)) return res.status(400).json({ xato: 'Сўров аллақачон ёпилган' });

    await query(`UPDATE topilmalar SET holat = 'bekor', yangilangan = NOW() WHERE id = $1`, [t.id]);
    const boshqa = menRol === 'mijoz' ? t.haydovchi_id : t.mijoz_id;
    const ism = menRol === 'mijoz' ? t.mijoz_ism : t.haydovchi_ism;
    xabar(boshqa, '🚫 Буюм сўрови бекор қилинди', `${ism || 'Иштирокчи'} сўровни бекор қилди`);
    res.json(await toliq(t.id));
  } catch (err) {
    console.error('Топилма бекор хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = { royxat, yarat, bitta, javob, narxTaklif, kelishildi, qaytarildi, bekor };
