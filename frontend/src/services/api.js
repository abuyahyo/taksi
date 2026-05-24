// API ва Socket уланиш созламалари
import axios from 'axios';
import { io } from 'socket.io-client';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Axios — HTTP сўровлар учун
export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
});

// Ҳар сўровга токенни автоматик қўшиш
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Socket.io — реал вақт алоқаси учун
export const socket = io(BASE_URL, { autoConnect: false });
