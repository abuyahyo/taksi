# 💳 Тўлов тизими — Payme ва Click

## Қандай ишлайди

Иккала тизим ҳам "merchant API" орқали ишлайди: тўлов тизими **сизнинг серверингизга** сўров юборади, сиз тасдиқлайсиз. Шунинг учун серверингиз интернетдан кўринадиган бўлиши керак (деплойдан кейин).

## Webhook манзиллари

| Тизим | Манзил |
|-------|--------|
| Payme | `POST /api/payment/payme` |
| Click (1-босқич) | `POST /api/payment/click/prepare` |
| Click (2-босқич) | `POST /api/payment/click/complete` |

## Payme методлари (JSON-RPC)

Payme битта манзилга 5 хил метод юборади:
- `CheckPerformTransaction` — тўлов мумкинми текшириш
- `CreateTransaction` — транзакция яратиш
- `PerformTransaction` — тўловни амалга ошириш
- `CancelTransaction` — бекор қилиш
- `CheckTransaction` — ҳолатни текшириш

## Калитларни созлаш

`.env` файлга ёзинг (реал калитлар кабинетдан олинади):

```
PAYME_ID=...
PAYME_KEY=...
CLICK_SERVICE_ID=...
CLICK_MERCHANT_ID=...
CLICK_SECRET=...
```

## Калитларни қаердан олиш керак

- **Payme:** Payme Business кабинети → Merchant → API калитлари
- **Click:** Click кабинети → Merchant → Service созламалари

## Тест қилиш (база ишга тушгач)

Click имзо текшируви:
```bash
curl -X POST http://localhost:5000/api/payment/click/prepare \
  -H "Content-Type: application/json" \
  -d '{"click_trans_id":"123","sign_string":"notogri"}'
# Жавоб: {"error":-1,"error_note":"Имзо нотўғри"}  ✅ тўғри ишлади
```

## Хавфсизлик

- Махфий калитларни **ҳеч кимга** берманг, `.env`ни Git'га юкламанг (.gitignore'да бор).
- Суммаларни ҳар доим **тийинда** солиштиринг (1 сўм = 100 тийин).
- Реал тўловдан олдин албатта тест режимида синаб кўринг.

## Кейинги қадам (деплойдан кейин)

1. Серверни деплой қилинг (интернетдан кўринадиган бўлсин).
2. Webhook манзилларини Payme/Click кабинетига киритинг.
3. Кичик сумма билан реал тест ўтказинг.
