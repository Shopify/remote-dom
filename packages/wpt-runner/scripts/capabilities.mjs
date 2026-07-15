import fs from 'node:fs/promises';

export const CAPABILITY_HEADER = ['path', 'status', 'case', 'note'];
const VALID_STATUSES = new Set(['supported', 'deferred']);

export async function readCapabilities(file) {
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

export function parseCapabilities(source, label = 'capabilities.tsv') {
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

  const rows = [];
  const seen = new Set();

  for (let index = 1; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const fields = lines[index].split('\t');
    if (fields.length !== CAPABILITY_HEADER.length) {
      throw new Error(
        `${label}:${lineNumber}: expected ${CAPABILITY_HEADER.length} columns, got ${fields.length}.`,
      );
    }

    const [rawPath, rawStatus, rawCase, rawNote] = fields;
    const row = {
      path: unescapeField(rawPath, label, lineNumber),
      status: unescapeField(rawStatus, label, lineNumber),
      case: unescapeField(rawCase, label, lineNumber),
      note: unescapeField(rawNote, label, lineNumber),
    };

    if (!row.path) throw new Error(`${label}:${lineNumber}: path is required.`);
    if (!VALID_STATUSES.has(row.status)) {
      throw new Error(
        `${label}:${lineNumber}: status must be exactly supported or deferred.`,
      );
    }
    if (!row.case) throw new Error(`${label}:${lineNumber}: case is required.`);
    if (row.status === 'deferred' && !row.note) {
      throw new Error(`${label}:${lineNumber}: deferred rows require a note.`);
    }

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

export function serializeCapabilities(rows) {
  const sorted = [...rows].sort(compareCapabilityRows);
  const lines = [
    CAPABILITY_HEADER.join('\t'),
    ...sorted.map((row) =>
      [row.path, row.status, row.case, row.note]
        .map((field) => escapeField(field))
        .join('\t'),
    ),
  ];
  return `${lines.join('\n')}\n`;
}

export function compareCapabilityRows(left, right) {
  return (
    compareCodeUnits(left.path, right.path) ||
    compareCodeUnits(left.case, right.case)
  );
}

export function compareCodeUnits(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function rowsByPath(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const pathRows = grouped.get(row.path);
    if (pathRows) pathRows.push(row);
    else grouped.set(row.path, [row]);
  }
  return grouped;
}

function escapeField(value) {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('\t', '\\t')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r');
}

function unescapeField(value, label, lineNumber) {
  let result = '';
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character !== '\\') {
      result += character;
      continue;
    }

    const escaped = value[++index];
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
