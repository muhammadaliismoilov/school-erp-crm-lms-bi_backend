import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { User } from "../identity/entities/user.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { School } from "../settings/entities/school.entity";
import { AppealsController } from "./appeals.controller";
import { PublicAppealsController } from "./public-appeals.controller";
import { Appeal } from "./entities/appeal.entity";
import { AppealPublicLink } from "./entities/appeal-public-link.entity";
import { AppealsService } from "./appeals.service";
import { AppealsEscalationScheduler } from "./appeals-escalation.scheduler";

@Module({
  imports: [
    TypeOrmModule.forFeature([Appeal, AppealPublicLink, User, School]),
    NotificationsModule,
    AuditModule,
  ],
  controllers: [AppealsController, PublicAppealsController],
  providers: [AppealsService, AppealsEscalationScheduler],
  exports: [AppealsService],
})
export class AppealsModule {}
