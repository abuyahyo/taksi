-- "Буюм қолди" — йўловчи таксида қолдирган буюмни тўлов эвазига қайтариш сўрови.
-- inDrive услуби: йўловчи нарх таклиф қилади, ҳайдовчи рози бўлади ёки ўз нархини
-- беради (савдо). Тўлов нақд, шахсан — биз ушламаймиз (сафар ҳақи каби).
CREATE TABLE IF NOT EXISTS topilmalar (
  id SERIAL PRIMARY KEY,
  ride_id      INTEGER NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  mijoz_id     INTEGER NOT NULL REFERENCES users(id),
  haydovchi_id INTEGER NOT NULL REFERENCES users(id),
  tavsif       TEXT NOT NULL,                 -- буюм тавсифи (масалан "қора ҳамён, орқа ўриндиқда")
  -- soraldi → topildi/topilmadi → kelishildi → qaytarildi (ёки bekor)
  holat        VARCHAR(20) NOT NULL DEFAULT 'soraldi',
  taklif_narx  INTEGER NOT NULL,              -- столдаги жорий таклиф нархи
  taklif_kim   VARCHAR(10) NOT NULL DEFAULT 'mijoz', -- сўнгги нархни ким қўйди: mijoz | haydovchi
  kelishilgan_narx INTEGER,                   -- келишилган якуний нарх
  yaratilgan   TIMESTAMP DEFAULT NOW(),
  yangilangan  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_topilma_mijoz     ON topilmalar(mijoz_id);
CREATE INDEX IF NOT EXISTS idx_topilma_haydovchi ON topilmalar(haydovchi_id);
CREATE INDEX IF NOT EXISTS idx_topilma_ride      ON topilmalar(ride_id);
-- Бир сафарга бир вақтда битта очиқ сўров (ёпилмаганлар такрорланмасин)
CREATE UNIQUE INDEX IF NOT EXISTS uq_topilma_ochiq
  ON topilmalar(ride_id)
  WHERE holat IN ('soraldi', 'topildi', 'kelishildi');

ALTER TABLE topilmalar ENABLE ROW LEVEL SECURITY;
