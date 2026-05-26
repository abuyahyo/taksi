-- Обуна тўлови: транзакцияни обунага боғлаш + кутилаётган (pending) обуна ҳолати.
-- Энди обуна тўловсиз берилмайди — Payme/Click webhook тасдиқлагач фаоллашади.
-- Идемпотент — қайта ишга туширса хато бермайди.

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS obuna_id INTEGER REFERENCES obunalar(id);
CREATE INDEX IF NOT EXISTS idx_tx_obuna ON transactions(obuna_id);

-- obunalar.holat энди 'kutilmoqda' қийматини ҳам олади (тўлов кутаётган обуна).
-- VARCHAR бўлгани учун DDL ўзгариши шарт эмас.
