export enum UserGender {
  MALE = "male",
  FEMALE = "female",
}

export enum UserManagementRole {
  ADMIN = "ADMIN",
  SALES_MANAGER = "SALES_MANAGER",
  STUDENT = "STUDENT",
  PARENT = "PARENT",
  TEACHER = "TEACHER",
  TUTOR = "TUTOR",
  SUPERMANAGER = "SUPERMANAGER",
  OPERATOR = "OPERATOR",
  ACCOUNTANT = "ACCOUNTANT",
}

export const userManagementRoleCandidates: Record<
  UserManagementRole,
  string[]
> = {
  [UserManagementRole.ADMIN]: ["admin", "director", "super-admin"],
  [UserManagementRole.SALES_MANAGER]: ["sales-manager", "manager"],
  [UserManagementRole.STUDENT]: ["student"],
  [UserManagementRole.PARENT]: ["parent"],
  [UserManagementRole.TEACHER]: ["teacher"],
  [UserManagementRole.TUTOR]: ["tutor", "teacher"],
  [UserManagementRole.SUPERMANAGER]: [
    "supermanager",
    "super-manager",
    "super-admin",
    "director",
  ],
  [UserManagementRole.OPERATOR]: ["operator"],
  [UserManagementRole.ACCOUNTANT]: ["accountant"],
};
