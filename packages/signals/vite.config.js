import {quiltPackage} from '@quilted/vite';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  plugins: [quiltPackage()],
});
