-- Google Sign-In: users'га google_id + email. Идемпотент.
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_google_id_key') THEN
    ALTER TABLE users ADD CONSTRAINT users_google_id_key UNIQUE (google_id);
  END IF;
END$$;
