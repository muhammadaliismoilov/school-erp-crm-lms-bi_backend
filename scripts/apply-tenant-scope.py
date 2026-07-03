#!/usr/bin/env python3
"""Phase4: service'larga tenant filtrini qo'shish (yarim-avtomat).

Konservativ regex'lar bilan uchta transformatsiya:
  1) qb: `.where('<alias>.deleted_at IS NULL');` dan keyin applyTenantScope(...)
  2) bir qatorli `this.<repo>.findOne({ where: { ... } ... })` — tenantWhere bilan o'rash
  3) constructor'ga TenantContextService inject + kerakli importlar

Murakkab joylar qo'lda tugatiladi; natija diff sifatida ko'rib chiqiladi.
Bir martalik yordamchi skript. Foydalanish: python3 scripts/apply-tenant-scope.py <fayl...>
"""
import re
import sys
from pathlib import Path

def rel_common(path: Path) -> str:
    # src/modules/<m>/x.service.ts -> ../../common ; chuqurroq bo'lsa mos ravishda
    depth = len(path.parts) - path.parts.index('modules') - 2
    return '../' * (depth + 1) + 'common'

def repo_entity_map(text: str) -> dict:
    """@InjectRepository(X) private readonly name -> {name: X}"""
    return {m.group(2): m.group(1) for m in re.finditer(
        r'@InjectRepository\((\w+)\)\s*(?:private readonly|private|readonly)\s+(\w+)', text)}

def transform(path: Path) -> None:
    text = path.read_text()
    orig = text
    repos = repo_entity_map(text)

    # 1) QueryBuilder: deleted_at filtridan keyin tenant filtri.
    text = re.sub(
        r"(\.where\('(\w+)\.deleted_at IS NULL'\);\n)",
        lambda m: m.group(1) + f"    applyTenantScope(qb, '{m.group(2)}', this.tenant, {{ branch: true }});\n",
        text,
    )

    # 2) Bir qatorli findOne({ where: { ... }, ... }) — faqat oddiy obyekt literal.
    def wrap_findone(m: re.Match) -> str:
        prop, inner = m.group(1), m.group(2)
        entity = repos.get(prop)
        generic = f'<{entity}>' if entity else ''
        return f"this.{prop}.findOne({{ where: tenantWhere{generic}(this.tenant, {{ {inner} }}, {{ branch: true }})"
    text = re.sub(
        r"this\.(\w+)\.findOne\(\{ where: \{ ([^{}]*) \}",
        wrap_findone,
        text,
    )

    if text == orig:
        return

    # 3) Constructor injection (faqat bo'sh tanali `) {}` uslubi).
    if 'this.tenant' in text and 'TenantContextService' not in text:
        # Avval ko'p qatorli uslub (`\n  ) {}`), keyin bir qatorli.
        text, n = re.subn(r"\n(  \) \{\})", "\n    private readonly tenant: TenantContextService,\n\\1", text, count=1)
        if n == 0:
            text = re.sub(r"\) \{\}", ", private readonly tenant: TenantContextService) {}", text, count=1)

    # 4) Importlar.
    common = rel_common(path.relative_to(ROOT))
    imports = []
    if 'TenantContextService' in text and f"from '{common}/tenant/tenant-context.service'" not in text:
        imports.append(f"import {{ TenantContextService }} from '{common}/tenant/tenant-context.service';")
    used = [u for u in ('applyTenantScope', 'tenantWhere') if re.search(rf'\b{u}[<(]', text)]
    if used and 'tenant-scope.util' not in text:
        imports.append(f"import {{ {', '.join(used)} }} from '{common}/tenant/tenant-scope.util';")
    if imports:
        lines = text.splitlines(keepends=True)
        # Ko'p qatorli import bloklarini buzmaslik uchun faqat `;` bilan tugagan
        # import qatorlaridan keyin joylashtiramiz.
        last_import = max(i for i, l in enumerate(lines) if l.startswith('import ') and l.rstrip().endswith(';'))
        lines.insert(last_import + 1, '\n'.join(imports) + '\n')
        text = ''.join(lines)

    path.write_text(text)
    print(f"~ {path}")

ROOT = Path(__file__).resolve().parent.parent
for arg in sys.argv[1:]:
    transform(Path(arg).resolve())
