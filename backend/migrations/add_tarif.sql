-- Тариф класслари: rides жадвалига tarif устуни
-- ekonom (default) | komfort | dostavka
-- Идемпотент — қайта ишга туширса хато бермайди.
ALTER TABLE rides ADD COLUMN IF NOT EXISTS tarif VARCHAR(20) DEFAULT 'ekonom';
