module.exports = {
  extends: ['plugin:@sewing-kit/typescript', 'plugin:@sewing-kit/prettier'],
  ignorePatterns: [
    'examples/',
    'node_modules/',
    'packages/*/build/',
    'packages/*/*.d.ts',
    'packages/*/*.js',
    '!packages/*/.eslintrc.js',
    'packages/*/*.mjs',
    'packages/*/*.node',
    'packages/*/*.esnext',
  ],
  rules: {
    'lines-around-comment': 'off',
    // Needed a resolution to fix some TS 4.0 linting, these rules no longer exist
    '@typescript-eslint/ban-ts-ignore': 'off',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/class-name-casing': 'off',
    // Buggy rules
    'babel/no-unused-expressions': 'off',
    // Should improve these but too many errors for now
    '@typescript-eslint/ban-types': 'off',
  },
  overrides: [
    {
      files: ['sewing-kit.config.ts', 'config/sewing-kit/**/*'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],
};
