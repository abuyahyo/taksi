// Асосий илова — роутер билан барча саҳифалар
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from './i18n';
import KirishSahifa from './pages/KirishSahifa';
import YolovchiSahifa from './pages/YolovchiSahifa';
import HaydovchiSahifa from './pages/HaydovchiSahifa';
import AdminSahifa from './pages/AdminSahifa';
import SafarTarixi from './pages/SafarTarixi';

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<KirishSahifa />} />
          <Route path="/yolovchi" element={<YolovchiSahifa />} />
          <Route path="/haydovchi" element={<HaydovchiSahifa />} />
          <Route path="/admin" element={<AdminSahifa />} />
          <Route path="/tarix" element={<SafarTarixi />} />
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  );
}
