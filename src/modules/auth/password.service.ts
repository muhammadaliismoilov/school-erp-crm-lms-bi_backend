import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import * as bcrypt from "bcrypt";

const defaultBcryptSaltRounds = 12;

@Injectable()
export class PasswordService {
  constructor(private readonly configService?: ConfigService) {}

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.getSaltRounds());
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      if (hash.startsWith("$argon2")) {
        return await argon2.verify(hash, password);
      }

      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }

  private getSaltRounds(): number {
    const configured = this.configService?.get<string | number>("BCRYPT_SALT_ROUNDS");
    const saltRounds = Number.parseInt(String(configured ?? defaultBcryptSaltRounds), 10);

    if (!Number.isInteger(saltRounds) || saltRounds < 10 || saltRounds > 15) {
      return defaultBcryptSaltRounds;
    }

    return saltRounds;
  }
}
