// Mock para sqlite3
export const mockSqlite3 = {
  Database: jest.fn().mockImplementation(() => ({
    run: jest.fn((sql, params, callback) => callback && callback(null)),
    get: jest.fn((sql, params, callback) => callback && callback(null, null)),
    all: jest.fn((sql, params, callback) => callback && callback(null, [])),
    close: jest.fn((callback) => callback && callback(null)),
    serialize: jest.fn((fn) => fn()),
    parallelize: jest.fn((fn) => fn()),
  })),
  OPEN_READWRITE: 2,
  OPEN_CREATE: 4,
};

// Mock para UserModel
export const mockUserModel = {
  init: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  createUser: jest.fn().mockResolvedValue({ success: true }),
  findUserByJid: jest.fn().mockResolvedValue(null),
  updateUser: jest.fn().mockResolvedValue({ success: true }),
  deleteUser: jest.fn().mockResolvedValue({ success: true }),
  getAllUsers: jest.fn().mockResolvedValue([]),
};

// Mock para logger
export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};
