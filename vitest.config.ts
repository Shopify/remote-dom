import {defineConfig} from 'vitest/config';
import {resolve} from 'path';

const root = import.meta.dirname!;

function project(name: string) {
  return {
    resolve: {
      alias: [
        // Special case: @remote-dom/core/polyfill → packages/core/source/polyfill/polyfill.ts
        {
          find: '@remote-dom/core/polyfill',
          replacement: resolve(
            root,
            'packages/core/source/polyfill/polyfill.ts',
          ),
        },
        // @remote-dom/core/receivers → packages/core/source/receivers.ts
        {
          find: /^@remote-dom\/([^/]+)\/(.+)$/,
          replacement: resolve(root, 'packages/$1/source/$2.ts'),
        },
        // @remote-dom/core → packages/core/source/index.ts
        {
          find: /^@remote-dom\/([^/]+)$/,
          replacement: resolve(root, 'packages/$1/source/index.ts'),
        },
      ],
    },
    test: {
      name,
      include: [`packages/${name}/**/*.test.{ts,tsx}`],
    },
  };
}

export default defineConfig({
  test: {
    projects: [
      project('core'),
      project('polyfill'),
      project('signals'),
      project('compat'),
      project('react'),
      project('preact'),
    ],
  },
});
