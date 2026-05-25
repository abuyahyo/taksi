-- Кўп манзил: rides жадвалига oraliq_manzillar (JSONB массив)
-- Бошланиш ва якуний манзил орасидаги тўхташлар (стринглар).
-- Идемпотент.
ALTER TABLE rides ADD COLUMN IF NOT EXISTS oraliq_manzillar JSONB DEFAULT '[]';
