/** @vitest-environment node */
import { afterEach, expect, it } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const roots = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));
const fixture = () => {
    const root = mkdtempSync(join(tmpdir(), 'uele-audit-')); roots.push(root);
    const put = (name, data) => writeFileSync(join(root, name), data);
    for (const name of ['scripts', 'src', 'diffs']) mkdirSync(join(root, name));
    symlinkSync(fileURLToPath(new URL('../node_modules', import.meta.url)), join(root, 'node_modules'), 'junction');
    copyFileSync(fileURLToPath(new URL('../scripts/audit-release.mjs', import.meta.url)), join(root, 'scripts/audit-release.mjs'));
    put('package.json', JSON.stringify({ type: 'module', exports: {
        '.': './src/index.js', './diffs/*': { types: './diffs/*.d.ts', import: './diffs/*.js', require: './diffs/*.cjs' }, './diffs/util': null
    } }));
    put('src/index.js', 'export const value = 1;');
    put('diffs/example.js', 'export const diff = () => {};');
    put('diffs/example.d.ts', 'export declare const diff: () => void;');
    put('diffs/example.cjs', 'exports.diff = () => {};');
    put('diffs/util.js', 'export const privateHelper = () => {};');
    return { put, root, run: () => spawnSync(process.execPath, [join(root, 'scripts/audit-release.mjs')], { encoding: 'utf8', timeout: 15000 }) };
};
it('accepts complete public entries and keeps null-blocked helpers private', () => {
    const { run } = fixture(), result = run();
    expect(result.status, result.stderr).toBe(0); expect(result.stdout).toContain('Release static audit passed');
}, 20000);
it('rejects missing wildcard-condition files even when other engines still match', () => {
    const { put, run } = fixture();
    put('diffs/other.js', 'export const diff = () => {};'); put('diffs/other.cjs', 'exports.diff = () => {};');
    const result = run(); expect(result.status).toBe(1); expect(result.stderr).toContain('./diffs/other.d.ts');
}, 20000);
it('rejects unresolved local imports and unused private runtime bindings', () => {
    const { put, run } = fixture();
    put('src/index.js', "import './missing.js'; export const value = 1; const unused = 2;");
    const result = run(); expect(result.status).toBe(1);
    expect(result.stderr).toContain('missing ./missing.js'); expect(result.stderr).toContain("'unused' is declared");
}, 20000);
