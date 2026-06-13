import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccount } from './entities/bank-account.entity';
import { ContractType } from './entities/contract-type.entity';
import { Contract } from './entities/contract.entity';
import { Discount } from './entities/discount.entity';
import { PaymentPlan } from './entities/payment-plan.entity';
import { Payment } from './entities/payment.entity';
import { FinanceTransaction } from './entities/transaction.entity';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContractType,
      Contract,
      PaymentPlan,
      Payment,
      BankAccount,
      FinanceTransaction,
      Discount,
    ]),
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
