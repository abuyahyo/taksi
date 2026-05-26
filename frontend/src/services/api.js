// API ва Socket уланиш созламалари
import axios from 'axios';
import { io } from 'socket.io-client';

// Production build'да — same origin (BASE_URL бўш), backend frontend'ни ҳам беради.
// Dev режимида — localhost:5000 (Vite dev server бошқа портда).
const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:5000');

// Axios — HTTP сўровлар учун
export const api = axios.create({
  baseURL: BASE_URL ? `${BASE_URL}/api` : '/api',
  // ngrok бепул план браузер огоҳлантириш саҳифасини сўровларга қўяди —
  // бу header уни ўтказиб юборади (бошқа хостларга зарарсиз).
  headers: { 'ngrok-skip-browser-warning': 'true' },
});

// Ҳар сўровга токенни автоматик қўшиш
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Токен муддати тугаганда (401) — сессияни тозалаб бош саҳифага қайтарамиз.
// Акс ҳолда фойдаланувчи "киргандек" қолиб, сўровлар жимгина йиқиларди.
api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/') window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// Йўл ҳисоблаш — реал йўл масофаси, ETA ва йўл чизиғи (OSRM, захира Haversine).
// nuqtalar = [[lat,lng], ...]. Хато бўлса null қайтаради.
export async function yolHisobla(nuqtalar) {
  const yaroqli = (nuqtalar || []).filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (yaroqli.length < 2) return null;
  try {
    const koord = yaroqli.map(([lat, lng]) => `${lat},${lng}`).join(';');
    const { data } = await api.get('/geocode/route', { params: { koord } });
    return data;
  } catch {
    return null;
  }
}

// Socket.io — реал вақт алоқаси учун (BASE_URL бўш бўлса — same origin)
// Ҳар улангандa токенни localStorage'дан қайта оламиз — логин/чиқишда автоматик янгиланади
export const socket = io(BASE_URL || undefined, {
  autoConnect: false,
  auth: (cb) => cb({ token: localStorage.getItem('token') || null }),
  extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
});
