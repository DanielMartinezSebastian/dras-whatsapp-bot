import type { User } from "../core/user.types";

export interface PermissionConfig {
  strictMode: boolean;
  defaultPermissions: Permission[];
  adminOverride: boolean;
}

export interface PermissionCheck {
  user: User;
  requiredPermission: Permission;
  context?: string;
}

export interface PermissionResult {
  granted: boolean;
  reason?: string;
  override?: boolean;
}

export type Permission = "user" | "admin" | "moderator" | "system";
