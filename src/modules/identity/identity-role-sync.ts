import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import {
  AppPermission,
  CONFIDENTIAL_PERMISSION_CODES,
  DEFAULT_PERMISSION_CODES,
  READ_BUNDLES,
  WRITE_BUNDLES,
} from '../../common/constants/permissions';
import type { LocalizedText } from '../../common/i18n/locale';
import type { Permission } from './entities/permission.entity';
import type { Role } from './entities/role.entity';

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
      ...READ_BUNDLES.crm,
      ...WRITE_BUNDLES.crm,
      AppPermission.USERS_READ,
      AppPermission.STUDENTS_READ,
      ...READ_BUNDLES.students,
      ...READ_BUNDLES.notifications,
    ],
  },
  {
    name: 'parent',
    title: { uz: 'Ota-ona', ru: 'Родитель', en: 'Parent' },
    permissions: [
      AppPermission.STUDENTS_READ,
      ...READ_BUNDLES.students,
      ...READ_BUNDLES.attendance,
      ...READ_BUNDLES.notifications,
      AppPermission.LMS_READ,
      ...READ_BUNDLES.lms,
    ],
  },
  {
    name: 'tutor',
    title: { uz: 'Tyutor', ru: 'Тьютор', en: 'Tutor' },
    permissions: [
      AppPermission.STUDENTS_READ,
      ...READ_BUNDLES.students,
      ...READ_BUNDLES.academic,
      ...READ_BUNDLES.attendance,
      AppPermission.LMS_READ,
      ...READ_BUNDLES.lms,
      ...READ_BUNDLES.notifications,
    ],
  },
  {
    name: 'manager',
    title: { uz: 'Menejer', ru: 'Менеджер', en: 'Manager' },
    permissions: [
      ...READ_BUNDLES.crm,
      ...WRITE_BUNDLES.crm,
      AppPermission.STUDENTS_READ,
      ...READ_BUNDLES.students,
      ...WRITE_BUNDLES.students,
      ...READ_BUNDLES.attendance,
      ...READ_BUNDLES.notifications,
    ],
  },
  {
    name: 'teacher',
    title: { uz: "O'qituvchi", ru: 'Учитель', en: 'Teacher' },
    permissions: [
      AppPermission.STUDENTS_READ,
      ...READ_BUNDLES.students,
      ...READ_BUNDLES.academic,
      ...READ_BUNDLES.attendance,
      ...WRITE_BUNDLES.attendance,
      AppPermission.LMS_READ,
      ...READ_BUNDLES.lms,
      ...WRITE_BUNDLES.lms,
    ],
  },
  {
    name: 'accountant',
    title: { uz: 'Buxgalter', ru: 'Бухгалтер', en: 'Accountant' },
    permissions: [
      AppPermission.FINANCE_READ,
      ...READ_BUNDLES.finance,
      ...WRITE_BUNDLES.finance,
    ],
  },
  {
    name: 'psychologist',
    title: { uz: 'Psixolog', ru: 'Психолог', en: 'Psychologist' },
    permissions: [
      AppPermission.COUNSELING_READ,
      ...WRITE_BUNDLES.counseling,
      AppPermission.STUDENTS_READ,
      ...READ_BUNDLES.students,
    ],
  },
  {
    name: 'student',
    title: { uz: "O'quvchi", ru: 'Ученик', en: 'Student' },
    permissions: [AppPermission.LMS_READ, ...READ_BUNDLES.lms],
  },
];

export interface RoleSyncResult {
  created: string[];
  updated: string[];
  unchanged: string[];
}

const localizedTextEquals = (a: LocalizedText | null | undefined, b: LocalizedText): boolean =>
  a?.uz === b.uz && a?.ru === b.ru && a?.en === b.en;

