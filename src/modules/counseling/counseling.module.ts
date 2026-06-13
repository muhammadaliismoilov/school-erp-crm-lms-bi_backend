import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CounselingController } from "./counseling.controller";
import { CounselingService } from "./counseling.service";
import { CounselingSession } from "./entities/counseling-session.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CounselingSession])],
  controllers: [CounselingController],
  providers: [CounselingService],
  exports: [CounselingService],
})
export class CounselingModule {}
