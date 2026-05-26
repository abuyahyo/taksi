// Хавфсизлик HTTP-headerlar (зависимостьсиз, енгил helmet ўрнига).
// МУҲИМ: Telegram Mini App иловани iframe/webview'да юклайди — шунинг учун
// framing'ни ТЎСМАЙМИЗ (X-Frame-Options йўқ) ва геолокацияни очиқ қолдирамиз
// (ҳайдовчи жонли GPS'и учун).
function xavfsizlikHeaders(req, res, next) {
  // MIME-sniffing'ни тўхтатиш
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Referrer — фақат origin'ни ташқарига юбориш
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  // Браузер имкониятлари — гео очиқ (GPS керак), микрофон/камера ёпиқ
  res.setHeader('Permissions-Policy', 'geolocation=*, microphone=(), camera=()');
  // HSTS — фақат HTTPS ортида (Cloudflare Tunnel HTTPS беради). Localhost'да эмас.
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
}

module.exports = { xavfsizlikHeaders };
