// Google Sign-In — ID token'ни текшириш (зависимостьсиз, tokeninfo endpoint орқали).
// Frontend GIS'дан келган ID token'ни Google'нинг ўзи текширади, биз claim'ларни
// тасдиқлаймиз (aud = бизнинг client_id — акс ҳолда ҳар қандай Google токени ўтиб кетарди).

// Claim'лар яроқлими — текширади ва сабаб қайтаради ({ok, sabab}).
// sabab диагностика учун (logga, фронтендга), фойдаланувчи учун эмас.
function googleClaimlarYaroqli(claims, clientId) {
  if (!claims) return { ok: false, sabab: 'claims_yoq' };
  if (!clientId) return { ok: false, sabab: 'client_id_yoq' };
  const issOk = claims.iss === 'accounts.google.com' || claims.iss === 'https://accounts.google.com';
  if (!issOk) return { ok: false, sabab: 'iss_notugri' };
  const audOk = claims.aud === clientId;
  if (!audOk) return { ok: false, sabab: 'aud_mos_emas' };
  const emailOk = claims.email_verified === true || claims.email_verified === 'true';
  if (!emailOk) return { ok: false, sabab: 'email_tasdiqlanmagan' };
  const expOk = claims.exp ? Number(claims.exp) * 1000 > Date.now() : true;
  if (!expOk) return { ok: false, sabab: 'token_muddati_tugagan' };
  return { ok: true };
}

// ID token'ни текшириб, фойдаланувчи маълумотини қайтаради.
async function googleTokenTekshir(idToken, clientId) {
  if (!idToken || !clientId) return { ok: false, sabab: 'kirish_malumoti_yoq' };
  try {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!r.ok) return { ok: false, sabab: 'google_tokeninfo_xato' };
    const c = await r.json();
    const tekshir = googleClaimlarYaroqli(c, clientId);
    if (!tekshir.ok) return { ok: false, sabab: tekshir.sabab };
    return { ok: true, sub: c.sub, email: c.email, name: c.name };
  } catch (err) {
    console.error('google token tekshir xato:', err.message);
    return { ok: false, sabab: 'exception' };
  }
}

module.exports = { googleClaimlarYaroqli, googleTokenTekshir };
