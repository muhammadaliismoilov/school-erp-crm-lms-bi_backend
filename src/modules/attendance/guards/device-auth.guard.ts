import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { TurnstileDevice } from '../entities/turnstile-device.entity';

/** Guard qurilmani aniqlab, so'rovga biriktiradigan kalit. */
export const TURNSTILE_DEVICE_KEY = 'turnstileDevice';

/**
 * Turniket qurilmalarini `X-Device-Number` + `X-Device-Key` sarlavhalari
 * orqali autentifikatsiya qiladi. Kalit SHA-256 bilan taqqoslanadi
 * (constant-time). Muvaffaqiyatda qurilma so'rovga biriktiriladi.
 */
@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(
    @InjectRepository(TurnstileDevice)
    private readonly devices: Repository<TurnstileDevice>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const deviceNumber = this.header(req, 'x-device-number');
    const apiKey = this.header(req, 'x-device-key');
    if (!deviceNumber || !apiKey) {
      throw new UnauthorizedException('Qurilma sarlavhalari yetishmayapti.');
    }

    const device = await this.devices.findOne({ where: { deviceNumber, active: true } });
    if (!device || !this.keyMatches(apiKey, device.apiKeyHash)) {
      throw new UnauthorizedException("Qurilma autentifikatsiyasi noto'g'ri.");
    }

    (req as Request & Record<string, unknown>)[TURNSTILE_DEVICE_KEY] = device;
    return true;
  }

  private header(req: Request, name: string): string | undefined {
    const value = req.headers[name];
    return Array.isArray(value) ? value[0] : value;
  }

  private keyMatches(apiKey: string, expectedHash: string): boolean {
    const actual = createHash('sha256').update(apiKey).digest();
    let expected: Buffer;
    try {
      expected = Buffer.from(expectedHash, 'hex');
    } catch {
      return false;
    }
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
