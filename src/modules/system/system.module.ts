import { Module } from '@nestjs/common';
import { SystemHealthController } from './system-health.controller';

/**
 * `DbHealthService` global (`DbHealthModule`), shuning uchun bu yerda import
 * kerak emas — faqat controller ro'yxatga olinadi.
 */
@Module({
  controllers: [SystemHealthController],
})
export class SystemModule {}
