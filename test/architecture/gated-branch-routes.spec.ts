import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GATED_MODULE_KEYS } from '../../src/modules/schools/gated-modules';

/**
 * Arxitektura qorovuli: filial yo'llari bayroqqa bog'langan, MAKTAB yo'li esa yo'q.
 *
 * `HrController` — bitta ulkan kontroller: filiallar, xodimlar, ta'tillar,
 * oylik, vazifalar hammasi shu yerda. Shu sabab ikki teskari xato oson bo'ladi:
 *
 *  1. Bayroq CLASS darajasiga qo'yilsa — butun HR bo'limi yopilib qoladi;
 *  2. `GET hr/schools/options` ham bayroqqa tushib qolsa — MAKTAB TANLAGICHI
 *     ishlamay qoladi (u shu yo'ldan boqiladi), ya'ni bosh ofis umuman maktab
 *     tanlay olmaydi va bayroqni yoqishning ham iloji qolmaydi.
 */
const CONTROLLER = join(__dirname, '..', '..', 'src', 'modules', 'hr', 'hr.controller.ts');
const source = readFileSync(CONTROLLER, 'utf8');

/** Bitta qatordagi marshrut e'lonlari (`hr.controller` shu uslubda yozilgan). */
const routeLines = source
  .split('\n')
  .filter((line) => /@(Get|Post|Patch|Delete)\('/.test(line));

const pathOf = (line: string): string => line.match(/@(?:Get|Post|Patch|Delete)\('([^']*)'/)![1];

describe('filial yo‘llari maktab bayrog‘iga bog‘langan', () => {
  it('marshrutlar topildi (skaner ishlayotganining kafolati)', () => {
    expect(routeLines.length).toBeGreaterThan(20);
  });

  it('har bir `branches` yo‘li @RequiresModule bilan belgilangan', () => {
    const unguarded = routeLines
      .filter((line) => pathOf(line).startsWith('branches'))
      .filter((line) => !line.includes("@RequiresModule('branches')"))
      .map(pathOf);
    expect(unguarded).toEqual([]);
  });

  it('`schools/options` bayroqqa BOG‘LANMAGAN — maktab tanlagichi shundan boqiladi', () => {
    const schoolRoutes = routeLines.filter((line) => pathOf(line).startsWith('schools/'));
    expect(schoolRoutes.length).toBeGreaterThan(0);
    expect(schoolRoutes.filter((line) => line.includes('@RequiresModule'))).toEqual([]);
  });

  it('bayroq class darajasida QO‘YILMAGAN — aks holda butun HR yopilardi', () => {
    const beforeClassBody = source.slice(0, source.indexOf('export class HrController'));
    expect(beforeClassBody).not.toMatch(/@RequiresModule\(/);
  });

  it('`branches` bayroqli modullar reyestrida bor', () => {
    expect(GATED_MODULE_KEYS).toContain('branches');
  });
});
