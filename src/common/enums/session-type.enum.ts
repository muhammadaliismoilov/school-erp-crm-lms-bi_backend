/**
 * Mashg'ulot turi. Majburiy dars ham, qo'shimcha kurs/to'garak ham bitta
 * davomat modeli orqali ishlanadi — faqat shu tur bilan ajratiladi.
 */
export enum SessionType {
  /** Majburiy o'quv dars (asosiy jadval). */
  LESSON = 'lesson',
  /** Qo'shimcha kurs / to'garak (dars soatidan tashqari). */
  COURSE = 'course',
}
