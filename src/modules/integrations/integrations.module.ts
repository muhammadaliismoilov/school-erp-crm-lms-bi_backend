import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { SchoolsModule } from "../schools/schools.module";
import { IntegrationsController } from "./integrations.controller";
import { Integration } from "./entities/integration.entity";
import { IntegrationsService } from "./integrations.service";

@Module({
  // SchoolsModule — `SchoolModuleGuard` uchun (bo'lim maktab bayrog'iga bog'langan).
  imports: [TypeOrmModule.forFeature([Integration]), AuditModule, SchoolsModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
