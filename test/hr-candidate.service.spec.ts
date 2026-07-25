import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { CandidateService } from '../src/modules/hr/candidate.service';
import type { Candidate } from '../src/modules/hr/entities/candidate.entity';
import { CandidateStage } from '../src/modules/hr/enums/hr.enums';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 'c-1',
    firstName: 'Aziz',
    lastName: 'Karimov',
    email: 'aziz@example.com',
    phone: null,
    vacancyId: null,
    vacancy: null,
    recruiterId: null,
    recruiter: null,
    stage: CandidateStage.NEW,
    stageStatus: null,
    notes: null,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as Candidate;
}

describe('CandidateService', () => {
  let candidates: jest.Mocked<
    Pick<Repository<Candidate>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'softDelete'>
  >;
  let service: CandidateService;

  beforeEach(() => {
    candidates = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'c-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new CandidateService(candidates as unknown as Repository<Candidate>, new TenantContextService());
  });

  describe('createCandidate', () => {
    it('defaults the stage to "new" and builds a full name', async () => {
      candidates.findOne.mockResolvedValue(makeCandidate());
      const res = await service.createCandidate({
        firstName: 'Aziz',
        lastName: 'Karimov',
        email: 'aziz@example.com',
      });
      expect(candidates.create.mock.calls[0][0].stage).toBe(CandidateStage.NEW);
      expect(res.fullName).toBe('Aziz Karimov');
    });
  });

  describe('updateStage', () => {
    it('advances the candidate to the interview stage with a status note', async () => {
      candidates.findOne
        .mockResolvedValueOnce(makeCandidate())
        .mockResolvedValueOnce(makeCandidate({ stage: CandidateStage.INTERVIEW, stageStatus: 'Birinchi suhbat' }));
      const res = await service.updateStage('c-1', {
        stage: CandidateStage.INTERVIEW,
        stageStatus: 'Birinchi suhbat',
      });
      expect(res.stage).toBe(CandidateStage.INTERVIEW);
      expect(res.stageStatus).toBe('Birinchi suhbat');
    });

    it('throws when the candidate is missing', async () => {
      candidates.findOne.mockResolvedValue(null);
      await expect(
        service.updateStage('x', { stage: CandidateStage.HIRED }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
