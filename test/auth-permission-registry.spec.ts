import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import { CommonStatus } from '../src/common/enums/common-status.enum';
import { DataScope } from '../src/common/scope/data-scope.enum';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtStrategy } from '../src/modules/auth/jwt.strategy';
import { PermissionRegistryService } from '../src/modules/auth/permission-registry.service';
import type { PasswordService } from '../src/modules/auth/password.service';
import type { SessionRegistryService } from '../src/modules/auth/session-registry.service';
import type { JwtPayload } from '../src/modules/auth/auth.types';
import type { Role } from '../src/modules/identity/entities/role.entity';
import type { User } from '../src/modules/identity/entities/user.entity';
import type { UserSession } from '../src/modules/identity/entities/user-session.entity';
import type { SecurityNotifierService } from '../src/modules/notifications-delivery/security-notifier.service';
import type { SchoolsService } from '../src/modules/schools/schools.service';

/**
 * 2026-08-26 production hodisasi: `ceo` hisobida 439 ruxsat JWT ichiga solinar
 * edi — token 15 440 bayt bo'lib, brauzerning qolgan sarlavhalari bilan birga
 * 16 KB limitidan oshardi. Vercel ham, Render ham har bir so'rovni HTTP 431
 * (Request Header Fields Too Large) bilan rad etardi: kirish ishlar, lekin
 * kirgandan keyin birorta ham API so'rovi ishlamasdi.
 */
