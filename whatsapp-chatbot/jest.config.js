/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/types/**/*.ts",
    "!src/interfaces/**/*.ts",
  ],
  moduleNameMapper: {
    "^@types/(.*)$": "<rootDir>/src/types/$1",
    "^@interfaces/(.*)$": "<rootDir>/src/interfaces/$1",
    "^@core/(.*)$": "<rootDir>/src/bot/core/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
};
