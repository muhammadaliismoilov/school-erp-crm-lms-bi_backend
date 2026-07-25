# PostgreSQL Senior-daraja reja — yuton_school

Manba: **"PostgreSQL: Baytlardan Senior Darajagacha"** (80 bet, 15 bob) + `yuton_backend`/`yuton_frontend` ustida o'tkazilgan real audit (2026-07-22).

Har bir band uchta narsani beradi: **nima qilinadi**, **nega** (kitobning qaysi bobi), **qabul mezoni** (tugadi deb aytish uchun nima ko'rsatilishi kerak).

---

## 0. Auditning qisqa hisoboti

Loyihaning hozirgi holati (o'lchangan raqamlar):

| Ko'rsatkich | Qiymat | Baho |
|---|---|---|
| Entity soni | 163 | — |
| Migratsiyalar | 90 | — |
| Modullar | 50+ | — |
| Service fayllar | 105 | — |
| Primary key strategiyasi | **100% `uuid` v4** (`UuidAuditEntity`) | 🔴 asosiy xavf |
| Pul tiplari | `numeric(14,2)` — float **yo'q** | 🟢 to'g'ri |
| Vaqt tiplari | 51× `timestamptz`, 55× `date`, 16× `time` | 🟢 to'g'ri |
| `@Index` dekoratorlari | 276 ta | 🟢 yaxshi qamrov |
| `@ManyToOne` (FK) | 124 ta | — |
| Soft delete | `deleted_at` + `@VersionColumn` bazaviy klassda | 🟢 poydevor bor |
| Connection pool sozlamalari | **yo'q** (`extra` bloki umuman berilmagan) | 🔴 |
| `statement_timeout` / `idle_in_transaction_session_timeout` | **yo'q** | 🔴 |
| OFFSET pagination | kamida **29** servisda `.skip((page-1)*limit)` | 🟠 |
| `CREATE INDEX CONCURRENTLY` migratsiyalarda | **0 ta** | 🔴 |
| `pg_stat_statements` / `log_min_duration_statement` | **yo'q** | 🔴 |
| `FOR UPDATE` / `SKIP LOCKED` | **0 ta ishlatilish** | 🟠 |
| Read replica | konfiguratsiyada bor (`database.replica`, compose'da streaming replication) | 🟡 lag himoyasi yo'q |
| Idempotency kaliti | faqat `attendance_logs` da | 🟠 moliyada yo'q |
| Partitioning | yo'q | 🟡 hali shart emas |
| PITR / backup verifikatsiyasi | hujjatlashtirilmagan | 🔴 |

**Xulosa:** sxema sifati (tiplar, constraintlar, indekslar) allaqachon yaxshi darajada. Asosiy bo'shliqlar — **ID arxitekturasi**, **operatsion qatlam** (pool, timeout, o'lchov, backup) va **parallellik intizomi** (pul/qoldiq operatsiyalari). Reja aynan shu tartibda quriladi.

---

# BOSQICH 1 — O'lchov qatlami (avval o'lchang, keyin o'zgartiring)

> Kitob 12-bob: *"Optimallashtirishning birinchi qoidasi: taxmin qilmang, o'lchang."*

Bu bosqich hech qanday biznes-mantiqqa tegmaydi, lekin qolgan hamma bosqich uning raqamlariga tayanadi. **Birinchi bo'lib shu bajariladi.**

## 1.1. `pg_stat_statements` yoqish

**Nima:** PostgreSQL konfiguratsiyasiga kengaytmani qo'shish va migratsiya bilan yaratish.

```sql
-- postgresql.conf (yoki docker-compose command)
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
```

```sql
-- migratsiya: CreatePgStatStatements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

**Nega:** 12.1 — "ko'pincha aybdor eng sekin so'rov emas, o'rtacha, lekin sekundiga 500 marta chaqiriladigan so'rov". `@Index` 276 ta bo'lsa ham, qaysi biri ishlayotganini faqat statistika ko'rsatadi.

**Qabul mezoni:** `SELECT query, calls, total_exec_time, mean_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;` ishlaydi va natija beradi.

## 1.2. Sekin so'rovlar logi

```sql
log_min_duration_statement = 300ms   -- prod
log_lock_waits = on
log_temp_files = 0                    -- work_mem toshishlarini ko'rsatadi
log_autovacuum_min_duration = 0
```

**Nega:** 12.4 — `Sort Method: external merge Disk:` signalini ushlash uchun; 11.4 — lock kutishlarini ko'rish uchun.

**Qabul mezoni:** loglarda 300 ms dan uzun so'rovlar ko'rinadi; haftalik top-10 ro'yxati tuziladi.

## 1.3. Backend'ga so'rov metrikalari

`src/modules/observability/` allaqachon `metrics.interceptor.ts` bilan bor. Unga qo'shiladigan yangi metrikalar:

- `db_query_duration_seconds` (histogram, `{module, operation}` yorliqlari bilan) — TypeORM logger orqali;
- `db_pool_waiting_count`, `db_pool_active_count` — pool bosimini ko'rish;
- `http_request_db_queries_total` — **N+1 detektori**: bitta HTTP so'rovda nechta SQL ketgani.

**Nega:** 12.2 — "N+1 EXPLAIN'da ko'rinmaydi, chunki har bir alohida so'rov sog'lom". Uni faqat "bitta request = nechta query" hisoblagichi ushlaydi.

**Qabul mezoni:** Grafana'da (yoki `/metrics` da) endpoint bo'yicha "o'rtacha query/request" ko'rsatkichi bor; 10 dan oshgan endpointlar ro'yxati chiqariladi.

## 1.4. Indeks salomatligi hisoboti (bir martalik + oylik)

```sql
-- ishlatilmayotgan indekslar (o'lik yuk)
SELECT s.schemaname, s.relname AS table, s.indexrelname AS index,
       pg_size_pretty(pg_relation_size(s.indexrelid)) AS size, s.idx_scan
FROM pg_stat_user_indexes s
JOIN pg_index i ON i.indexrelid = s.indexrelid
WHERE s.idx_scan = 0 AND NOT i.indisunique
ORDER BY pg_relation_size(s.indexrelid) DESC;

-- indekssiz FK ustunlari (kitobning eng muhim tavsiyasi, 6.2)
SELECT c.conrelid::regclass AS table, a.attname AS fk_column
FROM pg_constraint c
JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND i.indkey[0] = k.attnum
  );

-- Seq Scan yeyayotgan katta jadvallar
SELECT relname, seq_scan, seq_tup_read, idx_scan,
       pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_stat_user_tables
WHERE seq_scan > 1000
ORDER BY seq_tup_read DESC LIMIT 20;
```

**Nega:** 6.2 — "FK bor, indeks yo'q — sohadagi eng keng tarqalgan junior xatosi"; 10.5 — "`idx_scan = 0` bo'lgan indekslar — o'lik yuk, o'chiring".

**Qabul mezoni:** `scripts/db-health-report.mjs` yaratiladi, uchta so'rovni bajarib markdown hisobot chiqaradi; birinchi hisobot `docs/db-health-2026-07.md` sifatida saqlanadi.

---

# BOSQICH 2 — Ulanish va operatsion xavfsizlik (eng arzon, eng katta ta'sir)

> Kitob 3.2 va 14.6: har connection — alohida OS process.

## 2.1. Connection pool va timeout'lar

`src/app.module.ts` dagi `buildTypeOrmOptions` ga `extra` bloki qo'shiladi:

```ts
const baseOptions = {
  type: "postgres" as const,
  autoLoadEntities: true,
  synchronize: false,
  migrationsRun: false,
  migrations: [__dirname + "/database/migrations/*{.ts,.js}"],
  ssl,
  extra: {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),   // instans boshiga
    min: Number(process.env.DATABASE_POOL_MIN ?? 2),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: `yuton-api@${process.env.NODE_ENV ?? "dev"}`,
    statement_timeout: 15_000,                  // 15 s dan uzun so'rov o'ldiriladi
    idle_in_transaction_session_timeout: 30_000, // ochiq qolgan tranzaksiya o'ldiriladi
    lock_timeout: 5_000,                        // migratsiyalarda hayot saqlaydi
  },
};
```

**Nega:**
- 3.2 — pool default (10) sozlanmagan; instanslar ko'payganda `max_connections` ga tegib ketish xavfi;
- 14.6 — "sekin bo'lyapti deb `max_connections` ni 1000 qilish" — klassik xato; to'g'ri yo'l kichik barqaror pool;
- `statement_timeout` — bitta yomon so'rov butun poolni band qilmasin;
- `idle_in_transaction_session_timeout` — 3.7/3.8: ochiq tranzaksiya autovacuum'ni to'xtatadi va bloat yaratadi. Bu **eng ko'p e'tibordan chetda qoladigan sozlama**.
- `application_name` — `pg_stat_activity` da kim nima qilayotganini ko'rish uchun.

**Muhim:** `statement_timeout` global emas, hisobot/eksport so'rovlari uchun alohida (uzunroq) sessiya sozlamasi kerak — `imports-exports` va `reports` modullarida `SET LOCAL statement_timeout = '120s'`.

**Qabul mezoni:** `SELECT application_name, count(*) FROM pg_stat_activity GROUP BY 1;` da `yuton-api@production` ko'rinadi; sun'iy `pg_sleep(60)` so'rovi 15 soniyada uziladi.

## 2.2. PgBouncer (instanslar 3 tadan oshganda)

**Nima:** `deploy/` ga PgBouncer servisi qo'shiladi, `pool_mode = transaction`.

**Nega:** 14.6 — 10 servis × 10 pool = 100 real connection. PgBouncer minglab arzon ulanish beradi.

**Ehtiyot (kitobdagi gotcha):** transaction rejimida sessiyaga yopishgan narsalar sinadi — `SET`, `PREPARE`, advisory lock, `LISTEN`. Shuning uchun:
- TypeORM'da `prepare: false` yoki `statement_cache_size = 0`;
- advisory lock ishlatiladigan joylar (agar 4.4 bandda kiritilsa) **bitta tranzaksiya ichida** bo'lishi shart;
- migratsiyalar PgBouncer'ni **chetlab**, to'g'ridan-to'g'ri PostgreSQL portiga ulanadi.

**Qabul mezoni:** yuk testida 500 parallel HTTP so'rov PostgreSQL'da 20 dan kam real connection ochadi.

## 2.3. Xavfsiz migratsiya intizomi

Hozir: 90 migratsiyada `CONCURRENTLY` **bitta ham yo'q**. Bu — production'da jadval qulflanishi degani (11.4: "Migratsiyani peak-vaqtda yurgizish — production'ni yotqizishning klassik usuli").

**Yangi qoidalar (`docs/migration-rules.md` sifatida rasmiylashtiriladi):**

1. Katta jadvalga indeks — **doim** `CREATE INDEX CONCURRENTLY`:
   ```ts
   // TypeORM: CONCURRENTLY tranzaksiya ichida ishlamaydi
   public async up(q: QueryRunner): Promise<void> {
     await q.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_x ON t (c)`);
   }
   // + migratsiya faylida transaction: false belgisi kerak
   ```
2. `NOT NULL` qo'shish — ikki qadamda: avval `CHECK (col IS NOT NULL) NOT VALID`, keyin `VALIDATE CONSTRAINT`, keyin `SET NOT NULL`.
3. Ustun tipini o'zgartirish — hech qachon to'g'ridan-to'g'ri emas: yangi ustun → backfill (bo'laklab) → o'qishni ko'chirish → eski ustunni o'chirish.
4. Har migratsiya boshida `SET lock_timeout = '5s'` — qulf ololmasa, migratsiya production'ni yotqizmasdan **yiqiladi**.
5. FK qo'shish — `NOT VALID` bilan, keyin alohida `VALIDATE`.

**Qabul mezoni:** `docs/migration-rules.md` mavjud; CI'da yangi migratsiyalarda `CREATE INDEX` (CONCURRENTLY'siz) ni ushlaydigan lint qadam bor.

