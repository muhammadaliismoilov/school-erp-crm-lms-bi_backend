import "reflect-metadata";
import "dotenv/config";
import { In } from "typeorm";
import dataSource from "./data-source";
import { DEFAULT_PERMISSION_CODES } from "../common/constants/permissions";
import { CommonStatus } from "../common/enums/common-status.enum";
import { Permission } from "../modules/identity/entities/permission.entity";
import { Role } from "../modules/identity/entities/role.entity";
import { User } from "../modules/identity/entities/user.entity";
import { defaultRoles } from "../modules/identity/identity-seed.service";
import { PasswordService } from "../modules/auth/password.service";
import { UserGender } from "../modules/users/enums/user.enums";

/**
 * Idempotent database seeder run via `npm run seed`.
 *
 * Ensures every permission and system role exists, then upserts a bootstrap
 * super-admin user. Credentials default to `yutonseo` / `yutonseo` and can be
 * overridden with SEED_USERNAME / SEED_PASSWORD.
 *
 * Safe to run repeatedly: existing rows are updated, never duplicated.
 */
async function seed(): Promise<void> {
  const username = process.env.SEED_USERNAME ?? "yutonseo";
  const password = process.env.SEED_PASSWORD ?? "yutonseo";

  await dataSource.initialize();
  const passwords = new PasswordService();

  try {
    const permissionRepo = dataSource.getRepository(Permission);
    const roleRepo = dataSource.getRepository(Role);
    const userRepo = dataSource.getRepository(User);

    // 1. Permissions
    const existingPermissions = await permissionRepo.find({
      where: { code: In(DEFAULT_PERMISSION_CODES) },
    });
    const existingCodes = new Set(existingPermissions.map((p) => p.code));
    const missingPermissions = DEFAULT_PERMISSION_CODES.filter(
      (code) => !existingCodes.has(code),
    );
    if (missingPermissions.length > 0) {
      await permissionRepo.save(
        missingPermissions.map((code) => {
          const [module, action] = code.split(".");
          return permissionRepo.create({ code, module, action });
        }),
      );
    }
    console.log(
      `Permissions: ${existingCodes.size} existing, ${missingPermissions.length} created`,
    );

    // 2. Roles
    for (const definition of defaultRoles) {
      const permissions = await permissionRepo.find({
        where: { code: In(definition.permissions) },
      });
      const existing = await roleRepo.findOne({
        where: { name: definition.name },
        relations: { permissions: true },
      });
      if (existing) {
        existing.title = definition.title;
        existing.isSystem = true;
        existing.permissions = permissions;
        await roleRepo.save(existing);
      } else {
        await roleRepo.save(
          roleRepo.create({
            name: definition.name,
            title: definition.title,
            isSystem: true,
            permissions,
          }),
        );
      }
    }
    console.log(`Roles: ${defaultRoles.length} ensured`);

    // 3. Super-admin user
    const superAdmin = await roleRepo.findOne({
      where: { name: "super-admin" },
    });
    if (!superAdmin) {
      throw new Error("super-admin role missing after role seeding");
    }

    const passwordHash = await passwords.hash(password);
    const existingUser = await userRepo.findOne({
      where: { username },
      relations: { roles: true },
    });

    if (existingUser) {
      existingUser.passwordHash = passwordHash;
      existingUser.status = CommonStatus.ACTIVE;
      existingUser.roles = [superAdmin];
      await userRepo.save(existingUser);
      console.log(`User '${username}' updated (password reset, super-admin)`);
    } else {
      await userRepo.save(
        userRepo.create({
          username,
          firstName: "Yuton",
          firstNameCyrillic: "Yuton",
          lastName: "Seo",
          lastNameCyrillic: "Seo",
          gender: UserGender.MALE,
          passwordHash,
          status: CommonStatus.ACTIVE,
          roles: [superAdmin],
        }),
      );
      console.log(`User '${username}' created (super-admin)`);
    }

    console.log(`\n✓ Seed complete. Login: ${username} / Password: ${password}`);
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
