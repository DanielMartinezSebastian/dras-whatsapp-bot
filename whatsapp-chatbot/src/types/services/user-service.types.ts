import type { User, UserType, UserMetadata } from "../core/user.types";

export interface UserServiceConfig {
  autoRegister: boolean;
  defaultUserType: UserType;
  registrationFlow: boolean;
  maxDailyMessages: number;
}

export interface UserQuery {
  jid?: string;
  phoneNumber?: string;
  userType?: UserType;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface UserUpdateData {
  display_name?: string;
  user_type?: UserType;
  is_active?: boolean;
  metadata?: Partial<UserMetadata>;
}
