import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import { CommonStatus } from '../src/common/enums/common-status.enum';
import { AuthService } from '../src/modules/auth/auth.service';

jest.mock('../src/modules/auth/totp.util', () => ({
  verifyTotp: jest.fn().mockReturnValue(true),
  generateTotpSecret: jest.fn(),
  buildOtpauthUrl: jest.fn(),
}));
import type { PasswordService } from '../src/modules/auth/password.service';
import type { SessionRegistryService } from '../src/modules/auth/session-registry.service';
import type { Role } from '../src/modules/identity/entities/role.entity';
import type { User } from '../src/modules/identity/entities/user.entity';
import type { UserSession } from '../src/modules/identity/entities/user-session.entity';
import type { SecurityNotifierService } from '../src/modules/notifications-delivery/security-notifier.service';
import type { SchoolsService } from '../src/modules/schools/schools.service';

describe('AuthService — subdomain-tenant login tekshiruvi', () => {
  const elegantSchoolId = 'a1111111-1111-1111-1111-111111111111';
  const unoSchoolId = 'b2222222-2222-2222-2222-222222222222';

  let users: { createQueryBuilder: jest.Mock; save: jest.Mock };
  let sessions: { save: jest.Mock; create: jest.Mock };
  let passwords: { verify: jest.Mock };
  let schoolsService: { resolveByHostname: jest.Mock };
  let service: AuthService;

  function mockLoginQb(user: unknown) {
    const qb = {
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    };
    users.createQueryBuilder.mockReturnValue(qb);
  }

  function activeUser(overrides: Partial<User> = {}): User {
    return {
      id: 'user-1',
      username: 'ali',
      status: CommonStatus.ACTIVE,
      passwordHash: 'hash',
      twoFactorEnabled: false,
      schoolId: null,
      roles: [],
      ...overrides,
    } as unknown as User;
  }

  beforeEach(() => {
    users = { createQueryBuilder: jest.fn(), save: jest.fn().mockImplementation(async (v) => v) };
    sessions = {
      save: jest.fn().mockImplementation(async (v) => ({ id: 'session-1', ...v })),
      create: jest.fn().mockImplementation((v) => v),
    };
    passwords = { verify: jest.fn().mockResolvedValue(true) };
    schoolsService = { resolveByHostname: jest.fn() };

    service = new AuthService(
      users as unknown as Repository<User>,
      {} as unknown as Repository<Role>,
      sessions as unknown as Repository<UserSession>,
      {} as unknown as SessionRegistryService,
      { maybeNotifyNewLogin: jest.fn(), notifyPasswordChanged: jest.fn() } as unknown as SecurityNotifierService,
      passwords as unknown as PasswordService,
      { signAsync: jest.fn().mockResolvedValue('signed-token') } as unknown as JwtService,
      {
        get: (key: string) => (key === 'JWT_ACCESS_EXPIRES_IN' ? '15m' : undefined),
        getOrThrow: () => 'secret',
      } as unknown as ConfigService,
      schoolsService as unknown as SchoolsService,
    );
  });

  it('tenantHostname berilmasa — tekshiruv o‘tkazilmaydi (eski client/API)', async () => {
    mockLoginQb(activeUser({ schoolId: unoSchoolId }));

    await expect(service.login({ login: 'ali', password: 'p' })).resolves.toHaveProperty('accessToken');
    expect(schoolsService.resolveByHostname).not.toHaveBeenCalled();
  });

  it('to‘g‘ri subdomain — foydalanuvchi o‘z maktabiga mos kelsa kiradi', async () => {
    mockLoginQb(activeUser({ schoolId: elegantSchoolId }));
    schoolsService.resolveByHostname.mockResolvedValue({ schoolId: elegantSchoolId, schoolName: 'Elegant School' });

    await expect(
      service.login({ login: 'ali', password: 'p' }, {}, 'elegantschool.crm.uz'),
    ).resolves.toHaveProperty('accessToken');
  });

  it('boshqa maktab subdomeni — ForbiddenException', async () => {
    mockLoginQb(activeUser({ schoolId: unoSchoolId }));
    schoolsService.resolveByHostname.mockResolvedValue({ schoolId: elegantSchoolId, schoolName: 'Elegant School' });

    await expect(
      service.login({ login: 'ali', password: 'p' }, {}, 'elegantschool.crm.uz'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('resolve topilmasa (noma’lum hostname) — rad etiladi', async () => {
    mockLoginQb(activeUser({ schoolId: unoSchoolId }));
    schoolsService.resolveByHostname.mockResolvedValue(null);

    await expect(
      service.login({ login: 'ali', password: 'p' }, {}, 'boshqa-domen.crm.uz'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('superadmin (schoolId=null) istalgan maktab subdomeniga kiradi', async () => {
    mockLoginQb(activeUser({ schoolId: null }));

    await expect(
      service.login({ login: 'ali', password: 'p' }, {}, 'elegantschool.crm.uz'),
    ).resolves.toHaveProperty('accessToken');
    expect(schoolsService.resolveByHostname).not.toHaveBeenCalled();
  });

  it('superadmin admin.crm.uz orqali kiradi', async () => {
    mockLoginQb(activeUser({ schoolId: null }));

    await expect(
      service.login({ login: 'ali', password: 'p' }, {}, 'admin.crm.uz'),
    ).resolves.toHaveProperty('accessToken');
  });

  it('oddiy maktab useri admin.crm.uz orqali kira olmaydi', async () => {
    mockLoginQb(activeUser({ schoolId: unoSchoolId }));

    await expect(
      service.login({ login: 'ali', password: 'p' }, {}, 'admin.crm.uz'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('parol noto‘g‘ri bo‘lsa tenant tekshiruvidan oldin Unauthorized qaytadi', async () => {
    mockLoginQb(activeUser({ schoolId: unoSchoolId }));
    passwords.verify.mockResolvedValue(false);

    await expect(
      service.login({ login: 'ali', password: 'wrong' }, {}, 'elegantschool.crm.uz'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(schoolsService.resolveByHostname).not.toHaveBeenCalled();
  });

  describe('verifyTwoFactorLogin', () => {
    let jwtService: { verifyAsync: jest.Mock; signAsync: jest.Mock };

    beforeEach(() => {
      jwtService = {
        verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1', purpose: '2fa' }),
        signAsync: jest.fn().mockResolvedValue('signed-token'),
      };
      service = new AuthService(
        users as unknown as Repository<User>,
        {} as unknown as Repository<Role>,
        sessions as unknown as Repository<UserSession>,
        {} as unknown as SessionRegistryService,
        { maybeNotifyNewLogin: jest.fn(), notifyPasswordChanged: jest.fn() } as unknown as SecurityNotifierService,
        passwords as unknown as PasswordService,
        jwtService as unknown as JwtService,
        {
          get: (key: string) => (key === 'JWT_ACCESS_EXPIRES_IN' ? '15m' : undefined),
          getOrThrow: () => 'secret',
        } as unknown as ConfigService,
        schoolsService as unknown as SchoolsService,
      );
    });

    it('boshqa maktab subdomenida 2FA orqali ham rad etiladi', async () => {
      mockLoginQb(
        activeUser({ schoolId: unoSchoolId, twoFactorEnabled: true, twoFactorSecret: 'JBSWY3DPEHPK3PXP' }),
      );
      schoolsService.resolveByHostname.mockResolvedValue({ schoolId: elegantSchoolId, schoolName: 'Elegant School' });

      await expect(
        service.verifyTwoFactorLogin('2fa-token', '123456', {}, 'elegantschool.crm.uz'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
