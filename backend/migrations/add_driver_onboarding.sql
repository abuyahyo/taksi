-- Uber услубидаги ҳайдовчи уланиш оқими — қўшимча майдонлар.
-- Гувоҳнома (рақам + амал қилиш муддати), туғилган сана, машина йили.
-- Янги KYC ҳужжат турлари (license, mashina_old, mashina_plate) — driver_hujjatlar.turi
-- мавжуд VARCHAR(20) сиғимига кириб кетади, схема ўзгариши шарт эмас.

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS tugilgan_sana    DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS gpro_raqami       VARCHAR(50);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS gpro_amal_qiladi  DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS mashina_yili      INTEGER;
