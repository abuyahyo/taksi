-- Таклиф (referral) дастури — "дўстни таклиф қил" ўсиш канали.
-- Биз фоиз олмаймиз, обуна билан ишлаймиз → бонус ҳам обуна кунлари.
-- Таклиф қилинган ҳайдовчи биринчи ПУЛЛИК обунани фаоллаштирса, иккаласи бонус олади.

ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_kodi VARCHAR(10) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS taklif_qilgan_id INTEGER REFERENCES users(id);

-- Бонус берилишини кузатиш — бир таклиф учун бир марта (қайта берилмаслик)
CREATE TABLE IF NOT EXISTS referallar (
  id SERIAL PRIMARY KEY,
  taklif_qilgan_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- кодини бергани
  taklif_qilingan_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- кодни ишлатгани
  bonus_kun          INTEGER NOT NULL DEFAULT 0,
  holat              VARCHAR(20) NOT NULL DEFAULT 'kutilmoqda', -- kutilmoqda | berildi
  yaratilgan         TIMESTAMP DEFAULT NOW(),
  bonus_vaqti        TIMESTAMP,
  UNIQUE(taklif_qilingan_id) -- ҳар фойдаланувчи фақат битта таклиф билан келади
);
CREATE INDEX IF NOT EXISTS idx_referal_taklifchi ON referallar(taklif_qilgan_id);
