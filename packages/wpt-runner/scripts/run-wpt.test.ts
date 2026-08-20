import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';

const runnerPath = fileURLToPath(new URL('./run-wpt.mjs', import.meta.url));

describe('WPT runner arguments', () => {
  it.each(['0', '0ms', '0s'])('rejects a zero timeout (%s)', (timeout) => {
    const result = spawnSync(
      process.execPath,
      [runnerPath, '--timeout', timeout],
      {encoding: 'utf8'},
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `Invalid --timeout value: ${timeout}. Expected a positive duration.`,
    );
  });

  it('rejects a duration that cannot be represented safely', () => {
    const timeout = `${Number.MAX_SAFE_INTEGER}s`;
    const result = spawnSync(
      process.execPath,
      [runnerPath, '--timeout', timeout],
      {encoding: 'utf8'},
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `Invalid --timeout value: ${timeout}. Expected a positive duration.`,
    );
  });
});
