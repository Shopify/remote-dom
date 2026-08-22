import {mkdirSync, rmSync} from 'node:fs';

const reports = new URL('./reports/', import.meta.url);

rmSync(reports, {recursive: true, force: true});
mkdirSync(reports, {recursive: true});
