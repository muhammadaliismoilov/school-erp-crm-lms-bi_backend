import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { applyTenantScope, tenantWhere } from '../../common/tenant/tenant-scope.util';
import { CreateHolidayDto, HolidayQueryDto, UpdateHolidayDto } from './dto/holiday.dto';
import { Holiday } from './entities/holiday.entity';

export interface HolidayResponse {
  id: string;
  date: string;
  name: string;
}

/** Ish kalendari (bayramlar) — payroll'da ish kunlarini hisoblash manbasi. */
@Injectable()
export class HolidayService {
  constructor(
    @InjectRepository(Holiday) private readonly holidays: Repository<Holiday>,
    private readonly tenant: TenantContextService,
  ) {}

  async find(query: HolidayQueryDto): Promise<HolidayResponse[]> {
    const qb = this.holidays
      .createQueryBuilder('h')
      .where('h.deleted_at IS NULL')
      .orderBy('h.date', 'ASC');
    applyTenantScope(qb, 'h', this.tenant, { branch: true });
    if (query.from) qb.andWhere('h.date >= :from', { from: query.from });
    if (query.to) qb.andWhere('h.date <= :to', { to: query.to });
    const items = await qb.getMany();
    return items.map((h) => ({ id: h.id, date: h.date, name: h.name }));
  }

  async create(dto: CreateHolidayDto): Promise<HolidayResponse> {
    await this.assertUniqueDate(dto.date);
    const entity = await this.holidays.save(this.holidays.create({ date: dto.date, name: dto.name.trim() }));
    return { id: entity.id, date: entity.date, name: entity.name };
  }

  async update(id: string, dto: UpdateHolidayDto): Promise<HolidayResponse> {
    const entity = await this.getOne(id);
    if (dto.date !== undefined && dto.date !== entity.date) {
      await this.assertUniqueDate(dto.date, id);
      entity.date = dto.date;
    }
    if (dto.name !== undefined) entity.name = dto.name.trim();
    await this.holidays.save(entity);
    return { id: entity.id, date: entity.date, name: entity.name };
  }

  async remove(id: string): Promise<void> {
    const entity = await this.getOne(id);
    await this.holidays.softDelete(entity.id);
  }

  /** [from, to] oralig'idagi bayram sanalari to'plami (dvigatel uchun). */
  async datesBetween(from: string, to: string): Promise<Set<string>> {
    const items = await this.find({ from, to });
    return new Set(items.map((h) => h.date));
  }

  private async getOne(id: string): Promise<Holiday> {
    const entity = await this.holidays.findOne({
      where: tenantWhere<Holiday>(this.tenant, { id }, { branch: true }),
    });
    if (!entity) throw new NotFoundException('Bayram kuni topilmadi');
    return entity;
  }

  private async assertUniqueDate(date: string, excludeId?: string): Promise<void> {
    const qb = this.holidays
      .createQueryBuilder('h')
      .where('h.deleted_at IS NULL')
      .andWhere('h.date = :d', { d: date });
    applyTenantScope(qb, 'h', this.tenant, { branch: true });
    if (excludeId) qb.andWhere('h.id != :ex', { ex: excludeId });
    if ((await qb.getCount()) > 0) {
      throw new BadRequestException('Bu sana uchun bayram allaqachon kiritilgan');
    }
  }
}
