/**
 * User Mock Factory for Testing
 * 
 * Factory functions to create properly typed User objects for testing
 */

import { User, UserLevel } from '../../src/types';

/**
 * Creates a mock User object with default values
 */
export const createMockUser = (overrides: Partial<User> = {}): User => {
  const defaultUser: User = {
    id: 1,
    jid: 'testuser@s.whatsapp.net',
    phoneNumber: '+1234567890',
    name: 'Test User',
    userLevel: UserLevel.USER,
    isRegistered: true,
    registrationDate: new Date(),
    lastActivity: new Date(),
    messageCount: 0,
    banned: false,
    preferences: {
      notifications: true,
      auto_reply: false,
      language: 'es',
      timezone: 'UTC',
      privacy_level: 'normal',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { ...defaultUser, ...overrides };
};

/**
 * Creates a mock admin User
 */
export const createMockAdminUser = (overrides: Partial<User> = {}): User => {
  return createMockUser({
    id: 999,
    jid: 'admin@s.whatsapp.net',
    phoneNumber: '+1234567899',
    name: 'Admin User',
    userLevel: UserLevel.ADMIN,
    ...overrides,
  });
};

/**
 * Creates a mock banned User
 */
export const createMockBannedUser = (overrides: Partial<User> = {}): User => {
  return createMockUser({
    id: 666,
    jid: 'banned@s.whatsapp.net',
    phoneNumber: '+1234567866',
    name: 'Banned User',
    userLevel: UserLevel.BANNED,
    banned: true,
    ...overrides,
  });
};

/**
 * Creates a mock unregistered User
 */
export const createMockUnregisteredUser = (overrides: Partial<User> = {}): User => {
  return createMockUser({
    id: 2,
    jid: 'newuser@s.whatsapp.net',
    phoneNumber: '+1234567891',
    name: 'New User',
    isRegistered: false,
    registrationDate: null,
    messageCount: 0,
    ...overrides,
  });
};
