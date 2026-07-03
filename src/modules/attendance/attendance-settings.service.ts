import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { UpdateAttendanceSettingsDto } from './dto/attendance-settings.dto';
import { AttendanceSettings } from './entities/attendance-settings.entity';

/** Sozlama mavjud bo'lmasa qaytariladigan standart qiymatlar (entity default'lari bilan mos). */
const DEFAULTS = {
  lateThresholdMinutes: 5,
  correctionWindowMinutes: 720,
  notifyOnEntry: true,
  notifyOnExit: true,
  notifyOnSession: true,
  quietHoursStart: null as string | null,
  quietHoursEnd: null as string | null,
};

@Injectable()
export class AttendanceSettingsService {
  constructor(
    @InjectRepository(AttendanceSettings)
    private readonly repo: Repository<AttendanceSettings>,
    private readonly tenant: TenantContextService,
  ) {}

  /** Joriy filial sozlamasi yoki (yo'q bo'lsa) standart qiymatlar. */
  async current(): Promise<typeof DEFAULTS> {
    const row = await this.repo.findOne({
      where: tenantWhere<AttendanceSettings>(this.tenant, {}, { branch: true }),
    });
    if (!row) return { ...DEFAULTS };
    return {
      lateThresholdMinutes: row.lateThresholdMinutes,
      correctionWindowMinutes: row.correctionWindowMinutes,
      notifyOnEntry: row.notifyOnEntry,
      notifyOnExit: row.notifyOnExit,
      notifyOnSession: row.notifyOnSession,
      quietHoursStart: row.quietHoursStart ?? null,
      quietHoursEnd: row.quietHoursEnd ?? null,
    };
  }

  /** Upsert — mavjud bo'lsa yangilaydi, aks holda yaratadi (tenant subscriber to'ldiradi). */
  async update(dto: UpdateAttendanceSettingsDto): Promise<typeof DEFAULTS> {
    const row =
      (await this.repo.findOne({ where: tenantWhere<AttendanceSettings>(this.tenant, {}, { branch: true }) })) ??
      this.repo.create({ ...DEFAULTS });
    if (dto.quietHoursStart === '') dto.quietHoursStart = null;
    if (dto.quietHoursEnd === '') dto.quietHoursEnd = null;
    Object.assign(row, dto);
    await this.repo.save(row);
    return this.current();
  }
}
