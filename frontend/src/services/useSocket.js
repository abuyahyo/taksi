// Socket уланишини осонлаштирувчи hook
import { useEffect, useRef } from 'react';
import { socket } from '../services/api';

// Socket'ни улаш ва ҳодисаларга обуна бўлиш.
// Handlers ref орқали ишлайди — компонент re-render бўлганда янги closure ишлатилади.
// (Бу муҳим: бошида null бўлган state'лар кейин ўзгаргач, eski closure уларни кўрмасди.)
export function useSocket(hodisalar = {}) {
  const ref = useRef(hodisalar);
  ref.current = hodisalar;

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const wrappers = {};
    Object.keys(hodisalar).forEach((nom) => {
      wrappers[nom] = (...args) => ref.current[nom]?.(...args);
      socket.on(nom, wrappers[nom]);
    });

    return () => {
      Object.entries(wrappers).forEach(([nom, fn]) => socket.off(nom, fn));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const yubor = (nom, data) => socket.emit(nom, data);
  return { yubor };
}
