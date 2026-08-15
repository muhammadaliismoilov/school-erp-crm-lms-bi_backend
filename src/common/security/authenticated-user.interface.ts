import type { DataScope } from '../scope/data-scope.enum';

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
  /**
   * Rollardan hisoblangan eng keng ma'lumot doirasi. `permissions` bilan bir
   * xil eskirish shartnomasi: rol o'zgarsa, keyingi token yangilanishida
   * amal qiladi.
   */
  dataScope?: DataScope;
}
