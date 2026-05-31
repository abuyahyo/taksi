-- Такси дастури маълумотлар базаси схемаси
-- Ишга тушириш: psql -d taxi_app -f schema.sql

-- Фойдаланувчилар (йўловчи, ҳайдовчи, админ)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  ism VARCHAR(100) NOT NULL,
  telefon VARCHAR(20) UNIQUE,            -- Telegram/Google орқали кирганда бўлмаслиги мумкин (NULL)
  telegram_id BIGINT UNIQUE,            -- Telegram Mini App фойдаланувчиси
  google_id VARCHAR(64) UNIQUE,         -- Google Sign-In фойдаланувчиси (sub)
  email VARCHAR(255),                   -- Google'дан келган email (ихтиёрий)
  parol_hash VARCHAR(255),              -- Telegram/Google кириш учун парол шарт эмас
  rol VARCHAR(20) NOT NULL DEFAULT 'mijoz', -- mijoz, haydovchi, admin
  reyting NUMERIC(2,1) DEFAULT 5.0,
  haydovchi_kodi VARCHAR(8) UNIQUE,     -- ҳайдовчи уникал коди (код/QR орқали севимлига қўшиш)
  -- Йўловчининг сақланган манзиллари (тез-тез манзил танлаш учун)
  home_manzil TEXT,
  home_lat NUMERIC(10,7),
  home_lng NUMERIC(10,7),
  ish_manzil TEXT,
  ish_lat NUMERIC(10,7),
  ish_lng NUMERIC(10,7),
  -- Шаффоф блоклаш тизими (рақобатчи муаммосидан ўрганилган)
  bloklangan BOOLEAN DEFAULT FALSE,
  blok_sababi TEXT,
  blok_vaqti TIMESTAMP,
  yaratilgan TIMESTAMP DEFAULT NOW()
);

-- Ҳайдовчи маълумотлари
CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  mashina_modeli VARCHAR(100),
  mashina_raqami VARCHAR(20),
  mashina_rangi VARCHAR(50),
  mashina_yili INTEGER,                -- машина ишлаб чиқарилган йил (Uber услубидаги уланиш)
  tugilgan_sana DATE,                  -- ҳайдовчининг туғилган санаси
  gpro_raqami VARCHAR(50),             -- ҳайдовчилик гувоҳномаси рақами
  gpro_amal_qiladi DATE,               -- гувоҳноманинг амал қилиш муддати
  tasdiqlangan BOOLEAN DEFAULT FALSE, -- админ тасдиқлаган ишончли ҳайдовчи
  holati VARCHAR(20) DEFAULT 'bosh', -- bosh, band, offline
  -- Жонли жойлашув (харита учун)
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  oxirgi_yangilanish TIMESTAMP DEFAULT NOW()
);

