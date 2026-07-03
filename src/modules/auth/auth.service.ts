import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, createHash } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { CommonStatus } from '../../common/enums/common-status.enum';
import { AuthenticatedUser } from '../../common/security/authenticated-user.interface';
import { parseDurationToMs } from '../../common/utils/duration';
import { Role } from '../identity/entities/role.entity';
import { User } from '../identity/entities/user.entity';
import { UserSession } from '../identity/entities/user-session.entity';
import { UserGender } from '../users/enums/user.enums';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthTokens, JwtPayload, RequestMeta } from './auth.types';
import { PasswordService } from './password.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
    @InjectRepository(UserSession)
    private readonly sessions: Repository<UserSession>,
    private readonly passwords: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto, meta: RequestMeta = {}): Promise<AuthTokens> {
    const existingUser = await this.users.findOne({
      where: [{ username: dto.username }, { email: dto.email ?? '' }],
    });

    if (existingUser) {
      throw new ConflictException('User with this username or email already exists');
    }

    const defaultRole = await this.roles.findOne({ where: { name: 'student' } });
    const user = this.users.create({
      username: dto.username,
      email: dto.email,
      phone: dto.phone,
      firstName: dto.firstName ?? dto.username,
      firstNameCyrillic: dto.firstName ?? dto.username,
      lastName: dto.lastName ?? 'Foydalanuvchi',
      lastNameCyrillic: dto.lastName ?? 'Foydalanuvchi',
      gender: UserGender.MALE,
      passwordHash: await this.passwords.hash(dto.password),
      status: CommonStatus.ACTIVE,
      roles: defaultRole ? [defaultRole] : [],
    });

    const savedUser = await this.users.save(user);
    return this.issueTokens(savedUser, meta);
  }

  async login(dto: LoginDto, meta: RequestMeta = {}): Promise<AuthTokens> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('user.username = :login OR user.email = :login OR user.phone = :login', {
        login: dto.login,
      })
      .getOne();

    if (!user || user.status !== CommonStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.passwords.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await this.users.save(user);

    return this.issueTokens(user, meta);
  }

  async refresh(refreshToken: string, meta: RequestMeta = {}): Promise<AuthTokens> {
    const digest = this.digestToken(refreshToken);
    const session = await this.sessions.findOne({
      where: {
        refreshTokenDigest: digest,
        revokedAt: IsNull(),
      },
      relations: {
        user: {
          roles: {
            permissions: true,
          },
        },
      },
    });

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    session.revokedAt = new Date();
    await this.sessions.save(session);

    return this.issueTokens(session.user, meta);
  }

  async logout(refreshToken: string): Promise<{ revoked: boolean }> {
    const digest = this.digestToken(refreshToken);
    const result = await this.sessions.update(
      { refreshTokenDigest: digest, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );

    return { revoked: (result.affected ?? 0) > 0 };
  }

  private async issueTokens(user: User, meta: RequestMeta): Promise<AuthTokens> {
    const refreshToken = randomBytes(64).toString('base64url');
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d';
    const accessExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    const accessExpiresInSeconds = Math.floor(parseDurationToMs(accessExpiresIn) / 1000);

    const session = await this.sessions.save(
      this.sessions.create({
        userId: user.id,
        refreshTokenDigest: this.digestToken(refreshToken),
        expiresAt: new Date(Date.now() + parseDurationToMs(refreshExpiresIn)),
        deviceInfo: meta.deviceInfo,
        ipAddress: meta.ipAddress,
      }),
    );

    const authUser = this.toAuthenticatedUser(user, session.id);
    const payload: JwtPayload = {
      ...authUser,
      sub: user.id,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiresInSeconds,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
      tokenType: 'Bearer',
      user: authUser,
    };
  }

  private toAuthenticatedUser(user: User, sessionId?: string): AuthenticatedUser {
    const roles = user.roles?.map((role) => role.name) ?? [];
    const permissions = Array.from(
      new Set(
        user.roles?.flatMap((role) =>
          role.permissions?.map((permission) => permission.code) ?? [],
        ) ?? [],
      ),
    );

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      roles,
      permissions,
      sessionId,
      schoolId: user.schoolId ?? null,
      branchId: user.branchId ?? null,
    };
  }

  private digestToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
