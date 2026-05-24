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
  -- Нарх (inDrive услуби)
  taklif_narx INTEGER NOT NULL,        -- йўловчи таклиф қилган нарх
  kelishilgan_narx INTEGER,            -- охирги келишилган нарх
  -- Ҳолат
  holat VARCHAR(20) DEFAULT 'kutilmoqda',
  -- kutilmoqda, qabul_qilindi, yo'lda, yakunlandi, bekor_qilindi
  -- Вақтлар
  yaratilgan TIMESTAMP DEFAULT NOW(),
  qabul_vaqti TIMESTAMP,
  yakun_vaqti TIMESTAMP
);

-- Ҳайдовчи нарх таклифлари (inDrive — ҳар ким ўз нархини беради)
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
CREATE INDEX IF NOT EXISTS idx_rides_holat ON rides(holat);
CREATE INDEX IF NOT EXISTS idx_offers_ride ON offers(ride_id);
CREATE INDEX IF NOT EXISTS idx_drivers_holati ON drivers(holati);

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
