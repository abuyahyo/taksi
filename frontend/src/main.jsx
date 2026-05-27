import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { yangilanishKuzat } from './services/yangilanish';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Янги версия деплой бўлса — иловани автомат қайта юклаш (Telegram'да ҳам)
yangilanishKuzat();
