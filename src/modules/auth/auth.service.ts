import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
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
import { parseDeviceInfo } from './device-info.util';
import { SessionRegistryService } from './session-registry.service';
import { SecurityNotifierService } from '../notifications-delivery/security-notifier.service';
import { ChangePasswordDto } from './dto/session.dto';
import { buildOtpauthUrl, generateTotpSecret, verifyTotp } from './totp.util';
import { UserGender } from '../users/enums/user.enums';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthTokens, JwtPayload, RequestMeta, TwoFactorChallenge } from './auth.types';
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
    private readonly sessionRegistry: SessionRegistryService,
    private readonly securityNotifier: SecurityNotifierService,
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

  async login(dto: LoginDto, meta: RequestMeta = {}): Promise<AuthTokens | TwoFactorChallenge> {
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

    // 2FA yoqilgan bo'lsa — token o'rniga qisqa muddatli chaqiriq qaytariladi.
    if (user.twoFactorEnabled) {
      const twoFactorToken = await this.jwtService.signAsync(
        { sub: user.id, purpose: '2fa' },
        { secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'), expiresIn: '5m' },
      );
      return { requiresTwoFactor: true, twoFactorToken } satisfies TwoFactorChallenge;
    }

    user.lastLoginAt = new Date();
    await this.users.save(user);

    return this.issueTokens(user, meta);
  }

  /** 2FA ikkinchi bosqichi: chaqiriq tokeni + authenticator kodi → haqiqiy tokenlar. */
  async verifyTwoFactorLogin(twoFactorToken: string, code: string, meta: RequestMeta = {}): Promise<AuthTokens> {
    let payload: { sub?: string; purpose?: string };
    try {
      payload = await this.jwtService.verifyAsync(twoFactorToken, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException("2FA chaqirig'i eskirgan — qaytadan kiring");
    }
    if (payload.purpose !== '2fa' || !payload.sub) {
      throw new UnauthorizedException("2FA chaqirig'i noto'g'ri");
    }

    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.twoFactorSecret')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('user.id = :id', { id: payload.sub })
      .getOne();
    if (!user || user.status !== CommonStatus.ACTIVE || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!verifyTotp(user.twoFactorSecret, code)) {
      throw new UnauthorizedException("Kod noto'g'ri yoki eskirgan");
    }

    user.lastLoginAt = new Date();
    await this.users.save(user);
    return this.issueTokens(user, meta);
  }

  // ─── 2FA sozlash (o'z hisobida) ───────────────────────────────────────────

  /** 1-qadam: sir yaratiladi (hali yoqilmagan) — Authenticator'ga kiritish uchun. */
  async setupTwoFactor(userId: string, username: string) {
    const secret = generateTotpSecret();
    await this.users.update({ id: userId }, { twoFactorSecret: secret, twoFactorEnabled: false });
    return { secret, otpauthUrl: buildOtpauthUrl(secret, username) };
  }

  /** 2-qadam: ilovadagi kod tasdiqlansa — 2FA yoqiladi. */
  async enableTwoFactor(userId: string, code: string) {
    const secret = await this.loadTwoFactorSecret(userId);
    if (!secret) throw new BadRequestException("Avval 2FA sozlashni boshlang (setup)");
    if (!verifyTotp(secret, code)) throw new UnauthorizedException("Kod noto'g'ri yoki eskirgan");
    await this.users.update({ id: userId }, { twoFactorEnabled: true });
    return { enabled: true };
  }

  /** O'chirish — joriy kod talab qilinadi (sessiya o'g'irlansa ham o'chira olmasin). */
  async disableTwoFactor(userId: string, code: string) {
    const secret = await this.loadTwoFactorSecret(userId);
    if (!secret) return { enabled: false };
    if (!verifyTotp(secret, code)) throw new UnauthorizedException("Kod noto'g'ri yoki eskirgan");
    await this.users.update({ id: userId }, { twoFactorEnabled: false, twoFactorSecret: null });
    return { enabled: false };
  }

  async twoFactorStatus(userId: string) {
    const user = await this.users.findOne({ where: { id: userId }, select: { id: true, twoFactorEnabled: true } });
    return { enabled: user?.twoFactorEnabled ?? false };
  }

  private async loadTwoFactorSecret(userId: string): Promise<string | null> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.twoFactorSecret')
      .where('user.id = :id', { id: userId })
      .getOne();
    return user?.twoFactorSecret ?? null;
  }

  /** Kirish tarixi — oxirgi 20 sessiya (chiqarilganlar ham), audit ko'rinishi. */
  async listSessionHistory(userId: string, currentSessionId?: string) {
    const rows = await this.sessions.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return rows.map((r) => ({
      id: r.id,
      deviceInfo: r.deviceInfo ?? null,
      ipAddress: r.ipAddress ?? null,
      createdAt: r.createdAt,
      lastSeenAt: r.lastSeenAt ?? null,
      revokedAt: r.revokedAt ?? null,
      current: r.id === currentSessionId,
    }));
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

  // ─── Sessiya (qurilma) boshqaruvi ─────────────────────────────────────────

  /** Foydalanuvchining faol sessiyalari — Qurilmalar sahifasi uchun. */
  async listSessions(userId: string, currentSessionId?: string) {
    const rows = await this.sessions.find({
      where: { userId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    const now = Date.now();
    return rows
      .filter((r) => r.expiresAt.getTime() > now)
      .map((r) => ({
        id: r.id,
        deviceInfo: r.deviceInfo ?? null,
        ipAddress: r.ipAddress ?? null,
        createdAt: r.createdAt,
        lastSeenAt: r.lastSeenAt ?? null,
        current: r.id === currentSessionId,
      }));
  }

  /** Bitta qurilmani chiqarish. Joriy sessiya bu yerdan emas — logout orqali. */
  async revokeSession(userId: string, sessionId: string, currentSessionId?: string) {
    if (sessionId === currentSessionId) {
      throw new BadRequestException("Joriy qurilma bu yerdan chiqarilmaydi — 'Chiqish' (logout) dan foydalaning");
    }
    const revoked = await this.sessionRegistry.revokeSession(sessionId, userId);
    if (!revoked) throw new NotFoundException('Sessiya topilmadi yoki allaqachon bekor qilingan');
    return { revoked: true };
  }

  /** "Boshqa hammasini chiqarish" — joriy qurilmadan tashqari barcha sessiyalar. */
  async revokeOtherSessions(userId: string, currentSessionId?: string) {
    const revokedCount = await this.sessionRegistry.revokeAllForUser(userId, currentSessionId);
    return { revokedCount };
  }

  /**
   * O'z parolini almashtirish: eski parol tekshiriladi, yangisi saqlanadi,
   * joriy qurilmadan tashqari BARCHA sessiyalar bekor qilinadi.
   */
  async changePassword(userId: string, dto: ChangePasswordDto, currentSessionId?: string) {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .getOne();
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');

    const valid = await this.passwords.verify(user.passwordHash, dto.currentPassword);
    if (!valid) throw new UnauthorizedException("Joriy parol noto'g'ri");
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Yangi parol eskisidan farq qilishi kerak');
    }

    user.passwordHash = await this.passwords.hash(dto.newPassword);
    await this.users.save(user);
    const revokedCount = await this.sessionRegistry.revokeAllForUser(userId, currentSessionId);
    this.securityNotifier.notifyPasswordChanged(userId, revokedCount);
    return { changed: true, revokedOtherSessions: revokedCount };
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
        deviceInfo: parseDeviceInfo(meta.deviceInfo),
        ipAddress: meta.ipAddress,
        lastSeenAt: new Date(),
      }),
    );

    // Yangi qurilmadan kirish ogohlantirishi (fire-and-forget, login'ni sekinlashtirmaydi).
    this.securityNotifier.maybeNotifyNewLogin({
      userId: user.id,
      sessionId: session.id,
      deviceInfo: session.deviceInfo ?? null,
      ipAddress: meta.ipAddress ?? null,
    });

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
