// Socket.io реал вақт мантиғи — буюртма ва нарх алмашуви (inDrive услуби)

// Онлайн ҳайдовчилар: socketId -> { userId, ism }
const onlaynHaydovchilar = new Map();
// Фаол буюртмалар: rideId -> buyurtma ma'lumoti
const faolBuyurtmalar = new Map();

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 Уланди:', socket.id);

    // ҲАЙДОВЧИ онлайн бўлади
    socket.on('haydovchi_online', (data) => {
      onlaynHaydovchilar.set(socket.id, { userId: data.userId, ism: data.ism });
      socket.join('haydovchilar'); // барча ҳайдовчилар хонаси
      console.log(`🚗 Ҳайдовчи онлайн: ${data.ism}`);
      // Унга мавжуд фаол буюртмаларни юборамиз
      socket.emit('mavjud_buyurtmalar', Array.from(faolBuyurtmalar.values()));
    });

    // ҲАЙДОВЧИ офлайн бўлади
    socket.on('haydovchi_offline', () => {
      onlaynHaydovchilar.delete(socket.id);
      socket.leave('haydovchilar');
    });

    // ЙЎЛОВЧИ янги буюртма беради
    socket.on('yangi_buyurtma', (buyurtma) => {
      faolBuyurtmalar.set(buyurtma.id, buyurtma);
      socket.join(`ride_${buyurtma.id}`); // йўловчи ўз буюртма хонасига
      console.log(`📦 Янги буюртма #${buyurtma.id}: ${buyurtma.narx} сўм`);
      // Барча онлайн ҳайдовчиларга юборамиз
      io.to('haydovchilar').emit('buyurtma_keldi', buyurtma);
    });

    // ҲАЙДОВЧИ нарх таклиф қилади (рози ёки ўз нархи)
    socket.on('narx_taklif', (taklif) => {
      // taklif = { rideId, haydovchi_ism, haydovchi_narx, reyting, mashina, min }
      console.log(`💰 Таклиф: #${taklif.rideId} → ${taklif.haydovchi_narx} сўм`);
      // Фақат ўша буюртма йўловчисига юборамиз
      io.to(`ride_${taklif.rideId}`).emit('yangi_taklif', taklif);
    });

    // ЙЎЛОВЧИ ҳайдовчини танлайди
    socket.on('haydovchi_tanlandi', (data) => {
      // data = { rideId, haydovchi_ism, narx }
      console.log(`✅ Танланди: #${data.rideId} → ${data.haydovchi_ism}`);
      faolBuyurtmalar.delete(data.rideId);
      // Барча ҳайдовчиларга — бу буюртма ёпилди деб хабар берамиз
      io.to('haydovchilar').emit('buyurtma_yopildi', { rideId: data.rideId });
      // Танланган ҳайдовчига — сен танландинг деб хабар
      io.to(`ride_${data.rideId}`).emit('tasdiqlandi', data);
    });

    // ЙЎЛОВЧИ буюртмани бекор қилади
    socket.on('buyurtma_bekor', (data) => {
      faolBuyurtmalar.delete(data.rideId);
      io.to('haydovchilar').emit('buyurtma_yopildi', { rideId: data.rideId });
    });

    // ҲАЙДОВЧИ танлангандан кейин сафар хонасига қўшилади
    socket.on('safarga_qoshil', (data) => {
      socket.join(`ride_${data.rideId}`);
    });

    // САФАР ҲОЛАТИ ўзгариши (ҳайдовчи юборади)
    // holat: kelmoqda | yetib_keldi | yolda | yakunlandi
    socket.on('safar_holati', (data) => {
      // data = { rideId, holat, lat, lng }
      console.log(`🚦 Сафар #${data.rideId}: ${data.holat}`);

      // "Етиб келдим" — GPS текшируви (рақобатчи муаммосидан ўрганилган)
      // Ҳайдовчи ҳақиқатан йўловчига яқинми? (200 метр ичида)
      if (data.holat === 'yetib_keldi' && data.masofa_m != null) {
        if (data.masofa_m > 200) {
          // Жуда узоқ — рад этамиз
          socket.emit('holat_rad', {
            rideId: data.rideId,
            sabab: `Сиз йўловчидан ${Math.round(data.masofa_m)} м узоқдасиз. 200 м ичида бўлинг.`,
          });
          return;
        }
      }

      // Ҳолатни сафардаги ҳаммага юборамиз (йўловчи ва ҳайдовчи)
      io.to(`ride_${data.rideId}`).emit('holat_yangilandi', data);
    });

    // ҲАЙДОВЧИ жонли жойлашувини юборади (харитада кузатиш учун)
    socket.on('joylashuv', (data) => {
      // data = { rideId, lat, lng }
      io.to(`ride_${data.rideId}`).emit('haydovchi_joylashuvi', data);
    });

    // БАҲОЛАШ (сафар тугагач)
    socket.on('baholash', (data) => {
      // data = { rideId, ball, izoh }
      console.log(`⭐ Баҳо #${data.rideId}: ${data.ball}/5`);
      // Бу ерда базага сақланади (кейинги қадам)
    });

    socket.on('disconnect', () => {
      onlaynHaydovchilar.delete(socket.id);
      console.log('❌ Узилди:', socket.id);
    });
  });
};
