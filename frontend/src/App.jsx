// Асосий илова — роутер билан барча саҳифалар
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from './i18n';
import YangilanishBanner from './components/YangilanishBanner';

// Route-based code splitting — ҳар саҳифа алоҳида chunk
// Бош саҳифа Leaflet/Chat/Tolov ва бошқалар билан юкланмайди — тез очилади
const KirishSahifa     = lazy(() => import('./pages/KirishSahifa'));
const YolovchiSahifa   = lazy(() => import('./pages/YolovchiSahifa'));
const HaydovchiSahifa  = lazy(() => import('./pages/HaydovchiSahifa'));
const AdminSahifa      = lazy(() => import('./pages/AdminSahifa'));
const SafarTarixi      = lazy(() => import('./pages/SafarTarixi'));
const UlashilganSahifa = lazy(() => import('./pages/UlashilganSahifa'));

function Yuklanmoqda() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#9CA3AF', fontSize: 14 }}>
      ⏳
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Suspense fallback={<Yuklanmoqda />}>
          <Routes>
            <Route path="/" element={<KirishSahifa />} />
            <Route path="/yolovchi" element={<YolovchiSahifa />} />
            <Route path="/haydovchi" element={<HaydovchiSahifa />} />
            <Route path="/admin" element={<AdminSahifa />} />
            <Route path="/tarix" element={<SafarTarixi />} />
            <Route path="/k/:kalit" element={<UlashilganSahifa />} />
          </Routes>
        </Suspense>
        <YangilanishBanner />
      </BrowserRouter>
    </I18nProvider>
  );
}
