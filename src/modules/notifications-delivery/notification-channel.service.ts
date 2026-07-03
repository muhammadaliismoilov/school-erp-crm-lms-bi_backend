import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { NotificationChannelType } from '../../common/enums/notification-enums';
import { RegisterChannelDto } from './dto/register-channel.dto';
import { NotificationChannel } from './entities/notification-channel.entity';

@Injectable()
export class NotificationChannelService {
  constructor(
    @InjectRepository(NotificationChannel)
    private readonly channels: Repository<NotificationChannel>,
    private readonly tenant: TenantContextService,
  ) {}

  /** Foydalanuvchining o'z kanallari. */
  listOwn(userId: string): Promise<NotificationChannel[]> {
    return this.channels.find({
      where: tenantWhere<NotificationChannel>(this.tenant, { userId }, { branch: true }),
      order: { type: 'ASC' },
    });
  }

  /** (userId, type) bo'yicha upsert — mavjud bo'lsa manzil/til yangilanadi. */
  async register(userId: string, dto: RegisterChannelDto): Promise<NotificationChannel> {
    const existing = await this.channels.findOne({
      where: tenantWhere<NotificationChannel>(this.tenant, { userId, type: dto.type }),
    });
    const channel =
      existing ?? this.channels.create({ userId, type: dto.type });
    channel.address = dto.address;
    if (dto.language !== undefined) channel.language = dto.language;
    if (dto.isPreferred !== undefined) channel.isPreferred = dto.isPreferred;
    channel.active = true;
    return this.channels.save(channel);
  }

  async remove(userId: string, type: NotificationChannelType): Promise<void> {
    const channel = await this.channels.findOne({
      where: tenantWhere<NotificationChannel>(this.tenant, { userId, type }),
    });
    if (channel) await this.channels.softRemove(channel);
  }
}
