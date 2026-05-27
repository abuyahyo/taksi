// Деплойдан кейин янги версияни аниқлаб, иловани автомат қайта юклаш.
// Service worker'га боғлиқ эмас — Telegram webview'да ҳам ишлайди.
// Усул: илова кўринган бўлганда (focus) сервердан янги index.html'ни (no-cache)
// олиб, ундаги асосий JS файл хешини ҳозир ишлаётгани билan солиштирамиз.
// Фарқ бўлса — янги версия деплой қилинган → location.reload().

function yuklanganIndex() {
  if (typeof document === 'undefined') return null;
  const s = document.querySelector('script[src*="/assets/index-"]');
  const m = s && s.src.match(/\/assets\/index-[\w-]+\.js/);
  return m ? m[0] : null;
}

async function deployVersiya() {
  try {
    const r = await fetch('/', { cache: 'no-store' });
    if (!r.ok) return null;
    const html = await r.text();
    const m = html.match(/\/assets\/index-[\w-]+\.js/);
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

export function yangilanishKuzat() {
  const joriy = yuklanganIndex();
  if (!joriy) return; // dev режим — текширмаймиз
  let oxirgi = 0;

  const tekshir = async () => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - oxirgi < 60000) return; // 1 дақ throttle
    oxirgi = Date.now();
    const yangi = await deployVersiya();
    if (yangi && yangi !== joriy) {
      window.location.reload();
    }
  };

  document.addEventListener('visibilitychange', tekshir);
  window.addEventListener('focus', tekshir);
  setInterval(tekshir, 30 * 60 * 1000); // узоқ очиқ турса ҳам
  tekshir(); // илк текширув
}
