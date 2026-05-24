// Socket.io реал вақт мантиғи — буюртма ва нарх алмашуви (inDrive услуби)
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

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

    // ҲАЙДОВЧИ онлайн бўлади
    socket.on('haydovchi_online', (data) => {
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
        const result = await query(
          `INSERT INTO rides (mijoz_id, boshlanish_manzil, tugash_manzil, masofa_km, taklif_narx, holat)
           VALUES ($1, $2, $3, $4, $5, 'kutilmoqda')
           RETURNING id`,
          [mijoz_id, buyurtma.boshlanish, buyurtma.tugash, buyurtma.masofa, buyurtma.narx]
        );
        const dbId = result.rows[0].id;
        const enriched = { ...buyurtma, id: dbId, taklif_id: buyurtma.id };

        faolBuyurtmalar.set(dbId, enriched);
        socket.join(`ride_${dbId}`);

        // Йўловчига — DB id'ни айтамиз (керак бўлса буюртмани кейин ишлатиш учун)
        socket.emit('buyurtma_yaratildi', { id: dbId, taklif_id: buyurtma.id });
        // Барча онлайн ҳайдовчиларга — янги буюртма
        io.to('haydovchilar').emit('buyurtma_keldi', enriched);
        console.log(`📦 Янги буюртма #${dbId}: ${buyurtma.narx} сўм (mijoz=${mijoz_id})`);
      } catch (err) {
        console.error('yangi_buyurtma xato:', err.message);
        socket.emit('xato', { sabab: 'Буюртма яратилмади' });
      }
    });

    // ҲАЙДОВЧИ нарх таклиф қилади
    socket.on('narx_taklif', (taklif) => {
      // Аутентифициядан ҳайдовчи userId'ни қўшамиз — мижоз танлаганда керак бўлади
      const enriched = { ...taklif, haydovchi_id: socket.data.userId || null };
      // Танлансак сафар хонасига қўшилишимиз учун — ҳозироқ қўшилиб қўямиз
      socket.join(`ride_${taklif.rideId}`);
      io.to(`ride_${taklif.rideId}`).emit('yangi_taklif', enriched);
      console.log(`💰 Таклиф #${taklif.rideId}: ${taklif.haydovchi_narx} сўм (haydovchi=${enriched.haydovchi_id})`);
    });

    // ЙЎЛОВЧИ ҳайдовчини танлайди — БАЗАДА ЯНГИЛАЙМИЗ
    socket.on('haydovchi_tanlandi', async (data) => {
      try {
        await query(
          `UPDATE rides
             SET haydovchi_id   = $2,
                 kelishilgan_narx = $3,
                 holat          = 'qabul_qilindi',
                 qabul_vaqti    = NOW()
           WHERE id = $1`,
          [data.rideId, data.haydovchi_id || null, data.narx]
        );
        faolBuyurtmalar.delete(data.rideId);
        io.to('haydovchilar').emit('buyurtma_yopildi', { rideId: data.rideId });
        io.to(`ride_${data.rideId}`).emit('tasdiqlandi', data);
        console.log(`✅ Танланди #${data.rideId} → ${data.haydovchi_ism}`);
      } catch (err) {
        console.error('haydovchi_tanlandi xato:', err.message);
      }
    });

    socket.on('buyurtma_bekor', async (data) => {
      try {
        await query(`UPDATE rides SET holat = 'bekor_qilindi' WHERE id = $1`, [data.rideId]);
        faolBuyurtmalar.delete(data.rideId);
        io.to('haydovchilar').emit('buyurtma_yopildi', { rideId: data.rideId });
      } catch (err) {
        console.error('buyurtma_bekor xato:', err.message);
      }
    });

    socket.on('safarga_qoshil', (data) => {
      socket.join(`ride_${data.rideId}`);
    });

    // САФАР ҲОЛАТИ ўзгариши (ҳайдовчи юборади) — yakunlandi бўлса БАЗАНИ янгилаймиз
    socket.on('safar_holati', async (data) => {
      console.log(`🚦 Сафар #${data.rideId}: ${data.holat}`);

      // "Етиб келдим" — GPS текшируви (рақобатчи муаммосидан ўрганилган)
      if (data.holat === 'yetib_keldi' && data.masofa_m != null && data.masofa_m > 200) {
        socket.emit('holat_rad', {
          rideId: data.rideId,
          sabab: `Сиз йўловчидан ${Math.round(data.masofa_m)} м узоқдасиз. 200 м ичида бўлинг.`,
        });
        return;
      }

      // Сафар тугади — базага yakun_vaqti'ни ёзамиз
      if (data.holat === 'yakunlandi') {
        try {
          await query(
            `UPDATE rides SET holat = 'yakunlandi', yakun_vaqti = NOW() WHERE id = $1`,
            [data.rideId]
          );
        } catch (err) {
          console.error('yakunlandi xato:', err.message);
        }
      }

      io.to(`ride_${data.rideId}`).emit('holat_yangilandi', data);
    });

    socket.on('joylashuv', (data) => {
      io.to(`ride_${data.rideId}`).emit('haydovchi_joylashuvi', data);
    });

    socket.on('baholash', async (data) => {
      console.log(`⭐ Баҳо #${data.rideId}: ${data.ball}/5`);
      try {
        if (socket.data.userId) {
          await query(
            `INSERT INTO ratings (ride_id, baholovchi_id, ball, izoh) VALUES ($1, $2, $3, $4)`,
            [data.rideId, socket.data.userId, data.ball, data.izoh || null]
          );
        }
      } catch (err) {
        console.error('baholash xato:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Узилди:', socket.id);
    });
  });
};
