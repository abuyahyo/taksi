// API ва Socket уланиш созламалари
import axios from 'axios';
import { io } from 'socket.io-client';

// Production build'да — same origin (BASE_URL бўш), backend frontend'ни ҳам беради.
// Dev режимида — localhost:5000 (Vite dev server бошқа портда).
const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:5000');

// Axios — HTTP сўровлар учун
export const api = axios.create({
  baseURL: BASE_URL ? `${BASE_URL}/api` : '/api',
});

// Ҳар сўровга токенни автоматик қўшиш
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Socket.io — реал вақт алоқаси учун (BASE_URL бўш бўлса — same origin)
export const socket = io(BASE_URL || undefined, { autoConnect: false });
