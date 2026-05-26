// Google Sign-In (GIS) ёрдамчилари.
// ЭСЛАТМА: Telegram'нинг ич-браузерида Google OAuth блокланиши мумкин —
// шунинг учун Google тугмасини Telegram'дан ТАШҚАРИДА кўрсатамиз.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const googleYoqilgan = () => !!CLIENT_ID;

// GIS скрипти юкланишини кутамиз (defer билан кеч юкланиши мумкин).
export async function googleTayyor() {
  if (!CLIENT_ID) return false;
  for (let i = 0; i < 30; i++) {
    if (window.google?.accounts?.id) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

// Тугмани render қилади; кириш бўлганда onToken(idToken) чақирилади.
export function googleRender(el, onToken) {
  if (!el || !window.google?.accounts?.id) return;
  window.google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: (resp) => { if (resp?.credential) onToken(resp.credential); },
  });
  window.google.accounts.id.renderButton(el, {
    theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 300,
  });
}
