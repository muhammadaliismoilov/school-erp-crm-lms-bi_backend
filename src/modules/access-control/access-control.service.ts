import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { CreateAccessDeviceDto, CreateAccessEventDto, UpdateAccessDeviceDto, UpsertFaceProfileDto } from './dto/access-control.dto';
import { AccessDevice } from './entities/access-device.entity';
import { AccessEvent } from './entities/access-event.entity';
import { FaceProfile } from './entities/face-profile.entity';

@Injectable()
export class AccessControlService {
  constructor(@InjectRepository(AccessDevice) private readonly devices: Repository<AccessDevice>, @InjectRepository(FaceProfile) private readonly profiles: Repository<FaceProfile>, @InjectRepository(AccessEvent) private readonly events: Repository<AccessEvent>, private readonly tenant: TenantContextService) {}
  findDevices() { return this.devices.find({ where: tenantWhere<AccessDevice>(this.tenant, {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  createDevice(dto: CreateAccessDeviceDto) { return this.devices.save(this.devices.create(dto)); }
  async updateDevice(id: string, dto: UpdateAccessDeviceDto) { const existing = await this.devices.findOne({ where: tenantWhere<AccessDevice>(this.tenant, { id }, { branch: true }) }); if (!existing) throw new NotFoundException('Access device not found'); const e = await this.devices.preload({ id, ...dto, lastSeenAt: dto.status ? new Date() : undefined }); if (!e) throw new NotFoundException('Access device not found'); return this.devices.save(e); }
  findProfiles(personType?: string, personId?: string) { return this.profiles.find({ where: tenantWhere<FaceProfile>(this.tenant, personType && personId ? { personType, personId } : {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  async upsertProfile(dto: UpsertFaceProfileDto) { const existing = await this.profiles.findOne({ where: tenantWhere<FaceProfile>(this.tenant, { personType: dto.personType, personId: dto.personId }, { branch: true }) }); return this.profiles.save(existing ? { ...existing, ...dto } : this.profiles.create(dto)); }
  findEvents(personType?: string, personId?: string) { return this.events.find({ where: tenantWhere<AccessEvent>(this.tenant, personType && personId ? { personType, personId } : {}, { branch: true }), order: { eventTime: 'DESC' }, take: 500 }); }
  createEvent(dto: CreateAccessEventDto) { return this.events.save(this.events.create({ ...dto, eventTime: new Date(dto.eventTime) })); }
}
