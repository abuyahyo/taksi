// Google Sign-In — ID token'ни текшириш (зависимостьсиз, tokeninfo endpoint орқали).
// Frontend GIS'дан келган ID token'ни Google'нинг ўзи текширади, биз claim'ларни
// тасдиқлаймиз (aud = бизнинг client_id — акс ҳолда ҳар қандай Google токени ўтиб кетарди).

// Claim'лар яроқлими — соф функция (тест учун).
function googleClaimlarYaroqli(claims, clientId) {
  if (!claims || !clientId) return false;
  const issOk = claims.iss === 'accounts.google.com' || claims.iss === 'https://accounts.google.com';
  const audOk = claims.aud === clientId;
  const emailOk = claims.email_verified === true || claims.email_verified === 'true';
  const expOk = claims.exp ? Number(claims.exp) * 1000 > Date.now() : true;
  return issOk && audOk && emailOk && expOk;
}

// ID token'ни текшириб, фойдаланувчи маълумотини қайтаради.
async function googleTokenTekshir(idToken, clientId) {
  if (!idToken || !clientId) return { ok: false };
  try {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!r.ok) return { ok: false };
    const c = await r.json();
    if (!googleClaimlarYaroqli(c, clientId)) return { ok: false };
    return { ok: true, sub: c.sub, email: c.email, name: c.name };
  } catch (err) {
    console.error('google token tekshir xato:', err.message);
    return { ok: false };
  }
}

module.exports = { googleClaimlarYaroqli, googleTokenTekshir };
