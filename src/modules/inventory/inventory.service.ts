import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, FindOptionsWhere, Repository } from 'typeorm';
import { CreateInventoryCategoryDto, CreateInventoryItemDto, CreateInventoryTransactionDto, UpdateInventoryCategoryDto, UpdateInventoryItemDto } from './dto/inventory.dto';
import { InventoryCategory } from './entities/inventory-category.entity';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryCategory) private readonly categories: Repository<InventoryCategory>,
    @InjectRepository(InventoryItem) private readonly items: Repository<InventoryItem>,
    @InjectRepository(InventoryTransaction) private readonly transactions: Repository<InventoryTransaction>,
  ) {}
  createCategory(dto: CreateInventoryCategoryDto) { return this.categories.save(this.categories.create(dto)); }
  findCategories() { return this.categories.find({ order: { createdAt: 'DESC' } }); }
  updateCategory(id: string, dto: UpdateInventoryCategoryDto) { return this.update(this.categories, id, dto); }
  createItem(dto: CreateInventoryItemDto) { return this.items.save(this.items.create(dto)); }
  findItems() { return this.items.find({ relations: { category: true, room: true }, order: { createdAt: 'DESC' } }); }
  async getItem(id: string) { return this.findOneOrFail(this.items, id, { category: true, room: true, transactions: true }); }
  updateItem(id: string, dto: UpdateInventoryItemDto) { return this.update(this.items, id, dto); }
  async createTransaction(dto: CreateInventoryTransactionDto) { await this.findOneOrFail(this.items, dto.itemId); return this.transactions.save(this.transactions.create({ ...dto, quantity: dto.quantity ?? 1 })); }
  findTransactions() { return this.transactions.find({ relations: { item: true }, order: { createdAt: 'DESC' } }); }
  private async update<T extends { id: string }>(repo: Repository<T>, id: string, dto: Partial<T>) { const entity = await this.findOneOrFail(repo, id); Object.assign(entity, dto); return repo.save(entity); }
  private async findOneOrFail<T extends { id: string }>(repo: Repository<T>, id: string, relations?: FindOptionsRelations<T>): Promise<T> { const entity = await repo.findOne({ where: { id } as FindOptionsWhere<T>, relations }); if (!entity) throw new NotFoundException('Resource not found'); return entity; }
}
