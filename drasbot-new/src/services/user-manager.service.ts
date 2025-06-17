/**
 * User Manager Service
 * Manages user CRUD operations with database integration and type mapping
 * Uses current DatabaseService mock implementation until full DB layer is implemented
 */

import { Logger } from '../utils/logger';
import { DatabaseService } from './database.service';
import {
  User,
  UserLevel,
} from '../types';

export class UserManagerService {
  private static instance: UserManagerService;
  private readonly logger: Logger;
  private readonly db: DatabaseService;

  private constructor() {
    this.logger = Logger.getInstance();
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): UserManagerService {
    if (!UserManagerService.instance) {
      UserManagerService.instance = new UserManagerService();
    }
    return UserManagerService.instance;
  }

  public async getUserByJid(jid: string): Promise<User | null> {
    try {
      const user = await this.db.getUserByJid(jid);
      return user;
    } catch (error) {
      this.logger.error('UserManager', 'Failed to get user by JID', { jid, error });
      throw error;
    }
  }

  public async getUserByPhoneNumber(phoneNumber: string): Promise<User | null> {
    try {
      const user = await this.db.getUserByPhone(phoneNumber);
      return user;
    } catch (error) {
      this.logger.error('UserManager', 'Failed to get user by phone number', { phoneNumber, error });
      throw error;
    }
  }

  public async getUserById(userId: number): Promise<User | null> {
    try {
      const user = await this.db.getUserById(userId);
      return user;
    } catch (error) {
      this.logger.error('UserManager', 'Failed to get user by ID', { userId, error });
      throw error;
    }
  }

  public async createUser(userData: Partial<User>): Promise<User> {
    try {
      // Prepare user data with defaults
      const userToCreate: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
        jid: userData.jid || '',
        phoneNumber: userData.phoneNumber || '',
        name: userData.name || '',
        userLevel: userData.userLevel || UserLevel.USER,
        isRegistered: userData.isRegistered || false,
        registrationDate: userData.registrationDate || null,
        lastActivity: userData.lastActivity || new Date(),
        messageCount: userData.messageCount || 0,
        banned: userData.banned || false,
        preferences: userData.preferences || {},
      };

      const user = await this.db.createUser(userToCreate);
      this.logger.info('UserManager', 'User created successfully', { userId: user.id, jid: userData.jid });
      return user;
    } catch (error) {
      this.logger.error('UserManager', 'Failed to create user', { userData, error });
      throw error;
    }
  }

  public async updateUser(userId: number, updates: Partial<User>): Promise<User> {
    try {
      const user = await this.db.updateUser(userId.toString(), updates);
      this.logger.info('UserManager', 'User updated successfully', { userId, updates: Object.keys(updates) });
      return user;
    } catch (error) {
      this.logger.error('UserManager', 'Failed to update user', { userId, updates, error });
      throw error;
    }
  }

  public async getUsersByLevel(userLevel: UserLevel): Promise<User[]> {
    try {
      const users = await this.db.getUsersByLevel(userLevel);
      return users;
    } catch (error) {
      this.logger.error('UserManager', 'Failed to get users by level', { userLevel, error });
      throw error;
    }
  }

  public async getUserStats(): Promise<{
    totalUsers: number;
    registeredUsers: number;
    activeUsers: number;
    bannedUsers: number;
  }> {
    try {
      const stats = await this.db.getUserStats();
      this.logger.info('UserManager', 'Retrieved user stats', stats);
      return stats;
    } catch (error) {
      this.logger.error('UserManager', 'Failed to get user stats', { error });
      throw error;
    }
  }

  public async updateLastActivity(userId: number): Promise<void> {
    try {
      await this.updateUser(userId, { lastActivity: new Date() });
      this.logger.debug('UserManager', 'User last activity updated', { userId });
    } catch (error) {
      this.logger.error('UserManager', 'Failed to update last activity', { userId, error });
      throw error;
    }
  }

  public async registerUser(userId: number): Promise<User> {
    try {
      const user = await this.updateUser(userId, {
        isRegistered: true,
        registrationDate: new Date(),
      });
      this.logger.info('UserManager', 'User registered successfully', { userId });
      return user;
    } catch (error) {
      this.logger.error('UserManager', 'Failed to register user', { userId, error });
      throw error;
    }
  }

  public async banUser(userId: number, banned: boolean = true): Promise<User> {
    try {
      const user = await this.updateUser(userId, { banned });
      this.logger.info('UserManager', 'User ban status updated', { userId, banned });
      return user;
    } catch (error) {
      this.logger.error('UserManager', 'Failed to ban/unban user', { userId, banned, error });
      throw error;
    }
  }

  public hasPermission(user: User, requiredLevel: UserLevel): boolean {
    const userLevelValue = this.getUserLevelValue(user.userLevel);
    const requiredLevelValue = this.getUserLevelValue(requiredLevel);
    
    return userLevelValue >= requiredLevelValue && !user.banned;
  }

  private getUserLevelValue(level: UserLevel): number {
    const levelValues: Record<UserLevel, number> = {
      [UserLevel.BANNED]: -1,
      [UserLevel.USER]: 0,
      [UserLevel.MODERATOR]: 3,
      [UserLevel.ADMIN]: 4,
      [UserLevel.OWNER]: 5,
    };
    
    return levelValues[level] || 0;
  }
}
