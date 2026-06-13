import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddCoinTransactionDto, AwardBadgeDto, CreateBadgeDto, UpdateBadgeDto } from './dto/gamification.dto';
import { Badge } from './entities/badge.entity';
import { CoinTransaction } from './entities/coin-transaction.entity';
import { StudentBadge } from './entities/student-badge.entity';
import { StudentCoinWallet } from './entities/student-wallet.entity';
import { WalletTransactionType } from './enums/gamification.enums';
@Injectable()
export class GamificationService {
  constructor(@InjectRepository(Badge) private badges: Repository<Badge>, @InjectRepository(StudentBadge) private studentBadges: Repository<StudentBadge>, @InjectRepository(StudentCoinWallet) private wallets: Repository<StudentCoinWallet>, @InjectRepository(CoinTransaction) private transactions: Repository<CoinTransaction>) {}
  findBadges() { return this.badges.find({ order: { createdAt: 'DESC' } }); }
  createBadge(dto: CreateBadgeDto) { return this.badges.save(this.badges.create(dto)); }
  async updateBadge(id: string, dto: UpdateBadgeDto) { const e = await this.badges.preload({ id, ...dto }); if (!e) throw new NotFoundException('Badge not found'); return this.badges.save(e); }
  async awardBadge(dto: AwardBadgeDto) { return this.studentBadges.save(this.studentBadges.create(dto)); }
  async getWallet(studentId: string) { let wallet = await this.wallets.findOne({ where: { studentId } }); if (!wallet) wallet = await this.wallets.save(this.wallets.create({ studentId })); return wallet; }
  async addTransaction(dto: AddCoinTransactionDto) { const wallet = await this.getWallet(dto.studentId); const delta = dto.type === WalletTransactionType.SPEND ? -dto.amount : dto.amount; if (wallet.balance + delta < 0) throw new BadRequestException('Insufficient coin balance'); wallet.balance += delta; if (dto.type === WalletTransactionType.SPEND) wallet.totalSpent += dto.amount; else wallet.totalEarned += dto.amount; await this.wallets.save(wallet); return this.transactions.save(this.transactions.create(dto)); }
  findTransactions(studentId?: string) { return this.transactions.find({ where: studentId ? { studentId } : {}, order: { createdAt: 'DESC' } }); }
}
