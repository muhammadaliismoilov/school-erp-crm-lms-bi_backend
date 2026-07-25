import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { PerformanceReviewService } from '../src/modules/hr/performance-review.service';
import type { PerformanceReview } from '../src/modules/hr/entities/performance-review.entity';
import type { StaffMember } from '../src/modules/hr/entities/staff-member.entity';
import { PerformanceReviewStatus } from '../src/modules/hr/enums/hr.enums';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

function makeReview(overrides: Partial<PerformanceReview> = {}): PerformanceReview {
  return {
    id: 'r-1',
    staffMemberId: 'staff-1',
    staffMember: { firstName: 'Ali', lastName: 'Valiyev' } as StaffMember,
    reviewerId: null,
    reviewer: null,
    periodStart: '2026-01-01',
    periodEnd: '2026-06-30',
    overallRating: 4,
    strengths: null,
    improvements: null,
    goals: null,
    notes: null,
    status: PerformanceReviewStatus.COMPLETED,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as PerformanceReview;
}

describe('PerformanceReviewService', () => {
  let reviews: jest.Mocked<
    Pick<Repository<PerformanceReview>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'softDelete'>
  >;
  let staff: jest.Mocked<Pick<Repository<StaffMember>, 'findOne'>>;
  let service: PerformanceReviewService;

  beforeEach(() => {
    reviews = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'r-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    staff = { findOne: jest.fn() };
    service = new PerformanceReviewService(
      reviews as unknown as Repository<PerformanceReview>,
      staff as unknown as Repository<StaffMember>,
      new TenantContextService(),
    );
  });

  describe('createReview', () => {
    it('resolves staff name and keeps the rating', async () => {
      staff.findOne.mockResolvedValue({ id: 'staff-1' } as StaffMember);
      reviews.findOne.mockResolvedValue(makeReview());
      const res = await service.createReview({
        staffMemberId: 'staff-1',
        periodStart: '2026-01-01',
        periodEnd: '2026-06-30',
        overallRating: 4,
      });
      expect(res.staffName).toBe('Valiyev Ali');
      expect(res.overallRating).toBe(4);
    });

    it('rejects an inverted period', async () => {
      staff.findOne.mockResolvedValue({ id: 'staff-1' } as StaffMember);
      await expect(
        service.createReview({ staffMemberId: 'staff-1', periodStart: '2026-06-30', periodEnd: '2026-01-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an unknown staff member', async () => {
      staff.findOne.mockResolvedValue(null);
      await expect(
        service.createReview({ staffMemberId: 'x', periodStart: '2026-01-01', periodEnd: '2026-06-30' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
