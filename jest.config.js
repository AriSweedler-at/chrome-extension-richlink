export default {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.test.js'],
  transform: {},
  collectCoverageFrom: [
    'content/**/*.js',
    '!content/content.js',
  ],
};
