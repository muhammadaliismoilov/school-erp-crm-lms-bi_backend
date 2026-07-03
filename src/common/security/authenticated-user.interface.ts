export interface AuthenticatedUser {
  id: string;
  username: string;
  email?: string | null;
  roles: string[];
  permissions: string[];
  sessionId?: string;
  /** Aktiv maktab (tenant chegarasi). */
  schoolId?: string | null;
  /** Asosiy filial. */
  branchId?: string | null;
}
