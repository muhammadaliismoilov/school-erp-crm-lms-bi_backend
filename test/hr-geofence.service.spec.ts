import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { GeofenceService } from '../src/modules/hr/geofence.service';
import { Geofence } from '../src/modules/hr/entities/geofence.entity';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';

function makeGeofence(overrides: Partial<Geofence> = {}): Geofence {
  return {
    id: 'gf-1',
    name: 'Bosh ofis',
    latitude: 41.3,
    longitude: 69.2,
    radiusM: 100,
    isActive: true,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  } as Geofence;
}

describe('GeofenceService', () => {
  let geofences: jest.Mocked<
    Pick<Repository<Geofence>, 'createQueryBuilder' | 'create' | 'save' | 'findOne' | 'softDelete' | 'find'>
  >;
  let service: GeofenceService;

  beforeEach(() => {
    geofences = {
      createQueryBuilder: jest.fn(),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({ id: 'gf-1', ...v })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
      find: jest.fn(),
    };
    service = new GeofenceService(geofences as unknown as Repository<Geofence>, new TenantContextService());
  });

  describe('createGeofence', () => {
    it('persists coordinates and radius', async () => {
      geofences.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(makeGeofence());
      const res = await service.createGeofence({ name: 'Bosh ofis', latitude: 41.3, longitude: 69.2, radiusM: 100 });
      expect(res.latitude).toBe(41.3);
      expect(res.radiusM).toBe(100);
      expect(res.isActive).toBe(true);
    });

    it('rejects a duplicate name', async () => {
      geofences.findOne.mockResolvedValue(makeGeofence());
      await expect(service.createGeofence({ name: 'Bosh ofis' })).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('removeGeofence', () => {
    it('throws when missing', async () => {
      geofences.findOne.mockResolvedValue(null);
      await expect(service.removeGeofence('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