describe('Ruxsatlar tokenda emas, reyestrda', () => {
  describe('PermissionRegistryService', () => {
    function makeService(codes: string[]) {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(codes.map((code) => ({ code }))),
      };
      const roles = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
      return {
        service: new PermissionRegistryService(roles as unknown as Repository<Role>),
        roles,
        qb,
      };
    }

    it('foydalanuvchining ruxsat kodlarini qaytaradi', async () => {
      const { service } = makeService(['students.read', 'finance.read']);
      await expect(service.codesForUser('user-1')).resolves.toEqual([
        'students.read',
        'finance.read',
      ]);
    });

    it('natija keshlanadi — ikkinchi chaqiruv DBga bormaydi', async () => {
      const { service, roles } = makeService(['students.read']);
      await service.codesForUser('user-1');
      await service.codesForUser('user-1');
      expect(roles.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('invalidate — kesh bo‘shaydi, keyingi chaqiruv qaytadan o‘qiydi', async () => {
      const { service, roles } = makeService(['students.read']);
      await service.codesForUser('user-1');
      service.invalidate('user-1');
      await service.codesForUser('user-1');
      expect(roles.createQueryBuilder).toHaveBeenCalledTimes(2);
    });

    it('har foydalanuvchi alohida keshlanadi', async () => {
      const { service, roles } = makeService(['students.read']);
      await service.codesForUser('user-1');
      await service.codesForUser('user-2');
      expect(roles.createQueryBuilder).toHaveBeenCalledTimes(2);
    });
  });

  describe('JwtStrategy', () => {
    const config = {
      getOrThrow: () => 'test-secret',
    } as unknown as ConfigService;

    function makeStrategy(codes: string[]) {
      const sessionRegistry = {
        isAlive: jest.fn().mockResolvedValue(true),
        touch: jest.fn(),
      };
      const permissionRegistry = { codesForUser: jest.fn().mockResolvedValue(codes) };
      const strategy = new JwtStrategy(
        config,
        sessionRegistry as unknown as SessionRegistryService,
        permissionRegistry as unknown as PermissionRegistryService,
      );
      return { strategy, sessionRegistry, permissionRegistry };
    }

    const payload = {
      sub: 'user-1',
      username: 'ceoschool',
      roles: ['ceo'],
      sessionId: 'sess-1',
      schoolId: null,
      dataScope: DataScope.ALL,
    } as unknown as JwtPayload;

    it('ruxsatlar reyestrdan olinadi', async () => {
      const { strategy, permissionRegistry } = makeStrategy(['students.read']);
      const user = await strategy.validate(payload);
      expect(user.permissions).toEqual(['students.read']);
      expect(permissionRegistry.codesForUser).toHaveBeenCalledWith('user-1');
    });

    it('eski (deploydan oldingi) tokendagi ruxsatlar E’TIBORGA OLINMAYDI', async () => {
      const { strategy } = makeStrategy(['students.read']);
      const staleToken = {
        ...payload,
        permissions: ['*.*', 'finance.manage'],
      } as unknown as JwtPayload;
      const user = await strategy.validate(staleToken);
      // Rol bekor qilingan bo'lsa, eski token bilan ham keng huquq qolmaydi.
      expect(user.permissions).toEqual(['students.read']);
    });

    it('sessiya o‘lik bo‘lsa — ruxsatlar umuman so‘ralmaydi', async () => {
      const { strategy, sessionRegistry, permissionRegistry } = makeStrategy([]);
      sessionRegistry.isAlive.mockResolvedValue(false);
      await expect(strategy.validate(payload)).rejects.toThrow();
      expect(permissionRegistry.codesForUser).not.toHaveBeenCalled();
    });
  });

  describe('Access token o‘lchami — HTTP 431 qorovuli', () => {
    /**
     * Sarlavhalar yig'indisi uchun qattiq limit 16 384 bayt (Node, Render,
     * Vercel — uchalasi ham). Brauzer cookie/user-agent/sec-ch-ua va proksi
     * sarlavhalari uchun kamida 1 KB oladi, shuning uchun tokenga ancha keng
     * zaxira bilan 4 KB chegara qo'yamiz.
     */
    const TOKEN_LIMIT_BYTES = 4096;

    function permissionRole(count: number): Role {
      return {
        name: 'ceo',
        dataScope: DataScope.ALL,
        permissions: Array.from({ length: count }, (_, i) => ({
          code: `modul-${i}-resurs.action`,
        })),
      } as unknown as Role;
    }

    function makeAuthService() {
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
      };
      const users = {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
        save: jest.fn().mockImplementation(async (v) => v),
      };
      const sessions = {
        create: jest.fn().mockImplementation((v) => v),
        save: jest.fn().mockImplementation(async (v) => ({ id: 'session-1', ...v })),
      };
      const service = new AuthService(
        users as unknown as Repository<User>,
        {} as unknown as Repository<Role>,
        sessions as unknown as Repository<UserSession>,
        {} as unknown as SessionRegistryService,
        {
          maybeNotifyNewLogin: jest.fn(),
          notifyPasswordChanged: jest.fn(),
        } as unknown as SecurityNotifierService,
        { verify: jest.fn().mockResolvedValue(true) } as unknown as PasswordService,
        // Haqiqiy JwtService — token o'lchamini rostakamiga o'lchash uchun.
        new JwtService({}),
        {
          get: (key: string) => (key === 'JWT_ACCESS_EXPIRES_IN' ? '15m' : undefined),
          getOrThrow: () => 'test-secret',
        } as unknown as ConfigService,
        { resolveByHostname: jest.fn() } as unknown as SchoolsService,
      );
      return { service, qb };
    }

    it('439 ruxsatli CEO tokeni 4 KB dan kichik, ruxsatlar esa javob tanasida qoladi', async () => {
      const { service, qb } = makeAuthService();
      qb.getOne.mockResolvedValue({
        id: 'user-1',
        username: 'ceoschool',
        email: 'ceo@yuton.local',
        status: CommonStatus.ACTIVE,
        passwordHash: 'hash',
        twoFactorEnabled: false,
        schoolId: null,
        roles: [permissionRole(439)],
      } as unknown as User);

      const result = await service.login({ login: 'ceoschool', password: 'x' });
      if ('requiresTwoFactor' in result) throw new Error('2FA kutilmagan edi');

      // Aynan shu yerda production yiqilgan edi: token 15 440 bayt edi.
      expect(result.accessToken.length).toBeLessThan(TOKEN_LIMIT_BYTES);
      // Frontend `can()` javob tanasidagi ruxsatlardan ishlaydi — ular joyida.
      expect(result.user.permissions).toHaveLength(439);
    });

    it('token payloadida `permissions` maydoni umuman yo‘q', async () => {
      const { service, qb } = makeAuthService();
      qb.getOne.mockResolvedValue({
        id: 'user-1',
        username: 'ceoschool',
        status: CommonStatus.ACTIVE,
        passwordHash: 'hash',
        twoFactorEnabled: false,
        schoolId: null,
        roles: [permissionRole(10)],
      } as unknown as User);

      const result = await service.login({ login: 'ceoschool', password: 'x' });
      if ('requiresTwoFactor' in result) throw new Error('2FA kutilmagan edi');

      const decoded = new JwtService({}).decode(result.accessToken) as Record<string, unknown>;
      expect(decoded).not.toHaveProperty('permissions');
      // Qolgan da'volar joyida — shaxs va tenant chegarasi tokendan o'qiladi.
      expect(decoded.sub).toBe('user-1');
      expect(decoded.roles).toEqual(['ceo']);
    });
  });
});
