import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Repository } from 'typeorm';
import type { SchoolModule } from '../src/modules/schools/entities/school-module.entity';
import { SchoolModulesService } from '../src/modules/schools/school-modules.service';
import { SchoolModuleGuard } from '../src/modules/schools/school-module.guard';
import { defaultEnabled, isGatedModule } from '../src/modules/schools/gated-modules';

/**
 * Maktab darajasidagi modul bayroqlari.
 *
 * NEGA KERAK: "Integratsiyalar" hamma maktabga emas, faqat CEO tanlaganiga
 * ochilishi kerak edi. Ruxsat orqali buni qilib bo'lmaydi — `director` GLOBAL
 * rol, ya'ni bitta maktab direktoriga kod berish HAMMA maktab direktoriga
 * berish demakdir.
 */
describe('Maktab modullari', () => {
  const schoolId = 'aaaaaaaa-1111-2222-3333-444444444444';

  describe('GATED_MODULES', () => {
    it("integratsiyalar bayroqli va DEFAULT holati o'chiq", () => {
      expect(isGatedModule('integrations')).toBe(true);
      expect(defaultEnabled('integrations')).toBe(false);
    });

    it("ro'yxatda yo'q modul bayroqqa bo'ysunmaydi", () => {
      // Qolgan bo'limlar (Ta'lim, Moliya, HR) doim ochiq qolishi shart.
      expect(isGatedModule('finance')).toBe(false);
      expect(isGatedModule('students')).toBe(false);
    });
  });

  describe('SchoolModulesService', () => {
    function makeService(rows: Partial<SchoolModule>[]) {
      const modules = {
        find: jest.fn().mockResolvedValue(rows),
        findOne: jest.fn().mockResolvedValue(rows[0] ?? null),
        create: jest.fn().mockImplementation((v) => v),
        save: jest.fn().mockImplementation(async (v) => v),
      };
      return {
        service: new SchoolModulesService(modules as unknown as Repository<SchoolModule>),
        modules,
      };
    }

    it("yozuv yo'q bo'lsa DEFAULT qaytadi (o'chiq)", async () => {
      const { service } = makeService([]);
      await expect(service.isEnabled(schoolId, 'integrations')).resolves.toBe(false);
    });

    it("yozuv bor bo'lsa o'sha holat qaytadi", async () => {
      const { service } = makeService([{ module: 'integrations', enabled: true }]);
      await expect(service.isEnabled(schoolId, 'integrations')).resolves.toBe(true);
    });

    it('natija keshlanadi — ikkinchi chaqiruv DBga bormaydi', async () => {
      const { service, modules } = makeService([]);
      await service.statusFor(schoolId);
      await service.statusFor(schoolId);
      expect(modules.find).toHaveBeenCalledTimes(1);
    });

    it('yoqilgach kesh DARHOL tozalanadi — 30s kutilmaydi', async () => {
      const { service, modules } = makeService([]);
      await service.statusFor(schoolId);
      await service.set(schoolId, 'integrations', true, 'ceo-1');
      await service.statusFor(schoolId);
      expect(modules.find).toHaveBeenCalledTimes(2);
    });

    it("yoqishda 'kim/qachon' yoziladi", async () => {
      const { service, modules } = makeService([]);
      await service.set(schoolId, 'integrations', true, 'ceo-1');
      expect(modules.save).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true, enabledBy: 'ceo-1', enabledAt: expect.any(Date) }),
      );
    });

    it("o'chirishda 'kim yoqqan' tarixi O'CHIRILMAYDI", async () => {
      const { service, modules } = makeService([
        { id: 'r1', module: 'integrations', enabled: true, enabledBy: 'ceo-1' },
      ]);
      await service.set(schoolId, 'integrations', false, 'ceo-2');
      expect(modules.save).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false, enabledBy: 'ceo-1' }),
      );
    });
  });

  describe('SchoolModuleGuard', () => {
    function makeGuard(required: string | undefined, enabled: boolean, userSchoolId?: string) {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) };
      const modules = { isEnabled: jest.fn().mockResolvedValue(enabled) };
      const guard = new SchoolModuleGuard(
        reflector as unknown as Reflector,
        modules as unknown as SchoolModulesService,
      );
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { schoolId: userSchoolId ?? null }, headers: {} }),
        }),
        getHandler: () => undefined,
        getClass: () => undefined,
      } as unknown as ExecutionContext;
      return { guard, context, modules };
    }

    it("dekorator qo'yilmagan yo'l tegilmaydi", async () => {
      const { guard, context, modules } = makeGuard(undefined, false);
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(modules.isEnabled).not.toHaveBeenCalled();
    });

    it("modul yoqilgan bo'lsa o'tkazadi", async () => {
      const { guard, context } = makeGuard('integrations', true, schoolId);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it("modul o'chiq bo'lsa 403", async () => {
      const { guard, context } = makeGuard('integrations', false, schoolId);
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("maktabni SO'ROVDAN o'qiydi, TenantContext'dan emas — qorovul interceptor'dan oldin ishlaydi", async () => {
      // Aynan shu nuqson: kontekstdan o'qiganda schoolId doim null edi va
      // modul yoqilgan bo'lsa ham hamma 403 olardi.
      const { guard, context, modules } = makeGuard('integrations', true, schoolId);
      await guard.canActivate(context);
      expect(modules.isEnabled).toHaveBeenCalledWith(schoolId, 'integrations');
    });

    it("maktab konteksti yo'q bo'lsa ham 403 — CEO avval maktab tanlaydi", async () => {
      const { guard, context, modules } = makeGuard('integrations', true);
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
      expect(modules.isEnabled).not.toHaveBeenCalled();
    });
  });
});
