/**
 * Mock for DatabaseService used in tests
 */

import { jest } from '@jest/globals';
import { User } from '../../src/types';
import { createMockUser } from './user.mock';

export interface MockDatabaseService {
  getUserByPhone: any;
  getUserByJid: any;
  createUser: any;
  updateUser: any;
  query: any;
  shutdown: any;
  initialize: any;
}

export const createMockDatabaseService = (): MockDatabaseService => {
  let mockUsers: Map<string, User> = new Map();
  let nextUserId = 1;

  const mock: MockDatabaseService = {
    getUserByPhone: jest.fn().mockImplementation(async (phoneNumber: any) => {
      const user = Array.from(mockUsers.values()).find(u => 
        u.phoneNumber.includes(phoneNumber) || u.phoneNumber === `+${phoneNumber}`
      );
      return user || null;
    }) as any,

    getUserByJid: jest.fn().mockImplementation(async (jid: any) => {
      return mockUsers.get(jid) || null;
    }) as any,

    createUser: jest.fn().mockImplementation(async (userData: any) => {
      const user = createMockUser({
        id: nextUserId++,
        ...userData,
      });
      
      if (user.jid) {
        mockUsers.set(user.jid, user);
      }
      if (user.phoneNumber) {
        mockUsers.set(user.phoneNumber, user);
      }
      
      return user;
    }) as any,

    updateUser: jest.fn().mockImplementation(async (id: any, updates: any) => {
      const existingUser = Array.from(mockUsers.values()).find(u => u.id === id);
      if (!existingUser) {
        throw new Error(`User with id ${id} not found`);
      }
      
      const updatedUser = { ...existingUser, ...updates };
      
      if (updatedUser.jid) {
        mockUsers.set(updatedUser.jid, updatedUser);
      }
      if (updatedUser.phoneNumber) {
        mockUsers.set(updatedUser.phoneNumber, updatedUser);
      }
      
      return updatedUser;
    }) as any,

    query: jest.fn().mockImplementation(async () => {
      return [];
    }) as any,

    shutdown: jest.fn() as any,
    initialize: jest.fn() as any,
  };

  // Helper method to reset the mock state
  (mock as any).reset = () => {
    mockUsers.clear();
    nextUserId = 1;
    jest.clearAllMocks();
  };

  return mock;
};

export const mockDatabaseService = createMockDatabaseService();
