/** Dars/kurs sessiyasining hayot sikli. */
export enum SessionStatus {
  /** Rejalashtirilgan, hali ochilmagan. */
  SCHEDULED = 'scheduled',
  /** O'qituvchi ochgan — davomat kiritilmoqda (avtomatik oldindan to'ldirilgan). */
  OPEN = 'open',
  /** O'qituvchi tasdiqlagan. */
  CONFIRMED = 'confirmed',
  /** Bekor qilingan (dars bo'lmadi). */
  CANCELLED = 'cancelled',
}
