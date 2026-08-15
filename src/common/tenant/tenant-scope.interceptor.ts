import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { DataScope } from '../scope/data-scope.enum';
import { TenantContextService } from './tenant-context.service';

interface RequestUser {
  id?: string;
  schoolId?: string | null;
  branchId?: string | null;
  dataScope?: DataScope | null;
  permissions?: string[];
}

/** Texnik super-admin (`*.*`) — hech qachon egalik filtriga tushmaydi. */
const hasWildcardPermission = (permissions: readonly string[] = []): boolean =>
  permissions.some((code) => code.split('.')[0] === '*');

/**
 * Autentifikatsiyadan keyin (guard req.user'ni to'ldirgach) so'rov kontekstini
 * foydalanuvchining maktabi/filiali VA ma'lumot doirasi bilan to'ldiradi.
 * Aktiv filialni so'rov `X-Branch-Id` sarlavhasi bilan (bir maktab ichida)
 * almashtirishi mumkin.
 */
@Injectable()
export class TenantScopeInterceptor implements NestInterceptor {
  constructor(private readonly tenant: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const user = req.user;
    if (user) {
      const headerBranch = req.headers['x-branch-id'];
      const branchOverride = typeof headerBranch === 'string' && headerBranch.length > 0 ? headerBranch : null;
      // Maktabга bog'langan user o'z maktabiga qadalgan (header e'tiborsiz);
      // GLOBAL user (schoolId=null, masalan super-admin) X-School-Id bilan maktab tanlaydi.
      const headerSchool = req.headers['x-school-id'];
      const schoolOverride = typeof headerSchool === 'string' && headerSchool.length > 0 ? headerSchool : null;
      this.tenant.set({
        schoolId: user.schoolId ?? schoolOverride ?? null,
        branchId: branchOverride ?? user.branchId ?? null,
        userId: user.id ?? null,
        dataScope: hasWildcardPermission(user.permissions)
          ? DataScope.ALL
          : user.dataScope ?? DataScope.ALL,
      });
    }
    return next.handle();
  }
}
