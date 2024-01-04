import {defineConfig} from 'vitest/config';
import {quiltPackage} from '@quilted/vite/package';

export default defineConfig({
  plugins: [
    quiltPackage({
      react: 'react',
    }),
  ],
  test: {
    deps: {
      optimizer: {
        web: {
          // Without this, some imports for React get the node_modules version, and others get
          // the optimized dependency version.
          exclude: ['react', 'react-dom'],
        },
      },
    },
  },
});
