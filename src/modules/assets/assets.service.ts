import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FixedAsset } from './entities/fixed-asset.entity';
import { AssetMaintenanceTicket } from './entities/asset-maintenance-ticket.entity';
import { AssetDepreciation } from './entities/asset-depreciation.entity';
import { CreateFixedAssetDto, UpdateFixedAssetDto, CreateAssetMaintenanceTicketDto, UpdateAssetMaintenanceTicketDto, CreateAssetDepreciationDto, UpdateAssetDepreciationDto } from './dto/assets.dto';

@Injectable()
export class AssetsService {
  constructor(@InjectRepository(FixedAsset) private readonly items: Repository<FixedAsset>, @InjectRepository(AssetMaintenanceTicket) private readonly maintenance: Repository<AssetMaintenanceTicket>, @InjectRepository(AssetDepreciation) private readonly depreciations: Repository<AssetDepreciation>) {}

  findItems() { return this.items.find({ order: { createdAt: 'DESC' } }); }
  createItems(dto: CreateFixedAssetDto) { return this.items.save(this.items.create(dto)); }
  async updateItems(id: string, dto: UpdateFixedAssetDto) { const entity = await this.items.preload({ id, ...dto }); if (!entity) throw new NotFoundException('FixedAsset not found'); return this.items.save(entity); }

  findMaintenance() { return this.maintenance.find({ order: { createdAt: 'DESC' } }); }
  createMaintenance(dto: CreateAssetMaintenanceTicketDto) { return this.maintenance.save(this.maintenance.create(dto)); }
  async updateMaintenance(id: string, dto: UpdateAssetMaintenanceTicketDto) { const entity = await this.maintenance.preload({ id, ...dto }); if (!entity) throw new NotFoundException('AssetMaintenanceTicket not found'); return this.maintenance.save(entity); }

  findDepreciations() { return this.depreciations.find({ order: { createdAt: 'DESC' } }); }
  createDepreciations(dto: CreateAssetDepreciationDto) { return this.depreciations.save(this.depreciations.create(dto)); }
  async updateDepreciations(id: string, dto: UpdateAssetDepreciationDto) { const entity = await this.depreciations.preload({ id, ...dto }); if (!entity) throw new NotFoundException('AssetDepreciation not found'); return this.depreciations.save(entity); }
}
