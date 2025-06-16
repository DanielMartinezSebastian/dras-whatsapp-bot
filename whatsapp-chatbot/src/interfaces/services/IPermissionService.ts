import { User } from "../../types/core/user.types";
import {
  PermissionResult,
  PermissionCheck,
} from "../../types/services/permission.types";
import { Permission } from "../../types/commands/command.types";

export interface IPermissionService {
  checkPermission(check: PermissionCheck): Promise<PermissionResult>;
  hasPermission(user: User, permission: Permission): boolean;
  grantPermission(user: User, permission: Permission): Promise<boolean>;
  revokePermission(user: User, permission: Permission): Promise<boolean>;
  getUserPermissions(user: User): Permission[];
}
