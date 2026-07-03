import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildLocalizedText } from '../../common/i18n/localized-text.util';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { UpsertSchoolDto } from './dto/upsert-school.dto';
import { School } from './entities/school.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(School)
    private readonly schools: Repository<School>,
    private readonly tenant: TenantContextService,
  ) {}

  getSchool(): Promise<School | null> {
    // Kontekstda aktiv maktab bo'lsa — o'shani, bo'lmasa (super-admin) eng eskisini.
    const schoolId = this.tenant.getSchoolId();
    return this.schools.findOne({
      where: schoolId ? { id: schoolId } : {},
      relations: { branches: true },
      order: { createdAt: 'ASC' },
    });
  }

  async upsertSchool(dto: UpsertSchoolDto): Promise<School> {
    const existing = await this.getSchool();
    const school = existing ?? this.schools.create();
    Object.assign(school, dto, { name: buildLocalizedText(dto.name) });
    return this.schools.save(school);
  }
}
