/**
 * Every list of authorities this tree keeps says the same thing.
 *
 * An authority is wired into some twenty places — the library's types and
 * revisions, the scripts that embed and count, the tools that check, the
 * package's entry points, and the four ports' own registries
 * (`scripts/new-authority.py` writes them all). One missed is an authority
 * that certifies and cannot be imported, or that a port has never heard
 * of; this is where that is found.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { AUTHORITIES } from '../src/core/types.js';
import { METHOD_REVISION } from '../src/methods/revisions.js';

/** The tests are run from the repository's root (`npm test`). */
const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ids = [...AUTHORITIES];
/** Sweden and Diyanet share the Congress method's tooling, written before the registries were lists. */
const NATIONAL = ids.filter(a => a !== 'sweden' && a !== 'diyanet');

test('the library: revisions, entry points, the package’s exports', () => {
  assert.deepEqual(Object.keys(METHOD_REVISION).sort(), [...ids].sort());
  const pkg = JSON.parse(read('package.json'));
  const index = read('src/index.ts');
  for (const a of ids) {
    assert.ok(fs.existsSync(path.join(ROOT, `src/${a}.ts`)), `src/${a}.ts`);
    assert.ok(fs.existsSync(path.join(ROOT, `src/authorities/${a}.ts`)), `src/authorities/${a}.ts`);
    // Türkiye Takvimi is loaded by its own entry only (`mihrab-methods/turkiyetakvimi`), as it was written.
    if (a !== 'turkiyetakvimi') assert.ok(index.includes(`import './authorities/${a}.js';`), `src/index.ts imports ${a}`);
    assert.ok(pkg.exports[`./${a}`], `package.json exports ./${a}`);
    assert.ok(Object.values(pkg.typesVersions)[0] && (Object.values(pkg.typesVersions)[0] as Record<string, unknown>)[a], `typesVersions ${a}`);
    assert.ok(JSON.stringify(pkg).includes(`./src/${a}.ts`), `package.json lists ./src/${a}.ts`);
    assert.ok(fs.existsSync(path.join(ROOT, `data/corrections/${a}.json`)), `data/corrections/${a}.json`);
  }
});

test('the scripts and the tools: embed, figures, the schema, verify, corrections, vectors', () => {
  const embed = read('scripts/embed.mjs');
  const figures = read('scripts/figures.mjs');
  const schema = JSON.stringify(JSON.parse(read('schemas/certification.schema.json')));
  const verify = read('tools/verify.ts');
  const corrections = read('tools/corrections.ts');
  const vectors = read('tools/vectors.ts');
  const lists = [...embed.matchAll(/for \(const a of \[([^\]]+)\]/g)].map(m => m[1]);
  assert.ok(lists.length >= 2, 'embed.mjs: the two lists');
  for (const a of ids) {
    for (const list of lists) assert.ok(list.includes(`'${a}'`), `embed.mjs lists ${a}`);
    assert.ok(new RegExp(`AUTHORITY_ORDER = \\[[^\\]]*'${a}'`).test(figures), `figures.mjs orders ${a}`);
    assert.ok(new RegExp(`\\n  ${a}: \\{ short: `).test(figures), `figures.mjs names ${a}`);
    assert.ok(schema.includes(`"${a}"`), `the certification schema knows ${a}`);
  }
  for (const a of NATIONAL) {
    assert.ok(new RegExp(`\\n    ${a}: '`).test(verify), `verify.ts labels ${a}`);
    assert.ok(new RegExp(`const NATIONAL = \\(\\[[^\\]]*'${a}'`).test(corrections), `corrections.ts lists ${a}`);
    assert.ok(corrections.includes(`NATIONAL === '${a}'`), `corrections.ts writes ${a}`);
    assert.ok(new RegExp(`\\n  ${a}: \\[`).test(vectors), `vectors.ts samples ${a}`);
  }
});

test('the four ports: the authorities they know and the revisions they compute', () => {
  const py = read('ports/python/mihrab_methods/api.py');
  const swift = read('ports/swift/Sources/MihrabMethods/Api.swift');
  const kotlin = read('ports/kotlin/src/Api.kt');
  const dart = read('ports/dart/lib/src/api.dart');
  for (const a of ids) {
    const rev = METHOD_REVISION[a];
    assert.ok(py.includes(`'${a}': ${rev}`), `python REVISIONS ${a}: ${rev}`);
    assert.ok(swift.includes(`"${a}": ${rev}`), `swift REVISIONS ${a}: ${rev}`);
    assert.ok(kotlin.includes(`"${a}" to ${rev}`), `kotlin REVISIONS ${a}: ${rev}`);
    assert.ok(dart.includes(`'${a}': ${rev}`), `dart revisions ${a}: ${rev}`);
    assert.ok(new RegExp(`case [\\w, ]*\\b${a}\\b`).test(swift), `swift Authority.${a}`);
    assert.ok(new RegExp(`enum class Authority \\{[\\w, ]*\\b${a}\\b`).test(kotlin), `kotlin Authority.${a}`);
    assert.ok(new RegExp(`enum Authority \\{[\\w, ]*\\b${a}\\b`).test(dart), `dart Authority.${a}`);
  }
});
