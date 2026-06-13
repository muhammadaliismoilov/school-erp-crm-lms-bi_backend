import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryCategory } from './entities/inventory-category.entity';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({ imports: [TypeOrmModule.forFeature([InventoryCategory, InventoryItem, InventoryTransaction])], controllers: [InventoryController], providers: [InventoryService], exports: [InventoryService] })
export class InventoryModule {}
