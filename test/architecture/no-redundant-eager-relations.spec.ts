import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Arxitektura qorovuli: EAGER RELATION QAYTA SO'RALMASIN.
 *
 * `{ eager: true }` bilan belgilangan relation entity'ning HAR bir so'rovida
 * avtomatik JOIN qilinadi. Chaqiruvchi ustiga yana `relations: { x: true }`
 * bersa, TypeORM buni "yana bir" so'rov deb tushunib IKKINCHI, mustaqil JOIN
 * yo'lagi ochadi — natija kombinatorial ko'payadi (R ta bog'liq qator ikki
 * yo'lakda joylashsa, natija to'plami R² ga yaqinlashadi).
 *
 * Aynan shu naqsh 2026-09-03'da `users` jadvalida topildi: `User.roles` va
 * `Role.permissions` ikkalasi ham eager, ustiga 8 ta service metodida qo'lda
 * `relations: { roles: true }` qo'shilgan edi — natijada bitta foydalanuvchi
 * so'rovi 8.15 soniya davom etgan (`pg_stat_statements` bilan o'lchandi).
 * Xuddi shu xato sinfi ilgari `RolesService.findRoleEntity()`da ham chiqqan
 * edi (`identity-seed-idempotency-fix.md`) — bu safar butun kodda umumiy
 * qoida sifatida qulflanadi, faqat ikkita entity emas.
 */
const SRC = join(__dirname, '..', '..', 'src');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const sourceFiles = walk(SRC).filter((file) => file.endsWith('.ts'));
const entityFiles = sourceFiles.filter((file) => file.endsWith('.entity.ts'));

const RELATION_DECORATOR = /@(OneToMany|ManyToOne|ManyToMany|OneToOne)\(/g;

/** Dekorator ochilish qavsidan boshlab, chuqurlik hisobi bilan yopuvchi `)` ni topadi. */
function matchParen(content: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < content.length; i += 1) {
    if (content[i] === '(') depth += 1;
    else if (content[i] === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Relation dekoratoridan keyingi property nomini topadi — orada `@JoinTable(...)`
 * kabi qo'shimcha dekoratorlar bo'lishi mumkin (masalan `user.entity.ts:99-105`:
 * `@ManyToMany(...) @JoinTable({...}) roles: Role[];`), shuning uchun "keyingi
 * satr" emas, "keyingi identifikator (dekoratorlarni chetlab)" qidiriladi.
 */
function propertyNameAfter(content: string, fromIndex: number): string | null {
  let i = fromIndex;
  for (;;) {
    while (i < content.length && /\s/.test(content[i])) i += 1;
    if (content[i] !== '@') break;
    const nameMatch = content.slice(i).match(/^@\w+/);
    if (!nameMatch) return null;
    i += nameMatch[0].length;
    let j = i;
    while (j < content.length && /\s/.test(content[j])) j += 1;
    if (content[j] === '(') {
      const close = matchParen(content, j);
      if (close === -1) return null;
      i = close + 1;
    } else {
      i = j;
    }
  }
  const propMatch = content.slice(i).match(/^(\w+)\s*\??\s*:/);
  return propMatch ? propMatch[1] : null;
}

/** `entity nomi -> shu entity'da eager:true bo'lgan property nomlari` xaritasi. */
function collectEagerRelations(): Map<string, Set<string>> {
  const byEntity = new Map<string, Set<string>>();

  for (const file of entityFiles) {
    const content = readFileSync(file, 'utf8');
    const classMatch = content.match(/export class (\w+)\b/);
    if (!classMatch) continue;
    const entityName = classMatch[1];

    for (const hit of content.matchAll(RELATION_DECORATOR)) {
      const openIndex = hit.index! + hit[0].length - 1;
      const closeIndex = matchParen(content, openIndex);
      if (closeIndex === -1) continue;
      const args = content.slice(openIndex + 1, closeIndex);
      if (!/eager\s*:\s*true/.test(args)) continue;

      const propName = propertyNameAfter(content, closeIndex + 1);
      if (!propName) continue;

      if (!byEntity.has(entityName)) byEntity.set(entityName, new Set());
      byEntity.get(entityName)!.add(propName);
    }
  }

  return byEntity;
}

/** Konstruktordagi `@InjectRepository(Entity) private readonly prop: Repository<Entity>` juftliklari. */
function injectedRepositories(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const hit of content.matchAll(
    /@InjectRepository\((\w+)\)\s*(?:private|public|protected)\s+(?:readonly\s+)?(\w+)\s*:/g,
  )) {
    map.set(hit[2], hit[1]);
  }
  return map;
}

/** `relations:` argumentining tanasi ({ ... } yoki [ ... ]) — chuqurlik hisobi bilan. */
function relationsBody(content: string): string[] {
  const match = content.match(/relations\s*:\s*([[{])/);
  if (!match) return [];
  const open = match.index! + match[0].length - 1;
  const closeChar = match[1] === '{' ? '}' : ']';
  const openChar = match[1];
  let depth = 0;
  let end = -1;
  for (let i = open; i < content.length; i += 1) {
    if (content[i] === openChar) depth += 1;
    else if (content[i] === closeChar) {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return [];
  const body = content.slice(open + 1, end);
  return [...body.matchAll(/(\w+)\s*:\s*true|['"](\w+)['"]/g)].map((m) => m[1] ?? m[2]);
}

interface Offender {
  file: string;
  repoProperty: string;
  entity: string;
  relation: string;
}

function findRedundantEagerRelations(): Offender[] {
  const eagerByEntity = collectEagerRelations();
  const offenders: Offender[] = [];

  for (const file of sourceFiles) {
    if (file.endsWith('.entity.ts') || file.includes('/test/')) continue;
    const content = readFileSync(file, 'utf8');
    if (!content.includes('relations')) continue;

    const repos = injectedRepositories(content);
    if (repos.size === 0) continue;

    for (const [repoProperty, entity] of repos) {
      const eagerProps = eagerByEntity.get(entity);
      if (!eagerProps || eagerProps.size === 0) continue;

      // shu repo orqali chaqirilgan har bir `.method(...)` — argument tanasi
      // o'zining yopuvchi qavsigacha aniq kesib olinadi (qo'shni chaqiruvlar
      // bilan aralashmasin, aks holda bitta relations bir necha marta sanaladi).
      const callPattern = new RegExp(`this\\.${repoProperty}\\.\\w+\\(`, 'g');
      for (const call of content.matchAll(callPattern)) {
        const openIndex = call.index! + call[0].length - 1;
        const closeIndex = matchParen(content, openIndex);
        if (closeIndex === -1) continue;
        const args = content.slice(openIndex + 1, closeIndex);

        for (const key of relationsBody(args)) {
          if (eagerProps.has(key)) {
            offenders.push({
              file: file.slice(SRC.length + 1),
              repoProperty,
              entity,
              relation: key,
            });
          }
        }
      }
    }
  }

  return offenders;
}

describe('eager relation qayta so‘ralmasin', () => {
  it('entity darajasida eager:true bo‘lgan relation service so‘rovida qayta talab qilinmaydi', () => {
    const offenders = findRedundantEagerRelations().map(
      (o) => `${o.entity}.${o.relation} — this.${o.repoProperty} (${o.file})`,
    );
    expect(offenders).toEqual([]);
  });

  it('qorovul haqiqatan eager relationlarni topadi (o‘lik sinov emas)', () => {
    const eager = collectEagerRelations();
    const total = [...eager.values()].reduce((sum, set) => sum + set.size, 0);
    expect(total).toBeGreaterThan(0);
  });
});
