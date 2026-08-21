import fs from 'node:fs/promises';

export const CAPABILITY_HEADER = ['path', 'status', 'case', 'note'] as const;

export type CapabilityStatus = 'supported' | 'deferred';

export interface CapabilityRow {
  path: string;
  status: CapabilityStatus;
  case: string;
  note: string;
}

const VALID_STATUSES: ReadonlySet<string> = new Set(['supported', 'deferred']);

/** Reads a capability table and rejects content that is not canonical. */
export async function readCapabilities(file: string): Promise<CapabilityRow[]> {
  const source = await fs.readFile(file, 'utf8');
  const rows = parseCapabilities(source, file);
  const canonical = serializeCapabilities(rows);

  if (source !== canonical) {
    throw new Error(
      `${file} is not canonical. Run \`pnpm wpt:format\` and commit the result.`,
    );
  }

  return rows;
}

/** Parses and validates capability rows from escaped TSV source. */
export function parseCapabilities(
  source: string,
  label = 'capabilities.tsv',
): CapabilityRow[] {
  if (source.includes('\r')) {
    throw new Error(
      `${label}: literal carriage returns are not allowed; use \\r escapes.`,
    );
  }

  const lines = source.split('\n');
  if (lines.at(-1) === '') lines.pop();
  if (lines.length === 0 || lines[0] !== CAPABILITY_HEADER.join('\t')) {
    throw new Error(
      `${label}: expected header ${CAPABILITY_HEADER.join('\\t')}.`,
    );
  }

  const rows: CapabilityRow[] = [];
  const seen = new Set<string>();

  for (let index = 1; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const fields = lines[index]!.split('\t');
    if (fields.length > CAPABILITY_HEADER.length) {
      throw new Error(
        `${label}:${lineNumber}: expected at most ${CAPABILITY_HEADER.length} columns, got ${fields.length}.`,
      );
    }
    while (fields.length < CAPABILITY_HEADER.length) fields.push('');

    const [rawPath = '', rawStatus = '', rawCase = '', rawNote = ''] = fields;
    const path = unescapeField(rawPath, label, lineNumber);
    const status = unescapeField(rawStatus, label, lineNumber);
    const caseName = unescapeField(rawCase, label, lineNumber);
    const note = unescapeField(rawNote, label, lineNumber);

    if (!path) throw new Error(`${label}:${lineNumber}: path is required.`);
    if (!isCapabilityStatus(status)) {
      throw new Error(
        `${label}:${lineNumber}: status must be exactly supported or deferred.`,
      );
    }
    if (!caseName) throw new Error(`${label}:${lineNumber}: case is required.`);
    if (status === 'deferred' && !note) {
      throw new Error(`${label}:${lineNumber}: deferred rows require a note.`);
    }

    const row: CapabilityRow = {path, status, case: caseName, note};
    const key = `${row.path}\0${row.case}`;
    if (seen.has(key)) {
      throw new Error(
        `${label}:${lineNumber}: duplicate capability (${JSON.stringify(row.path)}, ${JSON.stringify(row.case)}).`,
      );
    }
    seen.add(key);
    rows.push(row);
  }

  return rows;
}

/** Sorts and serializes capability rows as canonical escaped TSV. */
export function serializeCapabilities(rows: readonly CapabilityRow[]): string {
  const sorted = [...rows].sort(compareCapabilityRows);
  const lines = [
    CAPABILITY_HEADER.join('\t'),
    ...sorted.map((row) => {
      const fields = [row.path, row.status, row.case, row.note].map((field) =>
        escapeField(field),
      );
      while (fields.at(-1) === '') fields.pop();
      return fields.join('\t');
    }),
  ];
  return `${lines.join('\n')}\n`;
}

export function compareCapabilityRows(
  left: CapabilityRow,
  right: CapabilityRow,
): number {
  return (
    compareCodeUnits(left.path, right.path) ||
    compareCodeUnits(left.case, right.case)
  );
}

export function compareCodeUnits(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/** Groups capability rows by their WPT file while preserving row order. */
export function rowsByPath(
  rows: readonly CapabilityRow[],
): Map<string, CapabilityRow[]> {
  const grouped = new Map<string, CapabilityRow[]>();
  for (const row of rows) {
    const pathRows = grouped.get(row.path);
    if (pathRows) pathRows.push(row);
    else grouped.set(row.path, [row]);
  }
  return grouped;
}

function isCapabilityStatus(value: string): value is CapabilityStatus {
  return VALID_STATUSES.has(value);
}

function escapeField(value: string): string {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('\t', '\\t')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r');
}

/** Decodes supported TSV escapes and rejects malformed sequences. */
function unescapeField(
  value: string,
  label: string,
  lineNumber: number,
): string {
  let result = '';
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character !== '\\') {
      result += character;
      continue;
    }

    const escaped = value[(index += 1)];
    if (escaped === '\\') result += '\\';
    else if (escaped === 't') result += '\t';
    else if (escaped === 'n') result += '\n';
    else if (escaped === 'r') result += '\r';
    else {
      const display = escaped === undefined ? 'end of field' : `\\${escaped}`;
      throw new Error(`${label}:${lineNumber}: malformed escape ${display}.`);
    }
  }
  return result;
}
