import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {
  parseCapabilities,
  readCapabilities,
  serializeCapabilities,
} from './capabilities.ts';

const header = 'path\tstatus\tcase\tnote\n';

describe('capabilities.tsv', () => {
  it('round-trips escaped fields and sorts by code units', () => {
    const rows = parseCapabilities(
      `${header}z.html\tdeferred\tcase\\t2\tline\\n2\\\\done\na.html\tsupported\tcase 1\n`,
    );

    expect(rows[0]).toMatchObject({
      case: 'case\t2',
      note: 'line\n2\\done',
    });
    expect(serializeCapabilities(rows)).toBe(
      `${header}a.html\tsupported\tcase 1\nz.html\tdeferred\tcase\\t2\tline\\n2\\\\done\n`,
    );
  });

  it('accepts omitted trailing columns and rejects excess columns', () => {
    expect(parseCapabilities(`${header}a.html\tsupported\tcase\n`)).toEqual([
      {path: 'a.html', status: 'supported', case: 'case', note: ''},
    ]);
    expect(() =>
      parseCapabilities(`${header}a.html\tsupported\tcase\tnote\textra\n`),
    ).toThrow('expected at most 4 columns');
  });

  it('rejects malformed escapes and missing required columns', () => {
    expect(() =>
      parseCapabilities(`${header}a.html\tsupported\tbad\\q\n`),
    ).toThrow('malformed escape');
    expect(() => parseCapabilities(`${header}a.html\tsupported\n`)).toThrow(
      'case is required',
    );
  });

  it('requires deferred notes and unique path-case pairs', () => {
    expect(() =>
      parseCapabilities(`${header}a.html\tdeferred\tcase\n`),
    ).toThrow('deferred rows require a note');
    expect(() =>
      parseCapabilities(
        `${header}a.html\tsupported\tcase\na.html\tdeferred\tcase\treason\n`,
      ),
    ).toThrow('duplicate capability');
  });

  it('rejects valid but noncanonical checked-in ordering', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'capabilities-'));
    const file = path.join(directory, 'capabilities.tsv');
    try {
      await fs.writeFile(
        file,
        `${header}z.html\tsupported\tcase z\na.html\tsupported\tcase a\n`,
      );
      await expect(readCapabilities(file)).rejects.toThrow('pnpm wpt:format');
    } finally {
      await fs.rm(directory, {force: true, recursive: true});
    }
  });

  it('rejects noncanonical carriage-return line endings', () => {
    expect(() =>
      parseCapabilities(
        'path\tstatus\tcase\tnote\r\na.html\tsupported\tcase\r\n',
      ),
    ).toThrow('literal carriage returns');
  });
});
