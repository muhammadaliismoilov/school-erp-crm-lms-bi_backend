import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from './entities/vendor.entity';
import { PurchaseRequest } from './entities/purchase-request.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';

@Module({ imports: [TypeOrmModule.forFeature([Vendor, PurchaseRequest, PurchaseOrder, GoodsReceipt])], controllers: [ProcurementController], providers: [ProcurementService], exports: [ProcurementService] })
export class ProcurementModule {}