---

# BOSQICH 3 — ID arxitekturasi (eng katta texnik qaror)

> Kitob 15-bob, ayniqsa 15.4 va 15.5.

## 3.1. Muammoning aniq tavsifi

`UuidAuditEntity` barcha 163 entity uchun `@PrimaryGeneratedColumn('uuid')` beradi — bu PostgreSQL'da `gen_random_uuid()`, ya'ni **UUIDv4, sof tasodifiy**.

Kitob 15.4 dagi oqibatlar zanjiri yuton_school'ga aynan tegishli:

1. **Kesh lokalligi yo'q** — har `INSERT` B-tree'ning istalgan joyiga tushadi, butun indeks shared buffers'da issiq bo'lishi kerak;
2. **Page split hamma joyda** — leaflar o'rtacha yarim-bo'sh, indeks shishadi;
3. **WAL ko'payadi** — full-page writes.

Sirtdan bu shunday ko'rinadi: *"INSERT'lar avval tez edi, jadval o'sgani sari sababsiz sekinlashyapti"*. Bu — `attendance_logs`, `audit_*`, `notifications`, `student_payment_transactions` kabi o'suvchi jadvallarda yaqin kelajakda chiqadigan muammo.

Qo'shimcha narx (15.5): har FK ustuni 16 bayt (BIGINT'da 8). 124 ta `@ManyToOne` × millionlab satr = xom ma'lumotda ham, har FK indeksida ham ikki barobar hajm.

