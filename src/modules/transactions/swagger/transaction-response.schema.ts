import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionResponseSchema {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: ['income', 'expense'] })
  type: 'income' | 'expense';

  @ApiProperty({ example: 500000 })
  amount: number;

  @ApiProperty({ format: 'date', example: '2026-06-24' })
  date: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  purposeCategoryId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Kategoriya nomi (denormalizatsiya).' })
  purposeCategoryName?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  paymentTypeId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'To‘lov turi nomi (denormalizatsiya).' })
  paymentTypeName?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  personId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  personName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  personRole?: string | null;

  @ApiPropertyOptional({ example: 6, nullable: true })
  month?: number | null;

  @ApiPropertyOptional({ example: 2026, nullable: true })
  year?: number | null;

  @ApiPropertyOptional({ nullable: true })
  note?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  receiptFileId?: string | null;

  @ApiPropertyOptional({ example: 10, nullable: true })
  discountPercent?: number | null;

  @ApiPropertyOptional({ example: 600000, nullable: true })
  price?: number | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  classId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  studentId?: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  deletedAt?: Date | null;

  @ApiProperty()
  version: number;
}

export class TransactionStatsSchema {
  @ApiProperty({ description: 'Jami kirim summasi (joriy filtr bo‘yicha).' })
  totalIncome: number;

  @ApiProperty({ description: 'Jami chiqim summasi.' })
  totalExpense: number;

  @ApiProperty({ description: 'Balans = kirim − chiqim.' })
  balance: number;

  @ApiProperty({ description: 'Tranzaksiyalar soni.' })
  count: number;
}

export class TransactionPageMetaSchema {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() pageCount: number;
}

export class TransactionListResponseSchema {
  @ApiProperty({ type: [TransactionResponseSchema] })
  items: TransactionResponseSchema[];

  @ApiProperty({ type: TransactionPageMetaSchema })
  meta: TransactionPageMetaSchema;

  @ApiProperty({ type: TransactionStatsSchema })
  stats: TransactionStatsSchema;
}

class MonthlyPointSchema {
  @ApiProperty({ example: 6 }) month: number;
  @ApiProperty() income: number;
  @ApiProperty() expense: number;
  @ApiProperty({ description: 'income − expense' }) net: number;
}

class BreakdownPointSchema {
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) id?: string | null;
  @ApiProperty() name: string;
  @ApiProperty() amount: number;
  @ApiProperty() count: number;
}

export class TransactionStatisticsSchema {
  @ApiProperty({ type: TransactionStatsSchema })
  totals: TransactionStatsSchema;

  @ApiProperty({ type: [MonthlyPointSchema], description: 'Oylar bo‘yicha kirim/chiqim.' })
  monthly: MonthlyPointSchema[];

  @ApiProperty({ type: [BreakdownPointSchema], description: 'Kategoriya bo‘yicha taqsimot.' })
  byCategory: BreakdownPointSchema[];

  @ApiProperty({ type: [BreakdownPointSchema], description: 'To‘lov turi bo‘yicha taqsimot.' })
  byPaymentType: BreakdownPointSchema[];
}

class PaymentTypeOptionSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty() code: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() isSystem: boolean;
  @ApiProperty() sortOrder: number;
}

class CategoryOptionSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: ['income', 'expense', 'both'] }) kind: 'income' | 'expense' | 'both';
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) parentId?: string | null;
  @ApiProperty() isStudentTuition: boolean;
  @ApiProperty() isActive: boolean;
  @ApiProperty() isSystem: boolean;
  @ApiProperty() sortOrder: number;
}

export class TransactionOptionsSchema {
  @ApiProperty({ type: [PaymentTypeOptionSchema] })
  paymentTypes: PaymentTypeOptionSchema[];

  @ApiProperty({ type: [CategoryOptionSchema] })
  categories: CategoryOptionSchema[];
}

export { PaymentTypeOptionSchema, CategoryOptionSchema };
