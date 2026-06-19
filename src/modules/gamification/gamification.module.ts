import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Badge } from './entities/badge.entity';
import { CoinPreset } from './entities/coin-preset.entity';
import { CoinTransaction } from './entities/coin-transaction.entity';
import { StudentBadge } from './entities/student-badge.entity';
import { StudentCoinWallet } from './entities/student-wallet.entity';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
@Module({ imports: [TypeOrmModule.forFeature([Badge, StudentBadge, StudentCoinWallet, CoinTransaction, CoinPreset])], controllers: [GamificationController], providers: [GamificationService], exports: [GamificationService] })
export class GamificationModule {}
