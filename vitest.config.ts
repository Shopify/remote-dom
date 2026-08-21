import {readdirSync} from 'fs';
import {resolve} from 'path';
import {defineConfig} from 'vitest/config';

const root = import.meta.dirname!;
const packageNames = readdirSync(resolve(root, 'packages'), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

function project(name: string) {
  return {
    resolve: {
      alias: [
        // Special case: @remote-dom/core/polyfill → packages/core/source/polyfill/polyfill.ts
        {
          find: /^@remote-dom\/core\/polyfill$/,
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
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'json-summary'],
      reportOnFailure: true,
      include: ['packages/*/source/**/*.{ts,tsx}'],
      exclude: [
        'packages/**/source/**/tests/**',
        'packages/**/source/**/__fixtures__/**',
        'packages/**/source/**/fixtures/**',
        'packages/**/source/**/*.test.{ts,tsx}',
        'packages/**/source/**/*.generated.{ts,tsx}',
      ],
      excludeAfterRemap: true,
      thresholds: {
        'packages/compat/source/**': {lines: 96},
        'packages/core/source/**': {lines: 74},
        'packages/polyfill/source/**': {lines: 68},
        'packages/preact/source/**': {lines: 95},
        'packages/react/source/**': {lines: 84},
        'packages/signals/source/**': {lines: 87},
      },
    },
    projects: packageNames.map(project),
  },
});
