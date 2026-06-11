// Манзил қидируви — Nominatim орқали топилган манзилларни кўрсатади
import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';
import Ikonka from './Ikonka';

export default function ManzilQidirish({ onTanlandi, placeholder, rejimMatn }) {
  const { t, til } = useT();
  const [matn, setMatn] = useState('');
  const [natijalar, setNatijalar] = useState([]);
  const [ochiq, setOchiq] = useState(false);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const refWrap = useRef(null);

  // Debounce — фойдаланувчи ёзишни тугатса 250мс кейин қидириш
  // (қисқа матнда тозалаш ҳам таймер ичида — effect танасида setState йўқ)
  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = matn.trim();
      if (q.length < 2) { setNatijalar([]); return; }
      setYuklanmoqda(true);
      try {
        const { data } = await api.get(`/geocode?q=${encodeURIComponent(q)}&til=${til}`);
        setNatijalar(data);
        setOchiq(true);
      } catch {/* тинч ўтиш */}
      setYuklanmoqda(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [matn, til]);

  // Ташқи босилганда dropdown'ни ёпиш
  useEffect(() => {
    const tinglovchi = (e) => {
      if (refWrap.current && !refWrap.current.contains(e.target)) setOchiq(false);
    };
    document.addEventListener('mousedown', tinglovchi);
    return () => document.removeEventListener('mousedown', tinglovchi);
  }, []);

  const tanla = (n) => {
    onTanlandi([n.lat, n.lng], n.manzil);
    setMatn('');
    setNatijalar([]);
    setOchiq(false);
  };

  const qisqaManzil = (s) => {
    if (!s) return '';
    const qismlar = s.split(',').map((x) => x.trim());
    if (qismlar.length <= 2) return s;
    // Биринчи 2 ва охирги 1 қисмни қолдирамиз
    return [qismlar[0], qismlar[1], qismlar[qismlar.length - 1]].join(', ');
  };

  return (
    <div ref={refWrap} style={st.wrap}>
      <div style={st.qator}>
        <span style={st.ikon}><Ikonka nom="search" size={17} /></span>
        <input
          style={st.input}
          value={matn}
          onChange={(e) => setMatn(e.target.value)}
          onFocus={() => setOchiq(natijalar.length > 0)}
          placeholder={placeholder || t('geo.searchPlaceholder')}
        />
        {yuklanmoqda && <span className="spinner" style={st.spin} />}
      </div>

      {rejimMatn && <div style={st.rejim}>{rejimMatn}</div>}

      {ochiq && natijalar.length > 0 && (
        <div style={st.dropdown}>
          {natijalar.map((n, i) => (
            <button key={i} style={st.kandidat} className="bosiladi" onClick={() => tanla(n)}>
              <span style={st.kIkon}><Ikonka nom="pin" size={16} /></span>
              <span style={st.kMatn}>{qisqaManzil(n.manzil)}</span>
            </button>
          ))}
        </div>
      )}

      {ochiq && !yuklanmoqda && matn.trim().length >= 2 && natijalar.length === 0 && (
        <div style={st.dropdown}>
          <div style={st.bosh}>{t('geo.noResults')}</div>
        </div>
      )}
    </div>
  );
}

const st = {
  wrap: { position: 'relative', marginBottom: 10 },
  qator: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--fill)', padding: '9px 12px', borderRadius: 'var(--r-md)', color: 'var(--secondary-label)' },
  ikon: { display: 'inline-flex', color: 'var(--secondary-label)' },
  input: { flex: 1, background: 'transparent', border: 'none', fontSize: 17, outline: 'none', color: 'var(--label)' },
  spin: { width: 18, height: 18, borderWidth: 2 },
  rejim: { fontSize: 12, color: 'var(--secondary-label)', marginTop: 5, paddingLeft: 4 },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, background: 'var(--surface-elevated)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-3)', border: '0.5px solid var(--separator)', zIndex: 1500, maxHeight: 260, overflowY: 'auto', overflow: 'hidden' },
  kandidat: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'transparent', border: 'none', borderBottom: '0.5px solid var(--separator)', textAlign: 'left', cursor: 'pointer', fontSize: 15, color: 'var(--tint)' },
  kIkon: { display: 'inline-flex', color: 'var(--tint)', flexShrink: 0 },
  kMatn: { color: 'var(--label)', lineHeight: 1.3 },
  bosh: { padding: 16, textAlign: 'center', color: 'var(--secondary-label)', fontSize: 15 },
};
