import {defineConfig} from 'vite';

export default defineConfig({
  root: 'src',
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
});
