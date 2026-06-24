import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { FinanceTransaction } from '../finance/entities/transaction.entity';
import { User } from '../identity/entities/user.entity';
import { PaymentType } from './entities/payment-type.entity';
import { TransactionCategory } from './entities/transaction-category.entity';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FinanceTransaction, PaymentType, TransactionCategory, User]),
    AuditModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
