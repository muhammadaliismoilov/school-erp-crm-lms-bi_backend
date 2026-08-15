import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import { CommonStatus } from '../src/common/enums/common-status.enum';
import type { Role } from '../src/modules/identity/entities/role.entity';
import type { User } from '../src/modules/identity/entities/user.entity';
import type { StaffMember } from '../src/modules/hr/entities/staff-member.entity';
import type { PasswordService } from '../src/modules/auth/password.service';
import { UsersService } from '../src/modules/users/users.service';
import type { TenantContextService } from '../src/common/tenant/tenant-context.service';
import type { SessionRegistryService } from '../src/modules/auth/session-registry.service';

describe('UsersService', () => {
  const userId = '2ec0e170-8249-4c79-9dc7-5ec7faeeb3e9';
  let users: jest.Mocked<
    Pick<
      Repository<User>,
      'create' | 'save' | 'findOne' | 'count' | 'softDelete' | 'createQueryBuilder'
    >
  >;
  let roles: jest.Mocked<Pick<Repository<Role>, 'find' | 'count'>>;
  let staffMembers: jest.Mocked<
    Pick<Repository<StaffMember>, 'create' | 'save' | 'findOne' | 'count'>
  >;
  let passwords: jest.Mocked<Pick<PasswordService, 'hash'>>;
  let revokeAllForUser: jest.Mock;
  let service: UsersService;

  const teacherRole = { id: 'role-1', name: 'teacher', title: { uz: "O'qituvchi" } } as Role;
  const savedUser = {
    id: userId,
    username: 'javohir.aliyev',
    email: 'javohir@example.uz',
    phone: '+998901234567',
    firstName: 'Javohir',
    firstNameCyrillic: 'Жавоҳир',
    lastName: 'Aliyev',
    lastNameCyrillic: 'Алиев',
    middleName: 'Valiyevich',
    middleNameCyrillic: 'Валиевич',
    birthDate: '2000-01-15',
    documentNumber: 'AB1234567',
    gender: 'male',
    pinfl: '12345678901234',
    workplace: 'Yuton maktabi',
    profileImageUrl: 'https://cdn.example.uz/users/javohir.png',
    passwordHash: 'hashed-password',
    status: CommonStatus.ACTIVE,
    roles: [teacherRole],
    createdAt: new Date('2026-06-08T00:00:00.000Z'),
    updatedAt: new Date('2026-06-08T00:00:00.000Z'),
    version: 1,
  } as unknown as User;

  beforeEach(() => {
    users = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    roles = {
      find: jest.fn(),
      count: jest.fn(),
    };
    staffMembers = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };
    staffMembers.findOne.mockResolvedValue(null);
    staffMembers.count.mockResolvedValue(0);
    passwords = {
      hash: jest.fn(),
    };
    const tenant = { getSchoolId: () => null, getBranchId: () => null };
    revokeAllForUser = jest.fn().mockResolvedValue(2);
    service = new UsersService(
      users as unknown as Repository<User>,
      roles as unknown as Repository<Role>,
      staffMembers as unknown as Repository<StaffMember>,
      passwords as unknown as PasswordService,
      tenant as unknown as TenantContextService,
      { revokeAllForUser } as unknown as SessionRegistryService,
    );
  });

  /** Q2 testlari uchun aktorlar: teacher rolining kodlari bilan taqqoslanadi. */
  const adminActor = {
    id: 'actor-admin',
    username: 'admin1',
    roles: ['admin'],
    permissions: ['users.update', 'roles.assign', 'users.reset-password', 'students.read', 'lms.read'],
  };

  it('creates a user from the management form and hides password hash in the response', async () => {
    users.findOne.mockResolvedValue(null);
    roles.find.mockResolvedValue([teacherRole]);
    passwords.hash.mockResolvedValue('hashed-password');
    users.create.mockImplementation((value) => value as User);
    users.save.mockResolvedValue(savedUser);

    const result = await service.create({
      username: 'javohir.aliyev',
      password: 'Str0ng-passphrase!',
      email: 'javohir@example.uz',
      profileImageUrl: 'https://cdn.example.uz/users/javohir.png',
      firstName: 'Javohir',
      firstNameCyrillic: 'Жавоҳир',
      lastName: 'Aliyev',
      lastNameCyrillic: 'Алиев',
      middleName: 'Valiyevich',
      middleNameCyrillic: 'Валиевич',
      birthDate: '2000-01-15',
      documentNumber: 'AB1234567',
      gender: 'male',
      phone: '+998901234567',
      role: 'TEACHER',
      pinfl: '12345678901234',
    });

    expect(roles.find).toHaveBeenCalled();
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'javohir.aliyev',
        firstName: 'Javohir',
        firstNameCyrillic: 'Жавоҳир',
        documentNumber: 'AB1234567',
        gender: 'male',
        passwordHash: 'hashed-password',
        roles: [teacherRole],
      }),
    );
    expect(result).toMatchObject({
      id: userId,
      login: 'javohir.aliyev',
      fullName: 'Javohir Aliyev',
      role: 'teacher',
      gender: 'male',
      documentNumber: 'AB1234567',
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('persists workplace (ish joyi) on create and exposes it in the response', async () => {
    users.findOne.mockResolvedValue(null);
    roles.find.mockResolvedValue([teacherRole]);
    passwords.hash.mockResolvedValue('hashed-password');
    users.create.mockImplementation((value) => value as User);
    users.save.mockImplementation(async (value) => ({ ...savedUser, ...value }) as User);

    const result = await service.create({
      firstName: 'Aziza',
      firstNameCyrillic: 'Азиза',
      lastName: 'Karimova',
      lastNameCyrillic: 'Каримова',
      gender: 'female',
      role: 'TEACHER',
      workplace: '  Yuton maktabi  ',
    });

    // Stored trimmed on the entity...
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({ workplace: 'Yuton maktabi' }),
    );
    // ...and surfaced back to the client.
    expect(result.workplace).toBe('Yuton maktabi');
  });

  it('clears workplace when an empty string is provided on update', async () => {
    users.findOne.mockResolvedValueOnce(savedUser).mockResolvedValueOnce(null);
    users.save.mockImplementation(async (value) => value as User);

    const result = await service.update(userId, { workplace: '   ' });

    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({ workplace: null }),
    );
    expect(result.workplace).toBeNull();
  });

  it('auto-generates a unique login and password and returns them once', async () => {
    users.findOne.mockResolvedValue(null);
    roles.find.mockResolvedValue([teacherRole]);
    passwords.hash.mockResolvedValue('hashed-password');
    users.create.mockImplementation((value) => value as User);
    users.save.mockImplementation(async (value) => ({ ...savedUser, ...value }) as User);

    const result = await service.create({
      firstName: 'Javohir',
      firstNameCyrillic: 'Жавоҳир',
      lastName: 'Aliyev',
      lastNameCyrillic: 'Алиев',
      gender: 'male',
      role: 'TEACHER',
    });

    // Password is hashed before persisting...
    expect(passwords.hash).toHaveBeenCalledTimes(1);
    const [plaintext] = passwords.hash.mock.calls[0];
    expect(typeof plaintext).toBe('string');
    expect((plaintext as string).length).toBeGreaterThan(8);
    // ...and the same plaintext is returned once for the credentials dialog.
    expect(result.generatedPassword).toBe(plaintext);
    expect(result.login).toBeTruthy();
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('rejects duplicate username, email, phone, document number, or PINFL', async () => {
    users.findOne.mockResolvedValue(savedUser);

    await expect(
      service.create({
        username: 'javohir.aliyev',
        password: 'Str0ng-passphrase!',
        firstName: 'Javohir',
        firstNameCyrillic: 'Жавоҳир',
        lastName: 'Aliyev',
        lastNameCyrillic: 'Алиев',
        gender: 'male',
        role: 'TEACHER',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns paginated users with search/filter stats', async () => {
    const qb = createUserQueryBuilderMock([savedUser], 1);
    users.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<User>);
    users.count.mockResolvedValue(3);
    roles.count.mockResolvedValue(7);

    const result = await service.findAll({
      page: 1,
      limit: 20,
      search: 'javohir',
      role: 'TEACHER',
      gender: 'male',
    });

    expect(qb.andWhere).toHaveBeenCalled();
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, pageCount: 1 });
    expect(result.stats).toEqual({ userCount: 3, roleCount: 7, pageCount: 1 });
    expect(result.items[0]).toMatchObject({ login: 'javohir.aliyev', role: 'teacher' });
  });

  it('updates identity fields and NEVER touches password or roles (T-02)', async () => {
    users.findOne.mockResolvedValueOnce(savedUser).mockResolvedValueOnce(null);
    users.save.mockImplementation(async (value) => value as User);

    const result = await service.update(userId, { firstName: 'Javoxir' });

    // Parol va rol bu endpointda umuman mavjud emas — DTO darajasida ham
    // (whitelist), service darajasida ham.
    expect(passwords.hash).not.toHaveBeenCalled();
    expect(roles.find).not.toHaveBeenCalled();
    expect(result.firstName).toBe('Javoxir');
  });

  // ------------------------------------------- T-02: imtiyoz oshirish siyosati

  describe('assignRoles (Q2/Q3 siyosati)', () => {
    const directorRole = {
      id: 'role-dir',
      name: 'director',
      permissions: [{ code: 'finance-contracts.create' }, { code: 'students.read' }],
    } as unknown as Role;
    const narrowRole = {
      id: 'role-narrow',
      name: 'teacher',
      permissions: [{ code: 'students.read' }, { code: 'lms.read' }],
    } as unknown as Role;

    it("aktor o'z ruxsatlaridan oshmaydigan rolni biriktira oladi", async () => {
      users.findOne.mockResolvedValue(savedUser);
      roles.find.mockResolvedValue([narrowRole]);
      users.save.mockImplementation(async (value) => value as User);

      await service.assignRoles(userId, { roleNames: ['teacher'] }, adminActor);

      expect(users.save).toHaveBeenCalledWith(
        expect.objectContaining({ roles: [narrowRole] }),
      );
    });

    it("aktorда yo'q ruxsatli rol — 403 (Q2 kuchaytirmaslik)", async () => {
      users.findOne.mockResolvedValue(savedUser);
      roles.find.mockResolvedValue([directorRole]);

      await expect(
        service.assignRoles(userId, { roleNames: ['director'] }, adminActor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(users.save).not.toHaveBeenCalled();
    });

    it("o'ziga rol yozish — 403 (Q3), hatto rol kichik bo'lsa ham", async () => {
      users.findOne.mockResolvedValue({ ...savedUser, id: adminActor.id } as User);
      roles.find.mockResolvedValue([narrowRole]);

      await expect(
        service.assignRoles(adminActor.id, { roleNames: ['teacher'] }, adminActor),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("super-admin (`*.*`) cheklovlardan mustasno", async () => {
      users.findOne.mockResolvedValue(savedUser);
      roles.find.mockResolvedValue([directorRole]);
      users.save.mockImplementation(async (value) => value as User);

      await service.assignRoles(
        userId,
        { roleNames: ['director'] },
        { id: 'root', username: 'root', roles: ['super-admin'], permissions: ['*.*'] },
      );

      expect(users.save).toHaveBeenCalled();
    });
  });

  describe('resetPassword (Q2\'/Q3 siyosati)', () => {
    it('kichik ruxsatli foydalanuvchi parolini tiklaydi va sessiyalarini bekor qiladi', async () => {
      users.findOne.mockResolvedValue({
        ...savedUser,
        roles: [{ name: 'teacher', permissions: [{ code: 'students.read' }] }],
      } as unknown as User);
      passwords.hash.mockResolvedValue('new-hash');
      users.save.mockImplementation(async (value) => value as User);

      const result = await service.resetPassword(userId, 'New-strong-passphrase!', adminActor);

      expect(passwords.hash).toHaveBeenCalledWith('New-strong-passphrase!');
      expect(revokeAllForUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ changed: true, revokedSessions: 2 });
    });

    it("aktordan kuchli foydalanuvchi paroli — 403 (akkauntni egallash yo'li yopiq)", async () => {
      users.findOne.mockResolvedValue({
        ...savedUser,
        roles: [{ name: 'director', permissions: [{ code: 'finance-contracts.create' }] }],
      } as unknown as User);

      await expect(
        service.resetPassword(userId, 'New-strong-passphrase!', adminActor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(passwords.hash).not.toHaveBeenCalled();
      expect(revokeAllForUser).not.toHaveBeenCalled();
    });

    it("o'z parolini bu yo'l bilan tiklash — 403 (Q3)", async () => {
      users.findOne.mockResolvedValue({ ...savedUser, id: adminActor.id } as User);

      await expect(
        service.resetPassword(adminActor.id, 'New-strong-passphrase!', adminActor),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('create (Q2 provisioning)', () => {
    it("aktor o'zidan kuchli rolli akkaunt yarata olmaydi", async () => {
      users.findOne.mockResolvedValue(null);
      roles.find.mockResolvedValue([
        {
          id: 'role-dir',
          name: 'director',
          permissions: [{ code: 'finance-contracts.create' }],
        } as unknown as Role,
      ]);

      await expect(
        service.create(
          {
            firstName: 'Test',
            firstNameCyrillic: 'Тест',
            lastName: 'User',
            lastNameCyrillic: 'Юзер',
            gender: 'male',
            roleNames: ['director'],
          } as never,
          undefined,
          adminActor,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(users.save).not.toHaveBeenCalled();
    });
  });

  it('throws NotFoundException when user does not exist', async () => {
    users.findOne.mockResolvedValue(null);

    await expect(service.findOne(userId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('archives a user with soft delete', async () => {
    users.findOne.mockResolvedValue(savedUser);
    users.softDelete.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

    await service.remove(userId);

    expect(users.softDelete).toHaveBeenCalledWith(userId);
  });
});

const createUserQueryBuilderMock = (items: User[], total: number) => {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([items, total]),
  };

  return qb;
};
