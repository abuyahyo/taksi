// Skelet — юкланмоқда жойлар учун shimmer қаторлар
export default function Skelet({ qator = 3, balandlik = 18, gap = 12 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: qator }, (_, i) => (
        <div
          key={i}
          className="skelet"
          style={{
            height: balandlik,
            width: i === qator - 1 ? '60%' : '100%',
          }}
        />
      ))}
    </div>
  );
}

export function SkeletKarta() {
  return (
    <div style={{
      background: 'var(--oq)', padding: 16, borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-1)', display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <div className="skelet" style={{ width: 44, height: 44, borderRadius: '50%' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skelet" style={{ height: 14, width: '70%' }} />
        <div className="skelet" style={{ height: 12, width: '50%' }} />
      </div>
    </div>
  );
}
