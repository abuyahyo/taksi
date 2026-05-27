-- Сақланган манзиллар — фойдаланувчи ўзи номлаган жойлар
-- (Уй/Иш users жадвалида; бу — ихтиёрий қўшимча жойлар: "Onam uyi", "Bolalar bog'chasi" ва ҳ.к.)
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
