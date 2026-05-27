-- rides.pin — машина PIN-коди (тўғри машинага тушганини текшириш).
-- schema.sql'да бор эди, лекин мавжуд (production) базага миграция йўқ эди →
-- "column pin of relation rides does not exist" хатоси. Идемпотент.
ALTER TABLE rides ADD COLUMN IF NOT EXISTS pin VARCHAR(4);
