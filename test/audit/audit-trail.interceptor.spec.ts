import type { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { AuditTrailInterceptor } from '../../src/modules/audit/audit-trail.interceptor';
import type { AuditService } from '../../src/modules/audit/audit.service';

const buildContext = (method: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        originalUrl: '/api/v1/settings/rooms/f0ff63e5-9fc8-4a9a-83de-9453d328d0d7',
        route: { path: '/settings/rooms/:id' },
        params: { id: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7' },
        ip: '127.0.0.1',
        user: { id: '8cf35a94-92b4-4f1a-8a7a-90a78003892d' },
      }),
    }),
  }) as ExecutionContext;

describe('AuditTrailInterceptor', () => {
  it('logs successful mutating HTTP requests', (done) => {
    const auditService = {
      log: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<AuditService>;
    const interceptor = new AuditTrailInterceptor(auditService);

    interceptor
      .intercept(buildContext('PATCH'), {
        handle: () => of({ id: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7' }),
      })
      .subscribe({
        complete: () => {
          expect(auditService.log).toHaveBeenCalledWith(
            expect.objectContaining({
              userId: '8cf35a94-92b4-4f1a-8a7a-90a78003892d',
              action: 'PATCH /settings/rooms/:id',
              entity: 'settings/rooms',
              entityId: 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7',
              ipAddress: '127.0.0.1',
            }),
          );
          done();
        },
        error: done,
      });
  });

  it('does not audit read-only HTTP requests', (done) => {
    const auditService = {
      log: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<AuditService>;
    const interceptor = new AuditTrailInterceptor(auditService);

    interceptor
      .intercept(buildContext('GET'), {
        handle: () => of([]),
      })
      .subscribe({
        complete: () => {
          expect(auditService.log).not.toHaveBeenCalled();
          done();
        },
        error: done,
      });
  });
});
