// Кичик SVG иконкалар тўплами — асосий нав/амал тугмалари учун.
// currentColor ишлатади, шунинг учун тугма матн рангига (ва тунги режимга) мослашади.
export default function Ikonka({ nom, size = 20 }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  switch (nom) {
    case 'user':
      return <svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></svg>;
    case 'key':
      return <svg {...p}><circle cx="8" cy="15" r="4" /><path d="M11 12l8-8M16 4l3 3M14.5 5.5l2 2" /></svg>;
    case 'clock':
      return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'card':
      return <svg {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>;
    case 'flame':
      return <svg {...p}><path d="M12 2c2.5 4 6 5.5 6 10a6 6 0 0 1-12 0c0-2 1-3.2 2-4.2 0 2 1 3 2.2 3.2C10 9.5 11 5.5 12 2z" /></svg>;
    case 'car':
      return <svg {...p}><path d="M5 11l1.8-4.6A2 2 0 0 1 8.7 5h6.6a2 2 0 0 1 1.9 1.4L19 11" /><path d="M4 11h16a1 1 0 0 1 1 1v4H3v-4a1 1 0 0 1 1-1z" /><circle cx="7.5" cy="16.5" r="1.6" /><circle cx="16.5" cy="16.5" r="1.6" /></svg>;
    case 'taxi':
      return <svg {...p}><path d="M9 4h6l1 2H8l1-2z" /><path d="M5 11l1.6-3.4A2 2 0 0 1 8.4 6.4h7.2a2 2 0 0 1 1.8 1.2L19 11" /><path d="M4 11h16a1 1 0 0 1 1 1v4H3v-4a1 1 0 0 1 1-1z" /><circle cx="7.5" cy="16.5" r="1.5" /><circle cx="16.5" cy="16.5" r="1.5" /></svg>;
    case 'passenger':
      return <svg {...p}><circle cx="12" cy="5" r="2.5" /><path d="M12 8v6M12 14l-3 6M12 14l3 6M8 10h8" /></svg>;
    case 'money':
      return <svg {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M5 9.5v5M19 9.5v5" /></svg>;
    case 'shield':
      return <svg {...p}><path d="M12 3l7 3v5c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>;
    case 'receipt':
      return <svg {...p}><path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V3z" /><path d="M8.5 8h7M8.5 12h7" /></svg>;
    case 'pin':
      return <svg {...p}><path d="M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case 'arrow-right':
      return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case 'arrow-left':
      return <svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
    case 'star':
      return <svg {...p} fill="currentColor" stroke="none"><path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.77l-5.2 2.74.99-5.79-4.21-4.1 5.82-.85L12 3.5z" /></svg>;
    case 'lock':
      return <svg {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
    case 'chat':
      return <svg {...p}><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l.9-4.4A8 8 0 1 1 21 12z" /><path d="M8.5 11h7M8.5 14h4" /></svg>;
    case 'search':
      return <svg {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>;
    case 'road':
      return <svg {...p}><path d="M7 21L9 3M17 21l-2-18M12 6v2M12 12v2M12 18v1" /></svg>;
    case 'moon':
      return <svg {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>;
    case 'alert':
      return <svg {...p}><path d="M10.3 3.9l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>;
    default:
      return null;
  }
}
