import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { InteractionService } from '../src/modules/hr/interaction.service';
import { Interaction } from '../src/modules/hr/entities/interaction.entity';
import { InteractionStatus, InteractionType } from '../src/modules/hr/enums/hr.enums';

function makeInteraction(overrides: Partial<Interaction> = {}): Interaction {
  return {
    id: 'i-1',
    title: 'Birinchi suhbat',
    type: InteractionType.INTERVIEW,
    status: InteractionStatus.PLANNED,
    candidateId: null,
    candidate: null,
    location: null,
    scheduledAt: null,
    endAt: null,
    purpose: null,
    description: null,
    result: null,
    summary: null,
    nextSteps: null,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as Interaction;
}

describe('InteractionService', () => {
  let interactions: jest.Mocked<
    Pick<Repository<Interaction>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'softDelete'>
  >;
  let service: InteractionService;

  beforeEach(() => {
    interactions = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'i-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new InteractionService(interactions as unknown as Repository<Interaction>);
  });

  describe('createInteraction', () => {
    it('parses scheduledAt into a Date and defaults status to planned', async () => {
      interactions.findOne.mockResolvedValue(makeInteraction());
      await service.createInteraction({
        title: 'Birinchi suhbat',
        type: InteractionType.INTERVIEW,
        scheduledAt: '2026-07-01T10:00:00Z',
      });
      const created = interactions.create.mock.calls[0][0];
      expect(created.scheduledAt).toBeInstanceOf(Date);
      expect(created.status).toBe(InteractionStatus.PLANNED);
    });
  });

  describe('updateInteraction', () => {
    it('marks the interaction completed', async () => {
      interactions.findOne
        .mockResolvedValueOnce(makeInteraction())
        .mockResolvedValueOnce(makeInteraction({ status: InteractionStatus.COMPLETED }));
      const res = await service.updateInteraction('i-1', { status: InteractionStatus.COMPLETED });
      expect(res.status).toBe(InteractionStatus.COMPLETED);
    });

    it('throws for a missing interaction', async () => {
      interactions.findOne.mockResolvedValue(null);
      await expect(service.updateInteraction('x', { title: 'Z' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
