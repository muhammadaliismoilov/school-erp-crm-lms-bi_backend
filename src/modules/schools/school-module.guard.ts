import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { resolveRequestSchoolId } from '../../common/tenant/resolve-request-school';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { REQUIRES_MODULE_KEY } from './requires-module.decorator';
import { SchoolModulesService } from './school-modules.service';
import type { GatedModule } from './gated-modules';

/**
 * `@RequiresModule(...)` bilan belgilangan yo'llarni maktab bayrog'iga
 * bog'laydi.
 *
 * Maktab konteksti YO'Q bo'lsa (global CEO "Barcha maktablar" da) ham rad
 * etiladi: modul har doim aniq bir maktabga tegishli, "hamma maktab uchun
 * birdaniga" degan holat yo'q. CEO avval maktabni tanlaydi.
 */
@Injectable()
export class SchoolModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly modules: SchoolModulesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<GatedModule | undefined>(REQUIRES_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    // DIQQAT: `TenantContextService` dan O'QIMAYMIZ — qorovullar
    // interceptor'lardan OLDIN ishlaydi, ya'ni u paytda kontekst hali bo'sh.
    const req = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      headers: Record<string, unknown>;
    }>();
    const schoolId = resolveRequestSchoolId(req.user?.schoolId, req.headers['x-school-id']);
    // Xabar `{uz, ru, en}` shaklida beriladi: `GlobalExceptionFilter` faqat shu
    // shaklni saqlaydi, oddiy satr esa status kodining umumiy matniga
    // ("Ruxsatlar yetarli emas") aylanib, sababi yo'qolardi.
    if (!schoolId) {
      throw new ForbiddenException({
        message: {
          uz: 'Avval maktabni tanlang — bu bo‘lim maktabga bog‘liq',
          ru: 'Сначала выберите школу — этот раздел привязан к школе',
          en: 'Select a school first — this section belongs to one',
        },
      });
    }

    if (!(await this.modules.isEnabled(schoolId, required))) {
      throw new ForbiddenException({
        message: {
          uz: 'Bu bo‘lim maktabingiz uchun yoqilmagan',
          ru: 'Этот раздел не включён для вашей школы',
          en: 'This section is not enabled for your school',
        },
      });
    }

    return true;
  }
}
