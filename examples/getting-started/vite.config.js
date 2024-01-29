import {defineConfig} from 'vite';

export default defineConfig({
  root: './app',
  resolve: {
    conditions: ['quilt:source'],
  },
});