/**
 * Default (tizim) rollarni ta'rifga moslashtiradi — faqat haqiqatan farq
 * bo'lganda yozadi. Hech narsa o'zgarmagan rol uchun `save()` UMUMAN
 * chaqirilmaydi: bu boot vaqtidagi behuda `role_permissions` junction
 * yozuvlarini (va shu bilan birga `updated_at`/`version`ning behuda
 * oshishini) yo'q qiladi.
 *
 * DI'siz oddiy funksiya — `IdentitySeedService` (DI orqali olingan
 * repository) va `database/seed.ts` (`DataSource.getRepository()` orqali
 * olingan repository) bir xil `Repository<T>` interfeysini beradi, shuning
 * uchun ikkalasi ham shu funksiyani chaqira oladi.
 */
export async function syncDefaultRoles(
  roleRepo: Repository<Role>,
  permissionRepo: Repository<Permission>,
  definitions: DefaultRoleDefinition[] = defaultRoles,
): Promise<RoleSyncResult> {
  const names = definitions.map((definition) => definition.name);
  // schoolId: IsNull() — default rollar mohiyatan global; bu bitta so'rovda
  // bir nechta bir xil nomli qator qaytish (Map kalitida noaniqlik) ehtimolini
  // oldindan yo'qotadi.
  //
  // QueryBuilder + leftJoinAndSelect ATAYLAB ishlatiladi, `find({relations})`
  // EMAS: `Role.permissions` `eager:true` bo'lgani uchun, `find()`ga YANA
  // `relations:{permissions:true}` berilsa, TypeORM natijani entity'larga
  // aylantirish (hydration) bosqichida o'lchanmagan darajada sekinlashadi —
  // real o'lchov: 12 rol / 1511 qo'shilgan qator uchun `find()` ~16s, xuddi
  // shu natija uchun QueryBuilder ~60ms (taxminan 260x farq). Sabab TypeORM
  // ichida eager-relation va aniq so'ralgan relation ustma-ust tushganda.
  const existingRoles = await roleRepo
    .createQueryBuilder('role')
    .leftJoinAndSelect('role.permissions', 'permission')
    .where('role.name IN (:...names)', { names })
    .andWhere('role.schoolId IS NULL')
    .getMany();
  const existingByName = new Map(existingRoles.map((role) => [role.name, role]));

  const allCodes = Array.from(new Set(definitions.flatMap((definition) => definition.permissions)));
  const allPermissions = await permissionRepo.find({ where: { code: In(allCodes) } });
  const permissionByCode = new Map(allPermissions.map((permission) => [permission.code, permission]));

  const result: RoleSyncResult = { created: [], updated: [], unchanged: [] };

  for (const definition of definitions) {
    const wantedCodes = Array.from(new Set(definition.permissions));
    const existing = existingByName.get(definition.name);

    if (!existing) {
      const wantedPermissions = wantedCodes
        .map((code) => permissionByCode.get(code))
        .filter((permission): permission is Permission => Boolean(permission));
      await roleRepo.save(
        roleRepo.create({
          name: definition.name,
          title: definition.title,
          isSystem: true,
          permissions: wantedPermissions,
        }),
      );
      result.created.push(definition.name);
      continue;
    }

    const currentCodes = new Set((existing.permissions ?? []).map((permission) => permission.code));
    const permissionsChanged =
      currentCodes.size !== wantedCodes.length || wantedCodes.some((code) => !currentCodes.has(code));
    const titleChanged = !localizedTextEquals(existing.title, definition.title);
    const isSystemChanged = existing.isSystem !== true;

    if (!titleChanged && !isSystemChanged && !permissionsChanged) {
      result.unchanged.push(definition.name);
      continue;
    }

    existing.title = definition.title;
    existing.isSystem = true;
    if (permissionsChanged) {
      existing.permissions = wantedCodes
        .map((code) => permissionByCode.get(code))
        .filter((permission): permission is Permission => Boolean(permission));
    }
    await roleRepo.save(existing);
    result.updated.push(definition.name);
  }

  return result;
}
