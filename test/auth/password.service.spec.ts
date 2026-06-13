import * as argon2 from "argon2";
import { PasswordService } from "../../src/modules/auth/password.service";

describe("PasswordService", () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it("hashes a password without exposing the original value", async () => {
    const password = "Str0ng-passphrase!";

    const hash = await service.hash(password);

    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$/);
    await expect(service.verify(hash, password)).resolves.toBe(true);
  });

  it("verifies legacy argon2 hashes during migration", async () => {
    const password = "legacy-password";
    const legacyHash = await argon2.hash(password);

    await expect(service.verify(legacyHash, password)).resolves.toBe(true);
  });

  it("rejects an invalid password without throwing", async () => {
    const hash = await service.hash("correct-password");

    await expect(service.verify(hash, "wrong-password")).resolves.toBe(false);
  });
});