## 3.2. Tanlangan yo'l: UUIDv7 (to'liq migratsiya emas)

163 entity'ni BIGINT'ga ko'chirish — ishlab turgan tizim uchun oqlanmaydigan xavf. Kitobning 15.4 dagi **birinchi davosi** ayni shu holat uchun: *"PK'ni UUIDv7 ga o'tkazish (vaqt-prefiksli — yozuvlar o'ng chetga tushadi)"*.

Muhimi: **ustun tipi o'zgarmaydi** (`uuid` bo'lib qoladi), faqat generator o'zgaradi. Ya'ni migratsiya — DEFAULT'ni almashtirish, jadvalni qayta yozish emas.

**Qadamlar:**

1. **PostgreSQL 18+ bo'lsa** — o'rnatilgan `uuidv7()`. Hozirgi image — `bitnami/postgresql:16`, demak SQL funksiyasi yoziladi:

```sql
CREATE OR REPLACE FUNCTION uuid_generate_v7() RETURNS uuid AS $$
  SELECT encode(
    set_bit(
      set_bit(
        overlay(
          uuid_send(gen_random_uuid())
          PLACING substring(int8send((extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3)
          FROM 1 FOR 6
        ),
        52, 1
      ),
      53, 1
    ),
    'hex'
  )::uuid;
$$ LANGUAGE sql VOLATILE;
```

2. **Yangi entity'lar uchun bazaviy klass:**

```ts
export abstract class UuidV7AuditEntity {
  @PrimaryGeneratedColumn('uuid')
  @Generated('uuid')   // DB DEFAULT uuid_generate_v7() migratsiyada beriladi
  id: string;
  ...
}
```

3. **Mavjud jadvallarga DEFAULT almashtirish** — arzon, bloklamaydi:

```sql
ALTER TABLE attendance_logs ALTER COLUMN id SET DEFAULT uuid_generate_v7();
```

Ustuvorlik tartibi (yozuv hajmi bo'yicha):
   - `attendance_logs`, `attendance_events`
   - `audit_*` jadvallari
   - `notifications`, `notification_deliveries`
   - `student_payment_transactions`, `transactions`
   - `lesson_*` / jadval generatsiyasi jadvallari (chorakda ~4600 satr)
   - qolgan barcha jadvallar (bir migratsiyada, skript bilan generatsiya qilinadi)

4. **Eski satrlar tegilmaydi** — v4 va v7 aralash yashaydi, bu mutlaqo xavfsiz (ikkalasi ham 16 baytlik `uuid`). Vaqt o'tishi bilan yangi (v7) satrlar ustunlik qiladi va indeksning o'ng cheti issiq bo'lib qoladi.

**Qabul mezoni:**
- yangi INSERT qilingan satrlarning `id` i vaqt bo'yicha tartiblanadi (`SELECT id FROM attendance_logs ORDER BY created_at DESC LIMIT 5` — id'lar ham kamayish tartibida);
- `pgstattuple` yoki `pg_stat_user_indexes` bo'yicha eng katta indekslarning to'ldirilish zichligi o'lchanadi (oldin/keyin).

## 3.3. Tashqi ko'rinadigan ID va IDOR

Kitob 15.6: ketma-ket id tashqariga chiqsa — IDOR + "German tank problem".

yuton_school'da id'lar allaqachon UUID, ya'ni **sanab bo'lmaydi** — bu tomon yopiq. Lekin kitobning ogohlantirishi qoladi: *"UUID — avtorizatsiya emas"*.

**Nima qilinadi:** `access-control` moduli asosida har resurs uchun "bu ob'yekt shu foydalanuvchining maktabi/filialiga tegishlimi?" tekshiruvini **avtomatik** qiladigan qatlam — bu allaqachon `TenantModule` (AsyncLocalStorage) bilan qisman qilingan. Qolgani:

- barcha `findOne(id)` chaqiriqlari tenant filtri bilan o'ralganini tekshiradigan test (repository qatlamida);
- IDOR uchun avtomatlashgan test: A maktab foydalanuvchisi B maktab resursi id'si bilan har bir `GET /:id` endpointga urinadi → **404** (403 emas — mavjudligini ham oshkor qilmaslik uchun).

**Qabul mezoni:** `test/security/idor.e2e-spec.ts` — barcha `:id` endpointlar uchun avtomatik jadval-testi yashil.

---

