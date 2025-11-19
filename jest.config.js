module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.e2e.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.e2e.test.ts',
    '!src/spec/**',
  ],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
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
  setupFiles: ['<rootDir>/test.setup.ts'],
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
      isolatedModules: true, // <-- disables type checking
    },
  },
  // Increase timeout for tests (MongoDB Memory Server can be slow)
  testTimeout: 30000,
};
