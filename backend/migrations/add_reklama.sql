-- Реклама кимошди тизими — ҳар ой битта реклама жойи очиқ кўтарилувчи кимошдида сотилади.
-- Биз ҳайдовчидан фоиз олмаймиз; обуна + реклама — даромад. Реклама ТЎЛОВСИЗ кўрсатилмайди
-- (обуна каби: ғолиб Payme/Click тўлагач фаоллашади). Идемпотент.

-- Тўлов нишони: сафар, обуна ёки реклама кимошди ютуғи
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reklama_id INTEGER;

-- Реклама кампаниялари — баннер контенти + админ модерацияси
CREATE TABLE IF NOT EXISTS reklama_kampaniyalar (
  id SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sarlavha   VARCHAR(100) NOT NULL,
  rasm_url   TEXT NOT NULL,                -- баннер расми URL
  havola     TEXT NOT NULL,                -- босилганда ўтадиган манзил
  holat      VARCHAR(20) DEFAULT 'kutilmoqda', -- kutilmoqda | tasdiqlangan | rad
  rad_sababi TEXT,                         -- шаффоф рад этиш сабаби (мажбурий)
  yaratilgan TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reklama_kamp_user ON reklama_kampaniyalar(user_id);

-- Ойлик кимошди — ҳар ой учун битта жой
CREATE TABLE IF NOT EXISTS reklama_auksionlar (
  id SERIAL PRIMARY KEY,
  oy           CHAR(7) NOT NULL UNIQUE,    -- кўрсатиладиган ой 'YYYY-MM'
  tugash       TIMESTAMP NOT NULL,         -- кимошди ёпилиш вақти
  reserve_narx INTEGER NOT NULL DEFAULT 100000, -- бошланғич минимал нарх (сўм)
  min_qadam    INTEGER NOT NULL DEFAULT 50000,  -- минимал кўтариш қадами (сўм)
  holat        VARCHAR(20) DEFAULT 'ochiq', -- ochiq | yopilgan
  golib_kampaniya_id INTEGER REFERENCES reklama_kampaniyalar(id),
  golib_summa  INTEGER,
  tolandi      BOOLEAN DEFAULT FALSE,       -- ғолиб тўладими (фаол баннер шарти)
  yaratilgan   TIMESTAMP DEFAULT NOW()
);

-- Кимошди таклифлари
CREATE TABLE IF NOT EXISTS reklama_takliflar (
  id SERIAL PRIMARY KEY,
  auksion_id   INTEGER NOT NULL REFERENCES reklama_auksionlar(id) ON DELETE CASCADE,
  kampaniya_id INTEGER NOT NULL REFERENCES reklama_kampaniyalar(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  summa        INTEGER NOT NULL,
  vaqt         TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reklama_taklif_auksion ON reklama_takliflar(auksion_id, summa DESC);
