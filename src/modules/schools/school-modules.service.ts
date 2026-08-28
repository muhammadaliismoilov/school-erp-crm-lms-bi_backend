import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SchoolModule } from './entities/school-module.entity';
import {
  GATED_MODULE_KEYS,
  defaultEnabled,
  type GatedModule,
} from './gated-modules';

interface CacheEntry {
  at: number;
  enabled: Record<GatedModule, boolean>;
}

/**
 * Kesh TTL — CEO modulni yoqqach maktab xodimlarida maksimum shu vaqt ichida
 * paydo bo'ladi. Yoqqan CEO uchun esa darhol: `set()` keshni tozalaydi.
 */
const TTL_MS = 30_000;
const CACHE_MAX = 1_000;

/**
 * Maktab modullari reyestri — `PermissionRegistryService` naqshi bo'yicha:
 * har so'rovda kerak bo'ladi, shuning uchun qisqa TTL bilan keshlanadi.
 */
@Injectable()
export class SchoolModulesService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @InjectRepository(SchoolModule)
    private readonly modules: Repository<SchoolModule>,
  ) {}

  /** Shu maktabda har bayroqli modul yoqilganmi. */
  async statusFor(schoolId: string): Promise<Record<GatedModule, boolean>> {
    const cached = this.cache.get(schoolId);
    if (cached && Date.now() - cached.at < TTL_MS) return cached.enabled;

    const rows = await this.modules.find({
      where: { schoolId, module: In(GATED_MODULE_KEYS) },
    });

    // Yozuv yo'q = kodda ko'rsatilgan default.
    const enabled = Object.fromEntries(
      GATED_MODULE_KEYS.map((key) => [
        key,
        rows.find((row) => row.module === key)?.enabled ?? defaultEnabled(key),
      ]),
    ) as Record<GatedModule, boolean>;

    if (this.cache.size >= CACHE_MAX) this.cache.clear();
    this.cache.set(schoolId, { at: Date.now(), enabled });
    return enabled;
  }

  async isEnabled(schoolId: string, module: GatedModule): Promise<boolean> {
    return (await this.statusFor(schoolId))[module];
  }

  /** CEO bayroqni o'zgartiradi — kesh darhol tozalanadi (30s kutilmaydi). */
  async set(
    schoolId: string,
    module: GatedModule,
    enabled: boolean,
    actorId?: string | null,
  ): Promise<void> {
    const existing = await this.modules.findOne({ where: { schoolId, module } });
    const patch = {
      enabled,
      // "Kim yoqqan" tarixi faqat YOQISHDA yangilanadi — o'chirish uni
      // o'chirmaydi, aks holda audit qiymati yo'qolardi.
      ...(enabled ? { enabledBy: actorId ?? null, enabledAt: new Date() } : {}),
    };

    if (existing) {
      await this.modules.save({ ...existing, ...patch });
    } else {
      await this.modules.save(this.modules.create({ schoolId, module, ...patch }));
    }

    this.cache.delete(schoolId);
  }
}
