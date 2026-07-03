import { Injectable } from '@nestjs/common';
import { DataSource, EntitySubscriberInterface, InsertEvent } from 'typeorm';
import { TenantContextService } from './tenant-context.service';

/**
 * Safe-by-default yozuv: `school_id` (va bor bo'lsa `filial_id`) ustuni bo'lgan
 * HAR QANDAY entity insert qilinganda, agar qiymat berilmagan bo'lsa — aktiv
 * tenant kontekstidan avtomatik to'ldiradi. Shu sabab har bir create'da qo'lda
 * yozish shart emas; dasturchi unutib qo'ysa ham yozuv to'g'ri maktabga tegishli
 * bo'ladi.
 *
 * - `school_id` ustuni yo'q global entity'larga (roles, permissions...) tegmaydi.
 * - Aniq berilgan qiymatni ustidan yozmaydi (super-admin boshqa maktab uchun
 *   yaratsa saqlanadi).
 * - Kontekst yo'q bo'lsa (worker/seed/migratsiya) — hech narsa qo'ymaydi.
 */
@Injectable()
export class TenantWriteSubscriber implements EntitySubscriberInterface {
  constructor(dataSource: DataSource, private readonly tenant: TenantContextService) {
    dataSource.subscribers.push(this);
  }

  beforeInsert(event: InsertEvent<Record<string, unknown>>): void {
    const entity = event.entity;
    if (!entity) return;

    const props = new Set(event.metadata.columns.map((c) => c.propertyName));

    if (props.has('schoolId') && entity.schoolId == null) {
      const schoolId = this.tenant.getSchoolId();
      if (schoolId) entity.schoolId = schoolId;
    }
    if (props.has('filialId') && entity.filialId == null) {
      const branchId = this.tenant.getBranchId();
      if (branchId) entity.filialId = branchId;
    }
  }
}
