# O'qituvchi modelini birlashtirish — to'liq reja (backend + frontend)

**Sana:** 2026-07-22
**Qamrov:** (4) Teacher↔Subject UI ulanmagan; (5) o'qituvchi modeli `User` va `hr_teachers` orasida bo'lingan.
**Metodologiya:** *PostgreSQL — Baytlardan Senior Darajagacha* (15.7 FK xaritasi, 14.1 normalizatsiya, 12.1–12.2 EXPLAIN/N+1, 11.x tranzaksiyalar, 10.x indekslar).

---

## 0. O'lchov — taxmin emas, haqiqat

Kitobning 12-bobidagi birinchi qoida: *"taxmin qilmang, o'lchang"*. Reja yozishdan oldin jonli bazadan olingan raqamlar:

| Nima | Qiymat | Ma'nosi |
|---|---|---|
| `hr_teachers` (faol) | **14** | Migratsiya hajmi kichik — bu bizning eng katta imkoniyatimiz |
| **`user_id IS NULL` bo'lgan o'qituvchilar** | **14 / 14** | **Hech bir o'qituvchining login akkaunti yo'q** |
| `lms_lesson_schedules` | 9 304 (4 087 ta `teacher_id` to'lgan) | Allaqachon `hr_teachers` FK'sida ✅ |
| `courses.teacher_id` | 3 → **hammasi `users`ga** | 0 tasi `hr_teachers`ga mos kelmaydi |
| `teacher_salaries.teacher_id` | 14 → **hammasi `users`ga** | 0 tasi `hr_teachers`ga mos kelmaydi |
| `timetable_slots.teacher_id` | 387 → **386 `hr_teachers` + 1 `users`** | ⚠️ **Aralash ma'lumot, FK yo'q** |
| `lms_exams` | 1 | Amalda bo'sh |
| `hr_teacher_subjects` | 35 (26 fan, 14 o'qituvchi) | Junction to'g'ri qurilgan |

### 0.1. O'lchovdan kelib chiqqan uchta xulosa

**(a) Bu nazariy texnik qarz emas — jonli buzilgan funksiya.**
`exam.service.ts:91-108` imtihon uchun o'qituvchilar ro'yxatini `lesson.teacher.staffMember.user` orqali quradi. 14 o'qituvchining hech birida `user` yo'q → **bu endpoint hech qachon hech kimni qaytarmaydi**. Testlar buni ushlamagan, chunki mock'da `user` bor.

`schedule.service.ts:891 hrTeacherIdByUserId()` ham xuddi shunday — `staffMember.userId` bo'yicha qidiradi, doim `null` qaytaradi. Ya'ni "kursdan o'qituvchini olish" mantiqi **amalda o'lik kod**.

**(b) `timetable_slots` — vaqt bombasi.**
387 satrda ikki xil olamdan kelgan UUID aralash yotibdi (386 Teacher + 1 User). FK yo'qligi uchun baza buni to'xtatmagan. Kitob 15.7: *"FK'siz type+id — faqat butunlikni ilova o'zi kafolatlay oladigan, ongli qabul qilingan holatda (va bu kamdan-kam oqlanadi)"*. Bu yerda ongli qaror emas — bu nazoratsizlik.

**(c) Migratsiya oynasi hozir ochiq.**
14 + 3 + 387 + 1 satr. Bir yildan keyin bu 500 o'qituvchi va yuz minglab satr bo'ladi. Kitob 15-bob kirishi: *"id'lar URL'larga, loglarga, integratsiyalarga tarqab ketadi va keyin tipini almashtirish deyarli imkonsiz"*. **Bu ishni hozir qilish kerak.**

---

## 1. Arxitektura qarori

### 1.1. Muammoning ildizi

Hozir "o'qituvchi" degan tushuncha uch joyda yashaydi:

```
                    ┌──────────────┐
                    │    users     │  ← login akkaunti (autentifikatsiya)
                    └──────┬───────┘
                           │ user_id (nullable)
                    ┌──────▼──────────────┐
                    │  hr_staff_members   │  ← SHAXS (ism, PINFL, telefon)
                    └──────┬──────────────┘
                           │ staff_member_id (NOT NULL, UNIQUE)
                    ┌──────▼──────────────┐
                    │    hr_teachers      │  ← O'QITUVCHILIK ROLI
                    └─────────────────────┘
```

Bu iyerarxiya **to'g'ri** va kitobning 14.1 normalizatsiya qoidasiga mos: har fakt o'z egasining jadvalida. Muammo iyerarxiyada emas — **iste'molchilarning qaysi qavatga ishora qilishida**:

| Jadval | Hozir kimga ishora qiladi | Kerak |
|---|---|---|
| `lms_lesson_schedules.teacher_id` | `hr_teachers` ✅ | `hr_teachers` |
| `hr_class_leader_assignments.teacher_id` | `hr_teachers` ✅ | `hr_teachers` |
| `courses.teacher_id` | `users` ❌ | `hr_teachers` |
| `lms_exams.teacher_id` | `users` ❌ | `hr_teachers` |
| `teacher_salaries.teacher_id` | `users` ❌ | `hr_teachers` |
| `teacher_lesson_rates.teacher_id` | `users` ❌ | `hr_teachers` |
| `timetable_slots.teacher_id` | **FK yo'q, aralash** ❌ | `hr_teachers` |
| `timetable_substitutions.*_teacher_id` | **FK yo'q** ❌ | `hr_teachers` |
| `class_sessions.teacher_id` | **FK yo'q** ❌ | `hr_teachers` |
| `homework_assignments.teacher_id` | **FK yo'q** ❌ | `hr_teachers` |

### 1.2. Qaror: yagona haqiqat manbai — `hr_teachers`

**Qoida:** *"Dars beradigan odam" degan ma'nodagi har qanday `teacher_id` — `hr_teachers.id` ga FK bilan bog'lanadi. `users` ga faqat "kim tizimga kirdi / kim yozdi" degan ma'nodagi ustunlar bog'lanadi (`created_by`, `confirmed_by`).*

Nega `users` emas, `hr_teachers`?

1. **Login akkaunti o'qituvchilikning sharti emas.** O'lchov buni isbotladi: 14/14 o'qituvchi login-siz. Soatbay o'qituvchi hech qachon tizimga kirmasligi mumkin, lekin uning darsi, oyligi va fani bor.
2. **Kitob 15.1:** *"natural qiymatlar o'zgaradi... PK — har doim surrogate"*. `users` bu yerda amalda **natural key rolini o'ynayapti** ("o'qituvchi = kim login qiladi"), va bu qoida allaqachon buzildi.
3. **FK butunligi.** `hr_teachers` ga bog'lansa, baza "o'qituvchi bo'lmagan odamni darsga qo'yish"ni **fizik jihatdan taqiqlaydi**. Hozir `courses.teacher_id` ga istalgan `users` satri — o'quvchi, ota-ona, admin — yozilishi mumkin va baza qarshilik ko'rsatmaydi.

### 1.3. ID strategiyasi bo'yicha eslatma (kitob 15.5)

Loyihada hamma joyda `uuid` PK (`UuidAuditEntity`) va FK'lar ham `uuid`. Kitob "ichkarida BIGINT, tashqarida UUID" naqshini afzal ko'radi, lekin:

- 162 entity, 90 migratsiya — PK tipini almashtirish bu loyihada **imkonsiz va oqlanmagan**;
- ko'p-maktabli (multi-tenant) tizim uchun UUID PK 15.5 da sanab o'tilgan "sof UUID to'g'riroq" holatlarga mos (mustaqil bazalarni birlashtirish ehtimoli);
- IDOR himoyasi allaqachon UUID bilan ta'minlangan (15.6).

**Qaror: PK strategiyasi o'zgarmaydi.** Lekin kitobning bitta amaliy maslahatini qabul qilamiz: yangi katta jadvallarda `gen_random_uuid()` (v4) o'rniga **UUIDv7** ga o'tish — 15.4 dagi B-tree bloat muammosi uchun. Bu alohida ish (rejadan tashqari, D-bosqichda eslatma sifatida).

---

## 2. A-YO'NALISH — Teacher ↔ Subject UI (4-band)

Backend tayyor, frontend ulanmagan. Lekin backendda ham ikkita nuqson topildi — avval ularni tuzatamiz.

### A0. Backend nuqsonlarini tuzatish (avval!)

**A0.1 — Cross-tenant teshigi.** `teacher.service.ts:297-301`:

```ts
private async resolveSubjects(subjectIds?: string[]): Promise<Subject[] | undefined> {
  if (subjectIds === undefined) return undefined;
  const ids = Array.from(new Set(subjectIds));
  const found = await this.subjects.find({ where: { id: In(ids) } });   // ⚠️ tenant scope YO'Q
```

`subjects` jadvalida `school_id`/`filial_id` bor, lekin bu so'rov ularni tekshirmaydi → **A maktabining admini o'z o'qituvchisiga B maktabining fanini biriktira oladi**. Tuzatish:

```ts
const found = await this.subjects.find({
  where: tenantWhere<Subject>(this.tenant, { id: In(ids) }, { branch: true }),
});
if (found.length !== ids.length) {
  throw new NotFoundException('Ba\'zi fanlar topilmadi yoki ushbu maktabga tegishli emas.');
}
```

*Test:* `test/hr-teacher.service.spec.ts` ga "boshqa maktab fani → 404" keysi.

**A0.2 — Pagination + ManyToMany JOIN.** `teacher.service.ts:85-115` da `leftJoinAndSelect('t.subjects')` + `skip/take` + `orderBy('sm.lastName')` birga ishlatilgan. Bu — `[[typeorm-paginated-join-orderby]]` xotirasidagi tuzoqning aynan o'zi va kitobning 8-bob JOIN kardinallik masalasi: bitta o'qituvchi 3 fanga ega bo'lsa, JOIN natijasida 3 satr chiqadi.

TypeORM `take` bilan buni distinct-subquery'ga aylantiradi, lekin `getManyAndCount()` ning `count` qismi va `ORDER BY` ning subquery ichiga tushishi versiyaga bog'liq — bu **jimgina noto'g'ri sahifalash** beradi.

Tuzatish (kitob 12.2 dagi "ikki so'rov" taktikasi):

```ts
// 1-so'rov: sahifadagi o'qituvchilar (subjects JOIN'siz — kardinallik toza)
const [items, total] = await qb
  .orderBy('sm.lastName', 'ASC').addOrderBy('sm.firstName', 'ASC')
  .skip((page - 1) * limit).take(limit)
  .getManyAndCount();

// 2-so'rov: faqat shu sahifaning fanlari, bitta IN bilan
if (items.length) {
  const withSubjects = await this.teachers.find({
    where: { id: In(items.map((t) => t.id)) },
    relations: { subjects: true },
  });
  const byId = new Map(withSubjects.map((t) => [t.id, t.subjects ?? []]));
  for (const t of items) t.subjects = byId.get(t.id) ?? [];
}
```

*Qabul mezoni:* `EXPLAIN ANALYZE` da `Rows Removed by Filter` va real satr soni sahifa hajmiga teng; 3 fanli o'qituvchi ro'yxatda 1 marta chiqadi.

**A0.3 — `subjectId` bo'yicha filtr (yangi imkoniyat).** Junction jadvalda teskari indeks (`idx_hr_teacher_subjects_subject`) allaqachon bor (kitob 15.7 tavsiyasi bajarilgan) — undan foydalanmayapmiz. `TeacherQueryDto` ga `subjectId?: string` qo'shamiz:

```ts
if (query.subjectId) {
  qb.andWhere(
    'EXISTS (SELECT 1 FROM hr_teacher_subjects ts WHERE ts.teacher_id = t.id AND ts.subject_id = :sid)',
    { sid: query.subjectId },
  );
}
```

`EXISTS` — `JOIN` emas: kardinallikni buzmaydi va teskari indeksdan to'g'ridan-to'g'ri foydalanadi. Bu "matematika o'qituvchilarini ko'rsat" degan real ehtiyoj va B-yo'nalishda dars jadvali uchun ham kerak bo'ladi.

### A1. Frontend — API qatlami

**Fayl:** `yuton_frontend/src/lib/api/hr-teachers.ts`

```ts
export interface TeacherSubjectRef {
  id: string;
  name: LocalizedText;      // lib/api/subjects.ts dagi tip bilan bir xil
}

export interface Teacher {
  // ... mavjud maydonlar
  subjects: TeacherSubjectRef[];        // qo'shiladi
}

export interface TeacherInput {
  // ... mavjud maydonlar
  subjectIds?: string[];                // qo'shiladi
}

export interface TeacherListParams {
  // ... mavjud
  subjectId?: string;                   // A0.3 filtri
}
```

*Diqqat:* `cleanParams` massivni qo'llamaydi (`Record<string, string|number>`) — `subjectIds` faqat `body`da ketadi, `query`da emas. Filtr uchun bitta `subjectId` (skalyar) yetarli.

### A2. Frontend — `MultiSelect` komponenti

`src/components/ui/` da multi-select yo'q (faqat `select.tsx`). Yangi: **`src/components/ui/multi-select.tsx`**

Talablar:
- Tanlanganlar chip (badge) ko'rinishida, har birida ✕;
- Qidiruv inputi (26 fan — hozircha oz, lekin filial ko'payganda o'sadi);
- Klaviatura: ↑↓ navigatsiya, Enter tanlash, Backspace oxirgi chipni o'chirish, Esc yopish;
- A11y: `role="combobox"`, `aria-expanded`, `aria-multiselectable`, `aria-activedescendant`;
- Boshqariladigan (controlled): `value: string[]`, `onChange(next: string[])`;
- `maxVisible` — 3 tadan ortiq chip bo'lsa "+N".

Mavjud `select.tsx` va `drawer.tsx` uslubiga to'liq mos (Tailwind sinflari, dark mode) bo'lishi shart.

*Test:* `src/components/ui/multi-select.test.tsx` — tanlash/o'chirish/qidiruv/klaviatura (vitest + testing-library, loyihadagi 42 test faylining uslubida).

### A3. Frontend — o'qituvchi formasi

**Fayl:** `src/components/hr/teacher-form-drawer.tsx`

- `useSubjectList()` (mavjud `lib/api/subjects.ts`) bilan fanlar ro'yxati;
- "Mutaxassislik fanlari" maydoni — `MultiSelect`, "Ish ma'lumotlari" bo'limida, `isSubjectTeacher` switch'i yonida;
- **Shartli ko'rinish:** `isSubjectTeacher = false` bo'lsa maydon disabled + tushuntirish matni ("Fan o'qituvchisi belgilanmagan");
- Tahrirda: `teacher.subjects.map(s => s.id)` → boshlang'ich qiymat;
- Saqlashda: `subjectIds` faqat **o'zgargan bo'lsa** yuboriladi (backend `undefined` → tegilmaydi semantikasini qo'llaydi — bu muhim, aks holda har PATCH junction'ni qayta yozadi).

### A4. Frontend — ro'yxat va profil

| Joy | O'zgarish |
|---|---|
| `hr/teachers/page.tsx` | Yangi "Fanlar" ustuni (chip'lar, 2 tadan ortiq → "+N"); yuqorida fan bo'yicha filtr `Select` (A0.3) |
| `hr/employees/[id]/page.tsx` | O'qituvchi tabida fanlar ro'yxati (faqat o'qish) |
| `lib/i18n/dictionary.ts` | `teachers.subjects`, `teachers.subjectsPlaceholder`, `teachers.filterBySubject`, `teachers.noSubjects` — **uz + ru** |

### A5. A-yo'nalish qabul mezonlari

- [ ] Yangi o'qituvchiga 3 fan biriktirildi → ro'yxatda, profilda, `GET /hr/teachers/:id` da ko'rinadi;
- [ ] Fan olib tashlandi → junction'dan o'chdi (`SELECT count(*) FROM hr_teacher_subjects`);
- [ ] Boshqa maktab fani id'si bilan `POST` → **404** (A0.1);
- [ ] 3 fanli o'qituvchi ro'yxatda **1 marta**, `meta.total` to'g'ri (A0.2);
- [ ] Fan bo'yicha filtr `EXPLAIN`da `idx_hr_teacher_subjects_subject` ishlatadi;
- [ ] Backend testlar + yangi frontend testlar yashil; `tsc` va `lint` toza.

---

## 3. B-YO'NALISH — Teacher modelini birlashtirish (5-band)

Kitobning **Expand → Migrate → Contract** intizomi (loyihada `teacher-staffmember-refactor` da allaqachon muvaffaqiyatli qo'llanilgan). Har bosqich alohida deploy bo'ladigan va orqaga mos.

### B0. Poydevor: `user_id` masalasini hal qilish

**Bu bosqich hamma narsadan oldin turadi.** 14/14 o'qituvchida `user_id` yo'q ekan, "User orqali xaritalash" mantiqi qayta tiklanmaydi — **o'chiriladi**. Lekin avval qaror kerak:

> **Ochiq savol (sizga):** o'qituvchilarga login akkaunti kerakmi?
> - **Kerak bo'lsa** — bu alohida ish (o'qituvchi kabineti, jurnal to'ldirish). B-yo'nalish bunga bog'liq emas: `staff_members.user_id` bog'lanish sifatida qoladi, lekin **hech qanday domen mantig'i unga tayanmaydi**.
> - **Kerak bo'lmasa** — hech narsa o'zgarmaydi, `user_id` shunchaki ixtiyoriy qoladi.
>
> Reja ikkala javobda ham bir xil ishlaydi — shuning uchun bu **bloklovchi savol emas**.

**B0 ishlari:**
1. `schedule.service.ts:891 hrTeacherIdByUserId()` — **o'chiriladi** (o'lik kod, doim `null`);
2. `exam.service.ts:91-108` — `staffMember.user` orqali qurilgan ro'yxat **to'g'ridan-to'g'ri `Teacher`dan** quriladi (buzilgan endpoint tuzaladi);
3. `test/lms-schedule.service.spec.ts` va `test/lms-exam.service.spec.ts` mock'lari real holatga moslanadi — **mock'da `user` bo'lgani uchun bug yashiringan edi**, endi mock `user: null` bo'lgan keysni ham qamraydi.

**Bu bosqichning qiymati:** hech qanday migratsiyasiz, faqat kod bilan **ikkita jonli bug tuzaladi**.

### B1. Expand — yangi ustunlar (orqaga to'liq mos)

**Migratsiya:** `1789800000000-TeacherFkExpand.ts`

Har bir muammoli jadvalga `hr_teacher_id` **nullable** ustun qo'shamiz. Eski `teacher_id` tegilmaydi — shuning uchun bu deploy hech narsani buzmaydi.

```sql
-- courses
ALTER TABLE "courses" ADD COLUMN "hr_teacher_id" uuid NULL;
ALTER TABLE "courses" ADD CONSTRAINT "fk_courses_hr_teacher"
  FOREIGN KEY ("hr_teacher_id") REFERENCES "hr_teachers"("id") ON DELETE RESTRICT;
CREATE INDEX "idx_courses_hr_teacher" ON "courses" ("hr_teacher_id");
```

`ON DELETE` semantikasi — kitob 15.7 jadvali bo'yicha ongli tanlov:

| Jadval | ON DELETE | Sabab |
|---|---|---|
| `courses` | **RESTRICT** | Kursi bor o'qituvchini o'chirib bo'lmasin — kurs egasiz qolmaydi |
| `lms_exams` | **SET NULL** | Imtihon tarixiy yozuv, o'qituvchisiz ham ma'noli |
| `teacher_salaries` | **RESTRICT** | Moliyaviy yozuv — hech qachon yetim qolmasin |
| `teacher_lesson_rates` | **RESTRICT** | Stavka — moliyaviy |
| `timetable_slots` | **CASCADE** | Slot o'qituvchisiz ma'nosiz |
| `timetable_substitutions` | **SET NULL** | Almashtirish tarixi saqlansin |
| `class_sessions` | **RESTRICT** | Davomat yozuvi — tarixiy dalil |
| `homework_assignments` | **SET NULL** | Vazifa o'qituvchisiz ham qoladi |

**Har FK ustuniga indeks majburiy** (kitob 6.2 va 15.7: *"PostgreSQL o'zi qo'ymaydi!"*) — usiz JOIN ham, ota satrni `DELETE` qilish ham (bolalarni Seq Scan bilan qidiradi) sekin.

**Lock haqida (kitob 11.4):** `ADD COLUMN ... NULL` PostgreSQL 11+ da `DEFAULT`siz — bir zumda, jadval qayta yozilmaydi. Lekin `ADD CONSTRAINT FOREIGN KEY` butun jadvalni tekshiradi va `SHARE ROW EXCLUSIVE` lock oladi. Kichik jadvallarda (387 satr) bu millisekundlar. **Kelajakda katta jadval uchun:** `ADD CONSTRAINT ... NOT VALID` → keyin `VALIDATE CONSTRAINT` (bu ikkinchisi faqat `SHARE UPDATE EXCLUSIVE` oladi, yozuvni bloklamaydi).

### B2. Migrate — ma'lumotni ko'chirish

**Migratsiya:** `1789900000000-TeacherFkBackfill.ts`

Ikki xil manba, ikki xil strategiya:

**(a) `users` ga bog'langanlar** (`courses` 3, `teacher_salaries` 14, `teacher_lesson_rates` 1) — `staff_members.user_id` orqali:

```sql
UPDATE "courses" c
SET "hr_teacher_id" = t."id"
FROM "hr_teachers" t
JOIN "hr_staff_members" sm ON sm."id" = t."staff_member_id"
WHERE sm."user_id" = c."teacher_id"
  AND t."deleted_at" IS NULL;
```

⚠️ **O'lchov shuni ko'rsatadiki, bu 0 satr ko'chiradi** — chunki hech bir o'qituvchida `user_id` yo'q. Shuning uchun **ikkinchi bosqich shart**: ism bo'yicha moslashtirish emas (xavfli), balki **qo'lda xaritalash jadvali**:

```sql
-- Ko'chirib bo'lmaganlarni hisobotga chiqarish (migratsiya YIQILMAYDI, RAISE NOTICE)
DO $$
DECLARE orphans int;
BEGIN
  SELECT count(*) INTO orphans FROM "courses"
   WHERE "teacher_id" IS NOT NULL AND "hr_teacher_id" IS NULL;
  IF orphans > 0 THEN
    RAISE NOTICE 'courses: % ta satr xaritalanmadi — qo''lda hal qilinadi', orphans;
  END IF;
END $$;
```

3 ta kurs va 14 ta oylik uchun **qo'lda xaritalash** — eng xavfsiz yo'l. Buning uchun **`scripts/map-teacher-fk.mjs`** yoziladi: xaritalanmagan satrlarni ko'rsatadi, admin har biriga o'qituvchini tanlaydi, skript `UPDATE` qiladi. Idempotent, `--dry-run` bilan.

**(b) `timetable_slots` — aralash ma'lumot** (386 Teacher + 1 User):

```sql
-- To'g'ridan-to'g'ri mos kelganlar (386)
UPDATE "timetable_slots" s
SET "hr_teacher_id" = s."teacher_id"
WHERE EXISTS (SELECT 1 FROM "hr_teachers" t
              WHERE t."id" = s."teacher_id" AND t."deleted_at" IS NULL);

-- users orqali kelganlar (1)
UPDATE "timetable_slots" s
SET "hr_teacher_id" = t."id"
FROM "hr_teachers" t
JOIN "hr_staff_members" sm ON sm."id" = t."staff_member_id"
WHERE sm."user_id" = s."teacher_id" AND s."hr_teacher_id" IS NULL;
```

**Tranzaksiya (kitob 11.1):** TypeORM migratsiyasi butun `up()` ni bitta tranzaksiyada bajaradi — atomiklik kafolatlangan, yarim ko'chirilgan holat bo'lmaydi.

**Ko'chirishdan keyin `ANALYZE`** (kitob 12.4): ommaviy `UPDATE` dan keyin statistika eskiradi va planner ko'r bo'lib qoladi:

```sql
ANALYZE "courses"; ANALYZE "timetable_slots"; ANALYZE "teacher_salaries";
```

### B3. Migrate — kod ikki ustunni ham qo'llaydi

Bu bosqichda **kod yangi ustunga yozadi, lekin eskisini ham to'ldiradi** (dual-write). Shunda rollback xavfsiz.

| Fayl | O'zgarish |
|---|---|
| `academic/entities/course.entity.ts` | `hrTeacherId` + `@ManyToOne(() => Teacher)`; eski `teacherId`/`teacher: User` **`@deprecated` izohi bilan qoladi** |
| `academic/course.service.ts` | Yozishda ikkalasi; o'qishda `hrTeacherId` ustunlik qiladi |
| `lms/exam.service.ts` | B0 da tuzatilgan kod endi `hr_teacher_id` ga o'tadi |
| `finance/salary.service.ts` | `teacher_salaries.hr_teacher_id` |
| `timetable/timetable.service.ts` | `hr_teacher_id`; **yangi FK butunlikni kafolatlaydi** |
| `attendance/*.service.ts` | `class_sessions.hr_teacher_id` |
| `homework/homework.service.ts` | `homework_assignments.hr_teacher_id` |

**DTO'lar:** API'da maydon nomi **`teacherId` bo'lib qoladi** (frontend buzilmaydi), lekin endi u `hr_teachers.id` qiymatini oladi. Bu — `teacher-staffmember-refactor` da `category` bilan qo'llanilgan va o'zini oqlagan naqsh.

⚠️ **Buzuvchi o'zgarish (breaking change):** `teacherId` ning **ma'nosi** o'zgaradi. Frontend eski `users` id'sini yuborsa → FK xatosi. Shuning uchun B3 va C1 (frontend) **bitta relizda** chiqadi.

### B4. Contract — eski ustunlarni olib tashlash

**Migratsiya:** `1790000000000-TeacherFkContract.ts`
**Shart:** B3 kamida bir hafta productionda muammosiz ishlagan bo'lsin.

```sql
-- 1) Yetim yo'qligini tasdiqlash (bo'lsa — migratsiya YIQILADI, bu ataylab)
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM "courses"
   WHERE "teacher_id" IS NOT NULL AND "hr_teacher_id" IS NULL;
  IF bad > 0 THEN
    RAISE EXCEPTION 'courses: % ta xaritalanmagan satr bor — contract to''xtatildi', bad;
  END IF;
END $$;

-- 2) Eski ustunni olib tashlash
ALTER TABLE "courses" DROP COLUMN "teacher_id";

-- 3) Yangi ustunni yakuniy nomga o'tkazish
ALTER TABLE "courses" RENAME COLUMN "hr_teacher_id" TO "teacher_id";

-- 4) Majburiylikni tiklash (courses.teacher_id avval NOT NULL edi)
ALTER TABLE "courses" ALTER COLUMN "teacher_id" SET NOT NULL;
```

`RENAME` — metama'lumot operatsiyasi, jadval qayta yozilmaydi (bir zumda). Indeks va constraint nomlari ham tozalanadi.

**`class_sessions`, `homework_assignments`, `timetable_*`** uchun `teacher_id` ustuni **saqlanadi**, lekin unga endi haqiqiy FK qo'shiladi — bu jadvallarda hech qachon FK bo'lmagan, shuning uchun `RENAME` shart emas, faqat:

```sql
ALTER TABLE "timetable_slots"
  ADD CONSTRAINT "fk_timetable_slots_teacher"
  FOREIGN KEY ("teacher_id") REFERENCES "hr_teachers"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "idx_timetable_slots_teacher" ON "timetable_slots" ("teacher_id");
```

### B5. `class_sessions` uchun kompozit indeks (kitob 10.4)

`class-session.entity.ts:18` da allaqachon `idx_class_sessions_teacher_date (teacher_id, date)` bor — bu **to'g'ri tartib**: kitob qoidasi *"tenglik ustunlari oldinga, diapazon/tartib ustunlari oxirga"*. `WHERE teacher_id = ? AND date BETWEEN ? AND ?` uchun ideal. Bu yerda o'zgarish shart emas — faqat FK qo'shilganda indeks saqlanib qolishini tekshirish.

`lms_lesson_schedules` uchun esa o'qituvchi kun agendasi so'rovi bor. Tekshirish kerak:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM lms_lesson_schedules
WHERE teacher_id = '...' AND lesson_date BETWEEN '2026-09-01' AND '2026-09-07';
```

`Seq Scan` chiqsa (9 304 satr — chiqishi mumkin) → `CREATE INDEX idx_lms_lessons_teacher_date ON lms_lesson_schedules (teacher_id, lesson_date) WHERE deleted_at IS NULL` (partial — kitob 10.4).

---

## 4. C-YO'NALISH — Frontend moslashuvi

### C1. O'qituvchi tanlash — yagona manba

Hozir frontendda "o'qituvchi tanlash" turli sahifalarda turlicha: qayerdadir `useUserList({role:'teacher'})`, qayerdadir `useTeacherList()`. B3 dan keyin **hammasi `useTeacherList()` ga o'tadi**.

**Yangi umumiy komponent:** `src/components/hr/teacher-select.tsx`
- `useTeacherList({ status: 'active', limit: 200 })`;
- ixtiyoriy `subjectId` prop → A0.3 filtri (kurs yaratishda "faqat shu fan o'qituvchilari");
- `value: string | null`, `onChange(id)`.

**Qo'llaniladigan joylar:** kurslar formasi, imtihon formasi, dars jadvali modali (`lesson-edit-modal.tsx`), oylik sahifasi, timetable, davomat.

Bu — **5-bandning frontend tomondagi ildiz yechimi**: "o'qituvchi kim" degan savolga butun UI'da bitta javob.

### C2. Ta'sirlangan sahifalar

| Sahifa | Ish |
|---|---|
| `academic/courses` (kurslar) | `TeacherSelect`; `teacherId` endi HR id |
| `academic/state-exam`, `progress-exams` | `TeacherSelect` |
| `academic/schedule/lesson-edit-modal.tsx` | Allaqachon HR id — tekshirish |
| `finance/salaries` | O'qituvchi ro'yxati manbasi |
| `attendance/teacher` | O'qituvchi filtri |
| `lib/api/*.ts` | `teacherId` tipidagi izohlar yangilanadi |

### C3. i18n

`dictionary.ts` ga (uz + ru): `common.teacherSelect`, `teachers.subjects`, `teachers.filterBySubject`, `errors.teacherNotFound`.

---

## 5. Bosqichlar, tartib va deploy

| # | Bosqich | Migratsiya | Deploy | Risk |
|---|---|---|---|---|
| **A0** | Backend nuqsonlar (tenant, pagination, filtr) | — | mustaqil | past |
| **A1–A5** | Subjects UI | — | mustaqil | past |
| **B0** | O'lik kod olib tashlash, 2 bug tuzatish | — | mustaqil | past |
| **B1** | Expand: `hr_teacher_id` + FK + indeks | `1789800000000` | mustaqil | past |
| **B2** | Backfill + qo'lda xaritalash skripti | `1789900000000` | mustaqil | **o'rta** |
| **B3+C1+C2** | Dual-write + frontend | — | **birga** | **yuqori** |
| **B4** | Contract: eski ustunlar DROP | `1790000000000` | ≥1 hafta keyin | o'rta |
| **B5** | Indeks auditi (EXPLAIN) | ehtimoliy | mustaqil | past |

### 5.1. Deploy intizomi

1. **Har migratsiyadan oldin `pg_dump`** (kitob 14.5). 90 migratsiyalik loyihada bu muzokara qilinmaydigan qoida.
2. **Migratsiya → keyin server** (`[[run-migrations-after-writing]]` va `session-security-plan` dagi tajriba: entity o'zgarganda watch-server migratsiyadan oldin qayta yuklansa boot yiqiladi).
3. **Peak vaqtda migratsiya yo'q** (kitob 11.4: *"Migratsiyani peak-vaqtda yurgizish — production'ni hech narsa qilmasdan yotqizishning klassik usuli"*).
4. **Har bosqichdan keyin:** `npm test` (684+), `npm run lint`, `npm run build`, frontend `vitest` + `tsc`.

### 5.2. Rollback rejasi

| Bosqich | Rollback |
|---|---|
| B1 | `down()` — ustun DROP, ma'lumot yo'qolmaydi |
| B2 | `down()` — `hr_teacher_id = NULL`, eski ustun tegilmagan ✅ |
| B3 | Kod rollback — dual-write tufayli eski ustun to'liq va to'g'ri ✅ |
| B4 | **Rollback yo'q** — `pg_dump`dan tiklash. Shuning uchun 1 hafta kutish shart |

---

## 6. Test strategiyasi

### 6.1. Backend (mavjud 684 ta ustiga)

| Fayl | Yangi keyslar |
|---|---|
| `test/hr-teacher.service.spec.ts` | Cross-tenant fan → 404; `subjectIds: []` → hammasi o'chadi; `undefined` → tegilmaydi; `subjectId` filtri |
| `test/lms-exam.service.spec.ts` | **`user: null` bo'lgan o'qituvchi ro'yxatda chiqadi** (B0 bug'i) |
| `test/lms-schedule.service.spec.ts` | `hrTeacherIdByUserId`siz kurs → o'qituvchi hal qilinishi |
| `test/academic-courses.service.spec.ts` | `teacherId` = HR id; noto'g'ri id → 404 |
| **`test/architecture/teacher-fk.spec.ts`** (yangi) | **Barcha `teacher_id` ustunlari `hr_teachers` ga FK bilan bog'langanligini entity metadata'sidan tekshiradi** — regressiyani abadiy to'xtatadi |

Oxirgisi eng qimmatli: loyihada allaqachon `test/architecture/entity-table-names.spec.ts` bor — shu naqshni davom ettiramiz.

### 6.2. Frontend

- `multi-select.test.tsx` — yangi komponent;
- `hr-teachers.test.ts` — `subjects`/`subjectIds` serializatsiyasi;
- `teacher-select.test.tsx` — yangi umumiy komponent.

### 6.3. Ma'lumot butunligi tekshiruvi (qo'lda, migratsiyadan keyin)

```sql
-- Hech bir teacher_id yetim qolmasligi kerak — hammasi 0 qaytarishi shart
SELECT 'courses' t, count(*) FROM courses c
  WHERE c.teacher_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM hr_teachers x WHERE x.id = c.teacher_id)
UNION ALL SELECT 'timetable_slots', count(*) FROM timetable_slots s
  WHERE s.teacher_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM hr_teachers x WHERE x.id = s.teacher_id)
UNION ALL SELECT 'teacher_salaries', count(*) FROM teacher_salaries q
  WHERE NOT EXISTS (SELECT 1 FROM hr_teachers x WHERE x.id = q.teacher_id);
```

B4 dan keyin FK'lar buni **fizik jihatdan imkonsiz** qiladi — bu so'rov shunchaki tasdiq.

---

## 7. Kitobdan olingan qoidalar — qayerda qo'llanildi

| Kitob | Qoida | Rejada |
|---|---|---|
| 6.2, 15.7 | Har FK ustuniga indeks — PostgreSQL o'zi qo'ymaydi | B1: har FK bilan birga `CREATE INDEX` |
| 15.7 | FK "ko'p" tomonda; N:M — kompozit PK + teskari indeks | `hr_teacher_subjects` allaqachon to'g'ri ✅ |
| 15.7 | `ON DELETE` ongli tanlov: RESTRICT/SET NULL/CASCADE | B1 jadvali — har biri sabab bilan |
| 15.7 | FK'siz `type+id` — kamdan-kam oqlanadi | `timetable_slots` aralash ma'lumoti — aynan shu kasal |
| 15.1 | PK surrogate, natural key UNIQUE | `users`ni "o'qituvchi kim" degan natural key sifatida ishlatish tugatiladi |
| 14.1 | Har fakt o'z egasining jadvalida | Shaxs → `staff_members`, rol → `hr_teachers`, login → `users` |
| 12.1 | EXPLAIN (ANALYZE, BUFFERS) bilan o'lchash | B5 indeks auditi |
| 12.2 | N+1 — JOIN yoki `IN (...)` bilan davolash | A0.2 ikki so'rovli sahifalash; `hrTeacherIdByUserId` o'chirilishi |
| 11.1 | Bog'liq amallar bitta tranzaksiyada | B2 migratsiya atomikligi |
| 11.4 | `ALTER TABLE` lock oladi; peak vaqtda migratsiya qilmang | 5.1 deploy intizomi; `NOT VALID` + `VALIDATE` naqshi |
| 10.4 | Kompozit: tenglik oldinga, diapazon oxirga; partial indeks | B5: `(teacher_id, lesson_date) WHERE deleted_at IS NULL` |
| 12.4 | Ommaviy `UPDATE` dan keyin `ANALYZE` | B2 oxiri |
| 14.5 | Backup — pg_dump/PITR | 5.1: har migratsiyadan oldin |
| 15.4 | UUIDv4 B-tree'ni shishiradi | D-eslatma: yangi jadvallar uchun UUIDv7 |

---

## 8. Qamrovdan tashqari (keyingi nomzodlar)

- **UUIDv7 ga o'tish** yangi katta jadvallarda (kitob 15.4) — `lms_lesson_schedules` yiliga ~40k satr o'sadi;
- **O'qituvchi kabineti** (login akkaunti) — B0 dagi ochiq savolga bog'liq;
- `lms_lesson_schedules` **partitioning** (kitob 14.3) — hozir 9 304 satr, kerak emas; 10M dan oshganda `PARTITION BY RANGE (lesson_date)`;
- Qolgan 31 modulning **granular ruxsatlari**.

---

## 9. Ochiq savollar

1. **O'qituvchilarga login akkaunti kerakmi?** (B0) — rejani bloklamaydi, lekin javob keyingi ishlar tartibini belgilaydi.
2. **`courses` (3 ta) va `teacher_salaries` (14 ta) qo'lda xaritalanishi** kerak — kim qaysi o'qituvchi ekanini siz tasdiqlashingiz kerak (B2). Skript ro'yxatni tayyorlab beradi.
3. **B4 (Contract) qachon?** Tavsiya: B3 productionda 1 hafta ishlagach.
