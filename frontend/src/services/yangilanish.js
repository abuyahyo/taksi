// Деплойдан кейин янги версияни аниқлаб, иловани автомат қайта юклаш.
// МУҲИМ: service worker (PWA) `fetch('/')`ни тутиб эски кэшни беради, шунинг
// учун версияни SW тутмайдиган `/api/version` орқали текширамиз (ишончли,
// браузер ва Telegram'да ҳам). Янги версия топилса — SW ва кэшни тозалаб reload.

function yuklanganIndex() {
  if (typeof document === 'undefined') return null;
  const s = document.querySelector('script[src*="/assets/index-"]');
  const m = s && s.src.match(/\/assets\/index-[\w-]+\.js/);
  return m ? m[0] : null;
}

async function deployVersiya() {
  try {
    const r = await fetch('/api/version', { cache: 'no-store' });
    if (!r.ok) return null;
    const d = await r.json();
    return d.v || null;
  } catch {
    return null;
  }
}

// SW ва кэшни тозалаб, тоза reload — янги версия кафолатли юкланади
async function majburanYangila() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch { /* эътиборсиз */ }
  window.location.reload();
}

export function yangilanishKuzat() {
  const joriy = yuklanganIndex();
  if (!joriy) return; // dev режим
  let oxirgi = 0;

  const tekshir = async () => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - oxirgi < 60000) return; // 1 дақ throttle
    oxirgi = Date.now();
    const yangi = await deployVersiya();
    if (yangi && yangi !== joriy) majburanYangila();
  };

  document.addEventListener('visibilitychange', tekshir);
  window.addEventListener('focus', tekshir);
  setInterval(tekshir, 30 * 60 * 1000);
  tekshir();
}
