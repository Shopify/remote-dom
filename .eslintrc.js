/* eslint-env node */

module.exports = {
  extends: [
    'plugin:@shopify/typescript',
    'plugin:@shopify/jest',
    'plugin:@shopify/prettier',
  ],
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
    // Codebase was originally written without some strict Shopify conventions
    '@typescript-eslint/naming-convention': 'off',

    // This rule is just bad
    '@typescript-eslint/consistent-indexed-object-style': 'off',

    // Shopify configuration messes up on comments at the start of blocks
    'lines-around-comment': 'off',

    // Only a problem in extremely outdated browsers ("IE 8 and earlier")
    'no-catch-shadow': 'off',

    // This rule is buggy with optional chaining
    'babel/no-unused-expressions': 'off',
  },
  overrides: [
    {
      files: ['loom.config.ts', 'config/loom/**/*'],
      rules: {
        // Doesn’t understand that loom dependencies come from the root package.json
        'import/no-extraneous-dependencies': 'off',
      },
    },
    {
      files: ['packages/react/src/**/*'],
      extends: [
        'plugin:@shopify/typescript',
        'plugin:@shopify/react',
        'plugin:@shopify/jest',
        'plugin:@shopify/prettier',
      ],
      rules: {
        // We use the new JSX transform that does not require a `React` variable
        'react/react-in-jsx-scope': 'off',

        // Have to repeat the global rule overrides
        'lines-around-comment': 'off',
        'no-catch-shadow': 'off',
        'babel/no-unused-expressions': 'off',
        '@typescript-eslint/naming-convention': 'off',
        '@typescript-eslint/consistent-indexed-object-style': 'off',
      },
    },
    {
      files: ['packages/mini-react/src/**/*'],
      extends: [
        'plugin:@shopify/typescript',
        'plugin:@shopify/react',
        'plugin:@shopify/jest',
        'plugin:@shopify/prettier',
      ],
      rules: {
        // We use the new JSX transform that does not require a `React` variable
        'react/react-in-jsx-scope': 'off',

        // Complains about `{}`, but there is no better type for us to use
        // for most of this library.
        '@typescript-eslint/ban-types': 'off',

        // This rule gets confused a lot because we are *creating* React in
        // this library, not *using* React.
        '@shopify/react-prefer-private-members': 'off',

        // Have to repeat the global rule overrides
        'lines-around-comment': 'off',
        'no-catch-shadow': 'off',
        'babel/no-unused-expressions': 'off',
        '@typescript-eslint/naming-convention': 'off',
        '@typescript-eslint/consistent-indexed-object-style': 'off',
      },
    },
  ],
};
