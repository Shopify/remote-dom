import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {resolveServedWptFile} from '../src/paths.ts';

const roots = {fixtureRoot: '/fixtures', wptRoot: '/wpt'};

describe('WPT file serving paths', () => {
  it('resolves runner fixtures and upstream files inside their roots', () => {
    expect(resolveServedWptFile('__runner__/smoke.html', roots)).toBe(
      path.resolve('/fixtures/smoke.html'),
    );
    expect(resolveServedWptFile('resources/testharness.js', roots)).toBe(
      path.resolve('/wpt/resources/testharness.js'),
    );
  });

  it.each([
    '../secret',
    'resources/../../secret',
    '/absolute',
    String.raw`resources\secret`,
    'resources//testharness.js',
  ])('rejects unsafe path %s', (unsafePath) => {
    expect(resolveServedWptFile(unsafePath, roots)).toBeNull();
  });
});
