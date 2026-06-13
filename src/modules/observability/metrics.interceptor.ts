import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{
      method: string;
      route?: { path?: string };
      originalUrl?: string;
      url?: string;
    }>();
    const response = http.getResponse<{ statusCode?: number }>();
    const start = process.hrtime.bigint();
    let recorded = false;

    const record = (statusCode: number): void => {
      if (recorded) {
        return;
      }
      recorded = true;
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
      this.metricsService.observeHttpRequest({
        method: request.method,
        route: request.route?.path ?? request.originalUrl ?? request.url ?? 'unknown',
        statusCode,
        durationSeconds,
      });
    };

    return next.handle().pipe(
      tap({
        complete: () => record(response.statusCode ?? 200),
      }),
      catchError((error: unknown) => {
        const statusCode =
          typeof error === 'object' &&
          error !== null &&
          'getStatus' in error &&
          typeof error.getStatus === 'function'
            ? Number(error.getStatus())
            : 500;
        record(statusCode);
        return throwError(() => error);
      }),
    );
  }
}
