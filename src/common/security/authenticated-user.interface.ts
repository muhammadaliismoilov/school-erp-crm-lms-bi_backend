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
  /**
   * Maktab nomi — FAQAT ko'rsatish uchun (yon paneldagi brend).
   *
   * Login/refresh javobining TANASIDA keladi, tokenda YO'Q: token o'lchamini
   * kichik ushlash siyosati (`auth.types.ts` dagi izoh). Shuning uchun so'rov
   * kontekstidagi `AuthenticatedUser` da bu maydon bo'lmaydi — backend mantig'i
   * unga tayanmasin, faqat `schoolId` ishonchli.
   */
  schoolName?: string | null;
  /** Asosiy filial. */
  branchId?: string | null;
  /**
   * Rollardan hisoblangan eng keng ma'lumot doirasi. `permissions` bilan bir
   * xil eskirish shartnomasi: rol o'zgarsa, keyingi token yangilanishida
   * amal qiladi.
   */
  dataScope?: DataScope;
}
