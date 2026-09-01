import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { Observable, tap } from 'rxjs';
import { AppPermission } from '../../constants/permissions';
import type { AuthenticatedUser } from '../../security/authenticated-user.interface';
import { userSatisfiesPermissions } from '../../security/permission.matcher';
import { DbHealthService } from './db-health.service';

/** Chiroq o'qiydigan sarlavha. Qiymat — bitta so'z: `ok` / `busy` / `critical`. */
export const DB_HEALTH_HEADER = 'X-Db-Health';

/**
 * Har javobga baza sog'lig'i darajasini qo'shadi.
 *
 * NEGA SARLAVHA, POLL EMAS: chiroq doim yangi bo'lishi kerak, lekin o'zi
 * yuklama manbaiga aylanmasligi ham kerak. Foydalanuvchi allaqachon so'rov
 * yuborayotgan bo'lsa — daraja o'sha javob bilan bepul keladi. Qo'shimcha
 * so'rov faqat foydalanuvchi jim turganda (frontend zaxira polli) ketadi.
 *
 * FAQAT `system.monitor` egasiga: boshqalar uchun sarlavha umuman
 * qo'shilmaydi. Daraja maxfiy emas, lekin uni kerak bo'lmaganlarga
 * tarqatishning ham sababi yo'q.
 *
 * Qiymat xotiradagi hisoblagichlardan olinadi — bazaga so'rov ketmaydi.
 */
@Injectable()
export class DbHealthHeaderInterceptor implements NestInterceptor {
  constructor(private readonly dbHealth: DbHealthService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const user = http.getRequest<{ user?: AuthenticatedUser }>().user;

    if (!this.canMonitor(user)) {
      return next.handle();
    }

    // Sarlavha javob YUBORILISHIDAN oldin qo'yiladi; `tap` handler tugagach
    // ishlaydi, ya'ni daraja shu so'rovning o'zi hosil qilgan sekin
    // so'rovlarni ham hisobga oladi.
    return next.handle().pipe(
      tap(() => {
        const response = http.getResponse<Response>();
        if (!response.headersSent) {
          response.setHeader(DB_HEALTH_HEADER, this.dbHealth.snapshot().level);
        }
      }),
    );
  }

  private canMonitor(user: AuthenticatedUser | undefined): boolean {
    if (!user) return false;
    return userSatisfiesPermissions(
      [AppPermission.SYSTEM_MONITOR],
      new Set(user.permissions ?? []),
    );
  }
}
