module.exports = {
  extends: ['plugin:@sewing-kit/typescript', 'plugin:@sewing-kit/prettier'],
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
  overrides: [
    {
      files: ['sewing-kit.config.ts', 'config/sewing-kit/**/*'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],
};
