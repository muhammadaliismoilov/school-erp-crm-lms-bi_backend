import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAccessDeviceDto, CreateAccessEventDto, UpdateAccessDeviceDto, UpsertFaceProfileDto } from './dto/access-control.dto';
import { AccessDevice } from './entities/access-device.entity';
import { AccessEvent } from './entities/access-event.entity';
import { FaceProfile } from './entities/face-profile.entity';

@Injectable()
export class AccessControlService {
  constructor(@InjectRepository(AccessDevice) private readonly devices: Repository<AccessDevice>, @InjectRepository(FaceProfile) private readonly profiles: Repository<FaceProfile>, @InjectRepository(AccessEvent) private readonly events: Repository<AccessEvent>) {}
  findDevices() { return this.devices.find({ order: { createdAt: 'DESC' } }); }
  createDevice(dto: CreateAccessDeviceDto) { return this.devices.save(this.devices.create(dto)); }
  async updateDevice(id: string, dto: UpdateAccessDeviceDto) { const e = await this.devices.preload({ id, ...dto, lastSeenAt: dto.status ? new Date() : undefined }); if (!e) throw new NotFoundException('Access device not found'); return this.devices.save(e); }
  findProfiles(personType?: string, personId?: string) { return this.profiles.find({ where: personType && personId ? { personType, personId } : {}, order: { createdAt: 'DESC' } }); }
  async upsertProfile(dto: UpsertFaceProfileDto) { const existing = await this.profiles.findOne({ where: { personType: dto.personType, personId: dto.personId } }); return this.profiles.save(existing ? { ...existing, ...dto } : this.profiles.create(dto)); }
  findEvents(personType?: string, personId?: string) { return this.events.find({ where: personType && personId ? { personType, personId } : {}, order: { eventTime: 'DESC' }, take: 500 }); }
  createEvent(dto: CreateAccessEventDto) { return this.events.save(this.events.create({ ...dto, eventTime: new Date(dto.eventTime) })); }
}
