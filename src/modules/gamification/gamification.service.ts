import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddCoinTransactionDto, AwardBadgeDto, CreateBadgeDto, CreateCoinPresetDto, UpdateBadgeDto, UpdateCoinPresetDto } from './dto/gamification.dto';
import { Badge } from './entities/badge.entity';
import { CoinPreset } from './entities/coin-preset.entity';
import { CoinTransaction } from './entities/coin-transaction.entity';
import { StudentBadge } from './entities/student-badge.entity';
import { StudentCoinWallet } from './entities/student-wallet.entity';
import { WalletTransactionType } from './enums/gamification.enums';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { tenantWhere } from '../../common/tenant/tenant-scope.util';
@Injectable()
export class GamificationService {
  constructor(@InjectRepository(Badge) private badges: Repository<Badge>, @InjectRepository(StudentBadge) private studentBadges: Repository<StudentBadge>, @InjectRepository(StudentCoinWallet) private wallets: Repository<StudentCoinWallet>, @InjectRepository(CoinTransaction) private transactions: Repository<CoinTransaction>, @InjectRepository(CoinPreset) private coinPresets: Repository<CoinPreset>, private readonly tenant: TenantContextService) {}
  findCoinPresets(onlyActive = false) { return this.coinPresets.find({ where: tenantWhere<CoinPreset>(this.tenant, onlyActive ? { isActive: true } : {}, { branch: true }), order: { sortOrder: 'ASC', createdAt: 'ASC' } }); }
  createCoinPreset(dto: CreateCoinPresetDto) { return this.coinPresets.save(this.coinPresets.create(dto)); }
  async updateCoinPreset(id: string, dto: UpdateCoinPresetDto) { const existing = await this.coinPresets.findOne({ where: tenantWhere<CoinPreset>(this.tenant, { id }, { branch: true }) }); if (!existing) throw new NotFoundException('Coin preset not found'); const e = await this.coinPresets.preload({ id, ...dto }); if (!e) throw new NotFoundException('Coin preset not found'); return this.coinPresets.save(e); }
  async deleteCoinPreset(id: string) { const e = await this.coinPresets.findOne({ where: tenantWhere<CoinPreset>(this.tenant, { id }, { branch: true }) }); if (!e) throw new NotFoundException('Coin preset not found'); await this.coinPresets.softRemove(e); }
  findBadges() { return this.badges.find({ where: tenantWhere<Badge>(this.tenant, {}, { branch: true }), order: { createdAt: 'DESC' } }); }
  createBadge(dto: CreateBadgeDto) { return this.badges.save(this.badges.create(dto)); }
  async updateBadge(id: string, dto: UpdateBadgeDto) { const existing = await this.badges.findOne({ where: tenantWhere<Badge>(this.tenant, { id }, { branch: true }) }); if (!existing) throw new NotFoundException('Badge not found'); const e = await this.badges.preload({ id, ...dto }); if (!e) throw new NotFoundException('Badge not found'); return this.badges.save(e); }
  async awardBadge(dto: AwardBadgeDto) { return this.studentBadges.save(this.studentBadges.create(dto)); }
  async getWallet(studentId: string) { let wallet = await this.wallets.findOne({ where: tenantWhere<StudentCoinWallet>(this.tenant, { studentId }, { branch: true }) }); if (!wallet) wallet = await this.wallets.save(this.wallets.create({ studentId })); return wallet; }
  async addTransaction(dto: AddCoinTransactionDto) { const wallet = await this.getWallet(dto.studentId); const delta = dto.type === WalletTransactionType.SPEND ? -dto.amount : dto.amount; if (wallet.balance + delta < 0) throw new BadRequestException('Insufficient coin balance'); wallet.balance += delta; if (dto.type === WalletTransactionType.SPEND) wallet.totalSpent += dto.amount; else wallet.totalEarned += dto.amount; await this.wallets.save(wallet); return this.transactions.save(this.transactions.create(dto)); }
  findTransactions(studentId?: string) { return this.transactions.find({ where: tenantWhere<CoinTransaction>(this.tenant, studentId ? { studentId } : {}, { branch: true }), order: { createdAt: 'DESC' } }); }
}
