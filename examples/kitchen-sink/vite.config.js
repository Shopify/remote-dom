import {defineConfig} from 'vite';
import preact from '@preact/preset-vite';
import vue from '@vitejs/plugin-vue';
import {svelte, vitePreprocess} from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  root: 'app',
  resolve: {
    // Alias the `@remote-dom` packages to their source files
    conditions: ['quilt:source'],
  },
  plugins: [
    preact({
      // We manually set the JSX transformation to apply to examples per-file
      exclude: ['remote/examples/*.tsx'],
      devToolsEnabled: false,
      prefreshEnabled: false,
      reactAliasesEnabled: false,
    }),
    svelte({
      preprocess: vitePreprocess(),
    }),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('ui-'),
        },
      },
    }),
  ],
});
