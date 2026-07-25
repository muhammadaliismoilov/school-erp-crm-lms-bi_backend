import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import { AuthService } from '../src/modules/auth/auth.service';
import type { PasswordService } from '../src/modules/auth/password.service';
import type { SessionRegistryService } from '../src/modules/auth/session-registry.service';
import type { User } from '../src/modules/identity/entities/user.entity';
import type { Role } from '../src/modules/identity/entities/role.entity';
import type { UserSession } from '../src/modules/identity/entities/user-session.entity';
import type { SecurityNotifierService } from '../src/modules/notifications-delivery/security-notifier.service';

describe('AuthService — sessiya boshqaruvi (S2)', () => {
  let users: { createQueryBuilder: jest.Mock; save: jest.Mock };
  let sessions: { find: jest.Mock };
  let registry: { revokeSession: jest.Mock; revokeAllForUser: jest.Mock };
  let passwords: { verify: jest.Mock; hash: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    users = { createQueryBuilder: jest.fn(), save: jest.fn().mockImplementation(async (v) => v) };
    sessions = { find: jest.fn().mockResolvedValue([]) };
    registry = {
      revokeSession: jest.fn().mockResolvedValue(true),
      revokeAllForUser: jest.fn().mockResolvedValue(2),
    };
    passwords = { verify: jest.fn().mockResolvedValue(true), hash: jest.fn().mockResolvedValue('new-hash') };
    service = new AuthService(
      users as unknown as Repository<User>,
      {} as unknown as Repository<Role>,
      sessions as unknown as Repository<UserSession>,
      registry as unknown as SessionRegistryService,
      { maybeNotifyNewLogin: jest.fn(), notifyPasswordChanged: jest.fn() } as unknown as SecurityNotifierService,
      passwords as unknown as PasswordService,
      {} as unknown as JwtService,
      { get: () => undefined, getOrThrow: () => 'secret' } as unknown as ConfigService,
    );
  });

  it('listSessions — faqat faol/muddati o‘tmaganlar, joriysi belgilanadi', async () => {
    const future = new Date(Date.now() + 86_400_000);
    const past = new Date(Date.now() - 1000);
    sessions.find.mockResolvedValue([
      { id: 'cur', deviceInfo: 'Chrome 126 · Linux', ipAddress: '1.1.1.1', createdAt: new Date(), lastSeenAt: new Date(), expiresAt: future },
      { id: 'other', deviceInfo: 'Safari 17 · iPhone', ipAddress: '2.2.2.2', createdAt: new Date(), lastSeenAt: null, expiresAt: future },
      { id: 'expired', deviceInfo: null, ipAddress: null, createdAt: new Date(), lastSeenAt: null, expiresAt: past },
    ]);
    const list = await service.listSessions('user-1', 'cur');
    expect(list).toHaveLength(2); // muddati o'tgani chiqmaydi
    expect(list.find((s) => s.id === 'cur')?.current).toBe(true);
    expect(list.find((s) => s.id === 'other')?.current).toBe(false);
  });

  it('revokeSession — joriy sessiyani chiqarish taqiqlanadi (logout ishlatilsin)', async () => {
    await expect(service.revokeSession('user-1', 'cur', 'cur')).rejects.toBeInstanceOf(BadRequestException);
    expect(registry.revokeSession).not.toHaveBeenCalled();
  });

  it('revokeSession — topilmasa NotFound (boshqa userniki ham shunday ko‘rinadi — IDOR)', async () => {
    registry.revokeSession.mockResolvedValue(false);
    await expect(service.revokeSession('user-1', 'begona', 'cur')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('revokeOtherSessions — registry to‘g‘ri chaqiriladi', async () => {
    const res = await service.revokeOtherSessions('user-1', 'cur');
    expect(registry.revokeAllForUser).toHaveBeenCalledWith('user-1', 'cur');
    expect(res).toEqual({ revokedCount: 2 });
  });

  describe('changePassword', () => {
    function mockUserQb(user: unknown) {
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(user),
      };
      users.createQueryBuilder.mockReturnValue(qb);
    }

    it('eski parol noto‘g‘ri bo‘lsa Unauthorized', async () => {
      mockUserQb({ id: 'user-1', passwordHash: 'h' });
      passwords.verify.mockResolvedValue(false);
      await expect(
        service.changePassword('user-1', { currentPassword: 'wrong-pass', newPassword: 'new-pass-123' }, 'cur'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(users.save).not.toHaveBeenCalled();
    });

    it('yangi parol eskisi bilan bir xil bo‘lsa BadRequest', async () => {
      mockUserQb({ id: 'user-1', passwordHash: 'h' });
      await expect(
        service.changePassword('user-1', { currentPassword: 'same-pass-1', newPassword: 'same-pass-1' }, 'cur'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('muvaffaqiyat: hash yangilanadi, boshqa sessiyalar bekor, joriysi qoladi', async () => {
      mockUserQb({ id: 'user-1', passwordHash: 'old-hash' });
      const res = await service.changePassword(
        'user-1',
        { currentPassword: 'old-pass-123', newPassword: 'new-pass-456' },
        'cur',
      );
      expect(passwords.hash).toHaveBeenCalledWith('new-pass-456');
      expect(users.save).toHaveBeenCalledWith(expect.objectContaining({ passwordHash: 'new-hash' }));
      expect(registry.revokeAllForUser).toHaveBeenCalledWith('user-1', 'cur');
      expect(res).toEqual({ changed: true, revokedOtherSessions: 2 });
    });
  });
});
