-- Низо (dispute) — йўловчи/ҳайдовчи тугаган сафар юзасидан расмий шикоят,
-- админ кўриб ҳал қилади. Шаффофлик: ҳал қилишда админ изоҳи мажбурий.

CREATE TABLE IF NOT EXISTS nizolar (
  id SERIAL PRIMARY KEY,
  ride_id        INTEGER NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  shikoyatchi_id INTEGER NOT NULL REFERENCES users(id),  -- шикоят қилувчи
  qarshi_id      INTEGER REFERENCES users(id),           -- кимга қарши (иккинчи томон)
  tur            VARCHAR(20) NOT NULL,                    -- narx|xavfsizlik|xizmat|kelmadi|yolgon_keldi|boshqa
  matn           TEXT NOT NULL,
  holat          VARCHAR(20) NOT NULL DEFAULT 'ochiq',    -- ochiq | korildi | hal | rad
  admin_javob    TEXT,                                    -- ҳал қилишда мажбурий (шаффофлик)
  hal_qilgan_id  INTEGER REFERENCES users(id),
  yaratilgan     TIMESTAMP DEFAULT NOW(),
  hal_vaqti      TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_nizo_holat       ON nizolar(holat);
CREATE INDEX IF NOT EXISTS idx_nizo_shikoyatchi ON nizolar(shikoyatchi_id);
CREATE INDEX IF NOT EXISTS idx_nizo_ride        ON nizolar(ride_id);
-- Бир фойдаланувчидан бир сафар бўйича фақат битта ОЧИҚ шикоят
CREATE UNIQUE INDEX IF NOT EXISTS uq_nizo_ochiq
  ON nizolar(ride_id, shikoyatchi_id) WHERE holat IN ('ochiq', 'korildi');
