export enum EmploymentStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  DISMISSED = 'dismissed',
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
  APPROVED = 'approved',
  PAID = 'paid',
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