-- Сафарлар (буюртмалар)
CREATE TABLE IF NOT EXISTS rides (
  id SERIAL PRIMARY KEY,
  mijoz_id INTEGER REFERENCES users(id),
  haydovchi_id INTEGER REFERENCES users(id),
  -- Манзиллар
  boshlanish_manzil TEXT NOT NULL,
  boshlanish_lat NUMERIC(10,7),
  boshlanish_lng NUMERIC(10,7),
  tugash_manzil TEXT NOT NULL,
  tugash_lat NUMERIC(10,7),
  tugash_lng NUMERIC(10,7),
  masofa_km NUMERIC(6,2),
  -- Нарх (йўловчи таклиф қилади)
  taklif_narx INTEGER NOT NULL,        -- йўловчи таклиф қилган нарх
  kelishilgan_narx INTEGER,            -- охирги келишилган нарх
  -- Ҳолат
  holat VARCHAR(20) DEFAULT 'kutilmoqda',
  tarif VARCHAR(20) DEFAULT 'ekonom',  -- тариф класси: ekonom | komfort | dostavka
  opsiyalar JSONB DEFAULT '{}',        -- буюртма опциялари: { izoh, boshqaUchun, yuk }
  rejalashtirilgan_vaqt TIMESTAMP,     -- олдиндан буюртма вақти (null = ҳозир)
  oraliq_manzillar JSONB DEFAULT '[]', -- кўп манзил: бошланиш ва якуний орасидаги тўхташлар
  pin VARCHAR(4),                      -- машина PIN-коди (тўғри машинага тушганини текшириш)
  maqsadli_haydovchi_id INTEGER REFERENCES users(id), -- муайян ҳайдовчига аталган буюртма (NULL = барчага)
  -- kutilmoqda, qabul_qilindi, yo'lda, yakunlandi, bekor_qilindi
  -- Кутиш ҳақи — ҳайдовчи ёлғизланган кутиш муддати ва ҳақи
  kelgan_vaqti TIMESTAMP,           -- ҳайдовчи "етиб келдим" деган вақт
  yolga_chiqqan_vaqti TIMESTAMP,    -- "йўлга чиқдик" деган вақт
  kutish_haqi INTEGER DEFAULT 0,    -- сўмда, асосий нархга қўшилади
  chayovoy INTEGER DEFAULT 0,       -- йўловчи берган чаёвой
  -- Вақтлар
  yaratilgan TIMESTAMP DEFAULT NOW(),
  qabul_vaqti TIMESTAMP,
  yakun_vaqti TIMESTAMP
);

-- Ҳайдовчи нарх таклифлари (ҳар ким ўз нархини беради)
CREATE TABLE IF NOT EXISTS offers (
  id SERIAL PRIMARY KEY,
  ride_id INTEGER REFERENCES rides(id) ON DELETE CASCADE,
  haydovchi_id INTEGER REFERENCES users(id),
  taklif_narx INTEGER NOT NULL,
  yetib_kelish_min INTEGER,  -- неча минутда етиб боради
  vaqt TIMESTAMP DEFAULT NOW()
);

-- Баҳолашлар
CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  ride_id INTEGER REFERENCES rides(id),
  baholovchi_id INTEGER REFERENCES users(id),
  baholanuvchi_id INTEGER REFERENCES users(id),
  ball INTEGER CHECK (ball BETWEEN 1 AND 5),
  izoh TEXT,
  vaqt TIMESTAMP DEFAULT NOW()
);

-- Тезликни ошириш учун индекслар
CREATE INDEX IF NOT EXISTS idx_rides_holat       ON rides(holat);
CREATE INDEX IF NOT EXISTS idx_rides_mijoz       ON rides(mijoz_id);
CREATE INDEX IF NOT EXISTS idx_rides_haydovchi   ON rides(haydovchi_id);
CREATE INDEX IF NOT EXISTS idx_rides_yaratilgan  ON rides(yaratilgan);
CREATE INDEX IF NOT EXISTS idx_rides_haydovchi_yakun
   ON rides(haydovchi_id, holat, yakun_vaqti)
   WHERE holat = 'yakunlandi';
CREATE INDEX IF NOT EXISTS idx_offers_ride ON offers(ride_id);
CREATE INDEX IF NOT EXISTS idx_drivers_holati ON drivers(holati);
CREATE INDEX IF NOT EXISTS idx_drivers_user ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_baholanuvchi ON ratings(baholanuvchi_id);
-- Бир сафар — бир баҳоловчидан фақат битта баҳо (икки марта баҳолашни тўсади)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ratings_ride_baholovchi ON ratings(ride_id, baholovchi_id);
CREATE INDEX IF NOT EXISTS idx_users_telefon ON users(telefon);

