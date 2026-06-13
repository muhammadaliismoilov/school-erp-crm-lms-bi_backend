import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimetableTemplate } from './entities/timetable-template.entity';
import { TimetableSlot } from './entities/timetable-slot.entity';
import { TimetableSubstitution } from './entities/timetable-substitution.entity';
import { TimetableConflict } from './entities/timetable-conflict.entity';
import { TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';

@Module({ imports: [TypeOrmModule.forFeature([TimetableTemplate, TimetableSlot, TimetableSubstitution, TimetableConflict])], controllers: [TimetableController], providers: [TimetableService], exports: [TimetableService] })
export class TimetableModule {}
