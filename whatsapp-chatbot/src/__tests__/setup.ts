// Test setup file
import { mockSqlite3, mockLogger } from "./__mocks__/dependencies";

// Mock sqlite3 before any imports
jest.mock("sqlite3", () => mockSqlite3);

// Mock logger
jest.mock("../utils/logger", () => mockLogger);

// Set up common test environment variables
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  // Uncomment if you want to hide console logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Set up common test environment variables
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
