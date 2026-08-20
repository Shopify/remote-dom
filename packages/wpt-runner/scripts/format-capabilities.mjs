#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseCapabilities, serializeCapabilities} from './capabilities.mjs';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const capabilitiesPath = path.join(packageRoot, 'capabilities.tsv');
const source = await fs.readFile(capabilitiesPath, 'utf8');
const rows = parseCapabilities(source, capabilitiesPath);
await fs.writeFile(capabilitiesPath, serializeCapabilities(rows));
console.log(
  `[wpt] formatted ${path.relative(process.cwd(), capabilitiesPath)}`,
);
