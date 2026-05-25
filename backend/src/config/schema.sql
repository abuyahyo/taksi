-- Такси дастури маълумотлар базаси схемаси
-- Ишга тушириш: psql -d taxi_app -f schema.sql

-- Фойдаланувчилар (йўловчи, ҳайдовчи, админ)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  ism VARCHAR(100) NOT NULL,
  telefon VARCHAR(20) UNIQUE NOT NULL,
  parol_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'mijoz', -- mijoz, haydovchi, admin
  reyting NUMERIC(2,1) DEFAULT 5.0,
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
  pin VARCHAR(4),                      -- машина PIN-коди (тўғри машинага тушганини текшириш)
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
  ride_id INTEGER REFERENCES rides(id),
  tizim VARCHAR(10) NOT NULL,            -- payme, click
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
