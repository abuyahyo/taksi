-- Реклама кимошди — тўлов муддати ва "ўтказилган" (тўламаган) ғолиблар.
-- Ғолиб муддатида тўламаса, жой автомат иккинчи ўриндагига ўтади.
-- Идемпотент.
ALTER TABLE reklama_auksionlar ADD COLUMN IF NOT EXISTS tolov_muddati TIMESTAMP;
ALTER TABLE reklama_auksionlar ADD COLUMN IF NOT EXISTS otkazilgan INTEGER[] DEFAULT '{}';
