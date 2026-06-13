import {
  PermissionMatchMode,
  permissionMatches,
  userSatisfiesPermissions,
} from '../../src/common/security/permission.matcher';

describe('permission matcher', () => {
  it('matches exact permissions and wildcard scopes', () => {
    expect(permissionMatches('students.manage', 'students.manage')).toBe(true);
    expect(permissionMatches('students.*', 'students.delete')).toBe(true);
    expect(permissionMatches('*.*', 'finance.read')).toBe(true);
    expect(permissionMatches('students.read', 'students.manage')).toBe(false);
  });

  it('requires every permission by default and supports any-match mode', () => {
    const assignedPermissions = new Set(['students.read', 'finance.read']);

    expect(
      userSatisfiesPermissions(
        ['students.read', 'finance.read'],
        assignedPermissions,
      ),
    ).toBe(true);
    expect(
      userSatisfiesPermissions(
        ['students.read', 'finance.write'],
        assignedPermissions,
      ),
    ).toBe(false);
    expect(
      userSatisfiesPermissions(
        ['finance.write', 'finance.read'],
        assignedPermissions,
        PermissionMatchMode.ANY,
      ),
    ).toBe(true);
  });
});
