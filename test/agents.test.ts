/** AGENTS.md is read before any change: every path it names must exist. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const guide = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');

test('every path AGENTS.md names exists', () => {
  const paths = [...new Set([...guide.matchAll(/`((?:src|scripts|tools|data|docs|test|schemas)\/[^`\s]*|[A-Za-z_.]+\.(?:md|json))`/g)].map(m => m[1]))].filter(
    p => !p.includes("<") && p !== "package.json" && !p.startsWith("scripts/copy/"), // scripts/copy/ is the Mihrab app's
  );
  assert.ok(paths.length > 8);
  for (const p of paths) assert.ok(fs.existsSync(path.join(ROOT, p)), p);
});

test('Claude Code loads it, and preflight runs the checks it names', () => {
  assert.match(fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8'), /@AGENTS\.md/);
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.preflight, /readme\.mjs --check/);
});
