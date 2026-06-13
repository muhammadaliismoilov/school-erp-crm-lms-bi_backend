import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentHealthRecord } from './entities/student-health-record.entity';
import { NurseVisit } from './entities/nurse-visit.entity';
import { SafetyIncident } from './entities/safety-incident.entity';
import { EmergencyDrill } from './entities/emergency-drill.entity';
import { CreateStudentHealthRecordDto, UpdateStudentHealthRecordDto, CreateNurseVisitDto, UpdateNurseVisitDto, CreateSafetyIncidentDto, UpdateSafetyIncidentDto, CreateEmergencyDrillDto, UpdateEmergencyDrillDto } from './dto/health-safety.dto';

@Injectable()
export class HealthSafetyService {
  constructor(@InjectRepository(StudentHealthRecord) private readonly records: Repository<StudentHealthRecord>, @InjectRepository(NurseVisit) private readonly nursevisits: Repository<NurseVisit>, @InjectRepository(SafetyIncident) private readonly incidents: Repository<SafetyIncident>, @InjectRepository(EmergencyDrill) private readonly drills: Repository<EmergencyDrill>) {}

  findRecords() { return this.records.find({ order: { createdAt: 'DESC' } }); }
  createRecords(dto: CreateStudentHealthRecordDto) { return this.records.save(this.records.create(dto)); }
  async updateRecords(id: string, dto: UpdateStudentHealthRecordDto) { const entity = await this.records.preload({ id, ...dto }); if (!entity) throw new NotFoundException('StudentHealthRecord not found'); return this.records.save(entity); }

  findNurseVisits() { return this.nursevisits.find({ order: { createdAt: 'DESC' } }); }
  createNurseVisits(dto: CreateNurseVisitDto) { return this.nursevisits.save(this.nursevisits.create(dto)); }
  async updateNurseVisits(id: string, dto: UpdateNurseVisitDto) { const entity = await this.nursevisits.preload({ id, ...dto }); if (!entity) throw new NotFoundException('NurseVisit not found'); return this.nursevisits.save(entity); }

  findIncidents() { return this.incidents.find({ order: { createdAt: 'DESC' } }); }
  createIncidents(dto: CreateSafetyIncidentDto) { return this.incidents.save(this.incidents.create(dto)); }
  async updateIncidents(id: string, dto: UpdateSafetyIncidentDto) { const entity = await this.incidents.preload({ id, ...dto }); if (!entity) throw new NotFoundException('SafetyIncident not found'); return this.incidents.save(entity); }

  findDrills() { return this.drills.find({ order: { createdAt: 'DESC' } }); }
  createDrills(dto: CreateEmergencyDrillDto) { return this.drills.save(this.drills.create(dto)); }
  async updateDrills(id: string, dto: UpdateEmergencyDrillDto) { const entity = await this.drills.preload({ id, ...dto }); if (!entity) throw new NotFoundException('EmergencyDrill not found'); return this.drills.save(entity); }
}
