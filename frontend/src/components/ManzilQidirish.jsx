// Манзил қидируви — Nominatim орқали топилган манзилларни кўрсатади
import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';

export default function ManzilQidirish({ onTanlandi, placeholder, rejimMatn }) {
  const { t, til } = useT();
  const [matn, setMatn] = useState('');
  const [natijalar, setNatijalar] = useState([]);
  const [ochiq, setOchiq] = useState(false);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const refWrap = useRef(null);

  // Debounce — фойдаланувчи ёзишни тугатса 350мс кейин қидириш
  useEffect(() => {
    if (matn.trim().length < 2) { setNatijalar([]); return; }
    const timer = setTimeout(async () => {
      setYuklanmoqda(true);
      try {
        const { data } = await api.get(`/geocode?q=${encodeURIComponent(matn.trim())}&til=${til}`);
        setNatijalar(data);
        setOchiq(true);
      } catch {/* тинч ўтиш */}
      setYuklanmoqda(false);
    }, 350);
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
        <span style={st.ikon}>🔍</span>
        <input
          style={st.input}
          value={matn}
          onChange={(e) => setMatn(e.target.value)}
          onFocus={() => setOchiq(natijalar.length > 0)}
          placeholder={placeholder || t('geo.searchPlaceholder')}
        />
        {yuklanmoqda && <span style={st.spin}>⏳</span>}
      </div>

      {rejimMatn && <div style={st.rejim}>{rejimMatn}</div>}

      {ochiq && natijalar.length > 0 && (
        <div style={st.dropdown}>
          {natijalar.map((n, i) => (
            <button key={i} style={st.kandidat} onClick={() => tanla(n)}>
              <span style={st.kIkon}>📍</span>
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
  qator: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--och-kulrang)', padding: '10px 12px', borderRadius: 12 },
  ikon: { fontSize: 16, opacity: 0.6 },
  input: { flex: 1, background: 'transparent', border: 'none', fontSize: 14, outline: 'none', padding: 4 },
  spin: { fontSize: 14 },
  rejim: { fontSize: 11, color: 'var(--kulrang)', marginTop: 4, paddingLeft: 4 },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--oq)', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,.15)', zIndex: 1500, maxHeight: 260, overflowY: 'auto' },
  kandidat: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--neutral-200)', textAlign: 'left', cursor: 'pointer', fontSize: 13 },
  kIkon: { fontSize: 14, flexShrink: 0 },
  kMatn: { color: 'var(--qora)', lineHeight: 1.3 },
  bosh: { padding: 14, textAlign: 'center', color: 'var(--kulrang)', fontSize: 13 },
};
