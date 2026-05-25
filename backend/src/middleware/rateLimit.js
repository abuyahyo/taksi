// Оддий хотирадаги rate limiter — brute-force ҳужумларини секинлаштириш учун.
// Зависимостьсиз; битта инстанс (Cloudflare Tunnel) учун етарли.

// Ҳақиқий мижоз IP'си — Cloudflare 'CF-Connecting-IP' беради, акс ҳолда XFF, сўнг socket.
function mijozIp(req) {
  const cf = req.headers['cf-connecting-ip'];
  if (cf) return cf;
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'nomalum';
}

// oyna (ms) ичида koʻpi bilan 'maks' сўров. Ошса 429.
function rateLimit({ oyna, maks, xabar = 'Жуда кўп уриниш. Бироздан кейин қайта уриниб кўринг.' }) {
  const urinishlar = new Map(); // ip -> [timestamp, ...]

  return (req, res, next) => {
    const ip = mijozIp(req);
    const hozir = Date.now();
    const ozdan = hozir - oyna;

    const ruyxat = (urinishlar.get(ip) || []).filter((t) => t > ozdan);
    if (ruyxat.length >= maks) {
      const eng_eski = ruyxat[0];
      const qoldi = Math.ceil((eng_eski + oyna - hozir) / 1000);
      res.set('Retry-After', String(qoldi));
      return res.status(429).json({ xato: xabar });
    }

    ruyxat.push(hozir);
    urinishlar.set(ip, ruyxat);

    // Хотира ўсиб кетмасин — вақти-вақти билан эски ёзувларни тозалаймиз
    if (urinishlar.size > 5000) {
      for (const [k, v] of urinishlar) {
        const tirik = v.filter((t) => t > ozdan);
        if (tirik.length === 0) urinishlar.delete(k);
        else urinishlar.set(k, tirik);
      }
    }

    next();
  };
}

module.exports = { rateLimit };
