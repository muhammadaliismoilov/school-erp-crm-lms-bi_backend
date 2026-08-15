import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Student } from "../students/entities/student.entity";
import { User } from "../identity/entities/user.entity";
import { CounselingController } from "./counseling.controller";
import { CounselingService } from "./counseling.service";
import { CounselingSession } from "./entities/counseling-session.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CounselingSession, Student, User])],
  controllers: [CounselingController],
  providers: [CounselingService],
  exports: [CounselingService],
})
export class CounselingModule {}
