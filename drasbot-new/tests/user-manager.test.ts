/**
 * User Manager Service Tests
 */

import { UserManagerService } from '../src/services/user-manager.service';
import { UserLevel, User } from '../src/types';

// Mock dependencies - Need to mock the modules before importing
const mockDatabaseService = {
  getUserByJid: jest.fn(),
  getUserByPhone: jest.fn(),
  getUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  getUsersByLevel: jest.fn(),
  getUserStats: jest.fn(),
  getInstance: jest.fn(),
};

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  getInstance: jest.fn(),
};

// Mock the modules
jest.mock('../src/services/database.service', () => ({
  DatabaseService: {
    getInstance: () => mockDatabaseService,
  },
}));

jest.mock('../src/utils/logger', () => ({
  Logger: {
    getInstance: () => mockLogger,
  },
}));

describe('UserManagerService', () => {
  let userManagerService: UserManagerService;

  const mockUser: User = {
    id: 1,
    jid: 'test@s.whatsapp.net',
    phoneNumber: '1234567890',
    name: 'Test User',
    userLevel: UserLevel.USER,
    isRegistered: true,
    registrationDate: new Date('2023-01-01'),
    lastActivity: new Date('2023-06-01'),
    messageCount: 5,
    banned: false,
    preferences: { language: 'es' },
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-06-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mock implementations
    Object.values(mockDatabaseService).forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockClear();
      }
    });
    
    Object.values(mockLogger).forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockClear();
      }
    });

    userManagerService = UserManagerService.getInstance();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = UserManagerService.getInstance();
      const instance2 = UserManagerService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getUserByJid', () => {
    it('should return user when found', async () => {
      mockDatabaseService.getUserByJid.mockResolvedValue(mockUser);

      const result = await userManagerService.getUserByJid('test@s.whatsapp.net');

      expect(result).toEqual(mockUser);
      expect(mockDatabaseService.getUserByJid).toHaveBeenCalledWith('test@s.whatsapp.net');
    });

    it('should return null when user not found', async () => {
      mockDatabaseService.getUserByJid.mockResolvedValue(null);

      const result = await userManagerService.getUserByJid('nonexistent@s.whatsapp.net');

      expect(result).toBeNull();
    });

    it('should handle errors properly', async () => {
      const error = new Error('Database error');
      mockDatabaseService.getUserByJid.mockRejectedValue(error);

      await expect(userManagerService.getUserByJid('test@s.whatsapp.net')).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('UserManager', 'Failed to get user by JID', expect.any(Object));
    });
  });

  describe('getUserByPhoneNumber', () => {
    it('should return user when found', async () => {
      mockDatabaseService.getUserByPhone.mockResolvedValue(mockUser);

      const result = await userManagerService.getUserByPhoneNumber('1234567890');

      expect(result).toEqual(mockUser);
      expect(mockDatabaseService.getUserByPhone).toHaveBeenCalledWith('1234567890');
    });

    it('should return null when user not found', async () => {
      mockDatabaseService.getUserByPhone.mockResolvedValue(null);

      const result = await userManagerService.getUserByPhoneNumber('9999999999');

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      mockDatabaseService.getUserById.mockResolvedValue(mockUser);

      const result = await userManagerService.getUserById(1);

      expect(result).toEqual(mockUser);
      expect(mockDatabaseService.getUserById).toHaveBeenCalledWith(1);
    });
  });

  describe('createUser', () => {
    it('should create user with provided data', async () => {
      const userData = {
        jid: 'new@s.whatsapp.net',
        phoneNumber: '9876543210',
        name: 'New User',
        userLevel: UserLevel.USER,
      };

      mockDatabaseService.createUser.mockResolvedValue(mockUser);

      const result = await userManagerService.createUser(userData);

      expect(result).toEqual(mockUser);
      expect(mockDatabaseService.createUser).toHaveBeenCalledWith(expect.objectContaining({
        jid: 'new@s.whatsapp.net',
        phoneNumber: '9876543210',
        name: 'New User',
        userLevel: UserLevel.USER,
        isRegistered: false,
        messageCount: 0,
        banned: false,
        preferences: {},
      }));
      expect(mockLogger.info).toHaveBeenCalledWith('UserManager', 'User created successfully', expect.any(Object));
    });

    it('should create user with default values', async () => {
      const userData = {};
      mockDatabaseService.createUser.mockResolvedValue(mockUser);

      const result = await userManagerService.createUser(userData);

      expect(result).toEqual(mockUser);
      expect(mockDatabaseService.createUser).toHaveBeenCalledWith(expect.objectContaining({
        jid: '',
        phoneNumber: '',
        name: '',
        userLevel: UserLevel.USER,
        isRegistered: false,
        messageCount: 0,
        banned: false,
        preferences: {},
      }));
    });
  });

  describe('updateUser', () => {
    it('should update user and return updated user', async () => {
      const updates = { name: 'Updated Name', messageCount: 10 };
      const updatedUser = { ...mockUser, ...updates };
      
      mockDatabaseService.updateUser.mockResolvedValue(updatedUser);

      const result = await userManagerService.updateUser(1, updates);

      expect(result).toEqual(updatedUser);
      expect(mockDatabaseService.updateUser).toHaveBeenCalledWith('1', updates);
      expect(mockLogger.info).toHaveBeenCalledWith('UserManager', 'User updated successfully', expect.any(Object));
    });
  });

  describe('getUsersByLevel', () => {
    it('should return users by level', async () => {
      const mockUsers = [mockUser];
      mockDatabaseService.getUsersByLevel.mockResolvedValue(mockUsers);

      const result = await userManagerService.getUsersByLevel(UserLevel.ADMIN);

      expect(result).toEqual(mockUsers);
      expect(mockDatabaseService.getUsersByLevel).toHaveBeenCalledWith(UserLevel.ADMIN);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        totalUsers: 100,
        registeredUsers: 75,
        activeUsers: 50,
        bannedUsers: 5,
      };
      mockDatabaseService.getUserStats.mockResolvedValue(mockStats);

      const result = await userManagerService.getUserStats();

      expect(result).toEqual(mockStats);
      expect(mockLogger.info).toHaveBeenCalledWith('UserManager', 'Retrieved user stats', mockStats);
    });
  });

  describe('registerUser', () => {
    it('should register user and update registration status', async () => {
      const registeredUser = { ...mockUser, isRegistered: true, registrationDate: new Date() };
      mockDatabaseService.updateUser.mockResolvedValue(registeredUser);

      const result = await userManagerService.registerUser(1);

      expect(result).toEqual(registeredUser);
      expect(mockDatabaseService.updateUser).toHaveBeenCalledWith('1', {
        isRegistered: true,
        registrationDate: expect.any(Date),
      });
      expect(mockLogger.info).toHaveBeenCalledWith('UserManager', 'User registered successfully', { userId: 1 });
    });
  });

  describe('banUser', () => {
    it('should ban user when banned=true', async () => {
      const bannedUser = { ...mockUser, banned: true };
      mockDatabaseService.updateUser.mockResolvedValue(bannedUser);

      const result = await userManagerService.banUser(1, true);

      expect(result).toEqual(bannedUser);
      expect(mockDatabaseService.updateUser).toHaveBeenCalledWith('1', { banned: true });
      expect(mockLogger.info).toHaveBeenCalledWith('UserManager', 'User ban status updated', { userId: 1, banned: true });
    });

    it('should unban user when banned=false', async () => {
      const unbannedUser = { ...mockUser, banned: false };
      mockDatabaseService.updateUser.mockResolvedValue(unbannedUser);

      const result = await userManagerService.banUser(1, false);

      expect(result).toEqual(unbannedUser);
      expect(mockDatabaseService.updateUser).toHaveBeenCalledWith('1', { banned: false });
    });
  });

  describe('hasPermission', () => {
    it('should return true for user with sufficient level', () => {
      const adminUser = { ...mockUser, userLevel: UserLevel.ADMIN };
      
      const result = userManagerService.hasPermission(adminUser, UserLevel.USER);
      
      expect(result).toBe(true);
    });

    it('should return false for user with insufficient level', () => {
      const regularUser = { ...mockUser, userLevel: UserLevel.USER };
      
      const result = userManagerService.hasPermission(regularUser, UserLevel.ADMIN);
      
      expect(result).toBe(false);
    });

    it('should return false for banned user even with sufficient level', () => {
      const bannedAdmin = { ...mockUser, userLevel: UserLevel.ADMIN, banned: true };
      
      const result = userManagerService.hasPermission(bannedAdmin, UserLevel.USER);
      
      expect(result).toBe(false);
    });

    it('should handle OWNER level correctly', () => {
      const ownerUser = { ...mockUser, userLevel: UserLevel.OWNER };
      
      const result = userManagerService.hasPermission(ownerUser, UserLevel.ADMIN);
      
      expect(result).toBe(true);
    });

    it('should handle BANNED level correctly', () => {
      const bannedUserLevel = { ...mockUser, userLevel: UserLevel.BANNED };
      
      const result = userManagerService.hasPermission(bannedUserLevel, UserLevel.USER);
      
      expect(result).toBe(false);
    });
  });

  describe('updateLastActivity', () => {
    it('should update user last activity', async () => {
      const updatedUser = { ...mockUser, lastActivity: new Date() };
      mockDatabaseService.updateUser.mockResolvedValue(updatedUser);

      await userManagerService.updateLastActivity(1);

      expect(mockDatabaseService.updateUser).toHaveBeenCalledWith('1', { lastActivity: expect.any(Date) });
      expect(mockLogger.debug).toHaveBeenCalledWith('UserManager', 'User last activity updated', { userId: 1 });
    });
  });
});
