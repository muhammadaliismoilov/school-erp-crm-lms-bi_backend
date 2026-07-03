/** Xabar yetkazish kanali. */
export enum NotificationChannelType {
  TELEGRAM = 'telegram',
  PUSH = 'push',
}

/** Outbox yozuvining holati. */
export enum NotificationStatus {
  /** Yuborilishni kutmoqda (yoki tinch soatlarda rejalashtirilgan). */
  PENDING = 'pending',
  /** Muvaffaqiyatli yuborildi. */
  SENT = 'sent',
  /** Barcha urinishlardan keyin yuborilmadi. */
  FAILED = 'failed',
  /** Yubormaslik kerak edi (kanal yo'q / o'chirilgan / sozlama). */
  SKIPPED = 'skipped',
}

/** Xabar toifasi (davomat hodisalari). */
export enum NotificationCategory {
  SCHOOL_ENTRY = 'school_entry',
  SCHOOL_EXIT = 'school_exit',
  SESSION_PRESENT = 'session_present',
  SESSION_LATE = 'session_late',
  SESSION_ABSENT = 'session_absent',
  SESSION_LEFT_EARLY = 'session_left_early',
}
