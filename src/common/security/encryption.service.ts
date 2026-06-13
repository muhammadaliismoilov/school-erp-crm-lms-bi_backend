import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const KEY_SALT = "yuton-encryption-v1";
const FORMAT_PREFIX = "v1";

/**
 * Authenticated symmetric encryption for data that must stay confidential at
 * rest (e.g. psychologist session notes). Uses AES-256-GCM, so every payload is
 * tamper-evident — a modified ciphertext fails the auth-tag check on decrypt.
 *
 * The 32-byte key is derived once from `ENCRYPTION_KEY` via scrypt, so the
 * operator can supply a human passphrase of any length without weakening AES.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(configService: ConfigService) {
    const secret = configService.get<string>("security.encryptionKey");
    if (!secret || secret.length < 16) {
      throw new Error(
        "ENCRYPTION_KEY must be set and at least 16 characters to enable confidential data encryption",
      );
    }
    this.key = scryptSync(secret, KEY_SALT, KEY_LENGTH);
  }

  /** Returns `v1.<iv>.<tag>.<ciphertext>` with each segment base64-encoded. */
  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      FORMAT_PREFIX,
      iv.toString("base64"),
      tag.toString("base64"),
      ciphertext.toString("base64"),
    ].join(".");
  }

  decrypt(payload: string): string {
    const parts = payload.split(".");
    if (parts.length !== 4 || parts[0] !== FORMAT_PREFIX) {
      throw new Error("Invalid encrypted payload format");
    }
    const [, ivB64, tagB64, dataB64] = parts;
    const decipher = createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
}
