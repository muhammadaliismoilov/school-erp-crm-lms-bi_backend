import { validateDto } from '../src/common/validation/validate-dto';
import { CommonStatus } from '../src/common/enums/common-status.enum';
import { CreateSchoolDto } from '../src/modules/schools/dto/create-school.dto';
import { SchoolQueryDto } from '../src/modules/schools/dto/school-query.dto';
import { UpdateSchoolDto } from '../src/modules/schools/dto/update-school.dto';
import { PaymentPeriodUnit, PaymentStartStrategy, SchoolType, WorkDays } from '../src/modules/schools/enums/school.enums';

describe('CreateSchoolDto', () => {
  it('accepts a production-ready school payload', async () => {
    const errors = await validateDto(CreateSchoolDto, {
      name: 'Toshkent Intellekt Maktabi',
      legalName: 'Toshkent Intellekt Xususiy Maktabi MCHJ',
      region: 'Toshkent shahri',
      district: 'Yunusobod tumani',
      address: 'Yunusobod tumani, 4-mavze, 15-uy',
      websiteUrl: 'https://intellekt.example.uz',
      schoolType: SchoolType.PRIVATE,
      email: 'info@example.uz',
      phone: '+998712345678',
      monthlyPayment: 1200000,
      paymentStartStrategy: PaymentStartStrategy.FULL_ACADEMIC_YEAR,
      paymentPeriodUnit: PaymentPeriodUnit.YEAR,
      workDays: WorkDays.FIVE_DAYS,
      separateGroupPayments: true,
      groupMonthlyPayments: [{ groupName: '1A', amount: 900000 }],
      totalCapacity: 400,
      elementaryCapacity: 140,
      upperCapacity: 260,
      logoUrl: 'https://cdn.example.uz/logo.png',
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid school fields and unknown properties', async () => {
    const errors = await validateDto(CreateSchoolDto, {
      name: '',
      schoolType: 'unknown',
      email: 'not-email',
      phone: '12345',
      monthlyPayment: -1,
      paymentStartStrategy: 'wrong',
      paymentPeriodUnit: 'week',
      workDays: 'two',
      totalCapacity: 0,
      elementaryCapacity: -1,
      upperCapacity: -1,
      logoFileId: 'not-uuid',
      extra: 'forbidden',
    });

    const serialized = JSON.stringify(errors);
    expect(serialized).toContain('name');
    expect(serialized).toContain('schoolType');
    expect(serialized).toContain('email');
    expect(serialized).toContain('phone');
    expect(serialized).toContain('monthlyPayment');
    expect(serialized).toContain('paymentStartStrategy');
    expect(serialized).toContain('paymentPeriodUnit');
    expect(serialized).toContain('workDays');
    expect(serialized).toContain('totalCapacity');
    expect(serialized).toContain('elementaryCapacity');
    expect(serialized).toContain('upperCapacity');
    expect(serialized).toContain('logoFileId');
    expect(serialized).toContain('extra');
  });
});

describe('UpdateSchoolDto', () => {
  it('accepts partial update payload', async () => {
    const errors = await validateDto(UpdateSchoolDto, {
      name: 'Imkon School',
      status: CommonStatus.ACTIVE,
    });

    expect(errors).toHaveLength(0);
  });
});

describe('SchoolQueryDto', () => {
  it('accepts filters used by school management page', async () => {
    const errors = await validateDto(SchoolQueryDto, {
      search: 'imkon',
      schoolType: SchoolType.PRIVATE,
      status: CommonStatus.ACTIVE,
      page: 1,
      limit: 20,
    });

    expect(errors).toHaveLength(0);
  });
});
