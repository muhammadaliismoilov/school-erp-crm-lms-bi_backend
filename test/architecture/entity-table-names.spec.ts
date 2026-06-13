import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Architecture guard: every @Entity must map to a unique physical table.
 *
 * Two entities sharing a table name silently corrupt the generated schema
 * (the later-loaded metadata wins, and `migration:generate` oscillates).
 * This regression test pins the invariant after the historical
 * `admission_applications` collision between the CRM and Admissions modules.
 */
const SRC = join(__dirname, '..', '..', 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('entity table-name uniqueness', () => {
  it('does not declare the same table on two entities', () => {
    const tableToFiles = new Map<string, string[]>();

    for (const file of walk(SRC)) {
      if (!file.endsWith('.entity.ts')) continue;
      const content = readFileSync(file, 'utf8');
      const match = content.match(/@Entity\(\s*['"]([a-z0-9_]+)['"]/i);
      if (!match) continue;
      const table = match[1];
      const list = tableToFiles.get(table) ?? [];
      list.push(file.replace(SRC, 'src'));
      tableToFiles.set(table, list);
    }

    const collisions = [...tableToFiles.entries()].filter(
      ([, files]) => files.length > 1,
    );

    expect(tableToFiles.size).toBeGreaterThan(50);
    expect(collisions).toEqual([]);
  });
});
