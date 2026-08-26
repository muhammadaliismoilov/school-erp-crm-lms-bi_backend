import type { Repository } from 'typeorm';
import type { ConfigService } from '@nestjs/config';
import { IdentitySeedService } from '../src/modules/identity/identity-seed.service';
import type { Permission } from '../src/modules/identity/entities/permission.entity';
import type { Role } from '../src/modules/identity/entities/role.entity';
import type { User } from '../src/modules/identity/entities/user.entity';
import type { PasswordService } from '../src/modules/auth/password.service';

/**
 * `seedAdminUser` — bootdagi admin hisobini yaratish.
 *
 * NEGA BU TESTLAR: 2026-08-26 da production deploy'i shu metodda qulagan.
 * `ADMIN_USERNAME` `admin` dan boshqa qiymatga o'zgartirilgan, `ADMIN_EMAIL`
 * esa eski qolgan edi. Metod FAQAT username bo'yicha qidirgani uchun "hisob
 * yo'q" deb hisoblab, yangi qator yozishga urindi va `users.email` unique
 * cheklovini buzdi. Xato `onApplicationBootstrap` ichida bo'lgani uchun butun
 * ilova ko'tarilmadi — Render port ochilmagani uchun deploy'ni yiqitdi.
 */
describe('IdentitySeedService.seedAdminUser', () => {
  const superAdminRole = { id: 'role-1', name: 'super-admin' } as Role;

  interface Muhit {
    service: IdentitySeedService;
    users: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
    ogohlantirishlar: string[];
  }

  function muhitYarat(config: Record<string, string | undefined>, mavjudUser: Partial<User> | null): Muhit {
    const users = {
      findOne: jest.fn().mockResolvedValue(mavjudUser),
      save: jest.fn().mockImplementation(async (u) => u),
      create: jest.fn().mockImplementation((u) => u),
    };
    const roles = { findOne: jest.fn().mockResolvedValue(superAdminRole) };
    const permissions = { find: jest.fn().mockResolvedValue([]), save: jest.fn(), create: jest.fn() };
    const passwords = { hash: jest.fn().mockResolvedValue('hash') };
    const configService = { get: jest.fn((key: string) => config[key]) };

    const service = new IdentitySeedService(
      permissions as unknown as Repository<Permission>,
      roles as unknown as Repository<Role>,
      users as unknown as Repository<User>,
      passwords as unknown as PasswordService,
      configService as unknown as ConfigService,
    );

    const ogohlantirishlar: string[] = [];
    jest
      .spyOn(service['logger'], 'warn')
      .mockImplementation((msg: unknown) => void ogohlantirishlar.push(String(msg)));
    jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);

    return { service, users, ogohlantirishlar };
  }

  /** `seedAdminUser` private — bootdan chaqiriladi, testda ham shunday chaqiramiz. */
  const seedAdmin = (service: IdentitySeedService): Promise<void> =>
    (service as unknown as { seedAdminUser(): Promise<void> }).seedAdminUser();

  it("ADMIN_EMAIL boshqa hisobga tegishli bo'lsa — yangi admin YARATMAYDI (unique buzilmaydi)", async () => {
    const { service, users, ogohlantirishlar } = muhitYarat(
      { ADMIN_USERNAME: 'ceoschool', ADMIN_PASSWORD: 'parol', ADMIN_EMAIL: 'admin@yuton.local' },
      { username: 'admin', email: 'admin@yuton.local' },
    );

    await expect(seedAdmin(service)).resolves.toBeUndefined();

    expect(users.save).not.toHaveBeenCalled();
    expect(ogohlantirishlar.join(' ')).toContain('ceoschool');
    expect(ogohlantirishlar.join(' ')).toContain('admin@yuton.local');
  });

  it('username yoki email bo\'yicha qidiradi (ikkalasi ham unique)', async () => {
    const { service, users } = muhitYarat(
      { ADMIN_USERNAME: 'ceoschool', ADMIN_PASSWORD: 'parol', ADMIN_EMAIL: 'a@b.uz' },
      null,
    );

    await seedAdmin(service);

    expect(users.findOne).toHaveBeenCalledWith({
      where: [{ username: 'ceoschool' }, { email: 'a@b.uz' }],
    });
  });

  it("hisob umuman yo'q bo'lsa — super-admin roli bilan yaratadi", async () => {
    const { service, users } = muhitYarat(
      { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'parol', ADMIN_EMAIL: 'admin@yuton.local' },
      null,
    );

    await seedAdmin(service);

    expect(users.save).toHaveBeenCalledTimes(1);
    const saqlangan = users.save.mock.calls[0][0] as Partial<User> & { roles?: Role[] };
    expect(saqlangan.username).toBe('admin');
    expect(saqlangan.email).toBe('admin@yuton.local');
    expect(saqlangan.roles).toEqual([superAdminRole]);
  });

  it("bir xil username bilan hisob bor bo'lsa — jim o'tadi, ogohlantirmaydi", async () => {
    const { service, users, ogohlantirishlar } = muhitYarat(
      { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'parol', ADMIN_EMAIL: 'admin@yuton.local' },
      { username: 'admin', email: 'admin@yuton.local' },
    );

    await seedAdmin(service);

    expect(users.save).not.toHaveBeenCalled();
    expect(ogohlantirishlar).toHaveLength(0);
  });

  it("ADMIN_EMAIL berilmagan bo'lsa — faqat username bo'yicha qidiradi", async () => {
    const { service, users } = muhitYarat(
      { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'parol', ADMIN_EMAIL: undefined },
      null,
    );

    await seedAdmin(service);

    expect(users.findOne).toHaveBeenCalledWith({ where: { username: 'admin' } });
  });

  it("ADMIN_PASSWORD yo'q bo'lsa — umuman ishlamaydi", async () => {
    const { service, users } = muhitYarat({ ADMIN_USERNAME: 'admin' }, null);

    await seedAdmin(service);

    expect(users.findOne).not.toHaveBeenCalled();
    expect(users.save).not.toHaveBeenCalled();
  });
});
