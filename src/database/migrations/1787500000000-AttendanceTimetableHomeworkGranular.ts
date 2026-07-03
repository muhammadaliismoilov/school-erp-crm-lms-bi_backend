import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Granular ruxsatlar — attendance, timetable, homework modullari.
 *
 * - attendance: `attendance-records` (read/create) ← attendance.read/manage
 * - timetable: templates/slots/substitutions/conflicts (read/create/update) ← timetable.read/manage
 * - homework: assignments/submissions (read/create/update) ← LMS umbrella (lms.read/manage)
 *
 * Eski kodlar SAQLANADI. Foydalanuvchi rollariga eski keng kod → granular
 * grantlari (idempotent). Tizim rollari `identity-seed`da avtomatik yangilanadi.
 */
export class AttendanceTimetableHomeworkGranular1787500000000 implements MigrationInterface {
  name = 'AttendanceTimetableHomeworkGranular1787500000000';

  /** Har guruh: eski keng kod → yangi resurs amallari. */
  private readonly groups: Array<{
    manageCode: string;
    readCode: string;
    resourceActions: Record<string, string[]>;
  }> = [
    {
      manageCode: 'attendance.manage',
      readCode: 'attendance.read',
      resourceActions: { 'attendance-records': ['read', 'create'] },
    },
    {
      manageCode: 'timetable.manage',
      readCode: 'timetable.read',
      resourceActions: {
        'timetable-templates': ['read', 'create', 'update'],
        'timetable-slots': ['read', 'create', 'update'],
        'timetable-substitutions': ['read', 'create', 'update'],
        'timetable-conflicts': ['read', 'create', 'update'],
      },
    },
    {
      // homework LMS umbrella ostida — grantlar lms.read/manage'dan meros oladi
      manageCode: 'lms.manage',
      readCode: 'lms.read',
      resourceActions: {
        'homework-assignments': ['read', 'create', 'update'],
        'homework-submissions': ['read', 'create', 'update'],
      },
    },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const group of this.groups) {
      const rows = Object.entries(group.resourceActions).flatMap(([module, actions]) =>
        actions.map((action) => [`${module}.${action}`, module, action] as [string, string, string]),
      );
      for (const [code, module, action] of rows) {
        await queryRunner.query(
          `INSERT INTO "permissions" ("id", "version", "code", "module", "action")
           VALUES (uuid_generate_v4(), 1, $1, $2, $3)
           ON CONFLICT ("code") DO NOTHING`,
          [code, module, action],
        );
      }
      const writeCodes = rows.filter(([, , a]) => a !== 'read').map(([code]) => code);
      const readCodes = rows.filter(([, , a]) => a === 'read').map(([code]) => code);

      if (writeCodes.length) {
        await queryRunner.query(
          `INSERT INTO "role_permissions" ("role_id", "permission_id")
           SELECT rp.role_id, p.id FROM "role_permissions" rp
           JOIN "permissions" old ON old.id = rp.permission_id AND old.code = $2
           JOIN "permissions" p ON p.code = ANY($1)
           ON CONFLICT DO NOTHING`,
          [writeCodes, group.manageCode],
        );
      }
      if (readCodes.length) {
        await queryRunner.query(
          `INSERT INTO "role_permissions" ("role_id", "permission_id")
           SELECT rp.role_id, p.id FROM "role_permissions" rp
           JOIN "permissions" old ON old.id = rp.permission_id AND old.code = $2
           JOIN "permissions" p ON p.code = ANY($1)
           ON CONFLICT DO NOTHING`,
          [readCodes, group.readCode],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const allCodes = this.groups.flatMap((g) =>
      Object.entries(g.resourceActions).flatMap(([m, actions]) => actions.map((a) => `${m}.${a}`)),
    );
    await queryRunner.query(
      `DELETE FROM "role_permissions"
       WHERE permission_id IN (SELECT id FROM "permissions" WHERE code = ANY($1))`,
      [allCodes],
    );
    await queryRunner.query(`DELETE FROM "permissions" WHERE code = ANY($1)`, [allCodes]);
  }
}
