/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // BETA.2 fix — this was `setupFiles` (runs BEFORE Jest installs the test
  // framework globals like beforeAll/describe), which is why every suite
  // failed with "beforeAll is not defined" the first time `npm test`
  // actually ran end-to-end. setup.ts uses beforeAll/afterAll, so it
  // belongs in `setupFilesAfterEnv` (runs after the framework is
  // installed). Pre-existing bug, unrelated to BETA.2 product code.
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  globalSetup: '<rootDir>/__tests__/globalSetup.ts',
  globalTeardown: '<rootDir>/__tests__/globalTeardown.ts',
  testTimeout: 15000,
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
  coverageDirectory: 'coverage',
  // ts-jest config
  transform: {
    '^.+\.ts$': ['ts-jest', { tsconfig: { strict: false } }]
  }
}
