// Админ панели — статистика, фойдаланувчилар, буюртмалар, блоклаш
import { useEffect, useState } from 'react';
import { api, socket } from '../services/api';
import Kirish from '../components/Kirish';
import { KycRasm } from '../components/KycHujjatlar';
import { SkeletKarta } from '../components/Skelet';
import { useT } from '../i18n';
import { useToast } from '../components/Toast';
import Ikonka from '../components/Ikonka';

export default function AdminSahifa() {
  const [user, setUser] = useState(() => {
    const saqlangan = localStorage.getItem('user');
    if (!saqlangan) return null;
    try {
      const u = JSON.parse(saqlangan);
      return u.rol === 'admin' ? u : null;
    } catch {
      return null;
    }
  });

  if (!user) return <Kirish kerakliRol="admin" sarlavhaKey="admin.titleLogin" onKirildi={setUser} />;

  return <AdminIchki onChiqish={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); }} />;
}

function AdminIchki({ onChiqish }) {
  const { t } = useT();
  const toast = useToast();
  const [tab, setTab] = useState('statistika');
  const [sosOyna, setSosOyna] = useState([]); // фаол SOS сигналлар
  const [stat, setStat] = useState(null);
  const [users, setUsers] = useState(null);
  const [rides, setRides] = useState(null);
  const [kycQueue, setKycQueue] = useState(null);
  const [xato, setXato] = useState('');
  const [blokModal, setBlokModal] = useState(null);
  const [sabab, setSabab] = useState('');
  const [hujjatModal, setHujjatModal] = useState(null); // { user, data }
  const [radFor, setRadFor] = useState(null); // рад этилаётган ҳужжат id
  const [radSabab, setRadSabab] = useState('');

  const yukla = async () => {
    try {
      setXato('');
      const [s, u, r, k] = await Promise.all([
        api.get('/admin/statistika'),
        api.get('/admin/foydalanuvchilar'),
        api.get('/admin/buyurtmalar'),
        api.get('/admin/kyc-queue'),
      ]);
      setStat(s.data);
      setUsers(u.data);
      setRides(r.data);
      setKycQueue(k.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        onChiqish();
      } else {
        setXato(err.response?.data?.xato || t('common.error'));
      }
    }
  };

  useEffect(() => { yukla(); }, []);

  // SOS — жонли қабул қилиш
  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit('admin_qoshil');
    // Олдинги тугатилмаган SOS'ларни оламиз
    api.get('/admin/sos').then(({ data }) => {
      setSosOyna(data.filter((s) => !s.qabul_qilindi));
    }).catch(() => {});
    const tinglovchi = (sig) => {
      setSosOyna((eski) => [sig, ...eski]);
      toast.error(`🆘 SOS! ${sig.yuboruvchi_ism || sig.rol} — сафар #${sig.rideId || '?'}`, { muddat: 10000 });
      // Браузер уведомление ҳам — таб ёпиқ бўлса
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try { new Notification('🆘 SOS', { body: `${sig.yuboruvchi_ism} (${sig.rol})`, tag: 'sos-' + sig.id }); } catch {}
      }
    };
    socket.on('sos_keldi', tinglovchi);
    return () => socket.off('sos_keldi', tinglovchi);
  }, []);

  const sosQabul = async (id) => {
    try {
      await api.post(`/admin/sos/${id}/qabul`);
      setSosOyna((eski) => eski.filter((s) => s.id !== id));
      toast.success(t('sos.acknowledged'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const bloklash = async () => {
    try {
      await api.post(`/admin/bloklash/${blokModal.id}`, { sabab });
      toast.success(`${blokModal.ism} ${t('admin.blockSuccess')}`);
      setBlokModal(null);
      setSabab('');
      yukla();
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
  };

  const blokniYechish = async (id) => {
    try {
      await api.post(`/admin/blok-yechish/${id}`);
      toast.success(t('admin.unblockSuccess'));
      yukla();
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
  };

  const tasdiqla = async (id) => {
    try {
      await api.post(`/admin/tasdiqlash/${id}`);
      toast.success(t('admin.verified'));
      yukla();
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
  };

  const tasdiqBekor = async (id) => {
    try {
      await api.post(`/admin/tasdiq-bekor/${id}`);
      yukla();
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
  };

  const hujjatlarOch = async (u) => {
    try {
      const { data } = await api.get(`/admin/hujjatlar/${u.id}`);
      setHujjatModal({ user: u, data });
      setRadFor(null);
      setRadSabab('');
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
  };

  const hujjatRad = async (hujjatId) => {
    try {
      await api.post(`/admin/hujjat/${hujjatId}/rad`, { sabab: radSabab });
      setRadFor(null);
      setRadSabab('');
      if (hujjatModal) await hujjatlarOch(hujjatModal.user);
      yukla();
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
  };

  const hujjatTasdiqla = async (id) => {
    await tasdiqla(id);
    setHujjatModal(null);
  };

  return (
    <div style={st.sahifa}>
      <div style={st.header}>
        <div style={st.logo}>{t('admin.title')}</div>
        <button style={st.chiqish} onClick={onChiqish}>{t('common.exit')}</button>
      </div>

      {/* SOS аларм banner — фаол сигналлар бўлса */}
      {sosOyna.length > 0 && (
        <div style={st.sosBanner}>
          <div style={st.sosBoshi}><Ikonka nom="sos" size={16} /> {t('sos.activeAlerts', { n: sosOyna.length })}</div>
          {sosOyna.map((s) => (
            <div key={s.id} style={st.sosKarta}>
              <div style={{ flex: 1 }}>
                <div style={st.sosIsm}>{s.yuboruvchi_ism || s.rol} {s.yuboruvchi_telefon ? `· ${s.yuboruvchi_telefon}` : ''}</div>
                <div style={st.sosMeta}>
                  {t('chat.ride')} #{s.ride_id || '—'} · {s.rol}
                  {s.lat && ` · ${Number(s.lat).toFixed(4)}, ${Number(s.lng).toFixed(4)}`}
                </div>
              </div>
              <button style={st.sosQabulTugma} onClick={() => sosQabul(s.id)}>
                {t('sos.acknowledge')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={st.tablar}>
        <div className="ios-segmented">
          {[
            ['statistika', t('admin.tab.stats')],
            ['users',      t('admin.tab.users')],
            ['kyc',        t('admin.tab.kyc') + (Array.isArray(kycQueue) && kycQueue.filter((q) => q.tasdiq_holati === 'kutilmoqda').length ? ` (${kycQueue.filter((q) => q.tasdiq_holati === 'kutilmoqda').length})` : '')],
            ['rides',      t('admin.tab.rides')],
          ].map(([k, n]) => (
            <button key={k} className="ios-seg" data-on={tab === k} onClick={() => setTab(k)}>{n}</button>
          ))}
        </div>
      </div>

      <div style={st.kontent}>
        {xato && <div style={st.xato}>{xato}</div>}

        {tab === 'statistika' && (
          stat == null ? <Yuklanmoqda /> : (
            <div style={st.statGrid}>
              <Stat raqam={stat.jami_foydalanuvchi.toLocaleString()} matn={t('admin.users')} nom="user" rang="var(--kok)" />
              <Stat raqam={stat.jami_haydovchi.toLocaleString()} matn={t('admin.drivers')} nom="car" rang="var(--tint)" />
              <Stat raqam={stat.jami_safar.toLocaleString()} matn={t('admin.totalRides')} nom="receipt" rang="var(--amber)" />
              <Stat raqam={stat.yakunlangan_safar.toLocaleString()} matn={t('admin.completed')} nom="check" rang="var(--yashil)" />
              <Stat raqam={stat.jami_daromad >= 1_000_000 ? `${(stat.jami_daromad / 1_000_000).toFixed(1)}M` : stat.jami_daromad.toLocaleString()} matn={t('admin.income')} nom="money" rang="var(--tint)" keng />
            </div>
          )
        )}

        {tab === 'users' && (
          users == null ? <Yuklanmoqda /> : users.length === 0 ? <Bosh matn={t('admin.noUsers')} /> : (
            <div style={st.royxat} className="royxat-anim">
              {users.map((u) => (
                <div key={u.id} style={st.userKarta}>
                  <div style={st.avatar}>{u.ism[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={st.userIsm}>
                      {u.ism}
                      {u.rol === 'haydovchi' && u.tasdiqlangan && (
                        <span style={st.tasdiqMeta} title={t('verify.badge')}>{t('admin.verified')}</span>
                      )}
                    </div>
                    <div style={st.userMeta}>
                      {u.telefon} · {u.rol === 'haydovchi' ? t('admin.roleDriver') : u.rol === 'admin' ? t('admin.roleAdmin') : t('admin.roleClient')} · <Ikonka nom="star" size={11} /> {u.reyting}
                    </div>
                    {u.bloklangan && <div style={st.blokBelgi}>{t('admin.blocked', { sabab: u.blok_sababi })}</div>}
                  </div>
                  <div style={st.tugmalarUstun}>
                    {u.rol === 'haydovchi' && (
                      <button style={st.hujjatTugma} onClick={() => hujjatlarOch(u)}>
                        {t('admin.docs')}{Number(u.hujjat_soni) > 0 ? ` (${u.hujjat_soni})` : ''}
                        {u.tasdiq_holati === 'kutilmoqda' && !u.tasdiqlangan && <span style={st.kutilmoqdaNuqta} />}
                      </button>
                    )}
                    {u.rol === 'haydovchi' && (u.tasdiqlangan ? (
                      <button style={st.tasdiqYechTugma} onClick={() => tasdiqBekor(u.id)}>{t('admin.unverify')}</button>
                    ) : (
                      <button style={st.tasdiqlaTugma} onClick={() => tasdiqla(u.id)}>{t('admin.verify')}</button>
                    ))}
                    {u.rol !== 'admin' && (u.bloklangan ? (
                      <button style={st.yechishTugma} onClick={() => blokniYechish(u.id)}>{t('admin.unblock')}</button>
                    ) : (
                      <button style={st.blokTugma} onClick={() => setBlokModal(u)}>{t('admin.block')}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'kyc' && (
          kycQueue == null ? <Yuklanmoqda /> : kycQueue.length === 0 ? <Bosh matn={t('admin.kycEmpty')} /> : (
            <div style={st.royxat} className="royxat-anim">
              {kycQueue.map((q) => (
                <div key={q.id} style={st.kycKarta}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={st.avatar}>{q.ism?.[0] || '?'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={st.userIsm}>{q.ism}</div>
                      <div style={st.userMeta}>{q.telefon}</div>
                    </div>
                    <span style={{ ...st.kycHolat, ...holatRang(q.tasdiq_holati === 'rad' ? 'rad' : 'kutilmoqda') }}>
                      {t(`kyc.st.${q.tasdiq_holati}`)}
                    </span>
                  </div>

                  <div style={st.kycMeta}>
                    {q.mashina_modeli && <span>{q.mashina_modeli} {q.mashina_raqami || ''}</span>}
                    {q.mashina_yili && <span>· {q.mashina_yili}</span>}
                    {q.gpro_raqami && <span>· {t('admin.licenseShort')} {q.gpro_raqami}</span>}
                  </div>

                  <div style={st.kycTagBar}>
                    <span style={st.kycTag}>{t('admin.docsCount', { soni: q.hujjat_soni })}</span>
                    <button style={st.hujjatTugma} onClick={() => hujjatlarOch(q)}>{t('admin.docs')}</button>
                    <button style={st.tasdiqlaTugma} onClick={() => tasdiqla(q.id)}>{t('admin.verify')}</button>
                  </div>

                  {q.rad_sababi && (
                    <div style={st.kycRadSabab}><Ikonka nom="alert" size={12} /> {q.rad_sababi}</div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'rides' && (
          rides == null ? <Yuklanmoqda /> : rides.length === 0 ? <Bosh matn={t('admin.noRides')} /> : (
            <div style={st.royxat} className="royxat-anim">
              {rides.map((r) => (
                <div key={r.id} style={st.rideKarta}>
                  <div style={st.rideYuqori}>
                    <span style={st.rideId}>#{r.id}</span>
                    <span style={{ ...st.holatBelgi, ...(r.holat === 'yakunlandi' ? st.holatYashil : st.holatSariq) }}>
                      {t(`hist.status.${r.holat}`) !== `hist.status.${r.holat}` ? t(`hist.status.${r.holat}`) : r.holat}
                    </span>
                  </div>
                  <div style={st.rideYol}>{r.boshlanish_manzil} → {r.tugash_manzil}</div>
                  <div style={st.rideMeta}>
                    {r.mijoz_ism || '—'} → {r.haydovchi_ism || '—'} · {r.kelishilgan_narx ? `${Number(r.kelishilgan_narx).toLocaleString()}` : '—'}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {blokModal && (
        <div style={st.modalFon} onClick={() => setBlokModal(null)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={st.modalSarlavha}>{t('admin.blockTitle', { ism: blokModal.ism })}</h3>
            <p style={st.modalShaffoflik}>{t('admin.blockHint')}</p>
            <input style={st.input} placeholder={t('admin.blockReason')} value={sabab} onChange={(e) => setSabab(e.target.value)} />
            <button style={{ ...st.tasdiqTugma, opacity: sabab ? 1 : 0.5 }} disabled={!sabab} onClick={bloklash}>
              {t('admin.blockConfirm')}
            </button>
            <button style={st.bekorTugma} onClick={() => setBlokModal(null)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {hujjatModal && (
        <div style={st.modalFon} onClick={() => setHujjatModal(null)}>
          <div style={{ ...st.modal, maxHeight: '88dvh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={st.modalSarlavha}>{t('admin.docsTitle')}</h3>
            <p style={st.modalIzoh}>{hujjatModal.user.ism}</p>

            {/* Ҳайдовчи маълумоти — ҳужжатни рақамга солиштириб тасдиқлаш учун */}
            {hujjatModal.data.profil && (
              <div style={st.profilBlok}>
                <div style={st.profilSarlavha}>{t('admin.driverDetails')}</div>
                <div style={st.profilGrid}>
                  {hujjatModal.data.profil.tugilgan_sana && (
                    <div style={st.profilQator}><span style={st.profilLabel}>{t('admin.dobShort')}</span><span style={st.profilQiymat}>{String(hujjatModal.data.profil.tugilgan_sana).slice(0, 10)}</span></div>
                  )}
                  {hujjatModal.data.profil.gpro_raqami && (
                    <div style={st.profilQator}><span style={st.profilLabel}>{t('admin.licenseShort')}</span><span style={st.profilQiymat}>{hujjatModal.data.profil.gpro_raqami}</span></div>
                  )}
                  {hujjatModal.data.profil.gpro_amal_qiladi && (
                    <div style={st.profilQator}><span style={st.profilLabel}>{t('car.licenseExp')}</span><span style={st.profilQiymat}>{String(hujjatModal.data.profil.gpro_amal_qiladi).slice(0, 10)}</span></div>
                  )}
                  {hujjatModal.data.profil.mashina_modeli && (
                    <div style={st.profilQator}><span style={st.profilLabel}>{t('car.model')}</span><span style={st.profilQiymat}>{hujjatModal.data.profil.mashina_modeli} {hujjatModal.data.profil.mashina_rangi || ''}</span></div>
                  )}
                  {hujjatModal.data.profil.mashina_raqami && (
                    <div style={st.profilQator}><span style={st.profilLabel}>{t('car.plate')}</span><span style={st.profilQiymat}>{hujjatModal.data.profil.mashina_raqami}</span></div>
                  )}
                  {hujjatModal.data.profil.mashina_yili && (
                    <div style={st.profilQator}><span style={st.profilLabel}>{t('admin.carYearShort')}</span><span style={st.profilQiymat}>{hujjatModal.data.profil.mashina_yili}</span></div>
                  )}
                </div>
              </div>
            )}

            {hujjatModal.data.hujjatlar.length === 0 ? (
              <Bosh matn={t('admin.noDocs')} />
            ) : (
              hujjatModal.data.hujjatlar.map((h) => (
                <div key={h.id} style={st.hujjatKarta}>
                  <KycRasm hujjatId={h.id} style={st.hujjatRasm} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={st.hujjatTur}>{t(`kyc.${h.turi}`)}</div>
                    <div style={{ ...st.hujjatHolat, ...holatRang(h.holat) }}>{t(`kyc.st.${h.holat}`)}</div>
                    {radFor === h.id ? (
                      <div style={{ marginTop: 8 }}>
                        <input style={st.radInput} placeholder={t('admin.rejectReason')} value={radSabab} onChange={(e) => setRadSabab(e.target.value)} autoFocus />
                        <button style={{ ...st.radConfirm, opacity: radSabab.trim() ? 1 : 0.5 }} disabled={!radSabab.trim()} onClick={() => hujjatRad(h.id)}>{t('admin.rejectConfirm')}</button>
                      </div>
                    ) : (
                      <button style={st.radTugma} onClick={() => { setRadFor(h.id); setRadSabab(''); }}>{t('admin.reject')}</button>
                    )}
                  </div>
                </div>
              ))
            )}

            {hujjatModal.data.hujjatlar.length > 0 && !hujjatModal.data.tasdiqlangan && (
              <button style={st.tasdiqTugmaYashil} onClick={() => hujjatTasdiqla(hujjatModal.user.id)}>{t('admin.approveDriver')}</button>
            )}
            <button style={st.bekorTugma} onClick={() => setHujjatModal(null)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function holatRang(holat) {
  if (holat === 'tasdiqlandi') return { background: 'rgba(52,199,89,0.16)', color: 'var(--yashil)' };
  if (holat === 'rad') return { background: 'rgba(255,59,48,0.14)', color: 'var(--qizil)' };
  return { background: 'rgba(255,149,0,0.16)', color: 'var(--amber)' };
}

function Stat({ raqam, matn, nom, rang, keng }) {
  return (
    <div style={{ ...stStat.karta, ...(keng ? { gridColumn: '1 / -1' } : {}) }}>
      <div style={{ ...stStat.ikon, background: rang }}><Ikonka nom={nom} size={18} /></div>
      <div style={stStat.raqam}>{raqam}</div>
      <div style={stStat.matn}>{matn}</div>
    </div>
  );
}

function Yuklanmoqda() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0, 1, 2, 3].map((i) => <SkeletKarta key={i} />)}
    </div>
  );
}

function Bosh({ matn }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--secondary-label)' }}>
      <div style={{ display: 'inline-flex', color: 'var(--tertiary-label)', marginBottom: 10 }}><Ikonka nom="receipt" size={34} /></div>
      <div style={{ fontSize: 15 }}>{matn}</div>
    </div>
  );
}

const st = {
  // KYC очерет — янги
  kycKarta: { display: 'flex', flexDirection: 'column', gap: 10, padding: 14, background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-1)', marginBottom: 10 },
  kycMeta: { fontSize: 13, color: 'var(--secondary-label)', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  kycTagBar: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  kycTag: { padding: '4px 10px', borderRadius: 'var(--r-full)', background: 'var(--fill)', color: 'var(--secondary-label)', fontSize: 12, fontWeight: 600 },
  kycHolat: { padding: '4px 10px', borderRadius: 'var(--r-full)', fontSize: 11, fontWeight: 600 },
  kycRadSabab: { fontSize: 12, color: 'var(--qizil)', display: 'inline-flex', alignItems: 'center', gap: 4 },
  // Ҳужжат модалидаги профил блоки
  profilBlok: { padding: 12, marginTop: 8, marginBottom: 14, background: 'var(--fill)', borderRadius: 'var(--r-md)' },
  profilSarlavha: { fontSize: 11, fontWeight: 600, color: 'var(--secondary-label)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 },
  profilGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  profilQator: { display: 'flex', flexDirection: 'column' },
  profilLabel: { fontSize: 11, color: 'var(--tertiary-label)', textTransform: 'uppercase' },
  profilQiymat: { fontSize: 14, color: 'var(--label)', fontWeight: 500 },

  sahifa: { width: '100%', maxWidth: 720, margin: '0 auto', minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 'env(safe-area-inset-bottom)' },
  header: { padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top))', background: 'var(--material-bar)', backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)', borderBottom: '0.5px solid var(--separator)', color: 'var(--label)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 },
  logo: { fontWeight: 600, fontSize: 17 },
  chiqish: { background: 'transparent', color: 'var(--tint)', padding: '6px 8px', fontSize: 15, fontWeight: 400 },
  sosBanner: { background: 'rgba(255,59,48,0.1)', padding: '12px 16px', borderBottom: '0.5px solid var(--separator)' },
  sosBoshi: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--qizil)', marginBottom: 10 },
  sosKarta: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', padding: 12, borderRadius: 'var(--r-md)', marginBottom: 8, boxShadow: 'var(--shadow-1)' },
  sosIsm: { fontWeight: 600, fontSize: 15 },
  sosMeta: { fontSize: 13, color: 'var(--secondary-label)', marginTop: 2 },
  sosQabulTugma: { background: 'var(--qizil)', color: '#fff', padding: '8px 14px', borderRadius: 'var(--r-full)', fontWeight: 600, fontSize: 13 },
  tablar: { padding: 16 },
  kontent: { padding: '0 16px 16px' },
  xato: { background: 'rgba(255,59,48,0.12)', color: 'var(--qizil)', padding: 12, borderRadius: 'var(--r-md)', marginBottom: 12, fontSize: 14 },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  royxat: { display: 'flex', flexDirection: 'column', gap: 10 },
  userKarta: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', padding: 14, borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-1)' },
  avatar: { width: 44, height: 44, borderRadius: '50%', background: 'var(--tint)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 18, flexShrink: 0 },
  userIsm: { fontWeight: 600, fontSize: 16 },
  userMeta: { fontSize: 13, color: 'var(--secondary-label)', marginTop: 2 },
  blokBelgi: { fontSize: 13, color: 'var(--qizil)', marginTop: 4, fontWeight: 500 },
  blokTugma: { background: 'var(--qizil)', color: '#fff', padding: '7px 14px', borderRadius: 'var(--r-full)', fontWeight: 600, fontSize: 13 },
  yechishTugma: { background: 'var(--yashil)', color: '#fff', padding: '7px 14px', borderRadius: 'var(--r-full)', fontWeight: 600, fontSize: 13 },
  tugmalarUstun: { display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'stretch' },
  tasdiqlaTugma: { background: 'var(--tint)', color: '#fff', padding: '7px 14px', borderRadius: 'var(--r-full)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' },
  tasdiqYechTugma: { background: 'var(--fill)', color: 'var(--label)', padding: '7px 14px', borderRadius: 'var(--r-full)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' },
  tasdiqMeta: { display: 'inline-block', marginLeft: 8, fontSize: 12, fontWeight: 600, color: 'var(--tint)' },
  hujjatTugma: { position: 'relative', background: 'var(--fill)', color: 'var(--label)', padding: '7px 14px', borderRadius: 'var(--r-full)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' },
  kutilmoqdaNuqta: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: 'var(--amber)', border: '1.5px solid var(--surface)' },
  hujjatKarta: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '0.5px solid var(--separator)' },
  hujjatRasm: { width: 64, height: 64, borderRadius: 'var(--r-md)', flexShrink: 0 },
  hujjatTur: { fontWeight: 600, fontSize: 15 },
  hujjatHolat: { display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--r-full)', marginTop: 4 },
  radTugma: { display: 'block', marginTop: 8, background: 'rgba(255,59,48,0.12)', color: 'var(--qizil)', padding: '6px 12px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 13 },
  radInput: { width: '100%', padding: 10, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--fill)', color: 'var(--label)', fontSize: 15, marginBottom: 8 },
  radConfirm: { background: 'var(--qizil)', color: '#fff', padding: '8px 14px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 14 },
  tasdiqTugmaYashil: { width: '100%', background: 'var(--yashil)', color: '#fff', padding: 14, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 16, marginTop: 16 },
  rideKarta: { background: 'var(--surface)', padding: 14, borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-1)' },
  rideYuqori: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rideId: { fontWeight: 600, fontSize: 15 },
  holatBelgi: { padding: '3px 10px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 600 },
  holatYashil: { background: 'rgba(52,199,89,0.16)', color: 'var(--yashil)' },
  holatSariq: { background: 'rgba(255,149,0,0.16)', color: 'var(--amber)' },
  rideYol: { fontSize: 15, fontWeight: 500 },
  rideMeta: { fontSize: 13, color: 'var(--secondary-label)', marginTop: 4 },
  modalFon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 24, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' },
  modal: { background: 'var(--surface-elevated)', width: '100%', maxWidth: 400, borderRadius: 'var(--r-xl)', padding: 24 },
  modalSarlavha: { fontSize: 20, fontWeight: 600, marginBottom: 8 },
  modalIzoh: { fontSize: 14, color: 'var(--secondary-label)', marginBottom: 16 },
  modalShaffoflik: { fontSize: 13, color: 'var(--amber)', background: 'rgba(255,149,0,0.12)', padding: '11px 14px', borderRadius: 'var(--r-md)', marginBottom: 16, lineHeight: 1.45 },
  input: { width: '100%', padding: 14, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--fill)', color: 'var(--label)', fontSize: 17, marginBottom: 16 },
  tasdiqTugma: { width: '100%', background: 'var(--qizil)', color: '#fff', padding: 15, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 17 },
  bekorTugma: { width: '100%', background: 'transparent', padding: 12, color: 'var(--tint)', fontSize: 17, fontWeight: 400, marginTop: 4 },
};

const stStat = {
  karta: { background: 'var(--surface)', padding: 18, borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-1)', textAlign: 'center' },
  ikon: { width: 36, height: 36, borderRadius: 9, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  raqam: { fontSize: 26, fontWeight: 700, letterSpacing: '0.3px' },
  matn: { fontSize: 13, color: 'var(--secondary-label)', marginTop: 2 },
};
