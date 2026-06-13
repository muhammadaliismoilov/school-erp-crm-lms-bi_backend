import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceInvoice } from './entities/finance-invoice.entity';
import { Scholarship } from './entities/scholarship.entity';
import { Refund } from './entities/refund.entity';
import { Cashbox } from './entities/cashbox.entity';
import { BankTransaction } from './entities/bank-transaction.entity';
import { AdvancedFinanceController } from './advanced-finance.controller';
import { AdvancedFinanceService } from './advanced-finance.service';

@Module({ imports: [TypeOrmModule.forFeature([FinanceInvoice, Scholarship, Refund, Cashbox, BankTransaction])], controllers: [AdvancedFinanceController], providers: [AdvancedFinanceService], exports: [AdvancedFinanceService] })
export class AdvancedFinanceModule {}
