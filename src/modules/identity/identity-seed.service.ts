import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AppPermission,
  CONFIDENTIAL_PERMISSION_CODES,
  DEFAULT_PERMISSION_CODES,
} from '../../common/constants/permissions';
import type { LocalizedText } from '../../common/i18n/locale';
import { CommonStatus } from '../../common/enums/common-status.enum';
import { PasswordService } from '../auth/password.service';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { UserGender } from '../users/enums/user.enums';

export interface DefaultRoleDefinition {
  name: string;
  title: LocalizedText;
  permissions: string[];
}

export const defaultRoles: DefaultRoleDefinition[] = [
  {
    name: 'super-admin',
    title: { uz: 'Super Admin', ru: 'Супер администратор', en: 'Super Admin' },
    permissions: [AppPermission.SUPER_ADMIN],
  },
  {
    name: 'director',
    title: { uz: 'Direktor', ru: 'Директор', en: 'Director' },
    permissions: DEFAULT_PERMISSION_CODES.filter(
      (code) =>
        code !== AppPermission.SUPER_ADMIN &&
        !CONFIDENTIAL_PERMISSION_CODES.includes(code),
    ),
  },
  {
    name: 'admin',
    title: { uz: 'Admin', ru: 'Администратор', en: 'Admin' },
    permissions: DEFAULT_PERMISSION_CODES.filter(
      (code) =>
        code !== AppPermission.SUPER_ADMIN &&
        !CONFIDENTIAL_PERMISSION_CODES.includes(code),
    ),
  },
  {
    name: 'supermanager',
    title: { uz: 'Supermenejer', ru: 'Суперменеджер', en: 'Supermanager' },
    permissions: DEFAULT_PERMISSION_CODES.filter(
      (code) =>
        code !== AppPermission.SUPER_ADMIN &&
        !CONFIDENTIAL_PERMISSION_CODES.includes(code),
    ),
  },
  {
    name: 'sales-manager',
    title: { uz: 'Sotuv menejeri', ru: 'Менеджер продаж', en: 'Sales Manager' },
    permissions: [
      AppPermission.CRM_READ,
      AppPermission.CRM_MANAGE,
      AppPermission.USERS_READ,
      AppPermission.STUDENTS_READ,
      AppPermission.NOTIFICATIONS_READ,
    ],
  },
  {
    name: 'parent',
    title: { uz: 'Ota-ona', ru: 'Родитель', en: 'Parent' },
    permissions: [
      AppPermission.STUDENTS_READ,
      AppPermission.ATTENDANCE_READ,
      AppPermission.NOTIFICATIONS_READ,
      AppPermission.LMS_READ,
    ],
  },
  {
    name: 'tutor',
    title: { uz: 'Tyutor', ru: 'Тьютор', en: 'Tutor' },
    permissions: [
      AppPermission.STUDENTS_READ,
      AppPermission.ACADEMIC_READ,
      AppPermission.ATTENDANCE_READ,
      AppPermission.LMS_READ,
      AppPermission.NOTIFICATIONS_READ,
    ],
  },
  {
    name: 'manager',
    title: { uz: 'Menejer', ru: 'Менеджер', en: 'Manager' },
    permissions: [
      AppPermission.CRM_READ,
      AppPermission.CRM_MANAGE,
      AppPermission.STUDENTS_READ,
      AppPermission.STUDENTS_MANAGE,
      AppPermission.ATTENDANCE_READ,
      AppPermission.NOTIFICATIONS_READ,
    ],
  },
  {
    name: 'teacher',
    title: { uz: "O'qituvchi", ru: 'Учитель', en: 'Teacher' },
    permissions: [
      AppPermission.STUDENTS_READ,
      AppPermission.ACADEMIC_READ,
      AppPermission.ATTENDANCE_READ,
      AppPermission.ATTENDANCE_MANAGE,
      AppPermission.LMS_READ,
      AppPermission.LMS_MANAGE,
    ],
  },
  {
    name: 'accountant',
    title: { uz: 'Buxgalter', ru: 'Бухгалтер', en: 'Accountant' },
    permissions: [AppPermission.FINANCE_READ, AppPermission.FINANCE_MANAGE],
  },
  {
    name: 'psychologist',
    title: { uz: 'Psixolog', ru: 'Психолог', en: 'Psychologist' },
    permissions: [
      AppPermission.COUNSELING_READ,
      AppPermission.COUNSELING_MANAGE,
      AppPermission.STUDENTS_READ,
    ],
  },
  {
    name: 'student',
    title: { uz: "O'quvchi", ru: 'Ученик', en: 'Student' },
    permissions: [AppPermission.LMS_READ],
  },
];

@Injectable()
export class IdentitySeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(IdentitySeedService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly passwords: PasswordService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.configService.get<string>('DISABLE_BOOTSTRAP_SEED') === 'true') {
      return;
    }

    await this.seedPermissions();
    await this.seedRoles();
    await this.seedAdminUser();
  }

  private async seedPermissions(): Promise<void> {
    const existing = await this.permissions.find({
      where: { code: In(DEFAULT_PERMISSION_CODES) },
    });
    const existingCodes = new Set(existing.map((permission) => permission.code));
    const missing = DEFAULT_PERMISSION_CODES.filter((code) => !existingCodes.has(code));

    if (missing.length === 0) {
      return;
    }

    await this.permissions.save(
      missing.map((code) => {
        const [module, action] = code.split('.');
        return this.permissions.create({ code, module, action });
      }),
    );
    this.logger.log(`Seeded ${missing.length} permissions`);
  }

  private async seedRoles(): Promise<void> {
    for (const roleDefinition of defaultRoles) {
      const existing = await this.roles.findOne({
        where: { name: roleDefinition.name },
        relations: { permissions: true },
      });
      const permissions = await this.permissions.find({
        where: { code: In(roleDefinition.permissions) },
      });

      if (existing) {
        existing.title = roleDefinition.title;
        existing.isSystem = true;
        existing.permissions = permissions;
        await this.roles.save(existing);
        continue;
      }

      await this.roles.save(
        this.roles.create({
          name: roleDefinition.name,
          title: roleDefinition.title,
          isSystem: true,
          permissions,
        }),
      );
    }
  }

  private async seedAdminUser(): Promise<void> {
    const username = this.configService.get<string>('ADMIN_USERNAME') ?? 'admin';
    const password = this.configService.get<string>('ADMIN_PASSWORD');

    if (!password) {
      return;
    }

    const existing = await this.users.findOne({ where: { username } });
    if (existing) {
      return;
    }

    const superAdminRole = await this.roles.findOne({ where: { name: 'super-admin' } });
    if (!superAdminRole) {
      return;
    }

    await this.users.save(
      this.users.create({
        username,
        email: this.configService.get<string>('ADMIN_EMAIL'),
        firstName: 'Demo',
        firstNameCyrillic: 'Demo',
        lastName: 'Admin',
        lastNameCyrillic: 'Admin',
        gender: UserGender.MALE,
        passwordHash: await this.passwords.hash(password),
        status: CommonStatus.ACTIVE,
        roles: [superAdminRole],
      }),
    );
    this.logger.log(`Seeded admin user '${username}'`);
  }
}
