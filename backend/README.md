# Backend — Ўрнатиш Қўлланмаси

## 1. Пакетларни ўрнатиш

```bash
cd backend
npm install
```

## 2. PostgreSQL базани созлаш

Аввал PostgreSQL ўрнатилган бўлиши керак. Кейин база яратинг:

```bash
createdb taxi_app
psql -d taxi_app -f src/config/schema.sql
```

## 3. Муҳит созламалари

`.env.example` файлини нусхалаб, `.env` яратинг ва ўз маълумотларингизни ёзинг:

```bash
cp .env.example .env
```

`.env` ичида база паролингиз ва `JWT_SECRET` ни ўзгартиринг.

## 4. Серверни ишга тушириш

```bash
npm run dev    # ишлаб чиқиш режими (ўзгаришларни кузатади)
npm start      # оддий ишга тушириш
```

Сервер `http://localhost:5000` да ишлайди.

## 5. Синаб кўриш

Рўйхатдан ўтиш:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"ism":"Ali","telefon":"998901234567","parol":"12345","rol":"mijoz"}'
```

Кириш:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"telefon":"998901234567","parol":"12345"}'
```

Иккаласи ҳам `token` қайтаради — уни кейинги сўровларда `Authorization: Bearer TOKEN` сифатида ишлатасиз.

---

## Тайёр бўлган қисмлар (1-Босқич)

- ✅ Express сервер + Socket.io
- ✅ PostgreSQL уланиш ва база схемаси
- ✅ Рўйхатдан ўтиш / Кириш (JWT)
- ✅ Рол текшируви (mijoz / haydovchi / admin)
- ✅ Шаффоф блоклаш тизими (сабаби кўрсатилади)

## Кейинги қадам (2-Босқич)

Йўловчи интерфейси — харита, манзил танлаш, буюртма яратиш.
