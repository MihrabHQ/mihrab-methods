/**
 * Writes docs/openapi.json from src/openapi.ts: `npm run openapi`. The
 * tests fail when the file is not what the routes say, so a route cannot
 * change without its description.
 */
import fs from 'node:fs';
import path from 'node:path';
import { openapi } from '../src/openapi.js';

const file = path.join(__dirname, '..', 'docs', 'openapi.json');
fs.writeFileSync(file, JSON.stringify(openapi(), null, 2) + '\n');
console.log('wrote docs/openapi.json');
