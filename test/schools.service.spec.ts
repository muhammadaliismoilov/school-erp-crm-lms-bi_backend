import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import { CommonStatus } from '../src/common/enums/common-status.enum';
import type { School } from '../src/modules/settings/entities/school.entity';
import { SchoolsService } from '../src/modules/schools/schools.service';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';
import { PaymentPeriodUnit, PaymentStartStrategy, SchoolType, WorkDays } from '../src/modules/schools/enums/school.enums';

describe('SchoolsService', () => {
  const schoolId = 'f0ff63e5-9fc8-4a9a-83de-9453d328d0d7';
  let schools: jest.Mocked<
    Pick<Repository<School>, 'create' | 'save' | 'findOne' | 'find' | 'findAndCount' | 'softDelete' | 'createQueryBuilder'>
  >;
  let statsQueryBuilder: { getRawOne: jest.Mock } & Record<string, jest.Mock>;
  let service: SchoolsService;
  let tenant: TenantContextService;

  beforeEach(() => {
    // Stats aggregatsiyasi uchun zanjirlanadigan query builder mock'i.
    statsQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    };
    schools = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(() => statsQueryBuilder as unknown as SelectQueryBuilder<School>),
    };
    tenant = new TenantContextService();
    service = new SchoolsService(schools as unknown as Repository<School>, tenant);
  });

  const createPayload = {
    name: 'Imkon School',
    legalName: 'Imkon School MCHJ',
    schoolType: SchoolType.PRIVATE,
    totalCapacity: 400,
    elementaryCapacity: 140,
    upperCapacity: 260,
    phone: '+998901234567',
    monthlyPayment: 1000000,
    paymentStartStrategy: PaymentStartStrategy.FULL_ACADEMIC_YEAR,
    paymentPeriodUnit: PaymentPeriodUnit.YEAR,
    workDays: WorkDays.FIVE_DAYS,
  };

  it('creates a school with normalized name, localized name, capacities, and payment settings', async () => {
    schools.findOne.mockResolvedValue(null);
    schools.create.mockImplementation((value) => value as School);
    schools.save.mockImplementation(async (value) => ({
      id: schoolId,
      createdAt: new Date('2026-06-08T00:00:00.000Z'),
      updatedAt: new Date('2026-06-08T00:00:00.000Z'),
      version: 1,
      ...value,
    }) as School);

    const result = await service.createSchool(createPayload);

    expect(schools.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: { uz: 'Imkon School', ru: 'Imkon School', en: 'Imkon School' },
        normalizedName: 'imkon school',
        legalName: 'Imkon School MCHJ',
        schoolType: SchoolType.PRIVATE,
        totalCapacity: 400,
        elementaryCapacity: 140,
        upperCapacity: 260,
        status: CommonStatus.ACTIVE,
      }),
    );
    expect(result).toMatchObject({
      id: schoolId,
      name: 'Imkon School',
      schoolType: SchoolType.PRIVATE,
      capacities: { total: 400, elementary: 140, upper: 260 },
      payment: { monthlyPayment: 1000000 },
    });
  });

  it('rejects duplicate active school name', async () => {
    schools.findOne.mockResolvedValue({ id: schoolId } as School);

    await expect(service.createSchool(createPayload)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects capacity totals that do not match section capacities', async () => {
    await expect(
      service.createSchool({
        ...createPayload,
        totalCapacity: 400,
        elementaryCapacity: 100,
        upperCapacity: 260,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns paginated schools with stats for the management table', async () => {
    const entity = {
      id: schoolId,
      name: { uz: 'Imkon School', ru: 'Imkon School', en: 'Imkon School' },
      normalizedName: 'imkon school',
      schoolType: SchoolType.PRIVATE,
      totalCapacity: 400,
      elementaryCapacity: 140,
      upperCapacity: 260,
      monthlyPayment: 1000000,
      status: CommonStatus.ACTIVE,
      createdAt: new Date('2026-06-08T00:00:00.000Z'),
      updatedAt: new Date('2026-06-08T00:00:00.000Z'),
      version: 1,
    } as School;
    schools.findAndCount.mockResolvedValue([[entity], 1]);
    schools.find.mockResolvedValue([entity]);
    statsQueryBuilder.getRawOne.mockResolvedValue({
      count: '1',
      totalCapacity: '400',
      monthlyPaymentTotal: '1000000',
    });

    const result = await service.findSchools({ page: 1, limit: 20 });

    expect(result.stats).toEqual({
      schoolCount: 1,
      totalCapacity: 400,
      monthlyPaymentTotal: 1000000,
    });
    expect(result.items).toHaveLength(1);
  });

  it('updates a school and preserves existing values when fields are omitted', async () => {
    schools.findOne.mockResolvedValueOnce({
      id: schoolId,
      name: { uz: 'Imkon School', ru: 'Imkon School', en: 'Imkon School' },
      normalizedName: 'imkon school',
      schoolType: SchoolType.PRIVATE,
      totalCapacity: 400,
      elementaryCapacity: 140,
      upperCapacity: 260,
      status: CommonStatus.ACTIVE,
    } as School).mockResolvedValueOnce(null);
    schools.save.mockImplementation(async (value) => value as School);

    const result = await service.updateSchool(schoolId, { name: 'Imkon School Plus' });

    expect(schools.save).toHaveBeenCalledWith(expect.objectContaining({ normalizedName: 'imkon school plus' }));
    expect(result.name).toBe('Imkon School Plus');
  });

  it('throws NotFoundException when school does not exist', async () => {
    schools.findOne.mockResolvedValue(null);

    await expect(service.findSchool(schoolId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('archives a school with soft delete', async () => {
    schools.findOne.mockResolvedValue({ id: schoolId } as School);
    schools.softDelete.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

    await service.deleteSchool(schoolId);

    expect(schools.softDelete).toHaveBeenCalledWith(schoolId);
  });

  describe('resolveByHostname', () => {
    const activeSchool = {
      id: schoolId,
      name: { uz: 'Elegant School', ru: 'Elegant School', en: 'Elegant School' },
      normalizedName: 'elegant school',
      websiteUrl: 'http://elegantschool.crm.uz',
      logoUrl: 'https://cdn.example.uz/elegant-logo.png',
      status: CommonStatus.ACTIVE,
    } as School;

    it('resolves a school by its website_url hostname', async () => {
      schools.find.mockResolvedValue([activeSchool]);

      const result = await service.resolveByHostname('elegantschool.crm.uz');

      expect(result).toEqual({
        schoolId,
        schoolName: 'Elegant School',
        logoUrl: 'https://cdn.example.uz/elegant-logo.png',
      });
    });

    it('matches case-insensitively and ignores a leading www.', async () => {
      schools.find.mockResolvedValue([activeSchool]);

      const result = await service.resolveByHostname('WWW.ElegantSchool.CRM.UZ');

      expect(result?.schoolId).toBe(schoolId);
    });

    it('matches by subdomain label regardless of root domain (local dev *.localhost)', async () => {
      schools.find.mockResolvedValue([activeSchool]);

      const result = await service.resolveByHostname('elegantschool.localhost:3000');

      expect(result?.schoolId).toBe(schoolId);
    });

    it('returns null for an unknown hostname', async () => {
      schools.find.mockResolvedValue([activeSchool]);

      const result = await service.resolveByHostname('unknown.crm.uz');

      expect(result).toBeNull();
    });

    it('skips schools with a missing or malformed website_url', async () => {
      schools.find.mockResolvedValue([
        { ...activeSchool, websiteUrl: null },
        { ...activeSchool, id: 'other-id', websiteUrl: 'not a url' },
      ] as School[]);

      const result = await service.resolveByHostname('elegantschool.crm.uz');

      expect(result).toBeNull();
    });

    it('caches resolved entries and only re-queries after invalidation', async () => {
      schools.find.mockResolvedValue([activeSchool]);

      await service.resolveByHostname('elegantschool.crm.uz');
      await service.resolveByHostname('elegantschool.crm.uz');

      expect(schools.find).toHaveBeenCalledTimes(1);

      schools.findOne.mockResolvedValueOnce(activeSchool).mockResolvedValueOnce(null);
      schools.save.mockImplementation(async (value) => value as School);
      await service.updateSchool(schoolId, { name: 'Elegant School' });

      await service.resolveByHostname('elegantschool.crm.uz');

      expect(schools.find).toHaveBeenCalledTimes(2);
    });
  });
  /**
   * 2026-08-28: maktab direktori "Maktab ma'lumotlari" bo'limida BARCHA
   * maktablarni ko'rardi — `findSchools`/`aggregateStats`/`findSchoolEntity`
   * da tenant filtri umuman yo'q edi. `School` uchun tenant kaliti `school_id`
   * emas, `id` ning O'ZI: maktab jadvali ijarachining o'zi.
   */
  describe('tenant scoping', () => {
    const boshqaMaktab = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

    async function maktabKontekstida<T>(run: () => Promise<T>): Promise<T> {
      return tenant.run(async () => {
        tenant.set({ schoolId });
        return run();
      });
    }

    beforeEach(() => {
      schools.findAndCount.mockResolvedValue([[], 0]);
      statsQueryBuilder.getRawOne.mockResolvedValue({ count: '0', totalCapacity: '0', monthlyPaymentTotal: '0' });
    });

    it("ro'yxat faqat o'z maktabi bilan cheklanadi", async () => {
      await maktabKontekstida(() => service.findSchools({}));

      expect(schools.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: schoolId }) }),
      );
    });

    it('statistika ham cheklanadi — begona jamlanma chiqmasin', async () => {
      await maktabKontekstida(() => service.findSchools({}));

      expect(statsQueryBuilder.andWhere).toHaveBeenCalledWith('school.id = :tenantSchoolId', {
        tenantSchoolId: schoolId,
      });
    });

    it("begona maktab so'ralsa 404 — DBga umuman bormaydi", async () => {
      await expect(maktabKontekstida(() => service.findSchool(boshqaMaktab))).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(schools.findOne).not.toHaveBeenCalled();
    });

    it("begona maktabni o'chirib/tahrirlab ham bo'lmaydi", async () => {
      // MUHIM: maktab bazada MAVJUD deb qaytariladi — ya'ni 404 ning yagona
      // sababi scoping bo'lsin, "topilmadi" tasodifi emas.
      schools.findOne.mockResolvedValue({ id: boshqaMaktab, name: { uz: 'Begona' } } as unknown as School);

      await expect(
        maktabKontekstida(() => service.updateSchool(boshqaMaktab, { name: 'Buzishga urinish' })),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(maktabKontekstida(() => service.deleteSchool(boshqaMaktab))).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(schools.softDelete).not.toHaveBeenCalled();
    });

    it("kontekst yo'q bo'lsa (global CEO) filtr QO'LLANMAYDI", async () => {
      await service.findSchools({});

      expect(schools.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.not.objectContaining({ id: expect.anything() }) }),
      );
      expect(statsQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'school.id = :tenantSchoolId',
        expect.anything(),
      );
    });

    it("login paytida (kontekstsiz) maktab nomi qidiruvi ISHLAYDI", async () => {
      // `AuthService.schoolNameFor` shu yo'ldan o'tadi: o'sha paytda hali
      // foydalanuvchi yo'q, ya'ni kontekst bo'sh. Scoping uni buzmasligi shart.
      schools.findOne.mockResolvedValue({ id: boshqaMaktab, name: { uz: 'Elegant School' } } as unknown as School);

      await expect(service.findSchool(boshqaMaktab)).resolves.toMatchObject({ name: 'Elegant School' });
    });
  });
});
