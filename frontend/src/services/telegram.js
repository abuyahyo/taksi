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
