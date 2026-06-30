import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { FinanceTransaction } from '../finance/entities/transaction.entity';
import { User } from '../identity/entities/user.entity';
import { PaymentType } from './entities/payment-type.entity';
import { TransactionCategory } from './entities/transaction-category.entity';
import { TransactionChangeRequest } from './entities/transaction-change-request.entity';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionChangeRequestController } from './transaction-change-request.controller';
import { TransactionChangeRequestService } from './transaction-change-request.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinanceTransaction,
      PaymentType,
      TransactionCategory,
      TransactionChangeRequest,
      User,
    ]),
    AuditModule,
  ],
  controllers: [TransactionsController, TransactionChangeRequestController],
  providers: [TransactionsService, TransactionChangeRequestService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
