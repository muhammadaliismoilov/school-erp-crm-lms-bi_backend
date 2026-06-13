import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimetableTemplate } from './entities/timetable-template.entity';
import { TimetableSlot } from './entities/timetable-slot.entity';
import { TimetableSubstitution } from './entities/timetable-substitution.entity';
import { TimetableConflict } from './entities/timetable-conflict.entity';
import { CreateTimetableTemplateDto, UpdateTimetableTemplateDto, CreateTimetableSlotDto, UpdateTimetableSlotDto, CreateTimetableSubstitutionDto, UpdateTimetableSubstitutionDto, CreateTimetableConflictDto, UpdateTimetableConflictDto } from './dto/timetable.dto';

@Injectable()
export class TimetableService {
  constructor(@InjectRepository(TimetableTemplate) private readonly templates: Repository<TimetableTemplate>, @InjectRepository(TimetableSlot) private readonly slots: Repository<TimetableSlot>, @InjectRepository(TimetableSubstitution) private readonly substitutions: Repository<TimetableSubstitution>, @InjectRepository(TimetableConflict) private readonly conflicts: Repository<TimetableConflict>) {}

  findTemplates() { return this.templates.find({ order: { createdAt: 'DESC' } }); }
  createTemplates(dto: CreateTimetableTemplateDto) { return this.templates.save(this.templates.create(dto)); }
  async updateTemplates(id: string, dto: UpdateTimetableTemplateDto) { const entity = await this.templates.preload({ id, ...dto }); if (!entity) throw new NotFoundException('TimetableTemplate not found'); return this.templates.save(entity); }

  findSlots() { return this.slots.find({ order: { createdAt: 'DESC' } }); }
  createSlots(dto: CreateTimetableSlotDto) { return this.slots.save(this.slots.create(dto)); }
  async updateSlots(id: string, dto: UpdateTimetableSlotDto) { const entity = await this.slots.preload({ id, ...dto }); if (!entity) throw new NotFoundException('TimetableSlot not found'); return this.slots.save(entity); }

  findSubstitutions() { return this.substitutions.find({ order: { createdAt: 'DESC' } }); }
  createSubstitutions(dto: CreateTimetableSubstitutionDto) { return this.substitutions.save(this.substitutions.create(dto)); }
  async updateSubstitutions(id: string, dto: UpdateTimetableSubstitutionDto) { const entity = await this.substitutions.preload({ id, ...dto }); if (!entity) throw new NotFoundException('TimetableSubstitution not found'); return this.substitutions.save(entity); }

  findConflicts() { return this.conflicts.find({ order: { createdAt: 'DESC' } }); }
  createConflicts(dto: CreateTimetableConflictDto) { return this.conflicts.save(this.conflicts.create(dto)); }
  async updateConflicts(id: string, dto: UpdateTimetableConflictDto) { const entity = await this.conflicts.preload({ id, ...dto }); if (!entity) throw new NotFoundException('TimetableConflict not found'); return this.conflicts.save(entity); }
}
