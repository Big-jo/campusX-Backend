/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/*.test.ts', '**/*.e2e.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
  ],
  moduleNameMapper: {
    '^@entities(.*)$': '<rootDir>/src/entities$1',
    '^@shared(.*)$': '<rootDir>/src/shared$1',
    '^@server(.*)$': '<rootDir>/src/Server$1',
    '^@spec(.*)$': '<rootDir>/src/spec$1',
    '^@routes(.*)$': '<rootDir>/src/routes$1',
    '^@models(.*)$': '<rootDir>/src/models$1',
    '^@middleware(.*)$': '<rootDir>/src/middleware$1',
    '^@lib(.*)$': '<rootDir>/src/lib$1',
    '^@interfaces(.*)$': '<rootDir>/src/interfaces$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }]
  },
  testTimeout: 30000,
  maxWorkers: 1, // Run e2e tests sequentially
};
