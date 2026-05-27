// Telegram Mini App — муҳитни аниқлаш ва initData орқали авто-кириш.
// Telegram ичида бўлмаса барча функциялар зарарсиз no-op.
import { api } from './api';

export function tgWebApp() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
}

// Ҳозир Telegram Mini App ичидамизми? (initData бор ва бўш эмас)
export function tgIchidami() {
  const w = tgWebApp();
  return !!(w && typeof w.initData === 'string' && w.initData.length > 0);
}

// Telegram'га "тайёрман" дея экранни тўлиқ очамиз
export function tgTayyorla() {
  const w = tgWebApp();
  if (!w) return;
  try { w.ready(); w.expand(); } catch { /* эски клиент */ }
}

// Браузер geolocation — Promise<[lat,lng]|null>
function webGeo() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

// Жорий жойлашувни олиш — Telegram LocationManager (Mini App, ишончли) ёки
// браузер geolocation (захира). Promise<[lat,lng]> ёки null (рухсат йўқ/хато).
export function joylashuvOl() {
  return new Promise((resolve) => {
    const w = tgWebApp();
    const lm = w && w.LocationManager;
    if (lm && typeof lm.getLocation === 'function') {
      try {
        lm.init(() => {
          if (!lm.isLocationAvailable) { webGeo().then(resolve); return; }
          lm.getLocation((data) => {
            if (data && typeof data.latitude === 'number') resolve([data.latitude, data.longitude]);
            else resolve(null);
          });
        });
        return;
      } catch { /* fall through */ }
    }
    webGeo().then(resolve);
  });
}

// Telegram'да LocationManager созламасини очиш (рухсат рад этилган бўлса)
export function joylashuvSozlama() {
  const lm = tgWebApp()?.LocationManager;
  try { lm?.openSettings?.(); } catch { /* */ }
}

// Telegram'да линкни чатга улашиш (share sheet). Telegram'да эмас → false.
export function tgUlash(url, matn) {
  const w = tgWebApp();
  if (!w || !w.openTelegramLink) return false;
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(matn || '')}`;
  try { w.openTelegramLink(shareUrl); return true; } catch { return false; }
}

// initData орқали серверда аутентификация — JWT олиб localStorage'га ёзамиз.
// Қайтаради: user объекти ёки null (Telegram'да эмас / хато).
export async function tgAvtoKirish() {
  if (!tgIchidami()) return null;
  // Аллақачон токен бўлса қайта кирмаймиз
  if (localStorage.getItem('token')) {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  }
  try {
    const { data } = await api.post('/auth/telegram', { initData: tgWebApp().initData });
    if (data?.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    }
  } catch { /* сервер созланмаган ёки хато — веб оқими билан давом этади */ }
  return null;
}
