-- Ҳайдовчи рейтинги пасайганда сифат назорати байроғи.
-- Паст рейтинг → огоҳлантириш (reyting_ogoh=TRUE); жуда паст → шаффоф автомат блок
-- (мавжуд bloklangan/blok_sababi устунлари ишлатилади).
ALTER TABLE users ADD COLUMN IF NOT EXISTS reyting_ogoh BOOLEAN DEFAULT FALSE;
