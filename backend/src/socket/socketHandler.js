// Socket.io реал вақт мантиғи — буюртма ва нарх алмашуви
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { obunaFaolmi } = require('../controllers/subscriptionController');
const { yuborFoydalanuvchiga, yuborRolga } = require('../controllers/pushController');
const { kutishHaqiHisobla } = require('../utils/kutishHaqi');

// Фаол буюртмалар: rideId -> buyurtma ma'lumoti
const faolBuyurtmalar = new Map();

module.exports = (io) => {
  // JWT (ихтиёрий) — токен бўлса декодлаб socket.data'га қўямиз. Йўқ бўлса меҳмон.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.data.userId = decoded.id;
        socket.data.rol = decoded.rol;
      } catch {
        // ноto'g'ri токен — меҳмон сифатида давом этамиз
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log('🔌 Уланди:', socket.id, socket.data.userId ? `(user ${socket.data.userId})` : '(meҳмon)');

    // Шахсий хона — фойдаланувчига аниқ йўналтирилган ҳодисалар учун
    // (масалан, танлангач уни сафар хонасига сервер томонидан қўшиш).
    if (socket.data.userId) socket.join(`user_${socket.data.userId}`);

    // ҲАЙДОВЧИ онлайн бўлади — обуна текширилади
    socket.on('haydovchi_online', async (data) => {
      // Фаол обунасиз онлайн бўлолмайди
      if (socket.data.userId) {
        const obunaBor = await obunaFaolmi(socket.data.userId);
        if (!obunaBor) {
          socket.emit('obuna_kerak', { sabab: 'Обунангиз тугаган. Янги обуна сотиб олинг.' });
          return;
        }
      }
      socket.data.haydovchi_ism = data.ism;
      socket.join('haydovchilar');
      console.log(`🚗 Ҳайдовчи онлайн: ${data.ism}`);
      socket.emit('mavjud_buyurtmalar', Array.from(faolBuyurtmalar.values()));
    });

    socket.on('haydovchi_offline', () => {
      socket.leave('haydovchilar');
    });

    // ЙЎЛОВЧИ янги буюртма беради — БАЗАГА ЁЗАМИЗ ва DB id'ни оламиз
    socket.on('yangi_buyurtma', async (buyurtma) => {
      try {
        const mijoz_id = socket.data.userId || null; // меҳмон бўлиши мумкин
        // Мижоз исм ва рейтингини оламиз — ҳайдовчи кўриш учун
        let mijoz_ism = buyurtma.mijoz || 'Меҳмон';
        let mijoz_reyting = 5.0;
        if (mijoz_id) {
          const u = await query(`SELECT ism, reyting FROM users WHERE id = $1`, [mijoz_id]);
          if (u.rows[0]) {
            mijoz_ism = u.rows[0].ism;
            mijoz_reyting = Number(u.rows[0].reyting);
          }
        }
        const pin = String(Math.floor(1000 + Math.random() * 9000)); // 4 хонали машина PIN-коди
        const tarif = ['ekonom', 'komfort', 'dostavka'].includes(buyurtma.tarif) ? buyurtma.tarif : 'ekonom';
        // Буюртма опциялари — серверда тозалаб JSONB сифатида сақлаймиз
        const o = buyurtma.opsiyalar || {};
        const opsiyalar = {
          izoh: typeof o.izoh === 'string' ? o.izoh.trim().slice(0, 200) || null : null,
          boshqaUchun: !!o.boshqaUchun,
          yuk: !!o.yuk,
        };
        // Олдиндан буюртма — режа вақти (келажакда, макс 14 кун) бўлса сақлаймиз
        let rejaVaqt = null;
        if (buyurtma.reja_vaqt) {
          const d = new Date(buyurtma.reja_vaqt);
          const now = Date.now();
          if (!isNaN(d) && d.getTime() > now + 5 * 60000 && d.getTime() < now + 14 * 86400000) {
            rejaVaqt = d.toISOString();
          }
        }
        // Оралиқ манзиллар (кўп манзил) — стринглар рўйхати, макс 5 та
        const oraliqlar = Array.isArray(buyurtma.oraliq_manzillar)
          ? buyurtma.oraliq_manzillar.filter((x) => typeof x === 'string' && x.trim()).slice(0, 5).map((x) => x.trim().slice(0, 200))
          : [];
        // Пикап ва манзил координаталари — ҳайдовчи ETA ҳисоблаши ва харита учун
        const koord = (k) => {
          const v = Array.isArray(k) ? k : [];
          const lat = parseFloat(v[0]), lng = parseFloat(v[1]);
          return (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180)
            ? [lat, lng] : [null, null];
        };
        const [bLat, bLng] = koord(buyurtma.boshlanish_koord);
        const [tLat, tLng] = koord(buyurtma.tugash_koord);
        const result = await query(
          `INSERT INTO rides (mijoz_id, boshlanish_manzil, tugash_manzil, masofa_km, taklif_narx, holat, pin, tarif, opsiyalar, rejalashtirilgan_vaqt, oraliq_manzillar, boshlanish_lat, boshlanish_lng, tugash_lat, tugash_lng)
           VALUES ($1, $2, $3, $4, $5, 'kutilmoqda', $6, $7, $8, $9, $10, $11, $12, $13, $14)
           RETURNING id`,
          [mijoz_id, buyurtma.boshlanish, buyurtma.tugash, buyurtma.masofa, buyurtma.narx, pin, tarif, JSON.stringify(opsiyalar), rejaVaqt, JSON.stringify(oraliqlar), bLat, bLng, tLat, tLng]
        );
        const dbId = result.rows[0].id;
        const enriched = { ...buyurtma, id: dbId, taklif_id: buyurtma.id, tarif, opsiyalar, reja_vaqt: rejaVaqt, oraliq_manzillar: oraliqlar, mijoz_id, mijoz_ism, mijoz: mijoz_ism, reyting: mijoz_reyting };

        faolBuyurtmalar.set(dbId, enriched);
        socket.join(`ride_${dbId}`);

        // Йўловчига — DB id ва PIN (фақат йўловчига; ҳайдовчиларга юборилмайди)
        socket.emit('buyurtma_yaratildi', { id: dbId, taklif_id: buyurtma.id, pin });
        // Барча онлайн ҳайдовчиларга — янги буюртма
        io.to('haydovchilar').emit('buyurtma_keldi', enriched);
        // Push — илова ёпиқ ҳайдовчиларга ҳам (обуна қилганлари)
        yuborRolga('haydovchi', {
          title: '🚖 Янги буюртма',
          body: `${Number(buyurtma.narx).toLocaleString()} сўм · ${buyurtma.boshlanish} → ${buyurtma.tugash}`,
          tag: `buyurtma-${dbId}`,
          url: '/haydovchi',
        });
        console.log(`📦 Янги буюртма #${dbId}: ${buyurtma.narx} сўм (mijoz=${mijoz_id})`);
      } catch (err) {
        console.error('yangi_buyurtma xato:', err.message);
        socket.emit('xato', { sabab: 'Буюртма яратилмади' });
      }
    });

    // ҲАЙДОВЧИ нарх таклиф қилади
    socket.on('narx_taklif', async (taklif) => {
      // Фақат онлайн (обунаси текширилган) ҳайдовчи таклиф бера олади.
      // haydovchi_online'да 'haydovchilar' хонасига қўшилган — шуни талаб қиламиз.
      if (!socket.data.userId || !socket.rooms.has('haydovchilar')) return;
      // Сафар мавжуд ва ҳали кутилаётган бўлсагина таклиф қабул қиламиз
      // (аллақачон қабул/бекор қилинган сафарга таклиф боришини тўсамиз).
      let mijozId;
      try {
        const rr = await query(`SELECT mijoz_id, holat FROM rides WHERE id = $1`, [taklif.rideId]);
        if (!rr.rows[0] || rr.rows[0].holat !== 'kutilmoqda') return;
        mijozId = rr.rows[0].mijoz_id;
      } catch (err) { console.error('narx_taklif tekshir xato:', err.message); return; }
      // haydovchi_id ва тасдиқ белгисини серверда аниқлаймиз — сохталаштириб бўлмайди
      let tasdiqlangan = false;
      try {
        const d = await query(`SELECT tasdiqlangan FROM drivers WHERE user_id = $1`, [socket.data.userId]);
        tasdiqlangan = !!d.rows[0]?.tasdiqlangan;
      } catch (err) { console.error('tasdiq tekshir xato:', err.message); }
      const enriched = { ...taklif, haydovchi_id: socket.data.userId, tasdiqlangan };
      // Хонага ҲОЗИР қўшилмаймиз — акс ҳолда таклиф берган ҲАР БИР ҳайдовчи мижознинг
      // чати ва жонли GPS'ини эшитарди. Хонага фақат танлангач қўшамиз (haydovchi_tanlandi).
      io.to(`ride_${taklif.rideId}`).emit('yangi_taklif', enriched);
      // Push — йўловчига (илова ёпиқ бўлса ҳам янги таклифни кўрсин)
      try {
        if (mijozId) {
          yuborFoydalanuvchiga(mijozId, {
            title: '💰 Янги таклиф',
            body: `${taklif.haydovchi_ism} · ${Number(taklif.haydovchi_narx).toLocaleString()} сўм`,
            tag: `taklif-${taklif.rideId}`,
            url: '/yolovchi',
          });
        }
      } catch (err) { console.error('taklif push xato:', err.message); }
      console.log(`💰 Таклиф #${taklif.rideId}: ${taklif.haydovchi_narx} сўм (haydovchi=${enriched.haydovchi_id})`);
    });

    // Сафар эгаси (мижоз)ни текшириш ёрдамчиси.
    // Рўйхатдан ўтган мижоз — token id мос келиши керак.
    // Меҳмон (mijoz_id=null) — буюртма яратган socket хонада (ride_${id}) бўлади.
    function egasimi(mijozId, rideId) {
      if (mijozId) return mijozId === socket.data.userId;
      return socket.rooms.has(`ride_${rideId}`);
    }

    // ЙЎЛОВЧИ ҳайдовчини танлайди — БАЗАДА ЯНГИЛАЙМИЗ
    socket.on('haydovchi_tanlandi', async (data) => {
      try {
        // Фақат сафар эгаси ва фақат ҳали кутилаётган сафарни танлай олади
        const tek = await query(`SELECT mijoz_id, holat FROM rides WHERE id = $1`, [data.rideId]);
        if (!tek.rows[0]) return;
        if (!egasimi(tek.rows[0].mijoz_id, data.rideId)) return;
        if (tek.rows[0].holat !== 'kutilmoqda') return; // аллақачон қабул/бекор

        await query(
          `UPDATE rides
             SET haydovchi_id   = $2,
                 kelishilgan_narx = $3,
                 holat          = 'qabul_qilindi',
                 qabul_vaqti    = NOW()
           WHERE id = $1 AND holat = 'kutilmoqda'`,
          [data.rideId, data.haydovchi_id || null, data.narx]
        );
        // Ҳайдовчига мижоз исмини қўшиб юборамиз (баҳолаш ва чат учун)
        const r = await query(
          `SELECT r.mijoz_id, u.ism AS mijoz_ism FROM rides r LEFT JOIN users u ON r.mijoz_id = u.id WHERE r.id = $1`,
          [data.rideId]
        );
        const enriched = { ...data, mijoz_id: r.rows[0]?.mijoz_id || null, mijoz_ism: r.rows[0]?.mijoz_ism || null };
        // Танланган ҳайдовчини энди сафар хонасига қўшамиз (таклиф пайтида қўшмаган
        // эдик). Шу пайтдан у чат, GPS ва ҳолат янгиланишларини олади.
        if (data.haydovchi_id) {
          io.in(`user_${data.haydovchi_id}`).socketsJoin(`ride_${data.rideId}`);
        }
        faolBuyurtmalar.delete(data.rideId);
        io.to('haydovchilar').emit('buyurtma_yopildi', { rideId: data.rideId });
        io.to(`ride_${data.rideId}`).emit('tasdiqlandi', enriched);
        console.log(`✅ Танланди #${data.rideId} → ${data.haydovchi_ism}`);
      } catch (err) {
        console.error('haydovchi_tanlandi xato:', err.message);
      }
    });

    socket.on('buyurtma_bekor', async (data) => {
      try {
        // Фақат сафар эгаси бекор қила олади
        const tek = await query(`SELECT mijoz_id FROM rides WHERE id = $1`, [data.rideId]);
        if (!tek.rows[0] || !egasimi(tek.rows[0].mijoz_id, data.rideId)) return;
        await query(`UPDATE rides SET holat = 'bekor_qilindi' WHERE id = $1`, [data.rideId]);
        faolBuyurtmalar.delete(data.rideId);
        io.to('haydovchilar').emit('buyurtma_yopildi', { rideId: data.rideId });
      } catch (err) {
        console.error('buyurtma_bekor xato:', err.message);
      }
    });

    // Сафар хонасига қайта қўшилиш — фақат шу сафар иштирокчиси.
    // Меҳмон йўловчи буюртма яратишда хонага қўшилган бўлади; кузатувчилар
    // эса share_qoshil (калит билан) орқали қўшилади.
    socket.on('safarga_qoshil', async (data) => {
      if (!socket.data.userId) return;
      const r = await query(
        `SELECT 1 FROM rides WHERE id = $1 AND (mijoz_id = $2 OR haydovchi_id = $2)`,
        [data.rideId, socket.data.userId]
      );
      if (r.rows.length) socket.join(`ride_${data.rideId}`);
    });

    // Улашилган линкдан кирганлар — кузатувчи сифатида сафар хонасига қўшилади
    socket.on('share_qoshil', async ({ kalit }) => {
      try {
        const r = await query(
          `SELECT ride_id FROM ride_shares WHERE kalit = $1 AND tugaydigan > NOW()`,
          [kalit]
        );
        if (r.rows[0]) {
          socket.join(`ride_${r.rows[0].ride_id}`);
          socket.data.kuzatuvchi = true;
        }
      } catch (err) {
        console.error('share_qoshil xato:', err.message);
      }
    });

    // САФАР ҲОЛАТИ ўзгариши (ҳайдовчи юборади)
    socket.on('safar_holati', async (data) => {
      // Фақат шу сафарга бириктирилган ҳайдовчи ҳолатни ўзгартира олади
      if (!socket.data.userId) return;
      const own = await query(`SELECT haydovchi_id FROM rides WHERE id = $1`, [data.rideId]);
      if (!own.rows[0] || own.rows[0].haydovchi_id !== socket.data.userId) return;

      console.log(`🚦 Сафар #${data.rideId}: ${data.holat}`);
      const javob = { ...data };

      // "Етиб келдим" — GPS текшируви + кутиш таймерини бошлаш
      if (data.holat === 'yetib_keldi') {
        if (data.masofa_m != null && data.masofa_m > 200) {
          socket.emit('holat_rad', {
            rideId: data.rideId,
            sabab: `Сиз йўловчидан ${Math.round(data.masofa_m)} м узоқдасиз. 200 м ичида бўлинг.`,
          });
          return;
        }
        try {
          await query(
            `UPDATE rides SET kelgan_vaqti = NOW() WHERE id = $1 AND kelgan_vaqti IS NULL`,
            [data.rideId]
          );
        } catch (err) { console.error('kelgan_vaqti xato:', err.message); }
      }

      // "Йўлга чиқдик" — машина PIN-кодини текшириш (нотўғри/қалбаки машинадан ҳимоя)
      if (data.holat === 'yolda') {
        const p = await query(`SELECT pin FROM rides WHERE id = $1`, [data.rideId]);
        const haqiqiyPin = p.rows[0]?.pin;
        if (haqiqiyPin && String(data.pin || '') !== String(haqiqiyPin)) {
          socket.emit('pin_xato', { rideId: data.rideId, sabab: 'PIN нотўғри' });
          return;
        }
      }

      // "Йўлга чиқдик" — кутиш ҳақини ҳисоблаб нархни янгилаймиз
      if (data.holat === 'yolda') {
        try {
          const r = await query(
            `SELECT EXTRACT(EPOCH FROM (NOW() - kelgan_vaqti))/60 AS daqiqa,
                    kelishilgan_narx
             FROM rides WHERE id = $1 AND kelgan_vaqti IS NOT NULL AND yolga_chiqqan_vaqti IS NULL`,
            [data.rideId]
          );
          if (r.rows[0]) {
            // floor — фақат тўла пуллик дақиқалар учун ҳақ оламиз (йўловчи учун адолатли)
            const totalDaq = parseFloat(r.rows[0].daqiqa);
            const haq = kutishHaqiHisobla(totalDaq);
            const eskiNarx = Number(r.rows[0].kelishilgan_narx) || 0;
            const yangiNarx = eskiNarx + haq;
            await query(
              `UPDATE rides SET yolga_chiqqan_vaqti = NOW(), kutish_haqi = $2, kelishilgan_narx = $3 WHERE id = $1`,
              [data.rideId, haq, yangiNarx]
            );
            javob.kutish_haqi = haq;
            javob.yangi_narx  = yangiNarx;
          }
        } catch (err) { console.error('yolda xato:', err.message); }
      }

      // Сафар тугади
      if (data.holat === 'yakunlandi') {
        try {
          await query(
            `UPDATE rides SET holat = 'yakunlandi', yakun_vaqti = NOW() WHERE id = $1`,
            [data.rideId]
          );
        } catch (err) { console.error('yakunlandi xato:', err.message); }
      }

      io.to(`ride_${data.rideId}`).emit('holat_yangilandi', javob);

      // Push — йўловчига (ҳайдовчи етиб келди / сафар тугади)
      if (data.holat === 'yetib_keldi' || data.holat === 'yakunlandi') {
        try {
          const rr = await query(`SELECT mijoz_id FROM rides WHERE id = $1`, [data.rideId]);
          const mid = rr.rows[0]?.mijoz_id;
          if (mid) {
            const payload = data.holat === 'yetib_keldi'
              ? { title: '🚗 Ҳайдовчи етиб келди', body: 'Ҳайдовчи сизни кутмоқда', tag: `holat-${data.rideId}`, url: '/yolovchi' }
              : { title: '✅ Сафар тугади', body: 'Ҳайдовчини баҳоланг', tag: `holat-${data.rideId}`, url: '/yolovchi' };
            yuborFoydalanuvchiga(mid, payload);
          }
        } catch (err) { console.error('holat push xato:', err.message); }
      }
    });

    socket.on('joylashuv', (data) => {
      // Фақат шу сафар хонасидаги ҳайдовчи жонли GPS юбора олади —
      // акс ҳолда исталган киши ҳайдовчи жойини сохталаштириши мумкин эди.
      if (socket.data.rol !== 'haydovchi' || !socket.rooms.has(`ride_${data.rideId}`)) return;
      io.to(`ride_${data.rideId}`).emit('haydovchi_joylashuvi', data);
    });

    // Админ хонасига қўшиш — sos сигналлари учун
    socket.on('admin_qoshil', () => {
      if (socket.data.rol === 'admin') {
        socket.join('adminlar');
      }
    });

    // 🆘 SOS — шошилинч сигнал
    socket.on('sos_yuborildi', async (data) => {
      // data = { rideId, lat, lng, matn }
      try {
        const userId = socket.data.userId;
        const rol = socket.data.rol || 'mijoz';
        const r = await query(
          `INSERT INTO sos_signals (ride_id, yuboruvchi_id, rol, lat, lng, matn)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, vaqt`,
          [data.rideId || null, userId || null, rol, data.lat || null, data.lng || null, data.matn || null]
        );
        // Юборувчи исмини оламиз
        let ism = 'Меҳмон';
        if (userId) {
          const u = await query(`SELECT ism, telefon FROM users WHERE id = $1`, [userId]);
          ism = u.rows[0]?.ism || 'Фойдаланувчи';
        }
        const sig = {
          id: r.rows[0].id,
          rideId: data.rideId,
          yuboruvchi_id: userId,
          yuboruvchi_ism: ism,
          rol,
          lat: data.lat, lng: data.lng,
          matn: data.matn,
          vaqt: r.rows[0].vaqt,
        };
        // Барча админларга жонли юборамиз
        io.to('adminlar').emit('sos_keldi', sig);
        // Push — барча админларга (панель ёпиқ бўлса ҳам)
        yuborRolga('admin', {
          title: '🆘 SOS сигнал',
          body: `${ism} (${rol}) — сафар #${data.rideId || '?'}`,
          tag: `sos-${sig.id}`,
          url: '/admin',
        });
        // Юборувчига тасдиқ
        socket.emit('sos_qabul_qilindi', { id: sig.id });
        console.log(`🆘 SOS #${sig.id} ${rol}=${ism}, ride=${data.rideId}`);
      } catch (err) {
        console.error('sos_yuborildi xato:', err.message);
        socket.emit('xato', { sabab: 'SOS жўнатилмади' });
      }
    });

    // ЧАТ — йўловчи ↔ ҳайдовчи хабар алмашуви (меҳмон ҳам юбора олади)
    socket.on('xabar_yuborish', async (data) => {
      // data = { rideId, matn }
      // Фақат шу сафар иштирокчиси (хонадаги) хабар юбора олади.
      // Кузатувчи (улашилган линк) ёки бошқа сафар одами хабар юбора олмайди.
      if (!socket.rooms.has(`ride_${data.rideId}`) || socket.data.kuzatuvchi) return;
      try {
        const userId = socket.data.userId || null;
        const matn = typeof data.matn === 'string' ? data.matn.trim().slice(0, 1000) : '';
        if (!matn) return;
        const r = await query(
          `INSERT INTO messages (ride_id, yuboruvchi_id, matn) VALUES ($1, $2, $3)
           RETURNING id, vaqt`,
          [data.rideId, userId, matn]
        );
        // Юборувчи исми — рўйхатдан ўтган бўлса users'дан, бўлмаса 'Йўловчи'
        let yuboruvchi_ism = 'Йўловчи';
        if (userId) {
          const u = await query(`SELECT ism FROM users WHERE id = $1`, [userId]);
          yuboruvchi_ism = u.rows[0]?.ism || 'Фойдаланувчи';
        }
        const xabar = {
          id: r.rows[0].id,
          ride_id: data.rideId,
          yuboruvchi_id: userId,
          yuboruvchi_ism,
          matn,
          vaqt: r.rows[0].vaqt,
        };
        io.to(`ride_${data.rideId}`).emit('xabar_keldi', xabar);
        // Push — суҳбатдошга (чат ёпиқ/илова ёпиқ бўлса ҳам)
        try {
          const rr = await query(`SELECT mijoz_id, haydovchi_id FROM rides WHERE id = $1`, [data.rideId]);
          if (rr.rows[0]) {
            const { mijoz_id, haydovchi_id } = rr.rows[0];
            const qabul = Number(userId) === Number(mijoz_id) ? haydovchi_id : mijoz_id;
            if (qabul) {
              yuborFoydalanuvchiga(qabul, {
                title: `💬 ${yuboruvchi_ism}`,
                body: matn.slice(0, 120),
                tag: `chat-${data.rideId}`,
                url: '/',
              });
            }
          }
        } catch (err) { console.error('chat push xato:', err.message); }
        console.log(`💬 #${data.rideId} ${userId || 'guest'}: ${matn.slice(0, 30)}`);
      } catch (err) {
        console.error('xabar_yuborish xato:', err.message);
      }
    });

    // 💵 Чаёвой — йўловчи сафар тугагач ҳайдовчига рағбат қўшади
    socket.on('chayovoy', async (data) => {
      try {
        const userId = socket.data.userId;
        if (!userId) return;
        const summa = Number(data.summa);
        if (!Number.isFinite(summa) || summa <= 0 || summa > 1_000_000) return;
        // Сафар йўловчиси текширилади
        const r = await query(`SELECT mijoz_id, haydovchi_id, kelishilgan_narx FROM rides WHERE id = $1`, [data.rideId]);
        if (r.rows.length === 0 || r.rows[0].mijoz_id !== userId) return;
        // Чаёвой ёзилади ва нархга қўшилади
        await query(
          `UPDATE rides SET chayovoy = COALESCE(chayovoy, 0) + $2,
                            kelishilgan_narx = COALESCE(kelishilgan_narx, 0) + $2
           WHERE id = $1`,
          [data.rideId, summa]
        );
        console.log(`💵 Чаёвой #${data.rideId}: +${summa}`);
        socket.emit('chayovoy_qabul', { ok: true, summa });
      } catch (err) {
        console.error('chayovoy xato:', err.message);
      }
    });

    // Баҳолаш — мижоз ҳайдовчини, ҳайдовчи мижозни баҳолайди
    socket.on('baholash', async (data) => {
      // data = { rideId, ball, izoh }
      const baholovchi = socket.data.userId;
      if (!baholovchi) return; // меҳмонлар баҳолай олмайди
      const ball = Number(data.ball);
      if (!Number.isInteger(ball) || ball < 1 || ball > 5) return;
      try {
        // Бу сафарнинг иштирокчиларини оламиз
        const ride = await query(
          `SELECT mijoz_id, haydovchi_id FROM rides WHERE id = $1`,
          [data.rideId]
        );
        if (ride.rows.length === 0) return;
        const { mijoz_id, haydovchi_id } = ride.rows[0];
        if (baholovchi !== mijoz_id && baholovchi !== haydovchi_id) return; // иштирокчи эмас
        const baholanuvchi = baholovchi === mijoz_id ? haydovchi_id : mijoz_id;
        if (!baholanuvchi) return;

        // Икки марта баҳолашни олдини оламиз — мавжуд бўлса янгилаймиз, бўлмаса янги
        const yang = await query(
          `UPDATE ratings SET ball = $3, izoh = $4, vaqt = NOW()
             WHERE ride_id = $1 AND baholovchi_id = $2`,
          [data.rideId, baholovchi, ball, data.izoh || null]
        );
        if (yang.rowCount === 0) {
          await query(
            `INSERT INTO ratings (ride_id, baholovchi_id, baholanuvchi_id, ball, izoh)
             VALUES ($1, $2, $3, $4, $5)`,
            [data.rideId, baholovchi, baholanuvchi, ball, data.izoh || null]
          );
        }

        // Баҳоланганнинг users.reyting'и — олинган барча баҳоларнинг ўртачаси
        await query(
          `UPDATE users SET reyting = (
             SELECT COALESCE(ROUND(AVG(ball)::numeric, 1), 5.0)
             FROM ratings WHERE baholanuvchi_id = $1
           ) WHERE id = $1`,
          [baholanuvchi]
        );
        console.log(`⭐ Баҳо #${data.rideId}: ${ball}/5 (${baholovchi} → ${baholanuvchi})`);
      } catch (err) {
        console.error('baholash xato:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Узилди:', socket.id);
    });
  });
};
