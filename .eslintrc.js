module.exports = {
  extends: [
    'plugin:shopify/typescript',
    'plugin:shopify/prettier',
    'plugin:shopify/webpack',
    'plugin:shopify/jest',
  ],
  ignorePatterns: [
    'node_modules/',
    'packages/*/build/',
    'packages/*/*.d.ts',
    'packages/*/*.js',
    '!packages/*/.eslintrc.js',
    'packages/*/*.mjs',
    'packages/*/*.node',
    'packages/*/*.esnext',
  ],
};
