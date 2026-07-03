import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
import { FixedAsset } from './entities/fixed-asset.entity';
import { AssetMaintenanceTicket } from './entities/asset-maintenance-ticket.entity';
import { AssetDepreciation } from './entities/asset-depreciation.entity';
import { CreateFixedAssetDto, UpdateFixedAssetDto, CreateAssetMaintenanceTicketDto, UpdateAssetMaintenanceTicketDto, CreateAssetDepreciationDto, UpdateAssetDepreciationDto } from './dto/assets.dto';

@Injectable()
export class AssetsService {
  constructor(@InjectRepository(FixedAsset) private readonly items: Repository<FixedAsset>, @InjectRepository(AssetMaintenanceTicket) private readonly maintenance: Repository<AssetMaintenanceTicket>, @InjectRepository(AssetDepreciation) private readonly depreciations: Repository<AssetDepreciation>, private readonly tenant: TenantContextService) {}

  findItems() { return this.items.find({ where: tenantWhere<FixedAsset>(this.tenant, {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  createItems(dto: CreateFixedAssetDto) { return this.items.save(this.items.create(dto)); }
  async updateItems(id: string, dto: UpdateFixedAssetDto) { const existing = await this.items.findOne({ where: tenantWhere<FixedAsset>(this.tenant, { id }, { branch: true }) }); if (!existing) throw new NotFoundException('FixedAsset not found'); const entity = await this.items.preload({ id, ...dto }); if (!entity) throw new NotFoundException('FixedAsset not found'); return this.items.save(entity); }

  findMaintenance() { return this.maintenance.find({ where: tenantWhere<AssetMaintenanceTicket>(this.tenant, {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  createMaintenance(dto: CreateAssetMaintenanceTicketDto) { return this.maintenance.save(this.maintenance.create(dto)); }
  async updateMaintenance(id: string, dto: UpdateAssetMaintenanceTicketDto) { const existing = await this.maintenance.findOne({ where: tenantWhere<AssetMaintenanceTicket>(this.tenant, { id }, { branch: true }) }); if (!existing) throw new NotFoundException('AssetMaintenanceTicket not found'); const entity = await this.maintenance.preload({ id, ...dto }); if (!entity) throw new NotFoundException('AssetMaintenanceTicket not found'); return this.maintenance.save(entity); }

  findDepreciations() { return this.depreciations.find({ where: tenantWhere<AssetDepreciation>(this.tenant, {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  createDepreciations(dto: CreateAssetDepreciationDto) { return this.depreciations.save(this.depreciations.create(dto)); }
  async updateDepreciations(id: string, dto: UpdateAssetDepreciationDto) { const existing = await this.depreciations.findOne({ where: tenantWhere<AssetDepreciation>(this.tenant, { id }, { branch: true }) }); if (!existing) throw new NotFoundException('AssetDepreciation not found'); const entity = await this.depreciations.preload({ id, ...dto }); if (!entity) throw new NotFoundException('AssetDepreciation not found'); return this.depreciations.save(entity); }
}
