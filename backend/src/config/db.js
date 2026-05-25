// PostgreSQL базага уланиш
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

// SSL созлама. Агар DB_SSL_CA берилса (Supabase CA серти йўли) — серверни
// тўлиқ текширамиз (MITM'дан ҳимоя). Берилмаса — эски хатти-ҳаракат сақланади.
function sslSozlama() {
  if (process.env.DB_SSL_CA) {
    return { ca: fs.readFileSync(process.env.DB_SSL_CA, 'utf8'), rejectUnauthorized: true };
  }
  return { rejectUnauthorized: false };
}

// Render каби хостинглар DATABASE_URL беради — уни биринчи кўрамиз.
// Локал ишлаганда DB_* алоҳида ўзгарувчилардан фойдаланамиз.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslSozlama(),
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

pool.on('connect', () => {
  console.log('✅ PostgreSQL базага уланди');
});

pool.on('error', (err) => {
  console.error('❌ База хатоси:', err.message);
});

// Қулай сўров функцияси
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
