import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { User } from "../identity/entities/user.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { AppealsController } from "./appeals.controller";
import { PublicAppealsController } from "./public-appeals.controller";
import { Appeal } from "./entities/appeal.entity";
import { AppealPublicLink } from "./entities/appeal-public-link.entity";
import { AppealsService } from "./appeals.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Appeal, AppealPublicLink, User]),
    NotificationsModule,
    AuditModule,
  ],
  controllers: [AppealsController, PublicAppealsController],
  providers: [AppealsService],
  exports: [AppealsService],
})
export class AppealsModule {}
