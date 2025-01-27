import {defineConfig} from 'vite';
import {quiltPackage} from '@quilted/vite';

export default defineConfig({
  plugins: [quiltPackage()],

  resolve: {
    // Alias the `@remote-dom` packages to their source files
    conditions: ['quilt:source'],
  },
});
