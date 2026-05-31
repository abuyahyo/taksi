-- Ҳайдовчи уникал коди — йўловчи код/QR орқали ҳайдовчини топиб севимлига қўшади.
-- Идемпотент.
ALTER TABLE users ADD COLUMN IF NOT EXISTS haydovchi_kodi VARCHAR(8) UNIQUE;
