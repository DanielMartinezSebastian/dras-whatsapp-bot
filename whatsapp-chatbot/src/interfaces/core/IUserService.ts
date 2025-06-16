import { User, UserType } from "../../types/core/user.types";
import {
  UserQuery,
  UserUpdateData,
} from "../../types/services/user-service.types";

export interface IUserService {
  getUserByJid(jid: string): Promise<User | null>;
  getUserByPhone(phoneNumber: string): Promise<User | null>;
  createUser(userData: Partial<User>): Promise<User>;
  updateUser(jid: string, updateData: UserUpdateData): Promise<User>;
  deleteUser(jid: string): Promise<boolean>;
  updateUserType(jid: string, newType: UserType): Promise<User>;
  searchUsers(query: UserQuery): Promise<User[]>;
  getUserStats(jid: string): Promise<any>;
  isUserActive(jid: string): Promise<boolean>;
}
