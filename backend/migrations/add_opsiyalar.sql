-- Буюртма опциялари: rides жадвалига opsiyalar (JSONB)
-- { izoh: string|null, boshqaUchun: bool, yuk: bool }
-- Идемпотент.
ALTER TABLE rides ADD COLUMN IF NOT EXISTS opsiyalar JSONB DEFAULT '{}';
