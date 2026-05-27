# Manzil — Claude учун ёдгорчик

inDrive услубидаги такси веб-дастур. Тошкент учун. PWA билан — телефонга ўрнатилади.

## Тил ва мулоқот

- **Фойдаланувчи билан фақат ўзбек тилида гаплашинг** (кирилл алифбоси, инглизча ёки русча эмас).
- Қисқа ва аниқ жавоблар. Кодни айтиб ўтирманг — фойдаланувчи кўрмайди.
- Эмодзилар ўрнига ёзишда мақсадга етиб боринг.
- Фойдаланувчи бошқа AI'нинг хабарларини кўчириб юбориши мумкин (бошқа сурурдан). Бундай ҳолатда **сиз — ҳақиқий машинадаги Claude Code** — реал ишни қила оласиз. Бошқа AI веб'да, машинага улaнмаган.

## Стратегик қарорлар (ўзгартирманг)

1. **Биз ҳайдовчидан фоиз олмаймиз.** Бизнинг даромад — **обуна** (subscription).
   - Trial 7 кун бепул, кейин кунлик/ҳафталик/ойлик/йиллик пакетлар.
   - Файл: `backend/src/controllers/subscriptionController.js` — нархлар шу ерда.
   - **Обуна тўловсиз берилмайди.** `sotibOlish` 'kutilmoqda' обуна яратади, фаоллашиш
     фақат Payme/Click тўлови тасдиқлангач (`obunaFaollashtir`). `transactions.obuna_id`.