# BOSQICH 4 — Ma'lumot butunligi va parallellik (pul tegadigan joylar)

> Kitob 6, 11 va 13-boblar. Bu bosqich **eng yuqori qiymatli**, chunki moliyaviy modullarga tegadi.

## 4.1. Lost update'dan himoya: atomar UPDATE

Audit natijasi: `FOR UPDATE` / `SKIP LOCKED` — **0 ta ishlatilish**. Ya'ni parallellik hozircha ORM'ning `@VersionColumn` (optimistik lock) yelkasida. Bu — kitobning "Davo 2" si, va u yolg'iz yetarli emas.

**Nishon joylar (`finance`, `advanced-finance`, `student-payments`, `transactions`, `inventory`, `procurement`):**

Har qanday "qoldiqni kamaytirish" operatsiyasi kitobning "Davo 0" naqshiga o'tkaziladi (11.3):

```sql
-- NOTO'G'RI (hozirgi tipik ORM naqshi):
--   balance = await repo.findOne(...); balance.amount -= x; await repo.save(balance);

-- TO'G'RI:
UPDATE student_balances
SET amount = amount - $2
WHERE student_id = $1
  AND amount >= $2
RETURNING amount;
-- 0 satr qaytdi → mablag' yetmadi, biznes-xatosi qaytariladi
```

Xuddi shu naqsh: ombor qoldig'i (`inventory`), kutubxona nusxalari (`library`), sinf sig'imi (`admissions`), kupon/chegirma limitlari.

**Nega:** 11.3 — "O'qish ham, tekshiruv ham, yozish ham bitta amalda. Satr darajasidagi lock buni o'z-o'zidan navbatga soladi."

**Qabul mezoni:** har bir shunday operatsiya uchun **parallellik testi**: 50 ta bir vaqtdagi so'rov 10 dona qoldiqqa → aynan 10 tasi muvaffaqiyatli, 40 tasi toza rad javobi, qoldiq hech qachon manfiy emas.

## 4.2. Tranzaksiya intizomi

Audit: 92 faylda `transaction(` yoki `queryRunner` bor — yaxshi. Tekshiriladigani — **tranzaksiya ichida tashqi chaqiriq yo'qligi**.

Kitob 11.3: *"hech qachon qulf ichida tashqi API kutmang"*. yuton_school'da xavfli nomzodlar: Telegram yuborish, FCM push, SMS provayder, S3/MinIO yuklash, to'lov provayderi.

**Nima qilinadi:**
1. Kod auditi: `transaction(` bloklari ichida `httpService`, `fetch`, `s3Client`, `telegram`, `fcm` chaqiriqlari qidiriladi;
2. Topilganlari **outbox pattern** ga ko'chiriladi — tranzaksiya ichida faqat `outbox_messages` jadvaliga satr yoziladi, yuborish tashqarida (worker orqali) bo'ladi. `attendance-turnstile` ishida outbox allaqachon boshlangan — u standartga aylantiriladi;
3. ESLint qoidasi yoki CI grep: tranzaksiya bloki ichida tashqi I/O — xato.

**Qabul mezoni:** `grep` hisobotida tranzaksiya ichida tashqi chaqiriq 0 ta; outbox jadvali barcha tashqi yuborishlar uchun yagona kirish nuqtasi.

## 4.3. Job navbati: `SKIP LOCKED`

Kitob 11.4: *"Redis'siz, qo'shimcha infratuzilmasiz ishonchli job-queue"*.

