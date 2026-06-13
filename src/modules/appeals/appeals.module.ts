import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppealsController } from "./appeals.controller";
import { PublicAppealsController } from "./public-appeals.controller";
import { Appeal } from "./entities/appeal.entity";
import { AppealPublicLink } from "./entities/appeal-public-link.entity";
import { AppealsService } from "./appeals.service";

@Module({
  imports: [TypeOrmModule.forFeature([Appeal, AppealPublicLink])],
  controllers: [AppealsController, PublicAppealsController],
  providers: [AppealsService],
  exports: [AppealsService],
})
export class AppealsModule {}
