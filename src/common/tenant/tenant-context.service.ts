import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

/** Har bir so'rov davomida aktiv maktab/filial. `null` = chegaralanmagan. */
export interface TenantStore {
  schoolId: string | null;
  branchId: string | null;
}

/**
 * So'rov doirasida (request-scoped) aktiv maktab (school) va filialni (branch)
 * `AsyncLocalStorage` orqali saqlaydi. Bu — barcha so'rovlarni avtomatik
 * maktab/filialga bog'lash uchun yagona manba: service'lar `getSchoolId()` /
 * `getBranchId()` orqali o'qiydi, kontekst esa autentifikatsiyadan keyin
 * (interceptor) to'ldiriladi.
 */
@Injectable()
export class TenantContextService {
  private readonly als = new AsyncLocalStorage<TenantStore>();

  /** So'rov boshida bo'sh kontekst ochadi (middleware chaqiradi). */
  run<T>(callback: () => T): T {
    return this.als.run({ schoolId: null, branchId: null }, callback);
  }

  /** Kontekstni to'ldiradi (autentifikatsiyadan keyin). */
  set(partial: Partial<TenantStore>): void {
    const store = this.als.getStore();
    if (!store) return;
    if (partial.schoolId !== undefined) store.schoolId = partial.schoolId;
    if (partial.branchId !== undefined) store.branchId = partial.branchId;
  }

  getSchoolId(): string | null {
    return this.als.getStore()?.schoolId ?? null;
  }

  getBranchId(): string | null {
    return this.als.getStore()?.branchId ?? null;
  }

  /** Kontekst umuman mavjudmi (masalan, so'rovdan tashqari workerlarda emas). */
  hasContext(): boolean {
    return this.als.getStore() !== undefined;
  }
}
