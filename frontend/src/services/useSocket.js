// Socket уланишини осонлаштирувчи hook
import { useEffect } from 'react';
import { socket } from '../services/api';

// Socket'ни улаш ва ҳодисаларга обуна бўлиш
export function useSocket(hodisalar = {}) {
  useEffect(() => {
    if (!socket.connected) socket.connect();

    // Ҳар бир ҳодисага обуна бўламиз
    Object.entries(hodisalar).forEach(([nom, callback]) => {
      socket.on(nom, callback);
    });

    // Тозалаш — обунани бекор қиламиз
    return () => {
      Object.keys(hodisalar).forEach((nom) => {
        socket.off(nom);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ҳодиса юбориш функцияси
  const yubor = (nom, data) => socket.emit(nom, data);
  return { yubor };
}
