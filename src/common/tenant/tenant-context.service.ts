import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { DataScope, type OwnScope } from '../scope/data-scope.enum';

/** Har bir so'rov davomida aktiv maktab/filial va so'rov egasi. */
export interface TenantStore {
  /** Aktiv maktab (qattiq tenant chegarasi). `null` = chegaralanmagan. */
  schoolId: string | null;
  /** Aktiv filial. `null` = chegaralanmagan. */
  branchId: string | null;
  /** So'rovni bajarayotgan foydalanuvchi — egalik hisobining boshlanish nuqtasi. */
  userId: string | null;
  /** Rollardan kelgan eng keng ma'lumot doirasi (`widestDataScope`). */
  dataScope: DataScope;
  /**
   * Shu so'rov uchun bir marta hisoblangan "o'ziniki" identifikatorlari.
   * Kesh: bitta handler ichida `getStats()` kabi metodlar bir necha so'rov
   * yuboradi, egalikni har safar qaytadan hisoblash ortiqcha yuk bo'lardi.
   */
  ownScope: OwnScope | null;
}

const emptyStore = (): TenantStore => ({
  schoolId: null,
  branchId: null,
  userId: null,
  // Kontekst to'ldirilmaguncha eng keng holat: autentifikatsiyasiz ichki
  // chaqiruvlar (worker, seed, migratsiya) egalik filtriga tushib qolmasin.
  dataScope: DataScope.ALL,
  ownScope: null,
});

/**
 * So'rov doirasidagi (request-scoped) kontekst: aktiv maktab (school),
 * filial (branch) va so'rov egasi `AsyncLocalStorage` orqali saqlanadi.
 * Bu — so'rovni avtomatik chegaralashning yagona manbasi: service'lar
 * `getSchoolId()` / `getDataScope()` orqali o'qiydi, kontekst esa
 * autentifikatsiyadan keyin (interceptor) to'ldiriladi.
 *
 * Ikki chegara mustaqil ishlaydi:
 *  - TENANT (maktab/filial) — qattiq izolyatsiya, hech qachon kesib o'tilmaydi;
 *  - DOIRA (`DataScope`) — tenant ichida "faqat o'zimniki" toraytirishi.
 */
@Injectable()
export class TenantContextService {
  private readonly als = new AsyncLocalStorage<TenantStore>();

  /** So'rov boshida bo'sh kontekst ochadi (middleware chaqiradi). */
  run<T>(callback: () => T): T {
    return this.als.run(emptyStore(), callback);
  }

  /** Kontekstni to'ldiradi (autentifikatsiyadan keyin). */
  set(partial: Partial<TenantStore>): void {
    const store = this.als.getStore();
    if (!store) return;
    if (partial.schoolId !== undefined) store.schoolId = partial.schoolId;
    if (partial.branchId !== undefined) store.branchId = partial.branchId;
    if (partial.userId !== undefined) store.userId = partial.userId;
    if (partial.dataScope !== undefined) store.dataScope = partial.dataScope;
    if (partial.ownScope !== undefined) store.ownScope = partial.ownScope;
  }

  getSchoolId(): string | null {
    return this.als.getStore()?.schoolId ?? null;
  }

  getBranchId(): string | null {
    return this.als.getStore()?.branchId ?? null;
  }

  getUserId(): string | null {
    return this.als.getStore()?.userId ?? null;
  }

  /** Kontekst yo'q bo'lsa `ALL` — ichki chaqiruvlar chegaralanmaydi. */
  getDataScope(): DataScope {
    return this.als.getStore()?.dataScope ?? DataScope.ALL;
  }

  /** So'rov keshidagi "o'ziniki" ro'yxati; hali hisoblanmagan bo'lsa `null`. */
  getOwnScope(): OwnScope | null {
    return this.als.getStore()?.ownScope ?? null;
  }

  /** Kontekst umuman mavjudmi (masalan, so'rovdan tashqari workerlarda emas). */
  hasContext(): boolean {
    return this.als.getStore() !== undefined;
  }
}
