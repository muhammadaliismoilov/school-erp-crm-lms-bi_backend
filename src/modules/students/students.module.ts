import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from './entities/parent.entity';
import { StudentDocument } from './entities/student-document.entity';
import { StudentParent } from './entities/student-parent.entity';
import { Student } from './entities/student.entity';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Parent, StudentParent, StudentDocument])],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
