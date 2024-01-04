import {quiltPackage} from '@quilted/vite';
import {defineConfig, defaultExclude} from 'vitest/config';

export default defineConfig({
  plugins: [quiltPackage()],
  test: {
    exclude: [
      // This test contains accessors, which vitest does not currently support.
      'source/tests/elements.test.ts',
      ...defaultExclude,
    ],
  },
});
