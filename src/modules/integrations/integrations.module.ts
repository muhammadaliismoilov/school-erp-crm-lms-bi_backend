import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { IntegrationsController } from "./integrations.controller";
import { Integration } from "./entities/integration.entity";
import { IntegrationsService } from "./integrations.service";

@Module({
  imports: [TypeOrmModule.forFeature([Integration]), AuditModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
