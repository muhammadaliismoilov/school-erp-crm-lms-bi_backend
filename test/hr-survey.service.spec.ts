import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { SurveyService } from '../src/modules/hr/survey.service';
import type { Survey } from '../src/modules/hr/entities/survey.entity';
import { SurveyStatus, SurveyType } from '../src/modules/hr/enums/hr.enums';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

function makeSurvey(overrides: Partial<Survey> = {}): Survey {
  return {
    id: 's-1',
    title: 'Xodimlar qoniqishi',
    description: null,
    type: SurveyType.ANONYMOUS,
    status: SurveyStatus.DRAFT,
    isAnonymous: true,
    startDate: '2026-06-02',
    endDate: '2026-06-20',
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as Survey;
}

describe('SurveyService', () => {
  let surveys: jest.Mocked<
    Pick<Repository<Survey>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'softDelete'>
  >;
  let service: SurveyService;

  beforeEach(() => {
    surveys = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 's-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new SurveyService(surveys as unknown as Repository<Survey>, new TenantContextService());
  });

  describe('createSurvey', () => {
    it('always starts as a draft', async () => {
      surveys.findOne.mockResolvedValue(makeSurvey());
      await service.createSurvey({ title: 'Xodimlar qoniqishi', startDate: '2026-06-02', endDate: '2026-06-20' });
      expect(surveys.create.mock.calls[0][0].status).toBe(SurveyStatus.DRAFT);
    });

    it('rejects an end date before the start date', async () => {
      await expect(
        service.createSurvey({ title: 'X', startDate: '2026-06-20', endDate: '2026-06-02' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('publishSurvey', () => {
    it('moves a draft to active', async () => {
      surveys.findOne
        .mockResolvedValueOnce(makeSurvey())
        .mockResolvedValueOnce(makeSurvey({ status: SurveyStatus.ACTIVE }));
      const res = await service.publishSurvey('s-1');
      expect(res.status).toBe(SurveyStatus.ACTIVE);
    });

    it('throws for a missing survey', async () => {
      surveys.findOne.mockResolvedValue(null);
      await expect(service.publishSurvey('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
