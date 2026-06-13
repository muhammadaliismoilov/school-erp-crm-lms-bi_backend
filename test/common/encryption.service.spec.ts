import type { ConfigService } from "@nestjs/config";
import { EncryptionService } from "../../src/common/security/encryption.service";

const serviceWithKey = (key?: string): EncryptionService => {
  const config = {
    get: (path: string) =>
      path === "security.encryptionKey" ? key : undefined,
  } as unknown as ConfigService;
  return new EncryptionService(config);
};

describe("EncryptionService", () => {
  const service = serviceWithKey("unit-test-encryption-key-32-characters");

  it("round-trips plaintext through encrypt/decrypt", () => {
    const plaintext = "Maxfiy psixolog yozuvi — o'quvchi holati.";
    const ciphertext = service.encrypt(plaintext);

    expect(ciphertext).not.toContain(plaintext);
    expect(ciphertext.startsWith("v1.")).toBe(true);
    expect(service.decrypt(ciphertext)).toBe(plaintext);
  });

  it("produces a unique ciphertext per call (random IV)", () => {
    const a = service.encrypt("same");
    const b = service.encrypt("same");

    expect(a).not.toBe(b);
    expect(service.decrypt(a)).toBe("same");
    expect(service.decrypt(b)).toBe("same");
  });

  it("rejects tampered ciphertext via the GCM auth tag", () => {
    const ciphertext = service.encrypt("integrity");
    const [prefix, iv, tag, data] = ciphertext.split(".");
    const flippedData = Buffer.from(data, "base64");
    flippedData[0] ^= 0xff;
    const tampered = [
      prefix,
      iv,
      tag,
      flippedData.toString("base64"),
    ].join(".");

    expect(() => service.decrypt(tampered)).toThrow();
  });

  it("refuses to start without a sufficiently long key", () => {
    expect(() => serviceWithKey("short")).toThrow(/ENCRYPTION_KEY/);
    expect(() => serviceWithKey(undefined)).toThrow(/ENCRYPTION_KEY/);
  });
});
