// Сафар экрани — ҳолат босқичлари ва баҳолаш (йўловчи учун)
import { useState } from 'react';

const HOLATLAR = {
  kelmoqda: { matn: 'Ҳайдовчи йўлда', ikon: '🚗', izoh: 'Ҳайдовчи сиз томон келмоқда' },
  yetib_keldi: { matn: 'Ҳайдовчи етиб келди', ikon: '📍', izoh: 'Ҳайдовчи белгиланган жойда' },
  yolda: { matn: 'Сафар давом этмоқда', ikon: '🛣️', izoh: 'Манзилга йўл олдингиз' },
  yakunlandi: { matn: 'Сафар тугади', ikon: '✅', izoh: 'Етиб келдингиз' },
};

export default function SafarEkrani({ safar, onBaho, onYopish }) {
  const [ball, setBall] = useState(0);
  const [izoh, setIzoh] = useState('');

  const holat = HOLATLAR[safar.holat] || HOLATLAR.kelmoqda;

  // Сафар тугаганда — баҳолаш экрани
  if (safar.holat === 'yakunlandi') {
    return (
      <div style={st.panel}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={st.bigIkon}>✅</div>
          <h2 style={st.sarlavha}>Сафар тугади!</h2>
          <p style={st.izoh}>{safar.narx.toLocaleString()} сўм</p>
        </div>

        <p style={st.bahoMatn}>Ҳайдовчини баҳоланг:</p>
        <div style={st.yulduzlar}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} style={st.yulduz} onClick={() => setBall(n)}>
              {n <= ball ? '⭐' : '☆'}
            </button>
          ))}
        </div>

        <input
          style={st.input}
          placeholder="Изоҳ (ихтиёрий)"
          value={izoh}
          onChange={(e) => setIzoh(e.target.value)}
        />

        <button
          style={{ ...st.tugma, opacity: ball ? 1 : 0.5 }}
          disabled={!ball}
          onClick={() => { onBaho({ ball, izoh }); onYopish(); }}
        >
          Баҳони юбориш
        </button>
        <button style={st.orqaga} onClick={onYopish}>Ўтказиб юбориш</button>
      </div>
    );
  }

  // Сафар давомида — ҳолат кўрсатиш
  return (
    <div style={st.panel}>
      <div style={st.holatBox}>
        <div style={st.bigIkon}>{holat.ikon}</div>
        <div>
          <h2 style={st.sarlavha}>{holat.matn}</h2>
          <p style={st.izoh}>{holat.izoh}</p>
        </div>
      </div>

      {/* Ҳайдовчи маълумоти */}
      <div style={st.haydovchiBox}>
        <div style={st.avatar}>{safar.haydovchi_ism?.[0] || 'H'}</div>
        <div style={{ flex: 1 }}>
          <div style={st.hIsm}>{safar.haydovchi_ism} ⭐ {safar.reyting || '5.0'}</div>
          <div style={st.hMashina}>{safar.mashina}</div>
        </div>
        {safar.haydovchi_telefon && (
          <a href={`tel:${safar.haydovchi_telefon}`} style={st.qongiroq}>📞</a>
        )}
      </div>

      {/* Босқич индикатори */}
      <div style={st.bosqichlar}>
        {['kelmoqda', 'yetib_keldi', 'yolda', 'yakunlandi'].map((h, i) => {
          const tartib = ['kelmoqda', 'yetib_keldi', 'yolda', 'yakunlandi'].indexOf(safar.holat);
          const faol = i <= tartib;
          return <div key={h} style={{ ...st.bosqich, background: faol ? 'var(--sariq)' : 'var(--och-kulrang)' }} />;
        })}
      </div>

      <div style={st.narxKor}>{safar.narx.toLocaleString()} сўм</div>
    </div>
  );
}

const st = {
  panel: { background: 'var(--oq)', borderRadius: '24px 24px 0 0', padding: 24 },
  holatBox: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 },
  bigIkon: { fontSize: 44 },
  sarlavha: { fontSize: 22, fontWeight: 800 },
  izoh: { color: 'var(--kulrang)', fontSize: 14, marginTop: 2 },
  haydovchiBox: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--och-kulrang)', padding: 14, borderRadius: 14, marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: '50%', background: 'var(--sariq)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20 },
  hIsm: { fontWeight: 700, fontSize: 16 },
  hMashina: { fontSize: 13, color: 'var(--kulrang)' },
  qongiroq: { width: 48, height: 48, borderRadius: '50%', background: 'var(--yashil)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, textDecoration: 'none' },
  bosqichlar: { display: 'flex', gap: 6, marginBottom: 16 },
  bosqich: { flex: 1, height: 6, borderRadius: 3 },
  narxKor: { textAlign: 'center', fontSize: 24, fontWeight: 800 },
  bahoMatn: { textAlign: 'center', fontSize: 15, fontWeight: 600, marginBottom: 12 },
  yulduzlar: { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 },
  yulduz: { background: 'transparent', fontSize: 36 },
  input: { width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--neutral-200)', fontSize: 15, marginBottom: 16 },
  tugma: { width: '100%', background: 'var(--sariq)', padding: 16, borderRadius: 14, fontSize: 16, fontWeight: 700 },
  orqaga: { width: '100%', background: 'transparent', padding: 12, color: 'var(--kulrang)', fontSize: 14, marginTop: 4 },
};
