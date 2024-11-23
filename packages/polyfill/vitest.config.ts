import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./source/tests/setup.ts'],
  },
});