-- Тўлов транзакциялари (Payme + Click)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  ride_id INTEGER REFERENCES rides(id),    -- сафар тўлови (ёки obuna_id/reklama_id — биттаси тўлади)
  obuna_id INTEGER REFERENCES obunalar(id),  -- обуна тўлови
  reklama_id INTEGER,                    -- реклама кимошди ютуғи тўлови
  tizim VARCHAR(10) NOT NULL,            -- payme, click, test
  tashqi_id VARCHAR(100),                -- Payme/Click транзакция ID'си
  summa INTEGER NOT NULL,                -- тийинда (1 сўм = 100 тийин)
  holat VARCHAR(20) DEFAULT 'kutilmoqda', -- kutilmoqda, tolandi, bekor
  yaratilgan_vaqt BIGINT,                -- Payme учун (millisekund)
  amalga_oshgan_vaqt BIGINT,
  bekor_vaqti BIGINT,
  bekor_sababi INTEGER,
  yaratilgan TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_ride ON transactions(ride_id);
CREATE INDEX IF NOT EXISTS idx_tx_tashqi ON transactions(tashqi_id);

-- 💳 Обуналар — биз ҳайдовчидан комиссия эмас, обуна билан ишлаймиз
CREATE TABLE IF NOT EXISTS obunalar (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  turi VARCHAR(20) NOT NULL,           -- trial, kunlik, haftalik, oylik, yillik
  summa INTEGER NOT NULL DEFAULT 0,
  boshlanish_sana TIMESTAMP DEFAULT NOW(),
  tugash_sana TIMESTAMP NOT NULL,
  holat VARCHAR(20) DEFAULT 'faol',    -- faol, tugagan, bekor
  yaratilgan TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_obunalar_user ON obunalar(user_id);
CREATE INDEX IF NOT EXISTS idx_obunalar_tugash ON obunalar(tugash_sana);

-- Транзакция обунага ҳам боғланиши мумкин (ҳайдовчи обуна тўлови).
-- obunalar яратилгандан кейин қўшамиз (FK тартиби учун).
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS obuna_id INTEGER REFERENCES obunalar(id);
CREATE INDEX IF NOT EXISTS idx_tx_obuna ON transactions(obuna_id);

-- 🆘 SOS шошилинч сигналлар — фойдаланувчи қизил тугмани босганида
CREATE TABLE IF NOT EXISTS sos_signals (
  id SERIAL PRIMARY KEY,
  ride_id INTEGER REFERENCES rides(id),
  yuboruvchi_id INTEGER REFERENCES users(id),
  rol VARCHAR(20),
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  matn TEXT,
  qabul_qilindi BOOLEAN DEFAULT FALSE,
  qabul_qilgan_id INTEGER REFERENCES users(id),
  qabul_vaqti TIMESTAMP,
  vaqt TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sos_ride ON sos_signals(ride_id);
CREATE INDEX IF NOT EXISTS idx_sos_qabul ON sos_signals(qabul_qilindi);

-- Сафарни улашиш — қисқа калит билан оила/дўст реал вақтда кузатиши учун
CREATE TABLE IF NOT EXISTS ride_shares (
  id SERIAL PRIMARY KEY,
  ride_id INTEGER REFERENCES rides(id) ON DELETE CASCADE,
  kalit VARCHAR(16) UNIQUE NOT NULL,
  yaratuvchi_id INTEGER REFERENCES users(id),
  yaratilgan TIMESTAMP DEFAULT NOW(),
  tugaydigan TIMESTAMP DEFAULT NOW() + INTERVAL '4 hours'
);
CREATE INDEX IF NOT EXISTS idx_shares_kalit ON ride_shares(kalit);
CREATE INDEX IF NOT EXISTS idx_shares_ride  ON ride_shares(ride_id);

-- Чат — йўловчи ↔ ҳайдовчи хабар алмашуви (сафар ичида)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  ride_id INTEGER REFERENCES rides(id) ON DELETE CASCADE,
  yuboruvchi_id INTEGER REFERENCES users(id),
  matn TEXT NOT NULL,
  vaqt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_ride ON messages(ride_id);

-- Web Push обуналари — браузер ёпиқ бўлса ҳам билдиришнома юбориш учун
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

-- KYC: ҳайдовчи ҳужжатлари (паспорт/ID, селфи). Расм файллари локал дискда
-- (backend/uploads/kyc), бу ерда фақат метаданни сақлаймиз.
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS tasdiq_holati VARCHAR(20) DEFAULT 'yangi'; -- yangi | kutilmoqda | tasdiqlandi | rad
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS rad_sababi TEXT;

CREATE TABLE IF NOT EXISTS driver_hujjatlar (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  turi VARCHAR(20) NOT NULL,            -- passport | selfie
  fayl VARCHAR(255) NOT NULL,           -- дискдаги файл номи
  holat VARCHAR(20) DEFAULT 'kutilmoqda', -- kutilmoqda | tasdiqlandi | rad
  rad_sababi TEXT,
  yuklangan TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, turi)
);
CREATE INDEX IF NOT EXISTS idx_hujjat_user ON driver_hujjatlar(user_id);

-- Сақланган манзиллар — фойдаланувчи ўзи номлаган жойлар (Уй/Иш'дан ташқари ихтиёрий)
CREATE TABLE IF NOT EXISTS saqlangan_manzillar (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom VARCHAR(60) NOT NULL,
  manzil TEXT NOT NULL,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  yaratilgan TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saqlangan_manzil_user ON saqlangan_manzillar(user_id);

-- Севимли ҳайдовчилар — йўловчи ишонган ҳайдовчисини танлаб тўғридан-тўғри чақиради
CREATE TABLE IF NOT EXISTS sevimli_haydovchilar (
  yolovchi_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  haydovchi_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qoshilgan    TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (yolovchi_id, haydovchi_id)
);
CREATE INDEX IF NOT EXISTS idx_sevimli_yolovchi ON sevimli_haydovchilar(yolovchi_id);

-- Реклама кимошди — ҳар ой битта реклама жойи очиқ кўтарилувчи кимошдида сотилади
CREATE TABLE IF NOT EXISTS reklama_kampaniyalar (
  id SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sarlavha   VARCHAR(100) NOT NULL,
  rasm_url   TEXT NOT NULL,
  havola     TEXT NOT NULL,
  holat      VARCHAR(20) DEFAULT 'kutilmoqda', -- kutilmoqda | tasdiqlangan | rad
  rad_sababi TEXT,
  yaratilgan TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reklama_kamp_user ON reklama_kampaniyalar(user_id);

CREATE TABLE IF NOT EXISTS reklama_auksionlar (
  id SERIAL PRIMARY KEY,
  oy           CHAR(7) NOT NULL UNIQUE,    -- 'YYYY-MM'
  tugash       TIMESTAMP NOT NULL,
  reserve_narx INTEGER NOT NULL DEFAULT 100000,
  min_qadam    INTEGER NOT NULL DEFAULT 50000,
  holat        VARCHAR(20) DEFAULT 'ochiq', -- ochiq | yopilgan
  golib_kampaniya_id INTEGER REFERENCES reklama_kampaniyalar(id),
  golib_summa  INTEGER,
  tolandi      BOOLEAN DEFAULT FALSE,
  tolov_muddati TIMESTAMP,             -- ғолиб шу вақтгача тўласин; ўтса иккинчига ўтади
  otkazilgan   INTEGER[] DEFAULT '{}', -- тўламай ўтказилган кампания id'лари
  yaratilgan   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reklama_takliflar (
  id SERIAL PRIMARY KEY,
  auksion_id   INTEGER NOT NULL REFERENCES reklama_auksionlar(id) ON DELETE CASCADE,
  kampaniya_id INTEGER NOT NULL REFERENCES reklama_kampaniyalar(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  summa        INTEGER NOT NULL,
  vaqt         TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reklama_taklif_auksion ON reklama_takliflar(auksion_id, summa DESC);

-- Барча public жадвалларда RLS ёқиш (Supabase авто Data API'дан ҳимоя).
-- Backend `postgres` роли (эга/BYPASSRLS) билан уланади — таъсир йўқ; anon/authenticated = DENY.
-- Батафсил: backend/migrations/enable_rls.sql
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;
