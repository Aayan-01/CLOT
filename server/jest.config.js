module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // tests directory is 'test' in this repo
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/types/*.ts'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};