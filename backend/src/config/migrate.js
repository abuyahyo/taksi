// Миграцияларни автомат, идемпотент юритиш — "schema drift" хавфини йўқотади.
// CLAUDE.md'да: миграциялар қўлда юритиларди, биттаси унутилса `column does not
// exist` хатоси чиқарди. Энди ҳар деплойда автомат юради.
//
// • `backend/migrations/*.sql` алфавит тартибида ўқилади.
// • Юритилганлари `schema_migrations` жадвалида белгиланади — қайта юрмайди.
// • Барча миграция файллари `IF NOT EXISTS` билан — белгиланмаган бўлса ҳам хавфсиз.
// • Битта файл хато берса — қолганини тўхтатмаймиз, фақат огоҳ берамиз (схема
//   қисман янги бўлса ҳам сервер кўтарилсин). Хатолар жамланиб қайтарилади.

const fs = require('fs');
const path = require('path');

const MIGRATSIYA_PAPKA = path.join(__dirname, '..', '..', 'migrations');

async function migratsiyalarniYurit(pool, { jim = false } = {}) {
  const log = (...a) => { if (!jim) console.log(...a); };

  if (!fs.existsSync(MIGRATSIYA_PAPKA)) {
    log('ℹ️  migrations папкаси йўқ — ўтказиб юборилди');
    return { yurgan: [], otkazilgan: [], xatolar: [] };
  }

  // Кузатув жадвали — қайси миграция аллақачон юритилганини сақлайди
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      nom TEXT PRIMARY KEY,
      yurgan_vaqt TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const yurganlar = new Set(
    (await pool.query('SELECT nom FROM schema_migrations')).rows.map((r) => r.nom)
  );

  const fayllar = fs
    .readdirSync(MIGRATSIYA_PAPKA)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const natija = { yurgan: [], otkazilgan: [], xatolar: [] };

  for (const fayl of fayllar) {
    if (yurganlar.has(fayl)) {
      natija.otkazilgan.push(fayl);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATSIYA_PAPKA, fayl), 'utf8');
    try {
      await pool.query(sql);
      await pool.query(
        'INSERT INTO schema_migrations (nom) VALUES ($1) ON CONFLICT DO NOTHING',
        [fayl]
      );
      natija.yurgan.push(fayl);
      log(`  ✅ ${fayl}`);
    } catch (err) {
      natija.xatolar.push({ fayl, xato: err.message });
      console.error(`  ❌ ${fayl}: ${err.message}`);
    }
  }

  if (natija.yurgan.length) log(`🗄️  ${natija.yurgan.length} та миграция юритилди`);
  else log('🗄️  Янги миграция йўқ — база ёзилган');

  return natija;
}

module.exports = { migratsiyalarniYurit };

// CLI сифатида: `node src/config/migrate.js`
if (require.main === module) {
  const { pool } = require('./db');
  migratsiyalarniYurit(pool)
    .then((n) => {
      pool.end();
      process.exit(n.xatolar.length ? 1 : 0);
    })
    .catch((e) => {
      console.error('Миграция юритишда хато:', e.message);
      pool.end();
      process.exit(1);
    });
}
