-- Севимли ҳайдовчилар + муайян ҳайдовчини чақириш (тўғридан-тўғри буюртма)
-- inDrive услуби: йўловчи ишонган ҳайдовчисини танлаб, буюртмани фақат унга юборади.
-- Идемпотент — ҳар деплойда хавфсиз юритилади.

CREATE TABLE IF NOT EXISTS sevimli_haydovchilar (
  yolovchi_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  haydovchi_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qoshilgan    TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (yolovchi_id, haydovchi_id)
);

CREATE INDEX IF NOT EXISTS idx_sevimli_yolovchi ON sevimli_haydovchilar(yolovchi_id);

-- Буюртма муайян ҳайдовчига аталган бўлса — кимга аталганини сақлаймиз.
-- NULL = оддий буюртма (барча ҳайдовчиларга).
ALTER TABLE rides ADD COLUMN IF NOT EXISTS maqsadli_haydovchi_id INTEGER REFERENCES users(id);
