import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import type { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { AuditService } from './audit.service';

const auditedMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const sensitiveKeys = new Set([
  'password',
  'passwordHash',
  'accessToken',
  'refreshToken',
  'token',
  'secret',
]);

interface AuditedRequest {
  method: string;
  originalUrl?: string;
  url?: string;
  route?: { path?: string };
  params?: Record<string, string | undefined>;
  body?: unknown;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
}

@Injectable()
export class AuditTrailInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditedRequest>();

    if (!auditedMethods.has(request.method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        complete: () => this.logRequest(request, 'success'),
      }),
      catchError((error: unknown) => {
        this.logRequest(request, 'failed');
        return throwError(() => error);
      }),
    );
  }

  private logRequest(request: AuditedRequest, outcome: 'success' | 'failed'): void {
    const route = request.route?.path ?? request.originalUrl ?? request.url ?? 'unknown';

    void this.auditService
      .log({
        userId: request.user?.id,
        action: request.method + ' ' + route,
        entity: this.resolveEntity(route),
        entityId: request.params?.id,
        ipAddress: this.resolveIpAddress(request),
        details: {
          outcome,
          body: this.sanitizeValue(request.body),
        },
      })
      .catch(() => undefined);
  }

  private resolveEntity(route: string): string {
    return route
      .replace(/^\/api\/v\d+\//, '')
      .replace(/^\//, '')
      .split('/')
      .filter((segment) => segment && !segment.startsWith(':'))
      .slice(0, 2)
      .join('/');
  }

  private resolveIpAddress(request: AuditedRequest): string | undefined {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0].trim();
    }

    return request.ip;
  }

  private sanitizeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        sensitiveKeys.has(key) ? '[redacted]' : this.sanitizeValue(nestedValue),
      ]),
    );
  }
}
