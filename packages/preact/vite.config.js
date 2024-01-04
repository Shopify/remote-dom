import {defineConfig} from 'vitest/config';
import {quiltPackage} from '@quilted/vite/package';

export default defineConfig({
  plugins: [quiltPackage({react: 'preact'})],
  test: {
    deps: {
      optimizer: {
        web: {
          // Without this, some imports for Preact get the node_modules version, and others get
          // the optimized dependency version.
          exclude: [
            'preact',
            'preact/compat',
            '@preact/signals',
            '@preact/signals-core',
          ],
        },
      },
    },
  },
});
