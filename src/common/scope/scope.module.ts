import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassLeaderAssignment } from '../../modules/hr/entities/class-leader-assignment.entity';
import { StaffMember } from '../../modules/hr/entities/staff-member.entity';
import { Teacher } from '../../modules/hr/entities/teacher.entity';
import { StudentParent } from '../../modules/students/entities/student-parent.entity';
import { TimetableSlot } from '../../modules/timetable/entities/timetable-slot.entity';
import { AccessScopeService } from './access-scope.service';

/**
 * Qator darajasidagi egalik qatlami. `TenantModule` kabi global: istalgan
 * service `AccessScopeService`ni inject qila oladi, chunki egalik filtri
 * modullararo (o'quvchi, baho, davomat, to'lov...) bir xil ta'rifga
 * tayanishi shart.
 *
 * Faqat ENTITY'larga bog'lanadi, boshqa modullarning service'lariga emas —
 * shu sabab aylanma bog'liqlik (circular dependency) hosil bo'lmaydi.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      StaffMember,
      Teacher,
      ClassLeaderAssignment,
      TimetableSlot,
      StudentParent,
    ]),
  ],
  providers: [AccessScopeService],
  exports: [AccessScopeService],
})
export class ScopeModule {}
