import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DEFAULT_PERMISSION_CODES } from '../../common/constants/permissions';
import { CommonStatus } from '../../common/enums/common-status.enum';
import { PasswordService } from '../auth/password.service';
import { syncDefaultRoles } from './identity-role-sync';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { UserGender } from '../users/enums/user.enums';

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
    const result = await syncDefaultRoles(this.roles, this.permissions);
    if (result.created.length > 0 || result.updated.length > 0) {
      this.logger.log(
        `Rollar sinxronlandi: ${result.created.length} yaratildi, ${result.updated.length} yangilandi, ${result.unchanged.length} o'zgarishsiz`,
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
