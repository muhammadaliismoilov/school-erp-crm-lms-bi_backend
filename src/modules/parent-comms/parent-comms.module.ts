import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolClass } from '../academic/entities/school-class.entity';
import { AuditModule } from '../audit/audit.module';
import { Student } from '../students/entities/student.entity';
import { ParentCommunication } from './entities/parent-communication.entity';
import { ParentCommsController } from './parent-comms.controller';
import { ParentCommsService } from './parent-comms.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ParentCommunication, Student, SchoolClass]),
    AuditModule,
  ],
  controllers: [ParentCommsController],
  providers: [ParentCommsService],
  exports: [ParentCommsService],
})
export class ParentCommsModule {}
