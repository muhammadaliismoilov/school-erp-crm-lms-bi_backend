import { Global, Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantContextService } from './tenant-context.service';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { TenantScopeInterceptor } from './tenant-scope.interceptor';
import { TenantWriteSubscriber } from './tenant-write.subscriber';

/**
 * Ko'p-maktabli / ko'p-filialli ajratishning poydevori. Global — istalgan
 * modul `TenantContextService`ni inject qila oladi. Middleware har so'rovga
 * kontekst ochadi, interceptor esa uni foydalanuvchi maktabi bilan to'ldiradi.
 */
@Global()
@Module({
  providers: [
    TenantContextService,
    TenantWriteSubscriber,
    { provide: APP_INTERCEPTOR, useClass: TenantScopeInterceptor },
  ],
  exports: [TenantContextService],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
