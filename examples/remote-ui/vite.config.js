import {defineConfig} from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  root: 'app',
  resolve: {
    // Alias the `@remote-dom` packages to their source files
    conditions: ['quilt:source'],
  },
  plugins: [
    preact({
      reactAliasesEnabled: false,
      exclude: ['remote/**/*.tsx'],
    }),
  ],
});