2. **Бренд ранги — бирюза (#0E9384), сариқ эмас.** Сариқ = Yandex Go ассоциацияси. CSS'да `--sariq` номи қолдирилди (эски кодга мос), қиймати **бирюза**. Янги код учун `--asosiy`.
3. **Шаффоф блоклаш** — биздан ўйлаб топилди. Admin блок қилмоқчи бўлса сабаб **мажбурий** (backend `400` қайтаради), фойдаланувчи login қилганда сабабни кўради. Бу архитектурада маҳкам, шунчаки UI эмас. Янги функция қўшганда **шу тамойилни сақланг**: фойдаланувчи учун шаффофлик.
4. **Карта (банк карти) талаб қилмаймиз.** Render/Koyeb/Fly карта талаб қилади → улар йўқолди. ngrok (барқарор домен, бепул) + Supabase бепул план + Nominatim бепул. **Google Maps мумкин эмас** (Billing талаб қилади). MapBox/OSM мумкин.
5. **inDrive услуби.** Йўловчи нархни ўзи белгилайди, ҳайдовчи рози бўлади ёки **ўз нархи**ни таклиф қилади. Surge pricing йўқ.
6. **Бошқа иловалардаги муаммоларни тузатишга стратегиямиз.** "Келди" алдаш → GPS текширув (200м). Манзил кўринмайди → йўловчи юлдузли превью. Хавфсизлик йўқ → SOS тугмаси, сафарни улашиш линки. Қўнғироқ кераксиз → чат.

## Тех стек

- **Backend:** Node.js + Express 5, Socket.io 4, PostgreSQL (Supabase), JWT, bcryptjs. Native `fetch` (Node 22).
- **Frontend:** React 18 + Vite 8 (rolldown), React Router, Leaflet, Axios, socket.io-client, vite-plugin-pwa.
- **i18n:** Кутубхонасиз ўз қурилмаси — `src/i18n/index.jsx` + `uz.js`/`uz-latn.js`/`ru.js`.
- **PWA:** vite-plugin-pwa билан, `registerType: 'autoUpdate'` + `cleanupOutdatedCaches`. Янги версия → автомат янгиланиш, кеш муаммоси йўқ.
- **Дизайн:** Liquid Glass (`backdrop-filter`), `.glass` / `.glass-dark` / `.glass-asosiy` / `.glass-tugma` утилитлари. Декоратив `.fon-blobs` блоблар билан фон. Index.css ичида.
- **CI:** `.github/workflows/ci.yml` — ҳар push/PR'да backend тест + frontend build/test (lint информатив).
- **Хавфсизлик:** `middleware/xavfsizlik.js` HTTP-headerlar (Telegram framing/гео тўсилмайди); `middleware/rateLimit.js` (auth + geocode); глобал JSON хато-ишловчи (server.js). Frontend `XatoChegarasi` (error boundary), 401'да авто-logout (api.js).
- **Локализация-тайёрлик:** геокод мамлакати `GEOCODE_COUNTRIES` env (дефолт `uz`, бўш/`*` → дунё); телефон E.164; харита маркази GPS'га кўчади.

## Лойиҳа тузилиши

```
C:\taxi-app\
├── backend\
│   ├── src\
│   │   ├── server.js              # роутларни yиғади
│   │   ├── config\db.js           # PG pool, DATABASE_URL ёки DB_*
│   │   ├── config\schema.sql      # барча жадваллар + индекслар
│   │   ├── controllers\           # auth, admin, driver, passenger, ride, share, payment, payme, click, message, geocode, heatmap, sos, subscription
│   │   ├── routes\                # мос routes
│   │   ├── middleware\auth.js     # JWT + role middleware
│   │   └── socket\socketHandler.js # барча real-time мантиқ шу ерда
│   ├── .env                       # GIT'га YOQ — DATABASE_URL, JWT_SECRET
│   └── package.json
├── frontend\
│   ├── src\
│   │   ├── App.jsx                # роутер, ToastProvider, I18nProvider, Suspense lazy
│   │   ├── main.jsx
│   │   ├── index.css              # БАРЧА дизайн tokens, glass, blobs шу ерда
│   │   ├── i18n\                  # uz.js, uz-latn.js, ru.js, index.jsx
│   │   ├── services\              # api.js (axios + socket), useSocket.js, bildirishnoma.js
│   │   ├── components\            # Kirish, Chat, Tolov, Ulashish, Baholash, MashinaProfili, YolovchiProfili, Obuna, SOS, NarxTarkibi, HaritaPreview, IssiqXarita, ManzilQidirish, Toast, Skelet, YangilanishBanner
│   │   └── pages\                 # KirishSahifa (бош), YolovchiSahifa, HaydovchiSahifa, AdminSahifa, SafarTarixi, UlashilganSahifa
│   ├── public\                    # icon-192/512/маскали, manifest автомат vite'дан
│   ├── vite.config.js             # PWA конфиг шу ерда
│   └── package.json
├── CLAUDE.md                      # бу файл
├── README.md
└── REJA.md
```

## Telegram Mini App

Илова Telegram Mini App сифатида ҳам ишлайди (бот: `t.me/manzil_taksi_bot`).

- **Кириш:** `POST /api/auth/telegram` — `initData`'ни HMAC-SHA256 билан текширади
  (`backend/src/utils/telegram.js`), `telegram_id` бўйича юзер топади/яратади, JWT беради.
  `TELEGRAM_BOT_TOKEN` `.env`'да бўлмаса 503 (fail-closed).
- **Авто-кириш:** `frontend/src/services/telegram.js` — Telegram ичида ўзи киради.
  Telegram'дан ташқарида no-op (оддий веб оқими ўзгармайди).
- **Бот хабарномалари:** `backend/src/controllers/telegramBotController.js` —
  янги буюртма (ҳайдовчига), таклиф/ҳолат/чат (йўловчига), SOS (админга). web push билан ёнма-ён.
- **Webhook:** `POST /api/telegram/webhook` (`telegramWebhookController.js`, `secret_token` билан) —
  • локация ташланса → "Manzil'да буюртма" Web App тугмаси (`?dest_lat&dest_lng` → йўловчи саҳифа манзилни тўлдиради);
  • буйруқлар `/buyurtma /uy /ish /tarix /obuna /yordam` (меню `setMyCommands` билan кўтарилишда ўрнатилади);
  • ҳайдовчи расм + изоҳ ("passport"/"selfie") юборса → KYC ҳужжати юкланади (`getFile`→download→`kycYoz`).
- **DB:** `users.telegram_id` (UNIQUE); `telefon`/`parol_hash` NULL бўлиши мумкин.
  Миграциялар: `add_telegram.sql`, `add_obuna_tolov.sql` (Supabase'да юритилган).
- **`.env`:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `MINIAPP_URL` (GIT'га ёзилмайди).
- **BotFather:** Menu Button URL = `https://overwrite-pursuant-junkie.ngrok-free.dev`.
- **setWebhook (бир марта):** `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<MINIAPP_URL>/api/telegram/webhook&secret_token=<SECRET>`

## Базани миграция қилиш

**МУҲИМ — Schema drift хавфи:** Миграциялар автоматик юритилмайди. `backend/migrations/*.sql` файллари бор, лекин Supabase production'да қайси-бирлари юритилмаган бўлиши мумкин. Аввал `column ... does not exist` хатоси чиққанда — миграцияни юритишни унутганлик аломати.

**Барча миграцияни идемпотент юритиш** (ҳар деплойдан кейин — `IF NOT EXISTS` шарт):

```js
// backend/'дан node -e ёки скрипт сифатида
const {Pool} = require('pg');
const fs = require('fs');
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}});
const files = fs.readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort();
for (const f of files) await pool.query(fs.readFileSync(`migrations/${f}`, 'utf8'));
```

Янги ўзгариш керак бўлса:
1. SQL'ни `backend/migrations/add_X.sql` га ёзинг — **доим `IF NOT EXISTS` ишлатинг** (идемпотент).
2. `backend/src/config/schema.sql`'га ҳам қўшинг (мос келиш учун).
3. Юритиш (қўлда ёки юқоридаги скрипт билан):
   ```powershell
   $dbPass = Get-Content "$env:TEMP\supa_db_pass.txt" -Raw
   $env:PGPASSWORD = $dbPass; $env:PGSSLMODE = "require"
   & "C:\Program Files\PostgreSQL\17\bin\psql.exe" `
     -h "aws-1-eu-central-1.pooler.supabase.com" -p 5432 `
     -U "postgres.zzucnvzoruidqjgrwzdi" -d postgres `
     -f "backend/migrations/add_X.sql"
   ```
4. **Direct host (`db.zzucnvzoruidqjgrwzdi.supabase.co`) IPv6-only — DNS resolve бўлмайди.** Pooler (`aws-1-eu-central-1.pooler.supabase.com:5432`) сессион режимда ишлатинг.

## Қандай ишга тушириш (компьютер ёқилгач)

**Launcher:** `Desktop\taxi-start-all.bat` — backend ва ngrok'ни бирга кўтаради.
Қўлда:

```powershell
cd C:\taxi-app\backend
npm run dev        # http://localhost:5000
# Бошқа ойнада — БАРҚАРОР ngrok домени:
ngrok http --domain=overwrite-pursuant-junkie.ngrok-free.dev 5000
```

URL **ўзгармайди**: `https://overwrite-pursuant-junkie.ngrok-free.dev`.
Шу URL Telegram Mini App (BotFather → Menu Button) учун ишлатилади.

## Синов аккаунтлари

| Рол | Телефон | Парол | Изоҳ |
|---|---|---|---|
| Админ (мижоз ҳам) | `+998901234567` | `test123` | id=1, "Админ Каримов" |
| Ҳайдовчи | `+998905555555` | `test123` | id=2, "Бахтиёр Алиев", машина: Chevrolet Cobalt оқ, рақам 01 A 777 BA |

Supabase DB пароли: `$env:TEMP\supa_db_pass.txt` (фойдаланувчининг машинасида).

## Текширишлар (smoke test)

Тўлиқ синов учун:

```powershell
# Backend ҳаёти
Invoke-RestMethod http://localhost:5000

# Тоннел
Invoke-RestMethod (Get-Content "$env:TEMP\tunnel_url.txt" -Raw)

# Login API
$h = @{'Content-Type'='application/json'}
Invoke-RestMethod "http://localhost:5000/api/auth/login" -Method POST -Headers $h -Body '{"telefon":"+998901234567","parol":"test123"}'
```

Визуал/socket тест бўлса — `backend/`га вақтинча `*.js` файл ёзиб (playwright-core + socket.io-client + axios `--no-save` ўрнатиб), кейин файлни ўчириб юборинг (commit'га киритманг).

**Эслатма:** `--no-save` орқали ўрнатилган пакетлар (playwright-core, socket.io-client, axios) **бир-бирини алмаштиради**. Иккаласи керак бўлса битта `npm install` буйруғида бирга ёзинг:
```powershell
npm install playwright-core socket.io-client axios --no-save
```

**Тўлиқ сафар оқими E2E (socket) — синалган шаблон:**

`socket.io-client + axios + pg` орқали йўловчи+ҳайдовчи симуляцияси (телефон керак эмас, тeз). 17 қадам, ҳаммаси автомат:
1. Login (passenger admin id=1 + driver id=2) → JWT
2. Иккита socket уланиш
3. `haydovchi_online` + обуна текшируви (`mavjud_buyurtmalar` ёки `obuna_kerak`)
4. `yangi_buyurtma` → `buyurtma_yaratildi` (PIN олинади) + `buyurtma_keldi` (ҳайдовчига)
5. `narx_taklif` → `yangi_taklif`
6. `haydovchi_tanlandi` → `tasdiqlandi` (DB'да `qabul_qilindi`)
7. `xabar_yuborish` (чат)
8. `safar_holati: yetib_keldi` (50м — қабул; 500м — `holat_rad`)
9. `safar_holati: yolda` нотўғри PIN → `pin_xato`; тўғри PIN → ўтади (кутиш ҳақи + янги нарх)
10. `sos_yuborildi` → `sos_qabul_qilindi`
11. `safar_holati: yakunlandi`
12. `chayovoy` → нархга қўшилади
13. `baholash` (икки томон) → `ratings` ёзилади + `users.reyting` янгиланади
14. DB якуний текширув: `holat=yakunlandi`, `yakun_vaqti`, ratings=2

Шаблон: backend/'да temp `.js` ёзилади → юритилади → ўчирилади. Bug топилса (масалан схема drift), нима тузатилгани commit'га тушсин.

## Дизайн тамойиллари

- **Тил**: фронтенда фойдаланувчи матн ҳамма жойда `t('kalit')` орқали. 3 тилда (uz/uz-latn/ru).
- **Ўзбекча кодлар**: ўзгарувчи номлари ўзбекча (`yuborildi`, `tugash`, `narx`, `safar`). Барча янги код шу услубда.
- **Glass**: фон ортида **маъноли контент** бўлса glass (харита, blob). Солид — фойдаланувчи **ўқиётганда** (форма, жадвал).
- **Бирюза асосий, қора иккиламчи**. Семантик ранглар — амбер огоҳлантиришлар, қизил хатолар, яшил муваффақиятлар (тегмаслик керак).
- **slideUp анимация** — модаллар очилишида. `.slide-up-modal` тагидан.
- **Yandex'дан ўргандик** — кутиш ҳақи (3 дақ. бепул кейин 500 сўм/мин), чат шаблонлари, чаёвой, сўнгги манзиллар. Лекин **бизнинг шартда** — комиссия эмас, обуна.
- **Uber услуби (йўловчи "чақириш" экранлари)** — қидиришда радар пульс, ҳайдовчи топилгач: ҳолат пилюласи + тоза ҳайдовчи картаси + иконкали амал қатори (Чат/Тўлов/Улашиш). `XatoChegarasi` — рендер хатосида оқ экран эмас, чиройли фолбэк.

## Кодлаш услуби

- Toast'ни alert/confirm ўрнига: `const toast = useToast(); toast.success('Сақланди');`
- Backend хатолар: `{ xato: 'Хабар' }` формати. Фронтенд `err.response?.data?.xato`'ни тутади.
- Socket events ўзбекча номлар: `buyurtma_keldi`, `yangi_taklif`, `safar_holati`, `sos_yuborildi`.
- DB колонналар: `boshlanish_manzil`, `kelishilgan_narx`, `kutish_haqi`, `chayovoy`. Кириллча матнлар колоннада сақланиши OK.
- React.lazy() route'лар (Suspense'ни ёдда тутинг).
- `localStorage`: `token`, `user`, `til`. ҳаммаси шу учта.

## Авто-янгилаш стратегияси (кэш муаммосиз)

Уч техника бирга ишлайди — фойдаланувчи доим янги версияда:

1. **Backend cache-control header'лари** (`server.js`):
   - `index.html`, `sw.js`, `/` → `Cache-Control: no-cache` (ҳар сафар сервердан янги текширилади)
   - `/assets/*` (хешланган) → `Cache-Control: public, max-age=31536000, immutable` (1 йил)
2. **`/api/version` polling** (`services/yangilanish.js`): фронтенд `visibilitychange`/`focus`'да endpoint'ни сўрайди; жавоб `{v: "/assets/index-<hash>.js"}`. Хеш ўзгарса автомат `window.location.reload()`.
3. **Service Worker NetworkFirst** (`vite.config.js` workbox runtimeCaching `navigateHandler`): навигатция доим аввал серверни сўрайди (3с timeout), кэш фақат оффлайн захира. "Эски шеллда ёпишиб қолиш" муаммосини олдини олади.

**Эслатма:** Telegram WebView SW'ни кўпинча ишлатмайди, лекин 1+2 шу ерда ҳам ишлайди.

## Маълум очиқ муаммолар (gotchas)

- **`/api/auth/telegram` 401 қайтаряпти** — `initData` HMAC текшируви фейл бўляпти (бот токени тўғри, лекин имзо мос келмайди). Сабаб ноаниқ — `URLSearchParams` декодлаш билан боғлиқ бўлиши мумкин. Натижa: Telegram Mini App'да фойдаланувчи **гост сифатида** қолади (KirishSahifa role-select экранига тушади). Шу учун `KirishSahifa.jsx` манул `Yo'lovchi`/`Haydovchi` tugmalari `navigate('/yolovchi' + window.location.search)` ишлатади — гост бўлганда ҳам `?dest_lat=…` сақланиб ўтсин.
- **ngrok бepул план "Visit Site" interstitial** — иловa "стандарт браузер" UA билан (iOS Safari/Chrome) ҳар сафар очилганда `https://overwrite-pursuant-junkie.ngrok-free.dev` олдида абуз огоҳлантириши кўрсатилади. Cookie ўрнатилгач 12 соат йўқолади. Telegram Mini App ҳам шундай. Бу **код муаммоси эмас, домен муаммоси** — ngrok paid, Cloudflare Tunnel ёки шахсий домен билан йўқолади. Bug сифатида debug қилмaнг.

## Билиш керак бўлганлар

- **Boshqa AI** хабарларини юборганда — у машинага улaнмаган, ZIP ярата олмайди, файлларни кўра олмайди. Сиз эса машинада ишлашингиз мумкин. Унинг хабарини контекст сифатида ўқинг, лекин сиз ҳақиқий ишни қилинг.
- **Тоннел — ngrok, барқарор домен** `overwrite-pursuant-junkie.ngrok-free.dev` (ўзгармайди). Cloudflared эмас.
- **`node --watch` .env'ни тингламайди.** `.env` ўзгарганда қўлда `npm run dev`'ни қайта ишга тушуринг (ёки `src/server.js`'ни `touch` қилинг — модул қайтa юкланганда `dotenv.config()` янги .env'ни ўқийди).
- **PowerShell ва Cyrillic**: `Invoke-RestMethod`'нинг `-Body` ишлатганда UTF-8 яхши ишламайди — кириллча текст `?????`'га айланиши мумкин. SQL орқали ишланиши керак бўлса, файлга UTF-8'да ёзинг ва `psql -f`'нинг ишлатинг.
- **GitHub repo**: `abuyahyo/taksi`. Бренд номи Tez Taxi → Safar Taksi → **Manzil**'га ўзгарди (repo номи ўзгармаслиги мумкин — атайлаб).

## Reja.md ва README.md

Дастур аввалги ҳолатидан кўп ўзгарди. **README.md янгиланган** (шу пайтгача функциялар, шаффоф блоклаш ҳақида алоҳида бўлим). `REJA.md` эса аввалги режа — янгиланмаган.

## Сўнгги commit

```
git log --oneline -10
```

буйруғи билан охирги ҳаракатларни кўришингиз мумкин.
