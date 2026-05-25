// Web Push обунаси — фойдаланувчи логин қилгач чақирилади.
// Push ихтиёрий: қўллаб-қувватланмаса ёки рухсат йўқ бўлса, жим чиқиб кетади.
import { api } from './api';

function toUint8(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function pushObunaBol() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'granted') return; // рухсат бошқа жойда сўралади
    const reg = await navigator.serviceWorker.ready;
    const { data } = await api.get('/push/vapid');
    if (!data?.publicKey) return; // сервер VAPID'ни созламаган
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8(data.publicKey),
      });
    }
    await api.post('/push/subscribe', sub.toJSON());
  } catch (err) {
    console.warn('Push обуна бўлмади:', err?.message);
  }
}