Loyihada BullMQ (Redis) bor — bu yaxshi. Lekin **kritik, yo'qolmasligi kerak bo'lgan** vazifalar (to'lov reconciliation, hisobot generatsiyasi, davomat outbox) uchun **transactional outbox + `SKIP LOCKED`** ishonchliroq: vazifa ma'lumot bilan bitta tranzaksiyada yoziladi, ya'ni "baza commit bo'ldi, lekin Redis'ga job tushmadi" holati fizik jihatdan mumkin emas.

```sql
SELECT id, payload
FROM outbox_messages
WHERE status = 'pending'
  AND next_attempt_at <= now()
ORDER BY created_at
LIMIT 50
FOR UPDATE SKIP LOCKED;
```

**Qabul mezoni:** ikkita worker parallel ishlaganda bitta xabar ikki marta yuborilmaydi (integratsion test).

## 4.4. Deadlock profilaktikasi

Kitob 11.5: *"resurslarni hamma joyda bir xil tartibda qulflang"*.

**Nima qilinadi:**
1. Ko'p satrni yangilaydigan joylarda doim `ORDER BY id` bilan qulflash;
2. Global **retry-wrapper**: `40001` (serialization_failure) va `40P01` (deadlock_detected) xatolarida tranzaksiyani 3 martagacha eksponensial kechikish bilan qayta urinish;
3. `log_lock_waits = on` (1.2 bandda) bilan real deadlock'lar monitoring'ga chiqadi.

```ts
// src/common/database/with-retry.ts
export async function withTransactionRetry<T>(
  ds: DataSource,
  fn: (m: EntityManager) => Promise<T>,
  attempts = 3,
): Promise<T> { /* 40001 / 40P01 da qayta urinish */ }
```

**Qabul mezoni:** wrapper mavjud va barcha moliyaviy tranzaksiyalarda ishlatiladi; deadlock metrikasi Grafana'da.

## 4.5. Idempotentlik — moliyaga ham

Hozir idempotency kaliti faqat `attendance_logs` da. Kitob 13.3 uchligi (holat mashinasi + append-only jurnal + idempotency key) **to'lovlarga** ham qo'llanadi:

1. `student_payment_transactions` (va `transactions`) ga `idempotency_key TEXT UNIQUE`;
2. Kirish nuqtalari (webhook, mobil ilova, kassir UI) `ON CONFLICT (idempotency_key) DO NOTHING` bilan yozadi;
3. Holat o'tishi atomar:
   ```sql
   UPDATE payments SET status = 'paid'
   WHERE id = $1 AND status = 'pending'
   RETURNING id;   -- 0 satr = allaqachon o'tkazilgan, hech narsa buzilmadi
   ```

**Qabul mezoni:** bir xil `idempotency_key` bilan 3 marta yuborilgan to'lov bazada aynan 1 ta yozuv qoldiradi (test).

## 4.6. Ledger — qoldiq bor joyda append-only jurnal

Kitob 13.4 va 13.7: *"pul, tovar, bonus balli: 'qoldiq' bor joyda senior javob bitta — append-only jurnal + keshlangan yig'indi"*.

yuton_school'da qoldiq bor joylar: o'quvchi balansi, xodim oylik/avans, ombor qoldig'i, kutubxona nusxalari, gamification ballari.

**Nima qilinadi (har biri uchun):**
- `*_entries` / `*_movements` jadvali: faqat `INSERT`, hech qachon `UPDATE`/`DELETE`; xato — storno yozuv bilan tuzatiladi;
- joriy qoldiq — keshlangan ustun (`students.balance`), lekin **haqiqat manbai jurnal**;
- **kunlik sverka jobi**: `SUM(entries)` va keshlangan qoldiq mos kelishini tekshiradi, farq bo'lsa alert;
- pul o'tkazmalarida invariant: har `transfer_id` bo'yicha `SUM(amount) = 0`.

`student-payments` moduli allaqachon shu yo'nalishda (`backfill-student-payment-transactions.ts` bor) — reja uni **hamma qoldiqli modulga standart** qilib yoyadi.

**Qabul mezoni:** sverka jobi ishlaydi va 0 farq bilan tugaydi; `SUM(amount) = 0` invarianti test bilan qoplangan.

## 4.7. Baza darajasidagi taqiqlar (constraint audit)

Kitob 6-bob falsafasi: *"ma'lumot butunligini ilova emas, baza qo'riqlaydi"*.

Tekshiriladigan va qo'shiladigan constraintlar:

| Qoida | Constraint |
|---|---|
| Summa manfiy bo'lmasin | `CHECK (amount >= 0)` — barcha `numeric` pul ustunlarida |
| Baho diapazoni | `CHECK (score BETWEEN 0 AND 100)` |
| Sana oralig'i | `CHECK (end_date > start_date)` — chorak, o'quv yili, shartnoma |
| Bitta o'quvchi bitta sinfda bir vaqtda | partial unique index |
| Xona/o'qituvchi jadvalida to'qnashuv | **`EXCLUDE USING gist`** (13.5) |
| Soft delete + unikallik | partial unique index (10.4) |

**Eng qimmatlisi — dars jadvali to'qnashuvi.** Hozir bu ilova qatlamida tekshirilayotgan bo'lsa, parallel so'rovda teshiladi (13.5: "avval tekshir, keyin yoz" — parallel ikki so'rovda teshiladi):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE lessons
  ADD CONSTRAINT excl_lessons_room
  EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (deleted_at IS NULL);

