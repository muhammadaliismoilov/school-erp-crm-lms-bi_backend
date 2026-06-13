import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentHealthRecord } from './entities/student-health-record.entity';
import { NurseVisit } from './entities/nurse-visit.entity';
import { SafetyIncident } from './entities/safety-incident.entity';
import { EmergencyDrill } from './entities/emergency-drill.entity';
import { HealthSafetyController } from './health-safety.controller';
import { HealthSafetyService } from './health-safety.service';

@Module({ imports: [TypeOrmModule.forFeature([StudentHealthRecord, NurseVisit, SafetyIncident, EmergencyDrill])], controllers: [HealthSafetyController], providers: [HealthSafetyService], exports: [HealthSafetyService] })
export class HealthSafetyModule {}
