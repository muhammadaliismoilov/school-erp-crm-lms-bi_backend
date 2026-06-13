import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomeworkAssignment } from './entities/homework-assignment.entity';
import { HomeworkSubmission } from './entities/homework-submission.entity';
import { HomeworkController } from './homework.controller';
import { HomeworkService } from './homework.service';

@Module({ imports: [TypeOrmModule.forFeature([HomeworkAssignment, HomeworkSubmission])], controllers: [HomeworkController], providers: [HomeworkService], exports: [HomeworkService] })
export class HomeworkModule {}
