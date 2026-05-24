// Билдиришнома утилитлари — овоз + браузер уведомление
let audioCtx = null;

// Браузер уведомление рухсати сўраш (бир мартагина чақириш)
export async function ruxsatSora() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const javob = await Notification.requestPermission();
    return javob === 'granted';
  } catch {
    return false;
  }
}

// Қисқа "ping" овози — Web Audio API орқали (файл керак эмас)
export function tovush() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(880, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.12);
    g.gain.setValueAtTime(0.001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    o.start();
    o.stop(audioCtx.currentTime + 0.35);
  } catch {/* тинч ўтиш */}
}

// Билдиришнома кўрсатиш — овоз доим, ойна-уведомление таб яшириин бўлса
export function bildir(sarlavha, matn, opts = {}) {
  tovush();
  if (typeof window === 'undefined') return;
  // Таб фокусда бўлса — фақат овоз; яширин ёки бошқа ойнада бўлса — браузер уведомление
  const yashirin = document.hidden || !document.hasFocus();
  if (yashirin && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const n = new Notification(sarlavha, {
        body: matn,
        tag: opts.tag || 'safar-taksi',
        silent: false,
      });
      n.onclick = () => { window.focus(); n.close(); };
      setTimeout(() => n.close(), 7000);
    } catch {/* айрим брауzерлар service worker'сиз қилмайди */}
  }
}
