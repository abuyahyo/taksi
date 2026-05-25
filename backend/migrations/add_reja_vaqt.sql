-- Олдиндан буюртма: rides жадвалига rejalashtirilgan_vaqt
-- null = ҳозирги буюртма; акс ҳолда келажакдаги вақт.
-- Идемпотент.
ALTER TABLE rides ADD COLUMN IF NOT EXISTS rejalashtirilgan_vaqt TIMESTAMP;
