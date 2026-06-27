import { UserRole } from "@prisma/client";

export const PERMISSIONS = {
  "knowledge.read": [UserRole.FOUNDER, UserRole.ADMINISTRATOR, UserRole.DEVELOPER, UserRole.COMPLIANCE, UserRole.VIEWER] as UserRole[],
  "knowledge.write": [UserRole.FOUNDER, UserRole.ADMINISTRATOR, UserRole.DEVELOPER] as UserRole[],
  "knowledge.delete": [UserRole.FOUNDER, UserRole.ADMINISTRATOR] as UserRole[],
  "customer.manage": [UserRole.FOUNDER, UserRole.ADMINISTRATOR, UserRole.SALES, UserRole.SUPPORT] as UserRole[],
  "ai.use": [UserRole.FOUNDER, UserRole.ADMINISTRATOR, UserRole.DEVELOPER] as UserRole[],
  "compliance.manage": [UserRole.FOUNDER, UserRole.ADMINISTRATOR, UserRole.COMPLIANCE] as UserRole[],
  "revenue.manage": [UserRole.FOUNDER, UserRole.ADMINISTRATOR] as UserRole[],
  "admin.access": [UserRole.FOUNDER, UserRole.ADMINISTRATOR] as UserRole[],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}

export function isAdmin(role: UserRole): boolean {
  return role === UserRole.FOUNDER || role === UserRole.ADMINISTRATOR;
}
