export enum EmploymentStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  DISMISSED = 'dismissed',
}

/**
 * O'qituvchining malaka toifasi (past→yuqori). Har bir toifa rasmiy lavozim
 * nomiga mos keladi:
 *   mutaxassis → O'qituvchi, ikkinchi → Katta o'qituvchi,
 *   birinchi → Yetakchi o'qituvchi, oliy → Bosh o'qituvchi.
 * Toifa attestatsiya orqali beriladi.
 */
export enum QualificationCategory {
  MUTAXASSIS = 'mutaxassis',
  IKKINCHI = 'ikkinchi',
  BIRINCHI = 'birinchi',
  OLIY = 'oliy',
}

/** Xodim yutug'i kategoriyasi (Akademik / Olimpiada / Sport / San'at / Jamiyat / Ishtirok). */
export enum StaffAchievementCategory {
  ACADEMIC = 'academic',
  OLYMPIAD = 'olympiad',
  SPORT = 'sport',
  ART = 'art',
  COMMUNITY = 'community',
  PARTICIPATION = 'participation',
}

/** Yutuq o'rni yoki ishtirok darajasi. */
export enum StaffAchievementRank {
  FIRST = 'first',
  SECOND = 'second',
  THIRD = 'third',
  FOURTH = 'fourth',
  FIFTH = 'fifth',
  PARTICIPATION = 'participation',
}

/** Yutuq ikonkasi (Kubok / Medal / Mukofot / Yulduzcha / Sertifikat / Toj). */
export enum StaffAchievementIcon {
  TROPHY = 'trophy',
  MEDAL = 'medal',
  AWARD = 'award',
  STAR = 'star',
  CERTIFICATE = 'certificate',
  CROWN = 'crown',
}

export enum LeaveStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

/** Ta'til turi (Yillik, Kasal, To'lanmagan, Onalik, Otalik, O'qish, Boshqa). */
export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  UNPAID = 'unpaid',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  STUDY = 'study',
  OTHER = 'other',
}

export enum PayrollStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  PAID = 'paid',
  LOCKED = 'locked',
}

/** Oylik komponenti turi — payslip'dagi har bir qator (itemized). */
export enum PayrollItemType {
  BASE_SALARY = 'base_salary',
  LESSON_PAY = 'lesson_pay',
  CLASS_LEADER = 'class_leader',
  KPI_BONUS = 'kpi_bonus',
  MANUAL_BONUS = 'manual_bonus',
  PENALTY = 'penalty',
  ABSENCE_DEDUCTION = 'absence_deduction',
  RETRO_ADJUSTMENT = 'retro_adjustment',
}

/** Qo'lda tuzatish turi: bonus (+) yoki jarima (−). */
export enum PayrollAdjustmentType {
  BONUS = 'bonus',
  PENALTY = 'penalty',
}

/** Xodim KPI bonusi turi: baza foizi yoki qat'iy summa (har xodimga alohida). */
export enum StaffKpiMode {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

/** Vazifa holati (Kutilmoqda, Jarayonda, Ko'rib chiqilmoqda, Bajarildi, Bekor qilindi). */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

/** Vazifa muhimligi (Past, O'rta, Yuqori, Tezkor). */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/** Loyiha holati. */
export enum ProjectStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/** Davomat harakati (Kirish / Chiqish). */
export enum AttendanceAction {
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
}

/** Davomat tasdiqlash holati (Kutilmoqda / Tasdiqlangan / Rad etilgan). */
export enum AttendanceReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** O'qituvchi ish turi (To'liq stavka / Soatbay). */
export enum TeacherWorkType {
  FULL = 'full',
  HOURLY = 'hourly',
}

/** O'qituvchining ma'lumot darajasi (Daraja). */
export enum TeacherDegree {
  SECONDARY_SPECIAL = 'secondary_special',
  BACHELOR = 'bachelor',
  MASTER = 'master',
  PHD = 'phd',
  DOCTOR = 'doctor',
}

/** Ishlash turi (Asosiy / O'rindosh). */
export enum TeacherEmploymentType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

/** O'qituvchi ish statusi (Faol / Ta'tilda / Bo'shatilgan). */
export enum TeacherStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  DISMISSED = 'dismissed',
}

/** Vakansiya holati (Ochiq / Yopiq / Qoralama / Kutishda). */
export enum VacancyStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  DRAFT = 'draft',
  PENDING = 'pending',
}

/** Nomzod recruitment bosqichi (Yangi / Screening / Suhbat / Test / Taklif / Ishga olingan / Rad etilgan). */
export enum CandidateStage {
  NEW = 'new',
  SCREENING = 'screening',
  INTERVIEW = 'interview',
  TEST = 'test',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected',
}

/** Muloqot turi (Qo'ng'iroq / Uchrashuv / Email / Suhbat / Boshqa). */
export enum InteractionType {
  CALL = 'call',
  MEETING = 'meeting',
  EMAIL = 'email',
  INTERVIEW = 'interview',
  OTHER = 'other',
}

/** Muloqot holati (Rejalashtirilgan / Bajarilgan / Bekor qilingan). */
export enum InteractionStatus {
  PLANNED = 'planned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/** So'rovnoma turi (Anonim / Ochiq). */
export enum SurveyType {
  ANONYMOUS = 'anonymous',
  PUBLIC = 'public',
}

/** So'rovnoma holati (Qoralama / Faol / Yakunlangan). */
export enum SurveyStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CLOSED = 'closed',
}

/** Samaradorlik baholash holati (Qoralama / Yakunlangan). */
export enum PerformanceReviewStatus {
  DRAFT = 'draft',
  COMPLETED = 'completed',
}

/** Ish vaqti taqvimi holati (Qoralama / Yuborilgan / Tasdiqlangan). */
export enum TimesheetStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
}

/** Xodim to'lovi holati (Kutilmoqda / Jarayonda / To'langan / Muvaffaqiyatsiz / Bekor qilingan). */
export enum HrPaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
