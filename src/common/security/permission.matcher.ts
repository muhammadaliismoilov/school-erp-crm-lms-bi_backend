export enum PermissionMatchMode {
  EVERY = 'every',
  ANY = 'any',
}

export const permissionMatches = (
  assignedPermission: string,
  requiredPermission: string,
): boolean => {
  const [assignedModule, assignedAction] = assignedPermission.split('.');
  const [requiredModule, requiredAction] = requiredPermission.split('.');

  if (!assignedModule || !assignedAction || !requiredModule || !requiredAction) {
    return false;
  }

  const moduleMatches =
    assignedModule === '*' || assignedModule === requiredModule;
  const actionMatches =
    assignedAction === '*' || assignedAction === requiredAction;

  return moduleMatches && actionMatches;
};

export const userSatisfiesPermissions = (
  requiredPermissions: string[],
  assignedPermissions: ReadonlySet<string>,
  matchMode = PermissionMatchMode.EVERY,
): boolean => {
  if (requiredPermissions.length === 0) {
    return true;
  }

  const results = requiredPermissions.map((requiredPermission) =>
    Array.from(assignedPermissions).some((assignedPermission) =>
      permissionMatches(assignedPermission, requiredPermission),
    ),
  );

  return matchMode === PermissionMatchMode.ANY
    ? results.some(Boolean)
    : results.every(Boolean);
};
