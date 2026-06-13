import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FixedAsset } from './entities/fixed-asset.entity';
import { AssetMaintenanceTicket } from './entities/asset-maintenance-ticket.entity';
import { AssetDepreciation } from './entities/asset-depreciation.entity';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({ imports: [TypeOrmModule.forFeature([FixedAsset, AssetMaintenanceTicket, AssetDepreciation])], controllers: [AssetsController], providers: [AssetsService], exports: [AssetsService] })
export class AssetsModule {}
