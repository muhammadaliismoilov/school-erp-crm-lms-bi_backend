import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentPaymentStatus } from '../entities/student-payment.entity';

export class StudentPaymentResponseSchema {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  studentId?: string | null;

  @ApiProperty({ example: 'Aliyev Vali' })
  studentName: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  classId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '5-A' })
  className?: string | null;

  @ApiProperty({ example: 500000 })
  amount: number;

  @ApiPropertyOptional({ example: 600000, nullable: true })
  planAmount?: number | null;

  @ApiProperty({ format: 'date', example: '2026-06-24' })
  paymentDate: string;

  @ApiProperty({ example: 6 })
  month: number;

  @ApiProperty({ example: 2026 })
  year: number;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  paymentTypeId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'To‘lov turi nomi (denormalizatsiya).' })
  paymentTypeName?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'To‘lov turi kodi (cash/card/bank ...).' })
  paymentTypeCode?: string | null;

  @ApiProperty({ example: 'KV-2026-00001' })
  receiptNumber: string;

  @ApiProperty({ enum: StudentPaymentStatus })
  status: StudentPaymentStatus;

  @ApiPropertyOptional({ nullable: true })
  note?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Yozuvni kiritgan foydalanuvchi IDsi.' })
  createdBy?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Yozuvni kiritgan foydalanuvchi ismi (snapshot).' })
  createdByName?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Yozuvni kiritgan foydalanuvchi roli (snapshot).' })
  createdByRole?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Oxirgi o‘zgartirgan foydalanuvchi IDsi.' })
  updatedBy?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Oxirgi o‘zgartirgan foydalanuvchi ismi (snapshot).' })
  updatedByName?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Oxirgi o‘zgartirgan foydalanuvchi roli (snapshot).' })
  updatedByRole?: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  deletedAt?: Date | null;

  @ApiProperty()
  version: number;
}

export class StudentPaymentStatsSchema {
  @ApiProperty({ description: 'Oylik reja — kutilgan jami to‘lov (joriy filtr bo‘yicha).' })
  monthlyPlan: number;

  @ApiProperty({ description: 'Yig‘ilgan — to‘plangan jami summa.' })
  collected: number;

  @ApiProperty({ description: 'Qoldiq = reja − yig‘ilgan (manfiy bo‘lmaydi).' })
  remaining: number;

  @ApiProperty({ description: 'Bugun to‘langan summa.' })
  paidToday: number;

  @ApiProperty({ description: 'To‘lovlar soni.' })
  count: number;
}

export class StudentPaymentPageMetaSchema {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() pageCount: number;
}

export class StudentPaymentListResponseSchema {
  @ApiProperty({ type: [StudentPaymentResponseSchema] })
  items: StudentPaymentResponseSchema[];

  @ApiProperty({ type: StudentPaymentPageMetaSchema })
  meta: StudentPaymentPageMetaSchema;

  @ApiProperty({ type: StudentPaymentStatsSchema })
  stats: StudentPaymentStatsSchema;
}

class PaymentTypeOptionSchema {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty() code: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() sortOrder: number;
}

export class StudentPaymentOptionsSchema {
  @ApiProperty({ type: [PaymentTypeOptionSchema] })
  paymentTypes: PaymentTypeOptionSchema[];
}
