import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentTypeResponseSchema {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Naqd' })
  name: string;

  @ApiProperty({ example: 'cash' })
  code: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ description: 'Tizim yozuvi — o‘chirib bo‘lmaydi.' })
  isSystem: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class PaymentTypeStatsSchema {
  @ApiProperty({ description: 'Jami to‘lov turlari.' })
  total: number;

  @ApiProperty({ description: 'Joriy oyda qo‘shilganlar.' })
  addedThisMonth: number;

  @ApiPropertyOptional({ nullable: true, description: 'Oxirgi qo‘shilgan to‘lov turi nomi.' })
  latestName?: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true, description: 'Oxirgi qo‘shilgan vaqti.' })
  latestCreatedAt?: Date | null;
}

export class PaymentTypePageMetaSchema {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() pageCount: number;
}

export class PaymentTypeListResponseSchema {
  @ApiProperty({ type: [PaymentTypeResponseSchema] })
  items: PaymentTypeResponseSchema[];

  @ApiProperty({ type: PaymentTypePageMetaSchema })
  meta: PaymentTypePageMetaSchema;

  @ApiProperty({ type: PaymentTypeStatsSchema })
  stats: PaymentTypeStatsSchema;
}
