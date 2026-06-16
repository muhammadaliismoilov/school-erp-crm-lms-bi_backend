/** "Vazifa bo'yicha" filtri qiymatlari. */
export enum LeadTaskFilter {
  /** Ochiq (bajarilmagan) vazifasi bor lidlar. */
  HAS_OPEN = 'has_open',
  /** Muddati o'tgan ochiq vazifasi bor lidlar. */
  OVERDUE = 'overdue',
  /** Umuman vazifasi yo'q lidlar. */
  NONE = 'none',
}