ALTER TABLE lessons
  ADD CONSTRAINT excl_lessons_teacher
  EXCLUDE USING gist (
    teacher_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (deleted_at IS NULL);
```

Bu — kitobning eng kuchli, kam ishlatiladigan quroli va yuton_school uchun aynan mos: dars jadvali bitta xona/o'qituvchini ikki joyga qo'yolmaydi, **ilova qanchalik parallel bo'lmasin**.

**Soft delete + unikallik** (10.4, 7.4): `UuidAuditEntity` da `deleted_at` bor, demak hozirgi `UNIQUE` constraintlar o'chirilgan satrlarni ham hisobga oladi — "o'chirilgan o'quvchi kodini yangi o'quvchi ololmaydi" muammosi. Yechim:

```sql
DROP INDEX uq_students_student_code;
CREATE UNIQUE INDEX CONCURRENTLY uq_students_student_code_alive
  ON students (school_id, student_code) WHERE deleted_at IS NULL;
```

**Qabul mezoni:** to'qnashuv testi — bir xil xona/vaqtga 2 parallel INSERT → biri `23P01` (exclusion_violation) bilan rad etiladi; soft-delete qilingan kodni qayta ishlatish mumkin.

---

# BOSQICH 5 — So'rov performansi

> Kitob 4, 10, 12-boblar.

## 5.1. Keyset pagination (OFFSET tuzog'i)

Audit: kamida **29 servisda** `.skip((page - 1) * limit)`.

Kitob 12.3: *"OFFSET 100000 — PostgreSQL 100 020 satrni topib o'qib, birinchi 100 000 tasini axlatga tashlaydi"*. Bundan tashqari sahifalar orasida satr qo'shilsa — takrorlanish/tushib qolish.

**Ajratish qoidasi (kitobdan):**
- **Admin-panel jadvallari, 10–15 sahifa** → OFFSET qoladi, tegilmaydi;
- **Cheksiz lenta, mobil ilova, eksport, katta jurnal jadvallari** → keyset.

**Keyset kerak bo'lgan aniq joylar:**
- `attendance_logs` / davomat jurnali (eng katta o'suvchi jadval)
- `audit_*` yozuvlari
- `notifications` (mobil portal — cheksiz lenta)
- `mobile-portal` barcha ro'yxatlari
- `imports-exports` — eksport oqimi
- `transactions` / `student_payment_transactions`

**Implementatsiya:**

```ts
// src/common/pagination/keyset.ts
export interface KeysetQuery {
  cursor?: string;   // base64({ createdAt, id })
  limit: number;
}

// so'rov:
qb.where('(l.created_at, l.id) < (:createdAt, :id)', decoded)
  .orderBy('l.created_at', 'DESC')
  .addOrderBy('l.id', 'DESC')
  .limit(limit);
```

Har bir keyset endpoint uchun **kompozit indeks majburiy** (10.4 — tenglik ustunlari oldinga, tartib ustunlari oxirga):

```sql
CREATE INDEX CONCURRENTLY idx_attendance_logs_school_created
  ON attendance_logs (school_id, created_at DESC, id DESC);
```

**Qabul mezoni:** 1 000 000 satrli jadvalda 1-sahifa va 5000-sahifa **bir xil vaqtda** ochiladi (±10%).

## 5.2. N+1 ovi

Kitob 12.2. Detektor 1.3 bandda qurilgan. Bu bosqichda topilganlar tuzatiladi:

- `relations: [...]` bilan eager loading (bitta JOIN);
- yoki ikki so'rov: `WHERE id IN (...)`;
- yoki `ARRAY_AGG`/`json_agg` bilan bolalarni bitta so'rovda yig'ish (9.2).

Ayniqsa tekshiriladigan sahifalar: dashboard (KPI + delta), dars jadvali chorak ko'rinishi (~4600 dars), o'quvchilar ro'yxati (ota-ona, sinf, balans bilan), HR xodimlar ro'yxati, hisobotlar.

**Qabul mezoni:** har bir asosiy ro'yxat endpointi uchun "query/request" ≤ 5; dashboard uchun ≤ 10.

## 5.3. EXPLAIN intizomi

Kitob 12.1 sikli: *EXPLAIN → eng semiz tugunni top → indeks/so'rovni tuzat → qayta EXPLAIN*.

**Nima qilinadi:**
1. `pg_stat_statements` top-20 so'rov uchun `EXPLAIN (ANALYZE, BUFFERS)` olinadi va `docs/query-plans/` ga saqlanadi (bazaviy o'lchov);
2. Uch belgi bo'yicha baholanadi:
   - `Rows Removed by Filter` katta → indeks yetishmayapti,
   - `Buffers: read` katta → disk I/O,
   - baho vs haqiqat farqi katta → `ANALYZE` / `SET STATISTICS`;
3. `Sort Method: external merge Disk:` chiqsa — hisobot so'rovlari uchun sessiya darajasida `SET LOCAL work_mem = '64MB'` (global emas! — 12.4 ogohlantirishi).

**Qabul mezoni:** top-20 so'rovning har biri uchun plan fayli va qaror (tuzatildi / me'yorda) yozilgan.

## 5.4. Indekslarni tozalash va to'ldirish

1.4 hisobotiga asoslanib:
- `idx_scan = 0` bo'lgan non-unique indekslar → `DROP INDEX CONCURRENTLY` (har bir yozuvga soliq, 10.5);
- indekssiz FK ustunlari → `CREATE INDEX CONCURRENTLY` (6.2);
- JSONB ustunlari (`state_payload`, `payload`, `request_payload`) da qidiruv bo'lsa → **GIN** (10.3);
- juda katta xronologik jadvallar (`attendance_logs`, `audit_*`) uchun sana bo'yicha → **BRIN** nomzodi sifatida baholanadi (10.3: milliardlab satrga bir necha MB).

**Qabul mezoni:** hisobotda "indekssiz FK" ro'yxati bo'sh; o'lik indekslar o'chirilgan; jami indeks hajmi kamaygan.

## 5.5. Denormalizatsiya — o'lchov bilan

Kitob 14.2: denormalizatsiya — ongli istisno, "har keshlangan ustun — hujjatlashtirilgan majburiyat".

Nomzodlar:
- o'quvchi balansi (4.6 bandda ledger keshi sifatida allaqachon kiritiladi);
- sinf/o'quvchi bo'yicha davomat foizi (dashboard);
- reyting o'rtachalari (`students-rating`).

Og'ir dashboard hisobotlari uchun — **`MATERIALIZED VIEW`** + `REFRESH ... CONCURRENTLY` (kunlik/soatlik):

```sql
CREATE MATERIALIZED VIEW mv_daily_attendance_summary AS
SELECT school_id, date_trunc('day', event_at) AS day, ...
FROM attendance_logs GROUP BY 1, 2;

CREATE UNIQUE INDEX ON mv_daily_attendance_summary (school_id, day);  -- CONCURRENTLY refresh uchun shart
```

**Qabul mezoni:** har keshlangan ustun uchun (a) qayta hisoblash skripti va (b) sverka jobi bor. Bu ikkisisiz kesh qo'shilmaydi.

---

# BOSQICH 6 — Masshtab (kerak bo'lganda, kitobdagi tartibda)

> Kitob 14.7: *"avval indekslar va so'rovlar, keyin keshlash, keyin read replica, keyin partitioning, va faqat shundan keyin — sharding"*.

## 6.1. Read replica'ni to'g'ri ishlatish

Konfiguratsiya allaqachon bor (`database.replica`, compose'da streaming replication). Yetishmayotgani — **replication lag himoyasi** (14.4).

Kitob: *"'Replicaga o'qishni ko'chirdik, g'alati buglar boshlandi' hikoyalarining 90%i — shu lag"*.

**Nima qilinadi:**
1. Aniq siyosat: qaysi so'rov qayerdan o'qiydi.
   - **Doim primary:** login/auth, to'lov, davomat yozuvidan keyingi ekran, profil tahriridan keyin, barcha yozuv-keyin-o'qish oqimlari;
   - **Replica:** hisobotlar, analitika, eksport, dashboard'ning tarixiy qismi.
2. **Read-your-writes:** yozgan foydalanuvchi uchun keyingi N soniya (masalan 5 s) davomida barcha o'qish primary'dan. Amalga oshirish — `TenantModule` dagi AsyncLocalStorage kontekstiga `lastWriteAt` qo'yish va TypeORM'ning `replication` tanlovini shunga qarab majburlash.
3. **Lag monitoringi:** `SELECT now() - pg_last_xact_replay_timestamp();` → Prometheus metrikasi + alert (>5 s).

**Qabul mezoni:** lag metrikasi dashboard'da; e2e test: baho qo'yilgandan keyin darhol ochilgan jurnalda baho ko'rinadi.

## 6.2. Partitioning

Kitob 14.3. **Hozir shart emas**, lekin ikkita jadval uchun oldindan rejalashtiriladi (kitobdagi gotcha: *"partitioning'ni 'keyin qo'shamiz' deb emas, o'sish aniq jadvallar uchun oldindan o'ylang"* — chunki PK partition kalitini o'z ichiga olishi shart, bu FK dizayniga ta'sir qiladi).

Nomzodlar va chegara: satr soni **50 million**dan oshganda yoki jadval hajmi 50 GB dan oshganda:
- `attendance_logs` → `PARTITION BY RANGE (event_at)`, oylik;
- `audit_*` → oylik;
- `notifications` → oylik (eski oylarni `DROP TABLE` bilan bir zumda o'chirish — 14.3).

**Qabul mezoni:** `docs/partitioning-plan.md` da migratsiya ssenariysi (yangi partitsiyalangan jadval → ikki tomonlama yozuv → backfill → almashtirish) va avtomatik partitsiya yaratish jobi tayyor turadi.

## 6.3. Sharding

**Rejadan tashqarida.** Kitob 14.7: *"Ko'p loyihalar bu bosqichga hech qachon yetmaydi — va bu yaxshi."* yuton_school'da tabiiy shard kaliti `school_id` bo'lardi va u allaqachon multi-tenant sifatida ajratilgan — ya'ni kerak bo'lsa yo'l ochiq. Lekin hozir bunga o'tish — asossiz murakkablik.

---

# BOSQICH 7 — Backup, tiklanish va falokat

> Kitob 14.5: *"sinovdan o'tmagan backup — backup emas"*.

Bu — auditdagi eng katta hujjatlashtirilmagan bo'shliq.

## 7.1. Ikki qatlamli backup

1. **`pg_dump`** — kunlik mantiqiy nusxa (ko'chirish, versiya yangilash uchun);
2. **PITR** — `pg_basebackup` + uzluksiz WAL arxivi. Kitob 14.5: *"bugun 14:03 da xato migratsiya jadval o'chirdi → bazani 14:02 ga tiklaysiz"*.

Amaliy vosita: **pgBackRest** yoki **WAL-G**, S3/MinIO ga (loyihada MinIO allaqachon bor).

```
Saqlash siyosati:
  - to'liq nusxa: haftada 1
  - inkremental: kunlik
  - WAL arxivi: 14 kun
  - RPO (yo'qotish chegarasi): ≤ 1 daqiqa
  - RTO (tiklash vaqti): ≤ 30 daqiqa
```

## 7.2. Tiklashni mashq qilish (majburiy)

**Choraklik restore-drill:** alohida serverga oxirgi backup'dan tiklash + belgilangan vaqt nuqtasiga qaytarish + ma'lumot butunligini tekshirish (o'quvchilar soni, jami balans, oxirgi tranzaksiya vaqti).

**Qabul mezoni:** `docs/disaster-recovery.md` da protokol; birinchi drill o'tkazilib, natijasi (RTO/RPO real raqamlari bilan) yozilgan.

## 7.3. Autovacuum sozlash

Kitob 3.8: *"Autovacuum'ni o'chirish — juniorlarning klassik halokatli xatosi"*.

O'chirilmagan bo'lsa ham, sozlash kerak — ayniqsa yozuv og'ir jadvallar uchun:

```sql
ALTER TABLE attendance_logs SET (
  autovacuum_vacuum_scale_factor = 0.02,   -- standart 0.2 katta jadvalda juda kech
  autovacuum_analyze_scale_factor = 0.01
);
```

Monitoring: `pg_stat_user_tables` dagi `n_dead_tup`, `last_autovacuum`; bloat metrikasi + alert.

**Qabul mezoni:** `n_dead_tup / n_live_tup > 0.2` bo'lgan jadvallar uchun alert ishlaydi.

---

# BOSQICH 8 — Frontend (yuton_frontend)

Frontend ham "database'ni tushunish" nuqtai nazaridan qayta ko'riladi — kitobning ko'p qoidalari UI qarorlariga bevosita tegadi.

## 8.1. Keyset pagination UI

Backend'da keyset kiritilgan ro'yxatlar uchun (5.1) UI **"1 2 3 ... 4821"** sahifa raqamlaridan voz kechadi:

- **Cheksiz skroll** (mobil portal, notifikatsiyalar, davomat jurnali) — `useInfiniteQuery` + `getNextPageParam: (last) => last.nextCursor`;
- **"Keyingi / Oldingi"** tugmalari (jurnal va audit jadvallari);
- OFFSET qolgan admin jadvallarida sahifa raqamlari qoladi.

Kitob 12.3: *"'297-sahifaga sakrash' yo'q — faqat oldinga/orqaga"* — bu UI qaroriga aylanadi, texnik cheklov emas.

**Qabul mezoni:** cheksiz lenta 50 000 satrli jurnalda oxirigacha bir tekis skrol qiladi, sekinlashuvsiz.

## 8.2. React Query siyosati — bir joyda

Hozir `staleTime` fayllar bo'ylab qo'lda (`30_000`, `20_000`, `5 * 60_000`...). Buni **ma'lumot tabiatiga** qarab markazlashtirilgan siyosatga o'tkazish kerak — bu kitobning "replikatsiya lag" va "kesh — hujjatlashtirilgan majburiyat" g'oyalarining frontend aksi:

```ts
// lib/api/cache-policy.ts
export const CachePolicy = {
  // deyarli o'zgarmaydi: fanlar, sinflar, xonalar, rollar
  reference: { staleTime: 10 * 60_000, gcTime: 30 * 60_000 },
  // sekin o'zgaradi: o'quvchilar ro'yxati, xodimlar
  slow:      { staleTime: 60_000 },
  // tez o'zgaradi: davomat, balans, dashboard KPI
  live:      { staleTime: 10_000, refetchOnWindowFocus: true },
  // pul: hech qachon eski ko'rsatilmaydi
  money:     { staleTime: 0, refetchOnMount: 'always' },
} as const;
```

**Qabul mezoni:** barcha `useQuery` chaqiriqlari shu to'rt siyosatdan birini ishlatadi; qo'lda yozilgan `staleTime` qolmaydi.

## 8.3. Optimistik yangilanish va read-your-writes

Replica lag (6.1) frontend'ga "yangi yozganim ko'rinmayapti" bo'lib chiqadi. Ikki tomonlama himoya:

1. Mutatsiyadan keyin `invalidateQueries` **va** server javobidagi yangi ob'yekt bilan `setQueryData` (server javobi — primary'dan, ya'ni to'g'ri);
2. Pul va baho operatsiyalarida optimistik UI **ishlatilmaydi** — faqat server tasdig'idan keyin ko'rsatiladi (kitobning "haqiqat manbai" tamoyili).

**Qabul mezoni:** baho qo'yish / to'lov qabul qilishdan keyin ro'yxat darhol to'g'ri qiymatni ko'rsatadi (e2e test).

## 8.4. Og'ir ekranlarni server tomonga surish

Kitob 9-bob (GROUP BY, `FILTER`, `STRING_AGG`) va 12.2 (N+1) frontend qaroriga aylanadi: **agregatsiya clientda qilinmaydi**.

Tekshiriladigan joylar: dashboard KPI+delta hisoblari, chorak jadval ko'rinishi, reyting jadvallari, moliya yig'indilari. Agar frontend 4000 ta darsni yuklab olib `reduce` qilayotgan bo'lsa — bu backend so'rovi bo'lishi kerak (`COUNT(*) FILTER (WHERE ...)` bitta o'tishda).

**Qabul mezoni:** dashboard uchun tarmoqdan keladigan JSON hajmi < 100 KB; jadval ko'rinishida faqat ko'rinayotgan oy yuklanadi.

## 8.5. Eksport va uzoq operatsiyalar

`imports-exports` uchun: brauzer 30 sekund kutmasin — **job + polling/SSE** naqshi (backendda 5.3 dagi `SET LOCAL statement_timeout` va oqimli `COPY`/cursor bilan; kitob 12.3: `DECLARE CURSOR` — "million satrni fayl qilib eksport qilishda xotirani asrash uchun").

**Qabul mezoni:** 100 000 satrli eksport brauzerni bloklamaydi va serverda xotira toshirmaydi.

---

# Bajarish tartibi va bog'liqliklar

```
1. O'lchov qatlami          ← boshqa hammasi shunga tayanadi, birinchi
   ├── pg_stat_statements
   ├── slow query log
   ├── query/request metrikasi (N+1 detektori)
   └── indeks salomatligi hisoboti

2. Ulanish va operatsion xavfsizlik   ← arzon, xavfsiz, katta ta'sir
   ├── pool + statement_timeout + idle_in_transaction_timeout
   ├── migratsiya qoidalari (CONCURRENTLY, lock_timeout)
   └── PgBouncer (instanslar 3+ bo'lganda)

3. ID arxitekturasi (UUIDv7)          ← 2 dan keyin, migratsiya qoidalari bilan
                                        (2 dagi CONCURRENTLY intizomiga tayanadi)

4. Butunlik va parallellik            ← eng yuqori qiymat; 1 ning o'lchovi bilan
   ├── atomar UPDATE (qoldiqlar)
   ├── outbox + SKIP LOCKED
   ├── retry wrapper
   ├── idempotency (moliya)
   ├── ledger + sverka
   └── constraintlar (EXCLUDE, partial unique)

5. So'rov performansi                 ← 1 ning top-20 ro'yxatiga qarab
   ├── keyset pagination + kompozit indekslar
   ├── N+1 tuzatishlari
   ├── EXPLAIN sikli
   └── indeks tozalash

6. Masshtab                           ← faqat 5 tugagach
   ├── replica siyosati + lag himoyasi
   └── partitioning rejasi (kutish rejimida)

7. Backup / DR                        ← 2 bilan parallel boshlansa ham bo'ladi
   ├── PITR
   ├── restore-drill
   └── autovacuum sozlash

8. Frontend                           ← 5.1 (keyset) tugagach boshlanadi
   ├── keyset UI
   ├── cache siyosati
   ├── read-your-writes
   └── agregatsiyani serverga surish
```

**Parallel ketishi mumkin:** 1+2+7 (infratuzilma) va 4 (butunlik) — bir-biriga xalaqit bermaydi. 3 (UUIDv7) 2 tugagach. 8 (frontend) 5.1 dan keyin.

---

# Yakuniy tekshiruv ro'yxati (senior darajaning o'lchovi)

Kitobning yakunidagi tavsiyalar — loyihaning doimiy odatiga aylantiriladi:

- [ ] `EXPLAIN (ANALYZE, BUFFERS)` — har yangi og'ir so'rov uchun majburiy, PR'da plan ko'rsatiladi
- [ ] `pg_stat_statements` — haftada bir marta ko'riladi, top-10 qaraladi
- [ ] Restore mashqi — kamida choraklik, natijasi hujjatlashtiriladi
- [ ] Har FK ustunida indeks bor (avtomatik tekshiruv CI'da)
- [ ] Pul — `numeric`, hech qachon float ✅ (allaqachon shunday)
- [ ] Vaqt — `timestamptz`, ilova ichida UTC ✅ (allaqachon shunday)
- [ ] Qoldiq bor joyda — append-only jurnal + keshlangan yig'indi + sverka
- [ ] Tashqi chaqiriq hech qachon tranzaksiya ichida emas
- [ ] Har tashqi kirish nuqtasida idempotency kaliti
- [ ] Chuqur ro'yxatlar — keyset, OFFSET emas
- [ ] Migratsiyalar — `CONCURRENTLY` + `lock_timeout`, peak vaqtda emas
- [ ] Yangi id'lar — UUIDv7 (vaqt bo'yicha monoton)
- [ ] Baza darajasida taqiqlanishi mumkin bo'lgan qoida — baza darajasida taqiqlanadi

---

*Reja manbasi: "PostgreSQL: Baytlardan Senior Darajagacha" (Ixlosbek Erkinov uchun tayyorlandi, 2026) + yuton_school kod bazasining 2026-07-22 dagi auditi.*
