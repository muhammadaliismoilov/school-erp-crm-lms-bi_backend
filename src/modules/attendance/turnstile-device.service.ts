import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { CreateTurnstileDeviceDto, UpdateTurnstileDeviceDto } from './dto/turnstile-device.dto';
import { TurnstileDevice } from './entities/turnstile-device.entity';

/** Ochiq kalitni ko'rsatib qaytariladi (faqat bir marta), DB'da hash saqlanadi. */
export interface DeviceWithKey {
  device: TurnstileDevice;
  apiKey: string;
}

@Injectable()
export class TurnstileDeviceService {
  constructor(
    @InjectRepository(TurnstileDevice)
    private readonly devices: Repository<TurnstileDevice>,
    private readonly tenant: TenantContextService,
  ) {}

  async list(): Promise<TurnstileDevice[]> {
    return this.devices.find({
      where: tenantWhere<TurnstileDevice>(this.tenant, {}, { branch: true }),
      order: { deviceNumber: 'ASC' },
    });
  }

  async create(dto: CreateTurnstileDeviceDto): Promise<DeviceWithKey> {
    const exists = await this.devices.findOne({
      where: tenantWhere<TurnstileDevice>(this.tenant, { deviceNumber: dto.deviceNumber }),
    });
    if (exists) throw new ConflictException('Bu device_number allaqachon mavjud.');

    const apiKey = this.generateKey();
    const device = this.devices.create({
      deviceNumber: dto.deviceNumber,
      name: dto.name ?? null,
      direction: dto.direction,
      apiKeyHash: this.hashKey(apiKey),
    });
    // school_id/filial_id ni TenantWriteSubscriber avtomatik qo'yadi.
    return { device: await this.devices.save(device), apiKey };
  }

  async update(id: string, dto: UpdateTurnstileDeviceDto): Promise<TurnstileDevice> {
    const device = await this.findOwned(id);
    Object.assign(device, dto);
    return this.devices.save(device);
  }

  /** API kalitni qayta generatsiya qiladi (eski kalit darhol kuchdan qoladi). */
  async rotateKey(id: string): Promise<DeviceWithKey> {
    const device = await this.findOwned(id);
    const apiKey = this.generateKey();
    device.apiKeyHash = this.hashKey(apiKey);
    return { device: await this.devices.save(device), apiKey };
  }

  async remove(id: string): Promise<void> {
    const device = await this.findOwned(id);
    await this.devices.softRemove(device);
  }

  private async findOwned(id: string): Promise<TurnstileDevice> {
    const device = await this.devices.findOne({
      where: tenantWhere<TurnstileDevice>(this.tenant, { id }, { branch: true }),
    });
    if (!device) throw new NotFoundException('Qurilma topilmadi.');
    return device;
  }

  private generateKey(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }
}
