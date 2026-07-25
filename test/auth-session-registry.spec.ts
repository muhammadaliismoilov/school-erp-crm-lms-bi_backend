import type { Repository } from 'typeorm';
import { SessionRegistryService } from '../src/modules/auth/session-registry.service';
import type { UserSession } from '../src/modules/identity/entities/user-session.entity';
import { parseDeviceInfo } from '../src/modules/auth/device-info.util';

describe('SessionRegistryService', () => {
  let sessions: { findOne: jest.Mock; update: jest.Mock; find: jest.Mock };
  let service: SessionRegistryService;

  const aliveSession = {
    id: 'sess-1',
    revokedAt: null,
    expiresAt: new Date(Date.now() + 86_400_000),
  };

  beforeEach(() => {
    sessions = {
      findOne: jest.fn().mockResolvedValue(aliveSession),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      find: jest.fn().mockResolvedValue([]),
    };
    service = new SessionRegistryService(sessions as unknown as Repository<UserSession>);
  });

  it('isAlive — tirik sessiya true, natija keshlanadi (ikkinchi chaqiruv DBsiz)', async () => {
    expect(await service.isAlive('sess-1')).toBe(true);
    expect(await service.isAlive('sess-1')).toBe(true);
    expect(sessions.findOne).toHaveBeenCalledTimes(1); // 2-chaqiruv keshdan
  });

  it('isAlive — bekor qilingan yoki muddati o‘tgan sessiya false', async () => {
    sessions.findOne.mockResolvedValue({ ...aliveSession, revokedAt: new Date() });
    expect(await service.isAlive('sess-2')).toBe(false);

    sessions.findOne.mockResolvedValue({ ...aliveSession, expiresAt: new Date(Date.now() - 1000) });
    expect(await service.isAlive('sess-3')).toBe(false);

    sessions.findOne.mockResolvedValue(null);
    expect(await service.isAlive('sess-4')).toBe(false);
  });

  it('revokeSession — faqat o‘z useriniki bekor bo‘ladi va kesh darhol false bo‘ladi', async () => {
    await service.isAlive('sess-1'); // keshga true tushdi
    const ok = await service.revokeSession('sess-1', 'user-1');
    expect(ok).toBe(true);
    expect(sessions.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sess-1', userId: 'user-1' }),
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
    // Kesh yangilangan — 30s kutmasdan darhol o'lik.
    expect(await service.isAlive('sess-1')).toBe(false);
  });

  it('revokeAllForUser — joriy sessiyadan tashqari hammasi bekor', async () => {
    sessions.find.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const n = await service.revokeAllForUser('user-1', 'current');
    expect(n).toBe(2);
    expect(sessions.update).toHaveBeenCalledWith(['a', 'b'], expect.objectContaining({ revokedAt: expect.any(Date) }));
    expect(await service.isAlive('a')).toBe(false);
    expect(await service.isAlive('b')).toBe(false);
  });

  it('touch — throttle: ketma-ket chaqiruvda faqat bitta UPDATE', async () => {
    service.touch('sess-1');
    service.touch('sess-1');
    service.touch('sess-1');
    await new Promise((r) => setImmediate(r));
    expect(sessions.update).toHaveBeenCalledTimes(1);
  });
});

describe('parseDeviceInfo', () => {
  it('Chrome/Linux, Safari/iPhone, Edge/Windows to‘g‘ri aniqlanadi', () => {
    expect(
      parseDeviceInfo('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'),
    ).toBe('Chrome 126 · Linux');
    expect(
      parseDeviceInfo('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'),
    ).toBe('Safari 17 · iPhone');
    expect(
      parseDeviceInfo('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'),
    ).toBe('Edge 126 · Windows');
  });

  it('bo‘sh yoki notanish UA — null yoki qisqartirilgan xom satr', () => {
    expect(parseDeviceInfo(null)).toBeNull();
    expect(parseDeviceInfo(undefined)).toBeNull();
    expect(parseDeviceInfo('curl/8.5.0')).toBe('curl/8.5.0');
  });
});
