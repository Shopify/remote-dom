import {defineConfig} from 'vite';

export default defineConfig({
  root: './app',
  resolve: {
    // Alias the `@remote-dom` packages to their source files
    conditions: ['quilt:source'],
  },
});
