import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { PurchaseRequest } from './entities/purchase-request.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { CreateVendorDto, UpdateVendorDto, CreatePurchaseRequestDto, UpdatePurchaseRequestDto, CreatePurchaseOrderDto, UpdatePurchaseOrderDto, CreateGoodsReceiptDto, UpdateGoodsReceiptDto } from './dto/procurement.dto';

@Injectable()
export class ProcurementService {
  constructor(@InjectRepository(Vendor) private readonly vendors: Repository<Vendor>, @InjectRepository(PurchaseRequest) private readonly requests: Repository<PurchaseRequest>, @InjectRepository(PurchaseOrder) private readonly orders: Repository<PurchaseOrder>, @InjectRepository(GoodsReceipt) private readonly receipts: Repository<GoodsReceipt>) {}

  findVendors() { return this.vendors.find({ order: { createdAt: 'DESC' } }); }
  createVendors(dto: CreateVendorDto) { return this.vendors.save(this.vendors.create(dto)); }
  async updateVendors(id: string, dto: UpdateVendorDto) { const entity = await this.vendors.preload({ id, ...dto }); if (!entity) throw new NotFoundException('Vendor not found'); return this.vendors.save(entity); }

  findRequests() { return this.requests.find({ order: { createdAt: 'DESC' } }); }
  createRequests(dto: CreatePurchaseRequestDto) { return this.requests.save(this.requests.create(dto)); }
  async updateRequests(id: string, dto: UpdatePurchaseRequestDto) { const entity = await this.requests.preload({ id, ...dto }); if (!entity) throw new NotFoundException('PurchaseRequest not found'); return this.requests.save(entity); }

  findOrders() { return this.orders.find({ order: { createdAt: 'DESC' } }); }
  createOrders(dto: CreatePurchaseOrderDto) { return this.orders.save(this.orders.create(dto)); }
  async updateOrders(id: string, dto: UpdatePurchaseOrderDto) { const entity = await this.orders.preload({ id, ...dto }); if (!entity) throw new NotFoundException('PurchaseOrder not found'); return this.orders.save(entity); }

  findReceipts() { return this.receipts.find({ order: { createdAt: 'DESC' } }); }
  createReceipts(dto: CreateGoodsReceiptDto) { return this.receipts.save(this.receipts.create(dto)); }
  async updateReceipts(id: string, dto: UpdateGoodsReceiptDto) { const entity = await this.receipts.preload({ id, ...dto }); if (!entity) throw new NotFoundException('GoodsReceipt not found'); return this.receipts.save(entity); }
}
