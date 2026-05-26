-- Telegram Mini App кириш: users'га telegram_id + telefon/parol_hash'ни ихтиёрий қилиш.
-- Telegram орқали кирган фойдаланувчида телефон/парол бўлмаслиги мумкин.
-- Идемпотент — қайта ишга туширса хато бермайди.

ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id BIGINT;
ALTER TABLE users ALTER COLUMN telefon DROP NOT NULL;
ALTER TABLE users ALTER COLUMN parol_hash DROP NOT NULL;

-- telegram_id'да такрорланиш бўлмасин
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_telegram_id_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_telegram_id_key UNIQUE (telegram_id);
  END IF;
END$$;
