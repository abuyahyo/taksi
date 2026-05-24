// Асосий илова — роутер билан барча саҳифалар
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import KirishSahifa from './pages/KirishSahifa';
import YolovchiSahifa from './pages/YolovchiSahifa';
import HaydovchiSahifa from './pages/HaydovchiSahifa';
import AdminSahifa from './pages/AdminSahifa';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<KirishSahifa />} />
        <Route path="/yolovchi" element={<YolovchiSahifa />} />
        <Route path="/haydovchi" element={<HaydovchiSahifa />} />
        <Route path="/admin" element={<AdminSahifa />} />
      </Routes>
    </BrowserRouter>
  );
}
