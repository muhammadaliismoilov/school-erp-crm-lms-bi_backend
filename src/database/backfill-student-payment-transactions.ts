import "reflect-metadata";
import "dotenv/config";
import dataSource from "./data-source";
import { FinanceTransaction } from "../modules/finance/entities/transaction.entity";
import { StudentPayment } from "../modules/student-payments/entities/student-payment.entity";

/** Moliya defteridagi o'quvchi-to'lov proyeksiyasining manba belgisi. */
const TX_SOURCE = "student_payment";

/**
 * Idempotent backfill — `npm run backfill:student-payments` orqali ishga tushadi.
 *
 * `StudentPaymentsService.syncFinanceTransaction` mexanizmi qo'shilishidan OLDIN
 * yaratilgan o'quvchi to'lovlari uchun `transactions` jadvalida `income`
 * proyeksiyasi bo'lmaydi — natijada umumiy balans noto'g'ri chiqadi. Bu skript
 * shunday "yetim" to'lovlarni topib, har biri uchun bitta moliya yozuvi yaratadi.
 *
 * Qayta-qayta ishga tushirish xavfsiz: proyeksiyasi bor to'lovlar o'tkazib
 * yuboriladi (sourceType+sourceId bo'yicha tekshiriladi). Faqat to'langan summa
 * 0 dan katta va o'chirilmagan to'lovlar hisobga olinadi.
 */
async function backfill(): Promise<void> {
  await dataSource.initialize();

  let created = 0;
  let skippedExisting = 0;
  let skippedZero = 0;

  try {
    const payments = await dataSource.getRepository(StudentPayment).find();
    const txRepo = dataSource.getRepository(FinanceTransaction);

    for (const payment of payments) {
      const amount = Number(payment.amount) || 0;
      if (amount <= 0) {
        skippedZero += 1;
        continue;
      }

      const existing = await txRepo.findOne({
        where: { sourceType: TX_SOURCE, sourceId: payment.id },
        withDeleted: true,
      });
      if (existing) {
        skippedExisting += 1;
        continue;
      }

      await txRepo.save(
        txRepo.create({
          sourceType: TX_SOURCE,
          sourceId: payment.id,
          type: "income",
          amount,
          date: payment.paymentDate,
          paymentTypeId: payment.paymentTypeId ?? null,
          personId: payment.studentId ?? null,
          personName: payment.studentName,
          personRole: "student",
          studentId: payment.studentId ?? null,
          classId: payment.classId ?? null,
          month: payment.month,
          year: payment.year,
          note: `O'quvchi to'lovi — ${payment.receiptNumber}`,
        }),
      );
      created += 1;
      // eslint-disable-next-line no-console
      console.log(`  + ${payment.receiptNumber} — ${payment.studentName} — ${amount}`);
    }

    // eslint-disable-next-line no-console
    console.log(
      `\nBackfill tugadi: ${created} ta yangi proyeksiya, ` +
        `${skippedExisting} ta allaqachon mavjud, ${skippedZero} ta nol/pending o'tkazildi.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

backfill().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Backfill xatosi:", error);
  process.exit(1);
});
