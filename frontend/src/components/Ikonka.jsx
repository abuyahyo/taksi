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
    default:
      return null;
  }
}
